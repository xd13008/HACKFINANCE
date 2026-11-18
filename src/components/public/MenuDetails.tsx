"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Menu déroulant sans JavaScript obligatoire (<details>) ; se referme après navigation et au clic en dehors. */
export function MenuDetails({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  useEffect(() => { if (ref.current) ref.current.open = false; }, [pathname]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false; };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  return <details ref={ref} className={className}>{children}</details>;
}
