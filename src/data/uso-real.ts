/**
 * Snapshot de uso REAL leído desde las bases D1 de Cloudflare (vía API).
 * Se usa para sembrar los supuestos con cifras reales en vez de inventadas.
 */
export interface UsoReal {
  capturadoEn: string;
  gastosCocicp: number;
  gastosFlota: number;
  gastosTotales: number;
  desde: string;
  mesesActivos: number;
  totalCOP: number;
  /** Facturas/mes derivado: gastosTotales / mesesActivos. */
  facturasPorMesEstimado: number;
}

export const USO_REAL: UsoReal = {
  capturadoEn: "2026-05-29",
  gastosCocicp: 162,
  gastosFlota: 1,
  gastosTotales: 163,
  desde: "2025-12-28",
  mesesActivos: 5,
  totalCOP: 530_392_703,
  facturasPorMesEstimado: 33,
};
