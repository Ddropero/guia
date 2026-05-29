/**
 * Centro de Costos — Worker de uso en vivo.
 *
 * GET /api/uso → costo del MES ACTUAL por servicio, leído de las APIs de cada
 * proveedor. Las credenciales son secrets del Worker (`wrangler secret put ...`).
 * Si falta un secret, ese proveedor se omite y el frontend usa su estimación.
 *
 * Respuesta: { generadoEn, periodo, costos: { <id>: usdMes }, parciales, errores }
 * Los <id> coinciden con los del catálogo del frontend (anthropic, twilio, cf-r2).
 *
 * NOTA: las formas de cada API se manejan a la defensiva; si un proveedor cambia
 * su esquema, cae en `errores` sin romper el resto.
 */

export interface Env {
  ANTHROPIC_ADMIN_KEY?: string;
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  ALLOW_ORIGIN?: string;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

function periodoMesActual(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { start, end: now };
}

// ── Anthropic: cost report (requiere Admin API key sk-ant-admin...) ──
type AnthropicCostReport = {
  data?: Array<{ results?: Array<{ amount?: string }> }>;
};
async function anthropicCost(env: Env): Promise<number | null> {
  if (!env.ANTHROPIC_ADMIN_KEY) return null;
  const { start, end } = periodoMesActual();
  const url = new URL("https://api.anthropic.com/v1/organizations/cost_report");
  url.searchParams.set("starting_at", start.toISOString());
  url.searchParams.set("ending_at", end.toISOString());
  const res = await fetch(url.toString(), {
    headers: {
      "x-api-key": env.ANTHROPIC_ADMIN_KEY,
      "anthropic-version": "2023-06-01",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as AnthropicCostReport;
  let total = 0;
  for (const bucket of data.data ?? []) {
    for (const r of bucket.results ?? []) {
      const amt = parseFloat(r.amount ?? "0");
      if (Number.isFinite(amt)) total += amt;
    }
  }
  return total;
}

// ── Twilio: usage records del mes (Basic Auth) ──
type TwilioUsage = {
  usage_records?: Array<{ category?: string; price?: string }>;
};
async function twilioCost(env: Env): Promise<number | null> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return null;
  const url =
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}` +
    `/Usage/Records/ThisMonth.json?PageSize=500`;
  const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
  const res = await fetch(url, { headers: { authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as TwilioUsage;
  let total = 0;
  for (const rec of data.usage_records ?? []) {
    const cat = (rec.category ?? "").toLowerCase();
    if (cat.includes("whatsapp") || cat.includes("sms") || cat.includes("messaging")) {
      const price = Math.abs(parseFloat(rec.price ?? "0"));
      if (Number.isFinite(price)) total += price;
    }
  }
  return total;
}

// ── Cloudflare: almacenamiento R2 vía GraphQL Analytics (best-effort) ──
type CfGraphQL = {
  data?: {
    viewer?: {
      accounts?: Array<{
        r2StorageAdaptiveGroups?: Array<{ max?: { payloadSize?: number } }>;
      }>;
    };
  };
};
async function cloudflareR2Cost(env: Env): Promise<number | null> {
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) return null;
  const { start, end } = periodoMesActual();
  const d = (x: Date) => x.toISOString().slice(0, 10);
  const query =
    "query($a:String!,$s:Date!,$e:Date!){viewer{accounts(filter:{accountTag:$a}){" +
    "r2StorageAdaptiveGroups(limit:1,filter:{date_geq:$s,date_leq:$e},orderBy:[date_DESC])" +
    "{max{payloadSize}}}}}";
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.CF_API_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: { a: env.CF_ACCOUNT_ID, s: d(start), e: d(end) },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as CfGraphQL;
  const groups =
    data.data?.viewer?.accounts?.[0]?.r2StorageAdaptiveGroups ?? [];
  const bytes = groups[0]?.max?.payloadSize ?? 0;
  const gb = bytes / 1e9;
  const FREE_GB = 10;
  const R2_USD_GB = 0.015;
  return Math.max(0, gb - FREE_GB) * R2_USD_GB;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOW_ORIGIN || "*";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/api/uso") {
      return new Response("Centro de Costos · uso en vivo. Usa GET /api/uso", {
        status: url.pathname === "/" ? 200 : 404,
        headers: { ...cors, "content-type": "text/plain; charset=utf-8" },
      });
    }

    const costos: Record<string, number> = {};
    const parciales: string[] = [];
    const errores: string[] = [];

    const tareas: Array<[string, string, Promise<number | null>]> = [
      ["anthropic", "anthropic", anthropicCost(env)],
      ["twilio", "twilio", twilioCost(env)],
      ["cf-r2", "cloudflare-r2", cloudflareR2Cost(env)],
    ];

    await Promise.all(
      tareas.map(async ([serviceId, nombre, promesa]) => {
        try {
          const valor = await promesa;
          if (valor == null) return; // sin credenciales → omitido
          costos[serviceId] = Math.round(valor * 100) / 100;
          parciales.push(nombre);
        } catch (e) {
          errores.push(`${nombre}: ${(e as Error).message}`);
        }
      }),
    );

    return new Response(
      JSON.stringify({
        generadoEn: new Date().toISOString(),
        periodo: "mes-actual",
        costos,
        parciales,
        errores,
      }),
      { headers: { ...cors, "content-type": "application/json; charset=utf-8" } },
    );
  },
};
