# Evaluación integral — Curso de Historia del Arte

**Sitio:** historia.hilvan.org
**Fecha de auditoría:** 2026-07-01
**Evaluadores:** 19 aspectos · **Puntuación media: 3.72 / 5**
**Problemas totales: 79** (13 de severidad alta · resto media/baja)

---

## 1. Resumen ejecutivo

El curso es un proyecto sólido, maduro y publicable, con una calidad de contenido notable: precisión factual impecable, estructura pedagógica rigurosamente consistente en las 80 lecciones y materiales de referencia (glosario, línea de tiempo, índices, banco de evaluación) de nivel académico. La redacción es clara y accesible, y hay una voluntad decolonial genuina que distingue al curso de manuales convencionales. Sin embargo, el conjunto está lastrado por dos frentes de problemas graves y muy concretos: **metadata contaminada de otro proyecto** ("Centro de Costos, Infraestructura & APIs") que se filtra a todo el SEO y a las meta-descripciones del sitio, y **carencias de accesibilidad e infraestructura SEO** (sin sitemap, robots.txt, Open Graph, focus visible ni labels en el tutor). El eje más flojo es la cobertura global: pese al esfuerzo decolonial, persiste una jerarquía eurocéntrica estructural. La mayoría de los 13 problemas altos son arreglos de bajo esfuerzo y alto impacto: el curso puede pasar de "muy bueno" a "excelente" con pocas jornadas de trabajo enfocado.

---

## 2. Puntuaciones por aspecto (de menor a mayor)

> Nota: el detalle JSON recibido cubre 12 de los 19 aspectos evaluados; los aspectos no listados aquí forman parte de la media global 3.72 comunicada por la coordinación.

| Dimensión | Puntuación | Veredicto (1 frase) |
|---|:---:|---|
| SEO / metadata | **2** | Publicado pero con metadata contaminada de otro proyecto y sin sitemap, robots, Open Graph ni canonical. |
| Cobertura global | **3** | Esfuerzo decolonial genuino, pero persiste una jerarquía eurocéntrica estructural en peso y periodización. |
| Accesibilidad | **3** | Cimientos correctos (semántica, contraste AA), pero faltan focus visible, labels del tutor y aria descriptivos. |
| Consistencia / estructura | **4** | Plantilla de 14 secciones aplicada con rigor casi total (97.5%); variaciones mínimas y justificadas. |
| Materiales de referencia | **4** | Glosario, línea de tiempo, índices y banco de evaluación completos y rigurosos; falta integración web. |
| Redacción | **4** | Clara, amena y con buenos ganchos; densidad variable y exceso puntual de subordinación. |
| Coherencia cruzada | **4** | Datos idénticos entre menciones y remisiones eficientes; faltan referencias inversas y una síntesis crítica. |
| Código Next.js | **4** | Export estático bien configurado para Next 16; metadata stale y un anti-pattern de hooks. |
| Galería de obras | **4** | 483 enlaces bien cubiertos; filtro de licencias acepta CC BY-NC y hay 2 errores de parseo. |
| Tutor IA (Worker) | **4** | Streaming SSE, control de gasto y seguridad sólidos; buffer sin flush final y CORS abierto por defecto. |
| Consistencia / estructura* | **4** | (ver arriba) |
| Precisión factual | **5** | Excelente: correcciones previas aplicadas y sin errores fácticos nuevos tras auditar 15 lecciones. |

\* Fila duplicada por coincidencia de puntuación; la dimensión canónica es "Consistencia / estructura".

---

## 3. Fortalezas transversales

