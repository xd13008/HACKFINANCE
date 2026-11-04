import { serverClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admin";
import { Badge, Card, PageHeader, StatusBadge, Table } from "@/components/admin/ui";
import { verifyProvider } from "@/lib/actions/admin";

export default async function Providers() {
  await requireRole("editor", "admin");
  const db = await serverClient();
  const { data } = await db.from("providers").select("id,name,slug,profession,city,siren,website,status,verification_status,regulated_profession,is_fictional,internal_contact").order("name");
  return (
    <div>
      <PageHeader title="Prestataires" intro="Vérification : SIREN, site, références publiques. Les fiches non vérifiées restent hors index. Les contacts nominatifs sont internes." />
      <Card>
        <Table head={["Prestataire", "Métier", "SIREN", "Statut", "Vérification", "Contact interne", ""]}>
          {(data ?? []).map((p) => (
            <tr key={p.id}>
              <td className="py-2 pr-3 font-medium">{p.name} {p.is_fictional && <Badge tone="warn">fictif</Badge>}<p className="text-xs text-ink-3">{p.city}</p></td>
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
      </Card>
    </div>
  );
}
