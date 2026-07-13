import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad y uso de IA",
  description:
    "Qué datos trata el curso de Historia del Arte, a qué proveedores de IA se envían tus mensajes del tutor, y cómo se usa el almacenamiento local. Borrador pendiente de revisión legal.",
};

// Divulgaciones FACTUALES verificadas contra el código del repo (auditoría Fase 4).
// El texto legal (responsable, jurisdicción, base legal, retención de terceros)
// queda como PENDIENTE de revisión legal humana: no se inventa (reglas 8/9).
export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link href="/curso" className="text-sm text-muted hover:text-fg">
        ← Volver al curso
      </Link>

      <div className="mt-4 rounded-lg border border-warn/60 bg-warn/10 p-4 text-sm text-fg">
        <strong>Borrador.</strong> Esta página describe con precisión el tratamiento de datos tal como
        funciona hoy la aplicación, pero <strong>está pendiente de revisión legal</strong>. Los puntos
        marcados «pendiente» requieren una decisión humana (responsable, jurisdicción, base legal) y
        verificación de las políticas de terceros antes de considerarse definitiva.
      </div>

      <header className="mt-6 mb-8 border-b border-line pb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Transparencia</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-fg">
          Privacidad y uso de IA
        </h1>
        <p className="mt-2 text-muted">
          El curso es gratuito, anónimo y sin cuentas. Aun así, algunas funciones envían datos a
          terceros; aquí se explica qué, a quién y para qué.
        </p>
      </header>

      <section className="leccion-prose">
        <h2>Navegar el curso: sin cuentas ni cookies</h2>
        <p>
          Puedes leer todo el curso sin identificarte. No usamos cookies propias. Tu{" "}
          <strong>progreso</strong> (lecciones completadas, cuestionarios, repaso) se guarda solo en el{" "}
          <strong>almacenamiento local de tu navegador</strong> (<code>localStorage</code>) y{" "}
          <strong>nunca sale de tu dispositivo</strong>. Puedes borrarlo desde la propia página de
          progreso o limpiando los datos del sitio en tu navegador.
        </p>
        <p>
          Para el modo sin conexión, el <em>Service Worker</em> guarda copias de páginas e imágenes en
          la caché del navegador (también local a tu dispositivo).
        </p>

        <h2>El tutor de IA</h2>
        <p>
          Cuando usas el tutor (dudas, modo socrático o cuestionario), <strong>el texto que
          escribes</strong> y un identificador de la lección y, si analizas una obra, de la obra viajan
          por HTTPS a nuestro servidor intermedio (<code>tutor.hilvan.org</code>) y de ahí al proveedor
          de IA. <strong>No se envía tu identidad</strong> (no hay cuentas) ni el contenido completo de
          la lección: el servidor resuelve ese contexto por su cuenta.
        </p>
        <p>Proveedores de IA a los que se envían los mensajes del tutor:</p>
        <ul>
          <li>
            <strong>Groq</strong> (modelo abierto <code>openai/gpt-oss-120b</code>), proveedor por
            defecto. Consulta su{" "}
            <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer">
              política de privacidad
            </a>
            .
          </li>
          <li>
            <strong>Anthropic</strong> (Claude), usado cuando el turno incluye el análisis visual de una
            obra. Consulta su{" "}
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer">
              política de privacidad
            </a>
            .
          </li>
        </ul>
        <p>
          Nuestro servidor intermedio <strong>no registra</strong> el texto que escribes, ni los
          prompts, ni tu IP en claro: solo metadatos de operación (proveedor, modo, número de tokens,
          latencia, un identificador de petición) para medir el servicio y su coste.{" "}
          <em>Pendiente:</em> la retención de datos por parte de Groq y Anthropic se rige por sus
          propias políticas (enlazadas arriba) y debe verificarse antes de publicar afirmaciones al
          respecto.
        </p>
        <p className="text-sm text-muted">
          Recomendación: no escribas al tutor nombres, teléfonos, correos u otros datos personales.
        </p>

        <h2>Analítica</h2>
        <p>
          Usamos <strong>Cloudflare Web Analytics</strong>, una analítica agregada y sin cookies que no
          construye perfiles de usuario. Sirve para saber cuántas visitas recibe el curso, no quién
          eres.
        </p>

        <h2>Hosting</h2>
        <p>
          El sitio y el servidor del tutor se alojan en <strong>Cloudflare</strong> (Workers y Static
          Assets). Cloudflare procesa datos técnicos de conexión (incluida la IP) como parte del
          servicio de red y del control de abuso (límite de peticiones).
        </p>

        <h2 className="text-muted">Pendiente de revisión legal</h2>
        <ul className="text-muted">
          <li>Responsable del tratamiento y datos de contacto.</li>
          <li>Base legal, régimen aplicable y jurisdicción según responsable y usuarios.</li>
          <li>Derechos (acceso, rectificación, supresión, oposición) y cómo ejercerlos.</li>
          <li>Transferencias internacionales y garantías, si aplican.</li>
          <li>Retención de datos por los proveedores de IA (verificar con sus políticas).</li>
          <li>Términos de uso y política de cookies como documentos separados.</li>
        </ul>
      </section>

      <p className="mt-8 border-t border-line pt-5 text-sm text-muted">
        ¿Ves algo inexacto? <Link href="/curso/apoya" className="text-accent hover:underline">Cuéntanoslo</Link>.
      </p>
    </main>
  );
}
