import type { Supuestos } from "./tipos";

/**
 * Supuestos por defecto, sembrados con el uso real observado:
 * ~119 facturas en 4 meses ≈ 30/mes. Todo es editable desde la UI.
 */
export const SUPUESTOS_DEFAULT: Supuestos = {
  fxCOPporUSD: 4100,
  facturasPorMes: 30,
  ocrTokensInPorFactura: 6000,
  ocrTokensOutPorFactura: 1500,
  porcentajeGemini: 0.8,
  analisisPorMes: 4,
  analisisTokensIn: 8000,
  analisisTokensOut: 2000,
  conversacionesWhatsappPorMes: 30,
  emailsPorMes: 50,
  almacenamientoR2GB: 2,
  cloudflareWorkersPaid: true,
  planVercel: "hobby",
  planResend: "free",
  planNotion: "free",
};
