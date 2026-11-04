/**
 * Lien sortant mesuré. Les liens affiliés et sponsorisés portent rel="sponsored"
 * (consigne Google) et sont signalés visuellement par le composant appelant.
 */
export function OutboundLink({
  href, kind, entityId, placementId, className, children,
}: {
  href: string;
  kind: "editorial" | "affiliate" | "sponsored";
  entityId?: string | null;
  placementId?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const rel = kind === "editorial" ? "noopener noreferrer nofollow" : "sponsored noopener noreferrer";
  return (
    <a
      href={href}
      target="_blank"
      rel={rel}
      className={className}
      data-track="outbound"
      data-link-kind={kind}
      data-entity={entityId ?? undefined}
      data-placement={placementId ?? undefined}
    >
      {children}
    </a>
  );
}
