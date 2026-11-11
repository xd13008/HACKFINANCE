import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { currentSite, requireRole } from "@/lib/admin";
import { Card, PageHeader, Table, inputCls } from "@/components/admin/ui";
import { SIZES } from "@/lib/members";

const PAGE = 100;

/** DAF inscrits : réservé à l'admin (RLS). Lecture seule ; la suppression passe par le DAF ou une demande d'effacement. */
export default async function Members({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim().slice(0, 80);
  const { site } = await currentSite();
  const db = await serverClient();
  let query = db.from("members").select("id,email,status,first_name,job_title,company_name,company_size,consent_newsletter,created_at,last_seen_at", { count: "exact" });
  if (site) query = query.eq("site_id", site.id);
  if (q) query = query.or(`email.ilike.%${q.replace(/[,()%*]/g, " ")}%,company_name.ilike.%${q.replace(/[,()%*]/g, " ")}%`);
  const { data, count } = await query.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const [{ count: active }, { count: newsletter }, { count: visitors }, { count: searches }] = await Promise.all([
    db.from("members").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("members").select("id", { count: "exact", head: true }).eq("status", "active").eq("consent_newsletter", true),
    db.from("visitors").select("id", { count: "exact", head: true }).eq("consent->>personalisation", "true"),
    db.from("visitor_searches").select("id", { count: "exact", head: true }),
  ]);
  const size = (k: string | null) => SIZES.find(([v]) => v === k)?.[1] ?? "—";
  return (
    <div>
      <PageHeader title="DAF inscrits" intro="Données personnelles : accès réservé à l'admin. Ne pas exporter ni transmettre à un tiers sans accord explicite de la personne." />
      <div className="grid sm:grid-cols-4 gap-3 mb-4">
        {[["Comptes actifs", active], ["Abonnés newsletter", newsletter], ["Navigateurs consentants", visitors], ["Recherches enregistrées", searches]].map(([l, n]) => (
          <Card key={l as string}><p className="text-sm text-ink-3">{l}</p><p className="text-2xl font-bold">{(n as number ?? 0).toLocaleString("fr-FR")}</p></Card>
        ))}
      </div>
      <Card>
        <form className="flex gap-2 items-end mb-4">
          <label className="text-sm">Recherche (e-mail ou entreprise)<input name="q" defaultValue={q} className={inputCls} /></label>
          <button className="rounded-lg bg-brand text-white px-4 py-2 text-sm">Filtrer</button>
        </form>
        <Table head={["Inscrit", "Entreprise", "Statut", "Newsletter", "Inscription", "Dernière visite"]} empty="Aucun inscrit pour le moment.">
          {(data ?? []).map((m) => (
            <tr key={m.id}>
              <td className="py-2 pr-3"><Link href={`/admin/inscrits/${m.id}`} className="underline font-medium">{m.email}</Link><p className="text-xs text-ink-3">{[m.first_name, m.job_title].filter(Boolean).join(" · ")}</p></td>
              <td className="pr-3">{m.company_name ?? "—"}<p className="text-xs text-ink-3">{size(m.company_size)}</p></td>
              <td className="pr-3">{m.status === "active" ? "actif" : m.status === "pending" ? "à confirmer" : "désinscrit"}</td>
              <td className="pr-3">{m.consent_newsletter ? "oui" : "non"}</td>
              <td className="pr-3 text-xs">{new Date(m.created_at).toLocaleDateString("fr-FR")}</td>
              <td className="text-xs">{m.last_seen_at ? new Date(m.last_seen_at).toLocaleDateString("fr-FR") : "—"}</td>
            </tr>
          ))}
        </Table>
        <p className="text-sm text-ink-3 mt-3">{(count ?? 0).toLocaleString("fr-FR")} inscrit(s)
          {page > 1 && <> · <Link className="underline" href={`?${new URLSearchParams({ ...(q && { q }), page: String(page - 1) })}`}>← Précédente</Link></>}
          {page * PAGE < (count ?? 0) && <> · <Link className="underline" href={`?${new URLSearchParams({ ...(q && { q }), page: String(page + 1) })}`}>Suivante →</Link></>}</p>
      </Card>
    </div>
  );
}
