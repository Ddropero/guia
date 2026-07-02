"use client";

/**
 * Certificado de finalización del curso (cliente).
 *
 * HONESTO por diseño: se etiqueta siempre como AUTOEVALUADO, porque el progreso
 * vive en el localStorage del propio estudiante (ver src/lib/progreso.ts) y no hay
 * validación externa. Solo se activa cuando TODAS las lecciones están completadas.
 *
 * El certificado se dibuja en un <canvas> 2D nativo (sin librerías) y se descarga
 * como PNG. Los colores se leen de los tokens del tema (:root) y las tipografías
 * de sondas con las clases font-serif/font-mono, para no inventar valores.
 */

import { useEffect, useRef, useState } from "react";
import { contarCompletadas, suscribir } from "@/lib/progreso";

interface CertificadoProps {
  /** Total de lecciones del curso; sirve para saber cuándo está completo. */
  total: number;
  /** Ids "${moduloId}/${slug}" de todas las lecciones. Si se pasan, solo se cuentan esas. */
  ids?: string[];
  /** Título del curso a imprimir en el certificado. */
  tituloCurso?: string;
}

// Dimensiones lógicas del lienzo; se dibuja al doble para nitidez en el PNG.
const ANCHO = 1200;
const ALTO = 848;
const ESCALA = 2;

/** Reduce el tamaño de fuente hasta que el texto quepa en maxAncho. */
function ajustar(
  ctx: CanvasRenderingContext2D,
  texto: string,
  peso: number,
  tamMax: number,
  familia: string,
  maxAncho: number,
): number {
  let tam = tamMax;
  while (tam > 14) {
    ctx.font = `${peso} ${tam}px ${familia}`;
    if (ctx.measureText(texto).width <= maxAncho) break;
    tam -= 2;
  }
  return tam;
}

