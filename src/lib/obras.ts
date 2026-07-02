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

export function getObras(moduloId: string, slug: string): Obra[] {
  return OBRAS[`${moduloId}/${slug}`] ?? [];
}

/** Miniatura de dominio público, si se resolvió una (con `thumb` garantizado). */
export function imagenDe(q: string): (ImagenObra & { thumb: string }) | null {
  const img = IMAGENES[q];
  if (!img || img.none || !img.thumb) return null;
  return img as ImagenObra & { thumb: string };
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

/** Artículo de Wikipedia verificado para esta obra, si se resolvió uno. */
export function wikipediaDe(q: string): WikipediaObra | null {
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
