import { describe, expect, it } from "vitest";
import { enlazarGlosario, slugTermino } from "@/lib/glosario-enlaces";

const RUTA = "/curso/recursos/glosario";

/** Nº de enlaces de glosario en el HTML. */
function cuenta(html: string): number {
  return html.match(/<a class="glo"/g)?.length ?? 0;
}

describe("slugTermino", () => {
  it("normaliza a un ancla estable", () => {
    expect(slugTermino("Contrapposto")).toBe("contrapposto");
    expect(slugTermino("Arco de medio punto")).toBe("arco-de-medio-punto");
  });

  it("quita tildes y baja a minúsculas", () => {
    expect(slugTermino("Óleo")).toBe("oleo");
    expect(slugTermino("Pintura al fresco")).toBe("pintura-al-fresco");
  });

  it("colapsa y recorta guiones alrededor de puntuación", () => {
    expect(slugTermino("  ¿Sfumato?  ")).toBe("sfumato");
    expect(slugTermino("arte —  moderno")).toBe("arte-moderno");
  });
});

describe("enlazarGlosario", () => {
  it("enlaza la primera aparición y no las siguientes", () => {
    const html = "<p>El fresco es una técnica. Otro fresco aparece luego.</p>";
    const r = enlazarGlosario(html, ["fresco"], RUTA);
    expect(cuenta(r)).toBe(1);
    expect(r).toContain(`<a class="glo" href="${RUTA}#fresco">fresco</a>`);
    // la segunda aparición queda intacta
    expect(r).toContain("Otro fresco aparece");
  });

  it("no enlaza dentro de un <a> existente, pero sí fuera", () => {
    const html = '<p><a href="/x">fresco</a> y también fresco</p>';
    const r = enlazarGlosario(html, ["fresco"], RUTA);
    expect(cuenta(r)).toBe(1);
    // el enlace previo del contenido se conserva sin tocar
    expect(r).toContain('<a href="/x">fresco</a>');
    expect(r).toContain(`también <a class="glo" href="${RUTA}#fresco">fresco</a>`);
  });

  it("no enlaza dentro de un encabezado <h2>, pero sí en el párrafo", () => {
    const html = "<h2>El fresco</h2><p>El fresco florentino.</p>";
    const r = enlazarGlosario(html, ["fresco"], RUTA);
    expect(cuenta(r)).toBe(1);
    expect(r).toContain("<h2>El fresco</h2>");
    expect(r).toContain(`<a class="glo" href="${RUTA}#fresco">fresco</a> florentino`);
  });

  it("no enlaza dentro de <code>, pero sí en texto normal", () => {
    const html = "<p><code>fresco</code> y luego fresco</p>";
    const r = enlazarGlosario(html, ["fresco"], RUTA);
    expect(cuenta(r)).toBe(1);
    expect(r).toContain("<code>fresco</code>");
    expect(r).toContain(`luego <a class="glo" href="${RUTA}#fresco">fresco</a>`);
  });

  it("ignora tildes y mayúsculas al buscar, conservando el texto original", () => {
    const html = "<p>El Gótico tardío europeo.</p>";
    const r = enlazarGlosario(html, ["Gótico"], RUTA);
    expect(r).toBe(`<p>El <a class="glo" href="${RUTA}#gotico">Gótico</a> tardío europeo.</p>`);
  });

  it("empareja sin distinguir mayúsculas aunque el término venga capitalizado", () => {
    const html = "<p>un contrapposto sereno</p>";
    const r = enlazarGlosario(html, ["Contrapposto"], RUTA);
    expect(r).toContain(`<a class="glo" href="${RUTA}#contrapposto">contrapposto</a>`);
  });

  it("solo enlaza palabras completas (no subcadenas)", () => {
    const html = "<p>los marcos y los barcos</p>";
    const r = enlazarGlosario(html, ["arco"], RUTA);
    expect(cuenta(r)).toBe(0);
  });

  it("ante solapamientos prioriza el término más largo", () => {
    const html = "<p>El arco de medio punto románico.</p>";
    const r = enlazarGlosario(html, ["arco", "arco de medio punto"], RUTA);
    expect(cuenta(r)).toBe(1);
    expect(r).toContain(
      `<a class="glo" href="${RUTA}#arco-de-medio-punto">arco de medio punto</a>`,
    );
    // no aparece un enlace suelto para "arco"
    expect(r).not.toContain(`#arco"`);
  });

  it("no enlaza términos demasiado cortos (< 4 letras)", () => {
    const html = "<p>el eje de la composición</p>";
    const r = enlazarGlosario(html, ["eje"], RUTA);
    expect(cuenta(r)).toBe(0);
  });

  it("enlaza cada término una sola vez por lección aunque haya varios términos", () => {
    const html = "<p>El fresco y el temple conviven; más fresco y más temple.</p>";
    const r = enlazarGlosario(html, ["fresco", "temple"], RUTA);
    expect(cuenta(r)).toBe(2);
    expect(r).toContain(`#fresco">fresco</a>`);
    expect(r).toContain(`#temple">temple</a>`);
  });
});
