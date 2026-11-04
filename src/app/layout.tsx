import "./globals.css";

/** Layout racine minimal : chaque portail et le back-office posent leur propre cadre. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
