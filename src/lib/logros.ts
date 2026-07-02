/**
 * Cálculo de logros (insignias sobrias) del estudiante.
 *
 * `calcularLogros` es una función PURA y sin efectos: no lee localStorage, ni el
 * DOM, ni el filesystem. Recibe el estado de progreso (el que devuelve `leer()`
 * de progreso.ts) y la lista de módulos con las claves de sus lecciones, y
 * deriva qué hitos se han conseguido. Al ser pura, es trivial de testear y se
 * puede llamar tanto desde el cliente como desde los tests sin efectos.
 *
 * Los hitos se derivan SOLO de datos disponibles: lecciones completadas y la
 * mejor puntuación de cada cuestionario. No hay historial diario, así que no
 * hay rachas ni nada temporal.
 *
 * El import de `Estado` es SOLO de tipo (`import type`): se borra al compilar,
 * de modo que este módulo no arrastra ninguna dependencia de progreso.ts en
 * tiempo de ejecución.
 */
import type { Estado } from "@/lib/progreso";

/** Un módulo con las claves completas de sus lecciones (`${moduloId}/${slug}`). */
export interface ModuloLecciones {
  id: string;
  leccionIds: string[];
}

export interface Logro {
  id: string;
  titulo: string;
  descripcion: string;
  conseguido: boolean;
}

/** Fracción de aciertos (0..1) a partir de la cual un cuestionario es "notable". */
const PCT_NOTABLE = 0.8;

/** ¿Están todas las lecciones del módulo entre las completadas? */
function moduloCompleto(estado: Estado, modulo: ModuloLecciones): boolean {
  return modulo.leccionIds.length > 0 && modulo.leccionIds.every((id) => id in estado.lecciones);
}

/** Nº de módulos con todas sus lecciones completadas. */
function contarModulosCompletos(estado: Estado, modulos: ModuloLecciones[]): number {
  return modulos.filter((m) => moduloCompleto(estado, m)).length;
}

/** Mejor fracción (0..1) lograda en cualquier cuestionario; 0 si no hay ninguno. */
function mejorFraccionQuiz(estado: Estado): number {
  let mejor = 0;
  for (const q of Object.values(estado.quiz)) {
    if (q.total > 0) mejor = Math.max(mejor, q.mejor / q.total);
  }
  return mejor;
}

/** ¿Hay algún cuestionario resuelto sin fallo (mejor === total)? */
function hayQuizPerfecto(estado: Estado): boolean {
  return Object.values(estado.quiz).some((q) => q.total > 0 && q.mejor >= q.total);
}

/**
 * Deriva los logros del estudiante. Puro: mismas entradas → mismas salidas.
 * El total de lecciones del curso se obtiene sumando las de cada módulo, de modo
 * que no hace falta pasarlo aparte (evita que total y módulos se contradigan).
 */
export function calcularLogros(estado: Estado, modulos: ModuloLecciones[]): Logro[] {
  const todasIds = modulos.flatMap((m) => m.leccionIds);
  const totalLecciones = todasIds.length;
  const completas = todasIds.filter((id) => id in estado.lecciones).length;
  const nModulos = contarModulosCompletos(estado, modulos);
  const mejorQuiz = mejorFraccionQuiz(estado);

  return [
    {
      id: "primera-leccion",
      titulo: "Primeros pasos",
      descripcion: "Completa tu primera lección del curso.",
      conseguido: completas >= 1,
    },
    {
      id: "primer-modulo",
      titulo: "Primera sala",
      descripcion: "Recorre por completo un módulo, de principio a fin.",
      conseguido: nModulos >= 1,
    },
    {
      id: "cinco-modulos",
      titulo: "Cinco salas",
      descripcion: "Completa cinco módulos del recorrido.",
      conseguido: nModulos >= 5,
    },
    {
      id: "cuestionario-notable",
      titulo: "Ojo atento",
      descripcion: "Acierta al menos el 80 % de un cuestionario.",
      conseguido: mejorQuiz >= PCT_NOTABLE,
    },
    {
      id: "cuestionario-perfecto",
      titulo: "Mirada impecable",
      descripcion: "Resuelve un cuestionario entero sin fallo alguno.",
      conseguido: hayQuizPerfecto(estado),
    },
    {
      id: "curso-completo",
      titulo: "Visita completa",
      descripcion: "Completa todas las lecciones del curso.",
      conseguido: totalLecciones > 0 && completas === totalLecciones,
    },
  ];
}
