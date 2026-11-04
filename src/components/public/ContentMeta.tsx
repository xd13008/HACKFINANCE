import { formatDate } from "@/lib/format";

/** Bloc de transparence : dates réelles, auteur, valideur humain, mentions commerciales. */
export function ContentMeta({
  updatedAt, publishedAt, author, validator, testedAt, testStatus, commercial,
}: {
  updatedAt?: string | null;
  publishedAt?: string | null;
  author?: string | null;
  validator?: string | null;
  testedAt?: string | null;
  testStatus?: "tested" | "listed" | null;
  commercial?: string[];
}) {
  return (
    <div className="text-sm text-ink-2 flex flex-wrap gap-x-4 gap-y-1 border-y border-line py-2 my-4">
      {testStatus === "tested" && testedAt && <span>✅ Testé le {formatDate(testedAt)}</span>}
      {testStatus === "listed" && <span>ℹ️ Référencé, non testé</span>}
      {updatedAt && <span>Mis à jour le {formatDate(updatedAt)}</span>}
      {!updatedAt && publishedAt && <span>Publié le {formatDate(publishedAt)}</span>}
      {author && <span>Par {author}</span>}
      {validator && <span>Validé par {validator}</span>}
      {commercial?.map((c) => (
        <span key={c} className="font-medium text-amber-800">{c}</span>
      ))}
    </div>
  );
}
