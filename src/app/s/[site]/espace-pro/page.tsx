import Link from "next/link";
import type { Metadata } from "next";
import { getInventory, listCategories } from "@/lib/data";
import { formatEur } from "@/lib/format";
import { staticMetadata } from "@/lib/seo";
import { ListingForm } from "@/components/public/Forms";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { Tracker } from "@/components/public/Tracker";
import { requireSite, type SiteParams } from "../_lib";

export const revalidate = 300;
type SP = Promise<{ type?: string }>;
const TYPE_LABEL: Record<string, string> = {
  category_sponsored: "Position sponsorisée sur un comparatif", enhanced_listing: "Fiche enrichie", guide_banner: "Encart dans les guides",
  newsletter: "Newsletter", simulator_sponsor: "Sponsoring de simulateur", directory_featured: "Mise en avant dans l'annuaire",
};
const PROMISES = [
  "Le référencement de base est gratuit et le reste.",
  "La note éditoriale vient uniquement de nos tests : aucune offre ne l'achète, aucune ne la modifie.",
  "Chaque emplacement payant est signalé « Sponsorisé » et affiché hors du classement.",
  "Vous disposez d'un droit de réponse sur chaque contenu qui vous concerne.",
  "Les demandes de mise en relation ne vous sont transmises qu'avec l'accord explicite du visiteur, solution par solution.",
];

export async function generateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const site = await requireSite((await params).site);
  return staticMetadata(site, "/espace-pro", `Espace pro : référencer votre solution ou votre cabinet — ${site.name}`,
    "Référencement gratuit après vérification, offres de visibilité signalées, mises en relation avec l'accord du visiteur. La note éditoriale ne s'achète pas.");
}

