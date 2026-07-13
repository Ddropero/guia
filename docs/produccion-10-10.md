# Endurecimiento a producción — Historia del Arte

Rama: `claude/art-history-10-10` (desde `claude/elegant-franklin-97cgnj` @ `21aa0d3`).

Este documento acumula la evidencia y las decisiones del trabajo por fases.
**No se declara ningún nivel "10/10" sin evidencia.** El código no sustituye la
revisión humana de historia del arte, licencias, privacidad ni pruebas con
usuarios. Todo contenido corregido automáticamente se marca `needs_human_review`
(ver `PENDING_HUMAN_REVIEW.md`).

Reglas activas: sin deploy, sin push y sin PR hasta autorización; commits
pequeños y temáticos; sin `npm audit fix --force`; se conserva el modo gratuito
y anónimo.

---

## Baseline (antes de modificar)

Ejecutado sobre `21aa0d3`. Log completo: `scratchpad/baseline.log` (no versionado).

| Comando | Resultado |
|---|---|
| `npm ci` | PASS |
| `npm test` | PASS — 7 archivos, **61 tests** |
| `npm run lint` | PASS |
| `npx tsc --noEmit` (sitio) | PASS |
| `node scripts/validar-contenido.mjs` | PASS |
| `npm run build` | PASS — **136 páginas** estáticas |
| `npx vitest run workers/tutor/src/index.test.ts` | PASS — 19 tests |
| `npx tsc -p workers/tutor/tsconfig.json --noEmit` | PASS |
| `npx wrangler deploy --dry-run -c wrangler.historia.jsonc` | PASS |
| `npx wrangler deploy --dry-run -c workers/tutor/wrangler.jsonc` | PASS |

### Auditoría de dependencias

- `npm audit` (incluye dev): **8 vulnerabilidades** (1 low, 3 moderate, 4 high).
  Todas en la cadena de herramientas de desarrollo `wrangler` → `miniflare` →
  `undici`/`ws`. Existe `npm audit fix` **sin** `--force`. No afectan al artefacto
  publicado (sitio estático + Worker), solo al entorno de build/preview local.
- `npm audit --omit=dev` (**producción**): **2 moderate** — `postcss` (XSS vía
  `</style>`) traído transitivamente por `next`. Su único arreglo es
  `npm audit fix --force`, que degradaría Next a 9.3.3 (cambio de ruptura,
  **prohibido**). → **0 high/critical en producción.** Las 2 moderate quedan como
  **excepción documentada** (mitigación en Fase 4: sanitización de HTML + CSP;
  revisión de subida de `next` parcheado cuando exista).

### Métricas de partida

- Contenido: **13 módulos**, **86 lecciones** (`.md`), **527 fichas de obra**
  (508 obras únicas por `q`; las proporciones de imagen usan las únicas).
- Integridad visual: **315/508** obras únicas con imagen (tras curación previa;
  142 blanqueadas a la espera de recuperación verificada).
- Dependencias clave: `next@16.2.6`, `wrangler@^4.95.0`.

---

## Progreso por fases

Estado: ⬜ pendiente · 🟡 en curso · ✅ hecho (con evidencia).

| Fase | Título | Estado |
|---|---|---|
| 1 | Integridad de imágenes y licencias (P0) | 🟡 en curso |
| 2 | Contenido y evaluación | ⬜ |
| 3 | Seguridad del tutor (P0) | 🟡 en curso |
| 4 | Privacidad y seguridad web | ⬜ |
| 5 | Accesibilidad WCAG 2.2 AA | ⬜ |
| 6 | UX de aprendizaje | ⬜ |
| 7 | Rendimiento y PWA | ⬜ |
| 8 | SEO y despliegue | ⬜ |
| 9 | Producto y monetización | ⬜ |

_(Cada fase se detalla más abajo a medida que avanza.)_

### Fase 3 — Seguridad del tutor (en curso)

**Hecho y verificado** (`4a6b3e8`, `4139fcc`):

- **3B — Corpus del servidor**: `workers/tutor/src/corpus.json` (86 lecciones +
  446 obras con imagen), generado en build y bundleado en el Worker (230 KB gzip).
- **3A/3C — Contrato + contexto server-side**: `{ lessonId, mode, messages,
  workId? }`. El cliente ya **no** envía el contexto de la lección ni URLs de
  imagen: el Worker lo resuelve del corpus. Instrucción anti-inyección en el
  sistema.
