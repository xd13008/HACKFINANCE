import { serverClient } from "@/lib/supabase/server";
import { Card } from "@/components/admin/ui";
import { reviewProviderFacts } from "@/lib/actions/admin";
import { formatValue, hostOf, SOURCE_KIND, type GridCriterion } from "@/lib/grid";

const MESSAGES: Record<string, string> = { valide: "fait(s) validé(s) : ils sont visibles sur les fiches publiées et servent aux filtres.", rejet: "fait(s) rejeté(s)." };

/** Faits de la grille de lecture en attente : un éditeur valide fiche par fiche (site du cabinet) ou par ville (registre public). */
export async function GridReview({ result }: { result?: string }) {
  const db = await serverClient();
  const [{ data: criteria }, { data: drafts }] = await Promise.all([
    db.from("provider_criteria").select("*").order("sort"),
    db.from("provider_facts").select("id,provider_id,criterion,value,source_url,source_kind,accessed_on,period,note,providers!inner(name,city,city_slug,status)")
      .eq("status", "draft").order("provider_id").limit(2000),
  ]);
  const crit = (criteria ?? []) as unknown as GridCriterion[];
  const rows = drafts ?? [];
  const [kind, n] = (result ?? "").split("-");
  const done = kind === "erreur" ? "La validation a échoué (droits insuffisants ?)." : MESSAGES[kind] ? `${n} ${MESSAGES[kind]}` : null;

  const web = new Map<string, typeof rows>();
  const registry = new Map<string, { city: string; n: number }>();
  for (const r of rows) {
    if (r.source_kind === "registre_public") {
      const k = r.providers.city_slug ?? "";
      registry.set(k, { city: r.providers.city ?? k, n: (registry.get(k)?.n ?? 0) + 1 });
    } else web.set(r.provider_id, [...(web.get(r.provider_id) ?? []), r]);
  }
  return (
    <Card>
      <h2 id="grille" className="font-bold mb-1">Grille de lecture : faits à valider</h2>
      <p className="text-sm text-ink-2 mb-3">Informations collectées pour aider les DAF à filtrer et comparer (référentiel : docs/GRILLE-LECTURE-CABINETS.md).
        Rien n&apos;est visible avant votre validation. Contrôlez la source avant de valider.</p>
      {done && <p role="status" className="rounded-lg p-3 bg-green-50 text-green-900 text-sm mb-3">{done}</p>}
      {rows.length === 0 && <p className="text-sm text-ink-3">Aucun fait en attente.</p>}

      {registry.size > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-sm mb-2">Registre public (taille du cabinet, année de création)</h3>
          <ul className="space-y-2">
            {[...registry.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 20).map(([slug, v]) => (
              <li key={slug} className="flex flex-wrap gap-3 items-center text-sm">
                <span>{v.city} : {v.n} fait(s)</span>
                <form action={reviewProviderFacts}>
                  <input type="hidden" name="city_slug" value={slug} /><input type="hidden" name="source_kind" value="registre_public" />
                  <button className="text-xs underline text-green-700">Valider les faits du registre de {v.city}</button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      {web.size > 0 && <h3 className="font-semibold text-sm mb-2">Sites des cabinets ({web.size} fiche(s))</h3>}
      {[...web.entries()].slice(0, 30).map(([id, facts]) => {
        const p = facts[0].providers;
        return (
          <details key={id} className="border-t border-line py-2 text-sm">
            <summary className="cursor-pointer"><strong>{p.name}</strong> · {p.city} · {facts.length} fait(s){p.status !== "published" && " · fiche en brouillon"}</summary>
            <ul className="mt-2 space-y-1">
              {facts.map((f) => {
                const c = crit.find((x) => x.code === f.criterion);
                return (
                  <li key={f.id}>
                    <span className="text-ink-3">{c?.label ?? f.criterion} : </span>{c ? formatValue(c, f.value) : JSON.stringify(f.value)}{f.period ? ` (${f.period})` : ""}
                    <span className="text-xs text-ink-3"> · <a href={f.source_url} target="_blank" rel="noopener" className="underline">{hostOf(f.source_url)}</a> ({SOURCE_KIND[f.source_kind]}, {f.accessed_on})</span>
                  </li>
                );
              })}
            </ul>
            {facts[0].note && <p className="text-xs text-ink-3 mt-1">Note de collecte : {facts[0].note}</p>}
            <div className="flex gap-4 mt-2">
              <form action={reviewProviderFacts}><input type="hidden" name="provider_id" value={id} /><input type="hidden" name="source_kind" value="site_officiel" />
                <button className="text-xs underline text-green-700">Valider ces faits</button></form>
              <form action={reviewProviderFacts}><input type="hidden" name="provider_id" value={id} /><input type="hidden" name="source_kind" value="site_officiel" /><input type="hidden" name="decision" value="reject" />
                <button className="text-xs underline text-red-800">Rejeter</button></form>
            </div>
          </details>
        );
      })}
    </Card>
  );
}
