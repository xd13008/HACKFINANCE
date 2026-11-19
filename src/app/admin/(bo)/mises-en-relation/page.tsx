import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin";
import { Card, PageHeader } from "@/components/admin/ui";
import { markContactTransmitted, setContactStatus } from "@/lib/actions/admin";

const DONE: Record<string, string> = { erreur: "Action refusée : la demande est close ou indésirable, ou déjà traitée.", transmise: "Transmission enregistrée.", closed: "Demande close.", spam: "Demande marquée comme indésirable.", new: "Demande rouverte." };
const SIZE: Record<string, string> = { tpe: "< 10 salariés", pme1: "10 à 49", pme2: "50 à 249", eti: "250 et plus" };
const STATUS: Record<string, string> = { new: "Nouvelle", transmitted: "Transmise", closed: "Close", spam: "Indésirable" };

/**
 * Mises en relation (maquette, écran 4) et accords de recontact du parcours Challenger (écran 8).
 * L'équipe transmet chaque demande aux seules solutions cochées par le visiteur, puis le marque ici (preuve horodatée).
 */
export default async function MisesEnRelation({ searchParams }: { searchParams: Promise<{ fait?: string }> }) {
  const me = await requireRole("sales", "admin");
  const fait = (await searchParams).fait ?? "";
  const done = DONE[fait];
  const db = await serverClient();
  const { data: requests } = await db.from("contact_requests").select("*, contact_request_targets(software_id,transmitted_at), categories(name)").order("created_at", { ascending: false }).limit(200);
  const { data: challenges } = me.is("admin")
    ? await db.from("challenge_responses").select("id,created_at,email,company,target_type,software_id,provider_id,satisfaction,consent_contact_ids,mail_status").not("consent_contact_ids", "eq", "{}").order("created_at", { ascending: false }).limit(100)
    : { data: [] };
  const swIds = [...new Set([...(requests ?? []).flatMap((r) => r.contact_request_targets.map((t) => t.software_id!)), ...(challenges ?? []).flatMap((c) => c.target_type === "provider" ? [] : c.consent_contact_ids)])];
  const provIds = [...new Set((challenges ?? []).filter((c) => c.target_type === "provider").flatMap((c) => c.consent_contact_ids))];
  const [{ data: sw }, { data: prov }] = await Promise.all([
    swIds.length ? db.from("software").select("id,name,vendor,website").in("id", swIds) : Promise.resolve({ data: [] }),
    provIds.length ? db.from("providers").select("id,name,website").in("id", provIds) : Promise.resolve({ data: [] }),
  ]);
  const name = (id: string) => sw?.find((s) => s.id === id)?.name ?? prov?.find((p) => p.id === id)?.name ?? id;
  return (
    <div className="space-y-4">
      <PageHeader title="Mises en relation" intro="Chaque demande n'est transmise qu'aux solutions cochées par le visiteur, avec le texte de consentement ci-dessous. Marquez chaque transmission une fois faite." />
      {done && <p role="status" className={`rounded-lg p-3 text-sm ${fait === "erreur" ? "bg-red-50 text-red-900" : "bg-green-50 text-green-900"}`}>{done}</p>}
      <Card>
        <h2 className="font-bold mb-3">Demandes de démo ou de devis ({(requests ?? []).length})</h2>
        {(requests ?? []).length === 0 ? <p className="text-sm text-ink-3">Aucune demande.</p> : (requests ?? []).map((r) => (
          <div key={r.id} className="border-t border-line py-4 space-y-2 text-sm">
            <p className="font-semibold">{r.company} · {SIZE[r.company_size] ?? r.company_size} · {r.categories?.name ?? "—"} <span className="text-xs rounded bg-surface-2 px-2">{STATUS[r.status]}</span></p>
            <p>{r.contact_name}{r.job_title ? `, ${r.job_title}` : ""} · {r.email}{r.phone ? ` · ${r.phone}` : ""} · reçue le {new Date(r.created_at).toLocaleString("fr-FR")}</p>
            <p className="text-ink-2">{r.need}{r.timing ? ` · délai : ${r.timing}` : ""}{r.budget ? ` · budget : ${r.budget}` : ""}</p>
            <details><summary className="cursor-pointer underline">Consentement recueilli</summary><p className="mt-1 text-ink-2">{r.consent_text} ({new Date(r.consent_at).toLocaleString("fr-FR")}, page {r.origin_path ?? "—"})</p></details>
            <ul className="space-y-1">
              {r.contact_request_targets.map((t) => (
                <li key={t.software_id} className="flex flex-wrap items-center gap-3">
                  <span>{name(t.software_id!)}</span>
                  {t.transmitted_at ? <span className="text-green-800">transmise le {new Date(t.transmitted_at).toLocaleString("fr-FR")}</span> : r.status === "spam" || r.status === "closed" ? <span className="text-ink-3">non transmise</span> : (
                    <form action={markContactTransmitted}><input type="hidden" name="request_id" value={r.id} /><input type="hidden" name="software_id" value={t.software_id!} />
                      <button className="text-xs underline">Marquer transmise</button></form>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex gap-4">
              {r.status !== "closed" && <form action={setContactStatus}><input type="hidden" name="request_id" value={r.id} /><input type="hidden" name="status" value="closed" /><button className="text-xs underline">Clore</button></form>}
              {r.status !== "spam" && <form action={setContactStatus}><input type="hidden" name="request_id" value={r.id} /><input type="hidden" name="status" value="spam" /><button className="text-xs underline text-red-800">Indésirable</button></form>}
            </div>
          </div>
        ))}
      </Card>
      {me.is("admin") && (
        <Card>
          <h2 className="font-bold mb-3">Parcours Challenger : visiteurs qui acceptent d&apos;être recontactés ({(challenges ?? []).length})</h2>
          {(challenges ?? []).length === 0 ? <p className="text-sm text-ink-3">Aucun.</p> : (
            <ul className="text-sm space-y-2">{(challenges ?? []).map((c) => (
              <li key={c.id} className="border-t border-line pt-2">{c.email}{c.company ? ` · ${c.company}` : ""} · satisfaction {c.satisfaction}/10 · accepte : <strong>{c.consent_contact_ids.map(name).join(", ")}</strong> · {new Date(c.created_at).toLocaleDateString("fr-FR")}</li>
            ))}</ul>
          )}
        </Card>
      )}
    </div>
  );
}
