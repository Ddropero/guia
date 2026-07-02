"use client";

import { useCallback, useEffect, useState } from "react";

interface ObraVisor {
  titulo: string;
  autor: string;
  thumb: string;
  full: string;
  wiki: string;
  credito: string;
  licencia: string;
  fecha: string;
  ubicacion: string;
}

function leerObra(el: HTMLElement): ObraVisor {
  const d = el.dataset;
  return {
    titulo: d.titulo ?? "",
    autor: d.autor ?? "",
    thumb: d.thumb ?? "",
    full: d.full || d.thumb || "",
    wiki: d.wiki ?? "",
    credito: d.credito ?? "",
    licencia: d.licencia ?? "",
    fecha: d.fecha ?? "",
    ubicacion: d.ubicacion ?? "",
  };
}

/**
 * Visor de obras: intercepta el clic en cualquier miniatura marcada con
 * [data-obra] (galería o figura inline) y muestra la obra COMPLETA dentro del
 * sitio, con ficha, navegación entre las obras de la lección, enlace a
 * Wikipedia (secundario) y "Analizar con el tutor". Sin JS, los enlaces
 * siguen llevando a Wikipedia (mejora progresiva).
 */
export default function Lightbox() {
  const [obras, setObras] = useState<ObraVisor[]>([]);
  const [idx, setIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(false);

  // Recolecta las obras (deduplicadas) y delega el clic. El índice se resuelve
  // por la URL "full" para casar galería e inline (que apuntan a la misma obra).
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-obra]"));
    const orden = new Map<string, number>();
    const lista: ObraVisor[] = [];
    for (const el of els) {
      const o = leerObra(el);
      const clave = o.full || o.thumb;
      if (!orden.has(clave)) {
        orden.set(clave, lista.length);
        lista.push(o);
      }
    }
    // Lectura única del DOM al montar (patrón de sincronización con sistema externo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setObras(lista);

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-obra]");
      if (!el) return;
      const o = leerObra(el);
      const i = orden.get(o.full || o.thumb);
      if (i == null) return;
      e.preventDefault();
      setZoom(false);
      setIdx(i);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const cerrar = useCallback(() => setIdx(null), []);
  const mover = useCallback(
    (paso: number) => {
      setZoom(false);
      setIdx((i) => {
        if (i == null || obras.length === 0) return i;
        return (i + paso + obras.length) % obras.length;
      });
    },
    [obras.length],
  );

  // Teclado + bloqueo de scroll del fondo mientras el visor está abierto.
  useEffect(() => {
    if (idx == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
      else if (e.key === "ArrowRight") mover(1);
      else if (e.key === "ArrowLeft") mover(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [idx, cerrar, mover]);

  const obra = idx == null ? null : (obras[idx] ?? null);
  if (idx == null || !obra) return null;

  const analizar = () => {
    window.dispatchEvent(
      new CustomEvent("tutor:analizar", {
        // Se manda la miniatura (≈640px): suficiente para el análisis y barata en tokens.
        detail: { titulo: obra.titulo, autor: obra.autor, imagen: obra.thumb },
      }),
    );
    cerrar();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Obra: ${obra.titulo}`}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={cerrar}
    >
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-3 p-3 text-sm text-white/80">
        <span className="truncate">
          {idx + 1} / {obras.length}
        </span>
        <button
          onClick={cerrar}
          aria-label="Cerrar"
          className="rounded-md px-3 py-1 text-white/80 hover:bg-white/10 hover:text-white"
        >
          Cerrar ✕
        </button>
      </div>

      {/* Imagen + flechas */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        {obras.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              mover(-1);
            }}
            aria-label="Anterior"
            className="absolute left-2 z-10 rounded-full bg-white/10 p-3 text-xl text-white hover:bg-white/20"
          >
            ‹
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={obra.full}
          alt={obra.titulo}
          onClick={(e) => {
            e.stopPropagation();
            setZoom((z) => !z);
          }}
          onError={(e) => {
            if (e.currentTarget.src !== obra.thumb) e.currentTarget.src = obra.thumb;
          }}
          className={`max-h-full max-w-full rounded-md object-contain shadow-2xl transition ${
            zoom ? "max-h-none max-w-none cursor-zoom-out" : "cursor-zoom-in"
          }`}
        />
        {obras.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              mover(1);
            }}
            aria-label="Siguiente"
            className="absolute right-2 z-10 rounded-full bg-white/10 p-3 text-xl text-white hover:bg-white/20"
          >
            ›
          </button>
        )}
      </div>

      {/* Ficha inferior */}
      <div
        className="flex flex-wrap items-end justify-between gap-3 p-4 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="font-serif text-lg leading-snug">{obra.titulo}</p>
          {obra.autor && <p className="text-sm text-white/70">{obra.autor}</p>}
          {(obra.fecha || obra.ubicacion) && (
            <p className="mt-1 text-xs text-white/60">
              {[obra.fecha, obra.ubicacion].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="mt-1 text-xs text-white/50">
            {obra.credito ? `Imagen: ${obra.credito}` : "Imagen"}
            {obra.licencia ? ` · ${obra.licencia}` : ""} · Wikimedia
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={analizar}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-bg hover:opacity-90"
          >
            ✨ Analizar con el tutor
          </button>
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("comparar:fijar", {
                  detail: {
                    titulo: obra.titulo,
                    autor: obra.autor,
                    thumb: obra.thumb,
                    full: obra.full,
                    fecha: obra.fecha,
                    ubicacion: obra.ubicacion,
                    wiki: obra.wiki,
                  },
                }),
              )
            }
            className="rounded-md border border-white/30 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
          >
            📌 Comparar
          </button>
          {obra.wiki && (
            <a
              href={obra.wiki}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-white/30 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
            >
              Wikipedia ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
