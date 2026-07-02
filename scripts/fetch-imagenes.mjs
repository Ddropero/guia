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
// Solo guarda imágenes con licencia libre (dominio público / CC sin NC/ND). Las
// obras con derechos (arte del s. XX–XXI) se quedan sin miniatura: en el sitio
// muestran el enlace a Wikipedia igualmente.
//
// COBERTURA: una sola búsqueda con la query completa falla en muchas obras
// famosas porque el título es descriptivo ("El Partenón y su escultura") o une
// dos obras ("Buda de Gandhara y Buda de Mathura"). Por eso se prueban VARIAS
// variantes, de la más específica a la más simple (título completo → primer
// segmento antes de "y"/":"/"(" → nombre propio del final), y se toma la
// primera imagen libre. Se prueba la más específica primero para no perder
// precisión.
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

// ¿La licencia es libre (dominio público o CC sin cláusulas NC/ND)?
// Acepta: dominio público, CC0, CC BY, CC BY-SA. Rechaza: NC (NonCommercial),
// ND (NoDerivatives), fair use y no-libres.
function esLibre(meta) {
  const pd = meta?.PublicDomain?.value;
  if (pd) return true;
  const lic = (meta?.License?.value || "").toLowerCase();
  const short = (meta?.LicenseShortName?.value || "").toLowerCase();
  const txt = `${lic} ${short}`;
  if (/fair use|non-free|no-?libre|copyright|todos los derechos|all rights/.test(txt)) return false;
  if (/[-\s](nc|nd)\b|non[-\s]?commercial|no[-\s]?comercial|no[-\s]?deriv/.test(txt)) return false;
  return /public domain|dominio p|\bpd\b|cc0|cc[ -]?by\b/.test(txt);
}

const IMG_MIME = /^image\/(jpeg|png|tiff|gif|webp)$/;

// Palabras vacías: no aportan a distinguir una obra.
const PARADAS = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "o", "u", "en", "un", "una",
  "al", "su", "sus", "con", "por", "para", "sobre", "the", "of", "and",
]);

// Genera variantes de búsqueda, de específica a simple, sin duplicados.
function variantes(titulo, autor, q) {
  const out = [];
  const push = (s) => {
    if (!s) return;
    s = s.replace(/\s+/g, " ").trim();
    if (s.length >= 3 && !out.includes(s)) out.push(s);
  };

  push(q); // query original (título + autor, como la usa obras.json)
  push(titulo); // título completo sin autor (arregla los "autores" que son basura descriptiva)

  // Primer segmento: corta en " y ", " / ", ":", "—/–", "(" → separa obras dobles y colas descriptivas.
  const seg = titulo.split(/\s+y\s+|\s*\/\s*|\s*:\s*|\s*[—–]\s*|\s*\(/)[0];
  push(seg);

  // El autor solo si parece nombre propio (tiene mayúscula), no una frase descriptiva.
  const autorLimpio = (autor || "").replace(/^[\s,:/]+|[\s,:/]+$/g, "");
  if (autorLimpio && /[A-ZÁÉÍÓÚÑ]/.test(autorLimpio) && !/[:]/.test(autor || "")) {
    push(`${seg} ${autorLimpio}`);
  }

  // Cola de nombres propios: palabras Capitalizadas al final del título
  // ("…, cueva de Lascaux" → "Lascaux"; "Recinto D, Göbekli Tepe" → "Göbekli Tepe").
  const palabras = titulo.replace(/[(),"“”]/g, " ").split(/\s+/).filter(Boolean);
  const cola = [];
  for (let i = palabras.length - 1; i >= 0; i--) {
    const w = palabras[i];
    if (/^\p{Lu}[\p{L}\d.-]{2,}$/u.test(w) && !PARADAS.has(w.toLowerCase())) {
      cola.unshift(w);
    } else break;
  }
  if (cola.length && cola.length < palabras.length) push(cola.join(" "));

  return out;
}

async function buscarUna(query) {
  const url =
    `${API}?action=query&format=json&redirects=1&generator=search` +
    `&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=8` +
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

// Prueba las variantes en orden; devuelve la primera imagen libre.
async function resolver(titulo, autor, q) {
  const vs = variantes(titulo, autor, q);
  for (let i = 0; i < vs.length; i++) {
    const r = await buscarUna(vs[i]);
    if (r) return { ...r, query: vs[i] };
    if (i < vs.length - 1) await sleep(120); // cortesía entre variantes
  }
  return null;
}

const obras = JSON.parse(fs.readFileSync(OBRAS, "utf8"));
const cache = fs.existsSync(SALIDA) ? JSON.parse(fs.readFileSync(SALIDA, "utf8")) : {};

// q → {titulo, autor} (primera aparición) para dar contexto a la búsqueda.
const META = new Map();
for (const lista of Object.values(obras)) {
  for (const o of lista) if (!META.has(o.q)) META.set(o.q, { titulo: o.titulo, autor: o.autor || "" });
}

const queries = [...META.keys()];
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
  const { titulo, autor } = META.get(q);
  try {
    const r = await resolver(titulo, autor, q);
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
    console.log(`  … ${done}/${pendientes.length} (con imagen esta pasada: ${hits})`);
  }
  await sleep(150); // cortesía con la API de Wikimedia
}

fs.writeFileSync(SALIDA, JSON.stringify(cache, null, 2) + "\n");
const conImagen = Object.values(cache).filter((v) => v.thumb).length;
console.log(`\nListo. Con miniatura: ${conImagen}/${queries.length}. Escrito: ${path.relative(ROOT, SALIDA)}`);
console.log("Ahora: npm run deploy:historia  (o npm run build) para publicar las imágenes.");
