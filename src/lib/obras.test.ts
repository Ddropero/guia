import { describe, it, expect } from "vitest";
import { imagenDe, imagenesMostradas, getRechazadas, imagenRechazada } from "./obras";

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
