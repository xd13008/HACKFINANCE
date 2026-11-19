import Link from "next/link";
import { categoryKeyFact } from "@/lib/category";
import type { ToolCard } from "@/lib/universe";
import { CategoryTabPage, tabData, tabMetadata } from "@/components/public/CategoryTabPage";

export const revalidate = 300;
type P = Promise<{ site: string; categorie: string }>;
const fmt = (n: number) => n.toFixed(1).replace(".", ",");

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return tabMetadata(p.site, p.categorie, "par-profil", (h) => `${h.category.name} : le meilleur choix selon votre profil`, (h) => categoryKeyFact(h));
}

/** Profils de DAF : la mieux notée parmi les solutions dont les faits validés correspondent au profil. */
const PROFILES: { label: string; why: string; fits: (t: ToolCard) => boolean }[] = [
  { label: "TPE (moins de 10 salariés)", why: "taille cible déclarée et vérifiée : TPE", fits: (t) => t.targetSizes.includes("tpe") },
  { label: "PME (10 à 249 salariés)", why: "taille cible déclarée et vérifiée : PME", fits: (t) => t.targetSizes.includes("pme") },
  { label: "ETI et groupes", why: "taille cible déclarée et vérifiée : ETI", fits: (t) => t.targetSizes.includes("eti") },
  { label: "Plusieurs sociétés", why: "gestion multi-sociétés vérifiée", fits: (t) => t.multiEntity === true },
  { label: "Données hébergées en UE", why: "hébergement vérifié dans l'Union européenne", fits: (t) => /union européenne|\bue\b|france/i.test(t.hosting ?? "") },
  { label: "Petit budget", why: "offre gratuite ou prix d'entrée de 50 € HT par mois au plus", fits: (t) => t.entry != null && t.entry <= 50 },
];

export default async function ParProfil({ params }: { params: P }) {
  const p = await params;
  const { site, hub } = await tabData(p.site, p.categorie);
  return (
    <CategoryTabPage site={site} hub={hub} tab="par-profil" title={`${hub.category.name} : le bon choix selon votre profil`} keyFact={categoryKeyFact(hub)}>
      <ul className="m-0 p-0 list-none grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROFILES.map((pr) => {
          const t = hub.tools.find(pr.fits);
          return (
            <li key={pr.label} className="flex flex-col gap-2 rounded-3xl border border-line bg-white p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-3">{pr.label}</span>
              {t ? (
                <>
                  <Link href={`/logiciels/${t.slug}`} className="font-display font-extrabold text-2xl no-underline">{t.name}</Link>
                  <span className="text-sm">{fmt(t.score)}/10 · {pr.why}</span>
                </>
              ) : <span className="text-sm text-ink-3">Aucune solution testée ne correspond encore à ce profil.</span>}
            </li>
          );
        })}
      </ul>
      <p className="m-0 text-sm text-ink-3">Pour chaque profil : la meilleure note des tests parmi les solutions dont le critère est vérifié par la rédaction (fait sourcé et daté). <Link href="/trouver" className="underline">Affiner avec l&apos;assistant</Link></p>
    </CategoryTabPage>
  );
}
