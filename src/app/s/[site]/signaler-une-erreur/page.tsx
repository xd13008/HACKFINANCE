import type { Metadata } from "next";
import { SimplePage } from "@/components/public/SimplePage";
import { ErrorReportForm } from "@/components/public/Forms";
import { requireSite, type SiteParams } from "../_lib";

export const metadata: Metadata = { title: "Signaler une erreur ou exercer un droit de réponse", robots: { index: false, follow: true } };

export default async function ReportPage({ params, searchParams }: { params: SiteParams; searchParams: Promise<{ page?: string }> }) {
  const site = await requireSite((await params).site);
  const page = (await searchParams).page ?? "/";
  return (
    <SimplePage site={site.key} title="Signaler une erreur ou exercer un droit de réponse" path="/signaler-une-erreur" pageType="form"
      intro="Chaque signalement est examiné par la rédaction sous 10 jours ouvrés. Les corrections sont tracées.">
      <ErrorReportForm site={site.key} page={page.startsWith("/") ? page : "/"} />
    </SimplePage>
  );
}
