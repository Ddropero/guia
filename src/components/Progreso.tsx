"use client";

import { useEffect, useState } from "react";

const CLAVE = "curso-arte:progreso";

function leerSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(CLAVE);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function guardarSet(s: Set<string>) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify([...s]));
  } catch {
    /* almacenamiento no disponible */
  }
}

function emitirCambio() {
  window.dispatchEvent(new Event("curso-arte:progreso"));
}

/** Botón para marcar/desmarcar una lección como completada. */
export function LeccionCompletaToggle({ moduloId, slug }: { moduloId: string; slug: string }) {
  const id = `${moduloId}/${slug}`;
  const [hecha, setHecha] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    setHecha(leerSet().has(id));
    setListo(true);
  }, [id]);

  function alternar() {
    const s = leerSet();
    if (s.has(id)) s.delete(id);
    else s.add(id);
    guardarSet(s);
    setHecha(s.has(id));
    emitirCambio();
  }

  if (!listo) return null;

  return (
    <button
      onClick={alternar}
      className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition ${
        hecha
          ? "border-accent bg-accent/10 text-accent"
          : "border-line text-muted hover:text-fg"
      }`}
    >
      <span aria-hidden>{hecha ? "✓" : "○"}</span>
      {hecha ? "Lección completada" : "Marcar como completada"}
    </button>
  );
}

/** Insignia X/N de lecciones completadas en un módulo (para el índice). */
export function ProgresoModulo({ moduloId, slugs }: { moduloId: string; slugs: string[] }) {
  const [hechas, setHechas] = useState(0);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const recalcular = () => {
      const s = leerSet();
      setHechas(slugs.filter((sl) => s.has(`${moduloId}/${sl}`)).length);
      setListo(true);
    };
    recalcular();
    window.addEventListener("curso-arte:progreso", recalcular);
    window.addEventListener("storage", recalcular);
    return () => {
      window.removeEventListener("curso-arte:progreso", recalcular);
      window.removeEventListener("storage", recalcular);
    };
  }, [moduloId, slugs]);

  if (!listo) return null;
  const total = slugs.length;
  const completo = hechas === total && total > 0;

  return (
    <span className={`text-xs ${completo ? "text-accent" : "text-muted"}`}>
      {hechas}/{total} {completo ? "✓" : ""}
    </span>
  );
}

/** Barra de progreso global del curso (para la portada). */
export function ProgresoGlobal({ total }: { total: number }) {
  const [hechas, setHechas] = useState(0);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const recalcular = () => {
      setHechas(leerSet().size);
      setListo(true);
    };
    recalcular();
    window.addEventListener("curso-arte:progreso", recalcular);
    window.addEventListener("storage", recalcular);
    return () => {
      window.removeEventListener("curso-arte:progreso", recalcular);
      window.removeEventListener("storage", recalcular);
    };
  }, []);

  if (!listo || total === 0) return null;
  const pct = Math.min(100, Math.round((hechas / total) * 100));

  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-fg">Tu progreso</span>
        <span className="text-muted">
          {hechas}/{total} lecciones · {pct}%
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
