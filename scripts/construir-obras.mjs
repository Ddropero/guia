// Construye src/data/obras.json: por cada lección, la lista de obras comentadas.
//
// Fuente autoritativa: la sección "## Obras maestras comentadas" de cada lección.
// De cada subtítulo "### N. ..." extrae título (cursiva si la hay), autor y una
// query de búsqueda (para Google Arts & Culture y para buscar la miniatura PD).
//
// Local, sin red:  node scripts/construir-obras.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MODULOS_DIR = path.join(ROOT, "curso-historia-del-arte", "modulos");
const SALIDA = path.join(ROOT, "src", "data", "obras.json");

const limpiaQuery = (s) =>
  s
    .replace(/\*/g, "")
    .replace(/\([^)]*\)/g, " ") // fuera fechas/aclaraciones entre paréntesis
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function parseHeading(h) {
  // h = texto tras "### ", ya sin el número inicial
  const it = h.match(/\*([^*]+)\*/); // título en cursiva, si lo hay
  let titulo;
  let autor = "";
  if (it) {
    titulo = it[1].trim();
    autor = (h.slice(0, it.index) + " " + h.slice(it.index + it[0].length))
      .replace(/\*/g, "")
      .replace(/\([^)]*\)/g, " ") // fuera aclaraciones/fechas
      .replace(/[—–]/g, " ")
      .replace(/^[\s,:/]+|[\s,:/]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  } else {
    titulo = h.replace(/[—–]/g, "-").trim();
  }
  const q = limpiaQuery(`${titulo} ${autor}`);
  return { titulo: titulo.replace(/\s+/g, " ").trim(), autor, q };
}

// Limpia un valor de la ficha: quita marcado y espacios. Para el autor, además
// quita paréntesis (aclaraciones) y la puntuación colgante que dejan; en los
// demás campos se conserva el texto verbatim (p. ej. el punto de "a. C.").
// Quita el punto final de oración pero conserva abreviaturas ("a. C.", "d. C.",
// "s. I") en las que el punto va tras una sola letra (mayúscula o romana).
function quitarPuntoFinal(t) {
  return /(^|[\s.])[A-Za-z]\.$/.test(t) ? t : t.replace(/\.$/, "");
}

function limpiarCampo(s, quitarParens = false) {
  let t = (s || "").replace(/\*\*/g, "").replace(/\*/g, "");
  if (quitarParens) t = t.replace(/\([^)]*\)/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  // Separadores colgantes (·, •, — y espacios) que dejan los dos formatos de ficha.
  t = t.replace(/^[·•—\s]+/, "").replace(/[·•—\s]+$/, "");
  if (quitarParens) t = t.replace(/[.;,]+$/, "").trim(); // punto/coma colgante tras quitar paréntesis
  else t = quitarPuntoFinal(t); // punto de oración (respetando abreviaturas)
  return t.trim();
}

// Parsea el bullet de ficha: "- **Autor:** … **Fecha:** … **Técnica:** … **Ubicación:** …".
// Devuelve solo los campos presentes. El texto de cada campo puede contener
// **negritas** internas; por eso cortamos con lookahead a la siguiente etiqueta.
const ETIQUETAS = "Autor(?:es)?|Fecha|Técnica|Tecnica|Ubicación|Ubicacion";
function parseFicha(line) {
  const txt = line.replace(/^\s*-\s+/, "");
  const out = {};
  const grupos = [
    ["autor", "Autor(?:es)?", true],
    ["fecha", "Fecha", false],
    ["tecnica", "Técnica|Tecnica", false],
    ["ubicacion", "Ubicación|Ubicacion", false],
  ];
  for (const [key, label, quitarParens] of grupos) {
    const re = new RegExp(`\\*\\*(?:${label}):\\*\\*\\s*(.+?)(?=\\s*\\*\\*(?:${ETIQUETAS}):\\*\\*|$)`);
    const m = txt.match(re);
    if (m) {
      const v = limpiarCampo(m[1], quitarParens);
      if (v) out[key] = v;
    }
  }
  return out;
}

