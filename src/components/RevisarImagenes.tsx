"use client";

/**
 * Herramienta de revisión visual de imágenes (cliente).
 *
 * Muestra cada obra con su imagen actual y su ficha; el revisor TOCA las que no
 * corresponden y exporta un obras-imagenes-override.json con esas marcas (más
 * las que ya existían). No modifica nada del sitio: solo produce el JSON que
 * luego se guarda en src/data/. Pensada para usarse una vez y retirarse.
 */

import { useMemo, useState } from "react";
import type { ImagenMostrada } from "@/lib/obras";

type Override = Record<string, { none?: boolean; thumb?: string }>;

export default function RevisarImagenes({
  items,
  overridesActuales,
}: {
  items: ImagenMostrada[];
  overridesActuales: Override;
}) {
  const [malas, setMalas] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [fuente, setFuente] = useState("");
  const [soloMarcadas, setSoloMarcadas] = useState(false);
  const [salida, setSalida] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const visibles = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return items.filter((o) => {
      if (fuente && o.fuente !== fuente) return false;
      if (soloMarcadas && !malas.has(o.q)) return false;
      if (t && !`${o.titulo} ${o.autor}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [items, busca, fuente, soloMarcadas, malas]);

  function alternar(q: string) {
    setMalas((prev) => {
      const s = new Set(prev);
      if (s.has(q)) s.delete(q);
      else s.add(q);
      return s;
    });
  }

  function construirJson(): string {
    const obj: Override = { ...overridesActuales };
    for (const q of malas) obj[q] = { none: true };
    return JSON.stringify(obj, null, 2);
  }

  function exportar() {
    setSalida(construirJson());
    setCopiado(false);
  }

  function descargar() {
    const blob = new Blob([construirJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "obras-imagenes-override.json";
    a.click();
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(construirJson());
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-5 mb-4 border-b border-line bg-bg/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar título o autor…"
            className="min-w-[140px] flex-1 rounded-md border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          />
          <select
            value={fuente}
            onChange={(e) => setFuente(e.target.value)}
            className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-fg"
          >
            <option value="">Todas</option>
            <option value="commons">Commons</option>
            <option value="wikidata">Wikidata</option>
          </select>
          <label className="flex items-center gap-1.5 text-sm text-muted">
            <input
              type="checkbox"
              checked={soloMarcadas}
              onChange={(e) => setSoloMarcadas(e.target.checked)}
            />
            solo marcadas
          </label>
          <span className="text-sm text-muted">
            <span className="font-semibold text-warn">{malas.size}</span> / {items.length}
          </span>
          <button
            onClick={exportar}
            className="rounded-md border border-accent bg-accent/10 px-4 py-2 text-sm text-accent transition hover:bg-accent/20"
          >
            Exportar ⤓
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visibles.map((o) => {
          const mala = malas.has(o.q);
          const ficha = [o.fecha, o.tecnica, o.ubicacion].filter(Boolean).join(" · ");
          return (
            <div
              key={o.q}
              className={`overflow-hidden rounded-lg border bg-panel ${
                mala ? "border-warn shadow-[inset_0_0_0_2px_rgba(240,176,160,.35)]" : "border-line"
              }`}
            >
              <button
                type="button"
                onClick={() => alternar(o.q)}
                className="relative block aspect-square w-full bg-black"
              >
                <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted">
                  {o.fuente}
                </span>
                <span
                  className={`absolute right-1.5 top-1.5 rounded px-2 py-1 text-xs ${
                    mala ? "bg-warn font-bold text-[#1a0f0c]" : "bg-black/55 text-white"
                  }`}
                >
                  {mala ? "✗ no es" : "tocar si no es"}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={o.thumb}
                  alt=""
                  loading="lazy"
                  className="h-full w-full bg-[#0e100e] object-contain"
                />
              </button>
              <div className="p-2 text-xs">
                <div className="font-semibold text-fg">{o.titulo}</div>
                <div className="text-muted">{o.autor}</div>
                {ficha && <div className="mt-0.5 text-[11px] text-muted opacity-85">{ficha}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {salida !== null && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-line bg-panel p-5">
            <h3 className="font-serif text-lg text-fg">obras-imagenes-override.json</h3>
            <p className="mt-1 text-sm text-muted">
              {malas.size} marcadas. Guárdalo como{" "}
              <code className="text-fg">src/data/obras-imagenes-override.json</code> o pégaselo al
              asistente.
            </p>
            <textarea
              readOnly
              value={salida}
              className="mt-3 h-[45vh] w-full rounded-md border border-line bg-bg p-3 font-mono text-xs text-fg"
            />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                onClick={copiar}
                className="rounded-md border border-line px-4 py-2 text-sm text-muted hover:border-accent hover:text-fg"
              >
                {copiado ? "¡Copiado!" : "Copiar"}
              </button>
              <button
                onClick={descargar}
                className="rounded-md border border-accent bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
              >
                Descargar .json
              </button>
              <button
                onClick={() => setSalida(null)}
                className="rounded-md border border-line px-4 py-2 text-sm text-muted hover:border-accent hover:text-fg"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
