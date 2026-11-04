import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { getContentByPath, getFacts, getPricing, getPrimaryCategory, getRanking, getSoftware } from "@/lib/data";
import type { Criterion } from "@/lib/data";
import { ContentArticle } from "@/components/public/ContentArticle";
import { ScoreBadge } from "@/components/public/ScoreBadge";
import { priceLabel } from "@/lib/format";
import { metadataFor, requireSite } from "../../_lib";

export const revalidate = 300; // secondes ; la publication revalide aussi la page immédiatement
type P = Promise<{ site: string; duel: string }>;

export async function generateMetadata({ params }: { params: P }) {
  const p = await params;
  return metadataFor(p.site, `/comparer/${p.duel}`);
}

export default async function DuelPage({ params }: { params: P }) {
  const p = await params;
  const m = p.duel.match(/^([a-z0-9-]+)-vs-([a-z0-9-]+)$/);
  if (!m) notFound();
  const [a, b] = [m[1], m[2]];
  // Une seule URL canonique par paire : ordre alphabétique.
  if (a > b) permanentRedirect(`/comparer/${b}-vs-${a}`);

  const site = await requireSite(p.site);
  const content = await getContentByPath(site.id, `/comparer/${p.duel}`);
  if (!content) notFound();
  const [swA, swB] = await Promise.all([getSoftware(a), getSoftware(b)]);
  if (!swA || !swB) notFound();
  const category = await getPrimaryCategory(swA.id);
  const ranking = category ? await getRanking(category.id) : [];
  const [rA, rB] = [ranking.find((r) => r.software.id === swA.id), ranking.find((r) => r.software.id === swB.id)];
  const [pricing, facts] = await Promise.all([getPricing([swA.id, swB.id]), getFacts([swA.id, swB.id])]);
  const criteria = (category?.criteria ?? []) as Criterion[];
  const profiles = ((content.data as { profiles?: { profile: string; winner: string; why: string }[] })?.profiles) ?? [];
  const entry = (id: string) => { const pl = pricing.get(id) ?? []; const e = pl.find((x) => x.billing_period !== "quote") ?? pl[0]; return e ? priceLabel(e) : "—"; };
  const yesNo = (id: string, k: string) => { const v = facts.get(id)?.get(k)?.value; return v === true ? "Oui" : v === false ? "Non" : v != null ? String(v) : "—"; };

  const table = (
    <section className="my-6 overflow-x-auto">
      <table className="w-full text-sm border border-line">
        <thead className="bg-surface-2">
          <tr><th className="p-2 text-left">Critère</th>
            <th className="p-2 text-left"><Link href={`/logiciels/${swA.slug}`} className="underline">{swA.name}</Link></th>
            <th className="p-2 text-left"><Link href={`/logiciels/${swB.slug}`} className="underline">{swB.name}</Link></th></tr>
        </thead>
        <tbody>
          <tr className="border-t border-line"><td className="p-2 font-semibold">Note globale</td>
            <td className="p-2">{rA && <ScoreBadge score={rA.overall} size="sm" />}</td><td className="p-2">{rB && <ScoreBadge score={rB.overall} size="sm" />}</td></tr>
          {criteria.map((c) => (
            <tr key={c.key} className="border-t border-line"><td className="p-2 text-ink-2">{c.label}</td>
              <td className="p-2 tabular-nums">{rA?.criteria[c.key]?.toFixed(1) ?? "—"}</td><td className="p-2 tabular-nums">{rB?.criteria[c.key]?.toFixed(1) ?? "—"}</td></tr>
          ))}
          <tr className="border-t border-line"><td className="p-2 text-ink-2">Prix d&apos;entrée</td><td className="p-2">{entry(swA.id)}</td><td className="p-2">{entry(swB.id)}</td></tr>
          <tr className="border-t border-line"><td className="p-2 text-ink-2">Offre gratuite</td><td className="p-2">{yesNo(swA.id, "free_plan")}</td><td className="p-2">{yesNo(swB.id, "free_plan")}</td></tr>
          <tr className="border-t border-line"><td className="p-2 text-ink-2">Multi-entités</td><td className="p-2">{yesNo(swA.id, "multi_entity")}</td><td className="p-2">{yesNo(swB.id, "multi_entity")}</td></tr>
        </tbody>
      </table>
      {profiles.length > 0 && (
        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          {profiles.map((pr) => (
            <div key={pr.profile} className="rounded-xl border border-line p-4">
              <p className="text-sm text-ink-3">Vous êtes : {pr.profile}</p>
              <p className="font-bold mt-1">→ {pr.winner === swA.slug ? swA.name : swB.name}</p>
              <p className="text-sm text-ink-2 mt-1">{pr.why}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <ContentArticle
      site={site} content={content} rubrique={category?.slug} article={false}
      crumbs={[{ name: "Accueil", path: "/" }, ...(category ? [{ name: category.name, path: `/meilleurs-logiciels/${category.slug}` }] : []),
               { name: `${swA.name} vs ${swB.name}`, path: content.path! }]}
      before={table}
    />
  );
}
