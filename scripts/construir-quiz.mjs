// Construye src/data/quiz.json: por cada módulo, el cuestionario interactivo.
//
// Fuente autoritativa: la sección "# B · Cuestionarios por módulo" de
// curso-historia-del-arte/referencias/banco-de-evaluacion.md. Cada bloque
// "## Módulo N ·" trae preguntas de opción múltiple y termina con una línea
// "**Clave MN:** 1‑**c** · 2‑**b** · …" (ojo: el separador número‑letra es el
// guion U+2011, no un guion normal).
//
// PRECISIÓN: el build ABORTA si el banco no valida (13 módulos, cada pregunta
// con opciones y una respuesta correcta que existe). Si un agente regenera el
// banco con otro formato, esto falla ruidosamente en vez de degradar en silencio.
//
// Local, sin red:  node scripts/construir-quiz.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BANCO = path.join(ROOT, "curso-historia-del-arte", "referencias", "banco-de-evaluacion.md");
const MODULOS_DIR = path.join(ROOT, "curso-historia-del-arte", "modulos");
const SALIDA = path.join(ROOT, "src", "data", "quiz.json");

const MODULOS_ESPERADOS = 13; // M0 … M12

// Quita el marcado de énfasis de Markdown dejando texto plano legible.
const plano = (s) =>
  (s || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();

function abortar(msg) {
  console.error(`\n✗ construir-quiz: ${msg}`);
  process.exit(1);
}

// M<k> → id de carpeta del módulo (00-fundamentos, 01-…), por prefijo NN-.
const carpetas = fs
  .readdirSync(MODULOS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);
function moduloIdDe(k) {
  const pref = `${String(k).padStart(2, "0")}-`;
  const dir = carpetas.find((c) => c.startsWith(pref));
  if (!dir) abortar(`no encuentro la carpeta del módulo M${k} (prefijo ${pref})`);
  return dir;
}

if (!fs.existsSync(BANCO)) abortar(`no existe ${path.relative(ROOT, BANCO)}`);
const lines = fs.readFileSync(BANCO, "utf8").split("\n");

const RE_MODULO = /^##\s+Módulo\s+(\d+)\s*·\s*(.+?)\s*$/;
const RE_PREGUNTA = /^(\d+)\.\s+\*\*\[([^\]]+)\]\*\*\s+(.+?)\s*$/;
const RE_OPCION = /^\s*[-*]\s+([a-z])\)\s+(.+?)\s*$/;
const RE_CLAVE = /^\*\*Clave\s+M(\d+):\*\*\s*(.+?)\s*$/;

const bloques = new Map(); // k → { titulo, preguntas: [{n,nivel,enunciado,opciones}], clave }
let actual = null;

for (const raw of lines) {
  const mMod = raw.match(RE_MODULO);
  if (mMod) {
    const k = Number(mMod[1]);
    actual = { k, titulo: `Módulo ${k} · ${plano(mMod[2])}`, preguntas: [], clave: null };
    bloques.set(k, actual);
    continue;
  }
  if (/^#\s/.test(raw)) actual = null; // salimos de la sección B al llegar a otro "# …"
  if (!actual) continue;

  const mCl = raw.match(RE_CLAVE);
  if (mCl) {
    const k = Number(mCl[1]);
    const destino = bloques.get(k) || actual;
    destino.clave = mCl[2];
    continue;
  }
  const mP = raw.match(RE_PREGUNTA);
  if (mP) {
    actual.preguntas.push({
      n: Number(mP[1]),
      nivel: mP[2].trim(),
      enunciado: plano(mP[3]),
      opciones: [],
    });
    continue;
  }
  const mO = raw.match(RE_OPCION);
  if (mO && actual.preguntas.length) {
    actual.preguntas[actual.preguntas.length - 1].opciones.push({
      letra: mO[1],
      texto: plano(mO[2]),
    });
  }
}

// Parsea "1‑**c** · 2‑**b** · …" → Map n→letra (acepta guion U+2011 o normal).
function parseClave(str) {
  const mapa = new Map();
  for (const parte of str.split("·")) {
    const m = parte.match(/(\d+)\s*[‑‐\-]\s*\*\*([a-z])\*\*/);
    if (m) mapa.set(Number(m[1]), m[2]);
  }
  return mapa;
}

const quiz = {};
let totalPreg = 0;

for (let k = 0; k <= 12; k++) {
  const b = bloques.get(k);
  if (!b) abortar(`falta el bloque del Módulo ${k}`);
  if (!b.clave) abortar(`el Módulo ${k} no tiene línea "**Clave M${k}:**"`);
  if (!b.preguntas.length) abortar(`el Módulo ${k} no tiene preguntas`);

  const clave = parseClave(b.clave);
  if (clave.size !== b.preguntas.length) {
    abortar(
      `Módulo ${k}: la clave tiene ${clave.size} respuestas pero hay ${b.preguntas.length} preguntas`,
    );
  }

  const preguntas = b.preguntas.map((p) => {
    if (p.opciones.length < 2) abortar(`Módulo ${k}, pregunta ${p.n}: tiene <2 opciones`);
    const correcta = clave.get(p.n);
    if (!correcta) abortar(`Módulo ${k}, pregunta ${p.n}: sin respuesta en la clave`);
    if (!p.opciones.some((o) => o.letra === correcta)) {
      abortar(`Módulo ${k}, pregunta ${p.n}: la clave dice "${correcta}" pero no existe esa opción`);
    }
    return { n: p.n, nivel: p.nivel, enunciado: p.enunciado, opciones: p.opciones, correcta };
  });

  quiz[moduloIdDe(k)] = { modulo: `M${k}`, titulo: b.titulo, preguntas };
  totalPreg += preguntas.length;
}

const nModulos = Object.keys(quiz).length;
if (nModulos !== MODULOS_ESPERADOS) {
  abortar(`esperaba ${MODULOS_ESPERADOS} módulos con cuestionario, encontré ${nModulos}`);
}

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, JSON.stringify(quiz, null, 2) + "\n");

console.log(`✓ Cuestionarios: ${nModulos} módulos · ${totalPreg} preguntas`);
console.log(`Escrito: ${path.relative(ROOT, SALIDA)}`);
