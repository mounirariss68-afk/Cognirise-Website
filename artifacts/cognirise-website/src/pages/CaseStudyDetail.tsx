import { useRoute } from "wouter";
import NotFound from "@/pages/not-found";
import { BrandButton } from "@/components/ui/brand-button";
import { contentRecord, useCmsEntry } from "@/lib/cms";
import { metadataFromSeo, useDynamicMetadata } from "@/lib/metadata";

export default function CaseStudyDetail() {
  const [match, params] = useRoute("/work/:slug");
  const slug = params?.slug ?? "";
  const query = useCmsEntry("case-study", slug);
  const record = query.data ? contentRecord(query.data, "case-study") : undefined;
  const canRender = record?.variant === "full" && record.disclosure !== "restricted";
  useDynamicMetadata(query.data && canRender ? metadataFromSeo(query.data.seo, {
    title: `${query.data.title} | Cognirise`,
    description: record.mandate,
    imageUrl: query.data.media?.[0]?.url,
  }) : undefined);
  if (!match || !slug || (!query.isPending && (!record || !canRender))) return <NotFound />;
  if (!record || !query.data || !canRender) return null;
  return (
    <main>
      <section className="bg-[hsl(var(--brand-deep))] px-6 py-24 text-white md:px-12 md:py-32">
        <div className="mx-auto max-w-[1150px]">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-white/60">{record.disclosure} case study</p>
          <h1 className="mt-7 max-w-[940px] text-5xl font-semibold leading-[.96] md:text-7xl">{query.data.title}</h1>
          <p className="mt-8 max-w-[720px] text-xl leading-8 text-white/75">{record.mandate}</p>
        </div>
      </section>
      <section className="mx-auto max-w-[1150px] space-y-16 px-6 py-20 md:px-12 md:py-28">
        {record.context && <section><h2 className="text-3xl font-semibold">Context</h2><p className="mt-5 max-w-[760px] text-lg leading-8">{record.context}</p></section>}
        {record.constraints.length > 0 && <section><h2 className="text-3xl font-semibold">Constraints</h2><ul className="mt-5 grid gap-3 md:grid-cols-2">{record.constraints.map((item) => <li className="border-t border-border pt-3" key={item}>{item}</li>)}</ul></section>}
        <section><h2 className="text-3xl font-semibold">The work</h2><div className="prose mt-5 max-w-[800px]">{record.work.map((block, index) => block.type === "list" ? <ul key={index}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul> : block.type === "heading" ? <h3 key={index}>{block.text}</h3> : block.type === "quote" ? <blockquote key={index}>{block.text}</blockquote> : <p key={index}>{block.text}</p>)}</div></section>
        <div className="grid gap-12 bg-secondary p-8 md:grid-cols-2 md:p-12">
          <section><h2 className="text-2xl font-semibold">Controls</h2><ul className="mt-4 space-y-3">{record.controls.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section><h2 className="text-2xl font-semibold">Outcomes</h2><ul className="mt-4 space-y-3">{record.outcomes.map((item) => <li key={item}>{item}</li>)}</ul></section>
        </div>
        {record.quote && <blockquote className="border-l-4 border-[hsl(var(--brand-coral))] pl-8 text-2xl leading-10">“{record.quote.text}”{record.quote.attribution && <footer className="mt-4 text-sm">— {record.quote.attribution}</footer>}</blockquote>}
        {record.cta && <BrandButton href={record.cta.href}>{record.cta.label}</BrandButton>}
      </section>
    </main>
  );
}