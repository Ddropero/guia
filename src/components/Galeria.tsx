import {
  fullDe,
  imagenDe,
  manifiestoImagen,
  wikipediaBuscar,
  wikipediaDe,
  type Obra,
} from "@/lib/obras";

/**
 * Galería de las obras comentadas en una lección.
 * - Miniatura si la obra es de dominio público (Wikimedia); si no, un marcador.
 * - Ficha (título · autor) y enlace a Wikipedia: al artículo exacto si se
 *   resolvió uno (obras-wikipedia.json), o si no a la búsqueda de Wikipedia.
 */
export default function Galeria({ obras }: { obras: Obra[] }) {
  if (!obras.length) return null;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {obras.map((o, i) => {
        const img = imagenDe(o.q);
        const wiki = wikipediaDe(o.q);
        const enlaceObra = wiki?.url ?? wikipediaBuscar(o.q);
        const man = img ? manifiestoImagen(o.q) : null;
        const fuente = man?.sourceUrl || img?.enlace || "";
        const licName = man?.licenseName || img?.licencia || "";
        const licUrl = man?.licenseUrl || "";
        const creador = man?.creador || img?.credito || "";
        const cambios = man?.cambios || "";
        return (
          <li
            key={i}
            className="flex flex-col overflow-hidden rounded-lg border border-line bg-panel transition hover:border-accent"
          >
            {img ? (
              <a
                href={enlaceObra}
                data-obra
                data-workid={o.q}
                data-titulo={o.titulo}
                data-autor={o.autor}
                data-thumb={img.thumb}
                data-full={fullDe(img.thumb)}
                data-wiki={enlaceObra}
                data-credito={creador}
                data-licencia={licName}
                data-licencia-url={licUrl}
                data-fuente={fuente}
                data-cambios={cambios}
                data-fecha={o.fecha ?? ""}
                data-ubicacion={o.ubicacion ?? ""}
                target="_blank"
                rel="noopener noreferrer"
                title={`Ver «${o.titulo}» en grande`}
                className="block cursor-zoom-in"
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
              {o.fecha && <p className="font-mono text-[10px] text-muted/80">{o.fecha}</p>}
              <a
                href={enlaceObra}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto pt-1 text-xs text-accent hover:underline"
              >
                {wiki ? "Ver en Wikipedia ↗" : "Buscar en Wikipedia ↗"}
              </a>
              {img && (
                <span className="text-[10px] text-muted/70">
                  imagen:{creador ? ` ${creador} ·` : ""}{" "}
                  {fuente ? (
                    <a href={fuente} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      Wikimedia Commons
                    </a>
                  ) : (
                    "Wikimedia Commons"
                  )}
                  {licName && (
                    <>
                      {" · "}
                      {licUrl ? (
                        <a href={licUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {licName}
                        </a>
                      ) : (
                        licName
                      )}
                    </>
                  )}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
