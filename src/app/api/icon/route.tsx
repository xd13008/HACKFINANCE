import { ImageResponse } from "next/og";
import { getSite } from "@/lib/data";

export const revalidate = 86400;

/** Favicon / logo carré du portail (initiale sur la couleur de marque). Visible dans les résultats Google. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const site = await getSite(searchParams.get("site") ?? "");
  const size = Math.min(512, Math.max(16, Number(searchParams.get("s") ?? 64)));
  const theme = (site?.theme ?? {}) as { primary?: string; accent?: string };
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: theme.primary ?? "#0f4c81", color: theme.accent ?? "#f59e0b", borderRadius: size * 0.2,
                    fontSize: size * 0.62, fontWeight: 800, fontFamily: "sans-serif" }}>
        {(site?.name ?? "?").charAt(0)}
      </div>
    ),
    { width: size, height: size },
  );
}
