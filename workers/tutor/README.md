# Tutor IA · Curso de Historia del Arte

Worker de Cloudflare que da vida al **tutor de IA** del curso. El frontend
estático (Next.js) lo llama; el Worker llama a la API de Claude con la key
guardada como **secret** (nunca sale al cliente).

- Endpoint: `POST /api/tutor`
- Cuerpo: `{ modo, leccion: { titulo, modulo, contexto }, messages: [...] }`
  - `modo`: `"chat"` | `"socratico"` | `"quiz"`
  - `messages`: historial `[{ role: "user"|"assistant", content }]`
- Respuesta: **streaming** de texto (`text/plain`), token a token.

## Modelo por tarea (híbrido, para controlar costo)

| Modo        | Modelo            | Uso                                            |
| ----------- | ----------------- | ---------------------------------------------- |
| `chat`      | Claude Haiku 4.5  | Dudas rápidas, ejemplos, comparaciones         |
| `quiz`      | Claude Haiku 4.5  | Generar preguntas y evaluar respuestas         |
| `socratico` | Claude Sonnet 5   | Guía paso a paso del análisis de una obra      |

## Desplegar

Se publica en su propio dominio **`tutor.hilvan.org`** (ver `wrangler.jsonc`),
así que la URL del tutor es fija. Requiere que `hilvan.org` sea zona de la cuenta.

```bash
cd workers/tutor
npm install
npx wrangler deploy                           # crea/actualiza el dominio tutor.hilvan.org
npx wrangler secret put ANTHROPIC_API_KEY     # tu key sk-ant-...
# (opcional) restringe el origen permitido:
npx wrangler secret put ALLOW_ORIGIN          # https://historia.hilvan.org
```

Luego, en el frontend, define `NEXT_PUBLIC_TUTOR_URL=https://tutor.hilvan.org`
(p. ej. en `.env.local`) y vuelve a compilar/desplegar (`npm run deploy:historia`).
Si la variable no está definida, la app muestra el curso y desactiva el chat del
tutor con un aviso.

> El secret `ANTHROPIC_API_KEY` no se guarda en el repositorio — solo su nombre.
