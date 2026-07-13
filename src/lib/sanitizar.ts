/**
 * Sanitizador de defensa en profundidad para el HTML que produce `marked`.
 *
 * El contenido del curso es de confianza (Markdown del propio repo) y un guard
 * en CI (scripts/validar-contenido.mjs) bloquea HTML peligroso en el fuente,
 * pero `marked@14` NO sanitiza (la opción `sanitize` se eliminó en v5). Esta
 * función añade una barrera en el render, por si algo se colara: elimina
 * scripts/estilos y otros elementos peligrosos con su contenido, las etiquetas
 * peligrosas sueltas, los atributos de evento (on*) y los esquemas de URL
 * peligrosos (javascript:, data:, vbscript:, file:) en href/src.
 *
 * No pretende ser un parser HTML completo: opera sobre la salida bien formada de
 * `marked` como capa adicional; la prevención primaria es el guard de CI + la
 * naturaleza confiable del contenido.
 */

// Elementos peligrosos que arrastran su contenido (se borran enteros).
const ELEMENTOS_CON_CONTENIDO =
  /<(script|style|svg|math|iframe|object|embed|template|noscript)\b[\s\S]*?<\/\1\s*>/gi;
// Etiquetas peligrosas sueltas (apertura o cierre huérfano, autocerradas).
const ETIQUETAS_SUELTAS =
  /<\/?(script|style|svg|math|iframe|object|embed|template|noscript|form|input|button|link|meta|base|textarea|select|option)\b[^>]*>/gi;
// Atributos de evento inline: onclick, onerror, onload…
const ATRIBUTOS_EVENTO = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
// href/src con esquema peligroso → se elimina el atributo entero.
const URL_PELIGROSA =
  /\s(?:href|src|xlink:href)\s*=\s*(?:"\s*(?:javascript|data|vbscript|file):[^"]*"|'\s*(?:javascript|data|vbscript|file):[^']*'|(?:javascript|data|vbscript|file):[^\s>]+)/gi;

export function sanitizarHtml(html: string): string {
  let out = html;
  // 1. Elementos peligrosos con su contenido (repetido por si hay anidamiento).
  let prev: string;
  do {
    prev = out;
    out = out.replace(ELEMENTOS_CON_CONTENIDO, "");
  } while (out !== prev);
  // 2. Etiquetas peligrosas sueltas.
  out = out.replace(ETIQUETAS_SUELTAS, "");
  // 3. Atributos de evento on*.
  out = out.replace(ATRIBUTOS_EVENTO, "");
  // 4. Esquemas de URL peligrosos.
  out = out.replace(URL_PELIGROSA, "");
  return out;
}
