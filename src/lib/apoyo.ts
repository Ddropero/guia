/**
 * Configuración de mecenazgo / apoyo voluntario.
 *
 * PRINCIPIO: el curso es y seguirá siendo 100% gratis y sin publicidad. Esto
 * solo habilita una página /curso/apoya y un llamado suave (nunca un muro de
 * pago) para quien quiera SOSTENER el proyecto: hosting, el coste por mensaje
 * del tutor de IA, y el trabajo de añadir obras y verificar sus licencias.
 *
 * CÓMO ACTIVARLO (una sola vez):
 *   - Crea tu página en Ko-fi (u otra plataforma) y copia su enlace.
 *   - Pégalo abajo en ENLACE, p. ej. "https://ko-fi.com/tuusuario".
 *   - Alternativa sin tocar código: pásalo en el build como
 *     NEXT_PUBLIC_APOYA_URL=https://ko-fi.com/tuusuario
 *
 * Mientras no haya enlace, la página de apoyo explica el proyecto y ofrece
 * formas gratuitas de ayudar (compartir), pero no muestra ningún botón de pago.
 */

/** Enlace de mecenazgo. Déjalo vacío hasta tener tu cuenta lista. */
const ENLACE = "";

/** Nombre de la plataforma, solo para el texto del botón ("Apoyar en Ko-fi"). */
export const APOYA_PLATAFORMA = "Ko-fi";

/** URL efectiva: la variable de entorno gana sobre la constante del código. */
export const APOYA_URL = (process.env.NEXT_PUBLIC_APOYA_URL || ENLACE).trim();

/** ¿Hay un enlace de pago válido configurado? Si no, se ocultan los botones. */
export function apoyaActivo(): boolean {
  return /^https?:\/\//.test(APOYA_URL);
}
