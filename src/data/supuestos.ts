import type { Supuestos } from "./tipos";
import { USO_REAL } from "./uso-real";

/**
 * Supuestos por defecto, sembrados con el uso REAL leído de D1:
 * 163 gastos en ~5 meses ≈ 33/mes. Todo es editable desde la UI.
 */
export const SUPUESTOS_DEFAULT: Supuestos = {
  fxCOPporUSD: 4100,
  facturasPorMes: USO_REAL.facturasPorMesEstimado,
  ocrTokensInPorFactura: 6000,
  ocrTokensOutPorFactura: 1500,
  porcentajeGemini: 0.8,
  analisisPorMes: 4,
  analisisTokensIn: 8000,
  analisisTokensOut: 2000,
  mensajesWhatsappPorMes: 60,
  emailsPorMes: 50,
  almacenamientoR2GB: 2,
  cloudflareWorkersPaid: true,
  planVercel: "hobby",
  planResend: "free",
  planNotion: "free",
};
