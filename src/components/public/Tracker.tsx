"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type PageInfo = { site: string; pageType?: string; rubrique?: string | null; categoryId?: string | null; entityId?: string | null };

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) navigator.sendBeacon("/api/collect", new Blob([body], { type: "application/json" }));
  else fetch("/api/collect", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
}

/**
 * Mesure d'audience first-party, sans cookie : pages vues, clics sortants,
 * impressions des emplacements sponsorisés (reporting annonceur).
 */
export function Tracker(info: PageInfo) {
  const pathname = usePathname();

  useEffect(() => {
    const base = { site: info.site, path: location.pathname, pageType: info.pageType, rubrique: info.rubrique,
                   categoryId: info.categoryId, entityId: info.entityId };
    const params = new URLSearchParams(location.search);
    send({ ...base, type: "pageview", referrer: document.referrer || null,
           utm: { source: params.get("utm_source"), medium: params.get("utm_medium"), campaign: params.get("utm_campaign") } });

    const seen = new Set<string>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.sponsoredImpression;
        if (e.isIntersecting && id && !seen.has(id)) {
          seen.add(id);
          send({ ...base, type: "sponsored_impression", placementId: id, entityId: (e.target as HTMLElement).dataset.entity });
        }
      }
    }, { threshold: 0.5 });
    document.querySelectorAll("[data-sponsored-impression]").forEach((el) => io.observe(el));

    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as HTMLElement).closest<HTMLAnchorElement>("a[data-track='outbound']");
      if (!a) return;
      send({ ...base, type: "outbound_click", linkKind: a.dataset.linkKind, placementId: a.dataset.placement ?? null,
             entityId: a.dataset.entity ?? info.entityId, props: { href: a.href } });
    };
    document.addEventListener("click", onClick);
    return () => { io.disconnect(); document.removeEventListener("click", onClick); };
  }, [pathname, info.site, info.pageType, info.rubrique, info.categoryId, info.entityId]);

  return null;
}

/** Événement ponctuel (simulateur utilisé, formulaire envoyé). */
export function trackEvent(site: string, type: "simulator_use" | "form_submit" | "resource_download", extra: Record<string, unknown> = {}) {
  send({ site, type, path: location.pathname, ...extra });
}
