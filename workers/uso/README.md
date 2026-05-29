# Worker de uso en vivo — `centro-costos-uso`

Expone `GET /api/uso` con el **costo del mes actual** por servicio, leído de las
APIs de cada proveedor. El frontend (Centro de Costos) lo consume y reemplaza la
estimación por el dato real donde haya credenciales.

## Secrets (cada uno opcional; si falta, ese proveedor se omite)

| Secret | Para |
| --- | --- |
| `ANTHROPIC_ADMIN_KEY` | Cost report de Anthropic (clave **Admin**, `sk-ant-admin…`) |
| `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` | Usage records de Twilio |
| `CF_API_TOKEN` + `CF_ACCOUNT_ID` | Almacenamiento R2 vía GraphQL Analytics |
| `ALLOW_ORIGIN` | (opcional) origen permitido para CORS; por defecto `*` |

```bash
cd workers/uso
npm install
npx wrangler secret put ANTHROPIC_ADMIN_KEY
npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_AUTH_TOKEN
npx wrangler secret put CF_API_TOKEN
npx wrangler secret put CF_ACCOUNT_ID   # 12f212a7c813ec3aef9e1d873e19f43e
npm run deploy
```

Luego, en el frontend, define `NEXT_PUBLIC_USO_URL` con la URL del Worker
(p. ej. `https://centro-costos-uso.<sub>.workers.dev`) y vuelve a desplegar.

## Respuesta

```json
{
  "generadoEn": "2026-05-29T12:00:00.000Z",
  "periodo": "mes-actual",
  "costos": { "anthropic": 12.34, "twilio": 0.45, "cf-r2": 0 },
  "parciales": ["anthropic", "twilio"],
  "errores": []
}
```

`costos` está en USD del mes en curso, con claves = id de servicio del frontend
(`anthropic`, `twilio`, `cf-r2`).

> Las APIs de uso varían por proveedor; este Worker es **best-effort** y no se ha
> ejecutado contra cuentas reales todavía. Ajusta las consultas si el esquema
> difiere. Gemini y Resend no exponen una API de uso simple → se quedan en
> estimación.
