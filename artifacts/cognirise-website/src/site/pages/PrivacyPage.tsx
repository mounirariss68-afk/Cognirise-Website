import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import { PRIVACY } from "@/site/content/legal";

export default function PrivacyPage() {
  return (
    <div className="bg-[#fdfcfb] text-[#102957]">
      <div className="home-layout-frame py-10 md:py-14">
        <NavigationBackControl embedded />
        <article className="mx-auto max-w-[760px]">
          <h1 className="mt-6 font-display text-[clamp(38px,4.6vw,64px)] font-semibold leading-[0.95] tracking-[-0.06em]">{PRIVACY.title}</h1>
          <p className="mt-6 text-[17px] leading-[1.6] text-[#405777]">{PRIVACY.lead}</p>
          {PRIVACY.sections.map((section) => (
            <section key={section.heading} className="mt-10" aria-labelledby={`privacy-${section.heading.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
              <h2 id={`privacy-${section.heading.toLowerCase().replace(/[^a-z]+/g, "-")}`} className="font-display text-[24px] font-semibold tracking-[-0.03em]">{section.heading}</h2>
              {"paragraphs" in section && section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-4 text-[15.5px] leading-[1.65] text-[#30486d]">{paragraph}</p>)}
              {"items" in section && section.items && (
                <ul className="mt-4 space-y-3">
                  {section.items.map((item) => (
                    <li key={item.title} className="text-[15.5px] leading-[1.65] text-[#30486d]"><strong className="text-[#102957]">{item.title}</strong> {item.body}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
