// Resuelve miniaturas de DOMINIO PÚBLICO / licencia libre para las obras del
// curso, consultando Wikimedia Commons. Escribe src/data/obras-imagenes.json.
//
// ⚠ Necesita salida a internet → córrelo en tu máquina o en CI (en el sandbox
// de Claude la red está bloqueada). Es idempotente y reanudable.
//
//   node scripts/fetch-imagenes.mjs             # resuelve pendientes + REVERIFICA las viejas sin evidencia
//   node scripts/fetch-imagenes.mjs --retry     # reintenta también las "sin imagen"
//   node scripts/fetch-imagenes.mjs --purge-only # revalida la caché sin red (autolimpieza) y sale
//
// Solo guarda imágenes con licencia libre (dominio público / CC sin NC/ND).
//
// PRECISIÓN: no basta con encontrar UNA imagen libre; muchas búsquedas devuelven
// una obra DISTINTA que comparte una palabra. Por eso cada candidata debe pasar
// `relevante()`: alguno de los tokens distintivos del título (nombres propios:
// Willendorf, Delfos, Ur…) o del autor (apellido: Velázquez, Picasso…) debe
// aparecer en los metadatos del archivo (nombre, categorías, descripción). Se
// comparan por prefijo para tolerar idiomas (Auriga↔Aurige). La evidencia se
// guarda en `_ev` para poder revalidar sin red (autolimpieza y --purge-only):
// si una imagen cacheada ya no pasa el guardián, se descarta y vuelve a la cola.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OBRAS = path.join(ROOT, "src", "data", "obras.json");
const SALIDA = path.join(ROOT, "src", "data", "obras-imagenes.json");
const RETRY = process.argv.includes("--retry");
const PURGE_ONLY = process.argv.includes("--purge-only");
const UA = "curso-historia-del-arte/1.0 (https://historia.hilvan.org; educativo)";
const API = "https://commons.wikimedia.org/w/api.php";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s) => (s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

// ¿Licencia libre (dominio público o CC sin NC/ND)?
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

const PARADAS = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e", "o", "u", "en", "un", "una",
  "al", "su", "sus", "con", "por", "para", "sobre", "the", "of", "and", "a", "le", "les", "des",
]);

// Palabras genéricas de arte: no distinguen UNA obra concreta.
const GENERICAS = new Set([
  "arte", "obra", "obras", "panel", "paneles", "fresco", "frescos", "boveda", "cupula",
  "escultura", "estatua", "estatuilla", "estatuillas", "retrato", "busto", "figura", "figuras",
  "relieve", "relieves", "mosaico", "mural", "cuadro", "pintura", "vasija", "ceramica",
  "catedral", "iglesia", "basilica", "templo", "capilla", "palacio", "casa", "torre", "arco",
  "columna", "puerta", "mascara", "estela", "sala", "gran", "grande", "sagrada", "santa", "santo",
  "san", "virgen", "cristo", "cruz", "dios", "diosa", "rey", "reina", "ciudad", "caso", "hombre",
  "mujer", "cabeza", "codice", "libro", "recinto", "monumento", "tumba", "sarcofago", "altar",
  "interior", "nave", "conjunto", "programa", "iconografico", "victoria", "muerte", "gotica",
  "gotico", "romanico", "clasico", "antiguo", "antigua", "tema", "escena",
]);

// Palabras de "autoría no distintiva": anónimos, roles, restos de ficha.
const ANON = new Set([
  "anonimo", "anonimos", "anonima", "anonimas", "colectiva", "colectivo", "autor", "autores",
  "atribuido", "atribuida", "taller", "escuela", "circulo", "seguidor", "varios", "recurrente",
  "tema", "fecha", "tecnica", "ubicacion", "dimensiones", "comunidad", "comunidades", "sucesivas",
  "corte", "orfebres", "patrocinadas", "patrocinado", "patrocinados", "maestro", "artista", "obra",
]);

const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// Nombres propios del título (palabras Capitalizadas en el original): Delfos, Ur, Willendorf…
function propios(titulo) {
  const out = [];
  for (const w of (titulo || "").split(/\s+/)) {
    if (!/^[\p{Lu}]/u.test(w)) continue;
    const t = norm(w);
    if (t && t.length >= 2 && !PARADAS.has(t) && !GENERICAS.has(t)) out.push(t);
  }
  return out;
}

// Tokens distintivos (no vacíos, no genéricos), longitud mínima dada.
function distintivos(s, min, excluir) {
  return norm(s)
    .split(/\s+/)
    .filter((t) => t.length >= min && !PARADAS.has(t) && !GENERICAS.has(t) && !excluir.has(t));
}

// Tokens que identifican ESTA obra: nombres propios del título + palabras
// distintivas del título + apellido(s) del autor.
function candidatos(titulo, autor) {
  const set = new Set([
    ...propios(titulo),
    ...distintivos(titulo, 4, new Set()),
    ...distintivos(autor, 4, ANON),
  ]);
  return [...set];
}

// ¿Coincide un token con alguna palabra de la evidencia? Prefijo de 4 (bidireccional)
// para tolerar idiomas; exacto para tokens cortos (Ur, Nok).
function coincide(tok, evWords) {
  if (tok.length <= 3) return evWords.includes(tok);
  const p = tok.slice(0, 4);
  return evWords.some((w) => w.length >= 4 && (w.startsWith(p) || tok.startsWith(w.slice(0, 4))));
}

// ¿La imagen (su evidencia) corresponde a la obra? Sin tokens distintivos que
// verificar (obra sin nombre propio ni autor), se acepta (mejor esfuerzo).
export function relevante(titulo, autor, ev) {
  const cand = candidatos(titulo, autor);
  if (!cand.length) return true;
  const evWords = norm(ev).split(/\s+/).filter(Boolean);
  return cand.some((c) => coincide(c, evWords));
}

