// Resuelve el artículo EXACTO de Wikipedia en español para las obras del
// curso (en vez de un enlace de búsqueda genérico). Escribe
// src/data/obras-wikipedia.json.
//
// ⚠ Necesita salida a internet → córrelo en tu máquina o en CI (en el sandbox
// de Claude la red está bloqueada). Es idempotente y reanudable: solo consulta
// las obras aún no resueltas.
//
//   node scripts/fetch-wikipedia.mjs           # resuelve las pendientes
//   node scripts/fetch-wikipedia.mjs --retry   # reintenta también las "sin artículo"
//
// Solo guarda un enlace cuando hay un artículo razonablemente verificado: el
// título candidato comparte al menos una palabra significativa con la ficha
// de la obra, y la página no es una desambiguación. Si no hay match de
// confianza, el sitio usa wikipediaBuscar() (src/lib/obras.ts) como respaldo:
// nunca queda un enlace roto o que apunte a otra cosa.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OBRAS = path.join(ROOT, "src", "data", "obras.json");
const SALIDA = path.join(ROOT, "src", "data", "obras-wikipedia.json");
const RETRY = process.argv.includes("--retry");
const UA = "curso-historia-del-arte/1.0 (https://historia.hilvan.org; educativo)";
const API = "https://es.wikipedia.org/w/api.php";
const REST = "https://es.wikipedia.org/api/rest_v1/page/summary/";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PARADAS = new Set(["de", "del", "la", "las", "el", "los", "y", "en", "un", "una", "al", "su", "sus", "con"]);

function tokens(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // sin tildes (marcas combinadas tras NFD)
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !PARADAS.has(t));
}

// ¿El título candidato comparte al menos una palabra significativa con la
// búsqueda? Filtro mínimo para no colgar el enlace de una obra a un artículo
// sin relación real.
function solapan(q, titulo) {
  const a = new Set(tokens(q));
  return tokens(titulo).some((t) => a.has(t));
}

async function buscar(q) {
  const url = `${API}?action=opensearch&format=json&namespace=0&limit=3&search=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} (opensearch)`);
  const [, titulos, , urls] = await res.json();
  if (!titulos?.length) return null;

  for (let i = 0; i < titulos.length; i++) {
    if (!solapan(q, titulos[i])) continue;
    const r = await fetch(`${REST}${encodeURIComponent(titulos[i])}`, { headers: { "user-agent": UA } });
    if (!r.ok) continue;
    const resumen = await r.json();
    if (resumen.type === "disambiguation" || resumen.type === "no-extract") continue;
    return {
      titulo: resumen.title || titulos[i],
      url: resumen.content_urls?.desktop?.page || urls[i],
      extracto: resumen.extract,
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
    console.log(`  … ${done}/${pendientes.length} (con artículo: ${hits})`);
  }
  await sleep(200); // cortesía con la API de Wikipedia (2 peticiones por obra)
}

fs.writeFileSync(SALIDA, JSON.stringify(cache, null, 2) + "\n");
const conArticulo = Object.values(cache).filter((v) => v.url).length;
console.log(`\nListo. Con artículo: ${conArticulo}/${queries.length}. Escrito: ${path.relative(ROOT, SALIDA)}`);
console.log("Ahora: npm run deploy:historia  (o npm run build) para publicar los enlaces.");
