import Link from "next/link";
import type { Metadata } from "next";
import { getModulos } from "@/lib/curso";
import { getObras, imagenDe, wikipediaBuscar, wikipediaDe } from "@/lib/obras";
import IndiceObras, { type ObraIndice } from "@/components/IndiceObras";

export const metadata: Metadata = {
  title: "Índice de obras",
  description:
    "Todas las obras comentadas del curso de Historia del Arte, con su autor, fecha y museo, buscables y enlazadas a su lección y a Wikipedia.",
};

export default function ObrasPage() {
  const modulos = getModulos().map((m) => ({ id: m.id, titulo: m.titulo }));

  const vistas = new Set<string>();
  const obras: ObraIndice[] = [];
  for (const m of getModulos()) {
    for (const l of m.lecciones) {
      for (const o of getObras(m.id, l.slug)) {
        if (vistas.has(o.q)) continue;
        vistas.add(o.q);
        const img = imagenDe(o.q);
        obras.push({
          titulo: o.titulo,
          autor: o.autor,
          fecha: o.fecha,
          ubicacion: o.ubicacion,
          thumb: img?.thumb,
          wiki: wikipediaDe(o.q)?.url ?? wikipediaBuscar(o.q),
          moduloId: m.id,
          leccionSlug: l.slug,
        });
      }
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/curso" className="hover:text-fg">
          Curso
        </Link>{" "}
        · Obras
      </nav>

      <header className="mb-6 border-b border-line pb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Índice de obras</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-fg">
          {obras.length} obras comentadas
        </h1>
        <p className="mt-2 text-sm text-muted">
          Todas las obras que el curso comenta, con su autor, fecha y museo. Busca por nombre,
          artista o lugar; toca una para leer más en Wikipedia o ir a su lección.
        </p>
      </header>

      <IndiceObras modulos={modulos} obras={obras} />
    </main>
  );
}
