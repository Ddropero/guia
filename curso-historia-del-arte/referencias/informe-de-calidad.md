# Informe de calidad · Curso de Historia del Arte

> Revisión editorial de coherencia, estructura y rigor factual.
> Fecha: 30 de junio de 2026.
> Revisor: revisión editorial experta en historia del arte.
> Alcance: lectura del README/índice, las dos guías (estudiante y docente), el marco pedagógico y una muestra de 8 lecciones completas (una por cada gran periodo), más un escaneo estructural y de enlaces sobre la totalidad de las 80 lecciones.

---

## 1. Resumen del estado

El curso está en **muy buen estado de publicación**. Es un cuerpo de materiales ambicioso (13 módulos, 80 lecciones más referencias) de calidad notablemente uniforme y alta, comparable a la de un buen manual universitario introductorio. La arquitectura pedagógica es sólida y está documentada (marco pedagógico, guía del docente, guía del estudiante), y se aplica con disciplina: **las 80 lecciones comparten exactamente la misma estructura de 14 secciones**, todas con las secciones obligatorias (objetivos, obras maestras comentadas, glosario, autoevaluación con clave de respuestas, ejercicio de mirada, etc.).

La **integridad de enlaces es total**: ningún enlace interno (README, índices de módulo, referencias y referencias cruzadas entre lecciones) apunta a un archivo inexistente; los 80 archivos en disco coinciden uno a uno con el índice del README.

El **rigor factual es alto**. En la muestra revisada no se detectó ningún error fáctico grave (fechas, atribuciones, localizaciones). Las dataciones comprobadas son correctas y, además, **consistentes entre lecciones** (p. ej., Louvre 1793, Prado 1819, desplome del coro de Beauvais 1284, Berthe Morisot 1841–1895, Vigée Le Brun 1755–1842). El contenido sobre el presente (arte con IA, NFT) está bien situado cronológicamente y dentro de lo verificable.

La **gestión de solapamientos es ejemplar**: las lecciones transversales (Módulo 12) y las contemporáneas remiten explícitamente a las lecciones de periodo en lugar de re-narrarlas, y hay notas de deslinde que reparten el contenido (p. ej., entre "Mujeres en la historia del arte", 12.01, y "Arte, feminismo e identidad", 10.08).

Los problemas detectados son **menores y de coherencia editorial superficial**, no de contenido. El más relevante es una referencia a un inexistente "Módulo 16" en la guía del docente.

Lecciones revisadas en profundidad: **8** (fundamentos 0.01; Grecia clásica 2.02; gótico 5.04; Alto Renacimiento 6.05; impresionismo 8.03; cubismo 9.02; arte mesoamericano 11.02; nuevos medios y arte digital 10.10; mujeres en la historia del arte 12.01). Escaneo estructural y de enlaces sobre **las 80**.

---

## 2. Fortalezas

1. **Consistencia estructural absoluta.** Las 80 lecciones presentan idéntico esqueleto de 14 secciones (Panorama · Objetivos de aprendizaje · Contexto histórico, social y cultural · Rasgos formales y estilísticos clave · Materiales y técnicas · Artistas y figuras clave · Obras maestras comentadas · Conexiones e influencias · Debates e interpretaciones · Glosario de la lección · Actividades y preguntas para debatir · Ejercicio de mirada · Autoevaluación con clave · Para profundizar). Ninguna lección muestreada omite secciones obligatorias.
2. **Coherencia de enfoque y nivel.** Todas las lecciones aplican el mismo método ("mirar / describir / contextualizar / interpretar / valorar"), mantienen un registro divulgativo-riguroso constante y abren con un gancho narrativo. El nivel es homogéneo de principio a fin.
3. **Rigor factual y honestidad historiográfica.** Datos correctos y consistentes; señalamiento sistemático de lo discutido (atribuciones inciertas, lecturas alternativas del friso del Partenón, original vs. copia, identidad del dios de Artemisión). El bloque "Para profundizar" cita bibliografía real y pertinente.
4. **Integridad de enlaces y navegación.** 0 enlaces rotos; índice del README, índices de módulo y referencias cruzadas internas verificados.
5. **Coherencia de fechas entre lecciones.** Las fechas de artistas y obras que reaparecen en varias lecciones coinciden, lo que indica un control editorial cuidadoso.
6. **Gestión de solapamientos mediante remisión.** Las lecciones transversales remiten a las de periodo y viceversa; hay deslindes explícitos para evitar duplicar contenido (feminismo, retrato, color).
7. **Enfoque global y crítico bien integrado.** El programa decolonial/global anunciado en el marco pedagógico se cumple en los módulos 3, 4, 11 y 12 y se reactiva como "mirada crítica" dentro de las lecciones occidentales (canon, primitivismo, mármol blanco, restitución), de forma coherente y no decorativa.
8. **Aparato de referencia completo.** Glosario, línea de tiempo, índices de artistas y de obras, mapa de movimientos, banco de evaluación y bibliografía, todos presentes y enlazados.

