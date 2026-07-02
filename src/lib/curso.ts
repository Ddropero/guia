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
import { imagenDe, wikipediaBuscar, wikipediaDe } from "@/lib/obras";

marked.setOptions({ gfm: true, breaks: false });

// Documentos de nivel superior → ruta del sitio.
const RUTAS_TOP: Record<string, string> = {
  "00-guia-del-estudiante.md": "/curso/recursos/guia-del-estudiante",
  "00-marco-pedagogico.md": "/curso/recursos/marco-pedagogico",
  "docente/guia-del-docente.md": "/curso/recursos/guia-del-docente",
  "README.md": "/curso",
};

/**
 * Convierte un enlace interno .md del contenido (relativo al archivo actual) en
 * su ruta del sitio. Devuelve null si no se puede mapear.
 * `baseRelDir` = carpeta del archivo actual, relativa a curso-historia-del-arte/.
 */
function resolverRuta(target: string, baseRelDir: string): string | null {
  const clean = target.split("#")[0].replace(/^\.\//, "");
  const esBaseRel = /^(modulos|referencias|docente)\//.test(clean) || clean in RUTAS_TOP;
  const abs = esBaseRel ? clean : path.posix.normalize(path.posix.join(baseRelDir, clean));
  if (RUTAS_TOP[abs]) return RUTAS_TOP[abs];
  const m = abs.match(/^modulos\/([^/]+)\/(.+)\.md$/);
  if (m) return m[2] === "00-modulo" ? `/curso/${m[1]}` : `/curso/${m[1]}/${m[2]}`;
  const r = abs.match(/^referencias\/(.+)\.md$/);
  if (r) return `/curso/recursos/${r[1]}`;
  return null;
}

// --- Miniaturas inline junto a cada obra comentada --------------------------
// La sección "## Obras maestras comentadas" lista cada obra bajo un "### N. …".
// Insertamos la miniatura (si hay una libre) junto a su comentario, para verla
// mientras se lee. Debe replicar la extracción de título/query de
// scripts/construir-obras.mjs para que las claves coincidan con obras-*.json.

const limpiaQuery = (s: string): string =>
  s
    .replace(/\*/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function parseHeadingObra(h: string): { titulo: string; q: string } {
  const it = h.match(/\*([^*]+)\*/); // título en cursiva, si lo hay
  let titulo: string;
  let autor = "";
  if (it) {
    titulo = it[1].trim();
    autor = (h.slice(0, it.index) + " " + h.slice(it.index! + it[0].length))
      .replace(/\*/g, "")
      .replace(/\([^)]*\)/g, " ")
      .replace(/[—–]/g, " ")
      .replace(/^[\s,:/]+|[\s,:/]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  } else {
    titulo = h.replace(/[—–]/g, "-").trim();
  }
  return { titulo: titulo.replace(/\s+/g, " ").trim(), q: limpiaQuery(`${titulo} ${autor}`) };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** `<figure>` en una sola línea (bloque HTML para marked) o null si no hay imagen libre. */
function figuraObra(titulo: string, q: string): string | null {
  const img = imagenDe(q);
  if (!img?.thumb) return null;
  const enlace = wikipediaDe(q)?.url ?? wikipediaBuscar(q);
  const t = escapeHtml(titulo);
  const lic = img.licencia ? `${escapeHtml(img.licencia)} · ` : "";
  const credito = img.enlace
    ? `<a href="${escapeHtml(img.enlace)}" target="_blank" rel="noopener noreferrer">Wikimedia</a>`
    : "Wikimedia";
  return (
    `<figure class="obra-inline">` +
    `<a href="${escapeHtml(enlace)}" target="_blank" rel="noopener noreferrer">` +
    `<img src="${escapeHtml(img.thumb)}" alt="${t}" loading="lazy" /></a>` +
    `<figcaption>${t}<span class="credito">imagen: ${lic}${credito}</span></figcaption>` +
    `</figure>`
  );
}

function inyectarObras(md: string): string {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => /^##\s+Obras maestras comentadas/i.test(l));
  if (start < 0) return md;
  const out: string[] = [];
  let dentro = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === start) {
      dentro = true;
      out.push(line);
      continue;
    }
    if (dentro && /^##\s/.test(line)) dentro = false;
    out.push(line);
    if (!dentro) continue;
    const m = line.match(/^###\s+(.+?)\s*$/);
    if (!m) continue;
    const h = m[1].replace(/^\d+[.)]\s*/, "").trim();
    if (/^otras\b/i.test(h)) continue; // subsección "Otras obras…", no es una obra
    const { titulo, q } = parseHeadingObra(h);
    const fig = figuraObra(titulo, q);
    if (fig) out.push("", fig, "");
  }
  return out.join("\n");
}

/** Renderiza Markdown a HTML reescribiendo los enlaces internos .md a rutas del sitio. */
function render(md: string, baseRelDir: string): string {
  const html = marked.parse(md) as string;
  return html.replace(/href="([^"]+)"/g, (full, target: string) => {
    if (/^(https?:|mailto:|#|\/)/i.test(target)) return full; // externo/ancla/absoluto
    if (!/\.md(#|$)/i.test(target)) return full;
    const ruta = resolverRuta(target, baseRelDir);
    if (!ruta) return full;
    const hash = target.includes("#") ? `#${target.split("#")[1]}` : "";
    return `href="${ruta}${hash}"`;
  });
}

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
    introHtml: introMd ? render(introMd, `modulos/${id}`) : null,
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
    html: render(inyectarObras(md), `modulos/${moduloId}`),
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
    const EXCLUIR = new Set(["informe-de-calidad", "verificacion-de-hechos", "evaluacion-integral"]);
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
  const relDir = path.relative(BASE, path.dirname(p)).split(path.sep).join("/");
  return { titulo: tituloDe(md) ?? prettify(slug), html: render(md, relDir) };
}
