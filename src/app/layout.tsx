import type { Metadata } from "next";
import { Fraunces, DM_Mono } from "next/font/google";
import "./globals.css";
import RegistrarSW from "@/components/RegistrarSW";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Centro de Costos · Infraestructura & APIs",
  description:
    "Cuánto cuesta mantener andando las plataformas y APIs de COCICP, Flota y lo personal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Analítica opcional: el token público de Cloudflare Web Analytics se pasa por
  // NEXT_PUBLIC_CF_BEACON en el build (no es un secreto). Sin él, no se carga nada.
  const cfBeacon = process.env.NEXT_PUBLIC_CF_BEACON;
  return (
    <html lang="es" className={`${fraunces.variable} ${dmMono.variable}`}>
      <head>
        {/* Las imágenes de obras vienen de Wikimedia: adelantar la conexión (LCP). */}
        <link rel="preconnect" href="https://upload.wikimedia.org" crossOrigin="" />
      </head>
      <body className="min-h-screen bg-bg text-fg antialiased">
        {children}
        <RegistrarSW />
        {cfBeacon && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: cfBeacon })}
          />
        )}
      </body>
    </html>
  );
}
