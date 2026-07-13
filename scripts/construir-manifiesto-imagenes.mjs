#!/usr/bin/env node
/**
 * construir-manifiesto-imagenes.mjs — arma el manifiesto de integridad visual.
 *
 * Reúne, por obra que HOY resuelve una imagen (precedencia override → Wikidata
 * → Commons), una entrada con la ficha, la procedencia, URLs responsivas y la
 * atribución (TASL), más un `status`:
 *   - rejected : está en obras-imagenes-rechazadas.json (imagen errónea).
 *   - pending  : imagen automática sin verificación humana (todavía).
 *   - verified : SOLO lo puede poner una persona (regla 9). Este script nunca
 *                marca verified: si una entrada ya lo estaba en un manifiesto
 *                previo, se respeta salvo que la fuente haya cambiado.
 *
 * Salida: src/data/obras-imagenes-manifiesto.json (ordenado por workId).
 * Idempotente. No necesita red.
 */
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
const PREVIO = cargar("obras-imagenes-manifiesto.json", { obras: {} }).obras ?? {};

// Ficha por obra (primera aparición).
const ficha = new Map();
for (const lista of Object.values(OBRAS)) {
  for (const o of lista) if (!ficha.has(o.q)) ficha.set(o.q, o);
}

// Deriva URLs responsivas + nombre de archivo de una miniatura de Wikimedia.
// thumb: .../commons/thumb/0/0a/File.jpg/960px-File.jpg
//   ruta = "0/0a/File.jpg" · full = base + "/" + ruta · thumbW = base/thumb/ruta/Wpx-File.jpg
function urls(thumb) {
  const m = thumb.match(/\/thumb\/(.+?)\/(\d+)px-([^/]+)$/);
  if (!m) {
    // URL directa (no-thumb): no se puede reescalar; se usa igual en todos.
    return { thumb320: thumb, thumb640: thumb, thumb960: thumb, full: thumb, file: commonsFileFromPath(thumb) };
  }
  const base = thumb.slice(0, thumb.indexOf("/thumb/"));
  const [, ruta, , nombre] = m; // ruta ya incluye el nombre del archivo
  const th = (w) => `${base}/thumb/${ruta}/${w}px-${nombre}`;
  let file = nombre;
  try {
    file = decodeURIComponent(nombre);
  } catch {
    /* nombre no decodificable: se deja tal cual */
  }
  return { thumb320: th(320), thumb640: th(640), thumb960: th(960), full: `${base}/${ruta}`, file };
}

// Nombre del archivo de Commons a partir del último segmento de la URL.
function commonsFileFromPath(u) {
  try {
    const m = decodeURIComponent(new URL(u).pathname).match(/([^/]+\.(?:jpg|jpeg|png|tif|tiff|gif|webp|svg))$/i);
    return m ? m[1] : "";
  } catch {
    return "";
  }
}

// URL de la licencia a partir de su nombre corto.
function licenseUrl(name) {
  const n = (name || "").toLowerCase();
  if (/cc0|zero/.test(n)) return "https://creativecommons.org/publicdomain/zero/1.0/";
  const cc = n.match(/cc[\s-]?by(?:[\s-]?(sa|nc|nd))?[\s-]?(\d(?:\.\d)?)/);
  if (cc) {
    const mods = cc[1] ? `-${cc[1]}` : "";
    return `https://creativecommons.org/licenses/by${mods}/${cc[2]}/`;
  }
  if (/public domain|dominio p|^pd$|\bpd\b/.test(n)) return "https://commons.wikimedia.org/wiki/Commons:Public_domain";
  return "";
}

// Resuelve la imagen efectiva y su procedencia (misma precedencia que imagenDe).
function fuenteDe(q) {
  const ov = OVERRIDE[q];
  if (ov && !ov.none && ov.thumb) return { via: "override", img: ov };
  const wd = WIKIDATA[q]?.imagen;
  if (wd?.thumb) return { via: "wikidata", img: wd };
  const im = IMAGENES[q];
  if (im && !im.none && im.thumb) return { via: "commons", img: im };
  return null;
}

const out = {};
let pending = 0, rejected = 0, verified = 0;
for (const [q, o] of [...ficha].sort((a, b) => a[0].localeCompare(b[0]))) {
  const esRechazada = !!RECHAZADAS[q];
  const fuente = fuenteDe(q);
  if (!fuente && !esRechazada) continue; // sin imagen y sin rechazo: no entra al manifiesto

  const img = fuente?.img;
  const responsivas = img?.thumb ? urls(img.thumb) : {};

  let status = esRechazada ? "rejected" : "pending";
  // Respeta un verified humano previo, salvo que la miniatura haya cambiado.
  const prev = PREVIO[q];
  if (!esRechazada && prev?.status === "verified" && prev?.thumb960 && prev.thumb960 === responsivas.thumb960) {
    status = "verified";
  }
  if (status === "verified") verified++;
  else if (status === "rejected") rejected++;
  else pending++;

  // Las rechazadas NO cargan URLs de imagen: se registra el motivo, nada más,
  // para que ningún consumidor futuro renderice la imagen equivocada.
  const campos =
    status === "rejected"
      ? {
          commonsFile: "",
          thumb320: "", thumb640: "", thumb960: "", full: "",
          creador: "", sourceUrl: "", licenseName: "", licenseUrl: "",
        }
      : {
          commonsFile: responsivas.file || "",
          thumb320: responsivas.thumb320, thumb640: responsivas.thumb640,
          thumb960: responsivas.thumb960, full: responsivas.full,
          creador: img?.credito || "",
          sourceUrl: img?.enlace || "",
          licenseName: img?.licencia || "",
          licenseUrl: licenseUrl(img?.licencia),
        };

  out[q] = {
    workId: q,
    titulo: o.titulo,
    autor: o.autor,
    qid: WIKIDATA[q]?.qid || "",
    ...campos,
    cambios: "",
    status,
    motivoRechazo: esRechazada ? RECHAZADAS[q].motivo || "" : undefined,
    verifiedAt: status === "verified" ? prev?.verifiedAt ?? null : null,
    verifiedBy: status === "verified" ? prev?.verifiedBy ?? null : null,
  };
}

const doc = {
  _doc:
    "Manifiesto de integridad visual (Fase 1). status: pending|verified|rejected. " +
    "Solo un humano marca verified (regla 9). Generado por scripts/construir-manifiesto-imagenes.mjs.",
  generadoObras: Object.keys(out).length,
  resumen: { verified, pending, rejected },
  obras: out,
};
fs.writeFileSync(path.join(DATA, "obras-imagenes-manifiesto.json"), JSON.stringify(doc, null, 2) + "\n");
console.log(`Manifiesto: ${Object.keys(out).length} obras · verified ${verified} · pending ${pending} · rejected ${rejected}`);
