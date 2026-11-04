"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/actions/admin";

/** Formulaire relié à une server action, avec retour d'état (succès / message d'erreur de la base). */
export function ActionForm({
  action, children, submit, className = "space-y-3", tone = "primary", confirm,
}: {
  action: (s: ActionResult, fd: FormData) => Promise<ActionResult>;
  children?: React.ReactNode;
  submit: string;
  className?: string;
  tone?: "primary" | "danger" | "ghost";
  confirm?: string;
}) {
  const [state, run, pending] = useActionState(action, { ok: false, message: "" });
  const cls = tone === "danger" ? "bg-red-700 text-white" : tone === "ghost" ? "border border-line" : "bg-brand text-white";
  return (
    <form action={run} className={className} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {children}
      <div className="flex items-center gap-3 flex-wrap">
        <button disabled={pending} className={`inline-flex items-center rounded-lg text-sm font-medium px-3 py-1.5 disabled:opacity-50 ${cls}`}>
          {pending ? "…" : submit}
        </button>
        {state.message && <span role="status" className={`text-sm ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.message}</span>}
      </div>
    </form>
  );
}
