/**
 * Enlazado automático del glosario dentro del HTML ya renderizado de las lecciones.
 *
 * Funciones PURAS (sin fs, sin window): se ejecutan en BUILD (Node), tras
 * `render()` de src/lib/curso.ts. No usan un parser DOM del navegador: recorren
 * el HTML por escaneo, distinguiendo etiquetas de nodos de texto.
 */

/** Pliega una cadena para comparar sin distinguir tildes ni mayúsculas. */
function plegar(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Ancla estable para un término del glosario: minúsculas, sin marcas
 * diacríticas, todo lo no-alfanumérico convertido en "-", con los guiones
 * colapsados y recortados en los extremos.
 *
 * El orquestador usa ESTE MISMO slug para los `id=` de la página del glosario,
 * de modo que los enlaces `#ancla` de las lecciones apunten a su definición.
 * Ej.: "Contrapposto" → "contrapposto"; "Arco de medio punto" → "arco-de-medio-punto".
 */
export function slugTermino(t: string): string {
  return plegar(t)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Elementos dentro de los cuales NO se debe enlazar (contenido técnico o ya
// enlazado / títulos). El contador combinado funciona porque el HTML de `marked`
// está bien anidado.
const PROHIBIDAS = new Set(["a", "code", "pre", "h1", "h2", "h3", "h4", "h5", "h6"]);

// Palabras demasiado comunes: nunca se enlazan aunque figuren como término.
const EXCLUIDAS = new Set<string>([
  "para",
  "como",
  "este",
  "esta",
  "esto",
  "pero",
  "cuando",
  "donde",
  "porque",
  "entre",
  "sobre",
  "cada",
  "todo",
  "toda",
]);

// Longitud mínima (en letras/dígitos) para considerar un término enlazable.
const MIN_LETRAS = 4;

interface Segmento {
  etiqueta: boolean; // true = trozo `<...>`; false = nodo de texto
  texto: string;
  enlazable: boolean; // solo nodos de texto fuera de elementos prohibidos
  ocupado: Array<[number, number]>; // rangos ya enlazados (coords del texto original)
  enlaces: Array<{ ini: number; fin: number; slug: string }>;
  plegado?: { folded: string; map: number[] };
}

/** ¿Es `c` un carácter de palabra (para detectar límites de palabra completa)? */
function esCarPalabra(c: string): boolean {
  return c !== "" && ((c >= "a" && c <= "z") || (c >= "0" && c <= "9"));
}

/**
 * Pliega el texto conservando un mapa 1:N de índice-plegado → índice-original,
 * para poder recortar el fragmento ORIGINAL (con sus tildes/mayúsculas) tras
 * localizar una coincidencia en la forma plegada.
 */
function mapaPlegado(texto: string): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  for (let i = 0; i < texto.length; i++) {
    const f = plegar(texto[i]);
    for (let k = 0; k < f.length; k++) {
      folded += f[k];
      map.push(i);
    }
  }
  return { folded, map };
}

/** Trocea el HTML en etiquetas y nodos de texto, marcando cuáles son enlazables. */
function tokenizar(html: string): Segmento[] {
  const segs: Segmento[] = [];
  let profundidad = 0; // > 0 ⇒ dentro de un elemento prohibido
  let i = 0;
  const n = html.length;

  const nodoTexto = (texto: string): Segmento => ({
    etiqueta: false,
    texto,
    enlazable: profundidad === 0,
    ocupado: [],
    enlaces: [],
  });

  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt < 0) {
      segs.push(nodoTexto(html.slice(i)));
      break;
    }
    if (lt > i) segs.push(nodoTexto(html.slice(i, lt)));

    let gt = html.indexOf(">", lt);
    if (gt < 0) gt = n - 1; // etiqueta sin cerrar: hasta el final
    const etiqueta = html.slice(lt, gt + 1);

    const m = etiqueta.match(/^<\s*(\/?)\s*([a-zA-Z0-9]+)/);
    if (m) {
      const cerrando = m[1] === "/";
      const nombre = m[2].toLowerCase();
      if (PROHIBIDAS.has(nombre)) {
        profundidad = cerrando ? Math.max(0, profundidad - 1) : profundidad + 1;
      }
    }
    segs.push({ etiqueta: true, texto: etiqueta, enlazable: false, ocupado: [], enlaces: [] });
    i = gt + 1;
  }
  return segs;
}

