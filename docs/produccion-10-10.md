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
| 2 | Contenido y evaluación | 🟡 en curso |
| 3 | Seguridad del tutor (P0) | 🟡 en curso |
| 4 | Privacidad y seguridad web | 🟡 en curso |
| 5 | Accesibilidad WCAG 2.2 AA | 🟡 en curso |
| 6 | UX de aprendizaje | ⬜ |
| 7 | Rendimiento y PWA | ⬜ |
| 8 | SEO y despliegue | 🟡 en curso |
| 9 | Producto y monetización | ⬜ |

_(Cada fase se detalla más abajo a medida que avanza.)_

### Auditoría multi-agente (fases 2/4/5/8)

Workflow `auditoria-10-10`: 4 agentes Sonnet en paralelo (solo lectura, 0
errores) auditaron contenido, privacidad/seguridad web, accesibilidad y SEO.
Hallazgos con ubicación exacta; los accionables se integran abajo. Resultado
crudo en el journal del workflow (no versionado).

### Fase 2 — Contenido (en curso) — `b3cd419`

Correcciones de la auditoría: Joseon (superlativo sin fuente retirado), tarro de
la luna (dimensión errónea corregida), cierre de 11.08 (ya no cierra el módulo),
conteos (README 86; docs 527/508). Marcadas en `PENDING_HUMAN_REVIEW.md`.
**Pendiente:** tabla de especificaciones (competencia×lección), ampliar banco
interactivo, citas trazables.

### Fase 4 — Privacidad y seguridad web (en curso)

- **4E/4F — Sanitización + guard XSS** (`b4e164f`): `src/lib/sanitizar.ts`
  aplicado en `render()` (marked@14 no sanitiza) + guard en `validar-contenido`
  que falla el build si hay HTML peligroso en el `.md` fuente. 6 pruebas XSS.
- **4G — Cabeceras** (`99270b7`): CSP + nosniff + Referrer/Permissions-Policy +
  HSTS + X-Frame-Options en el Worker de historia (scoped). Nota: `'unsafe-inline'`
  es inevitable en Next export → la CSP es defensa en profundidad; la
  sanitización es la mitigación real de XSS.
- **4A/4B/4C — Página `/curso/privacidad`** (`0179989`): divulgaciones factuales
  verificadas (Groq/Anthropic/Cloudflare, sin cookies, localStorage) con banner
  de borrador pendiente de revisión legal; aviso de datos personales junto al
  input del tutor.
- **Pendiente:** páginas separadas de cookies/términos + footer global; revisión
  legal humana; actualizar deps mínimamente (sin `--force`).

### Fase 5 — Accesibilidad (en curso) — `085698d`

Hallazgos del audit implementados: modales (Lightbox/Comparador) con hook
`useFocoModal` (foco inicial, trampa de Tab, restauración); Cuestionario con
`fieldset/legend` + radios reales y estado `sr-only`; TutorPanel con
`aria-pressed`, `role=log`/`aria-live` y `role=alert`; token `--color-control`
(≥3:1, SC 1.4.11) en controles; `prefers-reduced-motion` en scrolls + media query
global. **Pendiente:** Repaso `alt=""` (decisión de diseño, `needs_human`);
Playwright + axe y checklist manual (no se declara «cero violaciones» sin correrlo).

### Fase 8 — SEO (en curso) — `7f1f4b7`

`description` + `canonical` (host fijo) + `openGraph` en lección y módulo; JSON-LD
`Course` (home) y `LearningResource` + `BreadcrumbList` (lección), sin `provider`
(regla 8); sitemap amplía obras/cronología/repaso/logros/apoya/privacidad; robots
`Disallow /curso/revisar`; dashboard de costos `/` con `noindex`. **Pendiente:**
separar dashboard de costos del producto (route groups o apps); `og:image`.

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

---

## Informe final (provisional)

Provisional: las fases 6/7/9 se están auditando; se actualizará al integrarlas.
Rama `claude/art-history-10-10`, PR #9. Cambios vs `main`: **44 archivos**
(18 nuevos, 26 modificados). Todo el trabajo está en la rama; **nada desplegado**.

### Estado por fase (resumen)

