"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  alternarLeccion,
  borrar,
  contarCompletadas,
  estaCompletada,
  exportar,
  getQuiz,
  getUltima,
  importar,
  registrarVisita,
  suscribir,
} from "@/lib/progreso";

/** Botón para marcar/desmarcar una lección como completada. Registra la visita. */
export function LeccionCompletaToggle({ moduloId, slug }: { moduloId: string; slug: string }) {
  const id = `${moduloId}/${slug}`;
  const [hecha, setHecha] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const sincronizar = () => {
      setHecha(estaCompletada(id));
      setListo(true);
    };
    sincronizar();
    registrarVisita(moduloId, slug);
    return suscribir(sincronizar);
  }, [id, moduloId, slug]);

  function alternar() {
    setHecha(alternarLeccion(id));
  }

  if (!listo) return null;

  return (
    <button
      onClick={alternar}
      className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition ${
        hecha ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:text-fg"
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
    const ids = slugs.map((sl) => `${moduloId}/${sl}`);
    const recalcular = () => {
      setHechas(contarCompletadas(ids));
      setListo(true);
    };
    recalcular();
    return suscribir(recalcular);
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
      setHechas(contarCompletadas());
      setListo(true);
    };
    recalcular();
    return suscribir(recalcular);
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

/** Enlace "Continuar donde lo dejaste" (para la portada). Solo si hay historial. */
export function ContinuarDondeLoDejaste() {
  const [ultima, setUltima] = useState<{ moduloId: string; slug: string } | null>(null);

  useEffect(() => {
    const recalcular = () => {
      const u = getUltima();
      setUltima(u ? { moduloId: u.moduloId, slug: u.slug } : null);
    };
    recalcular();
    return suscribir(recalcular);
  }, []);

  if (!ultima) return null;

  return (
    <Link
      href={`/curso/${ultima.moduloId}/${ultima.slug}`}
      className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent/10 px-4 py-2 text-sm text-accent transition hover:bg-accent/20"
    >
      ↩ Continuar donde lo dejaste
    </Link>
  );
}

/** Mejor puntuación del cuestionario de un módulo (badge). */
export function QuizBadge({ moduloId }: { moduloId: string }) {
  const [res, setRes] = useState<{ mejor: number; total: number } | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const recalcular = () => {
      const q = getQuiz(moduloId);
      setRes(q ? { mejor: q.mejor, total: q.total } : null);
      setListo(true);
    };
    recalcular();
    return suscribir(recalcular);
  }, [moduloId]);

  if (!listo || !res) return null;
  const pct = Math.round((res.mejor / res.total) * 100);
  const bien = pct >= 80;
  return (
    <span className={`text-xs ${bien ? "text-accent" : "text-muted"}`}>
      Cuestionario: {res.mejor}/{res.total} {bien ? "✓" : ""}
    </span>
  );
}

/** Exportar/importar el progreso como archivo JSON (respaldo). */
export function GestionProgreso() {
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function descargar() {
    const blob = new Blob([exportar()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "progreso-historia-del-arte.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const lector = new FileReader();
    lector.onload = () => {
      const ok = importar(String(lector.result));
      setMsg(ok ? "Progreso restaurado ✓" : "Archivo no válido");
      setTimeout(() => setMsg(null), 4000);
    };
    lector.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <button onClick={descargar} className="text-muted underline-offset-2 hover:text-fg hover:underline">
        Exportar progreso
      </button>
      <span className="text-line" aria-hidden>
        ·
      </span>
      <button
        onClick={() => fileRef.current?.click()}
        className="text-muted underline-offset-2 hover:text-fg hover:underline"
      >
        Importar
      </button>
      <input ref={fileRef} type="file" accept="application/json" onChange={alElegir} className="hidden" />
      <span className="text-line" aria-hidden>
        ·
      </span>
      <button
        onClick={() => {
          if (window.confirm("¿Borrar todo tu progreso? Esta acción no se puede deshacer.")) {
            borrar();
            setMsg("Progreso borrado ✓");
            setTimeout(() => setMsg(null), 4000);
          }
        }}
        className="text-muted underline-offset-2 hover:text-warn hover:underline"
      >
        Borrar progreso
      </button>
      {msg && <span className="text-accent">{msg}</span>}
    </div>
  );
}
