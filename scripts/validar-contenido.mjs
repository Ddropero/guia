// Valida la integridad del contenido del curso (sin red). Pensado para CI:
// sale con código ≠ 0 si encuentra problemas, de modo que un enlace roto o
// una lección sin título no lleguen a producción.
//
// Comprueba:
//  1. Enlaces internos .md: cada [texto](destino.md#ancla) debe resolver a un
//     archivo que existe (misma lógica que resolverRuta en src/lib/curso.ts).
//     Es la clase de bug que provocó los 404 del sitio.
//  2. Cada lección (NN-slug.md) tiene un título H1.
//
//   node scripts/validar-contenido.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BASE = path.join(ROOT, "curso-historia-del-arte");

const RUTAS_TOP = new Set([
  "00-guia-del-estudiante.md",
  "00-marco-pedagogico.md",
  "README.md",
  "docente/guia-del-docente.md",
]);

const problemas = [];

// Lista recursiva de .md dentro de curso-historia-del-arte/.
function listarMd(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listarMd(p));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

// Resuelve un destino .md a una ruta absoluta en disco (o null si no aplica).
function resolverArchivo(target, fileDir) {
  const clean = target.split("#")[0].replace(/^\.\//, "");
  if (!clean || !/\.md$/i.test(clean)) return null;
  const relBase = path.relative(BASE, fileDir).split(path.sep).join("/");
  const esBaseRel = /^(modulos|referencias|docente)\//.test(clean) || RUTAS_TOP.has(clean);
  const rel = esBaseRel ? clean : path.posix.normalize(path.posix.join(relBase, clean));
  return path.join(BASE, rel);
}

const archivos = listarMd(BASE);

for (const file of archivos) {
  const md = fs.readFileSync(file, "utf8");
  const fileDir = path.dirname(file);
  const rel = path.relative(ROOT, file);

  // 1. Enlaces internos .md
  for (const m of md.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = m[1].trim();
    if (/^(https?:|mailto:|#)/i.test(target)) continue;
    if (!/\.md(#|$)/i.test(target)) continue;
    const abs = resolverArchivo(target, fileDir);
    if (abs && !fs.existsSync(abs)) {
      problemas.push(`enlace roto en ${rel}: "${target}" → ${path.relative(ROOT, abs)}`);
    }
  }

  // 2. Título H1 en las lecciones (NN-slug.md, no en 00-modulo ni referencias)
  const nombre = path.basename(file);
  const enModulo = fileDir.includes(`${path.sep}modulos${path.sep}`);
  if (enModulo && /^\d+-/.test(nombre) && nombre !== "00-modulo.md") {
    if (!/^#\s+.+/m.test(md)) problemas.push(`sin título H1: ${rel}`);
  }

  // 3. HTML peligroso crudo en el fuente (defensa temprana de XSS, antes de
  //    renderizar). Se ignoran los bloques de código (marked los escapa).
  const sinCodigo = md.replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ");
  const PELIGROSOS = [
    /<script\b/i, /<iframe\b/i, /<object\b/i, /<embed\b/i, /<svg\b/i,
    /<style\b/i, /<form\b/i, /<noscript\b/i, /\son[a-z]+\s*=\s*["']/i,
  ];
  for (const pat of PELIGROSOS) {
    if (pat.test(sinCodigo)) problemas.push(`HTML peligroso en ${rel}: ${pat.source}`);
  }
}

if (problemas.length) {
  console.error(`✗ validar-contenido: ${problemas.length} problema(s):`);
  for (const p of problemas) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`✓ Contenido válido: ${archivos.length} archivos .md, enlaces internos y títulos OK.`);
