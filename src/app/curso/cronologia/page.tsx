import Link from "next/link";
import type { Metadata } from "next";
import { getCronologia } from "@/lib/cronologia";
import Cronologia from "@/components/Cronologia";

export const metadata: Metadata = {
  title: "Línea de tiempo",
  description:
    "Cronología interactiva del curso de Historia del Arte: los grandes hitos, de la prehistoria a hoy, ordenados y filtrables por región.",
};

export default function CronologiaPage() {
  const hitos = getCronologia();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/curso" className="hover:text-fg">
          Curso
        </Link>{" "}
        · Línea de tiempo
      </nav>

      <header className="mb-6 border-b border-line pb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Cronología</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-fg">
          Línea de tiempo
        </h1>
        <p className="mt-2 text-sm text-muted">
          Los grandes hitos del arte, de la prehistoria a hoy. Filtra por región para seguir un hilo.
        </p>
      </header>

      <Cronologia hitos={hitos} />
    </main>
  );
}
