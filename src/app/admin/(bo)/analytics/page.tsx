import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { currentSite, periodFrom, requireStaff } from "@/lib/admin";
import { Card, PageHeader, Stat, Table, inputCls } from "@/components/admin/ui";
import { BarList, LineChart } from "@/components/admin/Charts";
import { CONTENT_TYPE_LABEL } from "@/lib/seo";
import { formatNum } from "@/lib/format";

const STEP_LABEL = (s: string) => s === "entrée" ? "Entrée" : s.startsWith("clic:") ? `Clic ${s.slice(5)}` : s === "formulaire" ? "Formulaire" : (CONTENT_TYPE_LABEL[s] ?? s);

export default async function Analytics({ searchParams }: { searchParams: Promise<{ days?: string; rubrique?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const { site } = await currentSite();
  const { from, to, days } = periodFrom(sp);
  const db = await serverClient();
  const sid = (site?.id ?? null) as string;
  const rub = sp.rubrique || undefined;
  const [daily, byRub, pages, sources, journeys, funnel] = await Promise.all([
    db.rpc("analytics_daily", { p_site: sid, p_from: from, p_to: to }),
    db.rpc("analytics_by_rubrique", { p_site: sid, p_from: from, p_to: to }),
    db.rpc("analytics_top_pages", { p_site: sid, p_from: from, p_to: to, p_limit: 25 }),
    db.rpc("analytics_sources", { p_site: sid, p_from: from, p_to: to }),
    db.rpc("analytics_journeys", { p_site: sid, p_from: from, p_to: to, p_rubrique: rub }),
    db.rpc("analytics_funnel", { p_site: sid, p_from: from, p_to: to, p_rubrique: rub }),
  ]);
  const d = daily.data ?? [];
  const total = (k: "pageviews" | "sessions" | "outbound_clicks" | "form_submits") => d.reduce((a, x) => a + Number(x[k] ?? 0), 0);
  const lbl = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  const f = funnel.data ?? [];
  const top = Number(f[0]?.sessions ?? 0) || 1;

  return (
    <div className="space-y-6">
      <PageHeader title="Audience et parcours" intro={`${site?.name ?? "Tous les portails"} · du ${from} au ${to}. Mesure first-party sans cookie : sessions = visiteurs uniques par jour.`}
        actions={
          <form className="flex gap-2 items-center">
            <select name="days" defaultValue={String(days)} className={`${inputCls} w-auto`}><option value="7">7 jours</option><option value="30">30 jours</option><option value="90">90 jours</option></select>
            <select name="rubrique" defaultValue={rub ?? ""} className={`${inputCls} w-auto`}>
              <option value="">Toutes les rubriques</option>{(byRub.data ?? []).map((r) => <option key={r.rubrique} value={r.rubrique!}>{r.rubrique}</option>)}
            </select>
            <button className="text-sm underline">Appliquer</button>
          </form>
        } />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Pages vues" value={formatNum(total("pageviews"))} />
        <Stat label="Sessions" value={formatNum(total("sessions"))} />
        <Stat label="Clics sortants" value={formatNum(total("outbound_clicks"))} hint={`${(100 * total("outbound_clicks") / Math.max(1, total("pageviews"))).toFixed(1)} % des pages vues`} />
        <Stat label="Formulaires" value={formatNum(total("form_submits"))} />
      </div>

      <Card title="Évolution quotidienne">
        <LineChart title="Pages vues et sessions" series={[
          { name: "Pages vues", color: "var(--viz-series-1)", points: d.map((x) => ({ label: lbl(x.day!), value: Number(x.pageviews) })) },
          { name: "Sessions", color: "var(--viz-series-2)", points: d.map((x) => ({ label: lbl(x.day!), value: Number(x.sessions) })) },
        ]} />
      </Card>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card title={`Entonnoir${rub ? ` — rubrique ${rub}` : ""}`}>
          <BarList rows={f.map((s) => ({ label: s.label!, value: Number(s.sessions), hint: `(${Math.round((100 * Number(s.sessions)) / top)} %)` }))} />
          <p className="text-xs text-ink-3 mt-2">Sessions distinctes ayant atteint chaque étape.</p>
        </Card>
        <Card title="Sources d'acquisition">
          <BarList rows={(sources.data ?? []).map((s) => ({ label: s.source!, value: Number(s.sessions) }))} />
        </Card>
      </div>

      <Card title="Par rubrique">
        <Table head={["Rubrique", "Pages vues", "Sessions", "Clics sortants", "Taux de clic", "Formulaires", ""]}>
          {(byRub.data ?? []).map((r) => (
            <tr key={r.rubrique}>
              <td className="py-2 pr-3 font-medium">{r.rubrique}</td>
              <td className="pr-3 tabular-nums">{formatNum(Number(r.pageviews))}</td>
              <td className="pr-3 tabular-nums">{formatNum(Number(r.sessions))}</td>
              <td className="pr-3 tabular-nums">{formatNum(Number(r.outbound_clicks))}</td>
              <td className="pr-3 tabular-nums">{r.click_rate ?? 0} %</td>
              <td className="pr-3 tabular-nums">{formatNum(Number(r.form_submits))}</td>
              <td><Link className="text-xs underline" href={`/admin/analytics?days=${days}&rubrique=${encodeURIComponent(r.rubrique!)}`}>parcours</Link></td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title={`Parcours : transitions entre gabarits${rub ? ` (sessions passées par ${rub})` : ""}`}>
        <p className="text-xs text-ink-3 mb-2">Chaque ligne compte les passages d&apos;une étape à la suivante dans une même session (« Entrée » = première page vue).</p>
        <BarList rows={(journeys.data ?? []).slice(0, 20).map((j) => ({ label: `${STEP_LABEL(j.from_step!)} → ${STEP_LABEL(j.to_step!)}`, value: Number(j.transitions) }))} />
      </Card>

      <Card title="Pages les plus vues">
        <Table head={["Page", "Gabarit", "Rubrique", "Vues", "Entrées", "Clics sortants"]}>
          {(pages.data ?? []).map((p) => (
            <tr key={p.path}>
              <td className="py-2 pr-3 font-mono text-xs">{p.path}</td>
              <td className="pr-3">{CONTENT_TYPE_LABEL[p.page_type ?? ""] ?? p.page_type}</td>
              <td className="pr-3 text-ink-2">{p.rubrique}</td>
              <td className="pr-3 tabular-nums">{formatNum(Number(p.pageviews))}</td>
              <td className="pr-3 tabular-nums">{formatNum(Number(p.entries))}</td>
              <td className="tabular-nums">{formatNum(Number(p.outbound_clicks))}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
