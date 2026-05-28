# Centro de Costos · Infraestructura & APIs

App web (Next.js + Vercel) que muestra **cuánto cuesta mantener andando** las
plataformas y APIs que sostienen los sistemas de gastos (COCICP, Flota) y lo
personal: IA (Claude, Gemini), Cloudflare (Workers, D1, R2, Pages), Vercel,
Twilio/WhatsApp, Telegram, Resend, Notion, Google y el dominio.

No es facturación en vivo: es un **modelo de costos con supuestos editables**,
sembrado con el uso real observado (~30 facturas/mes). Ajustas los supuestos y
ves el total mensual y anual al instante, en USD y en COP.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de producción
```

## Estructura

| Archivo | Qué contiene |
| --- | --- |
| `src/data/servicios.ts` | Catálogo de plataformas/APIs (con el **nombre** de cada token, nunca el valor). |
| `src/data/precios.ts` | Tarifas de referencia de cada proveedor. **Edita aquí los precios.** |
| `src/data/supuestos.ts` | Supuestos por defecto (facturas/mes, % Gemini, planes, tasa COP/USD…). |
| `src/lib/calc.ts` | Cálculo de costo fijo + por uso de cada servicio. |
| `src/components/Dashboard.tsx` | UI interactiva (tabla, totales, controles de supuestos). |

## Ajustar costos

- **Precios** de los proveedores → `src/data/precios.ts`.
- **Supuestos de uso** por defecto → `src/data/supuestos.ts` (o muévelos en vivo desde la UI).
- **Agregar/quitar un servicio** → `src/data/servicios.ts` y, si tiene tarifa
  propia, un `case` en `costoDe()` dentro de `src/lib/calc.ts`.

> ⚠️ Los precios son **aproximados** (referencia `2026-05`). Verifícalos en la
> consola de cada proveedor.

## Conectar el uso/facturación en vivo (siguiente paso)

Para reemplazar las estimaciones por consumo real, configurar keys de
**solo-lectura** como variables de entorno en Vercel (Settings → Environment
Variables) y consultar las APIs de uso/billing de cada proveedor (Anthropic
Admin/Usage, Cloudflare GraphQL Analytics, Twilio Usage, Resend, etc.).

**Ningún valor de token/secret se guarda en este repositorio.** Solo se listan
los nombres de las variables para saber qué servicios se facturan.

## Deploy en Vercel

Importar el repo en Vercel; detecta Next.js automáticamente. No requiere
variables de entorno para la versión de estimación.
