import { describe, it, expect } from "vitest";
import worker, { conSeguridad, CABECERAS_SEGURIDAD, type Env } from "./index";

const envAssets: Env = {
  ASSETS: { fetch: async () => new Response("<html>ok</html>", { headers: { "content-type": "text/html" } }) },
};

function req(path: string): Request {
  return new Request(`https://historia.hilvan.org${path}`);
}

describe("cabeceras de seguridad (historia)", () => {
  it("conSeguridad fija CSP y las cabeceras defensivas", () => {
    const r = conSeguridad(new Response("x"));
    expect(r.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(r.headers.get("permissions-policy")).toContain("geolocation=()");
    expect(r.headers.get("strict-transport-security")).toContain("max-age=");
    expect(r.headers.get("x-frame-options")).toBe("DENY");
  });

  it("la CSP permite el tutor y Wikimedia, y bloquea marcos", () => {
    const csp = CABECERAS_SEGURIDAD["content-security-policy"];
    expect(csp).toContain("connect-src 'self' https://tutor.hilvan.org");
    expect(csp).toContain("img-src 'self' https://upload.wikimedia.org");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("añade las cabeceras a las respuestas de assets", async () => {
    const r = await worker.fetch(req("/curso"), envAssets);
    expect(r.headers.get("content-security-policy")).toBeTruthy();
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await r.text()).toContain("ok");
  });

  it("la raíz redirige a /curso, también con cabeceras", async () => {
    const r = await worker.fetch(req("/"), envAssets);
    expect(r.status).toBe(301);
    expect(r.headers.get("location")).toContain("/curso");
    expect(r.headers.get("content-security-policy")).toBeTruthy();
  });
});
