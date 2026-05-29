"use client";

import { useEffect, useMemo, useState } from "react";
import { SERVICIOS } from "@/data/servicios";
import { PRECIOS } from "@/data/precios";
import { SUPUESTOS_DEFAULT } from "@/data/supuestos";
import { calcularTodo } from "@/lib/calc";
import { fmtUSD, fmtCOP } from "@/lib/format";
import { CLOUDFLARE } from "@/data/cloudflare";
import { USO_REAL } from "@/data/uso-real";
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
  const live = useUsoEnVivo();
  const r = useMemo(
    () => calcularTodo(SERVICIOS, sup, PRECIOS, live.costos),
    [sup, live.costos],
  );

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
          <FuenteBadge enVivo={!!live.costos} generadoEn={live.generadoEn} />
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

      <section className="mb-8 rounded-lg border border-line bg-panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-lg text-fg">Tu Cloudflare</h2>
          <span className="text-xs text-muted">
            {CLOUDFLARE.cuenta} · snapshot {CLOUDFLARE.capturadoEn}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CFNum
            n={CLOUDFLARE.workers}
            label="Workers"
            sub={CLOUDFLARE.planWorkers === "paid" ? "plan Paid" : "plan Free"}
          />
          <CFNum
            n={CLOUDFLARE.d1Bases}
            label="Bases D1"
            sub={`~${(CLOUDFLARE.d1TotalBytes / 1048576).toFixed(1)} MB`}
          />
          <CFNum n={CLOUDFLARE.r2Buckets} label="Buckets R2" sub="10 GB gratis" />
          <CFNum n={CLOUDFLARE.kvNamespaces} label="KV namespaces" sub="capa gratis" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CLOUDFLARE.grupos.map((g) => (
            <span
              key={g.area}
              className="rounded-full border border-line px-2.5 py-1 text-xs text-muted"
            >
              {g.area} <span className="text-fg">{g.workers.length}</span>
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Una sola cuenta corre toda tu operación. El plan Workers Paid se cobra por
          cuenta ($5/mes) y cubre los {CLOUDFLARE.workers} Workers; D1 y KV están en
          capa gratis. El costo variable real está en el uso de IA repartido entre
          estos Workers.
        </p>
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
                        {d.enVivo && (
                          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">
                            en vivo
                          </span>
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
                label="Mensajes WhatsApp / mes"
                value={sup.mensajesWhatsappPorMes}
                min={0}
                max={500}
                onChange={(v) => set("mensajesWhatsappPorMes", v)}
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
                label="Cloudflare Workers"
                off="Free"
                on="Paid"
                value={sup.cloudflareWorkersPaid}
                onChange={(v) => set("cloudflareWorkersPaid", v)}
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
              Facturas sembradas con tus datos reales de D1 ({USO_REAL.gastosTotales}{" "}
              gastos · ~{USO_REAL.mesesActivos} meses · ≈
              {USO_REAL.facturasPorMesEstimado}/mes). Precios de referencia (
              {PRECIOS.actualizado}), aproximados; edítalos en{" "}
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

function useUsoEnVivo() {
  const [estado, setEstado] = useState<{
    costos: Record<string, number> | null;
    generadoEn?: string;
  }>({ costos: null });

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_USO_URL;
    if (!base) return;
    const ctrl = new AbortController();
    fetch(`${base.replace(/\/$/, "")}/api/uso`, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (d && d.costos) setEstado({ costos: d.costos, generadoEn: d.generadoEn });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  return estado;
}

function FuenteBadge({
  enVivo,
  generadoEn,
}: {
  enVivo: boolean;
  generadoEn?: string;
}) {
  return (
    <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: enVivo ? "var(--color-accent)" : "var(--color-muted)" }}
      />
      {enVivo
        ? `en vivo${generadoEn ? ` · ${generadoEn.slice(0, 10)}` : ""}`
        : "estimado (sin Worker de uso)"}
    </span>
  );
}

function CFNum({ n, label, sub }: { n: number; label: string; sub: string }) {
  return (
    <div className="rounded border border-line bg-panel2 p-3 text-center">
      <div className="font-serif text-2xl text-info">{n}</div>
      <div className="text-xs text-fg">{label}</div>
      <div className="text-[11px] text-muted">{sub}</div>
    </div>
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