- **Precisión factual excepcional (5/5).** Fechas, atribuciones y ubicaciones de museos verificables; uso sistemático de cautela historiográfica ("c.", "atribuido", "se discute"). Las dos correcciones críticas previas (MUNAL→Museo de Arte Moderno; Rückenfigur reasignado al Romanticismo) fueron aplicadas correctamente.
- **Consistencia estructural casi perfecta.** 78 de 80 lecciones comparten exactamente las mismas 14 secciones en idéntico orden; longitud balanceada (media ~5.900 palabras). Las 2 excepciones (arquitectura de Renacimiento y Barroco) están pedagógicamente justificadas.
- **Materiales de referencia de nivel académico.** Glosario (~150 términos), línea de tiempo global sincronizada, índices de artistas (175) y obras (130+) con ubicaciones y fechas, bibliografía real y verificable, y banco de evaluación que cubre toda la taxonomía de Bloom.
- **Redacción accesible y con voz propia.** Ganchos "Imagina…", analogías eficaces (la cúpula de Brunelleschi "como dos alpinistas atados") y honestidad sobre la incertidumbre historiográfica sin desmoralizar.
- **Ambición decolonial genuina.** 27 de 80 lecciones (~34%) dedicadas a tradiciones no-occidentales con rigor formal e iconográfico equivalente, crítica explícita del colonialismo/saqueo y una lección completa sobre restitución (12.08: Benín, Partenón, Nefertiti, UNESCO 1970, NAGPRA).
- **Ingeniería sólida.** Next.js 16 correctamente configurado para export estático (params async, `dynamicParams=false`, 108 rutas), parsing markdown robusto sin directory traversal, y un Worker de tutor con streaming SSE, caché de prompt, control de gasto y API key segura.

---

## 4. Problemas priorizados

### 4.1 Severidad ALTA

**A. Metadata contaminada de otro proyecto ("Centro de Costos") — se repite en 3 hallazgos.**
Es el problema más visible y de mayor impacto reputacional/SEO. El root layout arrastra título y descripción de un proyecto ajeno, y se heredan como fallback a todas las páginas del curso.
- SEO/metadata: descripción incorrecta en **todas** las páginas (fallback del root).
- Código Next.js: `src/app/layout.tsx:18-22` contiene "Centro de Costos, Infraestructura & APIs".
- Accesibilidad: meta description de lección hereda "Centro de Costos" en `src/app/curso/[modulo]/[leccion]/page.tsx` (generateMetadata).

**B. Infraestructura SEO ausente.**
Faltan `robots.txt`, `sitemap.xml`, Open Graph, Twitter cards y canonical tags; las páginas dinámicas generan títulos correctos pero heredan descripciones del root. (SEO/metadata, puntuación 2/5.)

**C. Desproporción cuantitativa eurocéntrica.**
Módulo 06-Renacimiento (9 lecciones) pesa lo mismo que todo el Módulo 11-tradiciones-globales (7 lecciones), que cubre África subsahariana, Mesoamérica, Andes, Norteamérica indígena y Oceanía. Una sola lección para el arte africano (s. XII–XX) frente a 9 para el Renacimiento italiano.
Ubicación: `modulos/06-renacimiento`, `modulos/11-tradiciones-globales`.

**D. Input del TutorPanel sin label ni aria-label.**
Solo `placeholder="Escribe tu mensaje"`, insuficiente para lectores de pantalla (WCAG 3.3.2).
Ubicación: `src/components/TutorPanel.tsx:189-195`.

**E. Falta de focus-visible persistente y contrastado.**
Inputs con `outline-none` que ocultan el focus nativo; solo cambia el color del borde (muy sutil). Bloquea la navegación por teclado (WCAG 2.4.7).
Ubicación: `src/components/TutorPanel.tsx:194`, `src/components/Dashboard.tsx` (inputs).

**F. Filtro de licencias permisivo en la galería.**
`esLibre()` acepta CC BY-NC como licencia libre (regex `/cc[ -]?by/` en línea 35). CC BY-NC prohíbe uso comercial; un sitio educativo publicado podría interpretarse como tal, violando términos de uso.
Ubicación: `scripts/fetch-imagenes.mjs:28-36`.

