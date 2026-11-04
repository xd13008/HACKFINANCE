import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type Role = Database["public"]["Enums"]["app_role"];
export const ROLE_LABEL: Record<Role, string> = { admin: "Administrateur", editor: "Éditeur", sales: "Commercial", compliance: "Conformité", agent: "Agent" };

export const getStaff = cache(async () => {
  const db = await serverClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const [{ data: roles }, { data: profile }] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", user.id),
    db.from("staff_profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
  ]);
  const r = (roles ?? []).map((x) => x.role);
  return {
    id: user.id, email: user.email ?? "", name: profile?.display_name ?? user.email ?? "", roles: r,
    is: (role: Role) => r.includes(role),
    isStaff: r.some((x) => x !== "agent"),
  };
});

export async function requireStaff() {
  const s = await getStaff();
  if (!s) redirect("/admin/login");
  return s;
}

export async function requireRole(...roles: Role[]) {
  const s = await requireStaff();
  if (!roles.some((r) => s.is(r))) redirect("/admin?refus=" + roles.join(","));
  return s;
}

/** Portail sélectionné dans le back-office (cookie), tous les portails par défaut. */
export async function currentSite() {
  const db = await serverClient();
  const { data: sites } = await db.from("sites").select("id,key,name,domain").order("name");
  const key = (await cookies()).get("bo_site")?.value;
  const site = (sites ?? []).find((s) => s.key === key) ?? null;
  return { sites: sites ?? [], site };
}

export function periodFrom(searchParams: { from?: string; to?: string; days?: string }) {
  const days = Math.min(365, Math.max(1, Number(searchParams.days ?? 30)));
  const to = searchParams.to ?? new Date().toISOString().slice(0, 10);
  const from = searchParams.from ?? new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  return { from, to, days };
}
