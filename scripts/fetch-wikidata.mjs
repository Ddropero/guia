// Sube la cobertura de IMÁGENES LIBRES y de ENLACES EXACTOS a Wikipedia usando
// Wikidata como fuente estructurada. Para cada obra de src/data/obras.json
// resuelve su entidad de Wikidata y, SOLO si cuadra con la ficha, guarda su
// imagen (P18, revalidada como libre en Commons) y su artículo de Wikipedia en
// español (sitelink eswiki). Escribe src/data/obras-wikidata.json.
//
// ⚠ Necesita salida a internet → córrelo en tu máquina o en CI (en el sandbox
// de Claude la red está bloqueada). Es idempotente y reanudable: solo consulta
// las obras aún no resueltas.
//
//   node scripts/fetch-wikidata.mjs               # resuelve las pendientes
//   node scripts/fetch-wikidata.mjs --retry       # reintenta también las "none"
//   node scripts/fetch-wikidata.mjs --purge-only  # revalida la caché sin red y sale
//
// PRECISIÓN ANTES QUE COBERTURA: una entidad solo se acepta si su P31 la
// describe como obra/edificio/sitio Y una VERIFICACIÓN CRUZADA con la ficha
// cuadra (autor P170, fecha P571/P580/P585, o ubicación P195/P276) sin que
// ninguna la contradiga claramente. Si la ficha no trae autor/fecha/ubicación,
// se exige señal fuerte de título (todos los tokens distintivos en la etiqueta
// del item). Un match equivocado es peor que ninguno: sin confianza se marca
// { none:true } y el sitio usa las fuentes actuales (obras-imagenes.json /
// wikipediaBuscar()).
//
// La caché se re-valida en cada corrida y en --purge-only con las reglas
// vigentes usando la evidencia guardada (_ev) y esLibre() sobre la licencia: si
// se endurecen los criterios o una licencia deja de ser libre, esos matches se
// descartan y vuelven a la cola (autolimpieza), sin red.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OBRAS = path.join(ROOT, "src", "data", "obras.json");
const SALIDA = path.join(ROOT, "src", "data", "obras-wikidata.json");
const RETRY = process.argv.includes("--retry");
const PURGE_ONLY = process.argv.includes("--purge-only");
const UA = "curso-historia-del-arte/1.0 (https://historia.hilvan.org; educativo)";
const WD = "https://www.wikidata.org/w/api.php";
const COMMONS = "https://commons.wikimedia.org/w/api.php";
const FILEPATH = "https://commons.wikimedia.org/wiki/Special:FilePath/";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s) => (s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

// --- Convenciones compartidas con los otros scripts de fetch -----------------

const PARADAS = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "o", "u", "en", "un", "una", "al", "su", "sus", "con", "por", "para", "sobre", "the", "of", "and"]);

// Palabras tan frecuentes en títulos de obras que NO cuentan como evidencia de
// que la entidad sea ESTA obra (igual que en fetch-wikipedia.mjs).
const GENERICAS = new Set([
  "cabeza", "busto", "retrato", "autorretrato", "estatua", "escultura", "figura",
  "virgen", "cristo", "cruz", "crucifixion", "anunciacion", "madonna", "angel", "angeles",
  "san", "santa", "santo", "iglesia", "catedral", "basilica", "templo", "mezquita",
  "palacio", "casa", "torre", "puerta", "arco", "columna", "capilla", "cupula",
  "monumento", "tumba", "sarcofago", "altar", "mascara", "tesoro", "libro", "codice",
  "dama", "mujer", "hombre", "nino", "joven", "gran", "muerto", "muerta", "vista",
]);

