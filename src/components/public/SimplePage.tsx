import { Breadcrumbs } from "./Breadcrumbs";
import { Tracker } from "./Tracker";

export function SimplePage({ site, title, intro, path, pageType, children }: {
  site: string; title: string; intro?: string; path: string; pageType: string; children: React.ReactNode;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Tracker site={site} pageType={pageType} />
      <Breadcrumbs items={[{ name: "Accueil", path: "/" }, { name: title, path }]} />
      <h1 className="text-3xl font-extrabold">{title}</h1>
      {intro && <p className="text-lg text-ink-2 my-4">{intro}</p>}
      {children}
    </div>
  );
}
