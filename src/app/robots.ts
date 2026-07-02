import type { MetadataRoute } from "next";

// SITE_URL solo se define en el build de historia (ver package.json → deploy:historia).
// El build del dashboard de costos (workers.dev, interno) sale sin indexar.
export const dynamic = "force-static";

const SITE_URL = process.env.SITE_URL;

export default function robots(): MetadataRoute.Robots {
  if (!SITE_URL) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
