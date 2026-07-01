/**
 * Datos de las obras por lección + enlaces a Google Arts & Culture y miniaturas.
 *
 * `obras.json` lo genera scripts/construir-obras.mjs (obras por lección).
 * `obras-imagenes.json` lo genera scripts/fetch-imagenes.mjs (miniaturas de
 * dominio público desde Wikimedia; se corre donde haya salida a internet).
 * Ambos se leen en build (Server Components).
 */
import fs from "node:fs";
import path from "node:path";

export interface Obra {
  titulo: string;
  autor: string;
  q: string;
}

export interface ImagenObra {
  thumb?: string; // URL de la miniatura (Wikimedia), solo si es de dominio público/libre
  enlace?: string; // página de descripción (crédito)
  credito?: string; // autoría de la imagen / crédito
  licencia?: string; // licencia (p. ej. "Public domain", "CC BY-SA 4.0")
  none?: boolean; // se buscó y no hay imagen libre → no reintentar
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

export function getObras(moduloId: string, slug: string): Obra[] {
  return OBRAS[`${moduloId}/${slug}`] ?? [];
}

/** Enlace de búsqueda en Google Arts & Culture (sirve para cualquier obra). */
export function gac(q: string): string {
  return `https://artsandculture.google.com/search?q=${encodeURIComponent(q)}`;
}

/** Miniatura de dominio público, si se resolvió una. */
export function imagenDe(q: string): ImagenObra | null {
  const img = IMAGENES[q];
  if (!img || img.none || !img.thumb) return null;
  return img;
}
