#!/usr/bin/env node
/**
 * fijar-imagenes.mjs — recupera imágenes CORRECTAS para las obras blanqueadas.
 *
 * Contexto: la curación visual dejó en blanco (none:true) las obras cuya imagen
 * automática no correspondía. Muchas son obras famosas que SÍ tienen una imagen
 * libre en Wikimedia; solo la búsqueda ingenua cogía la equivocada.
 *
 * Este script toma los candidatos que propusieron los subagentes
 * (src/data/_candidatos-imagenes.json: título canónico en inglés, autor y, si se
 * conoce, el archivo exacto de Commons) y, CON RED, verifica y fija la imagen
 * real en src/data/obras-imagenes-override.json. Para cada obra blanqueada:
 *   1) si hay commonsFile propuesto → se comprueba ese archivo;
 *   2) si no, Wikidata: se busca la obra por su título y se toma su imagen P18;
 *   3) si no, búsqueda en Commons con términos canónicos + guardián de relevancia.
 * Solo se fija lo que existe Y tiene licencia libre (dominio público o CC sin
 * NC/ND). Lo que no se verifica se queda en blanco. NUNCA se inventa una URL.
 *
 * Idempotente: solo procesa entradas que siguen en {none:true}; re-ejecutar
 * retoma lo que falta. `--dry-run` muestra lo que fijaría sin escribir.
 *
 * Uso:  node scripts/fijar-imagenes.mjs [--dry-run] [--solo-archivo]
 *   --dry-run       no escribe; solo informa.
 *   --solo-archivo  usa únicamente el commonsFile propuesto (sin Wikidata/búsqueda).
 */
import fs from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();
const DATA = path.join(RAIZ, "src", "data");
const F_OVERRIDE = path.join(DATA, "obras-imagenes-override.json");
const F_CAND = path.join(DATA, "_candidatos-imagenes.json");

const DRY = process.argv.includes("--dry-run");
const SOLO_ARCHIVO = process.argv.includes("--solo-archivo");

