import { describe, it, expect } from "vitest";
import {
  imagenDe,
  imagenesMostradas,
  getRechazadas,
  imagenRechazada,
  getManifiesto,
} from "./obras";

// Falsos positivos conocidos (spec de endurecimiento, Fase 1C). Cada uno mostraba
// una imagen que NO corresponde a la obra. La prueba garantiza que ninguno se
// vuelva a publicar, aunque una regeneración de datos proponga una imagen.
const FALSOS_POSITIVOS = [
  "El hombre de León León de Hohlenstein-Stadel", // → mural de Orozco
  "Cabeza de Warka", // → mapa de Uruk
  "Aguamanil celadón de Goryeo con incrustación", // → realeza española
  "El ciclo de María de Médici Peter Paul Rubens", // → presidente brasileño
  "Versalles: la Galería de los Espejos - Jules Hardouin-Mansart y Charles Le Brun", // → barrio de Buenos Aires
  "Siluetas Ana Mendieta, serie", // → jirafa
  "Seedbed Vito Acconci", // → semillero agrícola
  "Placas de latón del palacio de Benín", // → antipapa
  "Placas de latón del palacio real de Benín", // → antipapa
  "Anyanwu de Ben Enwonwu", // → política nigeriana
  "Justiniano y su corte Mosaicos de , San Vitale de Rávena", // → historietista
];

describe("integridad visual: imágenes rechazadas (Fase 1C)", () => {
  it("todos los falsos positivos conocidos están en el registro de rechazadas", () => {
    const rech = getRechazadas();
    for (const q of FALSOS_POSITIVOS) {
      expect(rech[q], `falta en rechazadas: ${q}`).toBeTruthy();
      expect(rech[q].status).toBe("rejected");
    }
  });

  it("imagenDe() nunca devuelve imagen para una obra rechazada", () => {
    for (const q of Object.keys(getRechazadas())) {
      expect(imagenDe(q), `debería ser null: ${q}`).toBeNull();
    }
  });

  it("imagenesMostradas() no incluye ninguna obra rechazada", () => {
    const mostradas = new Set(imagenesMostradas().map((m) => m.q));
    for (const q of Object.keys(getRechazadas())) {
      expect(mostradas.has(q), `no debería mostrarse: ${q}`).toBe(false);
    }
  });

  it("imagenRechazada() expone el motivo del rechazo", () => {
    expect(imagenRechazada("Siluetas Ana Mendieta, serie")?.motivo).toMatch(/jirafa/i);
    expect(imagenRechazada("Placas de latón del palacio de Benín")?.motivo).toMatch(/antipapa/i);
    expect(imagenRechazada("obra inexistente xyz")).toBeNull();
  });
});

describe("manifiesto de integridad visual (Fase 1A/1B)", () => {
  const man = getManifiesto();
  const entradas = Object.values(man);

  it("hay entradas y todas tienen forma válida", () => {
    expect(entradas.length).toBeGreaterThan(0);
    for (const e of entradas) {
      expect(e.workId, "workId").toBeTruthy();
      expect(e.titulo, `titulo de ${e.workId}`).toBeTruthy();
      expect(["pending", "verified", "rejected"]).toContain(e.status);
    }
  });

  it("ningún status es verified sin revisión humana (regla 9)", () => {
    // El generador nunca marca verified; solo un humano lo hace, con verifiedBy.
    for (const e of entradas) {
      if (e.status === "verified") expect(e.verifiedBy, `${e.workId} verified sin verifiedBy`).toBeTruthy();
    }
  });

  it("las rechazadas no llevan URL de imagen en el manifiesto", () => {
    for (const e of entradas) {
      if (e.status === "rejected") {
        expect(e.thumb960 || "").toBe("");
        expect(e.full || "").toBe("");
      }
    }
  });

  it("las obras con imagen (pending/verified) llevan la atribución legal mínima", () => {
    // TASL de la IMAGEN: fuente enlazada + licencia son obligatorias para reusar.
    // El autor de la obra y el de la imagen pueden faltar (obra anónima o imagen
    // de dominio público sin autor nombrado); no se exigen aquí.
    for (const e of entradas) {
      if (e.status === "rejected") continue;
      expect(e.thumb960, `sin thumb960: ${e.workId}`).toBeTruthy();
      expect(e.sourceUrl, `sin sourceUrl: ${e.workId}`).toBeTruthy();
      expect(e.licenseName, `sin licencia: ${e.workId}`).toBeTruthy();
    }
  });

  it("toda obra que hoy resuelve imagen está en el manifiesto como pending/verified", () => {
    const conManifiestoImagen = new Set(
      entradas.filter((e) => e.status !== "rejected").map((e) => e.workId),
    );
    for (const m of imagenesMostradas()) {
      expect(conManifiestoImagen.has(m.q), `no está en manifiesto: ${m.q}`).toBe(true);
    }
    // Y ninguna mostrada es rechazada.
    const rech = new Set(Object.keys(getRechazadas()));
    for (const m of imagenesMostradas()) expect(rech.has(m.q)).toBe(false);
  });
});
