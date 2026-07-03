import Link from "next/link";
import type { Metadata } from "next";
import { APOYA_URL, APOYA_PLATAFORMA, apoyaActivo } from "@/lib/apoyo";

export const metadata: Metadata = {
  title: "Apoyar el proyecto",
  description:
    "Historia del Arte es un curso gratuito y sin anuncios. Si te ha servido, puedes ayudar a sostener el hosting, el tutor de IA y las nuevas obras.",
};

// Formas gratuitas de ayudar: sirven aunque no haya mecenazgo configurado.
const AYUDAS_GRATIS = [
  {
    icono: "↗",
    titulo: "Compártelo",
    texto:
      "Pásaselo a quien pueda disfrutarlo: un estudiante, un aula, un grupo. Es la ayuda que más lo hace crecer.",
  },
  {
    icono: "✎",
    titulo: "Cuéntame qué falla",
    texto:
      "Si ves un error, una obra mal atribuida o una imagen que no corresponde, avísame. Cada corrección mejora el curso para todos.",
  },
  {
    icono: "★",
    titulo: "Termina el curso",
    texto:
      "Usarlo de verdad —leer, mirar, hacer los cuestionarios— ya es apoyo. Para eso se hizo.",
  },
];

// A dónde va el dinero. Transparente por diseño.
const DESTINOS = [
  {
    titulo: "Hosting y dominio",
    texto: "Mantener historia.hilvan.org en línea, rápido y disponible para cualquiera.",
  },
  {
    titulo: "El tutor de IA",
    texto:
      "Cada conversación con el tutor tiene un coste por mensaje. Tu apoyo mantiene esa puerta abierta.",
  },
  {
    titulo: "Más obras, bien hechas",
    texto:
      "Añadir obras nuevas y verificar sus licencias e imágenes lleva tiempo. Esto lo financia.",
  },
  {
    titulo: "Gratis y sin anuncios",
    texto:
      "El compromiso es que el contenido nunca esté detrás de un muro de pago ni rodeado de publicidad.",
  },
];

export default function ApoyaPage() {
  const activo = apoyaActivo();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link href="/curso" className="text-sm text-muted hover:text-fg">
        ← Volver al curso
      </Link>

      <header className="mt-6 mb-8 border-b border-line pb-6">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Proyecto libre</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          Apoyar el proyecto
        </h1>
        <p className="mt-3 text-muted">
          Este curso es <strong className="text-fg">gratis, abierto y sin anuncios</strong>, y así
          va a seguir. Lo construye y lo mantiene una sola persona. Si te ha servido y quieres que
          siga creciendo, puedes echar una mano.
        </p>
      </header>

      {/* Botón de mecenazgo (solo si hay enlace configurado). */}
      {activo ? (
        <section className="mb-10 rounded-lg border border-accent bg-accent/5 p-6 text-center">
          <h2 className="font-serif text-xl text-fg">Invítame a sostenerlo</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Un aporte puntual o mensual, la cantidad que quieras. Se gestiona de forma segura en{" "}
            {APOYA_PLATAFORMA}.
          </p>
          <a
            href={APOYA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-md border border-accent bg-accent/15 px-6 py-3 font-medium text-accent transition hover:bg-accent/25"
          >
            ♡ Apoyar en {APOYA_PLATAFORMA}
          </a>
        </section>
      ) : (
        <section className="mb-10 rounded-lg border border-line bg-panel p-6">
          <h2 className="font-serif text-xl text-fg">El mecenazgo llega pronto</h2>
          <p className="mt-2 text-sm text-muted">
            Todavía estoy montando la página de aportes. Mientras tanto, la mejor forma de ayudar es
            usar el curso y compartirlo. ¡Gracias por estar aquí!
          </p>
        </section>
      )}

      <section className="mb-10">
        <h2 className="font-serif text-2xl text-fg">A dónde va tu apoyo</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {DESTINOS.map((d) => (
            <div key={d.titulo} className="rounded-lg border border-line bg-panel p-5">
              <h3 className="font-serif text-lg text-fg">{d.titulo}</h3>
              <p className="mt-1 text-sm text-muted">{d.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-serif text-2xl text-fg">Ayudar sin gastar nada</h2>
        <p className="mt-2 text-sm text-muted">
          No hace falta dinero para sostener esto. Estas tres cosas valen tanto como un aporte:
        </p>
        <ul className="mt-4 space-y-3">
          {AYUDAS_GRATIS.map((a) => (
            <li key={a.titulo} className="flex gap-3 rounded-lg border border-line bg-panel p-4">
              <span aria-hidden className="mt-0.5 font-mono text-lg text-accent">
                {a.icono}
              </span>
              <div>
                <h3 className="font-medium text-fg">{a.titulo}</h3>
                <p className="mt-0.5 text-sm text-muted">{a.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="border-t border-line pt-6 text-sm text-muted">
        Gracias por leer hasta aquí. El curso está para quedarse, con o sin aporte. —{" "}
        <Link href="/curso" className="text-accent hover:underline">
          Seguir aprendiendo
        </Link>
      </p>
    </main>
  );
}
