// Resuelve miniaturas de DOMINIO PÚBLICO / licencia libre para las obras del
// curso, consultando Wikimedia Commons. Escribe src/data/obras-imagenes.json.
//
// ⚠ Necesita salida a internet → córrelo en tu máquina o en CI (en el sandbox
// de Claude la red está bloqueada). Es idempotente y reanudable: solo consulta
// las obras aún no resueltas.
//
//   node scripts/fetch-imagenes.mjs           # resuelve las pendientes
//   node scripts/fetch-imagenes.mjs --retry   # reintenta también las "sin imagen"
//
// Solo guarda imágenes con licencia libre (dominio público / CC). Las obras con
// derechos (arte del s. XX–XXI) se quedan sin miniatura: en el sitio muestran el
// enlace a Google Arts & Culture igualmente.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OBRAS = path.join(ROOT, "src", "data", "obras.json");
const SALIDA = path.join(ROOT, "src", "data", "obras-imagenes.json");
const RETRY = process.argv.includes("--retry");
const UA = "curso-historia-del-arte/1.0 (https://historia.hilvan.org; educativo)";
const API = "https://commons.wikimedia.org/w/api.php";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s) => (s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

// ¿La licencia es libre (dominio público o Creative Commons)?
function esLibre(meta) {
  const pd = meta?.PublicDomain?.value;
  if (pd) return true;
  const lic = (meta?.License?.value || "").toLowerCase();
  const short = (meta?.LicenseShortName?.value || "").toLowerCase();
  const txt = `${lic} ${short}`;
  if (/fair use|non-free|no-?libre|copyright|todos los derechos|all rights/.test(txt)) return false;
  return /public domain|dominio p|\bpd\b|cc0|cc[ -]?by/.test(txt);
}

const IMG_MIME = /^image\/(jpeg|png|tiff|gif|webp)$/;

async function buscar(q) {
  const url =
    `${API}?action=query&format=json&redirects=1&generator=search` +
    `&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=6` +
    `&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=640`;
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const pages = Object.values(data?.query?.pages || {}).sort(
    (a, b) => (a.index ?? 999) - (b.index ?? 999),
  );
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii || !ii.thumburl) continue;
    if (!IMG_MIME.test(ii.mime || "")) continue;
    const meta = ii.extmetadata || {};
    if (!esLibre(meta)) continue;
    return {
      thumb: ii.thumburl,
      enlace: ii.descriptionurl,
      credito: stripHtml(meta.Artist?.value) || stripHtml(meta.Credit?.value) || undefined,
      licencia: stripHtml(meta.LicenseShortName?.value) || "Dominio público",
    };
  }
  return null;
}

const obras = JSON.parse(fs.readFileSync(OBRAS, "utf8"));
const cache = fs.existsSync(SALIDA) ? JSON.parse(fs.readFileSync(SALIDA, "utf8")) : {};

// queries únicas
const queries = [...new Set(Object.values(obras).flat().map((o) => o.q))];
const pendientes = queries.filter((q) => {
  const c = cache[q];
  if (!c) return true;
  if (c.none && RETRY) return true;
  return false;
});

console.log(`Obras únicas: ${queries.length} · pendientes: ${pendientes.length}`);
let hits = 0;
let done = 0;

for (const q of pendientes) {
  try {
    const r = await buscar(q);
    if (r) {
      cache[q] = r;
      hits++;
    } else {
      cache[q] = { none: true };
    }
  } catch (e) {
    console.log(`  ! error en "${q}": ${e.message} (se reintentará en otra pasada)`);
    // no cachear en error transitorio
  }
  done++;
  if (done % 20 === 0) {
    fs.writeFileSync(SALIDA, JSON.stringify(cache, null, 2) + "\n");
    console.log(`  … ${done}/${pendientes.length} (con imagen: ${hits})`);
  }
  await sleep(150); // cortesía con la API de Wikimedia
}

fs.writeFileSync(SALIDA, JSON.stringify(cache, null, 2) + "\n");
const conImagen = Object.values(cache).filter((v) => v.thumb).length;
console.log(`\nListo. Con miniatura: ${conImagen}/${queries.length}. Escrito: ${path.relative(ROOT, SALIDA)}`);
console.log("Ahora: npm run deploy:historia  (o npm run build) para publicar las imágenes.");