- **3D — Body por bytes**: rechazo >50 KB aunque no haya `Content-Length`.
- **3E — Validación estricta**: `validarPeticion()` (modo, 1..10 mensajes,
  ≤4000 chars, alternancia user…user, lessonId existente).
- **3H — Rate limits fail-closed**: sin bindings → 503.
- **3K — Visión solo por workId del catálogo**: nunca una URL del cliente; un
  workId no catalogado se ignora (sin visión).
- **3L/3M — Errores genéricos con requestId + logs JSON** sin prompts/texto/IP.
- **3N — Kill switch** `TUTOR_KILL=1` + health check.
- **3O — Pruebas** de esquema y guardias del handler (origin, fail-closed,
  429, 413, 400, kill). Worker: 35 tests; total 86.

**Pendiente en Fase 3 (gating de lanzamiento de PAGO):**

- 3G — Token de sesión firmado de corta duración + Turnstile (anti-bot). No es
  identidad de usuario.
- 3I — Presupuesto GLOBAL exacto / circuit breaker (el Rate Limiting de
  Cloudflare es local por datacenter). **Hasta tenerlo, el lanzamiento de pago
  queda bloqueado** (decisión explícita del spec).
- 3J — Cuotas por sesión/usuario y por proveedor; separar texto y visión.

### Fase 1 — Integridad de imágenes y licencias (en curso)

**Hecho y verificado:**

- **1C — Registro de rechazadas + regresión** (`b56d6ad`). Nuevo
  `src/data/obras-imagenes-rechazadas.json`: máxima autoridad en `imagenDe()` y
  `imagenesMostradas()` → esas obras nunca publican imagen, aunque una
  regeneración de datos vuelva a proponer una. Cubre los 10 falsos positivos del
  spec. **Detectó y bloqueó 3 imágenes erróneas que aún se publicaban** (no
  estaban blanqueadas): Siluetas de Ana Mendieta → una jirafa; Placas de latón
  del palacio de Benín (2 claves) → un retrato de un antipapa. Cobertura 315→312.
  Pruebas de regresión en `src/lib/obras.test.ts` (build limpio confirma que las
  URLs erróneas ya no están en el HTML). 65 tests.

- **1A/1B — Manifiesto + gate `verified`** (`4727c26`). Nuevo
  `src/data/obras-imagenes-manifiesto.json` (generador
  `scripts/construir-manifiesto-imagenes.mjs`): por obra con imagen — workId,
  título, autor, QID, commonsFile, thumb320/640/960, full, creador, sourceUrl,
  licenseName/licenseUrl, cambios, `status`, verifiedAt/By. **457 obras: 446
  pending, 11 rejected, 0 verified.** El generador **nunca** marca `verified`
  (regla 9). Gate `imagenDe()` con `PUBLICAR_SOLO_VERIFICADAS=1` (apagado por
  defecto). Pruebas de estructura/TASL/gate; drift en CI; manifiesto
  determinista. **Decisión pendiente de sign-off humano:** activar el gate
  esconde el catálogo hasta que haya imágenes `verified` (opción 3 del acuerdo).

- **1F — Atribución TASL unificada** (`1296046`). Figura inline, tarjeta de
  galería y lightbox toman del manifiesto la **fuente** y la **licencia** y las
  renderizan **enlazadas** (Commons → página del archivo; licencia →
  creativecommons.org / Commons:Public_domain), con autor de imagen y
  modificaciones. Verificado en build (licencias enlazadas en el HTML).

- **1H — Validador CI de integridad visual** (`9227d3e`). `scripts/validar-imagenes.mjs`
  falla el build si una renderizable está rechazada, no está en el manifiesto,
  carece de atribución (fuente+licencia) o su miniatura no es de Wikimedia.
  En CI y en `npm run validar`. Estado: 312 con imagen OK, 11 rechazadas bloqueadas.

**Pendiente en Fase 1 (menor):**

- 1D — Sustituir el token único de `relevante()` por validación múltiple
  (QID+título+autor+fecha+colección+tipo) en el verificador. Parcial hoy
  (QID/P18 + licencia libre).
- 1G — Interfaz de revisión interna (promover pending→verified) tras flag de
  build, fuera de producción.
