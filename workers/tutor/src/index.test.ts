import { describe, expect, it } from "vitest";
import { imagenPermitida, proveedor, proveedorEfectivo, resolverOrigen, sanearMensajes } from "./index";

function req(origin?: string): Request {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  return new Request("https://tutor.hilvan.org/api/tutor", { method: "POST", headers });
}

describe("resolverOrigen", () => {
  it("acepta el origen exacto de la lista", () => {
    const env = { ALLOW_ORIGIN: "https://historia.hilvan.org" };
    expect(resolverOrigen(req("https://historia.hilvan.org"), env)).toBe("https://historia.hilvan.org");
  });

  it("sin cabecera Origin devuelve null (no navegador)", () => {
    expect(resolverOrigen(req(), { ALLOW_ORIGIN: "https://historia.hilvan.org" })).toBeNull();
  });

  it("rechaza un origen que no está en la lista", () => {
    expect(resolverOrigen(req("https://evil.com"), { ALLOW_ORIGIN: "https://historia.hilvan.org" })).toBeNull();
  });

  it("comodín https://*.sufijo acepta subdominios de preview", () => {
    const env = { ALLOW_ORIGIN: "https://historia.hilvan.org,https://*.pages.dev" };
    expect(resolverOrigen(req("https://deploy-123.pages.dev"), env)).toBe("https://deploy-123.pages.dev");
  });

  it("'*' permite cualquiera", () => {
    expect(resolverOrigen(req("https://cualquiera.com"), { ALLOW_ORIGIN: "*" })).toBe("*");
  });
});

describe("sanearMensajes", () => {
  it("no-array → []", () => {
    expect(sanearMensajes(null)).toEqual([]);
    expect(sanearMensajes("hola")).toEqual([]);
  });

  it("descarta entradas inválidas y conserva las buenas", () => {
    const out = sanearMensajes([
      { role: "user", content: "hola" },
      { role: "system", content: "x" },
      { role: "assistant", content: "  " },
      { role: "assistant", content: "respuesta" },
    ]);
    expect(out).toEqual([
      { role: "user", content: "hola" },
      { role: "assistant", content: "respuesta" },
    ]);
  });

  it("la conversación debe empezar por user (descarta assistant inicial)", () => {
    const out = sanearMensajes([
      { role: "assistant", content: "hola" },
      { role: "user", content: "pregunta" },
    ]);
    expect(out).toEqual([{ role: "user", content: "pregunta" }]);
  });

  it("recorta el contenido demasiado largo", () => {
    const out = sanearMensajes([{ role: "user", content: "a".repeat(5000) }]);
    expect(out[0].content.length).toBe(4000);
  });
});

describe("proveedor", () => {
  it("por defecto es anthropic", () => {
    expect(proveedor({})).toBe("anthropic");
    expect(proveedor({ TUTOR_PROVEEDOR: "" })).toBe("anthropic");
    expect(proveedor({ TUTOR_PROVEEDOR: "claude" })).toBe("anthropic");
  });

  it("groq cuando TUTOR_PROVEEDOR lo indica (sin distinguir mayúsculas/espacios)", () => {
    expect(proveedor({ TUTOR_PROVEEDOR: "groq" })).toBe("groq");
    expect(proveedor({ TUTOR_PROVEEDOR: "  GROQ " })).toBe("groq");
  });
});

describe("proveedorEfectivo (híbrido)", () => {
  const groq = { TUTOR_PROVEEDOR: "groq" };

  it("Groq sin imagen se queda en Groq", () => {
    expect(proveedorEfectivo({ ...groq, ANTHROPIC_API_KEY: "k" }, false)).toBe("groq");
  });

  it("Groq con imagen + clave de Anthropic → Claude (visión real)", () => {
    expect(proveedorEfectivo({ ...groq, ANTHROPIC_API_KEY: "k" }, true)).toBe("anthropic");
  });

  it("Groq con imagen pero SIN clave de Anthropic → se queda en Groq (texto)", () => {
    expect(proveedorEfectivo(groq, true)).toBe("groq");
  });

  it("Con base Anthropic siempre Anthropic", () => {
    expect(proveedorEfectivo({ ANTHROPIC_API_KEY: "k" }, false)).toBe("anthropic");
    expect(proveedorEfectivo({ ANTHROPIC_API_KEY: "k" }, true)).toBe("anthropic");
  });
});

describe("imagenPermitida", () => {
  it("acepta una URL https de upload.wikimedia.org", () => {
    const u = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Foo.jpg/640px-Foo.jpg";
    expect(imagenPermitida(u)).toBe(u);
  });

  it("rechaza otro host", () => {
    expect(imagenPermitida("https://evil.com/foo.jpg")).toBeNull();
  });

  it("rechaza http (no https)", () => {
    expect(imagenPermitida("http://upload.wikimedia.org/foo.jpg")).toBeNull();
  });

  it("rechaza lo que no es string", () => {
    expect(imagenPermitida(123)).toBeNull();
    expect(imagenPermitida(null)).toBeNull();
  });
});
