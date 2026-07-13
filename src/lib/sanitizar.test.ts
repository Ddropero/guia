import { describe, it, expect } from "vitest";
import { sanitizarHtml } from "./sanitizar";

describe("sanitizarHtml (defensa en profundidad XSS)", () => {
  it("elimina <script> y su contenido", () => {
    const out = sanitizarHtml('<p>hola</p><script>alert(1)</script>');
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("<p>hola</p>");
  });

  it("quita atributos on* (onerror/onload/onclick)", () => {
    const out = sanitizarHtml('<img src="x" onerror="alert(1)"><a onclick="x()">y</a>');
    expect(out).not.toMatch(/onerror/i);
    expect(out).not.toMatch(/onclick/i);
    expect(out).not.toContain("alert(1)");
  });

  it("neutraliza href/src con javascript:, data:, vbscript:, file:", () => {
    expect(sanitizarHtml('<a href="javascript:alert(1)">x</a>')).not.toMatch(/javascript:/i);
    expect(sanitizarHtml('<a href="data:text/html;base64,PHN2Zz4=">x</a>')).not.toMatch(/data:/i);
    expect(sanitizarHtml('<img src="vbscript:msgbox(1)">')).not.toMatch(/vbscript:/i);
  });

  it("elimina svg/iframe/object/embed/math/style/noscript", () => {
    for (const t of ["svg", "iframe", "object", "embed", "math", "style", "noscript"]) {
      const out = sanitizarHtml(`<${t} onload="alert(1)">contenido</${t}>`);
      expect(out, t).not.toMatch(new RegExp(`<${t}`, "i"));
      expect(out, t).not.toContain("alert(1)");
    }
    // svg autocerrado / sin cierre también.
    expect(sanitizarHtml("<svg onload=alert(1)>")).not.toMatch(/<svg|onload/i);
  });

  it("elimina form/input/button/link/meta/base sueltos", () => {
    const out = sanitizarHtml('<form action="/x"><input name="a"><button>b</button></form><meta http-equiv="refresh">');
    for (const t of ["form", "input", "button", "meta"]) expect(out, t).not.toMatch(new RegExp(`<${t}`, "i"));
  });

  it("conserva el HTML legítimo (negrita, enlaces https, listas, figura de obra)", () => {
    const legit =
      '<p><strong>Renacimiento</strong> y <em>humanismo</em>.</p>' +
      '<ul><li><a href="https://es.wikipedia.org/wiki/Giotto">Giotto</a></li></ul>' +
      '<figure class="obra-inline"><img src="https://upload.wikimedia.org/x.jpg" alt="obra"/></figure>';
    const out = sanitizarHtml(legit);
    expect(out).toContain("<strong>Renacimiento</strong>");
    expect(out).toContain('href="https://es.wikipedia.org/wiki/Giotto"');
    expect(out).toContain('class="obra-inline"');
    expect(out).toContain('src="https://upload.wikimedia.org/x.jpg"');
    expect(out).toContain('alt="obra"');
  });
});
