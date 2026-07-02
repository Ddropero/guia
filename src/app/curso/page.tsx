import Link from "next/link";
import type { Metadata } from "next";
import { getModulos, getRecursos } from "@/lib/curso";
import {
  ProgresoModulo,
  ProgresoGlobal,
  ContinuarDondeLoDejaste,
  GestionProgreso,
} from "@/components/Progreso";

export const metadata: Metadata = {
  title: "Historia del Arte · Curso interactivo con tutor de IA",
  description:
    "Un curso completo de Historia del Arte: de la prehistoria al arte contemporáneo global, con un tutor de IA que resuelve dudas, te guía a mirar obras y te pone a prueba.",
};

export default function CursoHome() {
  const modulos = getModulos();
  const recursos = getRecursos();
  const totalLecciones = modulos.reduce((n, m) => n + m.lecciones.length, 0);
  const guias = recursos.filter((r) => r.grupo === "Guías");
  const referencias = recursos.filter((r) => r.grupo === "Referencias");

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <header className="mb-10 border-b border-line pb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Curso interactivo</p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
          Historia del Arte
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          De las cuevas de Lascaux al arte digital. {modulos.length} módulos ·{" "}
          {totalLecciones} lecciones, con un <strong className="text-fg">tutor de IA</strong> que
          resuelve tus dudas, te guía a <em>mirar</em> cada obra y te pone a prueba.
        </p>
      </header>

      {totalLecciones === 0 ? (
        <p className="rounded-lg border border-line bg-panel p-6 text-muted">
          El contenido del curso se está generando. Vuelve en unos minutos.
        </p>
      ) : (
        <>
          <div className="mb-10 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <ProgresoGlobal total={totalLecciones} />
            {guias.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {guias.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/curso/recursos/${g.slug}`}
                    className="rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-accent hover:text-fg"
                  >
                    {g.titulo}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <ContinuarDondeLoDejaste />
              <Link
                href="/curso/repaso"
                className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-fg"
              >
                🗂 Repaso espaciado
              </Link>
            </div>
            <GestionProgreso />
          </div>

          <section className="space-y-3">
            {modulos.map((m, i) => (
              <Link
                key={m.id}
                href={`/curso/${m.id}`}
                className="block rounded-lg border border-line bg-panel p-5 transition hover:border-accent"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-mono text-xs text-muted">
                      {String(i).padStart(2, "0")}
                    </span>
                    <h2 className="font-serif text-xl text-fg">{m.titulo}</h2>
                  </div>
                  <ProgresoModulo moduloId={m.id} slugs={m.lecciones.map((l) => l.slug)} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {m.lecciones.length} {m.lecciones.length === 1 ? "lección" : "lecciones"}
                </p>
              </Link>
            ))}
          </section>

          {referencias.length > 0 && (
            <section className="mt-12">
              <h2 className="font-serif text-2xl text-fg">Materiales de referencia</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {referencias.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/curso/recursos/${r.slug}`}
                    className="rounded-md border border-line bg-panel px-4 py-3 text-sm text-fg transition hover:border-accent"
                  >
                    {r.titulo}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
