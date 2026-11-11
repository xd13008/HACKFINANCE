"use client";

import { useState } from "react";
import { cheapestPlan, eur, planAnnualCost, type PlanLike } from "@/lib/decision";

/** Simulateur de coût de la fiche : prix publics validés × nombre de sociétés, hors frais de mise en place. */
export function CostSimulator({ name, plans, multiEntity }: { name: string; plans: PlanLike[]; multiEntity: boolean | null }) {
  const [entities, setEntities] = useState(1);
  const best = cheapestPlan(plans, entities, multiEntity);
  return (
    <div className="flex flex-wrap gap-6 items-start p-5 rounded-2xl bg-white border border-line shadow-sm">
      <label className="flex-1 basis-56 flex flex-col gap-2 text-sm font-semibold">
        Nombre de sociétés à couvrir : <span className="font-display font-extrabold text-3xl">{entities}</span>
        <input type="range" min={1} max={8} value={entities} onChange={(e) => setEntities(Number(e.target.value))} className="accent-ink" />
      </label>
      <div className="flex-[2_1_20rem] min-w-0 flex flex-col gap-3" aria-live="polite">
        <div className="p-4 rounded-xl bg-accent text-ink">
          <p className="text-xs font-bold uppercase tracking-wider">Coût annuel estimé · {name}</p>
          <p className="font-display font-extrabold text-3xl leading-tight">
            {best.kind === "price" ? (best.annual === 0 ? "Gratuit" : `${eur(best.annual)} HT/an`) : best.kind === "quote" ? "Sur devis" : "Non adapté"}
          </p>
          <p className="text-sm">
            {best.kind === "price" ? `Offre la moins chère qui couvre ${entities} société(s) : ${best.plan}.`
              : best.kind === "quote" ? `Aucun prix public pour ${entities} société(s) : l’offre ${best.plan} est sur devis.`
              : `${name} ne gère pas plusieurs sociétés d’après les faits validés.`}
          </p>
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {plans.map((p) => {
            const c = p.billing_period === "free" && entities > 1 ? null : planAnnualCost(p, entities);
            return (
              <li key={p.plan_name} className="flex justify-between gap-3 py-1.5 border-b border-line">
                <span>{p.plan_name}</span>
                <span className="font-semibold tabular-nums">{p.billing_period === "quote" ? "Sur devis" : c == null ? "Ne couvre pas ce cas" : c === 0 ? "Gratuit" : `${eur(c)} HT/an`}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-ink-3">Calcul à partir des prix publics validés (voir « Tarifs vérifiés »), hors options et frais de mise en place.</p>
      </div>
    </div>
  );
}