- **P0 — Fase 1 (integridad visual):** 1A/1B/1C/1F/1H hechos y verificados
  (rechazadas + regresión, manifiesto + gate tras flag, TASL enlazado, validador
  CI). Pendiente menor: 1D, 1G.
- **P0 — Fase 3 (seguridad del tutor):** A/B/C/D/E/H/K/L/M/N/O hechos (contrato
  por IDs, corpus en el Worker, validación estricta, body por bytes, rate-limits
  fail-closed, visión solo por catálogo, logs sin PII, kill switch, pruebas).
  Pendiente (gating de pago): 3G, 3I, 3J.
- **Fase 2 (contenido):** correcciones del audit aplicadas. Pendiente: tabla de
  especificaciones, ampliar banco, citas trazables.
- **Fase 4 (privacidad/seguridad web):** sanitización + guard XSS, cabeceras
  (CSP…), páginas privacidad/cookies/términos + footer. Pendiente: revisión
  legal, actualización de deps.
- **Fase 5 (accesibilidad):** foco de modales, radios de cuestionario, ARIA del
  tutor, contraste de controles, reduced-motion. Pendiente: Playwright+axe,
  decisión de `alt` en Repaso.
- **Fase 8 (SEO):** metadata+canonical+OG, JSON-LD, sitemap, robots, og:image.
  Pendiente: separar dashboard de costos.
- **Fases 6/7/9:** en auditoría multi-agente.

### Decisiones clave

1. **Gate de imágenes tras flag** (`PUBLICAR_SOLO_VERIFICADAS`, apagado): con 0
   imágenes verificadas por humano, activarlo esconde el catálogo; el generador
   **nunca** marca `verified` (regla 9). Requiere sign-off humano para activarlo.
2. **CSP con `'unsafe-inline'`**: inevitable en Next static export (scripts de
   hidratación) → la CSP es defensa en profundidad; la **sanitización** de marked
   es la mitigación real de XSS.
3. **No inventar** (regla 8): sin fuentes, sin texto legal final, sin nombre de
   organización en JSON-LD, sin cifras de dimensiones sin verificar → todo eso
   queda en `PENDING_HUMAN_REVIEW.md`.
4. **Cabeceras por dominio**: se fijan en el Worker de `historia` (no globales)
   para no imponer al dashboard de costos una CSP con `connect-src` al tutor.

### Pruebas y verificación

96 tests (sitio + Workers de tutor e historia), `lint`, `tsc` (sitio + 2
Workers), `validar-contenido` + `validar-imagenes`, `build` (140 páginas), y
`wrangler deploy --dry-run` de ambos Workers — todo en verde en cada commit.

### Riesgos residuales

- **Imágenes**: 312 renderizables tienen atribución pero **0 verificadas por
  humano**; para producto de pago hay que verificar licencias una a una.
- **Tutor de pago bloqueado** hasta tener presupuesto global exacto (3I): el
  rate-limit de Cloudflare es local por datacenter.
- **Legal**: páginas en borrador; sin revisión jurídica no deben promocionarse
  (menos aún a menores).
- **CWV**: no se afirman LCP/INP/CLS sin medición de campo real (Fase 7).

### Tareas que requieren especialista humano

Ver `PENDING_HUMAN_REVIEW.md` (imágenes a verificar/reemplazar, afirmaciones de
contenido con fuente, revisión legal, decisión de `alt` en Repaso, identidad del
responsable/organización).

### Pasos de despliegue (cuando se autorice)

1. **Sitio y Worker del tutor DEBEN desplegarse juntos**: el contrato del tutor
   cambió (`{lessonId,mode,messages,workId}`); un frontend viejo contra el Worker
   nuevo (o viceversa) rompe el tutor.
2. Regenerar datos si cambió contenido: `npm run datos` (obras, quiz, manifiesto,
   corpus). CI verifica que no haya drift.
3. Desplegar el sitio: `npm run deploy:historia` (incluye el Worker de historia
   con las cabeceras).
4. Desplegar el tutor: en `workers/tutor`, `wrangler deploy` (requiere
   `GROQ_API_KEY` y, para visión híbrida, `ANTHROPIC_API_KEY`).
5. Activar el gate de imágenes solo tras revisión humana
   (`PUBLICAR_SOLO_VERIFICADAS=1`), cuando haya imágenes `verified`.
