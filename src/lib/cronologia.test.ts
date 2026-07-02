import { describe, expect, it } from "vitest";
import { parseAnio } from "@/lib/cronologia";

describe("parseAnio", () => {
  it("año a. C. / a. e. c. → negativo", () => {
    expect(parseAnio("c. 447 a. C.")).toBe(-447);
    expect(parseAnio("221–206 a. e. c.")).toBe(-221);
    expect(parseAnio("c. 1200–1046 a. e. c.")).toBe(-1200);
  });

  it("año llano (sin marcador) o e. c. → positivo", () => {
    expect(parseAnio("1907")).toBe(1907);
    expect(parseAnio("532–537")).toBe(532);
    expect(parseAnio("c. 70–80 e. c.")).toBe(70);
    expect(parseAnio("h. 1831")).toBe(1831);
  });

  it("siglos → punto medio, con el signo de la era", () => {
    expect(parseAnio("s. XV")).toBe(1450);
    expect(parseAnio("s. XX")).toBe(1950);
    expect(parseAnio("s. I a. e. c.")).toBe(-50);
  });

  it("rangos: toma el primer número y el marcador que lo sigue", () => {
    expect(parseAnio("c. 40.000–35.000 a. e. c.")).toBe(-40000);
    expect(parseAnio("c. 20 a. e. c. – 15 e. c.")).toBe(-20);
    expect(parseAnio("c. 2000–")).toBe(2000);
  });

  it("sin fecha reconocible → null", () => {
    expect(parseAnio("")).toBeNull();
    expect(parseAnio("(Tratado)")).toBeNull();
    expect(parseAnio("Lugar")).toBeNull();
  });
});