---

## 3. Problemas detectados (lista priorizada)

### Prioridad media

1. **Referencia a un "Módulo 16" inexistente.**
   - Archivo: `docente/guia-del-docente.md` (sección "Estrategias didácticas", apartado ABP).
   - Descripción: "El proyecto final del **Módulo 16** puede ser una exposición comentada." El curso solo tiene los módulos 0 a 12. Probablemente se quiso decir el módulo/semana final de síntesis (la tabla de secuenciación sitúa la síntesis en la "semana 16"); la redacción confunde número de semana con número de módulo. Es el único error que puede desorientar a un lector.
   - Recomendación: sustituir por "el proyecto final del curso" o "de la semana 16 de síntesis".

2. **Inconsistencia en el recuento de módulos ("doce" vs. "13").**
   - Archivos: `00-marco-pedagogico.md` (l. 7: "doce módulos"); varias lecciones del Módulo 0 (`02`, `04`, `05`: "los doce módulos de este curso"); `docente/guia-del-docente.md` (l. 9: "trece módulos"); frente a `00-guia-del-estudiante.md` (l. 27: "**13 módulos**") y `README.md` (l. 26: "**13 módulos**").
   - Descripción: ambas cifras son defendibles según se cuente o no el Módulo 0 (fundamentos) como módulo "de contenido", pero la coexistencia de "doce" y "trece/13" en documentos rectores resulta incoherente a la vista del lector.
   - Recomendación: unificar el criterio. Sugerencia: "trece módulos (del 0 al 12)" en todos los documentos, o bien hablar de "un módulo de fundamentos + doce módulos de recorrido". Hacerlo de forma uniforme.

### Prioridad baja (cosmética)

3. **Variación en los títulos de módulo entre el README y los nombres de carpeta/índice.**
   - Archivo: `README.md` (índice) frente a directorios y archivos `00-modulo.md`.
   - Descripción: discrepancias menores de denominación, p. ej. Módulo 1 "Prehistoria y primeras civilizaciones" (README) vs. carpeta `01-prehistoria-y-civilizaciones`; Módulo 3 "Grandes tradiciones de Asia" (README) vs. carpeta `03-asia-clasica`. No afecta a enlaces ni a contenido; es solo cosmético.
   - Recomendación: opcional; homogeneizar los rótulos visibles si se busca pulcritud total.

4. **Referencia cruzada con orden de módulos poco intuitivo.**
   - Archivo: `modulos/11-tradiciones-globales/02-arte-mesoamericano.md` (Panorama, l. 13): "el muralismo mexicano del siglo XX (módulos 11 y 9)".
   - Descripción: el muralismo se trata en el Módulo 9; citar "(módulos 11 y 9)" en ese orden es correcto en sustancia pero confuso. Detalle menor.
   - Recomendación: precisar "(Módulo 9)" o reordenar "(módulos 9 y 11)".

---

## 4. Recomendaciones de mejora

1. **Corregir los dos problemas de prioridad media** (el "Módulo 16" y el recuento doce/trece). Son rápidos y eliminan las únicas incoherencias capaces de desorientar.
2. **Pase de uniformación terminológica** de los títulos de módulo entre README, índices de módulo y encabezados de lección (prioridad baja, opcional).
3. **Mantener el sistema de deslinde por remisión** que ya funciona; al añadir o editar lecciones futuras, conservar las notas explícitas de "esto se trata en la lección X" para que la ausencia de solapamiento siga garantizada.
4. **Verificación factual ampliada (opcional).** La muestra (8 lecciones a fondo, escaneo estructural de 80) no halló errores; para una garantía editorial total convendría una segunda pasada de comprobación de datos sobre las lecciones no leídas en profundidad (en especial módulos 3, 4, 7 y las de tradiciones globales 11.01–11.07, donde las dataciones son más susceptibles de matiz). No hay indicios de problemas, es una recomendación de prudencia.
5. **Nota metodológica ya bien resuelta:** la advertencia del README sobre la ausencia de imágenes (por derechos) y la descripción detallada de cada obra es una decisión acertada y coherentemente aplicada; mantenerla.

---

## 5. Conclusión

Curso de **alta calidad, coherente y listo para uso**, con una estructura impecablemente uniforme, enlaces íntegros, rigor factual sólido y un enfoque global-crítico bien ejecutado. Los defectos hallados son editoriales y menores; corregir el "Módulo 16" y unificar el recuento de módulos deja el material en condiciones excelentes.
