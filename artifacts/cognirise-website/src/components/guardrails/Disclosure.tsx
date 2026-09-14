import React, { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { MarkdownInline } from "./MarkdownInline";

export function Disclosure({ title, children }: { title: string, children: React.ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const handleBeforePrint = () => {
      if (detailsRef.current) {
        wasOpen.current = detailsRef.current.hasAttribute("open");
        detailsRef.current.setAttribute("open", "true");
      }
    };
    const handleAfterPrint = () => {
      if (detailsRef.current && !wasOpen.current) {
        detailsRef.current.removeAttribute("open");
      }
    };
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  return (
    <details ref={detailsRef} className="group border border-[var(--gf-border)] bg-[var(--gf-surface)] print-expand shadow-sm">
      <summary className="cursor-pointer px-6 py-5 font-display text-[length:var(--gf-text-lg)] font-semibold text-[var(--gf-ink)] hover:bg-[var(--gf-bg)] transition-colors flex justify-between items-center focus-visible:outline-none focus-visible:bg-[var(--gf-bg)] focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] focus-visible:ring-inset">
        <MarkdownInline text={title} />
        <ChevronDown size={20} className="text-[var(--gf-ink-muted)] group-open:rotate-180 transition-transform shrink-0" />
      </summary>
      <div className="p-6 md:p-8 border-t border-[var(--gf-border)] bg-[var(--gf-bg)] text-[length:var(--gf-text-base)] text-[var(--gf-ink-muted)]">
        {children}
      </div>
    </details>
  );
}