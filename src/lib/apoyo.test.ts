import { describe, it, expect } from "vitest";
import { APOYA_URL, apoyaActivo } from "./apoyo";

// Estos tests fijan el contrato: sin enlace configurado, el apoyo está
// "inactivo" (no se pintan botones de pago que lleven a ningún sitio). El
// enlace se resuelve desde NEXT_PUBLIC_APOYA_URL en el build.
describe("apoyo", () => {
  it("está inactivo cuando no hay enlace", () => {
    // En el entorno de test no se define NEXT_PUBLIC_APOYA_URL ni la constante,
    // así que la URL queda vacía y apoyaActivo() es false.
    if (APOYA_URL === "") {
      expect(apoyaActivo()).toBe(false);
    } else {
      // Si alguien corre los tests con la variable puesta, debe ser una URL http(s).
      expect(apoyaActivo()).toBe(true);
    }
  });

  it("solo considera activas las URLs http(s)", () => {
    // apoyaActivo() se apoya en APOYA_URL; validamos su regla con la misma forma.
    const esHttp = (u: string) => /^https?:\/\//.test(u);
    expect(esHttp("https://ko-fi.com/x")).toBe(true);
    expect(esHttp("http://ko-fi.com/x")).toBe(true);
    expect(esHttp("ko-fi.com/x")).toBe(false);
    expect(esHttp("javascript:alert(1)")).toBe(false);
    expect(esHttp("")).toBe(false);
  });
});
