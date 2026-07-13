"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface ObraIndice {
  titulo: string;
  autor: string;
  fecha?: string;
  ubicacion?: string;
  thumb?: string;
  wiki: string;
  moduloId: string;
  leccionSlug: string;
}

interface Props {
  modulos: { id: string; titulo: string }[];
  obras: ObraIndice[];
}

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

// Día del año (1..366) para elegir la "obra del día" de forma determinista.
function diaDelAnio(d: Date): number {
  const inicio = Date.UTC(d.getUTCFullYear(), 0, 0);
  const hoy = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((hoy - inicio) / 86_400_000);
}

function Ficha({ o }: { o: ObraIndice }) {
  const meta = [o.autor, o.fecha].filter(Boolean).join(" · ");
  return (
    <>
      <p className="font-serif text-sm leading-snug text-fg">{o.titulo}</p>
      {meta && <p className="text-xs text-muted">{meta}</p>}
      {o.ubicacion && <p className="truncate text-[10px] text-muted/70">{o.ubicacion}</p>}
    </>
  );
}

const POR_TANDA = 60;

export default function IndiceObras({ modulos, obras }: Props) {
  const [q, setQ] = useState("");
  const [limite, setLimite] = useState(POR_TANDA);

  // Obra del día: determinista por fecha, entre las que tienen imagen.
  const delDia = useMemo(() => {
    const conImg = obras.filter((o) => o.thumb);
    if (!conImg.length) return null;
    return conImg[diaDelAnio(new Date()) % conImg.length];
  }, [obras]);

  const filtro = normalizar(q.trim());
  const porModulo = useMemo(() => {
    const map = new Map<string, ObraIndice[]>();
    for (const o of obras) {
      if (filtro) {
        const heno = normalizar(`${o.titulo} ${o.autor} ${o.ubicacion ?? ""}`);
        if (!heno.includes(filtro)) continue;
      }
      if (!map.has(o.moduloId)) map.set(o.moduloId, []);
      map.get(o.moduloId)!.push(o);
    }
    return map;
  }, [obras, filtro]);

  const totalFiltradas = [...porModulo.values()].reduce((n, a) => n + a.length, 0);

  // Renderiza por tandas: al buscar se muestran todas las coincidencias; sin
  // buscar, solo `limite` tarjetas (evita montar 508 nodos de golpe → mejor INP).
  const cap = filtro ? totalFiltradas : Math.min(limite, totalFiltradas);
  const plan: { m: { id: string; titulo: string }; lista: ObraIndice[] }[] = [];
  let acumulado = 0;
  for (const m of modulos) {
    if (acumulado >= cap) break;
    const lista = porModulo.get(m.id) ?? [];
    if (lista.length === 0) continue;
    const toma = lista.slice(0, cap - acumulado);
    acumulado += toma.length;
    plan.push({ m, lista: toma });
  }
  const hayMas = !filtro && cap < totalFiltradas;

  return (
    <div>
      {delDia && !filtro && (
        <Link
          href={`/curso/${delDia.moduloId}/${delDia.leccionSlug}`}
          className="mb-8 flex gap-4 rounded-lg border border-accent/40 bg-accent/5 p-4 transition hover:border-accent"
        >
          {delDia.thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={delDia.thumb}
              alt=""
              loading="lazy"
              className="h-24 w-24 shrink-0 rounded-md object-cover"
            />
          )}
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-widest text-accent">Obra del día</p>
            <p className="mt-1 font-serif text-lg leading-snug text-fg">{delDia.titulo}</p>
            {(delDia.autor || delDia.fecha) && (
              <p className="text-sm text-muted">
                {[delDia.autor, delDia.fecha].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </Link>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por obra, artista o museo…"
        aria-label="Buscar obras"
        className="mb-6 w-full rounded-md border border-line bg-bg px-4 py-2.5 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
      />

      {filtro && (
        <p className="mb-4 text-xs text-muted">
          {totalFiltradas} {totalFiltradas === 1 ? "obra" : "obras"} para «{q.trim()}»
        </p>
      )}

      <div className="space-y-8">
        {plan.map(({ m, lista }) => {
          return (
            <section key={m.id}>
              <h2 className="mb-3 border-b border-line pb-1 font-serif text-lg text-fg">
                {m.titulo}
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {lista.map((o, i) => (
                  <li
                    key={i}
                    className="flex flex-col overflow-hidden rounded-lg border border-line bg-panel"
                  >
                    <Link href={`/curso/${o.moduloId}/${o.leccionSlug}`} className="block">
                      {o.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={o.thumb}
                          alt={o.titulo}
                          loading="lazy"
                          className="aspect-[4/3] w-full bg-panel2 object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[4/3] w-full items-center justify-center bg-panel2 text-2xl text-muted">
                          ⬚
                        </div>
                      )}
                    </Link>
                    <div className="flex flex-1 flex-col gap-0.5 p-3">
                      <Ficha o={o} />
                      <a
                        href={o.wiki}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto pt-1 text-xs text-accent hover:underline"
                      >
                        Wikipedia ↗
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {hayMas && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setLimite((n) => n + POR_TANDA)}
            className="rounded-md border border-control px-5 py-2 text-sm text-muted transition hover:border-accent hover:text-fg"
          >
            Ver más obras ({totalFiltradas - cap} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
