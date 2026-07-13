import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de uso",
  description:
    "Condiciones de uso del curso de Historia del Arte: gratuito y sin anuncios, límites del tutor de IA, atribución de imágenes y aviso sobre contenido asistido por IA.",
  alternates: { canonical: "https://historia.hilvan.org/curso/terminos" },
};

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link href="/curso" className="text-sm text-muted hover:text-fg">
        ← Volver al curso
      </Link>

      <div className="mt-4 rounded-lg border border-warn/60 bg-warn/10 p-4 text-sm text-fg">
        <strong>Borrador.</strong> Estos términos describen el funcionamiento actual pero{" "}
        <strong>están pendientes de revisión legal</strong> (ley aplicable y jurisdicción por decidir).
      </div>

      <header className="mt-6 mb-8 border-b border-line pb-5">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-fg">Términos de uso</h1>
      </header>

      <section className="leccion-prose">
        <h2>Gratuito y sin anuncios</h2>
        <p>
          El contenido del curso es de acceso libre y no lleva publicidad. Los aportes en la página de{" "}
          <Link href="/curso/apoya">apoyo</Link> son voluntarios.
        </p>
        <h2>Tutor de IA: uso razonable</h2>
        <p>
          El tutor tiene límites de uso para sostener el servicio (actualmente 30 peticiones por minuto
          por IP y 200 por minuto en total). Las respuestas las genera un modelo de IA y pueden
          contener errores; no sustituyen el estudio ni el criterio de un docente.
        </p>
        <h2>Imágenes y atribución</h2>
        <p>
          Las imágenes de obras provienen de Wikimedia Commons; cada una muestra su fuente y licencia
          (atribución TASL) junto a la imagen. Respeta esas licencias si reutilizas el material.
        </p>
        <h2>Contenido asistido por IA</h2>
        <p>
          Parte del contenido se generó con asistencia de IA y está sujeto a revisión humana continua
          (ver <Link href="/curso/privacidad">privacidad y uso de IA</Link>). Si detectas un error,
          agradecemos el aviso.
        </p>
        <h2 className="text-muted">Pendiente de revisión legal</h2>
        <ul className="text-muted">
          <li>Ley aplicable y jurisdicción.</li>
          <li>Limitación de responsabilidad y garantías.</li>
          <li>Identidad del responsable y datos de contacto.</li>
        </ul>
      </section>
    </main>
  );
}
