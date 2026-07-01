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
 */
export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return Response.redirect(new URL("/curso", url).toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
