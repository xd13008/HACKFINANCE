"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { loadBarometer, loadProviderChallenge, submitChallenge, type ChallengeState, type ProviderChallenge } from "@/lib/actions/challenge";
import type { SearchHit } from "@/lib/search";
import { CHALLENGE_CONSENT } from "@/lib/consents";

/**
 * Maquette, écran 8 : « Challenger mon outil ou mon prestataire ».
 * Logiciels : alternatives de la même catégorie, notes des tests de la rédaction pondérées par le visiteur.
 * Prestataires : fiches de la même ville et du même métier, sans classement, sur la grille de lecture vérifiée.
 */
export type ChallengerTool = { slug: string; name: string; score: number; criteria: Record<string, number>; entry: number | null };
export type ChallengerUniverse = {
  slug: string; name: string; infoOnly: boolean;
  software: { slug: string; name: string; criteria: { key: string; label: string }[]; tools: ChallengerTool[]; referenced: { slug: string; name: string }[] }[];
  providers: { slug: string; name: string }[];
};
type Current =
  | { type: "software"; slug: string; name: string; category: string }
  | { type: "spreadsheet"; name: string; category: string }
  | { type: "provider"; slug: string; name: string };

const fmt = (n: number) => n.toFixed(1).replace(".", ",");
const price = (v: number | null) => (v == null ? "Sur devis" : v === 0 ? "Gratuit" : `${v} € HT/mois`);
const REASONS = {
  tool: ["Prix trop élevé", "Fonctionnalités manquantes", "Connexions et intégrations", "Support et réactivité", "Prise en main difficile", "Ne suit plus notre croissance"],
  firm: ["Réactivité", "Honoraires", "Qualité du conseil", "Interlocuteur qui change", "Outils dépassés", "Ne connaît pas notre secteur"],
};
const SPREADSHEET = "Un tableur (Excel, Google Sheets)";

