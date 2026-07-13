// Valida la INTEGRIDAD VISUAL para CI (Fase 1H). Sale con código ≠ 0 si:
//   - una obra que HOY renderiza imagen está en el registro de rechazadas, o
//   - una obra renderizable no tiene entrada en el manifiesto, o
//   - le falta la atribución mínima (fuente enlazable + licencia), o
//   - la miniatura no es de upload.wikimedia.org.
// Es la red de seguridad de "no publicar imágenes sin atribución/verificación"
// a nivel de build, además de los tests unitarios.
//
//   node scripts/validar-imagenes.mjs
import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "src", "data");
const cargar = (f, fb) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8"));
  } catch {
    return fb;
  }
};

const OBRAS = cargar("obras.json", {});
const IMAGENES = cargar("obras-imagenes.json", {});
const WIKIDATA = cargar("obras-wikidata.json", {});
const OVERRIDE = cargar("obras-imagenes-override.json", {});
const RECHAZADAS = cargar("obras-imagenes-rechazadas.json", {}).obras ?? {};
const MANIFIESTO = cargar("obras-imagenes-manifiesto.json", {}).obras ?? {};

// Misma precedencia que imagenDe(): rechazada → override → wikidata → commons.
function imagenRenderizada(q) {
  if (RECHAZADAS[q]) return null; // el propio imagenDe la bloquea
  const ov = OVERRIDE[q];
  if (ov) return ov.none || !ov.thumb ? null : ov;
  const wd = WIKIDATA[q]?.imagen;
  if (wd?.thumb) return wd;
  const im = IMAGENES[q];
  if (im && !im.none && im.thumb) return im;
  return null;
}

const qs = new Set();
for (const lista of Object.values(OBRAS)) for (const o of lista) qs.add(o.q);

const problemas = [];
let renderizadas = 0;
for (const q of qs) {
  // 1. Ninguna rechazada debe resolver imagen (defensa: imagenDe ya lo evita).
  if (RECHAZADAS[q]) {
    const ov = OVERRIDE[q];
    const wd = WIKIDATA[q]?.imagen;
    const im = IMAGENES[q];
    const tieneFuente = (ov && !ov.none && ov.thumb) || wd?.thumb || (im && !im.none && im.thumb);
    if (tieneFuente && MANIFIESTO[q]?.status !== "rejected") {
      problemas.push(`rechazada sin marcar rejected en manifiesto: ${q}`);
    }
    continue;
  }
  const img = imagenRenderizada(q);
  if (!img) continue;
  renderizadas++;

  // 2. Toda renderizable debe estar en el manifiesto y NO como rejected.
  const man = MANIFIESTO[q];
  if (!man) {
    problemas.push(`renderiza imagen pero no está en el manifiesto: ${q}`);
    continue;
  }
  if (man.status === "rejected") {
    problemas.push(`renderiza imagen pero el manifiesto la marca rejected: ${q}`);
  }
  // 3. Atribución mínima (TASL): fuente + licencia.
  if (!man.sourceUrl) problemas.push(`sin sourceUrl en manifiesto: ${q}`);
  if (!man.licenseName) problemas.push(`sin licenseName en manifiesto: ${q}`);
  // 4. La miniatura debe ser de Wikimedia.
  if (!/^https:\/\/upload\.wikimedia\.org\//.test(img.thumb)) {
    problemas.push(`miniatura no-Wikimedia: ${q} (${img.thumb})`);
  }
}

if (problemas.length) {
  console.error(`✗ validar-imagenes: ${problemas.length} problema(s) de integridad visual:`);
  for (const p of problemas.slice(0, 50)) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(
  `✓ Integridad visual OK: ${renderizadas} obras con imagen, todas con manifiesto y atribución; ${Object.keys(RECHAZADAS).length} rechazadas bloqueadas.`,
);
