/**
 * Cuestionarios por módulo, leídos en build desde src/data/quiz.json
 * (generado por scripts/construir-quiz.mjs a partir del banco de evaluación).
 */
import fs from "node:fs";
import path from "node:path";

export interface Opcion {
  letra: string;
  texto: string;
}

export interface Pregunta {
  n: number;
  nivel: string;
  enunciado: string;
  opciones: Opcion[];
  correcta: string;
}

export interface Cuestionario {
  modulo: string; // "M0" … "M12"
  titulo: string;
  preguntas: Pregunta[];
}

function cargar(): Record<string, Cuestionario> {
  try {
    const p = path.join(process.cwd(), "src", "data", "quiz.json");
    return JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, Cuestionario>;
  } catch {
    return {};
  }
}

const QUIZ = cargar();

export function getCuestionario(moduloId: string): Cuestionario | null {
  return QUIZ[moduloId] ?? null;
}

export function tieneCuestionario(moduloId: string): boolean {
  return moduloId in QUIZ;
}