export default function Certificado({
  total,
  ids,
  tituloCurso = "Historia del Arte",
}: CertificadoProps) {
  const [listo, setListo] = useState(false);
  const [hechas, setHechas] = useState(0);
  const [nombre, setNombre] = useState("");
  const [anio, setAnio] = useState("");
  const [generado, setGenerado] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const serifRef = useRef<HTMLSpanElement>(null);
  const monoRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const recalcular = () => {
      setHechas(ids && ids.length ? contarCompletadas(ids) : contarCompletadas());
      setListo(true);
    };
    recalcular();
    return suscribir(recalcular);
  }, [ids]);

  // Guarda contra SSR: nada hasta montar en cliente.
  if (!listo || total === 0) return null;

  const completo = hechas >= total;
  const faltan = Math.max(0, total - hechas);
  const pct = Math.min(100, Math.round((hechas / total) * 100));
  const nombreLimpio = nombre.trim().replace(/\s+/g, " ").slice(0, 60);

  function dibujar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = ANCHO * ESCALA;
    canvas.height = ALTO * ESCALA;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ESCALA, ESCALA);

    // Tokens del tema (con respaldo por si no se leen).
    const raiz = getComputedStyle(document.documentElement);
    const tok = (n: string, fb: string) => raiz.getPropertyValue(n).trim() || fb;
    const cBg = tok("--color-bg", "#0a0b0a");
    const cPanel = tok("--color-panel", "#121512");
    const cLine = tok("--color-line", "#242a24");
    const cFg = tok("--color-fg", "#e9ece8");
    const cMuted = tok("--color-muted", "#8b938b");
    const cAccent = tok("--color-accent", "#b8f0a0");
    const cAccent2 = tok("--color-accent2", "#f0e0a0");

    const serif = serifRef.current
      ? getComputedStyle(serifRef.current).fontFamily
      : "Georgia, serif";
    const mono = monoRef.current
      ? getComputedStyle(monoRef.current).fontFamily
      : "monospace";

    // Fondo y marcos.
    ctx.fillStyle = cBg;
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.fillStyle = cPanel;
    ctx.fillRect(40, 40, ANCHO - 80, ALTO - 80);
    ctx.strokeStyle = cAccent;
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, ANCHO - 80, ALTO - 80);
    ctx.strokeStyle = cLine;
    ctx.lineWidth = 1;
    ctx.strokeRect(64, 64, ANCHO - 128, ALTO - 128);

    const cx = ANCHO / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const espaciado = (s: string) => s.split("").join(" "); // "letter-spacing" manual

    // Antetítulo.
    ctx.fillStyle = cAccent;
    ctx.font = `500 20px ${mono}`;
    ctx.fillText(espaciado("CERTIFICADO"), cx, 160);

    // Título del curso.
    ctx.fillStyle = cFg;
    const tamT = ajustar(ctx, tituloCurso, 600, 76, serif, ANCHO - 260);
    ctx.font = `600 ${tamT}px ${serif}`;
    ctx.fillText(tituloCurso, cx, 265);

    // Subtítulo honesto (etiqueta clave).
    ctx.fillStyle = cAccent2;
    ctx.font = `italic 500 28px ${serif}`;
    ctx.fillText("Certificado de finalización autoevaluado", cx, 320);

    // "Se otorga a".
    ctx.fillStyle = cMuted;
    ctx.font = `400 16px ${mono}`;
    ctx.fillText(espaciado("SE OTORGA A"), cx, 410);

    // Nombre del estudiante + subrayado.
    const nombreMostrar = nombreLimpio || "—";
    ctx.fillStyle = cFg;
    const tamN = ajustar(ctx, nombreMostrar, 600, 60, serif, ANCHO - 300);
    ctx.font = `600 ${tamN}px ${serif}`;
    ctx.fillText(nombreMostrar, cx, 480);
    const anchoLinea = Math.min(
      ANCHO - 300,
      Math.max(260, ctx.measureText(nombreMostrar).width + 80),
    );
    ctx.strokeStyle = cLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - anchoLinea / 2, 502);
    ctx.lineTo(cx + anchoLinea / 2, 502);
    ctx.stroke();

    // Cuerpo.
    ctx.fillStyle = cMuted;
    ctx.font = `400 22px ${serif}`;
    const lecciones = total === 1 ? "la lección" : `las ${total} lecciones`;
    ctx.fillText(`por haber completado ${lecciones} del curso.`, cx, 562);

    // Año opcional.
    const anioLimpio = anio.replace(/\D/g, "").slice(0, 4);
    if (anioLimpio) {
      ctx.fillStyle = cMuted;
      ctx.font = `400 16px ${mono}`;
      ctx.fillText(espaciado(`AÑO ${anioLimpio}`), cx, 616);
    }

    // Pie honesto.
    ctx.fillStyle = cMuted;
    ctx.font = `400 14px ${mono}`;
    ctx.fillText(
      "Autoevaluación del estudiante · sin validación externa · no es una acreditación oficial",
      cx,
      ALTO - 92,
    );
  }

  async function generar() {
    if (!nombreLimpio) return;
    // Espera a que las tipografías estén cargadas para que el canvas no use el respaldo.
    try {
      await document.fonts.ready;
    } catch {
      /* sin fonts API: seguimos con los respaldos */
    }
    dibujar();
    setGenerado(true);
  }

  function descargar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "certificado-historia-del-arte.png";
    a.click();
  }

  if (!completo) {
    return (
      <div className="rounded-lg border border-line bg-panel p-6 opacity-70">
        <h3 className="font-serif text-lg text-fg">Certificado de finalización</h3>
        <p className="mt-2 text-sm text-muted">
          Completa las {total} lecciones para desbloquear tu certificado.{" "}
          {faltan === 1 ? "Te falta 1 lección." : `Te faltan ${faltan} lecciones.`}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-panel p-6">
      <h3 className="font-serif text-lg text-fg">Tu certificado está listo</h3>
      <p className="mt-1 text-sm text-muted">
        Has completado las {total} lecciones. Genera y descarga tu certificado{" "}
        <span className="text-accent2">autoevaluado</span>.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1">
          <span className="text-xs text-muted">Tu nombre</span>
          <input
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setGenerado(false);
            }}
            placeholder="Nombre y apellidos"
            maxLength={60}
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          />
        </label>
        <label className="w-24">
          <span className="text-xs text-muted">Año (opc.)</span>
          <input
            value={anio}
            onChange={(e) => {
              setAnio(e.target.value);
              setGenerado(false);
            }}
            inputMode="numeric"
            placeholder="2026"
            maxLength={4}
            className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
          />
        </label>
        <button
          onClick={generar}
          disabled={!nombreLimpio}
          className="rounded-md border border-accent bg-accent/10 px-4 py-2 text-sm text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Generar certificado
        </button>
      </div>

      <div className={generado ? "mt-5" : "hidden"}>
        <div className="overflow-x-auto rounded-md border border-line">
          <canvas ref={canvasRef} className="block h-auto w-full" />
        </div>
        <button
          onClick={descargar}
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-fg"
        >
          ⤓ Descargar PNG
        </button>
      </div>

      {/* Sondas ocultas para leer las tipografías reales del tema en el canvas. */}
      <span
        ref={serifRef}
        aria-hidden
        className="pointer-events-none absolute -z-10 font-serif opacity-0"
      >
        .
      </span>
      <span
        ref={monoRef}
        aria-hidden
        className="pointer-events-none absolute -z-10 font-mono opacity-0"
      >
        .
      </span>
    </div>
  );
}
