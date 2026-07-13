# Pendiente de revisión humana

Este archivo lista todo lo generado o corregido automáticamente que **requiere
revisión de un especialista** antes de considerarse definitivo. Nada de esto
lleva firma de revisor: no se inventan revisores ni resultados de auditoría.

Convención: cada ítem tiene un `id`, el motivo, y queda `needs_human_review`
hasta que una persona lo valide (y registre quién y cuándo, a mano).

## Imágenes rechazadas que necesitan reemplazo verificado (Fase 1C)

Estas obras tienen la imagen automática marcada `rejected` (mostraba otra cosa) y
hoy **no muestran nada**. Un humano debe buscar y verificar una imagen libre
correcta, o dejarlas sin imagen:

- El hombre de León (Löwenmensch) — mostraba un mural de Orozco
- Cabeza de Warka — mostraba un mapa de Uruk
- Aguamanil celadón de Goryeo — mostraba realeza española
- Ciclo de María de Médici (Rubens) — mostraba un presidente brasileño
- Versalles, Galería de los Espejos — mostraba un barrio de Buenos Aires
- Siluetas de Ana Mendieta — mostraba una jirafa
- Seedbed (Acconci) — mostraba un semillero agrícola
- Placas de latón del palacio de Benín (2 fichas) — mostraba un antipapa
- Anyanwu (Ben Enwonwu) — mostraba a una política nigeriana
- Justiniano y su corte (San Vitale) — mostraba a un historietista

## Integridad de imágenes (Fase 1)

- Las imágenes recuperadas automáticamente por `scripts/fijar-imagenes.mjs`
  (vía Wikidata P18 / búsqueda en Commons) son **candidatas**: acertar el nombre
  no garantiza que la foto sea de la obra. Requieren verificación visual humana
  obra por obra antes de marcarse `verified`.
- Las atribuciones de licencia provienen de los metadatos de Commons
  (`extmetadata`), que a veces son incompletos o erróneos. Un humano debe
  confirmar autor de la imagen, licencia y enlace antes de publicar, sobre todo
  para cualquier producto de pago.

## Contenido (Fase 2)

_(Se irá poblando con las afirmaciones corregidas y las citas a verificar.)_

---

_Última actualización automática: ver historial de git._
