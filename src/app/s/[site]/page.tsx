import Link from "next/link";
import { getNav, getContentByPath } from "@/lib/data";
import { JsonLd } from "@/components/public/JsonLd";
import { Tracker } from "@/components/public/Tracker";
import { ldOrganization, ldWebsite, staticMetadata } from "@/lib/seo";
import { metadataFor, requireSite, type SiteParams } from "./_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement
export async function generateMetadata({ params }: { params: SiteParams }) {
  const key = (await params).site;
  const site = await requireSite(key);
  const home = await getContentByPath(site.id, "/");
  // Sans contenu d'accueil validé, l'accueil reste indexable avec le titre et la description du portail.
  if (!home) return staticMetadata(site, "/", fitTitle(`${site.name} — ${site.tagline ?? ""}`), site.description ?? "");
  return metadataFor(key, "/");
}

/** Textes de l'accueil validés par le dirigeant (maquette du 11/11/2026, écran 1). Autres portails : titre et description du portail. */
const HERO: Record<string, { before: string; mark: string; after: string }> = {
  daf: { before: "Votre outil ou partenaire finance est-il ", mark: "le bon", after: " ?" },
};

const TRUST = ["Tests réels par la rédaction", "Sources publiques datées", "Sponsorisé toujours signalé", "Vos données ne partent qu'avec votre accord"];

export default async function Home({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  const [nav, home] = await Promise.all([getNav(site.id), getContentByPath(site.id, "/")]);
  const hero = HERO[site.key];
  const title = hero ? null : (home?.h1 ?? site.tagline);
  // Ce que chaque univers propose déjà (catégories publiées seulement)
  const offer = (verticalId: string) => {
    const cats = nav.categories.filter((c) => c.vertical_id === verticalId);
    const sw = cats.filter((c) => c.kind === "software").length, pro = cats.filter((c) => c.kind === "provider").length;
    const parts = [sw && `${sw} catégorie${sw > 1 ? "s" : ""} de logiciels`, pro && `${pro} annuaire${pro > 1 ? "s" : ""} de professionnels`].filter(Boolean);
    return parts.length ? parts.join(" · ") : "En préparation";
  };

  return (
    <div>
      <JsonLd data={[ldOrganization(site), ldWebsite(site)]} />
      <Tracker site={site.key} pageType="home" />
      <section className="bg-brand text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-20 sm:pt-20 sm:pb-24 flex flex-col gap-10">
          <h1 className="m-0 font-display font-extrabold text-5xl sm:text-7xl lg:text-[84px] leading-[0.98] tracking-[-0.035em] max-w-5xl">
            {hero ? <>{hero.before}<span className="bg-accent text-ink rounded-[14px] px-3 [box-decoration-break:clone]">{hero.mark}</span>{hero.after}</> : title}
          </h1>
          {!hero && (home?.summary ?? site.description) && <p className="m-0 text-lg max-w-2xl text-white/80">{home?.summary ?? site.description}</p>}
          <div className="grid gap-4 sm:grid-cols-2 max-w-5xl">
            <Link href="/challenger" className="flex flex-col gap-3.5 rounded-[28px] bg-accent text-ink p-7 min-h-44 no-underline">
              <span className="text-[13px] font-bold uppercase tracking-[0.06em]">Vous avez déjà un outil, un cabinet ou un prestataire</span>
              <span className="font-display font-extrabold text-3xl sm:text-[34px] leading-[1.05] tracking-tight">Challenger ma solution</span>
              <span className="mt-auto flex items-center justify-between gap-4 font-semibold">Comparez-la aux alternatives, sur vos critères
                <span aria-hidden="true" className="w-13 h-13 shrink-0 rounded-[10px] bg-brand text-accent flex items-center justify-center text-2xl">→</span></span>
            </Link>
            <Link href="/trouver" className="flex flex-col gap-3.5 rounded-[28px] bg-white text-ink p-7 min-h-44 no-underline">
              <span className="text-[13px] font-bold uppercase tracking-[0.06em]">Vous partez de zéro</span>
              <span className="font-display font-extrabold text-3xl sm:text-[34px] leading-[1.05] tracking-tight">Trouver une solution</span>
              <span className="mt-auto flex items-center justify-between gap-4 font-semibold">Par besoin, sur vos critères
                <span aria-hidden="true" className="w-13 h-13 shrink-0 rounded-[10px] bg-brand text-white flex items-center justify-center text-2xl">→</span></span>
            </Link>
          </div>
          <ul className="m-0 p-0 list-none flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
            {TRUST.map((t) => <li key={t}><span aria-hidden="true">✓ </span>{t}</li>)}
          </ul>
        </div>
      </section>

      {nav.verticals.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-6" aria-labelledby="univers">
          <h2 id="univers" className="m-0 mb-7 font-display font-extrabold text-4xl sm:text-5xl tracking-[-0.03em] leading-none">
            {site.key === "daf" ? `Les ${nav.verticals.length} univers du DAF` : "Nos univers"}
          </h2>
          <ul className="m-0 p-0 list-none grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {nav.verticals.map((v) => (
              <li key={v.id}>
                <Link href={`/univers/${v.slug}`} className="h-full min-h-36 flex flex-col justify-between gap-7 rounded-3xl bg-white border border-line p-6 text-ink no-underline hover:border-ink">
                  <span className="font-display font-extrabold text-[26px] leading-[1.05] tracking-tight">{v.name}</span>
                  {v.description && <span className="text-sm text-ink-2 leading-snug">{v.description}</span>}
                  <span className="flex items-center justify-between text-sm font-semibold">{offer(v.id)}<span aria-hidden="true" className="text-[22px]">→</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-accent text-ink p-8">
          <p className="m-0 font-display font-extrabold text-3xl sm:text-[34px] leading-[1.05] tracking-tight max-w-2xl">Éditeur, cabinet ? Votre fiche est gratuite.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/referencer-mon-logiciel" className="inline-flex items-center min-h-13 px-6 rounded-[10px] bg-brand text-white font-bold no-underline">Référencer mon logiciel →</Link>
            <Link href="/referencer-mon-cabinet" className="inline-flex items-center min-h-13 px-6 rounded-[10px] bg-brand text-white font-bold no-underline">Référencer mon cabinet →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/** Titre ≤ 65 caractères, coupé sur un mot entier (jamais au milieu d'un mot). */
function fitTitle(t: string, max = 65) {
  if (t.length <= max) return t;
  let out = t.slice(0, max + 1).replace(/\s+\S*$/, "");
  // Ne jamais finir sur un mot de liaison ni une ponctuation (« … pour les PME et »).
  const tail = /[\s,;:—–-]+$|\s+(et|ou|de|des|du|la|le|les|pour|à|en|aux|au)$/i;
  while (tail.test(out)) out = out.replace(tail, "");
  return out;
}
