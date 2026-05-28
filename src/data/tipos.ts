export type Categoria =
  | "IA"
  | "Infraestructura"
  | "Hosting"
  | "Mensajería"
  | "Email"
  | "Productividad"
  | "Dominio";

export type Modelo = "fijo" | "uso" | "mixto" | "gratis";

export interface Servicio {
  id: string;
  nombre: string;
  categoria: Categoria;
  plataforma: string;
  modelo: Modelo;
  /** Nombre de la variable de entorno / token. Solo el nombre, nunca el valor. */
  tokenEnv: string | null;
  /** Descripción corta del plan o tarifa. */
  plan: string;
  /** URL de la consola de facturación del proveedor. */
  urlBilling: string;
  notas: string;
  activo: boolean;
}

export interface Supuestos {
  /** Tasa de cambio para mostrar el equivalente en pesos. */
  fxCOPporUSD: number;
  /** Facturas / comprobantes procesados por OCR cada mes. */
  facturasPorMes: number;
  /** Tokens de entrada estimados por factura (imagen + prompts de los agentes). */
  ocrTokensInPorFactura: number;
  /** Tokens de salida estimados por factura. */
  ocrTokensOutPorFactura: number;
  /** Porción del OCR resuelta por Gemini (0..1); el resto cae a Claude. */
  porcentajeGemini: number;
  /** Llamadas mensuales al análisis financiero con IA (/api/analisis-ia). */
  analisisPorMes: number;
  analisisTokensIn: number;
  analisisTokensOut: number;
  /** Conversaciones de WhatsApp (Twilio) al mes. */
  conversacionesWhatsappPorMes: number;
  /** Correos enviados al mes (Resend). */
  emailsPorMes: number;
  /** Almacenamiento usado en R2 (GB). */
  almacenamientoR2GB: number;
  planVercel: "hobby" | "pro";
  planResend: "free" | "pro";
  planNotion: "free" | "plus";
}

export interface Precios {
  /** Anthropic Claude (Sonnet), USD por millón de tokens. */
  claudeInPorM: number;
  claudeOutPorM: number;
  /** Google Gemini (Flash), USD por millón de tokens. */
  geminiInPorM: number;
  geminiOutPorM: number;
  /** Cloudflare Workers Paid, USD/mes (cubre toda la cuenta). */
  workersPaidMes: number;
  /** Cloudflare R2, USD por GB-mes y GB incluidos gratis. */
  r2PorGBMes: number;
  r2GBGratis: number;
  /** Twilio WhatsApp, USD por conversación (Meta + Twilio). */
  whatsappPorConversacion: number;
  /** Resend Pro USD/mes y correos gratis/mes. */
  resendProMes: number;
  resendGratisPorMes: number;
  /** Vercel Pro, USD/mes. */
  vercelProMes: number;
  /** Notion Plus, USD/mes por miembro. */
  notionPlusMes: number;
  /** Dominio .com, USD/año. */
  dominioAnual: number;
  /** Fecha de referencia de los precios (YYYY-MM). */
  actualizado: string;
}

export interface Desglose {
  servicio: Servicio;
  fijoUSD: number;
  usoUSD: number;
  totalUSD: number;
  detalle: string;
}
