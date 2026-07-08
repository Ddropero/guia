/**
 * Tutor IA — Curso de Historia del Arte.
 *
 * POST /api/tutor  → respuesta en streaming (text/plain) del tutor de IA.
 * Cuerpo JSON: { modo, leccion: { titulo, modulo, contexto }, messages: [...] }
 *   - modo: "chat" | "socratico" | "quiz"
 *   - messages: historial [{ role: "user"|"assistant", content: string }]
 *
 * PROVEEDOR configurable (variable TUTOR_PROVEEDOR):
 *   - "anthropic" (por defecto): Claude Sonnet 5, con caché de prompt y visión.
 *   - "groq": modelo abierto de OpenAI en Groq (openai/gpt-oss-120b), API
 *     compatible con OpenAI. Mucho más barato/rápido; texto solo (sin visión).
 * En ambos casos la API key es un secret del Worker (`wrangler secret put
 * ANTHROPIC_API_KEY` o `GROQ_API_KEY`) y NUNCA viaja al cliente: el frontend
 * estático llama a este Worker y este llama a la API del proveedor. La salida
 * al cliente es texto plano en streaming, idéntica sea cual sea el proveedor.
 *
 * El control de gasto se apoya en:
 *   - exigir un Origin permitido en cada POST (nada de clientes anónimos),
 *   - rate limit por IP y un segundo rate limit GLOBAL (techo de gasto conocido),
 *   - caché de prompt del prefijo (base + lección), compartido entre modos,
 *   - topes de max_tokens por modo y recorte de historial/contexto,
 *   - medición: cada respuesta registra los tokens usados (visible con wrangler tail).
 */

interface RateLimiter {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  ANTHROPIC_API_KEY?: string;
  /** API key de Groq (secret). Necesaria si TUTOR_PROVEEDOR="groq". */
  GROQ_API_KEY?: string;
  /** Proveedor del tutor: "anthropic" (por defecto) o "groq". */
  TUTOR_PROVEEDOR?: string;
  /** Modelo de Groq (por defecto openai/gpt-oss-120b). */
  GROQ_MODELO?: string;
  /** Orígenes permitidos, separados por comas. Admite "https://*.sufijo" para previews. */
  ALLOW_ORIGIN?: string;
  /** Rate limiting por IP (ver wrangler.jsonc). */
  TUTOR_RL?: RateLimiter;
  /** Rate limiting GLOBAL (clave fija): techo de gasto total aunque roten IPs. */
  TUTOR_RL_GLOBAL?: RateLimiter;
}

export type Proveedor = "anthropic" | "groq";

/** Proveedor activo según la config (por defecto Anthropic). */
export function proveedor(env: Env): Proveedor {
  return (env.TUTOR_PROVEEDOR || "").trim().toLowerCase() === "groq" ? "groq" : "anthropic";
}

const GROQ_MODELO_DEFECTO = "openai/gpt-oss-120b";

