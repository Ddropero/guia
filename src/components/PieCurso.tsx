import Link from "next/link";

/**
 * Pie común de las páginas del curso: enlaza las páginas legales y de apoyo.
 * Server component (sin estado). Se monta en el layout de /curso.
 */
export default function PieCurso() {
  const enlaces: [string, string][] = [
    ["/curso", "Curso"],
    ["/curso/apoya", "Apoyar"],
    ["/curso/privacidad", "Privacidad"],
    ["/curso/cookies", "Cookies"],
    ["/curso/terminos", "Términos"],
  ];
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-6 text-xs text-muted sm:px-8">
        <span className="text-fg">Historia del Arte</span>
        <nav className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Pie de página">
          {enlaces.map(([href, txt]) => (
            <Link key={href} href={href} className="hover:text-fg">
              {txt}
            </Link>
          ))}
        </nav>
        <span className="ml-auto">Curso gratuito y sin anuncios.</span>
      </div>
    </footer>
  );
}
