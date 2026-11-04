import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = (await searchParams).next ?? "/admin";
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6">
        <h1 className="text-xl font-bold mb-1">Back-office</h1>
        <p className="text-sm text-ink-2 mb-4">Réseau de portails — accès réservé à l&apos;équipe.</p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
