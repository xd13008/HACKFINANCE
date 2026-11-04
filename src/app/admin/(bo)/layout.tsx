import Link from "next/link";
import { logout, selectSite } from "@/lib/actions/admin";
import { currentSite, requireStaff, ROLE_LABEL, type Role } from "@/lib/admin";
import { serverClient } from "@/lib/supabase/server";

const NAV: { href: string; label: string; roles?: Role[] }[] = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/validation", label: "File de validation", roles: ["editor", "compliance"] },
  { href: "/admin/contenus", label: "Contenus", roles: ["editor", "compliance", "admin"] },
  { href: "/admin/seo", label: "SEO", roles: ["editor", "admin"] },
  { href: "/admin/catalogue", label: "Catalogue logiciels", roles: ["editor", "admin"] },
  { href: "/admin/tests", label: "Tests et notation", roles: ["editor"] },
  { href: "/admin/prestataires", label: "Prestataires", roles: ["editor", "admin"] },
  { href: "/admin/demandes", label: "Demandes et signalements", roles: ["editor", "compliance", "admin"] },
  { href: "/admin/publicite", label: "Régie publicitaire", roles: ["sales", "admin"] },
  { href: "/admin/analytics", label: "Audience et parcours" },
  { href: "/admin/audit", label: "Journal d'audit", roles: ["admin", "compliance", "editor"] },
];

export default async function BoLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  const { sites, site } = await currentSite();
  const db = await serverClient();
  const [{ count: pending }, { count: tasks }] = await Promise.all([
    db.from("content_versions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    db.from("review_tasks").select("id", { count: "exact", head: true }).eq("status", "open").neq("kind", "validation"),
  ]);
  const badge: Record<string, number> = { "/admin/validation": pending ?? 0, "/admin/demandes": tasks ?? 0 };

  if (!me.isStaff) {
    return <div className="p-10">Votre compte n&apos;a pas de rôle humain dans le back-office.</div>;
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <aside className="bg-surface border-r border-line p-4 md:min-h-screen">
        <p className="font-extrabold text-brand">Back-office</p>
        <form action={selectSite} className="mt-3">
          <label className="text-xs text-ink-3">Portail
            <select name="site" defaultValue={site?.key ?? ""} className="mt-1 w-full rounded-lg border border-line bg-surface px-2 py-1 text-sm">
              <option value="">Tous les portails</option>
              {sites.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
            </select>
          </label>
          <button className="mt-1 text-xs underline">Appliquer</button>
        </form>
        <nav className="mt-4 space-y-0.5 text-sm">
          {NAV.filter((n) => !n.roles || n.roles.some((r) => me.is(r))).map((n) => (
            <Link key={n.href} href={n.href} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-surface-2">
              {n.label}
              {badge[n.href] ? <span className="text-xs rounded-full bg-amber-500 text-white px-1.5">{badge[n.href]}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-line pt-3 text-xs text-ink-3">
          <p className="text-ink font-medium">{me.name}</p>
          <p>{me.roles.map((r) => ROLE_LABEL[r]).join(" · ")}</p>
          <form action={logout}><button className="underline mt-1">Se déconnecter</button></form>
        </div>
      </aside>
      <main className="p-4 md:p-8 min-w-0">{children}</main>
    </div>
  );
}
