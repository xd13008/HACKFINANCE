import { Fragment } from "react";
import { notFound } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin";
import { Card, PageHeader, Table } from "@/components/admin/ui";
import { HORIZONS, RELATIONS, SIZES } from "@/lib/members";

const lab = (list: readonly (readonly [string, string])[], k: string | null) => list.find(([v]) => v === k)?.[1] ?? k ?? "—";
const dt = (s: string) => new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

/** Profil complet d'un inscrit : déclaratif, logiciels, projets, recherches, navigation consentie. */
export default async function MemberDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const db = await serverClient();
  const { data: m } = await db.from("members").select("*").eq("id", id).maybeSingle();
  if (!m) notFound();
  const [{ data: sw }, { data: pj }, { data: vis }] = await Promise.all([
    db.from("member_software").select("software_name,relation,satisfaction,source").eq("member_id", id).order("software_name"),
    db.from("member_projects").select("horizon,categories(name)").eq("member_id", id),
    db.from("visitors").select("id").eq("member_id", id),
  ]);
  const vids = (vis ?? []).map((v) => v.id);
  const [{ data: searches }, { data: events }] = vids.length ? await Promise.all([
    db.from("visitor_searches").select("occurred_at,company_size,stack,need_slug,result_slugs").in("visitor_id", vids).order("occurred_at", { ascending: false }).limit(100),
    db.from("visitor_events").select("occurred_at,event_type,path").in("visitor_id", vids).order("occurred_at", { ascending: false }).limit(300),
  ]) : [{ data: [] }, { data: [] }];
  const rows: [string, string | null][] = [
    ["Prénom", m.first_name], ["Fonction", m.job_title], ["Entreprise", m.company_name], ["Taille", lab(SIZES, m.company_size)],
    ["Secteur", m.sector], ["Région", m.region], ["Équipe finance", m.finance_team_size], ["ERP / comptabilité", m.erp], ["Priorités", m.notes],
    ["Newsletter", m.consent_newsletter ? `oui, depuis le ${dt(m.newsletter_consent_at!)}` : "non"], ["Consentement", `${dt(m.consent_at)} : ${m.consent_text}`],
    ["Source", m.source_path],
  ];
  return (
    <div className="space-y-4">
      <PageHeader title={m.email} intro={`Inscrit le ${dt(m.created_at)} · ${m.status} · dernière visite ${m.last_seen_at ? dt(m.last_seen_at) : "—"}`} />
      <Card><dl className="grid sm:grid-cols-[180px_1fr] gap-x-4 gap-y-1 text-sm">{rows.map(([k, v]) => <Fragment key={k}><dt className="text-ink-3">{k}</dt><dd>{v ?? "—"}</dd></Fragment>)}</dl></Card>
      <Card><h2 className="font-bold mb-2">Logiciels ({sw?.length ?? 0})</h2>
        <Table head={["Logiciel", "Statut", "Satisfaction", "Origine"]} empty="Aucun.">
          {(sw ?? []).map((x) => <tr key={x.software_name}><td className="py-1 pr-3">{x.software_name}</td><td className="pr-3">{lab(RELATIONS, x.relation)}</td><td className="pr-3">{x.satisfaction ? `${x.satisfaction}/5` : "—"}</td><td>{x.source === "search" ? "recherche" : "déclaré"}</td></tr>)}
        </Table></Card>
      <Card><h2 className="font-bold mb-2">Projets</h2>
        <ul className="text-sm">{(pj ?? []).map((p, i) => <li key={i}>{(p.categories as { name?: string } | null)?.name} · {lab(HORIZONS, p.horizon)}</li>)}{!pj?.length && <li className="text-ink-3">Aucun.</li>}</ul></Card>
      <Card><h2 className="font-bold mb-2">Recherches « Trouver » ({searches?.length ?? 0})</h2>
        <Table head={["Date", "Besoin", "Taille", "Outils en place", "Solutions proposées"]} empty="Aucune (cookie de personnalisation non accepté ou pas encore de recherche).">
          {(searches ?? []).map((x, i) => <tr key={i}><td className="py-1 pr-3 text-xs">{dt(x.occurred_at)}</td><td className="pr-3">{x.need_slug}</td><td className="pr-3">{x.company_size}</td><td className="pr-3">{x.stack.join(", ")}</td><td className="text-xs">{x.result_slugs.join(", ")}</td></tr>)}
        </Table></Card>
      <Card><h2 className="font-bold mb-2">Navigation consentie ({events?.length ?? 0} dernières actions)</h2>
        <Table head={["Date", "Action", "Page"]} empty="Aucune.">
          {(events ?? []).map((x, i) => <tr key={i}><td className="py-1 pr-3 text-xs">{dt(x.occurred_at)}</td><td className="pr-3">{x.event_type}</td><td className="text-xs">{x.path}</td></tr>)}
        </Table></Card>
    </div>
  );
}
