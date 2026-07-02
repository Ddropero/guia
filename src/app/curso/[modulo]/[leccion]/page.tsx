import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getModulos, getModulo, getLeccion } from "@/lib/curso";
import TutorPanel from "@/components/TutorPanel";
import Galeria from "@/components/Galeria";
import Lightbox from "@/components/Lightbox";
import { LeccionCompletaToggle } from "@/components/Progreso";
import { getObras } from "@/lib/obras";

export const dynamicParams = false;

export function generateStaticParams() {
  const params: { modulo: string; leccion: string }[] = [];
  for (const m of getModulos()) {
    const det = getModulo(m.id);
    for (const l of det?.lecciones ?? []) {
      params.push({ modulo: m.id, leccion: l.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ modulo: string; leccion: string }>;
}): Promise<Metadata> {
  const { modulo, leccion } = await params;
  const l = getLeccion(modulo, leccion);
  return { title: l ? l.titulo : "Lección" };
}

export default async function LeccionPage({
  params,
}: {
  params: Promise<{ modulo: string; leccion: string }>;
}) {
  const { modulo, leccion } = await params;
  const l = getLeccion(modulo, leccion);
  if (!l) notFound();
  const obras = getObras(modulo, leccion);

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/curso" className="hover:text-fg">
          Curso
        </Link>{" "}
        ·{" "}
        <Link href={`/curso/${l.moduloId}`} className="hover:text-fg">
          {l.moduloTitulo}
        </Link>
      </nav>

      {obras.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 font-serif text-xl text-fg">Galería de obras</h2>
          <p className="mb-3 text-sm text-muted">
            Las obras que comenta esta lección. Toca cualquiera para leer más en Wikipedia.
          </p>
          <Galeria obras={obras} />
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <article
            className="leccion-prose"
            dangerouslySetInnerHTML={{ __html: l.html }}
          />

          <div className="mt-8 border-t border-line pt-6">
            <LeccionCompletaToggle moduloId={l.moduloId} slug={l.slug} />
          </div>

          <nav className="mt-8 flex items-stretch justify-between gap-4 border-t border-line pt-6">
            {l.prev ? (
              <Link
                href={`/curso/${l.prev.moduloId}/${l.prev.slug}`}
                className="group max-w-[48%] rounded-md border border-line p-3 text-sm transition hover:border-accent"
              >
                <span className="block text-xs text-muted">← Anterior</span>
                <span className="text-fg group-hover:text-accent">{l.prev.titulo}</span>
              </Link>
            ) : (
              <span />
            )}
            {l.next ? (
              <Link
                href={`/curso/${l.next.moduloId}/${l.next.slug}`}
                className="group max-w-[48%] rounded-md border border-line p-3 text-right text-sm transition hover:border-accent"
              >
                <span className="block text-xs text-muted">Siguiente →</span>
                <span className="text-fg group-hover:text-accent">{l.next.titulo}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <TutorPanel
            titulo={l.titulo}
            modulo={l.moduloTitulo}
            contexto={l.texto.slice(0, 8000)}
          />
        </div>
      </div>

      <Lightbox />
    </main>
  );
}
