import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";

// El dashboard de costos es una herramienta interna: no debe indexarse.
// (En historia.hilvan.org "/" redirige a /curso; esto cubre el build interno.)
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Home() {
  return <Dashboard />;
}
