import { BrandButton } from "@/components/ui/brand-button";

export default function Partners() {
  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 py-24 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          Partners
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-[100px] leading-[0.94] font-semibold mb-8 max-w-[800px]">
          The right ecosystem for <em className="not-italic text-[hsl(var(--brand-pink))]">the work.</em>
        </h1>
        <p className="text-lg text-muted-foreground max-w-[500px] mb-16 leading-relaxed">
          When an engagement needs complementary technology or specialist capability, the ecosystem is selected around the mandate—not presented as a pre-agreed logo wall.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px border border-border bg-border">
          {[
            ["01", "Client-selected technology", "Start with the platforms and providers already relevant to the operating environment."],
            ["02", "Specialist capability", "Add domain or technical depth only where the work requires it."],
            ["03", "Clear accountability", "Confirm roles, boundaries and relationships for each engagement before delivery begins."]
          ].map(([number, title, copy]) => (
            <div key={number} className="min-h-[280px] bg-white p-8 md:p-10 flex flex-col justify-between">
              <span className="text-[10px] font-bold tracking-widest text-[hsl(var(--brand-pink))]">{number}</span>
              <div>
                <h2 className="text-2xl font-semibold mb-4">{title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-foreground text-white px-6 md:px-12 py-24 relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-8">Bring a relevant capability</h2>
          <p className="text-lg text-white/80 max-w-[500px] mx-auto mb-12">
            If your technology or specialist expertise is relevant to a real operating challenge, we can start with the work and test the fit.
          </p>
          <BrandButton href="/contact" variant="submit">Start a conversation</BrandButton>
        </div>
      </section>
    </div>
  );
}