import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getModulos, getModulo } from "@/lib/curso";
import { tieneCuestionario } from "@/lib/quiz";
import { ProgresoModulo, QuizBadge } from "@/components/Progreso";

export const dynamicParams = false;

export function generateStaticParams() {
  return getModulos().map((m) => ({ modulo: m.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ modulo: string }>;
}): Promise<Metadata> {
  const { modulo } = await params;
  const m = getModulo(modulo);
  if (!m) return { title: "Módulo" };
  const n = m.lecciones?.length ?? 0;
  const description = `${m.titulo}: ${n} ${n === 1 ? "lección" : "lecciones"} del curso de Historia del Arte.`;
  const url = `https://historia.hilvan.org/curso/${modulo}`;
  return {
    title: m.titulo,
    description,
    alternates: { canonical: url },
    openGraph: { title: m.titulo, description, url },
  };
}

export default async function ModuloPage({
  params,
}: {
  params: Promise<{ modulo: string }>;
}) {
  const { modulo } = await params;
  const m = getModulo(modulo);
  if (!m) notFound();
  const hayQuiz = tieneCuestionario(m.id);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link href="/curso" className="text-sm text-muted hover:text-fg">
        ← Todos los módulos
      </Link>

      <header className="mt-4 mb-6 border-b border-line pb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-fg">{m.titulo}</h1>
          <ProgresoModulo moduloId={m.id} slugs={m.lecciones.map((l) => l.slug)} />
        </div>
      </header>

      {m.introHtml && (
        <article
          className="leccion-prose mb-8"
          dangerouslySetInnerHTML={{ __html: m.introHtml }}
        />
      )}

      <h2 className="mb-3 font-serif text-xl text-fg">Lecciones</h2>
      <ol className="space-y-2">
        {m.lecciones.map((l, i) => (
          <li key={l.slug}>
            <Link
              href={`/curso/${m.id}/${l.slug}`}
              className="flex items-baseline gap-3 rounded-md border border-line bg-panel px-4 py-3 transition hover:border-accent"
            >
              <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-fg">{l.titulo}</span>
            </Link>
          </li>
        ))}
      </ol>

      {hayQuiz && (
        <Link
          href={`/curso/${m.id}/cuestionario`}
          className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-4 transition hover:border-accent"
        >
          <span className="flex items-center gap-3">
            <span aria-hidden className="text-lg">
              ✎
            </span>
            <span>
              <span className="block text-fg">Cuestionario del módulo</span>
              <span className="block text-xs text-muted">
                Ponte a prueba con corrección instantánea
              </span>
            </span>
          </span>
          <QuizBadge moduloId={m.id} />
        </Link>
      )}
    </main>
  );
}
