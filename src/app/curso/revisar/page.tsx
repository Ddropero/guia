import Link from "next/link";
import type { Metadata } from "next";
import { imagenesMostradas, getOverridesImagenes } from "@/lib/obras";
import RevisarImagenes from "@/components/RevisarImagenes";

// Herramienta interna de curación: no debe indexarse ni figurar en el menú.
export const metadata: Metadata = {
  title: "Revisar imágenes",
  robots: { index: false, follow: false },
};

export default function RevisarPage() {
  const items = imagenesMostradas();
  const overrides = getOverridesImagenes();
  const commons = items.filter((i) => i.fuente === "commons").length;

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <Link href="/curso" className="text-sm text-muted hover:text-fg">
        ← Volver al curso
      </Link>
      <header className="mb-4 mt-4">
        <h1 className="font-serif text-2xl font-semibold text-fg">Revisar imágenes de las obras</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          {items.length} obras con imagen ({commons} de Commons, las de mayor riesgo). Toca las que{" "}
          <strong className="text-fg">no</strong> corresponden a la obra indicada y pulsa Exportar.
        </p>
      </header>
      <RevisarImagenes items={items} overridesActuales={overrides} />
    </main>
  );
}
