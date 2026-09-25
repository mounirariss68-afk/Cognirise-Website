import type { ReactNode } from "react";

/** Accent the final clause without encoding obsolete copy in the presentation. */
export function PulseHeading({ text }: { text: string }) {
  const split = text.lastIndexOf(". ", text.length - 3);
  const comma = text.indexOf(", ");
  const at = split >= 0 ? split + 1 : comma >= 0 ? comma + 1 : -1;
  return at > 0 ? <>{text.slice(0, at)} <em>{text.slice(at).trimStart()}</em></> : <>{text}</>;
}

export function PulseLinks({ links, className, children }: { links: { label: string; href: string }[]; className: string; children?: ReactNode }) {
  return links.map((link, index) => <a key={`${link.href}-${index}`} href={link.href} className={className} data-testid={`link-pulse-section-${index}`}>{link.label}{children}</a>);
}