"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Pregunta } from "@/lib/quiz";
import { guardarQuiz } from "@/lib/progreso";

interface Props {
  moduloId: string;
  preguntas: Pregunta[];
}

// Baraja una copia (Fisher–Yates). Solo en cliente, tras el montaje.
function barajar<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Cuestionario({ moduloId, preguntas }: Props) {
  // Orden de opciones barajado una vez por intento (clave para forzar re-barajado al reintentar).
  const [intento, setIntento] = useState(0);
  const barajadas = useMemo(
    () => preguntas.map((p) => ({ ...p, opciones: barajar(p.opciones) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preguntas, intento],
  );

  const [respuestas, setRespuestas] = useState<Record<number, string>>({});
  const [corregido, setCorregido] = useState(false);

  const total = preguntas.length;
  const respondidas = Object.keys(respuestas).length;
  const aciertos = preguntas.filter((p) => respuestas[p.n] === p.correcta).length;

  function elegir(n: number, letra: string) {
    if (corregido) return;
    setRespuestas((r) => ({ ...r, [n]: letra }));
  }

  function corregir() {
    if (respondidas < total) return;
    setCorregido(true);
    guardarQuiz(moduloId, aciertos, total);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function reintentar() {
    setRespuestas({});
    setCorregido(false);
    setIntento((i) => i + 1);
  }

  const pct = Math.round((aciertos / total) * 100);

  return (
    <div className="space-y-6">
      {corregido && (
        <div
          className={`rounded-lg border p-4 ${
            pct >= 80 ? "border-accent bg-accent/10" : "border-line bg-panel"
          }`}
          role="status"
        >
          <p className="font-serif text-xl text-fg">
            {aciertos}/{total} correctas · {pct}%
          </p>
          <p className="mt-1 text-sm text-muted">
            {pct >= 80
              ? "¡Muy bien! Dominas este módulo."
              : pct >= 50
                ? "Vas bien. Repasa las que fallaste y reintenta."
                : "Conviene releer el módulo antes de reintentar."}
          </p>
        </div>
      )}

      <ol className="space-y-6">
        {barajadas.map((p, idx) => {
          const elegida = respuestas[p.n];
          return (
            <li key={p.n} className="rounded-lg border border-line bg-panel p-4">
              <p className="font-serif text-fg">
                <span className="mr-2 font-mono text-xs text-muted">{idx + 1}.</span>
                {p.enunciado}
              </p>
              <ul className="mt-3 space-y-2">
                {p.opciones.map((o) => {
                  const seleccionada = elegida === o.letra;
                  const esCorrecta = o.letra === p.correcta;
                  let estilo = "border-line text-muted hover:border-accent hover:text-fg";
                  if (corregido) {
                    if (esCorrecta) estilo = "border-accent bg-accent/10 text-accent";
                    else if (seleccionada) estilo = "border-warn bg-warn/10 text-warn";
                    else estilo = "border-line text-muted";
                  } else if (seleccionada) {
                    estilo = "border-accent bg-accent/10 text-fg";
                  }
                  return (
                    <li key={o.letra}>
                      <button
                        onClick={() => elegir(p.n, o.letra)}
                        disabled={corregido}
                        className={`flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition ${estilo}`}
                      >
                        <span aria-hidden className="mt-0.5">
                          {corregido && esCorrecta ? "✓" : corregido && seleccionada ? "✗" : "○"}
                        </span>
                        <span>{o.texto}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        {!corregido ? (
          <>
            <button
              onClick={corregir}
              disabled={respondidas < total}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg disabled:opacity-40"
            >
              Corregir
            </button>
            <span className="text-xs text-muted">
              {respondidas}/{total} respondidas
            </span>
          </>
        ) : (
          <>
            <button
              onClick={reintentar}
              className="rounded-md border border-line px-4 py-2 text-sm text-fg transition hover:border-accent"
            >
              Reintentar
            </button>
            <Link
              href={`/curso/${moduloId}`}
              className="rounded-md border border-line px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-fg"
            >
              Repasar el módulo
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
