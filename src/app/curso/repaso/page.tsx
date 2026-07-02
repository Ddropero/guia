import Link from "next/link";
import type { Metadata } from "next";
import { getModulos } from "@/lib/curso";
import { getGlosario } from "@/lib/glosario";
import { getObras, imagenDe } from "@/lib/obras";
import Repaso, { type Carta } from "@/components/Repaso";

export const metadata: Metadata = {
  title: "Repaso espaciado",
  description:
    "Fija el vocabulario y las obras del curso con repaso espaciado: el sistema te muestra cada tarjeta justo cuando estás a punto de olvidarla.",
};

// Mazo completo, construido en build desde el glosario y las obras con imagen.
function construirMazo(): Carta[] {
  const cartas: Carta[] = [];

  for (const t of getGlosario()) {
    cartas.push({ id: `g:${t.termino}`, tipo: "glosario", frente: t.termino, dorso: t.definicion });
  }

  const vistas = new Set<string>();
  for (const m of getModulos()) {
    for (const l of m.lecciones) {
      for (const o of getObras(m.id, l.slug)) {
        if (vistas.has(o.q)) continue;
        const img = imagenDe(o.q);
        if (!img) continue;
        vistas.add(o.q);
        cartas.push({
          id: `o:${o.q}`,
          tipo: "obra",
          frente: "",
          dorso: o.autor ? `${o.titulo} — ${o.autor}` : o.titulo,
          imagen: img.thumb,
          modulo: m.id,
        });
      }
    }
  }
  return cartas;
}

export default function RepasoPage() {
  const cartas = construirMazo();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/curso" className="hover:text-fg">
          Curso
        </Link>{" "}
        · Repaso
      </nav>

      <header className="mb-6 border-b border-line pb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Repaso espaciado</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-fg">
          Fija lo aprendido
        </h1>
        <p className="mt-2 text-sm text-muted">
          Tarjetas de vocabulario y de obras. El sistema te las muestra justo cuando estás a punto de
          olvidarlas: acierta y tardarán más en volver; falla y volverás a verlas pronto. Las obras
          aparecen a medida que avanzas en los módulos.
        </p>
      </header>

      <Repaso cartas={cartas} />
    </main>
  );
}