// Ruido de los campos "autor" que en realidad son fichas descriptivas
// ("Autor: … Técnica: … Ubicación: …"): no son nombres propios del artista.
const RUIDO_AUTOR = new Set([
  "autor", "autora", "autores", "tecnica", "fecha", "tipo", "lengua", "original",
  "donde", "consultarlo", "obra", "colectiva", "colectivo", "anonimo", "anonima",
  "anonimos", "anonimas", "taller", "circulo", "escuela", "seguidor", "atribuido",
  "atribuida", "copia", "maestro", "corte", "manos", "varios", "varias", "estilo",
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

function normalizar(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

// P31 (instancia de) admisible: la etiqueta del tipo debe describir una obra de
// arte, un edificio o un sitio/artefacto. Comparado sin tildes, en minúsculas.
const TIPO_RE =
  /pintur|dibujo|escultur|estatu|busto|reliev|mural|fresco|mosaico|retablo|cuadro|oleo|lienzo|grabado|estamp|tabla|triptic|diptic|obra de arte|obra arquitect|arquitect|edifici|inmueble|iglesia|catedral|basilic|colegiat|capilla|ermita|monasteri|abadia|convento|templo|mezquita|sinagog|palaci|palatin|castillo|alcazar|fortalez|muralla|torre|faro|puente|acueduct|anfiteatr|teatro|coliseo|termas|arco|obelisc|columna|monument|mausole|tumba|panteon|necropoli|hipogeo|piramid|zigurat|stupa|estupa|pagoda|dolmen|menhir|megalit|crater|vasija|ceramic|jarron|anfora|kylix|manuscrit|codice|miniatur|estela|sarcofag|mascara|tapiz|alfombra|orfebr|joya|corona|diadem|geoglifo|monticul|santuari|yacimiento|arqueolog|sitio|complejo|recinto|ruinas|cueva|caverna|gruta|abrigo|calzada|jardin|fuente|instalacion/;

// --- Licencias libres de Commons: reutilizada TAL CUAL de fetch-imagenes.mjs --
// Acepta: dominio público, CC0, CC BY, CC BY-SA. Rechaza: NC, ND, fair use.
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

// --- Años de la ficha (fecha) ------------------------------------------------
// Formatos reales: "c. 1503–1519", "c. 40.000–35.000 a. C.", "447–432 a. C.",
// "1917 (…)", "s. I–II d. C.", "h. 530 a. e. c.". Devuelve enteros con signo
// (negativo = a. C.) y rangos de siglos aparte.

const ROMANOS = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };
function romanoAInt(s) {
  s = s.toLowerCase();
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const v = ROMANOS[s[i]];
    if (!v) return null;
    const sig = ROMANOS[s[i + 1]];
    total += sig && sig > v ? -v : v;
  }
  return total || null;
}

// ¿La fecha que empieza en `desde` es "antes de Cristo / antes de la era común"?
// Distingue a. C. / a. e. c. (BC) de d. C. / e. c. (AD, era común sin 'a'). Mira
// primero una ventana cercana (así "s. I e. c." no hereda el "a. e. c." de otra
// cláusula del mismo string); si no hay marcador cercano, usa el primero del resto.
function esAC(cadena, desde) {
  const cerca = cadena.slice(desde, desde + 14);
  if (/a\.?\s*e?\.?\s*c/.test(cerca)) return true; // a.C. / a.e.c. cerca → BC
  if (/[ed]\.?\s*c/.test(cerca)) return false; // e.c. / d.c. cerca (sin 'a') → AD
  const tail = cadena.slice(desde);
  const ac = tail.search(/a\.?\s*e?\.?\s*c/);
  if (ac < 0) return false; // por defecto AD (era común / d. C.)
  const dc = tail.search(/(?:^|[^a])[ed]\.?\s*c/); // e.c./d.c. no precedido de 'a'
  return dc < 0 || ac < dc;
}

function fechaFicha(fecha) {
  const s = normalizar(fecha);
  const anios = [];
  // años en cifras árabes (con puntos de millar): 40.000, 1503, 530…
  const re = /\d[\d.]*/g;
  let m;
  while ((m = re.exec(s))) {
    const n = parseInt(m[0].replace(/\./g, ""), 10);
    if (!Number.isFinite(n) || n === 0 || n > 100000) continue;
    anios.push(esAC(s, m.index + m[0].length) ? -n : n);
  }
  // siglos en números romanos: "s. XVIII", "ss. XIV–XVII", "siglo I", "siglos IX–X".
  // Exige la abreviatura con punto ("s."/"ss.") o la palabra completa ("siglo[s]")
  // y remata el romano en \b para no comer letras romanas dentro de otras palabras
  // ("sitúan"→"si", "de"→"d").
  const siglos = [];
  const rs = /\b(?:ss?\.|siglos?)\s*([ivxlcdm]+)\b(?:\s*[-–]\s*([ivxlcdm]+)\b)?/gi;
  while ((m = rs.exec(s))) {
    const a = romanoAInt(m[1]);
    const b = m[2] ? romanoAInt(m[2]) : a;
    if (!a || !b) continue;
    const ac = esAC(s, m.index + m[0].length);
    const lo = Math.min(a, b), hi = Math.max(a, b);
    // siglo N d.C. → años [(N-1)*100+1, N*100]; a.C. → negativo
    if (ac) siglos.push([-hi * 100, -((lo - 1) * 100 + 1)]);
    else siglos.push([(lo - 1) * 100 + 1, hi * 100]);
  }
  return { anios, siglos };
}

// Año de un valor "time" de Wikidata: "+1503-04-01T00:00:00Z" → 1503;
// "-0044-…" → -44 (el desfase proléptico de 1 año lo absorbe la tolerancia).
function anioWiki(time) {
  const m = /^([+-])0*(\d+)-/.exec(time || "");
  if (!m) return null;
  const y = parseInt(m[2], 10);
  return m[1] === "-" ? -y : y;
}

// ¿Cae `y` dentro de la fecha de la ficha, con tolerancia `tol`?
function anioCuadra(y, ficha, tol) {
  for (const a of ficha.anios) if (Math.abs(a - y) <= tol) return true;
  for (const [lo, hi] of ficha.siglos) if (y >= lo - tol && y <= hi + tol) return true;
  return false;
}

// --- Extracción de hechos de una entidad de Wikidata -------------------------

function qids(entidad, prop) {
  const arr = entidad?.claims?.[prop] || [];
  const out = [];
  for (const c of arr) {
    if (c?.mainsnak?.snaktype !== "value") continue;
    const id = c.mainsnak.datavalue?.value?.id;
    if (id) out.push(id);
  }
  return out;
}

function tiempos(entidad, props) {
  const out = [];
  for (const prop of props) {
    for (const c of entidad?.claims?.[prop] || []) {
      if (c?.mainsnak?.snaktype !== "value") continue;
      const y = anioWiki(c.mainsnak.datavalue?.value?.time);
      if (y != null) out.push(y);
    }
  }
  return out;
}

function imagenP18(entidad) {
  for (const c of entidad?.claims?.P18 || []) {
    if (c?.mainsnak?.snaktype !== "value") continue;
    const nombre = c.mainsnak.datavalue?.value;
    if (typeof nombre === "string" && nombre) return nombre;
  }
  return null;
}

function etiqueta(entidad) {
  return entidad?.labels?.es?.value || entidad?.labels?.en?.value || "";
}

// Reúne las etiquetas de una lista de QIDs a partir del mapa ya descargado.
function etiquetasDe(ids, mapa) {
  return ids.map((id) => etiqueta(mapa[id])).filter(Boolean);
}

// --- Decisión de aceptación (pura; se reusa en la corrida y en --purge-only) --
// `ev` = evidencia resuelta de la entidad: { label, tipos[], autores[], lugares[], anios[] }.
function decidir(ficha, ev) {
  const p31EsObra = ev.tipos.some((t) => TIPO_RE.test(normalizar(t)));
  if (!p31EsObra) return false;

  const distTitulo = tokens(ficha.titulo).filter((t) => !GENERICAS.has(t));
  const enLabel = new Set(tokens(ev.label));
  const tituloFuerte = distTitulo.length > 0 && distTitulo.every((t) => enLabel.has(t));

  // Autor de la ficha, quitando ruido de campos descriptivos.
  const autorTokens = tokens(ficha.autor).filter((t) => !RUIDO_AUTOR.has(t) && t.length >= 4);
  const hayAutorPropio = autorTokens.length > 0 && /[A-ZÁÉÍÓÚÑ]/.test(ficha.autor) && !/an[oó]nim/i.test(ficha.autor);
  const autoresTok = new Set(ev.autores.flatMap((l) => tokens(l)).filter((t) => t.length >= 4));
  const autorMatch = autorTokens.some((t) => autoresTok.has(t));
  // Contradicción de autor: ambos lados con nombre propio y CERO tokens en común
  // (y la ficha no es taller/atribución, donde discrepar es esperable).
  const fichaFlexible = /an[oó]nim|taller|c[ií]rculo|escuela|seguidor|atribu|copia|maestro de/i.test(ficha.autor);
  const autorContradice = hayAutorPropio && !fichaFlexible && autoresTok.size > 0 && !autorMatch;

  // Fecha.
  const hayFecha = ficha.fecha.anios.length > 0 || ficha.fecha.siglos.length > 0;
  const fechaMatch = hayFecha && ev.anios.some((y) => anioCuadra(y, ficha.fecha, 15));
  // Contradicción de fecha: la ficha tiene años concretos, la entidad también,
  // y NINGUNO cae dentro ni con tolerancia amplia (mata homónimos de otra época).
  const fechaContradice =
    ficha.fecha.anios.length > 0 && ev.anios.length > 0 && !ev.anios.some((y) => anioCuadra(y, ficha.fecha, 60));

  // Ubicación.
  const ubicTokens = new Set(tokens(ficha.ubicacion).filter((t) => t.length >= 4));
  const lugaresTok = ev.lugares.flatMap((l) => tokens(l)).filter((t) => t.length >= 4);
  const hayUbic = ubicTokens.size > 0;
  const ubicMatch = hayUbic && lugaresTok.some((t) => ubicTokens.has(t));

  if (autorContradice || fechaContradice) return false;

  const positivos = [autorMatch, fechaMatch, ubicMatch].filter(Boolean).length;
  const tieneDatosFicha = hayAutorPropio || hayFecha || hayUbic;

  if (tieneDatosFicha) return positivos >= 1; // al menos una cuadra, ninguna contradice
  return tituloFuerte; // sin datos que cruzar → exigir señal fuerte de título
}

// --- Peticiones HTTP ---------------------------------------------------------

async function pedirJson(url) {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// wbsearchentities: título → hasta 7 QID candidatos.
async function buscarCandidatos(titulo) {
  const url =
    `${WD}?action=wbsearchentities&format=json&language=es&uselang=es&type=item&limit=7` +
    `&search=${encodeURIComponent(titulo)}`;
  const data = await pedirJson(url);
  return (data?.search || []).map((r) => r.id).filter(Boolean);
}

// wbgetentities por lotes de 50: claims|labels|sitelinks/urls (eswiki).
async function getEntities(ids, props) {
  const mapa = {};
  for (let i = 0; i < ids.length; i += 50) {
    const lote = ids.slice(i, i + 50);
    const url =
      `${WD}?action=wbgetentities&format=json&languages=es|en&sitefilter=eswiki` +
      `&props=${encodeURIComponent(props)}&ids=${encodeURIComponent(lote.join("|"))}`;
    const data = await pedirJson(url);
    Object.assign(mapa, data?.entities || {});
    if (i + 50 < ids.length) await sleep(120);
  }
  return mapa;
}

// Verifica en Commons que el P18 es libre; devuelve {thumb, enlace, licencia, credito}.
async function imagenLibre(nombreArchivo) {
  const titulo = `File:${nombreArchivo}`;
  const url =
    `${COMMONS}?action=query&format=json&titles=${encodeURIComponent(titulo)}` +
    `&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=800`;
  const data = await pedirJson(url);
  const pages = Object.values(data?.query?.pages || {});
  const ii = pages[0]?.imageinfo?.[0];
  if (!ii) return null;
  if (ii.mime && !/^image\//.test(ii.mime)) return null;
  const meta = ii.extmetadata || {};
  if (!esLibre(meta)) return null;
  return {
    // Preferimos el thumburl de upload.wikimedia (encaja con el patrón "NNNpx-"
    // que fullDe() sube a 1600px en el visor); si falta, Special:FilePath?width=800.
    thumb: ii.thumburl || `${FILEPATH}${encodeURIComponent(nombreArchivo)}?width=800`,
    enlace: ii.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(titulo)}`,
    licencia: stripHtml(meta.LicenseShortName?.value) || "Dominio público",
    credito: stripHtml(meta.Artist?.value) || stripHtml(meta.Credit?.value) || undefined,
  };
}

// --- Resolución de una obra --------------------------------------------------

async function resolver(ficha) {
  const candidatos = await buscarCandidatos(ficha.titulo);
  if (!candidatos.length) return { none: true };

  await sleep(120);
  const ents = await getEntities(candidatos, "claims|labels|sitelinks/urls");

  // Reúne todos los QID referenciados (tipos/autores/lugares) y baja sus etiquetas.
  const refs = new Set();
  for (const id of candidatos) {
    const e = ents[id];
    if (!e) continue;
    for (const r of [...qids(e, "P31"), ...qids(e, "P170"), ...qids(e, "P195"), ...qids(e, "P276")]) refs.add(r);
  }
  let etiquetas = {};
  if (refs.size) {
    await sleep(120);
    etiquetas = await getEntities([...refs], "labels");
  }

  // Evalúa candidatos en el orden del buscador; se queda con el primero que pase.
  for (const id of candidatos) {
    const e = ents[id];
    if (!e || e.missing !== undefined) continue;
    const ev = {
      label: etiqueta(e),
      tipos: etiquetasDe(qids(e, "P31"), etiquetas),
      autores: etiquetasDe(qids(e, "P170"), etiquetas),
      lugares: [...etiquetasDe(qids(e, "P195"), etiquetas), ...etiquetasDe(qids(e, "P276"), etiquetas)],
      anios: tiempos(e, ["P571", "P580", "P585", "P582", "P577"]),
    };
    if (!decidir(ficha, ev)) continue;

    const entrada = { qid: id, _ev: ev };
    const wiki = e.sitelinks?.eswiki;
    if (wiki?.title) {
      entrada.wikipedia = wiki.url || `https://es.wikipedia.org/wiki/${encodeURIComponent(wiki.title.replace(/ /g, "_"))}`;
    }
    const archivo = imagenP18(e);
    if (archivo) {
      try {
        const img = await imagenLibre(archivo);
        if (img) entrada.imagen = img;
      } catch {
        /* fallo en Commons: guardamos qid/wikipedia igualmente; --retry no aplica a aceptados */
      }
    }
    return entrada;
  }
  return { none: true };
}

// --- Carga de datos y contexto por consulta ---------------------------------

const obras = JSON.parse(fs.readFileSync(OBRAS, "utf8"));
const cache = fs.existsSync(SALIDA) ? JSON.parse(fs.readFileSync(SALIDA, "utf8")) : {};

// q → ficha (primera aparición) con fecha ya parseada a años/siglos.
const FICHA = new Map();
for (const lista of Object.values(obras)) {
  for (const o of lista) {
    if (FICHA.has(o.q)) continue;
    FICHA.set(o.q, {
      titulo: o.titulo || "",
      autor: o.autor || "",
      ubicacion: o.ubicacion || "",
      fecha: fechaFicha(o.fecha || ""),
    });
  }
}

// --- Autolimpieza: revalida los aceptados con las reglas y licencias vigentes -
function revalidar() {
  let purgados = 0;
  let imgPurgadas = 0;
  for (const [q, c] of Object.entries(cache)) {
    if (!c || c.none) continue;
    const ficha = FICHA.get(q);
    // Sin ficha (obra eliminada) o el cruce ya no pasa → fuera, vuelve a la cola.
    if (!ficha || (c._ev && !decidir(ficha, c._ev))) {
      delete cache[q];
      purgados++;
      continue;
    }
    // Licencia que dejó de ser libre → quita solo la imagen (conserva qid/wikipedia).
    if (c.imagen && !esLibre({ LicenseShortName: { value: c.imagen.licencia || "" } })) {
      delete c.imagen;
      imgPurgadas++;
    }
  }
  if (purgados) console.log(`Autolimpieza: ${purgados} matches ya no pasan las reglas → vuelven a la cola.`);
  if (imgPurgadas) console.log(`Autolimpieza: ${imgPurgadas} imágenes dejaron de ser libres → retiradas.`);
}

revalidar();

const queries = [...FICHA.keys()];
const pendientes = queries.filter((q) => {
  const c = cache[q];
  if (!c) return true;
  if (c.none && RETRY) return true;
  return false;
});

function resumen(prefijo) {
  const acept = Object.values(cache).filter((v) => v && !v.none);
  const conQid = acept.filter((v) => v.qid).length;
  const conImg = acept.filter((v) => v.imagen?.thumb).length;
  const conWiki = acept.filter((v) => v.wikipedia).length;
  console.log(`${prefijo} Total: ${queries.length} · con QID: ${conQid} · con imagen: ${conImg} · con Wikipedia: ${conWiki} · pendientes: ${pendientes.length}`);
}

function escribir() {
  fs.writeFileSync(SALIDA, JSON.stringify(cache, null, 2) + "\n");
}

if (PURGE_ONLY) {
  escribir();
  resumen("Purga sin red.");
  console.log(`Escrito: ${path.relative(ROOT, SALIDA)}`);
  process.exit(0);
}

console.log(`Obras únicas: ${queries.length} · pendientes: ${pendientes.length}`);
let hits = 0;
let done = 0;

for (const q of pendientes) {
  const ficha = FICHA.get(q);
  try {
    const r = await resolver(ficha);
    cache[q] = r;
    if (!r.none) hits++;
  } catch (e) {
    console.log(`  ! error en "${q}": ${e.message} (se reintentará en otra pasada)`);
    // no cachear en error transitorio
  }
  done++;
  if (done % 20 === 0) {
    escribir();
    console.log(`  … ${done}/${pendientes.length} (aceptadas esta pasada: ${hits})`);
  }
  await sleep(250); // cortesía con Wikidata/Commons (varias peticiones por obra)
}

escribir();
resumen("\nListo.");
console.log(`Escrito: ${path.relative(ROOT, SALIDA)}`);
console.log("Ahora: corre npm run deploy:historia  (o npm run build) para publicar imágenes y enlaces.");
