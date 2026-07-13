import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookies y almacenamiento",
  description:
    "El curso no usa cookies propias. Explicación del almacenamiento local (progreso), la caché del modo sin conexión y la analítica sin cookies.",
  alternates: { canonical: "https://historia.hilvan.org/curso/cookies" },
};

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link href="/curso" className="text-sm text-muted hover:text-fg">
        ← Volver al curso
      </Link>

      <div className="mt-4 rounded-lg border border-warn/60 bg-warn/10 p-4 text-sm text-fg">
        <strong>Borrador.</strong> Describe el comportamiento real de la aplicación hoy; pendiente de
        revisión antes de considerarse definitivo.
      </div>

      <header className="mt-6 mb-8 border-b border-line pb-5">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-fg">
          Cookies y almacenamiento
        </h1>
      </header>

      <section className="leccion-prose">
        <h2>No usamos cookies propias</h2>
        <p>
          El curso <strong>no instala cookies propias</strong> ni de seguimiento. No hace falta aceptar
          nada para navegar.
        </p>
        <h2>Almacenamiento local (en tu dispositivo)</h2>
        <ul>
          <li>
            <strong>Progreso</strong> (lecciones completadas, cuestionarios, repaso espaciado): se
            guarda en <code>localStorage</code>, solo en tu navegador. Puedes borrarlo desde la página
            de progreso o limpiando los datos del sitio.
          </li>
          <li>
            <strong>Modo sin conexión</strong>: el <em>Service Worker</em> guarda copias de páginas e
            imágenes en la caché del navegador para que el curso funcione sin red. También es local.
          </li>
        </ul>
        <h2>Analítica sin cookies</h2>
        <p>
          Usamos <strong>Cloudflare Web Analytics</strong>, agregada y{" "}
          <em>sin cookies</em>. No construye perfiles.{" "}
          <span className="text-muted">
            (Pendiente: verificar y citar la postura oficial de Cloudflare antes de afirmarlo como
            definitivo.)
          </span>
        </p>
        <p className="text-sm text-muted">
          Más detalle sobre datos y proveedores en la{" "}
          <Link href="/curso/privacidad" className="text-accent hover:underline">
            política de privacidad
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
