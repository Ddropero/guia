import { describe, expect, it } from "vitest";
import { degradar, estaVencida, INTERVALOS, promover } from "@/lib/repaso";

describe("estaVencida", () => {
  it("una carta sin estado siempre está vencida", () => {
    expect(estaVencida(undefined, "2026-07-02")).toBe(true);
  });
  it("vencida si la fecha de repaso ya llegó", () => {
    expect(estaVencida({ box: 2, next: "2026-07-02" }, "2026-07-02")).toBe(true);
    expect(estaVencida({ box: 2, next: "2026-07-01" }, "2026-07-02")).toBe(true);
  });
  it("no vencida si el repaso es en el futuro", () => {
    expect(estaVencida({ box: 2, next: "2026-07-05" }, "2026-07-02")).toBe(false);
  });
});

describe("promover", () => {
  it("una carta nueva pasa a la caja 1 y se reprograma a +1 día", () => {
    expect(promover(undefined, "2026-07-02")).toEqual({ box: 1, next: "2026-07-03" });
  });
  it("sube de caja y aplica el intervalo correspondiente", () => {
    // caja 2 → 3, intervalo de la caja 3 = INTERVALOS[2] = 4 días
    expect(promover({ box: 2, next: "2026-07-02" }, "2026-07-02")).toEqual({
      box: 3,
      next: "2026-07-06",
    });
  });
  it("no pasa de la caja 5", () => {
    const r = promover({ box: 5, next: "2026-07-02" }, "2026-07-02");
    expect(r.box).toBe(5);
    expect(r.next).toBe("2026-07-18"); // +16 días (INTERVALOS[4])
  });
});

describe("degradar", () => {
  it("vuelve a la caja 1, repaso mañana", () => {
    expect(degradar("2026-07-02")).toEqual({ box: 1, next: "2026-07-03" });
  });
});

describe("INTERVALOS", () => {
  it("son 5 cajas crecientes", () => {
    expect(INTERVALOS).toEqual([1, 2, 4, 8, 16]);
  });
});
