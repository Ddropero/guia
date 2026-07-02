/**
 * Parser en BUILD de la cronología maestra del curso.
 *
 * Lee `curso-historia-del-arte/referencias/linea-de-tiempo.md` (mismo patrón
 * fs/node que `curso.ts`) y devuelve una lista tipada de hitos ordenada por año.
 * El documento organiza las eras en `## Era N · …` y, dentro, regiones en
 * `### …`; cada hito es una fila de una tabla Markdown
 * `| Fecha | Hito | Lugar | Por qué importa |`.
 *
 * NO se inventan datos: si una fila de tabla no tiene una fecha reconocible por
 * `parseAnio`, se OMITE y se cuenta (se avisa por consola en build).
 */
import fs from "node:fs";
import path from "node:path";

export interface Hito {
  anio: number; // año representativo para ordenar (negativo si a. C.)
  etiqueta: string; // fecha tal cual, p. ej. "c. 447 a. C."
  texto: string; // hito / obra / cultura (columna 2, sin marcas Markdown)
  region?: string; // subsección regional (### …), si la fila está en una
  era?: string; // era (## Era N · …) a la que pertenece la fila
  lugar?: string; // columna "Lugar"
  porque?: string; // columna "Por qué importa"
}

// --- parseAnio: función pura y testeable ------------------------------------

const ROMANOS: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };

function romanoAEntero(r: string): number | null {
  const s = r.toLowerCase();
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMANOS[s[i]];
    if (!cur) return null;
    const sig = ROMANOS[s[i + 1]] ?? 0;
    total += cur < sig ? -cur : cur;
  }
  return total > 0 ? total : null;
}

/**
 * Convierte una etiqueta de fecha en un año entero para ordenar.
 *  - "c. 447 a. C."          → -447
 *  - "1907"                  → 1907
 *  - "s. XV"                 → 1450 (punto medio del siglo)
 *  - "s. I a. e. c."         → -50
 *  - null si no hay fecha reconocible.
 *
 * En rangos ("c. 40.000–35.000 a. e. c.") toma el PRIMER número; el signo lo
 * fija el primer marcador de era (a. C. / a. e. c. → negativo) que sigue a ese
 * número, de modo que rangos que cruzan la era ("c. 20 a. e. c. – 15 e. c.")
 * se resuelven por su extremo inicial (-20).
 */
export function parseAnio(etiqueta: string): number | null {
  if (!etiqueta) return null;

  // Normalizamos las notaciones de era a marcadores simples AC / DC, en orden
  // (la más larga primero) para no dejar restos parciales.
  let s = etiqueta.toLowerCase();
  s = s.replace(/a\.?\s*e\.?\s*c\.?/g, " AC "); // a. e. c.
  s = s.replace(/a\.?\s*c\.?/g, " AC "); // a. C.
  s = s.replace(/d\.?\s*c\.?/g, " DC "); // d. C.
  s = s.replace(/e\.?\s*c\.?/g, " DC "); // e. c.

  // Siglo: "s. XV" → punto medio del siglo; signo según la era.
  const mSiglo = s.match(/s\.\s*([ivxlcdm]+)\b/);
  if (mSiglo) {
    const n = romanoAEntero(mSiglo[1]);
    if (n) {
      const base = (n - 1) * 100 + 50;
      return s.includes("AC") ? -base : base;
    }
  }

  // Primer número (admite separador de miles ".": "40.000").
  const mNum = s.match(/\d[\d.]*/);
  if (!mNum || mNum.index === undefined) return null;
  const n = parseInt(mNum[0].replace(/\./g, ""), 10);
  if (Number.isNaN(n)) return null;

  // Signo: primer marcador de era que aparece tras ese número.
  const resto = s.slice(mNum.index + mNum[0].length);
  const iAC = resto.indexOf("AC");
  const iDC = resto.indexOf("DC");
  let negativo: boolean;
  if (iAC === -1) negativo = false;
  else if (iDC === -1) negativo = true;
  else negativo = iAC < iDC;
  return negativo ? -n : n;
}

