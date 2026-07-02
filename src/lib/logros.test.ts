import { describe, expect, it } from "vitest";
import { calcularLogros, type Logro, type ModuloLecciones } from "@/lib/logros";
import type { Estado } from "@/lib/progreso";

function estadoVacio(): Estado {
  return { v: 2, lecciones: {}, quiz: {} };
}

// Curso de ejemplo: dos módulos, tres lecciones en total.
const MODULOS: ModuloLecciones[] = [
  { id: "01-intro", leccionIds: ["01-intro/01-que-es-el-arte", "01-intro/02-como-mirar"] },
  { id: "02-egipto", leccionIds: ["02-egipto/01-piramides"] },
];

function conLecciones(...ids: string[]): Estado {
  const e = estadoVacio();
  for (const id of ids) e.lecciones[id] = { completadaEn: "2026-07-02T00:00:00.000Z" };
  return e;
}

function conseguido(logros: Logro[], id: string): boolean {
  return logros.find((l) => l.id === id)?.conseguido ?? false;
}

describe("calcularLogros", () => {
  it("estado vacío: ningún logro conseguido", () => {
    const logros = calcularLogros(estadoVacio(), MODULOS);
    expect(logros.length).toBeGreaterThan(0);
    expect(logros.every((l) => !l.conseguido)).toBe(true);
  });

  it("consigue 'curso completo' cuando están todas las lecciones", () => {
    const estado = conLecciones(
      "01-intro/01-que-es-el-arte",
      "01-intro/02-como-mirar",
      "02-egipto/01-piramides",
    );
    const logros = calcularLogros(estado, MODULOS);
    expect(conseguido(logros, "curso-completo")).toBe(true);
    // completar el curso implica también la primera lección y el primer módulo
    expect(conseguido(logros, "primera-leccion")).toBe(true);
    expect(conseguido(logros, "primer-modulo")).toBe(true);
  });

  it("no consigue 'curso completo' si falta una lección", () => {
    const estado = conLecciones("01-intro/01-que-es-el-arte", "01-intro/02-como-mirar");
    const logros = calcularLogros(estado, MODULOS);
    expect(conseguido(logros, "curso-completo")).toBe(false);
    // pero el primer módulo sí está completo
    expect(conseguido(logros, "primer-modulo")).toBe(true);
  });

  it("consigue el cuestionario perfecto cuando mejor === total", () => {
    const estado = estadoVacio();
    estado.quiz["01-intro"] = { mejor: 5, total: 5, hechoEn: "2026-07-02T00:00:00.000Z" };
    const logros = calcularLogros(estado, MODULOS);
    expect(conseguido(logros, "cuestionario-perfecto")).toBe(true);
    // un cuestionario perfecto también supera el umbral notable (>= 80 %)
    expect(conseguido(logros, "cuestionario-notable")).toBe(true);
  });

  it("un cuestionario al 80 % es notable pero no perfecto", () => {
    const estado = estadoVacio();
    estado.quiz["01-intro"] = { mejor: 4, total: 5, hechoEn: "2026-07-02T00:00:00.000Z" };
    const logros = calcularLogros(estado, MODULOS);
    expect(conseguido(logros, "cuestionario-notable")).toBe(true);
    expect(conseguido(logros, "cuestionario-perfecto")).toBe(false);
  });
});