export function Challenger({ site, universes }: { site: string; universes: ChallengerUniverse[] }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<"tool" | "firm">("tool");
  const [univ, setUniv] = useState(universes.find((u) => u.software.length)?.slug ?? universes[0]?.slug);
  const [sub, setSub] = useState<string | null>(null);
  const [current, setCurrent] = useState<Current | null>(null);
  const [focus, setFocus] = useState<string[]>([]);
  const [prov, setProv] = useState<ProviderChallenge | null | "loading">(null);
  const [baro, setBaro] = useState<{ n: number; avg?: number } | null>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [state, action, pending] = useActionState<ChallengeState, FormData>(submitChallenge, { ok: false, message: "" });

  const categories = useMemo(() => universes.flatMap((u) => u.software), [universes]);
  const category = current && current.type !== "provider" ? categories.find((c) => c.slug === current.category) : undefined;
  const link = current ? `/challenger?${current.type === "software" ? `logiciel=${current.slug}` : current.type === "provider" ? `prestataire=${current.slug}` : `tableur=${current.category}`}` : "/challenger";

  // Lien partagé ou reçu par e-mail : reprend directement au comparatif.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const sw = p.get("logiciel"), pr = p.get("prestataire"), tab = p.get("tableur");
    if (sw) {
      const c = categories.find((x) => x.tools.some((t) => t.slug === sw) || x.referenced.some((r) => r.slug === sw));
      const t = c?.tools.find((x) => x.slug === sw) ?? c?.referenced.find((x) => x.slug === sw);
      if (c && t) pick({ type: "software", slug: sw, name: t.name, category: c.slug });
    } else if (pr) pick({ type: "provider", slug: pr, name: pr });
    else if (tab && categories.some((c) => c.slug === tab)) pick({ type: "spreadsheet", name: SPREADSHEET, category: tab });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/recherche?site=${site}&types=${kind === "tool" ? "software" : "provider"}&q=${encodeURIComponent(q)}`);
      setHits(r.ok ? (await r.json()).hits : []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, kind, site]);

  function pick(c: Current) {
    setCurrent(c); setStep(2); setFocus([]); setBaro(null);
    if (c.type === "provider") {
      setProv("loading");
      loadProviderChallenge(c.slug).then((d) => {
        setProv(d);
        if (d) setCurrent({ type: "provider", slug: d.current.slug, name: d.current.name });
      });
    }
    if (c.type !== "spreadsheet") loadBarometer(c.type === "software" ? { software: c.slug } : { provider: c.slug }).then(setBaro);
    window.history.replaceState(null, "", c.type === "software" ? `?logiciel=${c.slug}` : c.type === "provider" ? `?prestataire=${c.slug}` : `?tableur=${c.category}`);
    window.scrollTo({ top: 0 });
  }
  function restart() { setStep(1); setCurrent(null); setProv(null); window.history.replaceState(null, "", "/challenger"); }

  // ---- Logiciels : alternatives classées sur les critères du visiteur ----
  const weights = (key: string) => (focus.length ? (focus.includes(key) ? 3 : 1) : 1);
  const mine = (t: ChallengerTool) => {
    const keys = category?.criteria.map((c) => c.key).filter((k) => typeof t.criteria[k] === "number") ?? [];
    const total = keys.reduce((a, k) => a + weights(k), 0);
    return total ? keys.reduce((a, k) => a + weights(k) * t.criteria[k], 0) / total : t.score;
  };
  const currentTool = current?.type === "software" ? category?.tools.find((t) => t.slug === current.slug) : undefined;
  const alternatives = (category?.tools ?? []).filter((t) => current?.type !== "software" || t.slug !== current.slug)
    .map((t) => ({ t, s: mine(t) })).sort((a, b) => b.s - a.s).slice(0, 5);
  const altNames = current?.type === "provider" ? (prov && prov !== "loading" ? prov.rows.filter((r) => !r.current).map((r) => ({ slug: r.slug, name: r.name })) : [])
    : alternatives.map(({ t }) => ({ slug: t.slug, name: t.name }));

  const u = universes.find((x) => x.slug === univ);
  const subs = kind === "tool" ? u?.software ?? [] : u?.providers ?? [];
  const subSlug = subs.some((s) => s.slug === sub) ? sub : subs[0]?.slug;
  const btn = (on: boolean) => `min-h-11 px-4 rounded-lg border text-sm font-semibold ${on ? "bg-ink text-white border-ink" : "bg-white border-line hover:border-ink"}`;

  return (
    <div className="pb-20">
      <section className="bg-brand text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-10 flex flex-col gap-4">
          <p className="m-0 text-sm font-bold uppercase tracking-wider text-accent">Challenger mon outil ou mon prestataire</p>
          {step === 1 ? (
            <>
              <h1 className="m-0 font-display font-extrabold text-4xl sm:text-6xl leading-[1.02] tracking-[-0.03em] max-w-4xl">Votre outil ou votre prestataire actuel est-il toujours le bon ?</h1>
              <p className="m-0 text-lg text-zinc-300 max-w-3xl">Logiciel, cabinet ou prestataire : indiquez avec qui vous travaillez aujourd&apos;hui. Nous le comparons aux solutions de la même catégorie, sur vos propres critères.</p>
            </>
          ) : (
            <>
              <p className="m-0 text-zinc-300">Au départ de <strong className="text-white">{current?.name}</strong>{category ? ` · ${category.name}` : prov && prov !== "loading" ? ` · ${prov.current.categoryName}${prov.current.city ? ` à ${prov.current.city}` : ""}` : ""}</p>
              <h1 className="m-0 font-display font-extrabold text-4xl sm:text-5xl leading-[1.02] tracking-[-0.03em]">{step === 3 ? `Et aujourd'hui, avec ${current?.name} ?` : current?.type === "provider" ? `${altNames.length || "Les"} cabinets à comparer, côte à côte` : `${altNames.length || "Les"} alternatives, comparées sur vos critères`}</h1>
              <button type="button" onClick={restart} className="self-start min-h-10 px-4 rounded-lg border border-white/40 text-sm font-semibold">Changer de point de départ</button>
            </>
          )}
        </div>
      </section>

      {step === 1 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 flex flex-col gap-6">
          <div role="group" aria-label="Type de solution actuelle" className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={kind === "tool"} onClick={() => { setKind("tool"); setHits([]); }} className={btn(kind === "tool")}>Un logiciel</button>
            <button type="button" aria-pressed={kind === "firm"} onClick={() => { setKind("firm"); setHits([]); }} className={btn(kind === "firm")}>Un cabinet ou prestataire</button>
          </div>
          <div className="flex flex-col gap-2 max-w-xl">
            <label htmlFor="actuel" className="font-semibold">Votre {kind === "tool" ? "outil" : "cabinet ou prestataire"} actuel</label>
            <input id="actuel" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" placeholder={kind === "tool" ? "Ex. : Agicap, Pennylane…" : "Nom du cabinet"}
              className="min-h-12 rounded-lg border border-line bg-white px-4 text-base" />
            {hits.length > 0 && (
              <ul className="m-0 p-1 list-none rounded-xl border border-line bg-white">
                {hits.map((h) => h.kind === "software" ? (
                  <li key={h.slug}><button type="button" className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-surface-2"
                    onClick={() => h.categorySlug ? pick({ type: "software", slug: h.slug, name: h.name, category: h.categorySlug }) : undefined}>
                    <strong>{h.name}</strong> <span className="text-sm text-ink-3">{h.categoryName ?? "catégorie non publiée"}</span></button></li>
                ) : h.kind === "provider" ? (
                  <li key={h.slug}><button type="button" className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-surface-2" onClick={() => pick({ type: "provider", slug: h.slug, name: h.name })}>
                    <strong>{h.name}</strong> <span className="text-sm text-ink-3">{h.categoryName}{h.city ? ` · ${h.city}` : ""}</span></button></li>
                ) : null)}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="m-0 font-semibold">Ou retrouvez-le par univers</p>
            <div className="flex flex-wrap gap-2">
              {universes.map((x) => <button key={x.slug} type="button" aria-pressed={x.slug === univ} onClick={() => { setUniv(x.slug); setSub(null); }} className={btn(x.slug === univ)}>{x.name}</button>)}
            </div>
            {u?.infoOnly ? (
              <p className="m-0 rounded-xl bg-surface-2 p-4 text-sm">Crédit, affacturage, assurance et placements : guides d&apos;information uniquement. Nous ne proposons pas d&apos;alternative dans cet univers.</p>
            ) : subs.length === 0 ? (
              <p className="m-0 text-sm text-ink-3">Cet univers est en préparation : aucune catégorie de {kind === "tool" ? "logiciels" : "prestataires"} publiée pour l&apos;instant.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-ink-2">{kind === "tool" ? "Type de logiciel :" : "Métier :"}</span>
                  {subs.map((s) => <button key={s.slug} type="button" aria-pressed={s.slug === subSlug} onClick={() => setSub(s.slug)} className={btn(s.slug === subSlug)}>{s.name}</button>)}
                </div>
                {kind === "tool" ? (() => {
                  const c = u?.software.find((s) => s.slug === subSlug);
                  return (
                    <ul className="m-0 p-0 list-none grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {[...(c?.tools ?? []).map((t) => ({ slug: t.slug, name: t.name, note: `Testé · ${fmt(t.score)}/10` })), ...(c?.referenced ?? []).map((r) => ({ ...r, note: "Référencé, non testé" }))].map((t) => (
                        <li key={t.slug}><button type="button" onClick={() => pick({ type: "software", slug: t.slug, name: t.name, category: c!.slug })} className="w-full h-full text-left rounded-xl border border-line bg-white p-4 hover:border-ink">
                          <strong className="block">{t.name}</strong><span className="text-sm text-ink-3">{t.note} · comparer aux alternatives →</span></button></li>
                      ))}
                      {c && <li><button type="button" onClick={() => pick({ type: "spreadsheet", name: SPREADSHEET, category: c.slug })} className="w-full h-full text-left rounded-xl border border-dashed border-line bg-white p-4 hover:border-ink">
                        <strong className="block">{SPREADSHEET}</strong><span className="text-sm text-ink-3">Voir les solutions testées →</span></button></li>}
                    </ul>
                  );
                })() : (
                  <p className="m-0 text-sm text-ink-2">Recherchez votre cabinet par son nom ci-dessus, ou parcourez <Link href={`/prestataires/${subSlug}`} className="underline">l&apos;annuaire</Link> (fiches factuelles, sans classement).</p>
                )}
              </>
            )}
            <p className="m-0 text-sm text-ink-3">Absent de la liste ? <Link href={kind === "tool" ? "/referencer-mon-logiciel" : "/referencer-mon-cabinet"} className="underline">Signalez-le</Link> : il sera ajouté avec la mention « référencé, non vérifié » après contrôle.</p>
          </div>
        </div>
      )}

      {step === 2 && current?.type !== "provider" && category && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 flex flex-col gap-5">
          <fieldset className="border-0 p-0 m-0 flex flex-wrap items-center gap-2">
            <legend className="font-semibold mb-2">Ce qui compte pour vous</legend>
            {category.criteria.map((c) => (
              <button key={c.key} type="button" aria-pressed={focus.includes(c.key)} className={btn(focus.includes(c.key))}
                onClick={() => setFocus(focus.includes(c.key) ? focus.filter((k) => k !== c.key) : [...focus, c.key])}>{c.label}</button>
            ))}
          </fieldset>
          {alternatives.length === 0 ? (
            <p className="m-0 rounded-xl bg-surface-2 p-5">Aucune autre solution de « {category.name} » n&apos;a encore terminé son test. <Link href={`/meilleurs-logiciels/${category.slug}`} className="underline">Voir la catégorie</Link></p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead><tr className="bg-brand text-white text-left">
                  <th scope="col" className="p-3">Solution</th>
                  {category.criteria.map((c) => <th key={c.key} scope="col" className={`p-3 text-center ${focus.includes(c.key) ? "text-accent" : ""}`}>{c.label}</th>)}
                  <th scope="col" className="p-3 text-center">Votre score</th><th scope="col" className="p-3 text-right">Prix d&apos;entrée</th>
                </tr></thead>
                <tbody>
                  <tr className="bg-surface-2 border-t border-line">
                    <th scope="row" className="p-3 text-left">{current?.name} <span className="font-normal text-ink-3">(actuel)</span></th>
                    {category.criteria.map((c) => <td key={c.key} className="p-3 text-center">{currentTool && typeof currentTool.criteria[c.key] === "number" ? fmt(currentTool.criteria[c.key]) : "—"}</td>)}
                    <td className="p-3 text-center font-bold">{currentTool ? fmt(mine(currentTool)) : "Non testé"}</td>
                    <td className="p-3 text-right">{currentTool ? price(currentTool.entry) : "—"}</td>
                  </tr>
                  {alternatives.map(({ t, s }) => {
                    const delta = currentTool ? s - mine(currentTool) : null;
                    return (
                      <tr key={t.slug} className="border-t border-line">
                        <th scope="row" className="p-3 text-left">
                          <Link href={`/logiciels/${t.slug}`} className="font-bold">{t.name}</Link>
                          {current?.type === "software" && currentTool && <Link href={`/comparer?l=${current.slug}&l=${t.slug}`} className="block text-xs font-normal underline">Comparer côte à côte →</Link>}
                        </th>
                        {category.criteria.map((c) => <td key={c.key} className="p-3 text-center">{typeof t.criteria[c.key] === "number" ? fmt(t.criteria[c.key]) : "—"}</td>)}
                        <td className="p-3 text-center font-bold">{fmt(s)}{delta != null && <span className={`block text-xs ${delta >= 0 ? "text-green-800" : "text-red-800"}`}>{delta >= 0 ? "+" : ""}{fmt(delta)}</span>}</td>
                        <td className="p-3 text-right">{price(t.entry)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="m-0 text-xs text-ink-3">Notes sur 10 issues des tests de la rédaction, pondérées par vos choix (critère choisi : poids triple). Prix publics HT relevés sur les sites des éditeurs. Aucun résultat sponsorisé.{!currentTool && current?.type === "software" ? ` ${current.name} n'a pas encore été testé : pas de note de départ.` : ""}</p>
          <button type="button" onClick={() => setStep(3)} className="self-start min-h-12 px-7 rounded-lg bg-ink text-white font-bold">Recevoir ce comparatif par e-mail →</button>
        </div>
      )}

      {step === 2 && current?.type === "provider" && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 flex flex-col gap-5">
          {prov === "loading" ? <p className="m-0">Chargement…</p> : !prov ? <p className="m-0">Ce cabinet n&apos;est pas dans l&apos;annuaire publié. <button type="button" onClick={restart} className="underline">Recommencer</button></p> : (
            <>
              <p className="m-0 rounded-xl bg-surface-2 p-4 text-sm">{prov.current.regulated ? "Profession réglementée : comparaison factuelle, sans note ni classement. " : "Comparaison factuelle, sans classement. "}
                Cabinets du même métier {prov.current.city ? `à ${prov.current.city} et alentour` : "dans le même département"}, présentés selon le nombre d&apos;informations vérifiées par la rédaction.</p>
              <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead><tr className="bg-brand text-white text-left"><th scope="col" className="p-3">Cabinet</th>{prov.criteria.map((c) => <th key={c.code} scope="col" className="p-3">{c.label}</th>)}</tr></thead>
                  <tbody>
                    {prov.rows.map((r) => (
                      <tr key={r.slug} className={`border-t border-line align-top ${r.current ? "bg-surface-2" : ""}`}>
                        <th scope="row" className="p-3 text-left"><Link href={`/prestataires/${prov.current.categorySlug}/${r.slug}`} className="font-bold">{r.name}</Link>
                          {r.current && <span className="block text-xs font-normal text-ink-3">actuel</span>}{!r.current && r.city && <span className="block text-xs font-normal text-ink-3">{r.city}</span>}</th>
                        {prov.criteria.map((c) => <td key={c.code} className="p-3">{r.values[c.code] ?? <span className="text-ink-3">Non vérifié</span>}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="m-0 text-xs text-ink-3">« Non vérifié » : information absente ou pas encore contrôlée par la rédaction, pas une réponse négative. Sources datées sur chaque fiche.</p>
              <button type="button" onClick={() => setStep(3)} className="self-start min-h-12 px-7 rounded-lg bg-ink text-white font-bold">Recevoir ce comparatif par e-mail →</button>
            </>
          )}
        </div>
      )}

      {step === 3 && current && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 flex flex-wrap gap-8 items-start">
          {state.ok ? (
            <div className="flex-1 basis-96 flex flex-col gap-4">
              <h2 className="m-0 font-display font-extrabold text-3xl">{state.message}</h2>
              <p className="m-0 text-ink-2">Le comparatif en ligne reste disponible à cette adresse : <Link href={link} className="underline">{link}</Link></p>
              <button type="button" onClick={restart} className="self-start min-h-12 px-7 rounded-lg bg-ink text-white font-bold">Challenger un autre outil</button>
            </div>
          ) : (
            <form action={action} className="flex-[2_1_480px] flex flex-col gap-5 rounded-2xl border border-line bg-white p-6">
              <input type="hidden" name="site" value={site} />
              <input type="hidden" name="target_type" value={current.type} />
              <input type="hidden" name="target_slug" value={current.type === "spreadsheet" ? "" : current.slug} />
              <input type="hidden" name="category_slug" value={category?.slug ?? ""} />
              <input type="hidden" name="link" value={link} />
              <input type="text" name="company_url" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              <label className="flex flex-col gap-2 font-semibold">Votre satisfaction : <SatisfactionInput />
                <span className="flex justify-between text-xs font-normal text-ink-3"><span>0 · pas du tout satisfait</span><span>10 · parfaitement satisfait</span></span></label>
              <fieldset className="border-0 p-0 m-0 flex flex-col gap-2">
                <legend className="font-semibold mb-2">Ce qui ne va pas (plusieurs choix possibles)</legend>
                {REASONS[current.type === "provider" ? "firm" : "tool"].map((r) => <label key={r} className="flex items-center gap-2 text-sm"><input type="checkbox" name="reasons[]" value={r} className="size-4" /> {r}</label>)}
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-semibold">Échéance de votre contrat actuel
                  <select name="contract_end" className="min-h-11 rounded-lg border border-line px-3 font-normal"><option value="">Non précisé</option><option value="moins-3-mois">Moins de 3 mois</option><option value="3-12-mois">3 à 12 mois</option><option value="inconnu">Je ne sais pas</option></select></label>
                <label className="flex flex-col gap-1 text-sm font-semibold">Taille de l&apos;entreprise
                  <select name="company_size" className="min-h-11 rounded-lg border border-line px-3 font-normal"><option value="">Non précisé</option><option value="tpe">Moins de 10 salariés</option><option value="pme1">10 à 49 salariés</option><option value="pme2">50 à 249 salariés</option><option value="eti">250 salariés et plus</option></select></label>
                <label className="flex flex-col gap-1 text-sm font-semibold">Entreprise (facultatif)<input name="company" maxLength={200} className="min-h-11 rounded-lg border border-line px-3 font-normal" /></label>
                <label className="flex flex-col gap-1 text-sm font-semibold">E-mail professionnel<input name="email" type="email" required maxLength={200} className="min-h-11 rounded-lg border border-line px-3 font-normal" />
                  {state.errors?.email && <span className="text-red-800 font-normal">{state.errors.email}</span>}</label>
              </div>
              <fieldset className="border-0 p-0 m-0 flex flex-col gap-3">
                <legend className="font-semibold mb-2">Vos choix</legend>
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="consent_comparison" required className="size-4 mt-0.5" /><span><strong>Obligatoire.</strong> {CHALLENGE_CONSENT}</span></label>
                {state.errors?.consent_comparison && <span className="text-sm text-red-800">{state.errors.consent_comparison}</span>}
                {altNames.length > 0 && (
                  <div className="text-sm"><p className="m-0 mb-1"><strong>Optionnel.</strong> Je veux être recontacté par les alternatives que je coche, et uniquement celles-là :</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">{altNames.map((a) => <label key={a.slug} className="flex items-center gap-2"><input type="checkbox" name="contact[]" value={a.slug} className="size-4" /> {a.name}</label>)}</div></div>
                )}
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="consent_reminder" className="size-4 mt-0.5" /><span><strong>Optionnel.</strong> Prévenez-moi avant l&apos;échéance de mon contrat pour refaire le point.</span></label>
              </fieldset>
              <details className="text-sm"><summary className="cursor-pointer underline">Ce que nous faisons de vos données</summary>
                <p className="mt-2 text-ink-2">Finalités : envoi du comparatif ; mise en relation seulement avec les solutions que vous cochez ; statistiques anonymes (baromètre publié à partir de 30 réponses).
                  Destinataires : aucun sans votre accord explicite, solution par solution. Conservation : 3 ans. Droits : accès, rectification, effacement et retrait du consentement, voir la page <Link href="/donnees-personnelles" className="underline">Données personnelles</Link> ; réclamation auprès de la CNIL.</p></details>
              {!state.ok && state.message && <p role="alert" className="m-0 text-sm text-red-800">{state.message}</p>}
              <button type="submit" disabled={pending} className="self-start min-h-12 px-7 rounded-lg bg-ink text-white font-bold disabled:opacity-60">{pending ? "Envoi…" : "Recevoir mon comparatif"}</button>
            </form>
          )}
          <aside className="flex-1 basis-64 rounded-2xl bg-brand text-white p-6 flex flex-col gap-2">
            <p className="m-0 text-xs font-bold uppercase tracking-wider text-accent">Baromètre (anonyme)</p>
            <p className="m-0">Satisfaction moyenne des utilisateurs de {current.name}</p>
            <p className="m-0 font-display font-extrabold text-5xl">{baro?.avg != null ? `${fmt(baro.avg)}/10` : "—"}</p>
            <p className="m-0 text-sm text-zinc-300">{baro?.avg != null ? `Calculée sur ${baro.n} réponses.` : `Publiée à partir de 30 réponses${baro ? ` (${baro.n} à ce jour)` : ""}.`}</p>
          </aside>
        </div>
      )}
    </div>
  );
}

function SatisfactionInput() {
  const [v, setV] = useState(5);
  return (
    <span className="flex items-center gap-4">
      <input type="range" name="satisfaction" min={0} max={10} step={1} value={v} onChange={(e) => setV(Number(e.target.value))} className="flex-1 accent-ink" />
      <span className="font-display font-extrabold text-2xl w-16 text-right">{v}/10</span>
    </span>
  );
}
