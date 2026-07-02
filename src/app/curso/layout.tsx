import type { Metadata } from "next";

const DESCRIPCION =
  "Curso completo de Historia del Arte: de la prehistoria al arte contemporáneo global, " +
  "con un tutor de IA que resuelve dudas, te guía a mirar obras y te pone a prueba.";

// Metadata propia de la sección del curso: sobreescribe título y descripción
// (que en el root pertenecen al dashboard de costos) solo para /curso/*.
export const metadata: Metadata = {
  metadataBase: new URL("https://historia.hilvan.org"),
  title: {
    template: "%s · Historia del Arte",
    default: "Historia del Arte · Curso interactivo con tutor de IA",
  },
  description: DESCRIPCION,
  openGraph: {
    type: "website",
    siteName: "Historia del Arte",
    locale: "es",
    title: "Historia del Arte · Curso interactivo con tutor de IA",
    description: DESCRIPCION,
  },
};

export default function CursoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
