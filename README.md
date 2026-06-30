# Centro de Costos · Infraestructura & APIs

App web (Next.js, desplegada en Cloudflare) que muestra **cuánto cuesta mantener
andando** las plataformas y APIs que sostienen los sistemas de gastos (COCICP,
Flota) y lo personal: IA (Claude, Gemini), Cloudflare (Workers, D1, R2, KV,
Pages), Twilio/WhatsApp, Telegram, Resend, Notion, Google y el dominio.

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

## Uso/facturación en vivo

Implementado en [`workers/uso/`](workers/uso/README.md) (Worker
`centro-costos-uso`, endpoint `/api/uso`): lee el costo real del mes de
**Anthropic, Twilio y R2**. Pasos:

1. Despliega el Worker con sus secrets (ver `workers/uso/README.md`).
2. Define `NEXT_PUBLIC_USO_URL` = URL del Worker y vuelve a build + deploy del
   frontend.

El dashboard mostrará **"en vivo"** en los servicios con dato real y
**"estimado"** en el resto (fallback automático si el Worker no responde).

**Ningún valor de token/secret se guarda en este repositorio** — solo los nombres.

## Deploy en Cloudflare (Workers Static Assets)

La app es 100% estática (`output: "export"` → carpeta `out/`), así que se sirve
como sitio estático en Cloudflare Workers. Config en `wrangler.jsonc`.

```bash
npm run preview:cf   # build + wrangler dev (local)
npm run deploy:cf    # build + wrangler deploy
```

El `deploy` necesita credenciales de Cloudflare (NO van en el repo):

```bash
export CLOUDFLARE_API_TOKEN=...   # token con permiso "Workers Scripts: Edit"
export CLOUDFLARE_ACCOUNT_ID=12f212a7c813ec3aef9e1d873e19f43e
npm run deploy:cf
```

> **Uso en vivo:** lo natural en tu stack (que ya tiene ~27 Workers) es un Worker
> aparte que exponga el consumo/facturación de cada proveedor y que este frontend
> consuma — así las keys nunca salen al cliente.

---

## Curso de Historia del Arte (con tutor de IA)

Sección aparte del dashboard: un **curso completo de Historia del Arte** (13
módulos, ~80 lecciones, de la prehistoria al arte digital) con un **tutor de IA**
interactivo. Vive en `/curso` y no afecta al Centro de Costos.

| Pieza | Qué contiene |
| --- | --- |
| `curso-historia-del-arte/` | Contenido del curso en Markdown (lecciones, guías y materiales de referencia: glosario, línea de tiempo, índices, banco de evaluación). |
| `src/lib/curso.ts` | Carga el Markdown en build y lo renderiza a HTML (con `marked`). |
| `src/app/curso/` | Rutas estáticas: índice, módulo, lección (con tutor) y recursos. |
| `src/components/TutorPanel.tsx` | Chat del tutor: modos **Dudas**, **Mirar una obra** (socrático) y **Ponme a prueba** (quiz). |
| `src/components/Progreso.tsx` | Progreso del estudiante en `localStorage` (sin backend). |
| `workers/tutor/` | Worker `curso-arte-tutor` que llama a la API de Claude en streaming (la key es un secret). |

El contenido se renderiza en build (la app sigue siendo estática). El tutor es lo
único dinámico y va por el Worker.

### Activar el tutor de IA

1. Despliega el Worker con su secret (ver [`workers/tutor/README.md`](workers/tutor/README.md)):
   ```bash
   cd workers/tutor && npm install
   npx wrangler secret put ANTHROPIC_API_KEY
   npm run deploy
   ```
2. Define `NEXT_PUBLIC_TUTOR_URL` = URL del Worker y vuelve a `npm run build`.

Si `NEXT_PUBLIC_TUTOR_URL` no está definida, el curso funciona igual (lectura,
progreso, navegación) y el panel del tutor muestra un aviso de configuración.

> **Modelo por tarea (híbrido):** Claude **Haiku 4.5** para chat y cuestionarios
> (rápido y barato), Claude **Sonnet 5** para el análisis socrático de obras.
> Ningún valor de key se guarda en el repositorio — solo su nombre.
