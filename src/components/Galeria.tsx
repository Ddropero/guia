import { gac, imagenDe, type Obra } from "@/lib/obras";

/**
 * Galería de las obras comentadas en una lección.
 * - Miniatura si la obra es de dominio público (Wikimedia); si no, un marcador.
 * - Ficha (título · autor) y botón "Ver en Google Arts & Culture" (para todas,
 *   incluidas las contemporáneas con derechos).
 */
export default function Galeria({ obras }: { obras: Obra[] }) {
  if (!obras.length) return null;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {obras.map((o, i) => {
        const img = imagenDe(o.q);
        return (
          <li
            key={i}
            className="flex flex-col overflow-hidden rounded-lg border border-line bg-panel transition hover:border-accent"
          >
            {img ? (
              <a
                href={img.enlace || gac(o.q)}
                target="_blank"
                rel="noopener noreferrer"
                title={img.credito ? `Imagen: ${img.credito}${img.licencia ? ` · ${img.licencia}` : ""}` : o.titulo}
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.thumb}
                  alt={o.titulo}
                  loading="lazy"
                  className="aspect-[4/3] w-full bg-panel2 object-cover"
                />
              </a>
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center bg-panel2 text-2xl text-muted">
                ⬚
              </div>
            )}

            <div className="flex flex-1 flex-col gap-1 p-3">
              <p className="font-serif text-sm leading-snug text-fg">{o.titulo}</p>
              {o.autor && <p className="text-xs text-muted">{o.autor}</p>}
              <a
                href={gac(o.q)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto pt-1 text-xs text-accent hover:underline"
              >
                Ver en Google Arts &amp; Culture ↗
              </a>
              {img?.licencia && (
                <span className="text-[10px] text-muted/70">imagen: {img.licencia} · Wikimedia</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
