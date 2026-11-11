import { Bricolage_Grotesque } from "next/font/google";

/** Police des titres du site public (auto-hébergée par Next.js au build : aucun appel à Google côté visiteur). */
export const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display", display: "swap" });
