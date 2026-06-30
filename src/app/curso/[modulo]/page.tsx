import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getModulos, getModulo } from "@/lib/curso";
import { ProgresoModulo } from "@/components/Progreso";

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
  return { title: m ? `${m.titulo} · Historia del Arte` : "Historia del Arte" };
}

export default async function ModuloPage({
  params,
}: {
  params: Promise<{ modulo: string }>;
}) {
  const { modulo } = await params;
  const m = getModulo(modulo);
  if (!m) notFound();

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
    </main>
  );
}
