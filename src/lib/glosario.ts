/**
 * Parseo del glosario del curso (referencias/glosario.md) en build.
 * Formato de cada entrada: `**Término** — Definición.` (una por línea).
 */
import fs from "node:fs";
import path from "node:path";

export interface Termino {
  termino: string;
  definicion: string;
}

const GLOSARIO = path.join(
  process.cwd(),
  "curso-historia-del-arte",
  "referencias",
  "glosario.md",
);

const plano = (s: string): string =>
  s
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function getGlosario(): Termino[] {
  let md: string;
  try {
    md = fs.readFileSync(GLOSARIO, "utf8");
  } catch {
    return [];
  }
  const terminos: Termino[] = [];
  for (const linea of md.split("\n")) {
    // **Término** — Definición  (el separador es un guion largo con espacios)
    const m = linea.match(/^\*\*(.+?)\*\*\s+[—–]\s+(.+)$/);
    if (!m) continue;
    const termino = plano(m[1]);
    const definicion = plano(m[2]);
    if (termino && definicion) terminos.push({ termino, definicion });
  }
  return terminos;
}
