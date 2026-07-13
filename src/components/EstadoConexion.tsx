"use client";

import { useEffect, useState } from "react";

/**
 * Aviso flotante cuando el navegador pierde la conexión: informa de que se
 * muestra contenido guardado. Se apoya en navigator.onLine + eventos
 * online/offline. Sin conexión, el Service Worker sirve lo cacheado o la página
 * /curso/sin-conexion.
 */
export default function EstadoConexion() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const actualizar = () => setOffline(!navigator.onLine);
    // Lectura inicial del estado (sistema externo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!navigator.onLine) setOffline(true);
    window.addEventListener("online", actualizar);
    window.addEventListener("offline", actualizar);
    return () => {
      window.removeEventListener("online", actualizar);
      window.removeEventListener("offline", actualizar);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-full border border-warn/60 bg-warn/15 px-4 py-1.5 text-xs text-fg shadow-lg backdrop-blur"
    >
      Sin conexión — mostrando contenido guardado
    </div>
  );
}