// Ficha posicional "**Ficha.** Autor; técnica; ubicación." (sin etiquetas).
// Autor = primer segmento, ubicación = último; fecha = el segmento que parezca
// una fecha; el resto, técnica. Heurístico, pero autor/ubicación son fiables.
const RE_FECHA = /\b\d{3,4}\b|a\.\s*c\.|d\.\s*c\.|siglo|s\.\s*[ivx]/i;
function parsePositional(line) {
  const m = line.match(/\*\*Ficha\.?\*\*\s*(.+?)\s*$/);
  if (!m) return {};
  const partes = m[1]
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .split(/\s*;\s*/)
    .map((s) => quitarPuntoFinal(s.trim()).trim())
    .filter(Boolean);
  if (!partes.length) return {};
  const out = { autor: partes[0] };
  if (partes.length >= 2) out.ubicacion = partes[partes.length - 1];
  const medio = partes.slice(1, partes.length - 1);
  const fechaPart = medio.find((p) => RE_FECHA.test(p));
  if (fechaPart) out.fecha = fechaPart;
  const tec = medio.filter((p) => p !== fechaPart);
  if (tec.length) out.tecnica = tec.join("; ");
  return out;
}

const porLeccion = {};
let totalObras = 0;
let leccionesConObras = 0;
let conFicha = 0;

for (const modDir of fs.readdirSync(MODULOS_DIR, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!modDir.isDirectory()) continue;
  const moduloId = modDir.name;
  for (const f of fs.readdirSync(path.join(MODULOS_DIR, moduloId)).sort()) {
    if (!f.endsWith(".md") || f === "00-modulo.md") continue;
    const slug = f.replace(/\.md$/, "");
    const lines = fs.readFileSync(path.join(MODULOS_DIR, moduloId, f), "utf8").split("\n");

    // localizar la sección de obras
    let i = lines.findIndex((l) => /^##\s+Obras maestras comentadas/i.test(l));
    if (i < 0) continue;
    const obras = [];
    let ultima = null; // obra abierta
    let acc = null; // ficha acumulada de la obra abierta (los campos llegan en 1+ líneas)
    // Vuelca la ficha acumulada en la obra abierta. NO recalcula `q` (la clave de
    // imágenes/wikipedia se mantiene estable). El autor de la ficha manda sobre el del encabezado.
    const volcar = () => {
      if (ultima && acc) {
        if (acc.autor) ultima.autor = acc.autor;
        if (acc.fecha) ultima.fecha = acc.fecha;
        if (acc.tecnica) ultima.tecnica = acc.tecnica;
        if (acc.ubicacion) ultima.ubicacion = acc.ubicacion;
        if (acc.fecha || acc.tecnica || acc.ubicacion) conFicha++;
      }
      acc = null;
    };
    for (i = i + 1; i < lines.length; i++) {
      if (/^##\s/.test(lines[i])) { volcar(); break; } // fin de sección
      const m = lines[i].match(/^###\s+(.+?)\s*$/);
      if (m) {
        volcar();
        const h = m[1].replace(/^\d+[.)]\s*/, "").trim(); // fuera "1. "
        if (/^otras\b/i.test(h)) { ultima = null; continue; } // "Otras obras…", no es una obra
        const obra = parseHeading(h);
        if (obra.titulo) { obras.push(obra); ultima = obra; acc = {}; } else ultima = null;
        continue;
      }
      if (!ultima || !acc) continue;
      // Campos de ficha: etiquetados (una o varias líneas) o posicional (**Ficha.**).
      const f = parseFicha(lines[i]);
      const pos = parsePositional(lines[i]);
      for (const k of ["autor", "fecha", "tecnica", "ubicacion"]) {
        if (!acc[k]) {
          const v = f[k] ?? pos[k];
          if (v) acc[k] = v;
        }
      }
    }
    volcar();
    if (obras.length) {
      porLeccion[`${moduloId}/${slug}`] = obras;
      totalObras += obras.length;
      leccionesConObras++;
    }
  }
}

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, JSON.stringify(porLeccion, null, 2) + "\n");

console.log(`Lecciones con obras: ${leccionesConObras}`);
console.log(`Obras totales: ${totalObras} (con ficha estructurada: ${conFicha})`);
console.log(`Media por lección: ${(totalObras / leccionesConObras).toFixed(1)}`);
console.log("\nMuestra:");
for (const key of ["02-antiguedad-clasica/02-grecia-clasica", "09-arte-moderno/02-cubismo", "12-temas-transversales/01-mujeres-en-la-historia-del-arte"]) {
  console.log(`\n${key}:`);
  for (const o of porLeccion[key] || []) console.log(`   • "${o.titulo}" | ${o.autor || "—"} | q=${o.q}`);
}
console.log(`\nEscrito: ${path.relative(ROOT, SALIDA)}`);