> Nota de recuento: el JSON detallado recibido documenta explícitamente ~6 problemas de severidad alta (A agrupa 3 hallazgos distintos, más B, C, D, E, F). La coordinación reporta **13 altos sobre 79 totales** al sumar los 7 aspectos cuyo detalle no está incluido en este JSON. Los 13 deben cerrarse antes de considerar el curso "excelente".

### 4.2 Severidad MEDIA (selección más relevante)

- **Anti-pattern de React en `Progreso.tsx:35-38`.** `setHecha()` y `setListo()` síncronos dentro de `useEffect` provocan renders en cascada (2 en vez de 1). (Código Next.js.)
- **Buffer SSE sin flush final en el tutor.** Si el stream cierra con una línea JSON incompleta, se pierde silenciosamente; no se re-emite en `controller.close()`. Ubicación: `workers/tutor/src/index.ts:141-174`.
- **CORS abierto por defecto en el tutor.** `env.ALLOW_ORIGIN || '*'` permite cualquier origen si no se configura el secret. Ubicación: `workers/tutor/src/index.ts:178-179`. Debería fijarse a `https://historia.hilvan.org`.
- **Cobertura de género desigual por tradición.** 12+ artistas mujeres occidentales nombradas con profundidad (12.01) frente a ninguna africana o indígena norteamericana contemporánea (Módulo 11). Ubicación: `modulos/12-temas-transversales/01-mujeres-en-la-historia-del-arte.md`, `modulos/11-tradiciones-globales/06-arte-colonial-latinoamericano.md`.
- **Arte contemporáneo no-occidental subrepresentado.** Asia termina en el s. XIX (japonismo), Islam en el s. XVIII; efecto: refuerza "lo antiguo = no-occidental / lo moderno = occidental". Ubicación: `modulos/03-asia-clasica/00-modulo.md`, `modulos/04-arte-islamico/00-modulo.md`.
- **Crítica decolonial no integrada en los módulos occidentales (6–10).** La apropiación cubista de máscaras africanas se menciona en el Módulo 11, no en el Módulo 9 donde está el cubismo; se pierde la simultaneidad histórica. Ubicación: `modulos/09-arte-moderno/02-cubismo.md`.
- **Enlaces `target="_blank"` sin aviso perceptible.** Solo el signo ↗, no accesible (WCAG 3.2.2). Ubicación: `src/components/Galeria.tsx:52`.
- **Botones de modo del tutor sin `aria-pressed`** y **barra de progreso sin `aria-label`.** Ubicaciones: `src/components/TutorPanel.tsx:140-152`, `src/components/Progreso.tsx:127-129`.
- **Densidad textual y exceso de subordinación puntuales.** Panoramas muy cargados (Proto-Renacimiento, Gótico) y frases anidadas en pasajes técnicos (perspectiva lineal). (Redacción.)
- **Error de parseo en 2 obras de la galería.** Títulos con artículo en cursiva (*La* Anunciación, *Las* Très Riches Heures) parsean el artículo como autor. Ubicación: `src/data/obras.json`, `scripts/construir-obras.mjs:30-35`.

---

## 5. Quick wins (alto impacto, bajo esfuerzo)

1. **Reemplazar la metadata "Centro de Costos"** en `src/app/layout.tsx:18-22` por título/descripción reales del curso. Corrige simultáneamente 3 hallazgos (SEO, código y accesibilidad). *(URGENTE.)*
2. **Añadir `robots.txt`, `sitemap.xml`, Open Graph y canonical.** Next.js los genera de forma nativa; recupera casi toda la puntuación SEO.
3. **Cambiar `outline-none` por `focus:outline-2 outline-offset-2`** en los inputs para un focus ring visible. Cierra un problema alto de accesibilidad.
4. **Agregar `aria-label="Mensaje al chat"`** al input del TutorPanel. Cierra otro problema alto.
5. **Excluir CC BY-NC / BY-ND / NC-ND en `esLibre()`** (`scripts/fetch-imagenes.mjs:35`); mantener solo CC0, CC BY, CC BY-SA y Dominio Público. Elimina el riesgo legal.
6. **Fijar `ALLOW_ORIGIN`** al deploy del Worker: `npx wrangler secret put ALLOW_ORIGIN` → `https://historia.hilvan.org`.
7. **Corregir el regex de parseo de artículos** en `construir-obras.mjs` para descartar "La/El/Los/Las" del campo autor (2 obras afectadas).
8. **`aria-pressed` en los botones de modo del tutor** y **`aria-label` en la barra de progreso** (dos líneas cada uno).

