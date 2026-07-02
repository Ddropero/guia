import { describe, expect, it } from "vitest";
import { parseHeadingObra, resolverRuta } from "@/lib/curso";

describe("parseHeadingObra", () => {
  it("separa título en cursiva y autor", () => {
    const r = parseHeadingObra("*La Gioconda*, de Leonardo da Vinci");
    expect(r.titulo).toBe("La Gioconda");
    expect(r.autor).toBe("de Leonardo da Vinci");
    expect(r.q).toBe("La Gioconda de Leonardo da Vinci");
  });

  it("sin cursiva: todo es título y no hay autor", () => {
    const r = parseHeadingObra("Cabeza Nok");
    expect(r.titulo).toBe("Cabeza Nok");
    expect(r.autor).toBe("");
    expect(r.q).toBe("Cabeza Nok");
  });

  it("quita paréntesis (fechas/aclaraciones) de la query", () => {
    const r = parseHeadingObra("*Discóbolo* (copia romana), de Mirón");
    expect(r.titulo).toBe("Discóbolo");
    expect(r.q).toBe("Discóbolo de Mirón");
  });
});

describe("resolverRuta", () => {
  const base = "modulos/03-asia-clasica";

  it("enlace hermano dentro del módulo", () => {
    expect(resolverRuta("01-arte-de-la-india.md", base)).toBe(
      "/curso/03-asia-clasica/01-arte-de-la-india",
    );
  });

  it("enlace a otro módulo con ../", () => {
    expect(resolverRuta("../04-arte-islamico/03-imperios.md", base)).toBe(
      "/curso/04-arte-islamico/03-imperios",
    );
  });

  it("referencias/ mapea a /curso/recursos", () => {
    expect(resolverRuta("referencias/glosario.md", base)).toBe("/curso/recursos/glosario");
  });

  it("00-modulo.md apunta a la portada del módulo", () => {
    expect(resolverRuta("00-modulo.md", base)).toBe("/curso/03-asia-clasica");
  });

  it("ignora el ancla al resolver", () => {
    expect(resolverRuta("02-arte-de-china.md#pincel", base)).toBe(
      "/curso/03-asia-clasica/02-arte-de-china",
    );
  });

  it("devuelve null si no se puede mapear", () => {
    expect(resolverRuta("../../fuera.md", base)).toBeNull();
  });
});
