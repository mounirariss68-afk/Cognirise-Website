import { useEffect } from "react";
import { BrandButton } from "@/components/ui/brand-button";
import { NOT_FOUND } from "@/site/content/legal";

/** The 404 page. Plain text, one button. The title is set here so unknown routes never keep an old page title. */
export default function NotFound() {
  useEffect(() => {
    document.title = NOT_FOUND.title;
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex,nofollow");
    document.head.querySelector('link[rel="canonical"]')?.remove();
  }, []);

  return (
    <section className="relative isolate min-h-[60vh] overflow-hidden bg-[hsl(var(--brand-deep))] px-6 py-24 text-white md:px-12 md:py-32" aria-labelledby="page-title">
      <div aria-hidden="true" className="absolute inset-y-0 right-[-4vw] -z-10 font-display text-[42vw] font-semibold leading-[0.8] text-white/[0.035]">4</div>
      <div className="home-layout-frame">
        <h1 id="page-title" className="max-w-[850px] font-display text-5xl font-semibold leading-[0.94] tracking-[-0.06em] md:text-7xl">{NOT_FOUND.heading}</h1>
        <p className="mt-8 max-w-[520px] text-base leading-relaxed text-white/75 md:text-lg">{NOT_FOUND.body}</p>
        <div className="mt-10"><BrandButton href={NOT_FOUND.cta.href} variant="inverse">{NOT_FOUND.cta.label}</BrandButton></div>
      </div>
    </section>
  );
}