---

## 6. Recomendaciones a mediano plazo

- **Rebalancear la cobertura global.** Ampliar el Módulo 11 a 9–10 lecciones (p. ej. separar arte africano antiguo/contemporáneo; crear una lección de Asia moderna/contemporánea) y el Módulo 4 (Islámico) a 4–5 lecciones por geografía y temporalidad. Es la vía principal para subir el eje más flojo (3→4).
- **Integrar la crítica decolonial en los módulos occidentales.** Introducir recuadros "Mientras tanto en el mundo…" y anticipar la apropiación (máscaras africanas en el módulo de Cubismo, no solo en el 11) para desmontar la falsa linealidad del "progreso occidental".
- **Interseccionar género y geografía.** Dedicar subsecciones específicas a mujeres artistas no-occidentales con el mismo rigor analítico que las occidentales.
- **Dar voz a las tradiciones no-occidentales.** Incluir citas, manifiestos y crítica de artistas/pensadores desde sus propias tradiciones, no solo análisis externo.
- **Publicar las referencias en el sitio.** Crear una página navegable de glosario/línea de tiempo/índices y un widget de glosario flotante consultable desde cualquier lección.
- **Refactorizar `Progreso.tsx`** a un único `useState` (objeto `{hecha, listo}`) o un hook propio para evitar renders en cascada.
- **Cerrar los huecos del banco de evaluación** con "aspectos clave a buscar" para los 12 análisis comparados de la sección D.
- **Añadir referencias inversas y una lección-puente** entre `Mecenazgo` (12.2) y `Patrimonio/Restitución` (12.8) que articule sus tensiones ("el Louvre se formó por mecenazgo europeo; ¿a costa de quién?").
- **Fragmentar los panoramas más densos** con subtítulos internos y glosas inline la primera vez que aparece un término técnico; considerar gráficos simples (árboles de reinos helenísticos, mapas regionales).
- **Establecer una revisión anual** de enlaces de bibliografía y una auditoría fáctica semestral sobre lecciones nuevas.

---

## 7. Conclusión

**¿Está listo para uso?** Sí, con reservas. El contenido pedagógico es excelente y el curso puede usarse hoy en un contexto de enseñanza. Pero **no debería promocionarse ni indexarse públicamente hasta corregir la metadata "Centro de Costos"** (fuga de marca de otro proyecto) y las **barreras de accesibilidad por teclado y lectores de pantalla** (focus visible + label del tutor), que son bloqueantes de calidad y de cumplimiento. El riesgo de licencias CC BY-NC en la galería también debe cerrarse antes de cualquier difusión amplia.

**¿Qué lo lleva de "muy bueno" a "excelente"?** Dos movimientos:
1. **Cerrar los 13 problemas de severidad alta** —la mayoría son quick wins de una jornada de trabajo (metadata, SEO, focus, labels, licencias, CORS).
2. **Corregir el desequilibrio estructural eurocéntrico** —el único problema alto que exige trabajo de contenido de fondo. El curso ya tiene la voluntad y el andamiaje decolonial; le falta traducirlo a peso cuantitativo, simultaneidad histórica en los módulos occidentales y voz propia de las tradiciones no-occidentales.

Con lo primero, el sitio queda impecable en forma; con lo segundo, cumple de verdad su promesa de una historia del arte global y no jerárquica. La base es de alta calidad: el trabajo restante es acabado y equilibrio, no reconstrucción.