// Variantes de búsqueda, de específica a simple.
function variantes(titulo, autor, q) {
  const out = [];
  const push = (s) => {
    if (!s) return;
    s = s.replace(/\s+/g, " ").trim();
    if (s.length >= 3 && !out.includes(s)) out.push(s);
  };
  push(q);
  push(titulo);
  const seg = titulo.split(/\s+y\s+|\s*\/\s*|\s*:\s*|\s*[—–]\s*|\s*\(/)[0];
  push(seg);
  const autorLimpio = (autor || "").replace(/^[\s,:/]+|[\s,:/]+$/g, "");
  if (autorLimpio && /[A-ZÁÉÍÓÚÑ]/.test(autorLimpio) && !/[:]/.test(autor || "")) push(`${seg} ${autorLimpio}`);
  const palabras = titulo.replace(/[(),"“”]/g, " ").split(/\s+/).filter(Boolean);
  const cola = [];
  for (let i = palabras.length - 1; i >= 0; i--) {
    const w = palabras[i];
    if (/^\p{Lu}[\p{L}\d.-]{2,}$/u.test(w) && !PARADAS.has(w.toLowerCase())) cola.unshift(w);
    else break;
  }
  if (cola.length && cola.length < palabras.length) push(cola.join(" "));
  return out;
}

// Devuelve las imágenes libres de una búsqueda, con su evidencia (para el guardián).
async function buscarUna(query) {
  const url =
    `${API}?action=query&format=json&redirects=1&generator=search` +
    `&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=8` +
    `&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=640`;
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const pages = Object.values(data?.query?.pages || {}).sort((a, b) => (a.index ?? 999) - (b.index ?? 999));
  const libres = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii || !ii.thumburl || !IMG_MIME.test(ii.mime || "")) continue;
    const meta = ii.extmetadata || {};
    if (!esLibre(meta)) continue;
    const nombre = (p.title || "").replace(/^File:/i, "");
    const ev = [
      nombre,
      stripHtml(meta.ObjectName?.value),
      stripHtml(meta.ImageDescription?.value),
      stripHtml(meta.Categories?.value),
      stripHtml(meta.Artist?.value),
      stripHtml(meta.Credit?.value),
    ]
      .filter(Boolean)
      .join(" · ");
    libres.push({
      thumb: ii.thumburl,
      enlace: ii.descriptionurl,
      credito: stripHtml(meta.Artist?.value) || stripHtml(meta.Credit?.value) || undefined,
      licencia: stripHtml(meta.LicenseShortName?.value) || "Dominio público",
      _ev: ev,
    });
  }
  return libres;
}

// Recorre las variantes y devuelve la primera imagen libre Y RELEVANTE.
async function resolver(titulo, autor, q) {
  const vs = variantes(titulo, autor, q);
  for (let i = 0; i < vs.length; i++) {
    const libres = await buscarUna(vs[i]);
    const ok = libres.find((im) => relevante(titulo, autor, im._ev));
    if (ok) return ok;
    if (i < vs.length - 1) await sleep(120);
  }
  return null;
}

// --- programa -----------------------------------------------------------------

const obras = JSON.parse(fs.readFileSync(OBRAS, "utf8"));
const cache = fs.existsSync(SALIDA) ? JSON.parse(fs.readFileSync(SALIDA, "utf8")) : {};

const META = new Map();
for (const lista of Object.values(obras)) {
  for (const o of lista) if (!META.has(o.q)) META.set(o.q, { titulo: o.titulo, autor: o.autor || "" });
}
const queries = [...META.keys()];

// Autolimpieza (sin red): descarta las imágenes cacheadas con evidencia que ya
// no pasan el guardián. Vuelven a la cola (o quedan sin imagen tras --purge-only).
let purgadas = 0;
for (const [q, c] of Object.entries(cache)) {
  if (!c || c.none || !c.thumb || !c._ev) continue;
  const m = META.get(q);
  if (m && !relevante(m.titulo, m.autor, c._ev)) {
    delete cache[q];
    purgadas++;
  }
}
if (purgadas) console.log(`Autolimpieza: ${purgadas} imágenes cacheadas ya no corresponden → descartadas.`);

if (PURGE_ONLY) {
  fs.writeFileSync(SALIDA, JSON.stringify(cache, null, 2) + "\n");
  const con = Object.values(cache).filter((v) => v.thumb).length;
  console.log(`Purga sin red. Con miniatura: ${con}/${queries.length}. Escrito: ${path.relative(ROOT, SALIDA)}`);
  process.exit(0);
}

// Pendientes: nuevas, "none" con --retry, y las viejas SIN evidencia (para
// re-verificarlas con el guardián y migrarlas).
const pendientes = queries.filter((q) => {
  const c = cache[q];
  if (!c) return true;
  if (c.none) return RETRY;
  if (c.thumb && !c._ev) return true;
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
  }
  done++;
  if (done % 20 === 0) {
    fs.writeFileSync(SALIDA, JSON.stringify(cache, null, 2) + "\n");
    console.log(`  … ${done}/${pendientes.length} (con imagen esta pasada: ${hits})`);
  }
  await sleep(150);
}

fs.writeFileSync(SALIDA, JSON.stringify(cache, null, 2) + "\n");
const conImagen = Object.values(cache).filter((v) => v.thumb).length;
console.log(`\nListo. Con miniatura: ${conImagen}/${queries.length}. Escrito: ${path.relative(ROOT, SALIDA)}`);
console.log("Ahora: npm run deploy:historia  (o npm run build) para publicar las imágenes.");
