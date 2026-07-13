/**
 * historia.hilvan.org — sitio del Curso de Historia del Arte.
 *
 * Sirve la exportación estática de Next (`out/`) como Static Assets y redirige
 * la raíz "/" al curso ("/curso"), de modo que el dominio dedicado abra
 * directamente en el curso en lugar del dashboard de costos.
 *
 * `run_worker_first: true` (en wrangler.historia.jsonc) hace que este Worker
 * intercepte todas las rutas; para todo lo que no sea la raíz, delega en el
 * binding de assets (ASSETS), que replica el servido estático (incluye el
 * manejo de .html, p. ej. /curso → curso.html).
 *
 * Además añade CABECERAS DE SEGURIDAD (Fase 4G) a cada respuesta. Se fijan aquí
 * —no en el sitio— porque este Worker solo sirve historia.hilvan.org (el
 * dashboard de costos se sirve con otra config y NO debe heredar esta CSP, cuyo
 * connect-src apunta al tutor). Notas de la auditoría:
 *  - Con Next static export hay <script>/style inline de hidratación → es
 *    OBLIGATORIO 'unsafe-inline' en script-src/style-src; la CSP es defensa en
 *    profundidad, NO la mitigación de XSS (esa es la sanitización de marked).
 *  - Fuentes autoalojadas por next/font (font-src 'self'); el beacon de
 *    Cloudflare hace POST same-origin (/cdn-cgi/rum) → connect-src 'self' basta;
 *    solo su <script> externo entra en script-src.
 */
export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://upload.wikimedia.org",
  "font-src 'self'",
  "connect-src 'self' https://tutor.hilvan.org",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

export const CABECERAS_SEGURIDAD: Record<string, string> = {
  "content-security-policy": CSP,
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()",
  "strict-transport-security": "max-age=63072000; includeSubDomains",
  "x-frame-options": "DENY",
};

/** Devuelve una copia de la respuesta con las cabeceras de seguridad fijadas. */
export function conSeguridad(resp: Response): Response {
  const r = new Response(resp.body, resp);
  for (const [k, v] of Object.entries(CABECERAS_SEGURIDAD)) r.headers.set(k, v);
  return r;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return conSeguridad(
        new Response(null, { status: 301, headers: { location: new URL("/curso", url).toString() } }),
      );
    }
    return conSeguridad(await env.ASSETS.fetch(request));
  },
};
