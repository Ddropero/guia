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

const porLeccion = {};
let totalObras = 0;
let leccionesConObras = 0;

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
    for (i = i + 1; i < lines.length; i++) {
      if (/^##\s/.test(lines[i])) break; // fin de sección
      const m = lines[i].match(/^###\s+(.+?)\s*$/);
      if (!m) continue;
      let h = m[1].replace(/^\d+[.)]\s*/, "").trim(); // fuera "1. "
      if (/^otras\b/i.test(h)) continue; // subsección "Otras obras…", no es una obra
      const obra = parseHeading(h);
      if (obra.titulo) obras.push(obra);
    }
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
console.log(`Obras totales: ${totalObras}`);
console.log(`Media por lección: ${(totalObras / leccionesConObras).toFixed(1)}`);
console.log("\nMuestra:");
for (const key of ["02-antiguedad-clasica/02-grecia-clasica", "09-arte-moderno/02-cubismo", "12-temas-transversales/01-mujeres-en-la-historia-del-arte"]) {
  console.log(`\n${key}:`);
  for (const o of porLeccion[key] || []) console.log(`   • "${o.titulo}" | ${o.autor || "—"} | q=${o.q}`);
}
console.log(`\nEscrito: ${path.relative(ROOT, SALIDA)}`);
