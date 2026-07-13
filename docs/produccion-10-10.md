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

- Contenido: **13 módulos**, **86 lecciones** (`.md`), 508 obras catalogadas.
- Integridad visual: **315/508** obras con imagen (tras curación previa; 142
  blanqueadas a la espera de recuperación verificada).
- Dependencias clave: `next@16.2.6`, `wrangler@^4.95.0`.

---

## Progreso por fases

Estado: ⬜ pendiente · 🟡 en curso · ✅ hecho (con evidencia).

| Fase | Título | Estado |
|---|---|---|
| 1 | Integridad de imágenes y licencias (P0) | 🟡 en curso |
| 2 | Contenido y evaluación | ⬜ |
| 3 | Seguridad del tutor (P0) | ⬜ |
| 4 | Privacidad y seguridad web | ⬜ |
| 5 | Accesibilidad WCAG 2.2 AA | ⬜ |
| 6 | UX de aprendizaje | ⬜ |
| 7 | Rendimiento y PWA | ⬜ |
| 8 | SEO y despliegue | ⬜ |
| 9 | Producto y monetización | ⬜ |

_(Cada fase se detalla más abajo a medida que avanza.)_

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

**Pendiente en Fase 1:**

- 1D — Sustituir el token único de `relevante()` por validación múltiple
  (QID+título+autor+fecha+colección+tipo) en el verificador. Parcial hoy
  (QID/P18 + licencia libre).
- 1F — Renderizar la atribución TASL del manifiesto en tarjeta/figura/lightbox.
- 1G — Interfaz de revisión interna (promover pending→verified) tras flag de
  build, fuera de producción.
- 1H — Validador CI dedicado (hoy: los tests fallan si se renderiza una rechazada
  o si una renderizable no tiene fuente+licencia; falta el gate como fallo duro).
