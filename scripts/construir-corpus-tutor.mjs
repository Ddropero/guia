#!/usr/bin/env node
/**
 * construir-corpus-tutor.mjs — corpus canónico para el Worker del tutor.
 *
 * Genera workers/tutor/src/corpus.json con:
 *   - lessons[lessonId] = { titulo, modulo, contexto }  (verdad del sistema)
 *   - works[workId]     = { titulo, autor, imagen }      (solo obras con imagen
 *                          no rechazada del manifiesto; imagen resuelta aquí)
 *
 * El Worker resuelve lessonId/workId contra ESTE corpus, de modo que el cliente
 * nunca envía el contexto de la lección ni una URL de imagen arbitraria: solo
 * identificadores. Idempotente, sin red. Se ejecuta en build (npm run datos).
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();
const MODULOS = path.join(RAIZ, "curso-historia-del-arte", "modulos");
const DATA = path.join(RAIZ, "src", "data");
const SALIDA = path.join(RAIZ, "workers", "tutor", "src", "corpus.json");

const MAX_CONTEXTO = 6000; // caracteres por lección (compacto pero suficiente)

const primerH1 = (md) => (md.match(/^#\s+(.+?)\s*$/m)?.[1] ?? "").trim();
const prettify = (slug) =>
  slug.replace(/^\d+[-_]/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// --- Lecciones ---
const lessons = {};
for (const moduloId of fs.readdirSync(MODULOS).sort()) {
  const dir = path.join(MODULOS, moduloId);
  if (!fs.statSync(dir).isDirectory()) continue;
  let moduloTitulo = "";
  const modMd = path.join(dir, "00-modulo.md");
  if (fs.existsSync(modMd)) moduloTitulo = primerH1(fs.readFileSync(modMd, "utf8")) || prettify(moduloId);
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith(".md") || f === "00-modulo.md") continue;
    const slug = f.replace(/\.md$/, "");
    const md = fs.readFileSync(path.join(dir, f), "utf8");
    lessons[`${moduloId}/${slug}`] = {
      titulo: primerH1(md) || prettify(slug),
      modulo: moduloTitulo,
      contexto: md.slice(0, MAX_CONTEXTO),
    };
  }
}

// --- Catálogo de obras con imagen (del manifiesto de integridad) ---
const cargar = (f, fb) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));
  } catch {
    return fb;
  }
};
const manifiesto = cargar("obras-imagenes-manifiesto.json", { obras: {} }).obras ?? {};
const works = {};
for (const [q, e] of Object.entries(manifiesto)) {
  if (e.status === "rejected") continue;
  const imagen = e.thumb640 || e.thumb960 || "";
  // Solo URLs de Wikimedia (defensa en profundidad; el Worker lo revalida).
  if (!/^https:\/\/upload\.wikimedia\.org\//.test(imagen)) continue;
  works[q] = { titulo: e.titulo, autor: e.autor, imagen };
}

const doc = {
  _doc: "Corpus del tutor (lecciones + obras con imagen). Genera scripts/construir-corpus-tutor.mjs. El Worker resuelve lessonId/workId contra esto; el cliente solo manda IDs.",
  generadoLecciones: Object.keys(lessons).length,
  generadoObras: Object.keys(works).length,
  lessons,
  works,
};
fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, JSON.stringify(doc, null, 2) + "\n");
console.log(`Corpus: ${Object.keys(lessons).length} lecciones · ${Object.keys(works).length} obras con imagen → ${path.relative(RAIZ, SALIDA)}`);
