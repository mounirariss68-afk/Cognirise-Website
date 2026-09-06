import { useRoute } from "wouter";
import NotFound from "@/pages/not-found";
import { BrandButton } from "@/components/ui/brand-button";
import { contentRecord, useCmsEntry } from "@/lib/cms";
import { metadataFromSeo, useDynamicMetadata } from "@/lib/metadata";

export default function PlatformDetail() {
  const [match, params] = useRoute("/platforms/:slug");
  const slug = params?.slug ?? "";
  const query = useCmsEntry("platform", slug);
  const record = query.data ? contentRecord(query.data, "platform") : undefined;
  useDynamicMetadata(query.data && metadataFromSeo(query.data.seo, {
    title: `${query.data.title} | Cognirise`,
    description: record?.summary ?? query.data.summary ?? "A Cognirise governed enterprise platform.",
    imageUrl: query.data.media?.[0]?.url,
  }));
  if (!match || !slug || (!query.isPending && (!record || record.template !== "standard"))) return <NotFound />;
  if (!record || !query.data) return null;
  const hero = query.data.media?.find((media) => media.id === record.heroMediaId)?.url;
  return (
    <main className="overflow-hidden">
      <section className="relative bg-[hsl(var(--brand-deep))] px-6 py-24 text-white md:px-12 md:py-32">
        {hero && <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
        <div className="relative mx-auto max-w-[1200px]">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-white/60">{record.category}</p>
          <h1 className="mt-7 max-w-[900px] text-5xl font-semibold leading-[.94] md:text-7xl">{query.data.title}</h1>
          <p className="mt-8 max-w-[680px] text-lg leading-8 text-white/75">{record.summary}</p>
        </div>
      </section>
      <section className="mx-auto max-w-[1200px] space-y-20 px-6 py-20 md:px-12 md:py-28">
        {record.sections.map((section) => (
          <article key={section.heading} className="grid gap-8 border-t border-foreground pt-8 md:grid-cols-[.75fr_1.25fr]">
            <h2 className="text-3xl font-semibold">{section.heading}</h2>
            <div className="prose max-w-none">{section.body.map((block, index) => {
              if (block.type === "heading") return <h3 key={index}>{block.text}</h3>;
              if (block.type === "list") return <ul key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
              if (block.type === "quote") return <blockquote key={index}>{block.text}</blockquote>;
              return <p key={index}>{block.text}</p>;
            })}</div>
          </article>
        ))}
        {(record.capabilities.length > 0 || record.differentiators.length > 0) && (
          <div className="grid gap-10 bg-secondary p-8 md:grid-cols-2 md:p-12">
            <div><h2 className="text-2xl font-semibold">Capabilities</h2><ul className="mt-5 space-y-3">{record.capabilities.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><h2 className="text-2xl font-semibold">Differentiators</h2><ul className="mt-5 space-y-3">{record.differentiators.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
        )}
        {record.cta && <BrandButton href={record.cta.href}>{record.cta.label}</BrandButton>}
      </section>
    </main>
  );
}