/** Maquette, écran 6 : espace pro (référencement gratuit, engagements, offres de visibilité, demandes reçues). */
export default async function EspacePro({ params, searchParams }: { params: SiteParams; searchParams: SP }) {
  const site = await requireSite((await params).site);
  const kind = (await searchParams).type === "cabinet" ? "provider" : "software";
  const [softwareCats, providerCats, inventory] = await Promise.all([listCategories(site.id, "software"), listCategories(site.id, "provider"), getInventory(site.id)]);
  return (
    <div>
      <Tracker site={site.key} pageType="pro_space" />
      <section className="bg-brand text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5"><nav aria-label="Rubriques de l'espace pro" className="flex flex-wrap gap-x-6 text-sm font-semibold">
          <a href="#referencer" className="py-3 text-white">Se référencer</a><a href="#engagements" className="py-3 text-white">Nos engagements</a>
          <a href="#offres" className="py-3 text-white">Offres</a><a href="#demandes" className="py-3 text-white">Demandes reçues</a></nav></div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-12">
          <p className="m-0 mb-3 text-sm font-bold uppercase tracking-wider text-accent">Espace pro</p>
          <h1 className="m-0 font-display font-extrabold text-4xl sm:text-6xl leading-[1.02] tracking-[-0.03em] max-w-4xl">Référencez votre solution ou votre cabinet, gratuitement</h1>
          <p className="m-0 mt-4 text-lg text-zinc-300 max-w-3xl">Votre fiche apparaît dans les catégories que vous choisissez, après vérification par la rédaction. La note éditoriale vient uniquement de nos tests : aucune offre ne l&apos;achète.</p>
        </div>
      </section>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-12">
        <Breadcrumbs items={[{ name: "Accueil", path: "/" }, { name: "Espace pro", path: "/espace-pro" }]} />
        <section id="referencer" className="scroll-mt-20 flex flex-wrap gap-8 items-start">
          <div className="flex-[2_1_480px] rounded-3xl border border-line bg-white p-6">
            <h2 className="m-0 mb-4 text-2xl font-extrabold">Créer ma fiche</h2>
            <nav aria-label="Vous êtes" className="flex flex-wrap gap-2 mb-5">
              <Link href="/espace-pro?type=logiciel#referencer" aria-current={kind === "software" ? "page" : undefined} className={`inline-flex items-center min-h-11 px-4 rounded-lg text-sm font-bold no-underline ${kind === "software" ? "bg-ink text-white" : "border border-line"}`}>Éditeur de logiciel</Link>
              <Link href="/espace-pro?type=cabinet#referencer" aria-current={kind === "provider" ? "page" : undefined} className={`inline-flex items-center min-h-11 px-4 rounded-lg text-sm font-bold no-underline ${kind === "provider" ? "bg-ink text-white" : "border border-line"}`}>Cabinet, prestataire ou organisme de formation</Link>
            </nav>
            <ListingForm site={site.key} kind={kind} categories={(kind === "software" ? softwareCats : providerCats).map((c) => ({ id: c.id, name: c.name }))} />
            <p className="m-0 mt-4 text-sm text-ink-3">Statut affiché ensuite sur la fiche : « Référencé, non testé », puis « Testé le … » après notre test.</p>
          </div>
          <div id="engagements" className="scroll-mt-20 flex-[1_1_300px] rounded-3xl bg-accent p-6">
            <h2 className="m-0 mb-3 text-2xl font-extrabold">Nos engagements envers vous</h2>
            <ul className="m-0 pl-5 flex flex-col gap-2">{PROMISES.map((p) => <li key={p}>{p}</li>)}</ul>
            <p className="m-0 mt-4 text-sm">Règles détaillées : <Link href="/publicite" className="underline">publicité et partenariats</Link>, <Link href="/methode" className="underline">méthode de notation</Link>.</p>
          </div>
        </section>
        <section id="offres" className="scroll-mt-20">
          <h2 className="m-0 mb-1 text-2xl font-extrabold">Offres de visibilité</h2>
          <p className="m-0 mb-4 text-ink-2">Toujours signalées « Sponsorisé », toujours hors du classement éditorial. Prix indicatifs selon l&apos;audience de chaque rubrique.</p>
          {inventory.length === 0 ? <p className="m-0 text-ink-3">Aucun emplacement ouvert pour l&apos;instant.</p> : (
            <ul className="m-0 p-0 list-none grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inventory.map((i) => (
                <li key={i.id} className="flex flex-col gap-1.5 rounded-2xl border border-line bg-white p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-3">{i.category_name ?? "Tout le site"}</span>
                  <strong className="text-lg">{TYPE_LABEL[i.placement_type!] ?? i.placement_type}{i.slot && i.slot > 1 ? ` (position ${i.slot})` : ""}</strong>
                  <span className="font-display font-extrabold text-2xl">{formatEur(Number(i.indicative_price_month))} <span className="text-sm font-sans font-normal">HT / mois, à partir de</span></span>
                </li>
              ))}
            </ul>
          )}
          <p className="m-0 mt-4"><Link href="/publicite/annoncer" className="inline-flex items-center min-h-12 px-6 rounded-lg bg-ink text-white font-bold no-underline">Demander une proposition</Link></p>
        </section>
        <section id="demandes" className="scroll-mt-20 rounded-3xl border border-line bg-white p-6">
          <h2 className="m-0 mb-2 text-2xl font-extrabold">Demandes reçues</h2>
          <p className="m-0 text-ink-2 max-w-3xl">Quand un DAF demande une démo ou un devis et coche votre solution, nous vous transmettons sa demande avec la preuve de son consentement (texte affiché, date, page d&apos;origine).
            Rien n&apos;est transmis sans cet accord. Le tableau de bord des demandes en ligne sera ouvert aux éditeurs et cabinets dont la fiche est revendiquée.</p>
          <p className="m-0 mt-4 text-sm">Votre fiche existe déjà ? <Link href="/signaler-une-erreur" className="underline">Demandez une correction</Link> ou <Link href="/referencer-mon-logiciel" className="underline">écrivez-nous</Link> pour la revendiquer.</p>
        </section>
      </div>
    </div>
  );
}
