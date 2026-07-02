"use client";

import { useEffect, useState } from "react";
import { leer, suscribir } from "@/lib/progreso";
import { calcularLogros, type Logro, type ModuloLecciones } from "@/lib/logros";

/**
 * Rejilla de logros (insignias). Lee el progreso del cliente y reacciona a sus
 * cambios (suscribir). Las conseguidas se resaltan (border-accent, text-accent);
 * las pendientes quedan atenuadas (text-muted). Guarda contra SSR con `listo`.
 *
 * Recibe `modulos` desde el servidor: la lista de módulos con las claves de sus
 * lecciones, que `calcularLogros` usa para derivar módulos y curso completos.
 */
export default function Logros({ modulos }: { modulos: ModuloLecciones[] }) {
  const [logros, setLogros] = useState<Logro[]>([]);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const recalcular = () => {
      setLogros(calcularLogros(leer(), modulos));
      setListo(true);
    };
    recalcular();
    return suscribir(recalcular);
  }, [modulos]);

  if (!listo) return null;

  const conseguidos = logros.filter((l) => l.conseguido).length;

  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-lg text-fg">Logros</h2>
        <span className="font-mono text-xs text-muted">
          {conseguidos}/{logros.length}
        </span>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {logros.map((l) => (
          <li
            key={l.id}
            className={`rounded-md border p-3 transition ${
              l.conseguido ? "border-accent bg-accent/10 text-accent" : "border-line text-muted"
            }`}
          >
            <div className="flex items-center gap-2">
              <span aria-hidden>{l.conseguido ? "✦" : "◇"}</span>
              <h3 className="font-serif text-sm">{l.titulo}</h3>
            </div>
            <p className="mt-1 text-xs">{l.descripcion}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
