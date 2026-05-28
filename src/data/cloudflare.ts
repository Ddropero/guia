/**
 * Inventario real de la cuenta de Cloudflare (snapshot tomado vía API).
 * Sirve para que el centro de costos refleje la escala real: una sola cuenta
 * corre toda la operación, y el plan Workers Paid se cobra por cuenta, no por
 * proyecto.
 */
export interface InventarioCloudflare {
  cuenta: string;
  capturadoEn: string;
  planWorkers: "paid" | "free";
  workers: number;
  d1Bases: number;
  d1TotalBytes: number;
  r2Buckets: number;
  kvNamespaces: number;
  /** Workers agrupados por área (para dimensionar de dónde sale el uso). */
  grupos: { area: string; workers: string[] }[];
}

export const CLOUDFLARE: InventarioCloudflare = {
  cuenta: "Ddropero@gmail.com",
  capturadoEn: "2026-05-28",
  planWorkers: "paid",
  workers: 27,
  d1Bases: 15,
  d1TotalBytes: 11_055_104,
  r2Buckets: 13,
  kvNamespaces: 6,
  grupos: [
    { area: "Gastos", workers: ["cocicp-gastos", "tractomulas-gastos", "gastos"] },
    {
      area: "Salud / clínica",
      workers: [
        "cirugias-duque",
        "fisio-worker",
        "radica-eps-api",
        "radicacion-api",
        "fucs-exam-prep",
        "puente-aranda-cx",
      ],
    },
    {
      area: "Familia / personal",
      workers: ["crianza-suite", "empleados-app", "davidduque-web", "davidduque-whatsapp"],
    },
    {
      area: "Educación",
      workers: ["educacion-jobs-worker", "educacion-shell", "pyqgis-ai-generator"],
    },
    {
      area: "Bots / proxies / otros",
      workers: [
        "bukeala-bot",
        "polla-mundial-api",
        "tracking-china",
        "rehearse",
        "ml-inversiones",
        "project-links",
        "supabase-keepalive",
        "perplexity-proxy",
        "corti-proxy",
        "bold-proxy",
        "bid-proxy",
      ],
    },
  ],
};
