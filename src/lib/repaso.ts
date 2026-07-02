/**
 * Repaso espaciado (sistema Leitner) en localStorage — cliente.
 *
 * Cada carta vive en una de 5 cajas. Acertar la sube una caja (se repasa menos
 * seguido); fallar la manda a la caja 1 (se repasa a diario). Las funciones de
 * transición son puras (reciben "hoy") para poder testearlas.
 */

export const CLAVE_REPASO = "curso-arte:repaso";

// Días entre repasos según la caja (1→a diario … 5→cada 16 días).
export const INTERVALOS = [1, 2, 4, 8, 16];

export interface EstadoCarta {
  box: number; // 1..5
  next: string; // fecha ISO (YYYY-MM-DD) del próximo repaso
}

export type EstadoRepaso = Record<string, EstadoCarta>;

/** Fecha de hoy en formato YYYY-MM-DD (local). */
export function hoy(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Una carta está vencida si nunca se vio o si ya llegó su fecha. */
export function estaVencida(estado: EstadoCarta | undefined, dia: string): boolean {
  return !estado || estado.next <= dia;
}

/** Acierto: sube de caja (máx. 5) y reprograma según el nuevo intervalo. */
export function promover(estado: EstadoCarta | undefined, dia: string): EstadoCarta {
  const box = Math.min(5, (estado?.box ?? 0) + 1);
  return { box, next: sumarDias(dia, INTERVALOS[box - 1]) };
}

/** Fallo: vuelve a la caja 1 (repaso mañana). */
export function degradar(dia: string): EstadoCarta {
  return { box: 1, next: sumarDias(dia, INTERVALOS[0]) };
}

// --- Persistencia (cliente) -------------------------------------------------

export function leerRepaso(): EstadoRepaso {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CLAVE_REPASO);
    return raw ? (JSON.parse(raw) as EstadoRepaso) : {};
  } catch {
    return {};
  }
}

export function guardarRepaso(estado: EstadoRepaso) {
  try {
    window.localStorage.setItem(CLAVE_REPASO, JSON.stringify(estado));
  } catch {
    /* almacenamiento no disponible */
  }
}
