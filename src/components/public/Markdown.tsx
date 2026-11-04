import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Rendu du corps éditorial. react-markdown n'interprète pas le HTML brut :
 * un brouillon d'agent ne peut pas injecter de script.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-ed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2>{children}</h2>,
          a: ({ href = "", children }) =>
            href.startsWith("/") ? (
              <Link href={href}>{children}</Link>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer nofollow" data-track="outbound" data-link-kind="editorial">
                {children}
              </a>
            ),
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} loading="lazy" decoding="async" className="rounded-lg" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