/** ¿El rango [a,b) solapa alguno de los rangos ya ocupados? */
function solapa(rangos: Array<[number, number]>, a: number, b: number): boolean {
  return rangos.some(([s, e]) => a < e && s < b);
}

/**
 * Intenta enlazar la primera aparición de `termFolded` (palabra completa) en un
 * segmento de texto, sin solapar enlaces previos. Devuelve true si lo enlazó.
 */
function intentarEnlazar(seg: Segmento, termFolded: string, slug: string): boolean {
  const { folded, map } = seg.plegado!;
  const L = termFolded.length;
  let desde = 0;
  for (;;) {
    const idx = folded.indexOf(termFolded, desde);
    if (idx < 0) return false;
    const fin = idx + L;
    const antes = idx > 0 ? folded[idx - 1] : "";
    const despues = fin < folded.length ? folded[fin] : "";
    if (!esCarPalabra(antes) && !esCarPalabra(despues)) {
      const ini = map[idx];
      const finOrig = fin < folded.length ? map[fin] : seg.texto.length;
      if (!solapa(seg.ocupado, ini, finOrig)) {
        seg.ocupado.push([ini, finOrig]);
        seg.enlaces.push({ ini, fin: finOrig, slug });
        return true;
      }
    }
    desde = idx + 1;
  }
}

/** Reconstruye un segmento insertando los enlaces `<a class="glo">` acumulados. */
function emitir(seg: Segmento, ruta: string): string {
  if (seg.etiqueta || seg.enlaces.length === 0) return seg.texto;
  const orden = [...seg.enlaces].sort((a, b) => a.ini - b.ini);
  let out = "";
  let pos = 0;
  for (const e of orden) {
    out += seg.texto.slice(pos, e.ini);
    const original = seg.texto.slice(e.ini, e.fin);
    out += `<a class="glo" href="${ruta}#${e.slug}">${original}</a>`;
    pos = e.fin;
  }
  out += seg.texto.slice(pos);
  return out;
}

/**
 * Enlaza en `html` la PRIMERA aparición de cada término del glosario (palabra
 * completa, sin distinguir tildes ni mayúsculas), como máximo una vez por
 * término y por lección. Solo actúa en nodos de texto que no estén dentro de
 * `<a>`, `<h1..h6>`, `<code>` o `<pre>`, ni solapen otro enlace ya creado.
 * Ante solapamientos, prioriza los términos más largos. Conserva el texto
 * original dentro de cada `<a class="glo" href="{rutaGlosario}#{slug}">…</a>`.
 */
export function enlazarGlosario(html: string, terminos: string[], rutaGlosario: string): string {
  if (!html || terminos.length === 0) return html;

  // Prepara los términos: plegados, con slug, filtrados y ordenados por longitud
  // descendente (los más largos reclaman primero su hueco → ganan al solapar).
  const prep = terminos
    .map((orig) => {
      const folded = plegar(orig.trim());
      return {
        folded,
        slug: slugTermino(orig),
        letras: folded.replace(/[^a-z0-9]/g, "").length,
      };
    })
    .filter((t) => t.letras >= MIN_LETRAS && !EXCLUIDAS.has(t.folded))
    .sort((a, b) => b.folded.length - a.folded.length);

  const segs = tokenizar(html);
  const enlazados = new Set<string>(); // términos ya enlazados (clave = forma plegada)

  for (const t of prep) {
    if (enlazados.has(t.folded)) continue;
    for (const seg of segs) {
      if (!seg.enlazable || seg.texto === "") continue;
      if (!seg.plegado) seg.plegado = mapaPlegado(seg.texto);
      if (intentarEnlazar(seg, t.folded, t.slug)) {
        enlazados.add(t.folded);
        break;
      }
    }
  }

  return segs.map((s) => emitir(s, rutaGlosario)).join("");
}