// --- Parseo del Markdown ----------------------------------------------------

const RUTA = path.join(
  process.cwd(),
  "curso-historia-del-arte",
  "referencias",
  "linea-de-tiempo.md",
);

/** Quita marcas de énfasis Markdown y normaliza espacios. */
const limpiarMd = (s: string): string =>
  s
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Celdas de una fila de tabla Markdown (sin las barras de los extremos). */
function celdasDeFila(linea: string): string[] {
  const t = linea.trim();
  const cuerpo = t.startsWith("|") ? t.slice(1) : t;
  const fin = cuerpo.endsWith("|") ? cuerpo.slice(0, -1) : cuerpo;
  return fin.split("|").map((c) => c.trim());
}

/** Fila separadora de cabecera: solo guiones (y opcionales `:` de alineación). */
const esSeparador = (celdas: string[]): boolean =>
  celdas.length > 0 && celdas.every((c) => /^:?-{2,}:?$/.test(c) || c === "");

/**
 * Parseo PURO (sin fs) del contenido Markdown → hitos + nº de filas de tabla
 * omitidas por no tener fecha reconocible. Expuesto para poder testearlo.
 */
export function parseCronologia(md: string): { hitos: Hito[]; omitidas: number } {
  const lineas = md.split("\n");
  let era: string | undefined;
  let region: string | undefined;
  let omitidas = 0;
  const hitos: Hito[] = [];

  for (const linea of lineas) {
    // Encabezado de era: "## Era N · Nombre (fechas)".
    const mEra = linea.match(/^##\s+Era\s+\d+\s*·\s*(.+?)\s*$/);
    if (mEra) {
      era = limpiarMd(mEra[1].replace(/\s*\(.*$/, "")); // sin el rango entre paréntesis
      region = undefined;
      continue;
    }
    // Otro H2 (nota introductoria, "cómo usar…"): quedamos fuera de toda era.
    if (/^##\s+/.test(linea)) {
      era = undefined;
      region = undefined;
      continue;
    }
    // Subsección regional dentro de una era.
    const mReg = linea.match(/^###\s+(.+?)\s*$/);
    if (mReg) {
      region = limpiarMd(mReg[1].replace(/\s*\(.*$/, ""));
      continue;
    }

    // Solo nos interesan las filas de tabla.
    if (!/^\s*\|/.test(linea)) continue;
    const celdas = celdasDeFila(linea);
    if (esSeparador(celdas)) continue;
    if (celdas.length < 2) {
      omitidas++;
      continue;
    }
    if (/^fecha\b/i.test(celdas[0])) continue; // fila de cabecera

    const etiqueta = celdas[0].replace(/\s+/g, " ").trim();
    const anio = parseAnio(etiqueta);
    if (anio === null) {
      // Sin fecha fiable → se omite y se cuenta (nunca se adivina).
      omitidas++;
      continue;
    }
    const texto = limpiarMd(celdas[1] ?? "");
    if (!texto) {
      omitidas++;
      continue;
    }

    hitos.push({
      anio,
      etiqueta,
      texto,
      region,
      era,
      lugar: celdas[2] ? limpiarMd(celdas[2]) : undefined,
      porque: celdas[3] ? limpiarMd(celdas[3]) : undefined,
    });
  }

  hitos.sort((a, b) => a.anio - b.anio);
  return { hitos, omitidas };
}

/**
 * Lee el .md en build y devuelve los hitos ordenados por año.
 * Firma: `getCronologia(): Hito[]`.
 */
export function getCronologia(): Hito[] {
  let md: string;
  try {
    md = fs.readFileSync(RUTA, "utf8");
  } catch {
    return [];
  }
  const { hitos, omitidas } = parseCronologia(md);
  if (omitidas > 0) {
    console.warn(`[cronologia] ${omitidas} fila(s) de tabla omitidas (sin fecha reconocible).`);
  }
  return hitos;
}
