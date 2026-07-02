"use client";

import { useEffect } from "react";

/**
 * Registra el service worker "/sw.js" de la PWA (offline). No pinta nada.
 * Guardado contra SSR (typeof navigator) y contra fallos (try/catch + .catch).
 */
export default function RegistrarSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const registrar = () => {
      try {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          /* registro rechazado (p. ej. contexto no seguro): la app funciona igual */
        });
      } catch {
        /* API no disponible en este navegador: lo ignoramos */
      }
    };

    // Esperamos a 'load' para no competir con los recursos críticos del arranque.
    if (document.readyState === "complete") {
      registrar();
      return;
    }
    window.addEventListener("load", registrar, { once: true });
    return () => window.removeEventListener("load", registrar);
  }, []);

  return null;
}
