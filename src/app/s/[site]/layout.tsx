import Link from "next/link";
import type { Metadata } from "next";
import { getNav } from "@/lib/data";
import { publicClient } from "@/lib/supabase/public";
import { siteUrl } from "@/lib/seo";
import { requireSite, type SiteParams } from "./_lib";

/** Portails connus au build : toutes les pages publiques peuvent être pré-générées et mises en cache. */
export async function generateStaticParams() {
  const { data } = await publicClient().from("sites").select("key");
  return (data ?? []).map((s) => ({ site: s.key }));
}

export async function generateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const site = await requireSite((await params).site);
  return {
    metadataBase: new URL(siteUrl(site)),
    title: { default: site.name, template: `%s` },
    description: site.description ?? undefined,
    applicationName: site.name,
    icons: {
      icon: [{ url: `/api/icon?site=${site.key}&s=48`, sizes: "48x48", type: "image/png" }],
      apple: [{ url: `/api/icon?site=${site.key}&s=180`, sizes: "180x180", type: "image/png" }],
    },
  };
}

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: SiteParams }) {
  const site = await requireSite((await params).site);
  const nav = await getNav(site.id);
  const theme = (site.theme ?? {}) as { primary?: string; accent?: string };
  const softwareCats = nav.categories.filter((c) => c.kind === "software");
  const providerCats = nav.categories.filter((c) => c.kind === "provider");

  return (
    <div style={{ ["--brand" as string]: theme.primary ?? "#0f4c81", ["--accent" as string]: theme.accent ?? "#f59e0b" }}
         className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="font-extrabold text-lg text-brand">{site.name}</Link>
          <nav aria-label="Navigation principale" className="hidden md:flex gap-5 text-sm">
            {softwareCats.slice(0, 4).map((c) => (
              <Link key={c.id} href={`/meilleurs-logiciels/${c.slug}`} className="hover:text-brand">{c.short_name ?? c.name}</Link>
            ))}
            {providerCats.slice(0, 3).map((c) => (
              <Link key={c.id} href={`/prestataires/${c.slug}`} className="hover:text-brand">{c.name}</Link>
            ))}
            {nav.highlights.slice(0, 2).map((h) => (
              <Link key={h.path} href={h.path!} className="hover:text-brand">{h.type === "simulator" ? "Simulateurs" : "Le guide"}</Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-surface-2 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-3 text-sm">
          <div>
            <p className="font-bold text-brand">{site.name}</p>
            <p className="text-ink-2 mt-2">{site.tagline}</p>
          </div>
          <div>
            <p className="font-semibold mb-2">Transparence</p>
            <ul className="space-y-1 text-ink-2">
              {nav.publishedPaths.has("/methode") && <li><Link href="/methode">Notre méthode</Link></li>}
              <li><Link href="/publicite">Publicité et partenariats</Link></li>
              {nav.publishedPaths.has("/a-propos") && <li><Link href="/a-propos">À propos</Link></li>}
              {nav.hasGlossary && <li><Link href="/lexique">Lexique</Link></li>}
              <li><Link href="/signaler-une-erreur">Signaler une erreur / droit de réponse</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Professionnels</p>
            <ul className="space-y-1 text-ink-2">
              <li><Link href="/referencer-mon-logiciel">Référencer mon logiciel</Link></li>
              <li><Link href="/referencer-mon-cabinet">Référencer mon cabinet</Link></li>
              <li><Link href="/publicite/annoncer">Annoncer sur {site.name}</Link></li>
              {nav.publishedPaths.has("/mentions-legales") && <li><Link href="/mentions-legales">Mentions légales</Link></li>}
              {nav.publishedPaths.has("/donnees-personnelles") && <li><Link href="/donnees-personnelles">Données personnelles</Link></li>}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
