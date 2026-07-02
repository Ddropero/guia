import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getModulos, getModulo } from "@/lib/curso";
import { getCuestionario, tieneCuestionario } from "@/lib/quiz";
import Cuestionario from "@/components/Cuestionario";

export const dynamicParams = false;

export function generateStaticParams() {
  return getModulos()
    .filter((m) => tieneCuestionario(m.id))
    .map((m) => ({ modulo: m.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ modulo: string }>;
}): Promise<Metadata> {
  const { modulo } = await params;
  const m = getModulo(modulo);
  return { title: m ? `Cuestionario · ${m.titulo}` : "Cuestionario" };
}

export default async function CuestionarioPage({
  params,
}: {
  params: Promise<{ modulo: string }>;
}) {
  const { modulo } = await params;
  const m = getModulo(modulo);
  const q = getCuestionario(modulo);
  if (!m || !q) notFound();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/curso" className="hover:text-fg">
          Curso
        </Link>{" "}
        ·{" "}
        <Link href={`/curso/${m.id}`} className="hover:text-fg">
          {m.titulo}
        </Link>
      </nav>

      <header className="mb-6 border-b border-line pb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Cuestionario</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-fg">{m.titulo}</h1>
        <p className="mt-2 text-sm text-muted">
          {q.preguntas.length} preguntas de opción múltiple. Elige una respuesta por pregunta y pulsa
          «Corregir». Tu mejor puntuación se guarda en este navegador.
        </p>
      </header>

      <Cuestionario moduloId={m.id} preguntas={q.preguntas} />
    </main>
  );
}
