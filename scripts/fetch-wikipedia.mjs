// Resuelve el artículo EXACTO de Wikipedia en español para las obras del
// curso (en vez de un enlace de búsqueda genérico). Escribe
// src/data/obras-wikipedia.json.
//
// ⚠ Necesita salida a internet → córrelo en tu máquina o en CI (en el sandbox
// de Claude la red está bloqueada). Es idempotente y reanudable: solo consulta
// las obras aún no resueltas.
//
//   node scripts/fetch-wikipedia.mjs               # resuelve las pendientes
//   node scripts/fetch-wikipedia.mjs --retry       # reintenta también las "sin artículo"
//   node scripts/fetch-wikipedia.mjs --purge-only  # re-valida la caché sin red y sale
//
// PRECISIÓN ANTES QUE COBERTURA: solo se guarda un enlace cuando el artículo
// pasa todas las verificaciones de `aceptar()` (tokens distintivos presentes,
// paréntesis sin entidades desconocidas, mención del autor si lo hay, no
// desambiguación). Un enlace equivocado es peor que ninguno: sin match de
// confianza, el sitio usa wikipediaBuscar() (src/lib/obras.ts) como respaldo.
//
// La caché se re-valida en cada corrida con las reglas vigentes: si se
// endurecen los criterios, los matches viejos que ya no pasan se descartan y
// vuelven a la cola (autolimpieza).
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OBRAS = path.join(ROOT, "src", "data", "obras.json");
const SALIDA = path.join(ROOT, "src", "data", "obras-wikipedia.json");
const RETRY = process.argv.includes("--retry");
const PURGE_ONLY = process.argv.includes("--purge-only");
const UA = "curso-historia-del-arte/1.0 (https://historia.hilvan.org; educativo)";
const API = "https://es.wikipedia.org/w/api.php";
const REST = "https://es.wikipedia.org/api/rest_v1/page/summary/";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PARADAS = new Set(["de", "del", "la", "las", "el", "los", "y", "en", "un", "una", "al", "su", "sus", "con", "por", "para", "sobre"]);

// Palabras tan frecuentes en títulos de obras que NO cuentan como evidencia
// de que el artículo hable de ESTA obra ("Cabeza de Warka" no es la cabeza de
// Kafka de Praga aunque ambas sean "cabeza").
const GENERICAS = new Set([
  "cabeza", "busto", "retrato", "autorretrato", "estatua", "escultura", "figura",
  "virgen", "cristo", "cruz", "crucifixion", "anunciacion", "madonna", "angel", "angeles",
  "san", "santa", "santo", "iglesia", "catedral", "basilica", "templo", "mezquita",
  "palacio", "casa", "torre", "puerta", "arco", "columna", "capilla", "cupula",
  "monumento", "tumba", "sarcofago", "altar", "mascara", "tesoro", "libro", "codice",
  "dama", "mujer", "hombre", "nino", "joven", "gran", "muerto", "muerta", "vista",
]);

function tokens(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // sin tildes (marcas combinadas tras NFD)
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !PARADAS.has(t));
}

// ¿El extracto describe una obra de arte, edificio o sitio (y no un concepto,
// una persona o un lugar homónimos)? Se compara sin tildes y en minúsculas.
const ARTE_RE =
  /escultor|escultur|pintor|pintur|artista|fresco|mural|cuadro|estatu|figur|reliev|mosaico|retablo|manuscrit|codice|miniatur|templo|catedral|iglesia|mezquita|basilic|palaci|palatin|edifici|arquitect|monument|megalit|yacimiento|arqueolog|mausoleo|piramid|ceramic|orfebr|mascara|tapiz|alfombra|vasija|bronce|marmol|oleo|lienzo|grabado|estela|sarcofago|geoglifo|monticulo|santuario|artefacto|paleta|efigie|fortaleza|anfiteatro|acueducto|stupa|pagoda|zigurat|dolmen|menhir|cripta|capilla|baldaquino|talla|capitel|cupula/;

