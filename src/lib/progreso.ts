/**
 * Progreso del estudiante en localStorage (cliente).
 *
 * Esquema v2, versionado y migrable. Sustituye al array plano v1 que guardaba
 * solo las lecciones completadas: ahora también fechas, puntuaciones de
 * cuestionario y la última lección visitada (para "continuar donde lo dejaste"),
 * más export/import como único seguro contra el borrado de localStorage.
 *
 * Compatibilidad: se mantiene la MISMA clave y el MISMO evento que v1
 * ("curso-arte:progreso") para que los componentes existentes sigan reaccionando.
 */

export const CLAVE = "curso-arte:progreso";
export const EVENTO = "curso-arte:progreso";

export interface QuizResultado {
  mejor: number; // aciertos de la mejor tanda
  total: number; // nº de preguntas
  hechoEn: string; // ISO de la última vez que se hizo
}

export interface Estado {
  v: 2;
  lecciones: Record<string, { completadaEn: string }>; // id = `${moduloId}/${slug}`
  quiz: Record<string, QuizResultado>; // clave = moduloId
  ultima?: { moduloId: string; slug: string; ts: string };
}

function vacio(): Estado {
  return { v: 2, lecciones: {}, quiz: {} };
}

/** Lee el estado migrando desde v1 (array plano) si hace falta. */
export function leer(): Estado {
  if (typeof window === "undefined") return vacio();
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(CLAVE);
  } catch {
    return vacio();
  }
  if (!raw) return vacio();
  try {
    const dato = JSON.parse(raw);
    if (Array.isArray(dato)) {
      // v1: ["moduloId/slug", …] → v2
      const e = vacio();
      for (const id of dato) if (typeof id === "string") e.lecciones[id] = { completadaEn: "" };
      return e;
    }
    if (dato && dato.v === 2) {
      return {
        v: 2,
        lecciones: dato.lecciones ?? {},
        quiz: dato.quiz ?? {},
        ultima: dato.ultima,
      };
    }
  } catch {
    /* corrupto → empezamos limpio, sin perder por lanzar */
  }
  return vacio();
}

function guardar(e: Estado) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(e));
    window.dispatchEvent(new Event(EVENTO));
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Borra TODO el progreso local (lecciones, quizzes, repaso). Irreversible. */
export function borrar() {
  try {
    window.localStorage.removeItem(CLAVE);
    window.dispatchEvent(new Event(EVENTO));
  } catch {
    /* almacenamiento no disponible */
  }
}

// --- Lecciones --------------------------------------------------------------

export function estaCompletada(id: string): boolean {
  return id in leer().lecciones;
}

/** Alterna una lección; devuelve el nuevo estado (true = completada). */
export function alternarLeccion(id: string): boolean {
  const e = leer();
  if (e.lecciones[id]) {
    delete e.lecciones[id];
    guardar(e);
    return false;
  }
  e.lecciones[id] = { completadaEn: new Date().toISOString() };
  guardar(e);
  return true;
}

export function contarCompletadas(ids?: string[]): number {
  const e = leer();
  if (!ids) return Object.keys(e.lecciones).length;
  return ids.filter((id) => id in e.lecciones).length;
}

// --- Cuestionarios ----------------------------------------------------------

export function getQuiz(moduloId: string): QuizResultado | null {
  return leer().quiz[moduloId] ?? null;
}

/** Guarda el resultado quedándose con la mejor puntuación. */
export function guardarQuiz(moduloId: string, aciertos: number, total: number) {
  const e = leer();
  const prev = e.quiz[moduloId];
  const mejor = prev ? Math.max(prev.mejor, aciertos) : aciertos;
  e.quiz[moduloId] = { mejor, total, hechoEn: new Date().toISOString() };
  guardar(e);
}

// --- Última visita ("continuar donde lo dejaste") ---------------------------

export function registrarVisita(moduloId: string, slug: string) {
  const e = leer();
  const ts = new Date().toISOString();
  if (e.ultima && e.ultima.moduloId === moduloId && e.ultima.slug === slug) return; // sin cambios
  e.ultima = { moduloId, slug, ts };
  guardar(e);
}

export function getUltima(): Estado["ultima"] {
  return leer().ultima;
}

// --- Export / import --------------------------------------------------------

export function exportar(): string {
  return JSON.stringify(leer(), null, 2);
}

/** Importa un JSON de progreso. Devuelve true si se aplicó. */
export function importar(texto: string): boolean {
  try {
    const dato = JSON.parse(texto);
    if (!dato || dato.v !== 2 || typeof dato.lecciones !== "object") return false;
    const e: Estado = {
      v: 2,
      lecciones: dato.lecciones ?? {},
      quiz: dato.quiz ?? {},
      ultima: dato.ultima,
    };
    guardar(e);
    return true;
  } catch {
    return false;
  }
}

// --- Suscripción (mismo evento + storage entre pestañas) --------------------

export function suscribir(cb: () => void): () => void {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}
