// Service worker de la PWA "Historia del Arte".
//
// Estrategia SEGURA contra el bug del "sitio que no se actualiza":
//   - Navegaciones / HTML          -> NETWORK-FIRST (siempre fresco online; cae al
//                                     caché solo si no hay red, con /curso de reserva).
//   - Assets con hash (/_next/static/) -> CACHE-FIRST (son inmutables: el hash va en
//                                     el nombre, así que cachear "para siempre" es seguro).
//   - Imágenes                     -> STALE-WHILE-REVALIDATE (rápidas y se refrescan detrás).
//
// El progreso del alumno vive en localStorage (no se toca aquí). Solo el tutor
// necesita red, y vive en otro origen (Worker aparte), que NO interceptamos.

const CACHE = "historia-v1";
const FALLBACK = "/curso"; // página de reserva cuando se navega offline

// Mínimo a precachear para que la app arranque sin conexión.
const PRECACHE = [FALLBACK];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // allSettled: no reventamos la instalación si algún recurso no se puede cachear.
      await Promise.allSettled(PRECACHE.map((url) => cache.add(url)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Invalidamos cualquier caché de versiones anteriores.
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

// --- Clasificadores de petición -------------------------------------------

function esNavegacion(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" && (request.headers.get("accept") || "").includes("text/html"))
  );
}

function esAssetConHash(url) {
  return url.pathname.startsWith("/_next/static/");
}

function esImagen(request, url) {
  return (
    request.destination === "image" ||
    /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i.test(url.pathname)
  );
}

// --- Estrategias -----------------------------------------------------------

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const respuesta = await fetch(request);
    // Guardamos copia de la navegación para poder servirla offline más tarde.
    if (respuesta && respuesta.ok) cache.put(request, respuesta.clone());
    return respuesta;
  } catch {
    const enCache = await cache.match(request);
    if (enCache) return enCache;
    const reserva = await cache.match(FALLBACK);
    if (reserva) return reserva;
    return new Response("Sin conexión", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const enCache = await cache.match(request);
  if (enCache) return enCache;
  const respuesta = await fetch(request);
  if (respuesta && respuesta.ok) cache.put(request, respuesta.clone());
  return respuesta;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const enCache = await cache.match(request);
  const red = fetch(request)
    .then((respuesta) => {
      if (respuesta && respuesta.ok) cache.put(request, respuesta.clone());
      return respuesta;
    })
    .catch(() => null);
  return enCache || (await red) || new Response("", { status: 504 });
}

// --- Enrutado --------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // solo cacheamos GET

  const url = new URL(request.url);
  // No tocamos otros orígenes (p. ej. el tutor en su Worker, o la analítica).
  if (url.origin !== self.location.origin) return;

  if (esNavegacion(request)) {
    event.respondWith(networkFirst(request));
    return;
  }
  if (esAssetConHash(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (esImagen(request, url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  // El resto (JS/CSS sin hash, JSON, etc.) sigue el camino normal del navegador.
});