/** Tamaño máximo del cuerpo de la petición (anti-abuso de tokens de entrada). */
const MAX_BODY_BYTES = 50_000;

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
export function resolverOrigen(request: Request, env: Env): string | null {
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

interface BloqueSistema {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

// Devuelve el `system` como bloques. El PRIMER bloque (base + contexto de la
// lección) lleva cache_control y es idéntico para los 3 modos de una misma
// lección → una sola entrada de caché por lección, no una por lección×modo.
// La instrucción de modo va en un segundo bloque, corto y fuera del prefijo
// cacheado, para que el reordenamiento no rompa el acierto de caché.
function construirSistema(
  modo: Modo,
  leccion: { titulo?: string; modulo?: string; contexto?: string } | undefined,
): BloqueSistema[] {
  let prefijo = BASE_SISTEMA;
  if (leccion?.titulo) {
    prefijo += `\n\n--- CONTEXTO DE LA LECCIÓN ---\nLección: "${leccion.titulo}"`;
    if (leccion.modulo) prefijo += `\nMódulo: ${leccion.modulo}`;
    if (leccion.contexto) {
      prefijo += `\n\nContenido de la lección (úsalo como base de verdad):\n${leccion.contexto.slice(0, 6000)}`;
    }
  }
  return [
    { type: "text", text: prefijo, cache_control: { type: "ephemeral" } },
    { type: "text", text: MODO_SISTEMA[modo] },
  ];
}

interface Mensaje {
  role: "user" | "assistant";
  content: string;
}

// Contenido enriquecido para la API de Anthropic (permite adjuntar la imagen
// de una obra al primer turno para el análisis con visión).
type BloqueContenido =
  | { type: "text"; text: string; cache_control?: { type: "ephemeral" } }
  | { type: "image"; source: { type: "url"; url: string } };
interface MensajeApi {
  role: "user" | "assistant";
  content: string | BloqueContenido[];
}

// Solo se acepta como imagen una URL https de Wikimedia (las miniatura del
// curso). Evita que el cliente haga que el Worker descargue imágenes
// arbitrarias e infle los tokens de entrada.
export function imagenPermitida(u: unknown): string | null {
  if (typeof u !== "string" || !u) return null;
  try {
    const url = new URL(u);
    if (url.protocol === "https:" && url.hostname === "upload.wikimedia.org") return url.toString();
  } catch {
    /* URL inválida */
  }
  return null;
}

/**
 * Adjunta la imagen de la obra al PRIMER mensaje del estudiante (posición fija,
 * reconstruida igual cada turno), con cache_control para que los re-envíos se
 * cobren a ~10%. Si no hay imagen válida, devuelve los mensajes sin tocar
 * (degrada a análisis solo-texto).
 */
function adjuntarImagen(messages: Mensaje[], imagen: string | null): MensajeApi[] {
  if (!imagen || !messages.length || messages[0].role !== "user") return messages;
  return messages.map((m, i) =>
    i === 0
      ? {
          role: "user" as const,
          content: [
            { type: "image" as const, source: { type: "url" as const, url: imagen } },
            { type: "text" as const, text: m.content, cache_control: { type: "ephemeral" as const } },
          ],
        }
      : m,
  );
}

export function sanearMensajes(raw: unknown): Mensaje[] {
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
  modo: Modo,
  modelo: string,
  maxTokens: number,
  sistema: BloqueSistema[],
  messages: MensajeApi[],
): Promise<ReadableStream<Uint8Array>> {
  const body: Record<string, unknown> = {
    model: modelo,
    max_tokens: maxTokens,
    // Caché de prompt: el prefijo (base + lección) se repite en cada turno y
    // entre estudiantes/modos de la misma lección → tras la 1.ª vez se cobra a ~10%.
    system: sistema,
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
  // Uso de tokens (para medir coste): se arma con message_start + message_delta.
  const uso: Record<string, number> = {};

  function registrarUso(u: unknown) {
    if (!u || typeof u !== "object") return;
    for (const [k, v] of Object.entries(u as Record<string, unknown>)) {
      if (typeof v === "number") uso[k] = v;
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        // Medición: una línea por respuesta, visible con `wrangler tail`.
        console.log(
          `tutor uso · modo=${modo} modelo=${modelo} in=${uso.input_tokens ?? 0} ` +
            `cache_read=${uso.cache_read_input_tokens ?? 0} cache_creation=${uso.cache_creation_input_tokens ?? 0} ` +
            `out=${uso.output_tokens ?? 0}`,
        );
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
          } else if (evt.type === "message_start") {
            registrarUso(evt.message?.usage);
          } else if (evt.type === "message_delta") {
            registrarUso(evt.usage);
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

// El `system` de Anthropic va en bloques (para la caché); OpenAI/Groq usa un
// único mensaje de sistema con texto plano. Se concatenan los bloques.
function sistemaATexto(sistema: BloqueSistema[]): string {
  return sistema.map((b) => b.text).join("\n\n");
}

// Streaming con Groq (API compatible con OpenAI). Modelo por defecto
// openai/gpt-oss-120b: es de RAZONAMIENTO, así que pedimos reasoning_effort
// bajo (tutor ágil) y emitimos SOLO `content` al cliente, nunca el
// `reasoning`. gpt-oss es texto: la imagen de la obra no se adjunta.
async function streamGroq(
  env: Env,
  modo: Modo,
  modelo: string,
  maxTokens: number,
  sistema: string,
  messages: Mensaje[],
): Promise<ReadableStream<Uint8Array>> {
  const body = {
    model: modelo,
    max_tokens: maxTokens,
    reasoning_effort: "low",
    messages: [{ role: "system", content: sistema }, ...messages],
    stream: true,
    stream_options: { include_usage: true },
  };

  const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.GROQ_API_KEY as string}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!upstream.ok || !upstream.body) {
    const detalle = await upstream.text().catch(() => "");
    throw new Error(`Groq HTTP ${upstream.status}: ${detalle.slice(0, 300)}`);
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const uso: Record<string, number> = {};

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        console.log(
          `tutor uso · proveedor=groq modo=${modo} modelo=${modelo} ` +
            `in=${uso.prompt_tokens ?? 0} out=${uso.completion_tokens ?? 0}`,
        );
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
          const delta = evt.choices?.[0]?.delta;
          // Solo el contenido visible; el canal `reasoning` no se reenvía.
          if (delta && typeof delta.content === "string") {
            controller.enqueue(encoder.encode(delta.content));
          }
          if (evt.usage && typeof evt.usage === "object") {
            for (const [k, v] of Object.entries(evt.usage as Record<string, unknown>)) {
              if (typeof v === "number") uso[k] = v;
            }
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
    // Control de gasto: exige un Origin PERMITIDO. Antes solo se rechazaban los
    // orígenes explícitamente no permitidos, dejando pasar los POST SIN Origin
    // (curl/scripts) → cualquiera podía quemar tokens. Ahora se exige origen.
    if (!origenPermitido) {
      return new Response("Origen no permitido", { status: 403, headers: cors });
    }
    // Cuerpo desproporcionado → 413 (evita inflar tokens de entrada).
    const declarado = Number(request.headers.get("content-length") || "0");
    if (declarado > MAX_BODY_BYTES) {
      return new Response("Petición demasiado grande.", {
        status: 413,
        headers: { ...cors, "content-type": "text/plain; charset=utf-8" },
      });
    }
    const prov = proveedor(env);
    const faltaClave = prov === "groq" ? !env.GROQ_API_KEY : !env.ANTHROPIC_API_KEY;
    if (faltaClave) {
      const secreto = prov === "groq" ? "GROQ_API_KEY" : "ANTHROPIC_API_KEY";
      return new Response(`El tutor no está configurado (falta ${secreto}).`, {
        status: 503,
        headers: { ...cors, "content-type": "text/plain; charset=utf-8" },
      });
    }

    // Rate limiting por IP (TUTOR_RL) y GLOBAL (TUTOR_RL_GLOBAL, clave fija):
    // el segundo es un techo de gasto total aunque un atacante rote de IP.
    const limit429 = new Response("Demasiadas solicitudes. Inténtalo en un momento.", {
      status: 429,
      headers: { ...cors, "content-type": "text/plain; charset=utf-8", "retry-after": "30" },
    });
    if (env.TUTOR_RL) {
      const ip = request.headers.get("cf-connecting-ip") || "anon";
      const { success } = await env.TUTOR_RL.limit({ key: ip });
      if (!success) return limit429.clone();
    }
    if (env.TUTOR_RL_GLOBAL) {
      const { success } = await env.TUTOR_RL_GLOBAL.limit({ key: "global" });
      if (!success) return limit429.clone();
    }

    let payload: {
      modo?: string;
      leccion?: { titulo?: string; modulo?: string; contexto?: string };
      messages?: unknown;
      imagenObra?: unknown;
    };
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
      let cuerpo: ReadableStream<Uint8Array>;
      if (prov === "groq") {
        // gpt-oss es texto: no se adjunta la imagen (análisis solo-texto).
        const modelo = (env.GROQ_MODELO || GROQ_MODELO_DEFECTO).trim();
        cuerpo = await streamGroq(env, modo, modelo, MAX_TOKENS[modo], sistemaATexto(sistema), messages);
      } else {
        // Visión: adjunta la obra al primer turno (solo si es URL de Wikimedia).
        const mensajesApi = adjuntarImagen(messages, imagenPermitida(payload.imagenObra));
        cuerpo = await streamAnthropic(env, modo, MODELO[modo], MAX_TOKENS[modo], sistema, mensajesApi);
      }
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
