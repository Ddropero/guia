"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Escuchar la lección": lectura por voz con la síntesis de voz del navegador
 * (window.speechSynthesis). Coste cero, sin servidor ni dependencias.
 *
 * Recibe el texto YA en plano (sin marcas Markdown) por props; el troceo por
 * oraciones evita el corte de enunciados largos que sufre speechSynthesis.
 */

type Estado = "parado" | "hablando" | "pausado";

const MAX_TROZO = 200; // caracteres por fragmento (los muy largos se cortan)

/** Divide el texto en fragmentos cortos por oración (y por comas si hace falta). */
function trocear(texto: string): string[] {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (!limpio) return [];
  const oraciones = limpio.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) ?? [limpio];
  const trozos: string[] = [];
  for (const bruto of oraciones) {
    const frase = bruto.trim();
    if (!frase) continue;
    if (frase.length <= MAX_TROZO) {
      trozos.push(frase);
      continue;
    }
    // Oración larga: cortar por coma cercana o, en su defecto, por espacio.
    let resto = frase;
    while (resto.length > MAX_TROZO) {
      let corte = resto.lastIndexOf(",", MAX_TROZO);
      if (corte < MAX_TROZO * 0.5) corte = resto.lastIndexOf(" ", MAX_TROZO);
      if (corte <= 0) corte = MAX_TROZO;
      trozos.push(resto.slice(0, corte + 1).trim());
      resto = resto.slice(corte + 1).trim();
    }
    if (resto) trozos.push(resto);
  }
  return trozos;
}

export default function EscucharLeccion({ texto }: { texto: string }) {
  const [soportado, setSoportado] = useState(false);
  const [estado, setEstado] = useState<Estado>("parado");

  const vozRef = useRef<SpeechSynthesisVoice | null>(null);
  const trozosRef = useRef<string[]>([]);
  const activoRef = useRef(false); // ¿queremos seguir leyendo? (guarda onend tras cancel)

  const hayTexto = texto.trim().length > 0;

  // Detectar soporte y elegir una voz en español (getVoices() puede llegar vacío).
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // Detección de una API del navegador al montar (sistema externo).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoportado(true);
    const sintesis = window.speechSynthesis;

    const elegirVoz = () => {
      const voces = sintesis.getVoices();
      const es = voces.find((v) => v.lang?.toLowerCase().startsWith("es"));
      if (es) vozRef.current = es;
    };
    elegirVoz();
    sintesis.addEventListener("voiceschanged", elegirVoz);

    return () => {
      sintesis.removeEventListener("voiceschanged", elegirVoz);
      activoRef.current = false;
      sintesis.cancel(); // cancelar la locución al desmontar
    };
  }, []);

  // Lee el fragmento i y encadena el siguiente en onend (declaración hoisted → recursión estable).
  function hablarDesde(i: number) {
    const sintesis = window.speechSynthesis;
    const trozos = trozosRef.current;
    if (i >= trozos.length) {
      activoRef.current = false;
      setEstado("parado");
      return;
    }
    const u = new SpeechSynthesisUtterance(trozos[i]);
    if (vozRef.current) u.voice = vozRef.current;
    u.lang = vozRef.current?.lang ?? "es-ES";
    u.rate = 1;
    u.pitch = 1;
    u.onend = () => {
      if (!activoRef.current) return; // detenido / cancelado
      hablarDesde(i + 1);
    };
    u.onerror = () => {
      if (!activoRef.current) return;
      hablarDesde(i + 1); // seguir pese a un fallo puntual
    };
    sintesis.speak(u);
  }

  function reproducir() {
    const sintesis = window.speechSynthesis;
    if (estado === "pausado") {
      sintesis.resume();
      setEstado("hablando");
      return;
    }
    sintesis.cancel();
    trozosRef.current = trocear(texto);
    if (trozosRef.current.length === 0) return;
    activoRef.current = true;
    setEstado("hablando");
    hablarDesde(0);
  }

  function pausar() {
    window.speechSynthesis.pause();
    setEstado("pausado");
  }

  function detener() {
    activoRef.current = false;
    window.speechSynthesis.cancel();
    setEstado("parado");
  }

  // Guarda contra SSR / navegadores sin la API, y contra texto vacío.
  if (!soportado || !hayTexto) return null;

  const leyendo = estado === "hablando";
  const pausado = estado === "pausado";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-panel px-3 py-2">
      <span className="mr-1 font-mono text-xs text-muted" aria-hidden>
        🔊 Escuchar
      </span>

      {leyendo ? (
        <button
          onClick={pausar}
          className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm text-fg transition hover:border-accent hover:text-accent"
        >
          <span aria-hidden>⏸</span> Pausar
        </button>
      ) : (
        <button
          onClick={reproducir}
          className="inline-flex items-center gap-2 rounded-md border border-accent bg-accent/10 px-3 py-1.5 text-sm text-accent transition hover:bg-accent/20"
        >
          <span aria-hidden>▶</span> {pausado ? "Reanudar" : "Reproducir"}
        </button>
      )}

      <button
        onClick={detener}
        disabled={estado === "parado"}
        className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm text-muted transition enabled:hover:border-warn enabled:hover:text-warn disabled:opacity-40"
      >
        <span aria-hidden>⏹</span> Detener
      </button>

      <span className="font-mono text-xs text-muted" role="status" aria-live="polite">
        {leyendo ? "Leyendo…" : pausado ? "En pausa" : ""}
      </span>
    </div>
  );
}
