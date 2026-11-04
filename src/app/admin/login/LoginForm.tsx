"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/admin";
import { inputCls } from "@/components/admin/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, { ok: false, message: "" });
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm">E-mail<input name="email" type="email" required className={inputCls} autoComplete="username" /></label>
      <label className="block text-sm">Mot de passe<input name="password" type="password" required className={inputCls} autoComplete="current-password" /></label>
      {state.message && <p role="alert" className="text-sm text-red-700">{state.message}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-brand text-white font-medium py-2">{pending ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}
