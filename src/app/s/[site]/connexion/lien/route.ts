import { NextResponse, type NextRequest } from "next/server";
import { getSite } from "@/lib/data";
import { signInWithLink } from "@/lib/members";
import { publicOrigin } from "@/lib/origin";

/** Lien de connexion reçu par e-mail. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ site: string }> }) {
  const site = await getSite((await params).site);
  const ok = site ? await signInWithLink(req.nextUrl.searchParams.get("t") ?? "", site.id, ["login", "confirm"]) : false;
  return NextResponse.redirect(new URL(ok ? "/mon-espace" : "/connexion?lien=expire", publicOrigin(req)));
}
