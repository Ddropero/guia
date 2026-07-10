import Link from "next/link";

/**
 * Llamado suave a sostener el proyecto. NO es un muro de pago: solo enlaza a la
 * página /curso/apoya, que explica a dónde va el dinero y ofrece el botón de
 * mecenazgo (si está configurado) o formas gratuitas de ayudar.
 *
 * `variante`:
 *   - "tarjeta": bloque destacado (para el pie de página del curso o logros).
 *   - "linea": enlace compacto para barras de navegación.
 */
export default function ApoyaCTA({
  variante = "tarjeta",
  mensaje,
}: {
  variante?: "tarjeta" | "linea";
  mensaje?: string;
}) {
  if (variante === "linea") {
    return (
      <Link
        href="/curso/apoya"
        className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-fg"
      >
        ♡ Apoyar
      </Link>
    );
  }

  return (
    <aside className="rounded-lg border border-line bg-panel p-6">
      <p className="font-mono text-xs uppercase tracking-widest text-accent2">
        Proyecto libre
      </p>
      <h3 className="mt-2 font-serif text-lg text-fg">
        {mensaje ?? "Este curso es gratis y sin anuncios"}
      </h3>
      <p className="mt-2 text-sm text-muted">
        Lo sostiene una sola persona. Si te ha servido, puedes ayudar a mantener el
        hosting, el tutor de IA y las nuevas obras. Cualquier cantidad cuenta —{" "}
        <span className="text-fg">y compartirlo también ayuda</span>.
      </p>
      <Link
        href="/curso/apoya"
        className="mt-4 inline-flex items-center gap-2 rounded-md border border-accent bg-accent/10 px-4 py-2 text-sm text-accent transition hover:bg-accent/20"
      >
        ♡ Apoyar el proyecto
      </Link>
    </aside>
  );
}
