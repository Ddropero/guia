"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Línea de tiempo interactiva de la historia del arte.
 *
 * Recibe los hitos por props (ya generados en build por `getCronologia()`) y los
 * pinta como una línea vertical continua ordenada por año: la fecha a un lado de
 * la línea y el hito al otro. Se colorea el punto por REGIÓN (con los tokens del
 * tema; la etiqueta textual de región es la fuente autorizada, el color solo
 * aporta ritmo). Filtros por era (cronológico) y por región.
 *
 * `Hito` se define aquí de forma autónoma para no arrastrar `node:fs` (que usa
 * `@/lib/cronologia`) al bundle de cliente; su forma es idéntica a la de allí,
 * así que `getCronologia(): Hito[]` es asignable a estas props.
 */
export interface Hito {
  anio: number;
  etiqueta: string;
  texto: string;
  region?: string;
  era?: string;
  lugar?: string;
  porque?: string;
}

const RUTA_PROSA = "/curso/recursos/linea-de-tiempo";

// Paleta acotada a los tokens sancionados del tema (decorativa, se repite si hay
// más regiones que colores; la etiqueta textual de región desambigua siempre).
const PUNTOS = ["bg-accent", "bg-accent2", "bg-warn"] as const;
const TINTES = ["text-accent", "text-accent2", "text-warn"] as const;

export default function Cronologia({ hitos }: { hitos: Hito[] }) {
  const [montado, setMontado] = useState(false);
  const [era, setEra] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);

  // Guarda SSR: los controles solo aparecen tras montar; sin JS (o en el HTML
  // estático) se ve igualmente la línea completa, no un hueco.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMontado(true), []);

  const ordenados = useMemo(() => [...hitos].sort((a, b) => a.anio - b.anio), [hitos]);

  // Eras en su orden cronológico de aparición.
  const eras = useMemo(() => {
    const set = new Set<string>();
    for (const h of ordenados) if (h.era) set.add(h.era);
    return [...set];
  }, [ordenados]);

  // Regiones → índice de color estable.
  const colorRegion = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of ordenados) if (h.region && !m.has(h.region)) m.set(h.region, m.size);
    return m;
  }, [ordenados]);

  const regiones = useMemo(
    () => [...colorRegion.keys()].sort((a, b) => a.localeCompare(b, "es")),
    [colorRegion],
  );

  const visibles = useMemo(
    () => ordenados.filter((h) => (!era || h.era === era) && (!region || h.region === region)),
    [ordenados, era, region],
  );

  if (!ordenados.length) return null;

  return (
    <div>
      {montado && (
        <div className="mb-8 space-y-3 rounded-lg border border-line bg-panel p-4">
          {eras.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 font-mono text-xs uppercase tracking-widest text-muted">Era</span>
              <Chip activo={era === null} onClick={() => setEra(null)}>
                Todas
              </Chip>
              {eras.map((e) => (
                <Chip key={e} activo={era === e} onClick={() => setEra(era === e ? null : e)}>
                  {e}
                </Chip>
              ))}
            </div>
          )}

          {regiones.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="cron-region"
                className="mr-1 font-mono text-xs uppercase tracking-widest text-muted"
              >
                Región
              </label>
              <select
                id="cron-region"
                value={region ?? ""}
                onChange={(e) => setRegion(e.target.value || null)}
                className="rounded-md border border-line bg-bg px-3 py-1.5 text-sm text-fg outline-none focus:border-accent"
              >
                <option value="">Todas las regiones</option>
                {regiones.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          <p className="text-xs text-muted">
            Mostrando {visibles.length} de {ordenados.length} hitos · las fechas son orientativas.
          </p>
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="rounded-lg border border-line bg-panel p-6 text-center text-sm text-muted">
          No hay hitos para ese filtro.{" "}
          <button
            className="text-accent hover:underline"
            onClick={() => {
              setEra(null);
              setRegion(null);
            }}
          >
            Quitar filtros
          </button>
        </p>
      ) : (
        <ol className="relative">
          {/* Eje vertical alineado con el borde de la columna de fechas. */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-2 bottom-2 left-24 w-px bg-line sm:left-40"
          />
          {visibles.map((h, i) => {
            const idx = h.region ? colorRegion.get(h.region)! % PUNTOS.length : -1;
            const punto = idx >= 0 ? PUNTOS[idx] : "bg-muted";
            const tinte = idx >= 0 ? TINTES[idx] : "text-muted";
            return (
              <li
                key={i}
                className="relative grid grid-cols-[6rem_1fr] gap-x-4 py-3 sm:grid-cols-[10rem_1fr]"
              >
                <time className="pt-0.5 text-right font-mono text-[10px] leading-snug text-accent2 sm:text-xs">
                  {h.etiqueta}
                </time>
                {/* Punto sobre el eje. */}
                <span
                  aria-hidden
                  className={`absolute left-24 top-2 z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-2 ring-bg sm:left-40 ${punto}`}
                />
                <div className="pl-4 sm:pl-6">
                  <p className="font-serif text-[15px] leading-snug text-fg">{h.texto}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                    {h.region && <span className={tinte}>{h.region}</span>}
                    {h.lugar && <span className="text-muted">{h.lugar}</span>}
                    {h.era && <span className="text-muted/70">{h.era}</span>}
                  </p>
                  {h.porque && <p className="mt-1 text-[13px] leading-snug text-muted">{h.porque}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-10 border-t border-line pt-4 text-xs text-muted">
        Resumen interactivo de la{" "}
        <a href={RUTA_PROSA} className="text-accent hover:underline">
          versión en prosa
        </a>
        , que se conserva íntegra como referencia. Las etiquetas y fechas son orientativas.
      </p>
    </div>
  );
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={activo}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        activo ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}
