import type { Precios } from "./tipos";

/**
 * Precios de referencia (USD). Son APROXIMADOS y deben verificarse contra la
 * consola de cada proveedor. Se editan aquí, en un solo lugar.
 *
 * Última revisión manual: ver `actualizado`.
 */
export const PRECIOS: Precios = {
  // Anthropic Claude (Sonnet) — por millón de tokens
  claudeInPorM: 3.0,
  claudeOutPorM: 15.0,

  // Google Gemini (Flash) — por millón de tokens
  geminiInPorM: 0.1,
  geminiOutPorM: 0.4,

  // Cloudflare
  workersPaidMes: 5.0,
  r2PorGBMes: 0.015,
  r2GBGratis: 10,

  // Twilio WhatsApp — desde jul-2025 se cobra POR MENSAJE (no por conversación).
  // Los mensajes de servicio (iniciados por el usuario, ventana 24 h) son gratis
  // en Meta; queda el fee de plataforma de Twilio (~$0.005/mensaje). Las plantillas
  // de marketing/utilidad sí pagan tarifa de Meta aparte.
  whatsappTwilioPorMensaje: 0.005,

  // Resend
  resendProMes: 20.0,
  resendGratisPorMes: 3000,

  // Notion Plus (por miembro/mes, facturado anual)
  notionPlusMes: 10.0,

  // Dominio .com (anual)
  dominioAnual: 12.0,

  actualizado: "2026-05",
};
