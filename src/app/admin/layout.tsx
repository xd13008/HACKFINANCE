import type { Metadata } from "next";

export const metadata: Metadata = { title: "Back-office", robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="bo min-h-screen bg-surface-2 text-ink" style={{ ["--brand" as string]: "#0f4c81" }}>{children}</div>;
}
