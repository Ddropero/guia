/**
 * Carga del contenido del curso de Historia del Arte.
 *
 * El contenido vive como Markdown en `curso-historia-del-arte/` (generado por la
 * flota de agentes). Estas funciones se ejecutan en BUILD (Server Components +
 * generateStaticParams), leyendo el filesystem y renderizando a HTML con `marked`.
 */
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

const BASE = path.join(process.cwd(), "curso-historia-del-arte");
const MODULOS_DIR = path.join(BASE, "modulos");
const REFERENCIAS_DIR = path.join(BASE, "referencias");

export interface LeccionRef {
  slug: string; // nombre de archivo sin .md (incluye el prefijo NN-)
  titulo: string;
}

export interface ModuloRef {
  id: string; // nombre de carpeta (incluye prefijo NN-)
  titulo: string;
  lecciones: LeccionRef[];
}

export interface Leccion {
  moduloId: string;
  moduloTitulo: string;
  slug: string;
  titulo: string;
  subtitulo: string | null;
  html: string;
  texto: string; // markdown crudo, para dar contexto al tutor
  prev: { moduloId: string; slug: string; titulo: string } | null;
  next: { moduloId: string; slug: string; titulo: string } | null;
}

function existe(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function leer(p: string): string {
  return fs.readFileSync(p, "utf8");
}

function tituloDe(md: string): string | null {
  for (const linea of md.split("\n")) {
    const m = linea.match(/^#\s+(.+?)\s*$/);
    if (m) return m[1].trim();
  }
  return null;
}

function subtituloDe(md: string): string | null {
  const lineas = md.split("\n").map((l) => l.trim());
  for (const l of lineas) {
    if (!l) continue;
    if (l.startsWith("#")) continue; // saltamos el H1
    const m = l.match(/^\*+(.+?)\*+$/); // línea en cursiva con el módulo/periodo
    if (m) return m[1].trim();
    break; // solo miramos el primer bloque de texto tras el título
  }
  return null;
}

function prettify(folder: string): string {
  return folder
    .replace(/^\d+-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function listarLecciones(moduloId: string): LeccionRef[] {
  const dir = path.join(MODULOS_DIR, moduloId);
  if (!existe(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "00-modulo.md")
    .sort()
    .map((f) => {
      const slug = f.replace(/\.md$/, "");
      const titulo = tituloDe(leer(path.join(dir, f))) ?? prettify(slug);
      return { slug, titulo };
    });
}

/** Todos los módulos, en orden, con sus lecciones. */
export function getModulos(): ModuloRef[] {
  if (!existe(MODULOS_DIR)) return [];
  return fs
    .readdirSync(MODULOS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .map((id) => {
      const intro = path.join(MODULOS_DIR, id, "00-modulo.md");
      const titulo = (existe(intro) ? tituloDe(leer(intro)) : null) ?? prettify(id);
      return { id, titulo, lecciones: listarLecciones(id) };
    })
    .filter((m) => m.lecciones.length > 0);
}

export interface ModuloDetalle extends ModuloRef {
  introHtml: string | null;
}

export function getModulo(id: string): ModuloDetalle | null {
  const dir = path.join(MODULOS_DIR, id);
  if (!existe(dir)) return null;
  const lecciones = listarLecciones(id);
  if (lecciones.length === 0) return null;
  const intro = path.join(dir, "00-modulo.md");
  const introMd = existe(intro) ? leer(intro) : null;
  const titulo = (introMd ? tituloDe(introMd) : null) ?? prettify(id);
  return {
    id,
    titulo,
    lecciones,
    introHtml: introMd ? (marked.parse(introMd) as string) : null,
  };
}

export function getLeccion(moduloId: string, slug: string): Leccion | null {
  const file = path.join(MODULOS_DIR, moduloId, `${slug}.md`);
  if (!existe(file)) return null;
  const md = leer(file);

  const modulos = getModulos();
  const modulo = modulos.find((m) => m.id === moduloId);
  const lecciones = modulo?.lecciones ?? listarLecciones(moduloId);
  const idx = lecciones.findIndex((l) => l.slug === slug);
  const prevRef = idx > 0 ? lecciones[idx - 1] : null;
  const nextRef = idx >= 0 && idx < lecciones.length - 1 ? lecciones[idx + 1] : null;

  return {
    moduloId,
    moduloTitulo: modulo?.titulo ?? prettify(moduloId),
    slug,
    titulo: tituloDe(md) ?? prettify(slug),
    subtitulo: subtituloDe(md),
    html: marked.parse(md) as string,
    texto: md,
    prev: prevRef ? { moduloId, slug: prevRef.slug, titulo: prevRef.titulo } : null,
    next: nextRef ? { moduloId, slug: nextRef.slug, titulo: nextRef.titulo } : null,
  };
}

// --- Recursos (guías + materiales de referencia, sin tutor) -----------------

export interface RecursoRef {
  slug: string;
  titulo: string;
  grupo: "Guías" | "Referencias";
}

// Documentos de nivel superior (guías). slug → ruta relativa a BASE.
const DOCS_TOP: Array<{ slug: string; file: string }> = [
  { slug: "guia-del-estudiante", file: "00-guia-del-estudiante.md" },
  { slug: "marco-pedagogico", file: "00-marco-pedagogico.md" },
  { slug: "guia-del-docente", file: "docente/guia-del-docente.md" },
];

function rutaRecurso(slug: string): string | null {
  const top = DOCS_TOP.find((d) => d.slug === slug);
  if (top) return path.join(BASE, top.file);
  const ref = path.join(REFERENCIAS_DIR, `${slug}.md`);
  if (existe(ref)) return ref;
  return null;
}

export function getRecursos(): RecursoRef[] {
  const recursos: RecursoRef[] = [];
  for (const d of DOCS_TOP) {
    const p = path.join(BASE, d.file);
    if (existe(p)) {
      recursos.push({ slug: d.slug, titulo: tituloDe(leer(p)) ?? prettify(d.slug), grupo: "Guías" });
    }
  }
  if (existe(REFERENCIAS_DIR)) {
    // Informes editoriales internos (QA/fact-check): quedan en el repo pero no
    // se listan como material de referencia del estudiante.
    const EXCLUIR = new Set(["informe-de-calidad", "verificacion-de-hechos"]);
    for (const f of fs.readdirSync(REFERENCIAS_DIR).filter((f) => f.endsWith(".md")).sort()) {
      const slug = f.replace(/\.md$/, "");
      if (EXCLUIR.has(slug)) continue;
      const titulo = tituloDe(leer(path.join(REFERENCIAS_DIR, f))) ?? prettify(slug);
      recursos.push({ slug, titulo, grupo: "Referencias" });
    }
  }
  return recursos;
}

export function getRecurso(slug: string): { titulo: string; html: string } | null {
  const p = rutaRecurso(slug);
  if (!p || !existe(p)) return null;
  const md = leer(p);
  return { titulo: tituloDe(md) ?? prettify(slug), html: marked.parse(md) as string };
}
