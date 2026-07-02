"use client";

import { useEffect, useRef, useState } from "react";

type Modo = "chat" | "socratico" | "quiz";

interface Mensaje {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  titulo: string;
  modulo: string;
  contexto: string;
}

const TUTOR_URL = process.env.NEXT_PUBLIC_TUTOR_URL;

const MODOS: { id: Modo; etiqueta: string; pista: string; arranque: string }[] = [
  {
    id: "chat",
    etiqueta: "Dudas",
    pista: "Pregunta lo que quieras sobre esta lección.",
    arranque: "Explícame la idea más importante de esta lección con un ejemplo.",
  },
  {
    id: "socratico",
    etiqueta: "Mirar una obra",
    pista: "El tutor te guía paso a paso para analizar una obra (sin darte la respuesta hecha).",
    arranque: "Quiero analizar una obra de esta lección. Guíame paso a paso con preguntas.",
  },
  {
    id: "quiz",
    etiqueta: "Ponme a prueba",
    pista: "El tutor te hace preguntas y evalúa tus respuestas.",
    arranque: "Ponme a prueba con 3 preguntas sobre esta lección, de una en una.",
  },
];

export default function TutorPanel({ titulo, modulo, contexto }: Props) {
  const [modo, setModo] = useState<Modo>("chat");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  const modoActual = MODOS.find((m) => m.id === modo)!;

  function scrollAbajo() {
    requestAnimationFrame(() => finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  }

  // Ref siempre apuntando a la última `enviar` (evita closure obsoleta en el listener).
  const enviarRef = useRef(enviar);
  enviarRef.current = enviar;

  // "Analizar esta obra": el visor (Lightbox) dispara este evento con la obra;
  // el tutor pasa a modo socrático y arranca guiando la mirada de ESA obra.
  useEffect(() => {
    const alAnalizar = (e: Event) => {
      const { titulo: t, autor } = (e as CustomEvent).detail ?? {};
      if (!t) return;
      const obra = autor ? `«${t}» (${autor})` : `«${t}»`;
      setModo("socratico");
      asideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      enviarRef.current(
        `Quiero analizar ${obra} de esta lección. Guíame paso a paso, con preguntas, para aprender a mirarla por mí mismo.`,
        "socratico",
      );
    };
    window.addEventListener("tutor:analizar", alAnalizar);
    return () => window.removeEventListener("tutor:analizar", alAnalizar);
  }, []);

  async function enviar(texto: string, modoForzado?: Modo) {
    const limpio = texto.trim();
    if (!limpio || cargando || !TUTOR_URL) return;
    const modoActivo = modoForzado ?? modo;
    setError(null);
    setInput("");

    const historial = [...mensajes, { role: "user", content: limpio } as Mensaje];
    setMensajes([...historial, { role: "assistant", content: "" }]);
    setCargando(true);
    scrollAbajo();

    try {
      const res = await fetch(`${TUTOR_URL.replace(/\/$/, "")}/api/tutor`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          modo: modoActivo,
          leccion: { titulo, modulo, contexto },
          messages: historial,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error((await res.text().catch(() => "")) || `Error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acumulado = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acumulado += decoder.decode(value, { stream: true });
        setMensajes((prev) => {
          const copia = prev.slice();
          copia[copia.length - 1] = { role: "assistant", content: acumulado };
          return copia;
        });
        scrollAbajo();
      }
      if (!acumulado.trim()) {
        setMensajes((prev) => prev.slice(0, -1));
        setError("El tutor no devolvió respuesta. Intenta de nuevo.");
      }
    } catch (e) {
      setMensajes((prev) => (prev[prev.length - 1]?.content ? prev : prev.slice(0, -1)));
      setError(`No se pudo contactar al tutor: ${(e as Error).message}`);
    } finally {
      setCargando(false);
      scrollAbajo();
    }
  }

  if (!TUTOR_URL) {
    return (
      <aside className="rounded-lg border border-line bg-panel p-4">
        <h2 className="font-serif text-lg text-fg">Tutor de IA</h2>
        <p className="mt-2 text-sm text-muted">
          El tutor interactivo no está configurado todavía. Define{" "}
          <code className="text-accent">NEXT_PUBLIC_TUTOR_URL</code> con la URL del Worker{" "}
          <code className="text-accent">curso-arte-tutor</code> y vuelve a compilar para activar el
          chat, el modo socrático y los cuestionarios.
        </p>
      </aside>
    );
  }

  return (
    <aside ref={asideRef} className="flex max-h-[80vh] flex-col rounded-lg border border-line bg-panel">
      <div className="border-b border-line p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-serif text-lg text-fg">Tutor de IA</h2>
          {mensajes.length > 0 && (
            <button
              onClick={() => {
                setMensajes([]);
                setError(null);
              }}
              className="text-xs text-muted hover:text-fg"
            >
              limpiar
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {MODOS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModo(m.id)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                modo === m.id
                  ? "bg-accent text-bg"
                  : "border border-line text-muted hover:text-fg"
              }`}
            >
              {m.etiqueta}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{modoActual.pista}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {mensajes.length === 0 && (
          <button
            onClick={() => enviar(modoActual.arranque)}
            className="w-full rounded-md border border-dashed border-line p-3 text-left text-sm text-muted hover:border-accent hover:text-fg"
          >
            ✨ {modoActual.arranque}
          </button>
        )}
        {mensajes.map((m, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap rounded-md px-3 py-2 text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-6 bg-panel2 text-fg"
                : "mr-2 border border-line text-fg"
            }`}
          >
            {m.content || (cargando && i === mensajes.length - 1 ? "…" : "")}
          </div>
        ))}
        {error && <p className="text-sm text-warn">{error}</p>}
        <div ref={finRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(input);
        }}
        className="flex gap-2 border-t border-line p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu mensaje…"
          aria-label="Escribe tu pregunta al tutor de IA"
          disabled={cargando}
          className="min-w-0 flex-1 rounded-md border border-line bg-bg px-3 py-2 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          type="submit"
          disabled={cargando || !input.trim()}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-bg disabled:opacity-40"
        >
          {cargando ? "…" : "Enviar"}
        </button>
      </form>
    </aside>
  );
}