function normalizar(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/**
 * ¿Este artículo es, con confianza, el de ESTA obra? Reglas (todas deben
 * cumplirse; cada una mata una clase real de falso positivo observada):
 * 1. Los paréntesis del título no introducen tokens desconocidos
 *    (mata "Loba Capitolina (Talca)", "Anunciación (Leonardo, Uffizi)"
 *    cuando la ficha no menciona a Leonardo).
 * 2. El cuerpo del título tiene como mucho 1 token ajeno a la ficha
 *    (mata "Coliseo del Caesars Palace", "Cabeza de Franz Kafka").
 * 3. La ficha tiene al menos un token distintivo (no genérico) y TODOS
 *    aparecen en título+extracto (mata "Cabeza Nok" → "Cabeza colosal",
 *    "Taj Mahal, Agra" → la banda "Taj Mahal Travellers").
 * 4. Al menos un token distintivo aparece en el propio título.
 * 5. Si la obra tiene autor, el artículo lo menciona (mata "David" →
 *    el rey bíblico cuando la obra es la escultura de Donatello).
 * 6. Sin autor que confirme, las primeras frases del extracto (las
 *    definicionales: "X es un/una…") deben describir una obra/edificio
 *    (mata "El Panteón" → localidad peruana, "Juicio Final" → concepto
 *    religioso, "David" → el rey, cuyo artículo menciona esculturas solo
 *    de pasada).
 */
function aceptar(q, autor, titulo, extracto) {
  const qT = tokens(q);
  const aT = tokens(autor);
  const contexto = new Set([...qT, ...aT]);

  const parens = [...(titulo || "").matchAll(/\(([^)]*)\)/g)].map((m) => m[1]).join(" ");
  const cuerpo = (titulo || "").replace(/\([^)]*\)/g, " ");
  const pT = tokens(parens);
  const cT = tokens(cuerpo);

  if (pT.some((t) => !contexto.has(t))) return false; // regla 1
  if (cT.filter((t) => !contexto.has(t)).length > 1) return false; // regla 2

  const enTitulo = new Set([...cT, ...pT]);
  const enTodo = new Set([...enTitulo, ...tokens(extracto)]);

  const distintivos = qT.filter((t) => !GENERICAS.has(t));
  if (!distintivos.length) return false; // sin señal distintiva, no fiarse
  if (distintivos.some((t) => !enTodo.has(t))) return false; // regla 3
  if (!distintivos.some((t) => enTitulo.has(t))) return false; // regla 4

  if (aT.length && !aT.some((t) => enTodo.has(t))) return false; // regla 5
  if (!aT.length) {
    // regla 6: solo las dos primeras frases (las definicionales)
    const frases = normalizar(extracto).split(/(?<=\.)\s+/).slice(0, 2).join(" ");
    if (!ARTE_RE.test(frases)) return false;
  }
  return true;
}

async function buscar(q, autor) {
  const url = `${API}?action=opensearch&format=json&namespace=0&limit=6&search=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} (opensearch)`);
  const [, titulos, , urls] = await res.json();
  if (!titulos?.length) return null;

  for (let i = 0; i < titulos.length; i++) {
    const r = await fetch(`${REST}${encodeURIComponent(titulos[i])}`, { headers: { "user-agent": UA } });
    if (!r.ok) continue;
    const resumen = await r.json();
    if (resumen.type === "disambiguation" || resumen.type === "no-extract") continue;
    const titulo = resumen.title || titulos[i];
    if (!aceptar(q, autor, titulo, resumen.extract)) continue;
    return {
      titulo,
      url: resumen.content_urls?.desktop?.page || urls[i],
      extracto: resumen.extract,
    };
  }
  return null;
}

const obras = JSON.parse(fs.readFileSync(OBRAS, "utf8"));
const cache = fs.existsSync(SALIDA) ? JSON.parse(fs.readFileSync(SALIDA, "utf8")) : {};

// contexto autor por consulta (primera ficha con autor no vacío)
const AUTOR = new Map();
for (const lista of Object.values(obras)) {
  for (const o of lista) {
    if (!AUTOR.get(o.q) && o.autor) AUTOR.set(o.q, o.autor);
    if (!AUTOR.has(o.q)) AUTOR.set(o.q, "");
  }
}

// autolimpieza: re-valida los matches cacheados con las reglas vigentes
let purgados = 0;
for (const [q, c] of Object.entries(cache)) {
  if (!c || c.none || !c.url) continue;
  if (!aceptar(q, AUTOR.get(q) || "", c.titulo, c.extracto)) {
    delete cache[q];
    purgados++;
  }
}
if (purgados) console.log(`Autolimpieza: ${purgados} matches viejos ya no pasan las reglas → vuelven a la cola.`);

// queries únicas
const queries = [...new Set(Object.values(obras).flat().map((o) => o.q))];
const pendientes = queries.filter((q) => {
  const c = cache[q];
  if (!c) return true;
  if (c.none && RETRY) return true;
  return false;
});

if (PURGE_ONLY) {
  fs.writeFileSync(SALIDA, JSON.stringify(cache, null, 2) + "\n");
  const conArticulo = Object.values(cache).filter((v) => v.url).length;
  console.log(`Purga sin red. Con artículo: ${conArticulo}/${queries.length} · pendientes: ${pendientes.length}. Escrito: ${path.relative(ROOT, SALIDA)}`);
  process.exit(0);
}

console.log(`Obras únicas: ${queries.length} · pendientes: ${pendientes.length}`);
let hits = 0;
let done = 0;

for (const q of pendientes) {
  try {
    const r = await buscar(q, AUTOR.get(q) || "");
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
    console.log(`  … ${done}/${pendientes.length} (con artículo: ${hits})`);
  }
  await sleep(250); // cortesía con la API de Wikipedia (varias peticiones por obra)
}

fs.writeFileSync(SALIDA, JSON.stringify(cache, null, 2) + "\n");
const conArticulo = Object.values(cache).filter((v) => v.url).length;
console.log(`\nListo. Con artículo: ${conArticulo}/${queries.length}. Escrito: ${path.relative(ROOT, SALIDA)}`);
console.log("Ahora: npm run deploy:historia  (o npm run build) para publicar los enlaces.");
