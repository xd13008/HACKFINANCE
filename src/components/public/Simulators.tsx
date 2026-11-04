"use client";

import { useMemo, useState } from "react";
import { trackEvent } from "./Tracker";

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const input = "w-full rounded-lg border border-line px-3 py-2 bg-white tabular-nums";

type Sector = { key: string; label: string; ebitda_low: number; ebitda_high: number };

/** Valorisation indicative par multiples d'EBE (valeur des titres = VE − dette nette). */
export function ValuationSimulator({ site, sectors, disclaimer }: { site: string; sectors: Sector[]; disclaimer?: string }) {
  const [sector, setSector] = useState(sectors[0]?.key ?? "");
  const [ebitda, setEbitda] = useState(500000);
  const [netDebt, setNetDebt] = useState(0);
  const [tracked, setTracked] = useState(false);
  const s = sectors.find((x) => x.key === sector);
  const result = useMemo(() => {
    if (!s || !(ebitda > 0)) return null;
    return { low: Math.max(0, ebitda * s.ebitda_low - netDebt), high: Math.max(0, ebitda * s.ebitda_high - netDebt) };
  }, [s, ebitda, netDebt]);
  const touch = () => { if (!tracked) { trackEvent(site, "simulator_use", { props: { simulator: "valuation" } }); setTracked(true); } };

  return (
    <section className="my-6 rounded-xl border-2 border-brand p-5" aria-labelledby="sim-title">
      <h2 id="sim-title" className="text-xl font-bold mb-4">Estimez votre valorisation</h2>
      <div className="grid sm:grid-cols-3 gap-4 text-sm">
        <label>Secteur<select className={input} value={sector} onChange={(e) => { setSector(e.target.value); touch(); }}>
          {sectors.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select></label>
        <label>EBE retraité (€)<input type="number" min={0} step={10000} className={input} value={ebitda} onChange={(e) => { setEbitda(Number(e.target.value)); touch(); }} /></label>
        <label>Dette nette (€)<input type="number" step={10000} className={input} value={netDebt} onChange={(e) => { setNetDebt(Number(e.target.value)); touch(); }} /></label>
      </div>
      {result && s && (
        <div className="mt-5 rounded-lg bg-surface-2 p-4" aria-live="polite">
          <p className="text-sm text-ink-2">Valeur indicative des titres</p>
          <p className="text-3xl font-extrabold tabular-nums">{eur.format(result.low)} – {eur.format(result.high)}</p>
          <p className="text-xs text-ink-3 mt-1">Multiple d&apos;EBE retenu : {s.ebitda_low}× à {s.ebitda_high}×.</p>
        </div>
      )}
      <p className="mt-3 text-xs text-ink-3">{disclaimer} Estimation générale : ce n&apos;est ni une évaluation ni un conseil personnalisé.</p>
    </section>
  );
}

/** Imposition indicative d'une plus-value de cession de titres au PFU, avec abattement fixe retraite optionnel. */
export function CapitalGainsSimulator({ site, irRate, psRate, retirementAllowance, disclaimer }: {
  site: string; irRate: number; psRate: number; retirementAllowance: number; disclaimer?: string;
}) {
  const [price, setPrice] = useState(2000000);
  const [cost, setCost] = useState(100000);
  const [retire, setRetire] = useState(false);
  const [tracked, setTracked] = useState(false);
  const gain = Math.max(0, price - cost);
  const irBase = Math.max(0, gain - (retire ? retirementAllowance : 0));
  const ir = irBase * irRate / 100;
  const ps = gain * psRate / 100;
  const touch = () => { if (!tracked) { trackEvent(site, "simulator_use", { props: { simulator: "capital_gains" } }); setTracked(true); } };

  return (
    <section className="my-6 rounded-xl border-2 border-brand p-5" aria-labelledby="sim-title">
      <h2 id="sim-title" className="text-xl font-bold mb-4">Simulez l&apos;impôt sur votre plus-value</h2>
      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <label>Prix de cession des titres (€)<input type="number" min={0} step={10000} className={input} value={price} onChange={(e) => { setPrice(Number(e.target.value)); touch(); }} /></label>
        <label>Prix d&apos;acquisition ou de souscription (€)<input type="number" min={0} step={1000} className={input} value={cost} onChange={(e) => { setCost(Number(e.target.value)); touch(); }} /></label>
        <label className="flex gap-2 items-center sm:col-span-2"><input type="checkbox" checked={retire} onChange={(e) => { setRetire(e.target.checked); touch(); }} />
          Départ à la retraite du dirigeant (abattement fixe de {eur.format(retirementAllowance)} sur l&apos;impôt sur le revenu, sous conditions)</label>
      </div>
      <dl className="mt-5 rounded-lg bg-surface-2 p-4 grid sm:grid-cols-4 gap-3 text-sm" aria-live="polite">
        <div><dt className="text-ink-3">Plus-value</dt><dd className="font-bold tabular-nums">{eur.format(gain)}</dd></div>
        <div><dt className="text-ink-3">Impôt sur le revenu ({irRate} %)</dt><dd className="font-bold tabular-nums">{eur.format(ir)}</dd></div>
        <div><dt className="text-ink-3">Prélèvements sociaux ({psRate} %)</dt><dd className="font-bold tabular-nums">{eur.format(ps)}</dd></div>
        <div><dt className="text-ink-3">Net estimé</dt><dd className="font-extrabold tabular-nums text-lg">{eur.format(price - ir - ps)}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-ink-3">{disclaimer} Hors contribution exceptionnelle sur les hauts revenus et option pour le barème. Ce n&apos;est pas un conseil fiscal.</p>
    </section>
  );
}
