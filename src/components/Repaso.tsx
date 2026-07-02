"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { leer } from "@/lib/progreso";
import {
  degradar,
  estaVencida,
  guardarRepaso,
  hoy,
  leerRepaso,
  promover,
  type EstadoRepaso,
} from "@/lib/repaso";

export interface Carta {
  id: string;
  tipo: "glosario" | "obra";
  frente: string;
  dorso: string;
  imagen?: string;
  modulo?: string;
}

const POR_SESION = 20;

function barajar<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Sesion {
  cola: Carta[];
  pendientes: number; // vencidas totales (para el "quedan")
}

export default function Repaso({ cartas }: { cartas: Carta[] }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [i, setI] = useState(0);
  const [revelada, setRevelada] = useState(false);
  const [aciertos, setAciertos] = useState(0);
  const estadoRef = useRef<EstadoRepaso>({}); // se lee/escribe en efecto y handlers, nunca en render

  useEffect(() => {
    const estado = leerRepaso();
    estadoRef.current = estado;
    const dia = hoy();

    // Módulos con al menos una lección completada → habilitan sus cartas de obra.
    const conProgreso = new Set<string>();
    for (const id of Object.keys(leer().lecciones)) conProgreso.add(id.split("/")[0]);

    const disponibles = cartas.filter((c) => c.tipo === "glosario" || (c.modulo && conProgreso.has(c.modulo)));
    const vencidas = disponibles.filter((c) => estaVencida(estado[c.id], dia));
    // Lectura única de localStorage + progreso al montar (sistema externo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSesion({ pendientes: vencidas.length, cola: barajar(vencidas).slice(0, POR_SESION) });
  }, [cartas]);

  if (!sesion) return null;
  const { cola, pendientes } = sesion;

  if (cola.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-panel p-6 text-center">
        <p className="font-serif text-lg text-fg">Nada que repasar por ahora ✓</p>
        <p className="mt-2 text-sm text-muted">
          Vuelve mañana, o completa lecciones para desbloquear las tarjetas de sus obras.
        </p>
        <Link
          href="/curso"
          className="mt-4 inline-block rounded-md border border-line px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-fg"
        >
          Volver al curso
        </Link>
      </div>
    );
  }

  if (i >= cola.length) {
    const restan = Math.max(0, pendientes - cola.length);
    return (
      <div className="rounded-lg border border-accent bg-accent/10 p-6 text-center">
        <p className="font-serif text-xl text-fg">¡Sesión completa!</p>
        <p className="mt-2 text-sm text-muted">
          Acertaste {aciertos} de {cola.length}.
          {restan > 0 ? ` Quedan ${restan} tarjetas vencidas para otra sesión.` : " Todo al día por hoy."}
        </p>
        <Link
          href="/curso"
          className="mt-4 inline-block rounded-md border border-line px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-fg"
        >
          Volver al curso
        </Link>
      </div>
    );
  }

  const carta = cola[i];

  function calificar(acierto: boolean) {
    const dia = hoy();
    const st = estadoRef.current;
    st[carta.id] = acierto ? promover(st[carta.id], dia) : degradar(dia);
    guardarRepaso(st);
    if (acierto) setAciertos((n) => n + 1);
    setRevelada(false);
    setI((n) => n + 1);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs text-muted">
        <span>
          {i + 1} / {cola.length}
        </span>
        <span className="capitalize">{carta.tipo === "obra" ? "Obra" : "Vocabulario"}</span>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${(i / cola.length) * 100}%` }}
        />
      </div>

      <div className="rounded-lg border border-line bg-panel p-6">
        {carta.tipo === "obra" ? (
          <>
            <p className="mb-3 text-center text-sm text-muted">¿Qué obra es esta?</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={carta.imagen}
              alt=""
              className="mx-auto max-h-72 w-auto rounded-md object-contain"
            />
          </>
        ) : (
          <>
            <p className="mb-2 text-center text-sm text-muted">¿Qué significa?</p>
            <p className="text-center font-serif text-2xl text-fg">{carta.frente}</p>
          </>
        )}

        {revelada && (
          <div className="mt-5 border-t border-line pt-4 text-center">
            <p className="font-serif text-lg text-fg">{carta.dorso}</p>
          </div>
        )}
      </div>

      {!revelada ? (
        <button
          onClick={() => setRevelada(true)}
          className="mt-4 w-full rounded-md bg-accent px-4 py-3 text-sm font-medium text-bg"
        >
          Mostrar respuesta
        </button>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => calificar(false)}
            className="rounded-md border border-warn/60 px-4 py-3 text-sm text-warn transition hover:bg-warn/10"
          >
            No la sabía
          </button>
          <button
            onClick={() => calificar(true)}
            className="rounded-md border border-accent px-4 py-3 text-sm text-accent transition hover:bg-accent/10"
          >
            La sabía
          </button>
        </div>
      )}
    </div>
  );
}
