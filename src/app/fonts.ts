import localFont from "next/font/local";

/**
 * Polices de la maquette validée (11/11/2026), stockées dans le dépôt (sous-ensemble latin, polices variables) :
 * le build ne dépend plus de Google Fonts et le visiteur ne contacte jamais Google.
 * Inter et Bricolage Grotesque : licence SIL Open Font License 1.1.
 */
export const display = localFont({
  src: "./fonts/bricolage-grotesque-latin.woff2", weight: "600 800", variable: "--font-display", display: "swap",
});
export const text = localFont({
  src: "./fonts/inter-latin.woff2", weight: "400 700", variable: "--font-text", display: "swap",
});
