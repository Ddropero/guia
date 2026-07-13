"use client";

import { useEffect, type RefObject } from "react";

const FOCOABLES =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Gestión de foco para diálogos modales (WCAG 2.4.3 / 2.1.2):
 *  - guarda el elemento con foco antes de abrir y lo restaura al cerrar;
 *  - enfoca el contenedor del diálogo al abrir (debe tener tabIndex={-1});
 *  - atrapa Tab/Shift+Tab dentro del diálogo mientras está abierto.
 *
 * Debe llamarse SIEMPRE (regla de hooks); `activo` controla si actúa.
 */
export function useFocoModal(activo: boolean, ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!activo) return;
    const previo = document.activeElement as HTMLElement | null;
    const cont = ref.current;
    cont?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !cont) return;
      const focoables = Array.from(cont.querySelectorAll<HTMLElement>(FOCOABLES)).filter(
        (el) => el.offsetParent !== null,
      );
      if (focoables.length === 0) {
        e.preventDefault();
        cont.focus();
        return;
      }
      const primero = focoables[0];
      const ultimo = focoables[focoables.length - 1];
      const actual = document.activeElement;
      if (e.shiftKey && (actual === primero || actual === cont)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && actual === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previo?.focus?.();
    };
  }, [activo, ref]);
}
