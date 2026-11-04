/** Réponse directe en tête de page (utile aux moteurs de réponse et aux lecteurs pressés). */
export function Summary({ children }: { children: string | null | undefined }) {
  if (!children) return null;
  return (
    <p className="text-lg text-ink-2 bg-surface-2 border-l-4 border-brand rounded-r-md px-4 py-3 my-4">{children}</p>
  );
}
