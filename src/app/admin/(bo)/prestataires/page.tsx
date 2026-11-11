import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin";
import { Badge, Card, PageHeader, StatusBadge, Table, inputCls } from "@/components/admin/ui";
import { publishProviders, verifyProvider } from "@/lib/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";

const PAGE = 100;
type SP = Promise<{ q?: string; metier?: string; statut?: string; page?: string }>;

/** Prestataires : recherche, filtres et pagination (des dizaines de milliers de fiches issues du registre public). */
export default async function Providers({ searchParams }: { searchParams: SP }) {
  await requireRole("editor", "admin");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim().slice(0, 80);
  const db = await serverClient();
  const { data: metiers } = await db.from("categories").select("id,slug,name").eq("kind", "provider").order("sort");

  let query = db.from("providers")
    .select("id,name,slug,profession,city,department,siren,website,status,verification_status,regulated_profession,is_fictional,internal_contact", { count: "exact" });
  if (q) {
    const safe = q.replace(/[,()%*]/g, " ");
    query = /^[0-9]{2,3}$|^2[AB]$/i.test(q) ? query.eq("department", q.toUpperCase()) : query.or(`name.ilike.%${safe}%,city.ilike.%${safe}%`);
  }
  if (sp.metier) query = query.eq("profession", sp.metier);
  if (sp.statut) query = query.eq("status", sp.statut);
  const { data, count } = await query.order("name").range((page - 1) * PAGE, page * PAGE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));

  // Publication en masse : un métier + une ville (nom exact) ou un n° de département.
  const metier = (metiers ?? []).find((m) => m.slug === sp.metier);
  let bulk: { category_id: string; city_slug?: string; department?: string; place: string; drafts: number; published: number } | null = null;
  if (metier && q) {
    const isDep = /^[0-9]{2,3}$|^2[AB]$/i.test(q);
    const { data: city } = isDep ? { data: null } : await db.from("providers").select("city,city_slug").ilike("city", q.replace(/[%_]/g, "")).not("city_slug", "is", null).limit(1).maybeSingle();
    const where = isDep ? { department: q.toUpperCase() } : city?.city_slug ? { city_slug: city.city_slug } : null;
    if (where) {
      const base = () => {
        let b = db.from("providers").select("id,provider_categories!inner(category_id)", { count: "exact", head: true }).eq("provider_categories.category_id", metier.id);
        b = where.department ? b.eq("department", where.department) : b.eq("city_slug", where.city_slug!);
        return b;
      };
      const [{ count: drafts }, { count: published }] = await Promise.all([
        base().eq("status", "draft").neq("verification_status", "rejected"),
        base().eq("status", "published").neq("verification_status", "verified"),
      ]);
      bulk = { category_id: metier.id, ...where, place: isDep ? `département ${q.toUpperCase()}` : city!.city!, drafts: drafts ?? 0, published: published ?? 0 };
    }
  }
  const link = (p: number) => `?${new URLSearchParams({ ...(q && { q }), ...(sp.metier && { metier: sp.metier }), ...(sp.statut && { statut: sp.statut }), page: String(p) })}`;

  return (
    <div>
      <PageHeader title="Prestataires" intro="Vérification : SIREN, site, références publiques. Les fiches non vérifiées restent hors index. Les contacts nominatifs sont internes." />
      <Card>
        <form className="flex flex-wrap gap-2 items-end mb-4">
          <label className="text-sm">Recherche (nom, ville ou n° de département)<input name="q" defaultValue={q} className={inputCls} /></label>
          <label className="text-sm">Métier
            <select name="metier" defaultValue={sp.metier ?? ""} className={inputCls}>
              <option value="">Tous</option>
              {(metiers ?? []).map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Statut
            <select name="statut" defaultValue={sp.statut ?? ""} className={inputCls}>
              <option value="">Tous</option><option value="draft">Brouillon</option><option value="published">Publié</option>
            </select>
          </label>
          <button className="rounded-lg bg-brand text-white px-4 py-2 text-sm">Filtrer</button>
        </form>
        {bulk && (
          <div className="rounded-lg border border-line p-3 mb-4 text-sm space-y-2">
            <p><strong>{metier!.name} · {bulk.place}</strong> : {bulk.drafts.toLocaleString("fr-FR")} fiche(s) en brouillon, {bulk.published.toLocaleString("fr-FR")} publiée(s) non vérifiée(s).
              Les fiches publiées en masse restent marquées « non vérifiées » ; les fiches rejetées ne sont jamais publiées.</p>
            <div className="flex flex-wrap gap-4">
              {/* toujours affichés : le message de résultat reste visible après l'action */}
              {(
                <ActionForm action={publishProviders} submit={`Publier les ${bulk.drafts} fiche(s)`} className="flex gap-2"
                  confirm={`Publier les ${bulk.drafts} fiche(s) en brouillon de ${bulk.place} pour « ${metier!.name} » ? Elles resteront marquées « non vérifiées ».`}>
                  <input type="hidden" name="category_id" value={bulk.category_id} />
                  {bulk.city_slug && <input type="hidden" name="city_slug" value={bulk.city_slug} />}
                  {bulk.department && <input type="hidden" name="department" value={bulk.department} />}
                </ActionForm>
              )}
              {/* toujours affichés : le message de résultat reste visible après l'action */}
              {(
                <ActionForm action={publishProviders} submit={`Repasser ${bulk.published} fiche(s) en brouillon`} tone="ghost" className="flex gap-2"
                  confirm={`Repasser en brouillon les ${bulk.published} fiche(s) publiées non vérifiées de ${bulk.place} ?`}>
                  <input type="hidden" name="category_id" value={bulk.category_id} />
                  <input type="hidden" name="publish" value="0" />
                  {bulk.city_slug && <input type="hidden" name="city_slug" value={bulk.city_slug} />}
                  {bulk.department && <input type="hidden" name="department" value={bulk.department} />}
                </ActionForm>
              )}
            </div>
          </div>
        )}
        {metier && !q && <p className="text-xs text-ink-3 mb-2">Pour publier en masse : saisir une ville (nom exact) ou un n° de département.</p>}
        <p className="text-sm text-ink-3 mb-2">{(count ?? 0).toLocaleString("fr-FR")} prestataire(s) · page {page} sur {pages}</p>
        <Table head={["Prestataire", "Métier", "SIREN", "Statut", "Vérification", "Contact interne", ""]} empty="Aucun prestataire ne correspond.">
          {(data ?? []).map((p) => (
            <tr key={p.id}>
              <td className="py-2 pr-3 font-medium">{p.name} {p.is_fictional && <Badge tone="warn">fictif</Badge>}<p className="text-xs text-ink-3">{p.city}{p.department ? ` (${p.department})` : ""}{p.website ? " · site" : ""}</p></td>
              <td className="pr-3">{p.profession}{p.regulated_profession && <Badge tone="info">réglementée</Badge>}</td>
              <td className="pr-3 font-mono text-xs">{p.siren ?? "—"}</td>
              <td className="pr-3"><StatusBadge status={p.status} /></td>
              <td className="pr-3"><StatusBadge status={p.verification_status} /></td>
              <td className="pr-3 text-xs text-ink-3">{(p.internal_contact as { email?: string })?.email ?? "—"}</td>
              <td>
                <form action={verifyProvider} className="flex gap-2">
                  <input type="hidden" name="provider_id" value={p.id} />
                  {p.verification_status !== "verified"
                    ? <><input type="hidden" name="decision" value="verify" /><input type="hidden" name="publish" value="1" /><button className="text-xs underline text-green-700">Vérifier et publier</button></>
                    : <><input type="hidden" name="decision" value="unverify" /><button className="text-xs underline">Retirer la vérification</button></>}
                </form>
              </td>
            </tr>
          ))}
        </Table>
        <nav aria-label="Pages" className="flex gap-3 mt-4 text-sm">
          {page > 1 && <Link href={link(page - 1)} className="underline">← Précédente</Link>}
          {page < pages && <Link href={link(page + 1)} className="underline">Suivante →</Link>}
        </nav>
      </Card>
    </div>
  );
}
