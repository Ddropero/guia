import Link from "next/link";
import type { Metadata } from "next";
import { getModulos } from "@/lib/curso";
import Logros from "@/components/Logros";
import Certificado from "@/components/Certificado";
import ApoyaCTA from "@/components/ApoyaCTA";
import type { ModuloLecciones } from "@/lib/logros";

export const metadata: Metadata = {
  title: "Logros y certificado",
  description:
    "Tus hitos en el curso de Historia del Arte y tu certificado de finalización (autoevaluado) al completarlo.",
};

export default function LogrosPage() {
  const modulos = getModulos();
  const modulosLogros: ModuloLecciones[] = modulos.map((m) => ({
    id: m.id,
    leccionIds: m.lecciones.map((l) => `${m.id}/${l.slug}`),
  }));
  const idsLecciones = modulosLogros.flatMap((m) => m.leccionIds);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/curso" className="hover:text-fg">
          Curso
        </Link>{" "}
        · Logros
      </nav>

      <header className="mb-8 border-b border-line pb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Tu recorrido</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-fg">
          Logros y certificado
        </h1>
        <p className="mt-2 text-sm text-muted">
          Tus hitos a medida que avanzas. Al completar las {idsLecciones.length} lecciones
          desbloqueas tu certificado de finalización.
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 font-serif text-xl text-fg">Insignias</h2>
        <Logros modulos={modulosLogros} />
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl text-fg">Certificado</h2>
        <Certificado total={idsLecciones.length} ids={idsLecciones} />
      </section>

      <section className="mt-10">
        <ApoyaCTA mensaje="¿Te ha servido este curso?" />
      </section>
    </main>
  );
}
