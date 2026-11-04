import type { FaqItem } from "@/lib/data";

export function Faq({ items }: { items: FaqItem[] }) {
  if (!items?.length) return null;
  return (
    <section className="mt-10" aria-labelledby="faq-title">
      <h2 id="faq-title" className="text-2xl font-bold mb-4">Questions fréquentes</h2>
      <div className="divide-y divide-line border border-line rounded-lg">
        {items.map((f) => (
          <details key={f.q} className="p-4 group">
            <summary className="font-medium cursor-pointer list-none flex justify-between gap-4">
              {f.q}<span aria-hidden className="group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="mt-2 text-ink-2">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
