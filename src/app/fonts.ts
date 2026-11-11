import { Manrope } from "next/font/google";

/** Police des titres du site public (auto-hébergée par Next.js au build : aucun appel à Google côté visiteur). */
export const display = Manrope({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display", display: "swap" });
