import type { MetadataRoute } from "next";

// Manifest de la PWA "Historia del Arte".
// Igual que sitemap.ts/robots.ts en este repo, forzamos generación estática para
// que sea compatible con output:"export" (se emite un manifest.webmanifest físico).
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Historia del Arte",
    short_name: "Arte",
    description:
      "Curso de Historia del Arte: módulos, lecciones y cuestionarios. Funciona sin conexión; tu progreso se guarda en el dispositivo.",
    start_url: "/curso",
    display: "standalone",
    background_color: "#0a0b0a",
    theme_color: "#b8f0a0",
    // El tipo de Next (MetadataRoute.Manifest) solo admite UN valor por icono en
    // `purpose` ('any' | 'maskable' | 'monochrome'), no la cadena "any maskable".
    // Para cubrir ambos usos declaramos dos entradas del mismo SVG.
    icons: [
      { src: "/icono.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/icono.svg", type: "image/svg+xml", sizes: "any", purpose: "maskable" },
    ],
  };
}
