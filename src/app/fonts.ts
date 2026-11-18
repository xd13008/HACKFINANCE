import { Bricolage_Grotesque, Inter } from "next/font/google";

/** Polices de la maquette validée (11/11/2026), auto-hébergées par Next.js au build : aucun appel à Google côté visiteur. */
export const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display", display: "swap" });
export const text = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-text", display: "swap" });