const UA = "curso-historia-del-arte/1.0 (https://historia.hilvan.org; educativo)";
const COMMONS = "https://commons.wikimedia.org/w/api.php";
const WIKIDATA = "https://www.wikidata.org/w/api.php";
const ANCHO = 1024;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s) => (s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const IMG_MIME = /^image\/(jpeg|png|tiff|gif|webp)$/;

async function api(base, params) {
  const url = base + "?format=json&origin=*&" + new URLSearchParams(params).toString();
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${base}`);
  return res.json();
}

// ¿Licencia libre (dominio público o CC sin NC/ND)?
function esLibre(meta) {
  if (meta?.PublicDomain?.value) return true;
  const txt = `${meta?.License?.value || ""} ${meta?.LicenseShortName?.value || ""}`.toLowerCase();
  if (/fair use|non-free|no-?libre|copyright|todos los derechos|all rights/.test(txt)) return false;
  if (/[-\s](nc|nd)\b|non[-\s]?commercial|no[-\s]?comercial|no[-\s]?deriv/.test(txt)) return false;
  return /public domain|dominio p|\bpd\b|cc0|cc[ -]?by\b/.test(txt);
}

const norm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const PARADAS = new Set(["the", "of", "and", "a", "de", "la", "el", "los", "las", "y", "in", "at", "on"]);

// Tokens distintivos (>=4) para el guardián de relevancia de la búsqueda.
function tokens(s) {
  return norm(s).split(/\s+/).filter((t) => t.length >= 4 && !PARADAS.has(t));
}
function relevante(consulta, evidencia) {
  const want = new Set(tokens(consulta));
  if (!want.size) return true; // sin tokens fuertes: aceptar (mejor esfuerzo)
  const ev = norm(evidencia);
  for (const t of want) if (ev.includes(t.slice(0, 5))) return true;
  return false;
}

// Convierte la respuesta imageinfo de una página en un registro de imagen libre.
function deImageinfo(pagina) {
  const ii = pagina?.imageinfo?.[0];
  if (!ii || !ii.thumburl || !IMG_MIME.test(ii.mime || "")) return null;
  const meta = ii.extmetadata || {};
  if (!esLibre(meta)) return null;
  return {
    thumb: ii.thumburl,
    enlace: ii.descriptionshorturl || ii.descriptionurl || "",
    credito: stripHtml(meta.Artist?.value) || undefined,
    licencia: stripHtml(meta.LicenseShortName?.value) || "Dominio público",
    _ev: [pagina.title, stripHtml(meta.ObjectName?.value), stripHtml(meta.ImageDescription?.value),
      stripHtml(meta.Categories?.value), stripHtml(meta.Artist?.value)].filter(Boolean).join(" · "),
  };
}

// 1) Archivo exacto de Commons.
async function porArchivo(file) {
  const titulo = "File:" + file.replace(/^File:/i, "");
  const j = await api(COMMONS, {
    action: "query", titles: titulo,
    prop: "imageinfo", iiprop: "url|extmetadata|mime", iiurlwidth: String(ANCHO),
  });
  const pags = j?.query?.pages || {};
  for (const k in pags) {
    if (pags[k].missing !== undefined) return null;
    const r = deImageinfo(pags[k]);
    if (r) return { ...r, _via: "commonsFile" };
  }
  return null;
}

// 2) Imagen P18 de la entidad de Wikidata que corresponde a la obra.
async function porWikidata(tituloEN) {
  const j = await api(WIKIDATA, {
    action: "wbsearchentities", search: tituloEN, language: "en",
    uselang: "en", type: "item", limit: "5",
  });
  const hits = j?.search || [];
  const quiero = new Set(tokens(tituloEN));
  for (const h of hits) {
    // el rótulo debe compartir un token distintivo con el título (evita homónimos)
    const etiqueta = norm(`${h.label || ""} ${h.description || ""}`);
    if (quiero.size && ![...quiero].some((t) => etiqueta.includes(t.slice(0, 5)))) continue;
    await sleep(150);
    const e = await api(WIKIDATA, { action: "wbgetentities", ids: h.id, props: "claims" });
    const claims = e?.entities?.[h.id]?.claims || {};
    const p18 = claims.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!p18) continue;
    const r = await porArchivo(p18);
    if (r) return { ...r, _via: "wikidata:" + h.id };
  }
  return null;
}

// 3) Búsqueda en Commons con términos canónicos + guardián de relevancia.
async function porBusqueda(query, tituloEN, autor) {
  const j = await api(COMMONS, {
    action: "query", generator: "search", gsrsearch: query,
    gsrnamespace: "6", gsrlimit: "12",
    prop: "imageinfo", iiprop: "url|extmetadata|mime", iiurlwidth: String(ANCHO),
  });
  const pags = Object.values(j?.query?.pages || {});
  pags.sort((a, b) => (a.index || 0) - (b.index || 0));
  const consulta = `${tituloEN} ${autor}`;
  for (const p of pags) {
    const r = deImageinfo(p);
    if (r && relevante(consulta, `${r._ev}`)) return { ...r, _via: "commons-search" };
  }
  return null;
}

async function resolver(c) {
  if (c.commonsFile) {
    const r = await porArchivo(c.commonsFile);
    if (r) return r;
  }
  if (SOLO_ARCHIVO) return null;
  if (c.tituloEN) {
    await sleep(150);
    const r = await porWikidata(c.tituloEN);
    if (r) return r;
  }
  const query = c.buscar || `${c.tituloEN || ""} ${c.autor || ""}`.trim();
  if (query) {
    await sleep(150);
    const r = await porBusqueda(query, c.tituloEN || "", c.autor || "");
    if (r) return r;
  }
  return null;
}

async function main() {
  const override = JSON.parse(fs.readFileSync(F_OVERRIDE, "utf8"));
  const cand = JSON.parse(fs.readFileSync(F_CAND, "utf8"));
  const pendientes = Object.keys(cand).filter((q) => override[q]?.none === true);
  console.log(`Obras blanqueadas con candidato: ${pendientes.length}${DRY ? "  (dry-run)" : ""}`);

  let fijadas = 0, sinSuerte = 0;
  for (const q of pendientes) {
    const c = cand[q];
    let r = null;
    try {
      r = await resolver(c);
    } catch (e) {
      console.log(`  ⚠ ${q} — error: ${e.message}`);
    }
    if (r) {
      fijadas++;
      const { _ev, ...img } = r; // no guardamos la evidencia en el override
      void _ev;
      console.log(`  ✓ ${q}\n      → ${img.thumb}  [${img.licencia}] (${img._via})`);
      if (!DRY) override[q] = img;
    } else {
      sinSuerte++;
      console.log(`  ·  ${q} — sin imagen libre verificada (se queda en blanco)`);
    }
    await sleep(200);
  }

  if (!DRY) {
    fs.writeFileSync(F_OVERRIDE, JSON.stringify(override, null, 2) + "\n");
  }
  console.log(`\nFijadas: ${fijadas}  ·  sin suerte: ${sinSuerte}  ·  total: ${pendientes.length}`);
  console.log(DRY ? "(dry-run: no se escribió nada)" : `Escrito ${path.relative(RAIZ, F_OVERRIDE)}`);
  console.log("Revisa el resultado en /curso/revisar y despliega cuando estés conforme.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
