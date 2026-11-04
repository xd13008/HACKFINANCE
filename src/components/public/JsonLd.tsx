/** Injecte un ou plusieurs blocs JSON-LD. Les données viennent de la base, jamais de l'utilisateur. */
export function JsonLd({ data }: { data: (Record<string, unknown> | null)[] }) {
  return (
    <>
      {data.filter(Boolean).map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, "\\u003c") }} />
      ))}
    </>
  );
}
