/**
 * Tutor IA — Curso de Historia del Arte.
 *
 * POST /api/tutor  → respuesta en streaming (text/plain) del tutor de IA.
 * Cuerpo JSON: { modo, leccion: { titulo, modulo, contexto }, messages: [...] }
 *   - modo: "chat" | "socratico" | "quiz"
 *   - messages: historial [{ role: "user"|"assistant", content: string }]
 *
 * La API key de Anthropic es un secret del Worker (`wrangler secret put
 * ANTHROPIC_API_KEY`). NUNCA viaja al cliente: el frontend estático llama a
 * este Worker y este llama a la API de Claude.
 *
 * Modelo por tarea (híbrido, para controlar costo):
 *   - chat / quiz  → Claude Haiku 4.5  (rápido y económico)
 *   - socratico    → Claude Sonnet 5   (análisis más profundo de la obra)
 */

export interface Env {
  ANTHROPIC_API_KEY?: string;
  /** Orígenes permitidos, separados por comas. Admite "https://*.sufijo" para previews. */
  ALLOW_ORIGIN?: string;
  /** Binding opcional de rate limiting de Cloudflare (ver wrangler.jsonc). */
  TUTOR_RL?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
}

type Modo = "chat" | "socratico" | "quiz";

// Todos los modos usan Claude Sonnet 5. El control de gastos se hace con:
//  - caché de prompt (el contexto de la lección, que se repite en cada turno,
//    se cobra a ~10% tras la primera vez),
//  - topes de max_tokens por modo,
//  - recorte del historial y del contexto (menos tokens de entrada),
//  - pensamiento desactivado (sin tokens de "thinking").
const MODELO: Record<Modo, string> = {
  chat: "claude-sonnet-5",
  quiz: "claude-sonnet-5",
  socratico: "claude-sonnet-5",
};

const MAX_TOKENS: Record<Modo, number> = {
  chat: 700,
  quiz: 900,
  socratico: 1000,
};

const ORIGEN_POR_DEFECTO = "https://historia.hilvan.org";

// Resuelve el origen a permitir: coincidencia exacta o comodín "https://*.sufijo".
// null = origen no permitido (o petición sin cabecera Origin: same-origin/no navegador).
function resolverOrigen(request: Request, env: Env): string | null {
  const lista = (env.ALLOW_ORIGIN ?? ORIGEN_POR_DEFECTO)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (lista.includes("*")) return "*";
  const origin = request.headers.get("origin");
  if (!origin) return null;
  for (const patron of lista) {
    if (patron === origin) return origin;
    if (patron.includes("://*.")) {
      const [esquema, sufijo] = patron.split("://*.");
      if (origin.startsWith(`${esquema}://`) && origin.endsWith(`.${sufijo}`)) return origin;
    }
  }
  return null;
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return { vary: "origin" };
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

const BASE_SISTEMA = `Eres un TUTOR experto de Historia del Arte: riguroso, paciente y motivador. Tu misión es que el estudiante comprenda y aprenda a MIRAR el arte, no solo memorizar.

Reglas:
- Responde SIEMPRE en español, claro y bien estructurado (puedes usar Markdown).
- Cíñete a la historia del arte y al contenido de la lección. Si te preguntan algo ajeno, redirige con amabilidad al tema.
- Rigor absoluto: no inventes obras, fechas ni atribuciones. Si algo es discutido, dilo ("c.", "atribuido a").
- Sé conciso pero sustancioso. Usa ejemplos y comparaciones que iluminen.
- Responde en pocos párrafos; ve a lo esencial y no te extiendas de más.
- Cuando cites una obra, menciona dónde verla (museo/ciudad) si la conoces con certeza.`;

const MODO_SISTEMA: Record<Modo, string> = {
  chat: `Modo: RESOLVER DUDAS. Responde la pregunta del estudiante apoyándote en la lección. Aclara conceptos, da ejemplos y compara obras o periodos cuando ayude a entender.`,
  socratico: `Modo: SOCRÁTICO / EJERCICIO DE MIRADA. NO des la interpretación ya hecha. Guía al estudiante con preguntas, paso a paso, para que analice la obra por sí mismo: primero descripción formal (línea, color, luz, composición), luego iconografía/contenido, luego contexto y, por último, valoración. Haz UNA o DOS preguntas por turno, reacciona a su respuesta y avanza. Refuerza los aciertos y reorienta los errores sin dar la respuesta de golpe.`,
  quiz: `Modo: PRÁCTICA Y EVALUACIÓN. Si el estudiante pide preguntas ("ponme a prueba"), genera 1-3 preguntas a la vez sobre la lección (mezcla opción múltiple y abiertas) y espera su respuesta. Cuando responda, EVALÚA con feedback constructivo: di si acierta, explica por qué y añade un dato extra. Mantén un tono de entrenador que anima.`,
};

function construirSistema(modo: Modo, leccion: { titulo?: string; modulo?: string; contexto?: string } | undefined): string {
  const partes = [BASE_SISTEMA, MODO_SISTEMA[modo]];
  if (leccion?.titulo) {
    let ctx = `\n--- CONTEXTO DE LA LECCIÓN ---\nLección: "${leccion.titulo}"`;
    if (leccion.modulo) ctx += `\nMódulo: ${leccion.modulo}`;
    if (leccion.contexto) ctx += `\n\nContenido de la lección (úsalo como base de verdad):\n${leccion.contexto.slice(0, 6000)}`;
    partes.push(ctx);
  }
  return partes.join("\n\n");
}

interface Mensaje {
  role: "user" | "assistant";
  content: string;
}

function sanearMensajes(raw: unknown): Mensaje[] {
  if (!Array.isArray(raw)) return [];
  const msgs: Mensaje[] = [];
  for (const m of raw.slice(-10)) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
      msgs.push({ role, content: content.slice(0, 4000) });
    }
  }
  // La conversación debe empezar por "user".
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs;
}

