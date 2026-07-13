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
| 1 | Integridad de imágenes y licencias (P0) | 🟡 |
| 2 | Contenido y evaluación | ⬜ |
| 3 | Seguridad del tutor (P0) | ⬜ |
| 4 | Privacidad y seguridad web | ⬜ |
| 5 | Accesibilidad WCAG 2.2 AA | ⬜ |
| 6 | UX de aprendizaje | ⬜ |
| 7 | Rendimiento y PWA | ⬜ |
| 8 | SEO y despliegue | ⬜ |
| 9 | Producto y monetización | ⬜ |

_(Cada fase se detalla más abajo a medida que avanza.)_
