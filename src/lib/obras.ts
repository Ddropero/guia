/**
 * Datos de las obras por lección + enlaces a Wikipedia y miniaturas.
 *
 * `obras.json` lo genera scripts/construir-obras.mjs (obras por lección).
 * `obras-imagenes.json` lo genera scripts/fetch-imagenes.mjs (miniaturas de
 * dominio público desde Wikimedia Commons).
 * `obras-wikipedia.json` lo genera scripts/fetch-wikipedia.mjs (artículo
 * exacto en Wikipedia en español, verificado, si existe).
 * Ambos scripts necesitan salida a internet: se corren donde la haya.
 * Los tres archivos se leen en build (Server Components).
 */
import fs from "node:fs";
import path from "node:path";

export interface Obra {
  titulo: string;
  autor: string;
  q: string;
  fecha?: string;
  tecnica?: string;
  ubicacion?: string;
}

export interface ImagenObra {
  thumb?: string; // URL de la miniatura (Wikimedia), solo si es de dominio público/libre
  enlace?: string; // página de descripción (crédito)
  credito?: string; // autoría de la imagen / crédito
  licencia?: string; // licencia (p. ej. "Public domain", "CC BY-SA 4.0")
  none?: boolean; // se buscó y no hay imagen libre → no reintentar
}

export interface WikipediaObra {
  titulo: string; // título real del artículo (puede diferir de la ficha)
  url: string; // enlace directo al artículo
  extracto?: string; // primeras líneas, para tooltip
  none?: boolean; // se buscó y no hay artículo de confianza → no reintentar
}

// Enriquecimiento desde Wikidata (obras-wikidata.json; lo genera fetch-wikidata.mjs).
// Verificado contra la ficha (autor/fecha/museo): fuente PREFERENTE de imagen y enlace.
interface WikidataObra {
  qid?: string;
  wikipedia?: string; // URL del artículo eswiki
  imagen?: { thumb: string; enlace: string; licencia: string; credito?: string };
  none?: boolean;
}

const DATA = path.join(process.cwd(), "src", "data");

function cargar<T>(archivo: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, archivo), "utf8")) as T;
  } catch {
    return fallback;
  }
}

const OBRAS = cargar<Record<string, Obra[]>>("obras.json", {});
const IMAGENES = cargar<Record<string, ImagenObra>>("obras-imagenes.json", {});
const WIKIPEDIA = cargar<Record<string, WikipediaObra>>("obras-wikipedia.json", {});
const WIKIDATA = cargar<Record<string, WikidataObra>>("obras-wikidata.json", {});
// Curación MANUAL (obras-imagenes-override.json). Gana sobre todas las fuentes:
//   { "<q>": { "none": true } }                          → forzar sin imagen (la automática era errónea)
//   { "<q>": { "thumb": "...", "licencia": "...", ... } } → fijar una imagen concreta
const OVERRIDE = cargar<Record<string, ImagenObra>>("obras-imagenes-override.json", {});

export function getObras(moduloId: string, slug: string): Obra[] {
  return OBRAS[`${moduloId}/${slug}`] ?? [];
}

/** Overrides de imagen ya existentes (para precargar la herramienta de revisión). */
export function getOverridesImagenes(): Record<string, ImagenObra> {
  return OVERRIDE;
}

/**
 * Miniatura libre de la obra (con `thumb` garantizado). Precedencia:
 * curación manual (override) → Wikidata (P18, verificado) → Wikimedia Commons.
 */
export function imagenDe(q: string): (ImagenObra & { thumb: string }) | null {
  const ov = OVERRIDE[q];
  if (ov) {
    if (ov.none || !ov.thumb) return null; // curado como "sin imagen"
    return ov as ImagenObra & { thumb: string };
  }
  const wd = WIKIDATA[q]?.imagen;
  if (wd?.thumb) {
    return { thumb: wd.thumb, enlace: wd.enlace, credito: wd.credito, licencia: wd.licencia };
  }
  const img = IMAGENES[q];
  if (!img || img.none || !img.thumb) return null;
  return img as ImagenObra & { thumb: string };
}

export interface ImagenMostrada {
  q: string;
  titulo: string;
  autor: string;
  fecha?: string;
  tecnica?: string;
  ubicacion?: string;
  thumb: string;
  fuente: "override" | "wikidata" | "commons";
}

/**
 * Lista de TODAS las obras que hoy muestran una imagen, con su ficha y la
 * fuente de la que sale (para la herramienta de revisión /curso/revisar).
 * Aplica la misma precedencia que imagenDe(); una obra sin imagen se omite.
 */
export function imagenesMostradas(): ImagenMostrada[] {
  const ficha = new Map<string, Obra>();
  for (const lista of Object.values(OBRAS)) {
    for (const o of lista) if (!ficha.has(o.q)) ficha.set(o.q, o);
  }
  const out: ImagenMostrada[] = [];
  for (const [q, o] of ficha) {
    const ov = OVERRIDE[q];
    let thumb: string | undefined;
    let fuente: ImagenMostrada["fuente"];
    if (ov) {
      if (ov.none || !ov.thumb) continue; // curada como "sin imagen"
      thumb = ov.thumb;
      fuente = "override";
    } else if (WIKIDATA[q]?.imagen?.thumb) {
      thumb = WIKIDATA[q]!.imagen!.thumb;
      fuente = "wikidata";
    } else {
      const img = IMAGENES[q];
      if (!img || img.none || !img.thumb) continue;
      thumb = img.thumb;
      fuente = "commons";
    }
    out.push({
      q,
      titulo: o.titulo,
      autor: o.autor,
      fecha: o.fecha,
      tecnica: o.tecnica,
      ubicacion: o.ubicacion,
      thumb,
      fuente,
    });
  }
  return out;
}

/**
 * Versión a mayor resolución de una miniatura de Wikimedia, para el visor.
 * Las URLs de thumb terminan en ".../NNNpx-Nombre.jpg"; se sube a 1600px.
 * Wikimedia devuelve el mayor tamaño disponible si el original es menor.
 * Si la URL no encaja con el patrón, se devuelve tal cual.
 */
export function fullDe(thumb: string): string {
  return thumb.replace(/\/\d+px-/, "/1600px-");
}

/**
 * Artículo de Wikipedia (es) para esta obra. Precedencia: Wikidata (sitelink
 * eswiki, verificado) → resolución directa de fetch-wikipedia.mjs (verificada).
 */
export function wikipediaDe(q: string): WikipediaObra | null {
  const wdUrl = WIKIDATA[q]?.wikipedia;
  if (wdUrl) {
    const titulo = decodeURIComponent(wdUrl.split("/wiki/")[1] ?? "").replace(/_/g, " ");
    return { titulo: titulo || q, url: wdUrl };
  }
  const w = WIKIPEDIA[q];
  if (!w || w.none || !w.url) return null;
  return w;
}

/**
 * Enlace de respaldo a Wikipedia en español: usa el comportamiento "Ir" del
 * buscador (salta directo al artículo si el título coincide; si no, cae en
 * los resultados de búsqueda). Válido para cualquier obra sin necesitar red
 * en build.
 */
export function wikipediaBuscar(q: string): string {
  return `https://es.wikipedia.org/w/index.php?title=Especial:Buscar&search=${encodeURIComponent(q)}&go=Go`;
}
