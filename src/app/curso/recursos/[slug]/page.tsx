import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRecursos, getRecurso } from "@/lib/curso";

export const dynamicParams = false;

export function generateStaticParams() {
  return getRecursos().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const r = getRecurso(slug);
  return { title: r ? r.titulo : "Recurso" };
}

export default async function RecursoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = getRecurso(slug);
  if (!r) notFound();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link href="/curso" className="text-sm text-muted hover:text-fg">
        ← Volver al curso
      </Link>
      <article
        className="leccion-prose mt-6"
        dangerouslySetInnerHTML={{ __html: r.html }}
      />
    </main>
  );
}
