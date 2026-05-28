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
      fijo = p.workersPaidMes;
      detalle = "Plan Workers Paid (cuenta completa)";
      break;
    case "cf-d1":
      detalle = "Dentro de la capa gratuita";
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
    case "vercel":
      fijo = sup.planVercel === "pro" ? p.vercelProMes : 0;
      detalle = sup.planVercel === "pro" ? "Plan Pro" : "Plan Hobby (gratis)";
      break;
    case "twilio":
      uso = sup.conversacionesWhatsappPorMes * p.whatsappPorConversacion;
      detalle = `${sup.conversacionesWhatsappPorMes} conversaciones/mes`;
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
): Resultado {
  const desglose = servicios
    .filter((s) => s.activo)
    .map((s) => costoDe(s, sup, p))
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
