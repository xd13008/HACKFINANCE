import type { Metadata } from "next";
import { SimplePage } from "@/components/public/SimplePage";
import { CookieSettingsLink } from "@/components/public/CookieBanner";
import { staticMetadata } from "@/lib/seo";
import { requireSite, type SiteParams } from "../_lib";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const site = await requireSite((await params).site);
  return staticMetadata(site, "/cookies", `Cookies — ${site.name}`, "Liste des cookies déposés, finalités, durées et gestion de votre consentement.", { noindex: true });
}

const ROWS: [string, string, string, string][] = [
  ["rf_consent", "Nécessaire", "Mémoriser votre choix sur les cookies", "6 mois"],
  ["rf_session", "Nécessaire", "Vous garder connecté à « Mon espace » (uniquement si vous vous connectez)", "90 jours"],
  ["rf_vid", "Personnalisation (avec votre accord)", "Rattacher les pages consultées et vos recherches à votre navigateur, puis à votre compte", "6 mois"],
];

export default async function CookiesPage({ params }: { params: SiteParams }) {
  const site = await requireSite((await params).site);
  return (
    <SimplePage site={site.key} title="Cookies" path="/cookies" pageType="page"
      intro={`${site.name} ne dépose aucun cookie publicitaire ni cookie tiers. La mesure d'audience fonctionne sans cookie.`}>
      <table className="w-full text-sm my-6 border-collapse">
        <thead><tr className="text-left border-b border-line"><th className="py-2 pr-3">Cookie</th><th className="pr-3">Type</th><th className="pr-3">Finalité</th><th>Durée</th></tr></thead>
        <tbody>{ROWS.map((r) => <tr key={r[0]} className="border-b border-line align-top">{r.map((c, i) => <td key={i} className={`py-2 pr-3 ${i === 0 ? "font-mono" : ""}`}>{c}</td>)}</tr>)}</tbody>
      </table>
      <div className="space-y-3 text-ink-2">
        <p><strong>Mesure d&apos;audience</strong> : un identifiant de session est recalculé chaque jour à partir d&apos;un hachage non réversible. Aucune adresse IP n&apos;est conservée, aucun cookie n&apos;est déposé. Les signaux « Do Not Track » et « Global Privacy Control » sont respectés.</p>
        <p><strong>Personnalisation</strong> : seulement si vous l&apos;acceptez. Votre choix est redemandé tous les 6 mois. Si vous la refusez ou la retirez, la navigation non rattachée à un compte est effacée. Les données de navigation sont conservées 25 mois au plus.</p>
        <p><strong>Compte</strong> : depuis « Mon espace », vous consultez, exportez et supprimez toutes vos données.</p>
        <p className="font-semibold"><CookieSettingsLink /></p>
      </div>
    </SimplePage>
  );
}
