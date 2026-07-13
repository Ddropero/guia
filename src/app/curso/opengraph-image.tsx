import { ImageResponse } from "next/og";

// Requerido para el export estático (igual que manifest/sitemap).
export const dynamic = "force-static";

// Imagen OpenGraph por defecto de la sección /curso (se hereda en las páginas
// que no definan una propia). Se genera como PNG estático en build.
export const alt = "Historia del Arte · Curso interactivo con tutor de IA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImagen() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0b0a",
          color: "#e9ece8",
        }}
      >
        <div style={{ fontSize: 34, letterSpacing: 6, color: "#b8f0a0", textTransform: "uppercase" }}>
          Curso interactivo
        </div>
        <div style={{ fontSize: 92, fontWeight: 700, marginTop: 24, lineHeight: 1.05 }}>
          Historia del Arte
        </div>
        <div style={{ fontSize: 34, marginTop: 28, color: "#8b938b" }}>
          De la prehistoria al arte contemporáneo · con tutor de IA
        </div>
      </div>
    ),
    size,
  );
}
