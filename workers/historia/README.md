# historia.hilvan.org · sitio del Curso de Historia del Arte

Despliega el curso en su **dominio propio**, con la raíz redirigida a `/curso`.
Es un Worker de Cloudflare con **Static Assets** (sirve la exportación estática
`out/`) más una redirección mínima `/ → /curso`. Es independiente del Worker del
dashboard de costos (`centro-de-costos`); comparten el mismo build `out/`.

## Prerrequisitos

1. **`hilvan.org` debe ser una zona** en esta cuenta de Cloudflare (account_id
   `12f212a7c813ec3aef9e1d873e19f43e`, ya puesto en `wrangler.historia.jsonc`).
2. **`CLOUDFLARE_API_TOKEN`** en el entorno, con permisos:
   - Cuenta → **Workers Scripts: Edit**
   - Zona `hilvan.org` → **Workers Routes: Edit**, **DNS: Edit**, **Zone: Read**
   (los tres últimos son necesarios para que wrangler cree el *custom domain* y
   su registro DNS automáticamente).
3. Salida de red hacia `api.cloudflare.com` habilitada.

## Desplegar

Desde la **raíz del repo**:

```bash
npm run deploy:historia
# = next build && wrangler deploy -c wrangler.historia.jsonc
```

wrangler compila el sitio, sube el Worker + los assets y **crea el dominio
`historia.hilvan.org`** (con su registro DNS) apuntando al Worker. La primera vez
puede tardar un minuto en propagar el certificado TLS.

## Cómo funciona la raíz

`run_worker_first: true` hace que el Worker (`src/index.ts`) vea todas las rutas:
- `/` y `/index.html` → **302 a `/curso`**.
- Cualquier otra ruta → `env.ASSETS.fetch(request)` (servido estático normal,
  incluido el manejo `.html`, p. ej. `/curso` → `curso.html`).

> El tutor de IA sigue siendo el Worker aparte `workers/tutor` (`NEXT_PUBLIC_TUTOR_URL`).
> Ningún valor de token se guarda en el repositorio.
