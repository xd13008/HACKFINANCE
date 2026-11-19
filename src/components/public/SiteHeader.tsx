import Link from "next/link";
import type { Site } from "@/lib/data";
import { MenuDetails } from "./MenuDetails";

type Vertical = { id: string; slug: string; name: string };

/** Logo de la maquette : « radar/finances », la barre en accent. Autres portails : leur nom. */
export function SiteLogo({ site, className = "" }: { site: Site; className?: string }) {
  const words = site.name.toLowerCase().split(/\s+/);
  return (
    <Link href="/" aria-label={`${site.name}, accueil`} className={`font-display font-extrabold text-2xl tracking-tight text-white no-underline ${className}`}>
      {site.key === "daf" && words.length === 2 ? <>{words[0]}<span className="text-accent">/</span>{words[1]}</> : site.name}
    </Link>
  );
}

/** En-tête de la maquette (écran 1) : fond encre, « Trouver une solution » en accent, menu des univers, accès pro. */
export function SiteHeader({ site, verticals, hasJobs }: { site: Site; verticals: Vertical[]; hasJobs: boolean }) {
  const universes = (
    <ul className="m-0 p-2 list-none">
      {verticals.map((v) => (
        <li key={v.id}><Link href={`/univers/${v.slug}`} className="block rounded-lg px-3 py-2.5 font-semibold text-ink no-underline hover:bg-surface-2">{v.name}</Link></li>
      ))}
    </ul>
  );
  return (
    <header className="bg-brand text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-16 py-3 flex items-center gap-6">
        <SiteLogo site={site} />
        <nav aria-label="Navigation principale" className="hidden md:flex flex-1 justify-end items-center gap-6 text-[15px] font-semibold">
          <Link href="/trouver" className="rounded-lg bg-accent text-ink px-4 py-2 no-underline">Trouver une solution</Link>
          {verticals.length > 0 && (
            <MenuDetails className="relative">
              <summary className="list-none cursor-pointer py-2 text-white">Univers <span aria-hidden="true">▾</span></summary>
              <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl bg-white border border-line shadow-xl">{universes}</div>
            </MenuDetails>
          )}
          {hasJobs && <Link href="/emplois" className="text-white no-underline py-2">Jobs</Link>}
          <Link href="/espace-pro" className="text-white no-underline py-2">Je suis éditeur ou cabinet →</Link>
          <Link href="/mon-espace" className="rounded-lg border border-white/30 px-3 py-1.5 text-white no-underline hover:border-white">Mon espace</Link>
        </nav>
        <MenuDetails className="md:hidden ml-auto relative">
          <summary className="list-none cursor-pointer rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold">Menu</summary>
          <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl bg-white border border-line shadow-xl text-ink">
            <div className="p-2 border-b border-line flex flex-col gap-1">
              <Link href="/trouver" className="rounded-lg bg-accent px-3 py-2.5 font-semibold text-ink no-underline">Trouver une solution</Link>
              <Link href="/mon-espace" className="rounded-lg px-3 py-2.5 font-semibold text-ink no-underline">Mon espace</Link>
              {hasJobs && <Link href="/emplois" className="rounded-lg px-3 py-2.5 font-semibold text-ink no-underline">Jobs</Link>}
              <Link href="/espace-pro" className="rounded-lg px-3 py-2.5 font-semibold text-ink no-underline">Je suis éditeur ou cabinet</Link>
            </div>
            <p className="px-5 pt-3 text-xs font-bold uppercase tracking-wider text-ink-3">Univers</p>
            {universes}
          </div>
        </MenuDetails>
      </div>
    </header>
  );
}
