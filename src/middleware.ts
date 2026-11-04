import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { siteKeyForHost } from "@/lib/sites";

type Redirect = { from_path: string; to_path: string; status_code: number };
const redirectCache = new Map<string, { at: number; rules: Map<string, Redirect> }>();
const REDIRECT_TTL_MS = 60_000;

async function redirectsFor(siteKey: string): Promise<Map<string, Redirect>> {
  const cached = redirectCache.get(siteKey);
  if (cached && Date.now() - cached.at < REDIRECT_TTL_MS) return cached.rules;
  const rules = new Map<string, Redirect>();
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/redirects?select=from_path,to_path,status_code,sites!inner(key)&sites.key=eq.${siteKey}`;
    const res = await fetch(url, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } });
    if (res.ok) for (const r of (await res.json()) as Redirect[]) rules.set(r.from_path, r);
  } catch {
    // En cas d'indisponibilité, on sert la page sans redirection.
  }
  redirectCache.set(siteKey, { at: Date.now(), rules });
  return rules;
}

async function adminSession(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user && !req.nextUrl.pathname.startsWith("/admin/login")) {
    const login = req.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(login);
  }
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) return adminSession(req);
  if (pathname.startsWith("/api/")) return NextResponse.next();
  // Les routes internes /s/… ne sont jamais servies directement.
  if (pathname.startsWith("/s/")) return new NextResponse("Not found", { status: 404 });

  const siteKey = siteKeyForHost(req.headers.get("host"));

  const rule = (await redirectsFor(siteKey)).get(pathname);
  if (rule) {
    if (rule.status_code === 410) return new NextResponse("Gone", { status: 410 });
    const target = req.nextUrl.clone();
    target.pathname = rule.to_path;
    return NextResponse.redirect(target, rule.status_code);
  }

  // Normalisation : pas de slash final (une URL canonique par page).
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const target = req.nextUrl.clone();
    target.pathname = pathname.replace(/\/+$/, "");
    return NextResponse.redirect(target, 301);
  }

  const url = req.nextUrl.clone();
  url.pathname = `/s/${siteKey}${pathname === "/" ? "" : pathname}`;
  const res = NextResponse.rewrite(url);
  res.headers.set("x-site-key", siteKey);
  return res;
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|woff2?)$).*)"],
};
