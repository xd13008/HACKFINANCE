import { Breadcrumbs } from "./Breadcrumbs";
import { JsonLd } from "./JsonLd";
import { getSite } from "@/lib/data";
import { ldBreadcrumb } from "@/lib/seo";
import { Tracker } from "./Tracker";

export async function SimplePage({ site, title, intro, path, pageType, children }: {
  site: string; title: string; intro?: string; path: string; pageType: string; children: React.ReactNode;
}) {
  const s = await getSite(site);
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {s && <JsonLd data={[ldBreadcrumb(s, [{ name: "Accueil", path: "/" }, { name: title, path }])]} />}
      <Tracker site={site} pageType={pageType} />
      <Breadcrumbs items={[{ name: "Accueil", path: "/" }, { name: title, path }]} />
      <h1 className="text-3xl font-extrabold">{title}</h1>
      {intro && <p className="text-lg text-ink-2 my-4">{intro}</p>}
      {children}
    </div>
  );
}
