import { ImageResponse } from "next/og";
import { getSite } from "@/lib/data";

export const revalidate = 86400;

/** Image de partage (Open Graph) générée par page : marque du portail + titre. 1200×630. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const site = await getSite(searchParams.get("site") ?? "");
  const title = (searchParams.get("t") ?? site?.tagline ?? "").slice(0, 120);
  const kind = (searchParams.get("k") ?? "").slice(0, 30);
  const theme = (site?.theme ?? {}) as { primary?: string; accent?: string };
  const brand = theme.primary ?? "#0f4c81";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
                    background: brand, color: "white", padding: "64px 72px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 800 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: theme.accent ?? "#f59e0b", color: brand,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }}>
            {(site?.name ?? "?").charAt(0)}
          </div>
          {site?.name ?? ""}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {kind && <div style={{ fontSize: 28, opacity: 0.8, textTransform: "uppercase", letterSpacing: 2 }}>{kind}</div>}
          <div style={{ fontSize: title.length > 70 ? 54 : 66, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
        </div>
        <div style={{ fontSize: 26, opacity: 0.85 }}>{site?.domain ?? ""}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
