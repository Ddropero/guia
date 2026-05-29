import type { Desglose, Precios, Servicio, Supuestos } from "@/data/tipos";

/** Costo mensual (USD) de un servicio dado los supuestos y los precios. */
export function costoDe(s: Servicio, sup: Supuestos, p: Precios): Desglose {
  let fijo = 0;
  let uso = 0;
  let detalle = "";

  switch (s.id) {
    case "anthropic": {
      const facturasSonnet = sup.facturasPorMes * (1 - sup.porcentajeGemini);
      const ocr =
        facturasSonnet *
        ((sup.ocrTokensInPorFactura / 1e6) * p.claudeInPorM +
          (sup.ocrTokensOutPorFactura / 1e6) * p.claudeOutPorM);
      const analisis =
        sup.analisisPorMes *
        ((sup.analisisTokensIn / 1e6) * p.claudeInPorM +
          (sup.analisisTokensOut / 1e6) * p.claudeOutPorM);
      uso = ocr + analisis;
      detalle = `${Math.round(facturasSonnet)} OCR (fallback) + ${sup.analisisPorMes} análisis/mes`;
      break;
    }
    case "gemini": {
      const facturasGemini = sup.facturasPorMes * sup.porcentajeGemini;
      uso =
        facturasGemini *
        ((sup.ocrTokensInPorFactura / 1e6) * p.geminiInPorM +
          (sup.ocrTokensOutPorFactura / 1e6) * p.geminiOutPorM);
      detalle = `${Math.round(facturasGemini)} OCR/mes · parte puede ser gratis`;
      break;
    }
    case "cf-workers":
      fijo = sup.cloudflareWorkersPaid ? p.workersPaidMes : 0;
      detalle = sup.cloudflareWorkersPaid
        ? "Workers Paid · cubre los 27 Workers de la cuenta"
        : "Plan Free · sin costo base";
      break;
    case "cf-d1":
      detalle = "15 bases · ~10.5 MB · dentro de la capa gratuita";
      break;
    case "cf-kv":
      detalle = "6 namespaces · capa gratis";
      break;
    case "cf-r2": {
      const gb = Math.max(0, sup.almacenamientoR2GB - p.r2GBGratis);
      uso = gb * p.r2PorGBMes;
      detalle =
        gb > 0
          ? `${gb.toFixed(1)} GB sobre los ${p.r2GBGratis} GB gratis`
          : `Dentro de los ${p.r2GBGratis} GB gratis`;
      break;
    }
    case "cf-pages":
      detalle = "Gratis";
      break;
    case "twilio":
      uso = sup.mensajesWhatsappPorMes * p.whatsappTwilioPorMensaje;
      detalle = `${sup.mensajesWhatsappPorMes} mensajes/mes · servicio gratis en Meta + fee Twilio`;
      break;
    case "telegram":
      detalle = "Gratis";
      break;
    case "resend":
      fijo = sup.planResend === "pro" ? p.resendProMes : 0;
      detalle =
        sup.planResend === "free" && sup.emailsPorMes > p.resendGratisPorMes
          ? `⚠ ${sup.emailsPorMes} correos > ${p.resendGratisPorMes} gratis: conviene Pro`
          : `${sup.emailsPorMes} correos/mes · capa gratis`;
      break;
    case "notion":
      fijo = sup.planNotion === "plus" ? p.notionPlusMes : 0;
      detalle = sup.planNotion === "plus" ? "Plan Plus" : "Plan Free";
      break;
    case "google":
      detalle = "Gratis (cuenta personal)";
      break;
    case "dominio":
      fijo = p.dominioAnual / 12;
      detalle = `$${p.dominioAnual}/año ÷ 12`;
      break;
    default:
      detalle = "";
  }

  return { servicio: s, fijoUSD: fijo, usoUSD: uso, totalUSD: fijo + uso, detalle };
}

export interface Resultado {
  desglose: Desglose[];
  totalFijo: number;
  totalUso: number;
  total: number;
  totalAnual: number;
  porCategoria: [string, number][];
}

/** Calcula el desglose completo y los totales a partir del catálogo. */
export function calcularTodo(
  servicios: Servicio[],
  sup: Supuestos,
  p: Precios,
  live?: Record<string, number> | null,
): Resultado {
  const desglose = servicios
    .filter((s) => s.activo)
    .map((s) => {
      const d = costoDe(s, sup, p);
      const lv = live?.[s.id];
      return lv != null
        ? { ...d, usoUSD: lv, totalUSD: d.fijoUSD + lv, enVivo: true }
        : d;
    })
    .sort((a, b) => b.totalUSD - a.totalUSD);

  const totalFijo = desglose.reduce((a, d) => a + d.fijoUSD, 0);
  const totalUso = desglose.reduce((a, d) => a + d.usoUSD, 0);
  const total = totalFijo + totalUso;

  const porCat = new Map<string, number>();
  for (const d of desglose) {
    porCat.set(
      d.servicio.categoria,
      (porCat.get(d.servicio.categoria) ?? 0) + d.totalUSD,
    );
  }

  return {
    desglose,
    totalFijo,
    totalUso,
    total,
    totalAnual: total * 12,
    porCategoria: [...porCat.entries()].sort((a, b) => b[1] - a[1]),
  };
}
