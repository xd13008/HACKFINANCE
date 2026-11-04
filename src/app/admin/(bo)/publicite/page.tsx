import { serverClient } from "@/lib/supabase/server";
import { currentSite, periodFrom, requireRole } from "@/lib/admin";
import { Badge, Card, Field, PageHeader, StatusBadge, Table, inputCls } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { createSponsoredPlacement, endPlacement, updatePlacementRequest } from "@/lib/actions/admin";
import { formatEur, formatNum } from "@/lib/format";

const TYPE: Record<string, string> = {
  category_sponsored: "Position sponsorisée", enhanced_listing: "Fiche enrichie", guide_banner: "Encart guides",
  newsletter: "Newsletter", simulator_sponsor: "Sponsoring simulateur", directory_featured: "Mise en avant annuaire",
};
const STAGES = ["new", "qualified", "quote_sent", "signed", "active", "ended", "lost"] as const;

export default async function AdDesk() {
  await requireRole("sales", "admin");
  const { site } = await currentSite();
  const db = await serverClient();
  const { from, to } = periodFrom({});
  let rq = db.from("placement_requests").select("*, sites(name)").order("created_at", { ascending: false });
  let iq = db.from("placement_inventory_priced").select("*").order("placement_type");
  if (site) { rq = rq.eq("site_id", site.id); iq = iq.eq("site_id", site.id); }
  const [{ data: requests }, { data: inventory }, { data: placements }, perf, { data: sw }, { data: prov }, { data: cats }] = await Promise.all([
    rq, iq,
    db.from("sponsored_placements").select("*, software(name), providers(name), placement_inventory(site_id,placement_type,slot,category_id)").order("starts_on", { ascending: false }),
    db.rpc("analytics_placements", { p_site: (site?.id ?? null) as string, p_from: from, p_to: to }),
    db.from("software").select("id,name").eq("status", "published").order("name"),
    db.from("providers").select("id,name").eq("status", "published").order("name"),
    db.from("categories").select("id,name"),
  ]);
  const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
  const perfBy = new Map((perf.data ?? []).map((p) => [p.placement_id, p]));
  const visible = (placements ?? []).filter((p) => !site || (p.placement_inventory as unknown as { site_id: string }).site_id === site.id);
  const today = new Date().toISOString().slice(0, 10);
  const busy = (invId: string) => visible.find((p) => p.inventory_id === invId && ["scheduled", "active"].includes(p.status) && p.ends_on >= today);
  const pipeline = STAGES.map((s) => ({ s, items: (requests ?? []).filter((r) => r.status === s) }));
  const pipeValue = (requests ?? []).filter((r) => ["quote_sent", "signed"].includes(r.status)).reduce((a, r) => a + Number(r.quoted_amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Régie publicitaire" intro={`Demandes d'apparition, inventaire et performance des emplacements. Le commercial ne peut modifier ni note ni classement. Pipeline en devis/signé : ${formatEur(pipeValue)}.`} />

      <Card title="Pipeline des demandes d'emplacement">
        <div className="grid md:grid-cols-4 xl:grid-cols-7 gap-3">
          {pipeline.map(({ s, items }) => (
            <div key={s} className="rounded-lg bg-surface-2 p-2 min-h-24">
              <p className="text-xs font-semibold mb-2 flex justify-between"><StatusBadge status={s} /><span>{items.length}</span></p>
              <ul className="space-y-2">
                {items.map((r) => (
                  <li key={r.id} className="rounded-md bg-surface border border-line p-2 text-xs">
                    <p className="font-semibold">{r.advertiser_name}</p>
                    <p className="text-ink-3">{(r.placement_types ?? []).map((t) => TYPE[t]).join(", ") || "—"}</p>
                    <p className="text-ink-3">{(r.category_ids ?? []).map((c) => catName.get(c)).join(", ")}</p>
                    {r.budget_range && <p>{r.budget_range}</p>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Traiter une demande">
        <div className="space-y-3">
          {(requests ?? []).filter((r) => !["ended", "lost"].includes(r.status)).map((r) => (
            <details key={r.id} className="rounded-lg border border-line p-3">
              <summary className="cursor-pointer text-sm"><strong>{r.advertiser_name}</strong> · {r.contact_name} &lt;{r.contact_email}&gt; · {(r.sites as unknown as { name: string }).name} <StatusBadge status={r.status} /></summary>
              {r.message && <p className="text-sm text-ink-2 mt-2">« {r.message} »</p>}
              <p className="text-xs text-ink-3 mt-1">Période souhaitée : {r.period_start ?? "?"} → {r.period_end ?? "?"}</p>
              <ActionForm action={updatePlacementRequest} submit="Enregistrer" className="mt-2 grid sm:grid-cols-[10rem_10rem_1fr_auto] gap-2 items-end">
                <input type="hidden" name="request_id" value={r.id} />
                <Field label="Étape"><select name="status" defaultValue={r.status} className={inputCls}>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
                <Field label="Montant du devis (€)"><input name="quoted_amount" type="number" defaultValue={r.quoted_amount ?? ""} className={inputCls} /></Field>
                <Field label="Notes"><input name="notes" defaultValue={r.notes ?? ""} className={inputCls} /></Field>
              </ActionForm>
            </details>
          ))}
        </div>
      </Card>

      <Card title="Inventaire et disponibilité">
        <Table head={["Emplacement", "Rubrique", "Prix indicatif / mois", "Occupé par", "Jusqu'au"]}>
          {(inventory ?? []).map((i) => {
            const b = busy(i.id!);
            return (
              <tr key={i.id}>
                <td className="py-2 pr-3">{TYPE[i.placement_type!]} {i.slot && i.slot > 1 && `#${i.slot}`} <Badge>{i.label}</Badge></td>
                <td className="pr-3 text-ink-2">{i.category_name ?? "Tout le site"}</td>
                <td className="pr-3 tabular-nums">{formatEur(Number(i.indicative_price_month))}</td>
                <td className="pr-3">{b ? ((b.software as unknown as { name: string } | null)?.name ?? (b.providers as unknown as { name: string } | null)?.name) : <Badge tone="good">Libre</Badge>}</td>
                <td>{b?.ends_on ?? "—"}</td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card title="Emplacements programmés et performance (30 j)">
          <Table head={["Annonceur", "Emplacement", "Période", "Impr.", "Clics", "CTR", ""]}>
            {visible.map((p) => {
              const inv = p.placement_inventory as unknown as { placement_type: string; slot: number; category_id: string | null };
              const pf = perfBy.get(p.id);
              return (
                <tr key={p.id}>
                  <td className="py-2 pr-2">{(p.software as unknown as { name: string } | null)?.name ?? (p.providers as unknown as { name: string } | null)?.name}</td>
                  <td className="pr-2 text-ink-2">{TYPE[inv.placement_type]} · {inv.category_id ? catName.get(inv.category_id) : "site"}</td>
                  <td className="pr-2 text-xs">{p.starts_on} → {p.ends_on} <StatusBadge status={p.status} /></td>
                  <td className="pr-2 tabular-nums">{formatNum(Number(pf?.impressions ?? 0))}</td>
                  <td className="pr-2 tabular-nums">{formatNum(Number(pf?.clicks ?? 0))}</td>
                  <td className="pr-2 tabular-nums">{pf?.ctr != null ? `${pf.ctr} %` : "—"}</td>
                  <td>{p.status !== "ended" && <form action={endPlacement}><input type="hidden" name="placement_id" value={p.id} /><button className="text-xs underline">Terminer</button></form>}</td>
                </tr>
              );
            })}
          </Table>
        </Card>
        <Card title="Programmer un emplacement">
          <ActionForm action={createSponsoredPlacement} submit="Programmer">
            <Field label="Emplacement"><select name="inventory_id" className={inputCls}>{(inventory ?? []).map((i) => <option key={i.id} value={i.id!}>{TYPE[i.placement_type!]} #{i.slot} · {i.category_name ?? "site"}</option>)}</select></Field>
            <Field label="Annonceur (fiche)"><select name="target" className={inputCls}>
              <optgroup label="Logiciels">{(sw ?? []).map((s) => <option key={s.id} value={`software:${s.id}`}>{s.name}</option>)}</optgroup>
              <optgroup label="Prestataires">{(prov ?? []).map((s) => <option key={s.id} value={`provider:${s.id}`}>{s.name}</option>)}</optgroup>
            </select></Field>
            <Field label="Accroche"><input name="headline" className={inputCls} /></Field>
            <div className="grid sm:grid-cols-2 gap-2">
              <Field label="Libellé du bouton"><input name="cta_label" className={inputCls} /></Field>
              <Field label="URL de destination"><input name="cta_url" className={inputCls} /></Field>
              <Field label="Début"><input type="date" name="starts_on" required className={inputCls} /></Field>
              <Field label="Fin"><input type="date" name="ends_on" required className={inputCls} /></Field>
            </div>
            <p className="text-xs text-ink-3">L&apos;emplacement s&apos;affiche toujours avec la mention de l&apos;inventaire (« Sponsorisé »…), hors du classement éditorial.</p>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
