"use client";

import { useEffect, useState } from "react";

/**
 * Comparador de obras: permite FIJAR hasta 2 obras y verlas lado a lado.
 *
 * Se monta UNA vez por página (como <Lightbox/>). No renderiza ningún disparador
 * propio: recibe las obras por un CustomEvent "comparar:fijar" (lo dispara el
 * orquestador desde el botón "📌 Comparar" del visor) y expone:
 *   - una BARRA FLOTANTE inferior con las obras fijadas (quitar/limpiar/comparar),
 *   - un OVERLAY a pantalla completa con las 2 obras enfrentadas,
 *   - "Analizar esta comparación", que reutiliza el evento "tutor:analizar" en
 *     modo solo-texto (imagen: null) para que el tutor pase a socrático.
 *
 * Estado persistido en localStorage bajo "curso-arte:comparar"; reacciona entre
 * pestañas con el evento "storage". Patrón SSR (guarda con estado "listo").
 */

interface ObraFijada {
  titulo: string;
  autor: string;
  thumb: string;
  full: string;
  fecha: string;
  ubicacion: string;
  wiki: string;
}

const CLAVE = "curso-arte:comparar";
const MAX = 2;

/** Normaliza un detalle arbitrario a una ObraFijada válida (o null si no sirve). */
function normalizar(detalle: unknown): ObraFijada | null {
  if (!detalle || typeof detalle !== "object") return null;
  const d = detalle as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const thumb = s(d.thumb) || s(d.full);
  if (!thumb) return null; // sin imagen no hay nada que comparar
  return {
    titulo: s(d.titulo) || "Sin título",
    autor: s(d.autor),
    thumb,
    full: s(d.full) || thumb,
    fecha: s(d.fecha),
    ubicacion: s(d.ubicacion),
    wiki: s(d.wiki),
  };
}

/** Lee la lista fijada desde localStorage (autoritativa), saneada y limitada a MAX. */
function leer(): ObraFijada[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLAVE);
    if (!raw) return [];
    const dato = JSON.parse(raw);
    if (!Array.isArray(dato)) return [];
    const lista: ObraFijada[] = [];
    for (const item of dato) {
      const o = normalizar(item);
      if (o && !lista.some((x) => x.thumb === o.thumb)) lista.push(o);
      if (lista.length >= MAX) break;
    }
    return lista;
  } catch {
    return [];
  }
}

function guardar(lista: ObraFijada[]) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    /* almacenamiento no disponible */
  }
}

export default function Comparador() {
  const [fijadas, setFijadas] = useState<ObraFijada[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [listo, setListo] = useState(false);

  // Carga inicial + sincronización entre pestañas (patrón SSR de Progreso).
  useEffect(() => {
    const sincronizar = () => {
      setFijadas(leer());
      setListo(true);
    };
    sincronizar();
    const alStorage = (e: StorageEvent) => {
      if (e.key === CLAVE || e.key === null) sincronizar();
    };
    window.addEventListener("storage", alStorage);
    return () => window.removeEventListener("storage", alStorage);
  }, []);

  // Recibe obras a fijar. localStorage es la fuente de la verdad: leemos de ahí
  // para evitar closures obsoletas y mantener el estado en sync.
  useEffect(() => {
    const alFijar = (e: Event) => {
      const obra = normalizar((e as CustomEvent).detail);
      if (!obra) return;
      const prev = leer();
      if (prev.some((o) => o.thumb === obra.thumb)) return; // duplicado: se ignora
      // Si ya hay 2, se reemplaza la más antigua (la primera).
      const siguiente = prev.length >= MAX ? [...prev.slice(prev.length - MAX + 1), obra] : [...prev, obra];
      guardar(siguiente);
      setFijadas(siguiente);
    };
    window.addEventListener("comparar:fijar", alFijar);
    return () => window.removeEventListener("comparar:fijar", alFijar);
  }, []);

  const mostrarOverlay = listo && abierto && fijadas.length === MAX;

  // Teclado (Escape) + bloqueo del scroll del fondo mientras el overlay está abierto.
  useEffect(() => {
    if (!mostrarOverlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mostrarOverlay]);

  function quitar(thumb: string) {
    const siguiente = leer().filter((o) => o.thumb !== thumb);
    guardar(siguiente);
    setFijadas(siguiente);
    if (siguiente.length < MAX) setAbierto(false);
  }

  function limpiar() {
    guardar([]);
    setFijadas([]);
    setAbierto(false);
  }

  function analizar() {
    if (fijadas.length < MAX) return;
    const [a, b] = fijadas;
    window.dispatchEvent(
      new CustomEvent("tutor:analizar", {
        // Solo texto (imagen: null): el tutor pasa a socrático y compara sin visión.
        detail: { titulo: `«${a.titulo}» frente a «${b.titulo}»`, autor: "", imagen: null },
      }),
    );
    setAbierto(false);
  }

  if (!listo || fijadas.length === 0) return null;

  return (
    <>
      {/* Barra flotante inferior */}
      <div
        role="region"
        aria-label="Obras para comparar"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
          <span className="text-xs font-medium text-muted">Comparar</span>
          <ul className="flex flex-1 flex-wrap items-center gap-2">
            {fijadas.map((o) => (
              <li key={o.thumb} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={o.thumb}
                  alt={o.titulo}
                  loading="lazy"
                  className="h-12 w-12 rounded-md border border-line object-cover"
                />
                <button
                  onClick={() => quitar(o.thumb)}
                  aria-label={`Quitar «${o.titulo}»`}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-panel2 text-xs leading-none text-muted transition hover:text-fg"
                >
                  ✕
                </button>
              </li>
            ))}
            {fijadas.length < MAX && (
              <li className="text-xs text-muted">Fija otra obra para compararlas.</li>
            )}
          </ul>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAbierto(true)}
              disabled={fijadas.length < MAX}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Comparar
            </button>
            <button
              onClick={limpiar}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-muted transition hover:text-fg"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Overlay a pantalla completa: las 2 obras enfrentadas */}
      {mostrarOverlay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Comparación de obras"
          className="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur-sm"
          onClick={() => setAbierto(false)}
        >
          {/* Barra superior */}
          <div
            className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="truncate font-serif text-sm text-fg">Comparación de obras</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={analizar}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-bg transition hover:opacity-90"
              >
                ✨ Analizar esta comparación
              </button>
              <button
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
                className="rounded-md border border-line px-3 py-1.5 text-sm text-muted transition hover:text-fg"
              >
                Cerrar ✕
              </button>
            </div>
          </div>

          {/* Cuerpo: 2 columnas en escritorio, apiladas en móvil */}
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
              {fijadas.map((o) => (
                <figure
                  key={o.thumb}
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-col rounded-lg border border-line bg-panel p-3"
                >
                  <div className="flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={o.full}
                      alt={o.titulo}
                      onError={(e) => {
                        if (e.currentTarget.src !== o.thumb) e.currentTarget.src = o.thumb;
                      }}
                      className="max-h-[45vh] max-w-full rounded-md object-contain md:max-h-[70vh]"
                    />
                  </div>
                  <figcaption className="mt-3">
                    <p className="font-serif text-lg leading-snug text-fg">{o.titulo}</p>
                    {o.autor && <p className="text-sm text-muted">{o.autor}</p>}
                    {(o.fecha || o.ubicacion) && (
                      <p className="mt-1 text-xs text-muted">
                        {[o.fecha, o.ubicacion].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {o.wiki && (
                      <a
                        href={o.wiki}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-accent hover:underline"
                      >
                        Wikipedia ↗
                      </a>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
