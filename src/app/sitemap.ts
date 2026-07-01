import type { MetadataRoute } from "next";
import { getModulos, getRecursos } from "@/lib/curso";

export const dynamic = "force-static";

const SITE_URL = process.env.SITE_URL ?? "https://historia.hilvan.org";

// Solo las rutas del curso (la raíz de historia.hilvan.org redirige a /curso).
export default function sitemap(): MetadataRoute.Sitemap {
  const urls: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/curso`, changeFrequency: "weekly", priority: 1 },
  ];
  for (const m of getModulos()) {
    urls.push({ url: `${SITE_URL}/curso/${m.id}`, changeFrequency: "monthly", priority: 0.8 });
    for (const l of m.lecciones) {
      urls.push({
        url: `${SITE_URL}/curso/${m.id}/${l.slug}`,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }
  for (const r of getRecursos()) {
    urls.push({ url: `${SITE_URL}/curso/recursos/${r.slug}`, changeFrequency: "monthly", priority: 0.5 });
  }
  return urls;
}