async function streamAnthropic(
  env: Env,
  modelo: string,
  maxTokens: number,
  sistema: string,
  messages: Mensaje[],
): Promise<ReadableStream<Uint8Array>> {
  const body: Record<string, unknown> = {
    model: modelo,
    max_tokens: maxTokens,
    // Caché de prompt: el system (base + lección) se repite en cada turno y entre
    // estudiantes de la misma lección → tras la 1.ª vez se cobra a ~10%.
    system: [{ type: "text", text: sistema, cache_control: { type: "ephemeral" } }],
    messages,
    stream: true,
  };
  // Sonnet 5 corre pensamiento adaptativo por defecto: lo desactivamos para que
  // el streaming del tutor sea inmediato (sin pausa de "thinking") y sin gastar
  // tokens de razonamiento.
  body.thinking = { type: "disabled" };

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok || !upstream.body) {
    const detalle = await upstream.text().catch(() => "");
    throw new Error(`Anthropic HTTP ${upstream.status}: ${detalle.slice(0, 300)}`);
  }

  // Parseamos el SSE de Anthropic y re-emitimos solo el texto, en streaming.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lineas = buffer.split("\n");
      buffer = lineas.pop() ?? "";
      for (const linea of lineas) {
        const l = linea.trim();
        if (!l.startsWith("data:")) continue;
        const datos = l.slice(5).trim();
        if (!datos || datos === "[DONE]") continue;
        try {
          const evt = JSON.parse(datos);
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
            controller.enqueue(encoder.encode(evt.delta.text as string));
          } else if (evt.type === "error") {
            controller.enqueue(encoder.encode(`\n[Error del tutor: ${evt.error?.message ?? "desconocido"}]`));
          }
        } catch {
          /* línea SSE incompleta o no-JSON: se ignora */
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return stream;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origenPermitido = resolverOrigen(request, env);
    const cors = corsHeaders(origenPermitido);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: origenPermitido ? 204 : 403, headers: cors });
    }
    // Rechaza POSTs de navegador desde orígenes no permitidos (control de gasto).
    const origenReq = request.headers.get("origin");
    if (origenReq && !origenPermitido) {
      return new Response("Origen no permitido", { status: 403, headers: cors });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/tutor") {
      return new Response("Tutor IA · Historia del Arte. Usa POST /api/tutor", {
        status: url.pathname === "/" ? 200 : 404,
        headers: { ...cors, "content-type": "text/plain; charset=utf-8" },
      });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: cors });
    }
    if (!env.ANTHROPIC_API_KEY) {
      return new Response("El tutor no está configurado (falta ANTHROPIC_API_KEY).", {
        status: 503,
        headers: { ...cors, "content-type": "text/plain; charset=utf-8" },
      });
    }

    // Rate limiting opcional por IP (binding TUTOR_RL) — control de gasto/abuso.
    if (env.TUTOR_RL) {
      const ip = request.headers.get("cf-connecting-ip") || "anon";
      const { success } = await env.TUTOR_RL.limit({ key: ip });
      if (!success) {
        return new Response("Demasiadas solicitudes. Inténtalo en un momento.", {
          status: 429,
          headers: { ...cors, "content-type": "text/plain; charset=utf-8", "retry-after": "30" },
        });
      }
    }

    let payload: { modo?: string; leccion?: { titulo?: string; modulo?: string; contexto?: string }; messages?: unknown };
    try {
      payload = await request.json();
    } catch {
      return new Response("JSON inválido", { status: 400, headers: cors });
    }

    const modo: Modo = payload.modo === "socratico" || payload.modo === "quiz" ? payload.modo : "chat";
    const messages = sanearMensajes(payload.messages);
    if (!messages.length) {
      return new Response("Falta el mensaje del estudiante.", { status: 400, headers: cors });
    }

    const sistema = construirSistema(modo, payload.leccion);

    try {
      const cuerpo = await streamAnthropic(env, MODELO[modo], MAX_TOKENS[modo], sistema, messages);
      return new Response(cuerpo, {
        headers: {
          ...cors,
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    } catch (e) {
      return new Response(`No se pudo contactar al tutor: ${(e as Error).message}`, {
        status: 502,
        headers: { ...cors, "content-type": "text/plain; charset=utf-8" },
      });
    }
  },
};
