import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { currentSite, requireRole } from "@/lib/admin";
import { Badge, Card, Field, PageHeader, StatusBadge, Table, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { addRedirect, importKeywords } from "@/lib/actions/admin";
import { formatNum } from "@/lib/format";

/** Les 7 piliers SEO pilotés depuis une seule page. */
export default async function SeoPage() {
  await requireRole("editor", "admin");
  const { site, sites } = await currentSite();
  const db = await serverClient();
  const sid = site?.id;
  let kq = db.from("keyword_targets").select("*, content_items!keyword_targets_target_content_id_fkey(id,path,status)").order("priority", { ascending: false }).limit(60);
  let lq = db.from("internal_link_stats").select("*");
  let sq = db.from("stale_content").select("*").order("review_due_at");
  let rq = db.from("redirects").select("*").order("created_at", { ascending: false }).limit(30);
  if (sid) { kq = kq.eq("site_id", sid); lq = lq.eq("site_id", sid); sq = sq.eq("site_id", sid); rq = rq.eq("site_id", sid); }
  const [{ data: kws }, gsc, { data: links }, { data: stale }, { data: redirects }] = await Promise.all([
    kq, db.rpc("gsc_summary", { p_site: (sid ?? null) as string, p_days: 28 }), lq, sq, rq,
  ]);
  const rows = gsc.data ?? [];
  // Opportunités : positions 4 à 15 avec des impressions
  const striking = rows.filter((r) => Number(r.avg_position) >= 4 && Number(r.avg_position) <= 15 && Number(r.impressions) >= 50)
    .sort((a, b) => Number(b.impressions) - Number(a.impressions)).slice(0, 15);
  // CTR anormalement bas pour la position (courbe de référence simplifiée)
  const expected = (pos: number) => pos <= 1 ? 28 : pos <= 3 ? 15 : pos <= 5 ? 8 : pos <= 10 ? 3 : 1;
  const lowCtr = rows.filter((r) => Number(r.impressions) >= 100 && Number(r.ctr ?? 0) < expected(Number(r.avg_position)) / 2).slice(0, 10);
  // Cannibalisation : une requête → plusieurs pages
  const byQuery = new Map<string, typeof rows>();
  for (const r of rows) byQuery.set(r.query!, [...(byQuery.get(r.query!) ?? []), r]);
  const cannibal = [...byQuery].filter(([, v]) => v.length > 1 && v.filter((x) => Number(x.impressions) >= 20).length > 1);
  const orphans = (links ?? []).filter((l) => Number(l.inbound_body_links) === 0 && !["home", "page"].includes(l.type!));
  const uncovered = (kws ?? []).filter((k) => !k.target_content_id && k.status !== "ignored");

  return (
    <div className="space-y-6">
      <PageHeader title="SEO" intro="Plan de production (mots-clés → pages), opportunités Search Console, cannibalisation, maillage, fraîcheur et redirections." />

      <div className="grid xl:grid-cols-2 gap-6">
        <Card title={`1 · Plan de production — ${uncovered.length} mot(s)-clé(s) sans page`}>
          <Table head={["Mot-clé", "Vol.", "CPC", "KD", "Priorité", "Page cible"]}>
            {(kws ?? []).slice(0, 30).map((k) => {
              const target = k.content_items as unknown as { id: string; path: string; status: string } | null;
              return (
                <tr key={k.id}>
                  <td className="py-1.5 pr-2">{k.keyword}{k.intent === "commercial" && <Badge tone="info">commercial</Badge>}</td>
                  <td className="pr-2 tabular-nums">{formatNum(k.volume)}</td>
                  <td className="pr-2 tabular-nums">{k.cpc_eur} €</td>
                  <td className="pr-2 tabular-nums">{k.kd}</td>
                  <td className="pr-2 tabular-nums font-medium">{formatNum(Number(k.priority))}</td>
                  <td>{target ? <Link href={`/admin/contenus/${target.id}`} className="underline text-xs">{target.path}</Link> : <Link href={`/admin/contenus/nouveau?keyword=${encodeURIComponent(k.keyword)}`} className="text-xs underline text-amber-700">créer la page</Link>}</td>
                </tr>
              );
            })}
          </Table>
          <details className="mt-3">
            <summary className="text-sm cursor-pointer underline">Importer un export Semrush</summary>
            <ActionForm action={importKeywords} submit="Importer" className="mt-2 space-y-2">
              <Field label="Portail"><select name="site_id" defaultValue={sid ?? sites[0]?.id} className={inputCls}>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
              <Field label="Lignes « mot-clé;volume;cpc;kd;cluster »"><textarea name="csv" rows={5} className={`${inputCls} font-mono text-xs`} /></Field>
            </ActionForm>
          </details>
        </Card>

        <Card title="7 · Opportunités : positions 4 à 15 (28 j)">
          <Table head={["Requête", "Page", "Impr.", "Clics", "Position"]} empty="Aucune donnée Search Console importée.">
            {striking.map((r) => (
              <tr key={r.page! + r.query}><td className="py-1.5 pr-2">{r.query}</td><td className="pr-2 font-mono text-xs">{r.page}</td>
                <td className="pr-2 tabular-nums">{formatNum(Number(r.impressions))}</td><td className="pr-2 tabular-nums">{formatNum(Number(r.clicks))}</td>
                <td className="tabular-nums font-medium">{r.avg_position}</td></tr>
            ))}
          </Table>
        </Card>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card title="CTR anormalement bas (title / meta à retravailler)">
          <Table head={["Requête", "Page", "Position", "CTR"]} empty="Rien à signaler.">
            {lowCtr.map((r) => <tr key={r.page! + r.query}><td className="py-1.5 pr-2">{r.query}</td><td className="pr-2 font-mono text-xs">{r.page}</td><td className="pr-2">{r.avg_position}</td><td className="text-red-700">{r.ctr} %</td></tr>)}
          </Table>
        </Card>
        <Card title="Cannibalisation (une requête, plusieurs pages)">
          {cannibal.length === 0 ? <p className="text-sm text-ink-3">Aucune cannibalisation détectée.</p> : (
            <ul className="text-sm space-y-2">{cannibal.map(([q, v]) => <li key={q}><strong>{q}</strong><ul className="ml-4 text-xs text-ink-2">{v.map((x) => <li key={x.page}>{x.page} · pos. {x.avg_position} · {x.impressions} impr.</li>)}</ul></li>)}</ul>
          )}
        </Card>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card title={`3 · Maillage : ${orphans.length} page(s) sans lien entrant éditorial`}>
          <p className="text-xs text-ink-3 mb-2">Les blocs automatiques (fil d&apos;Ariane, « À lire aussi ») existent, mais un lien contextuel depuis un corps de texte pèse davantage.</p>
          <Table head={["Page", "Liens entrants", "Liens sortants"]}>
            {orphans.slice(0, 20).map((l) => <tr key={l.id}><td className="py-1.5 pr-2 font-mono text-xs">{l.path}</td><td className="pr-2">{l.inbound_body_links}</td><td>{l.outbound_body_links}</td></tr>)}
          </Table>
        </Card>
        <Card title={`6 · Fraîcheur : ${stale?.length ?? 0} contenu(s) à revoir sous 14 jours`}>
          <Table head={["Page", "Revue due", ""]} empty="Tout est à jour.">
            {(stale ?? []).map((s) => <tr key={s.id}><td className="py-1.5 pr-2 font-mono text-xs">{s.path}</td><td className="pr-2">{s.review_due_at && new Date(s.review_due_at).toLocaleDateString("fr-FR")}</td><td><Link href={`/admin/contenus/${s.id}`} className="text-xs underline">revoir</Link></td></tr>)}
          </Table>
        </Card>
      </div>

      <Card title="5 · Redirections">
        <Table head={["De", "Vers", "Code", "Motif"]} empty="Aucune redirection.">
          {(redirects ?? []).map((r) => <tr key={r.id}><td className="py-1.5 pr-2 font-mono text-xs">{r.from_path}</td><td className="pr-2 font-mono text-xs">{r.to_path}</td><td className="pr-2"><StatusBadge status={String(r.status_code)} /></td><td className="text-ink-3">{r.reason}</td></tr>)}
        </Table>
        <ActionForm action={addRedirect} submit="Ajouter" className="mt-3 grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
          <Field label="Portail"><select name="site_id" defaultValue={sid ?? sites[0]?.id} className={inputCls}>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="De"><input name="from_path" required pattern="/.*" className={inputCls} /></Field>
          <Field label="Vers"><input name="to_path" required pattern="/.*" className={inputCls} /></Field>
        </ActionForm>
      </Card>

      <Card title="2 · 4 · Briefs et données structurées">
        <p className="text-sm text-ink-2">Le brief SEO et la checklist bloquante se trouvent dans chaque <Link href="/admin/contenus" className="underline">contenu</Link>. Les données structurées (BreadcrumbList, ItemList, SoftwareApplication + Review, Article, FAQPage, DefinedTerm, ProfessionalService) sont générées automatiquement depuis la base et vérifiées par les tests.</p>
      </Card>
    </div>
  );
}
