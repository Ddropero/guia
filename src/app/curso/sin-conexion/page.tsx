import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sin conexión",
  robots: { index: false, follow: false },
};

// Página de reserva que sirve el Service Worker cuando se navega a algo que no
// está en caché y no hay red. Es estática y ligera para poder precachearse.
export default function SinConexionPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Sin conexión</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold text-fg">Estás sin conexión</h1>
      <p className="mt-3 text-muted">
        No hemos podido cargar esta página porque no hay conexión a internet. Las lecciones que ya
        habías abierto siguen disponibles desde la caché; las nuevas necesitarán red.
      </p>
      <p className="mt-2 text-sm text-muted">
        Tu progreso está guardado en este dispositivo y no se pierde.
      </p>
      <div className="mt-6">
        <Link
          href="/curso"
          className="rounded-md border border-accent bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
        >
          Ir al curso
        </Link>
      </div>
    </main>
  );
}
