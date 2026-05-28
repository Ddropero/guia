"use client";

import { useMemo, useState } from "react";
import { SERVICIOS } from "@/data/servicios";
import { PRECIOS } from "@/data/precios";
import { SUPUESTOS_DEFAULT } from "@/data/supuestos";
import { calcularTodo } from "@/lib/calc";
import { fmtUSD, fmtCOP } from "@/lib/format";
import type { Supuestos } from "@/data/tipos";

const COLOR_CAT: Record<string, string> = {
  IA: "var(--color-accent)",
  Infraestructura: "var(--color-info)",
  Hosting: "var(--color-accent2)",
  Mensajería: "#c0a0f0",
  Email: "var(--color-warn)",
  Productividad: "#a0f0d0",
  Dominio: "var(--color-muted)",
};

export default function Dashboard() {
  const [sup, setSup] = useState<Supuestos>(SUPUESTOS_DEFAULT);
  const r = useMemo(() => calcularTodo(SERVICIOS, sup, PRECIOS), [sup]);

  const set = <K extends keyof Supuestos,>(k: K, v: Supuestos[K]) =>
    setSup((s) => ({ ...s, [k]: v }));

  const cop = (usd: number) => fmtCOP(usd * sup.fxCOPporUSD);

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Centro de Costos
          </h1>
          <p className="mt-1 text-sm text-muted">
            Cuánto cuesta mantener andando tus plataformas y APIs ·{" "}
            {r.desglose.length} servicios
          </p>
        </div>
        <div className="text-right">
          <div className="font-serif text-4xl font-semibold text-accent sm:text-5xl">
            {fmtUSD(r.total)}
            <span className="ml-1 text-base font-normal text-muted">/mes</span>
          </div>
          <div className="text-sm text-muted">
            {cop(r.total)} COP · {fmtUSD(r.totalAnual)}/año
          </div>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total / mes" value={fmtUSD(r.total)} sub={`${cop(r.total)} COP`} accent />
        <Stat label="Costo fijo" value={fmtUSD(r.totalFijo)} sub="suscripciones" />
        <Stat label="Costo por uso" value={fmtUSD(r.totalUso)} sub="IA, mensajes…" />
        <Stat
          label="Proyección anual"
          value={fmtUSD(r.totalAnual)}
          sub={`${cop(r.totalAnual)} COP`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="order-2 lg:order-1">
          <h2 className="mb-3 font-serif text-lg text-fg">Desglose por servicio</h2>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead className="bg-panel2 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-normal">Servicio</th>
                  <th className="px-3 py-2 text-right font-normal">Fijo</th>
                  <th className="px-3 py-2 text-right font-normal">Uso</th>
                  <th className="px-3 py-2 text-right font-normal">Total/mes</th>
                </tr>
              </thead>
              <tbody>
                {r.desglose.map((d) => (
                  <tr key={d.servicio.id} className="border-t border-line">
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ background: COLOR_CAT[d.servicio.categoria] }}
                        />
                        <span className="text-fg">{d.servicio.nombre}</span>
                        {d.servicio.tokenEnv && (
                          <code className="rounded bg-panel2 px-1.5 py-0.5 text-[10px] text-muted">
                            {d.servicio.tokenEnv}
                          </code>
                        )}
                      </div>
                      <div className="mt-0.5 pl-4 text-xs text-muted">{d.detalle}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-muted">
                      {d.fijoUSD ? fmtUSD(d.fijoUSD) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-muted">
                      {d.usoUSD ? fmtUSD(d.usoUSD) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      {d.totalUSD ? (
                        <span className="text-fg">{fmtUSD(d.totalUSD)}</span>
                      ) : (
                        <span className="text-accent">gratis</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line bg-panel2">
                  <td className="px-3 py-2.5 text-muted">Total</td>
                  <td className="px-3 py-2.5 text-right text-muted">{fmtUSD(r.totalFijo)}</td>
                  <td className="px-3 py-2.5 text-right text-muted">{fmtUSD(r.totalUso)}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-accent">
                    {fmtUSD(r.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <h2 className="mb-3 mt-6 font-serif text-lg text-fg">Por categoría</h2>
          <div className="space-y-2">
            {r.porCategoria.map(([cat, val]) => (
              <div key={cat} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-xs text-muted">{cat}</div>
                <div className="h-2 flex-1 overflow-hidden rounded bg-panel2">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${r.total ? (val / r.total) * 100 : 0}%`,
                      background: COLOR_CAT[cat],
                    }}
                  />
                </div>
                <div className="w-20 shrink-0 whitespace-nowrap text-right text-xs text-fg">
                  {fmtUSD(val)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="order-1 lg:order-2">
          <div className="rounded-lg border border-line bg-panel p-4 lg:sticky lg:top-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg text-fg">Supuestos</h2>
              <button
                onClick={() => setSup(SUPUESTOS_DEFAULT)}
                className="text-xs text-muted transition-colors hover:text-fg"
              >
                ↺ reset
              </button>
            </div>
            <div className="space-y-4">
              <Range
                label="Facturas OCR / mes"
                value={sup.facturasPorMes}
                min={0}
                max={200}
                onChange={(v) => set("facturasPorMes", v)}
              />
              <Range
                label="% resuelto por Gemini"
                value={Math.round(sup.porcentajeGemini * 100)}
                min={0}
                max={100}
                suffix="%"
                onChange={(v) => set("porcentajeGemini", v / 100)}
              />
              <Range
                label="Análisis IA / mes"
                value={sup.analisisPorMes}
                min={0}
                max={30}
                onChange={(v) => set("analisisPorMes", v)}
              />
              <Range
                label="WhatsApp conv. / mes"
                value={sup.conversacionesWhatsappPorMes}
                min={0}
                max={300}
                onChange={(v) => set("conversacionesWhatsappPorMes", v)}
              />
              <Range
                label="Correos / mes"
                value={sup.emailsPorMes}
                min={0}
                max={5000}
                step={50}
                onChange={(v) => set("emailsPorMes", v)}
              />
              <Range
                label="Almacenamiento R2 (GB)"
                value={sup.almacenamientoR2GB}
                min={0}
                max={50}
                onChange={(v) => set("almacenamientoR2GB", v)}
              />

              <Toggle
                label="Vercel"
                off="Hobby"
                on="Pro"
                value={sup.planVercel === "pro"}
                onChange={(v) => set("planVercel", v ? "pro" : "hobby")}
              />
              <Toggle
                label="Resend"
                off="Free"
                on="Pro"
                value={sup.planResend === "pro"}
                onChange={(v) => set("planResend", v ? "pro" : "free")}
              />
              <Toggle
                label="Notion"
                off="Free"
                on="Plus"
                value={sup.planNotion === "plus"}
                onChange={(v) => set("planNotion", v ? "plus" : "free")}
              />

              <label className="block">
                <span className="text-xs text-muted">Tasa COP / USD</span>
                <input
                  type="number"
                  value={sup.fxCOPporUSD}
                  onChange={(e) => set("fxCOPporUSD", Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded border border-line bg-bg px-2 py-1 text-sm text-fg outline-none focus:border-accent"
                />
              </label>
            </div>
            <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
              Precios de referencia ({PRECIOS.actualizado}), aproximados. Edita las
              tarifas en{" "}
              <code className="text-fg">src/data/precios.ts</code>.
            </p>
          </div>
        </aside>
      </div>

      <footer className="mt-10 border-t border-line pt-4 text-xs leading-relaxed text-muted">
        Estimación basada en supuestos editables, no en facturación en vivo. Para
        conectar el uso real (Anthropic, Cloudflare, etc.), configura keys de
        solo-lectura como variables de entorno en Vercel. Ningún valor de token se
        guarda en este repositorio.
      </footer>
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 font-serif text-2xl ${accent ? "text-accent" : "text-fg"}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        <span className="text-xs text-fg">
          {value}
          {suffix ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full"
      />
    </label>
  );
}

function Toggle({
  label,
  off,
  on,
  value,
  onChange,
}: {
  label: string;
  off: string;
  on: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex overflow-hidden rounded border border-line text-xs">
        <button
          onClick={() => onChange(false)}
          className={`px-2.5 py-1 transition-colors ${!value ? "bg-accent text-bg" : "bg-bg text-muted"}`}
        >
          {off}
        </button>
        <button
          onClick={() => onChange(true)}
          className={`px-2.5 py-1 transition-colors ${value ? "bg-accent text-bg" : "bg-bg text-muted"}`}
        >
          {on}
        </button>
      </div>
    </div>
  );
}
