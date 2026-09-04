import { BrandButton } from "@/components/ui/brand-button";

export default function Advisors() {
  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 py-24 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          Advisory network
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-[100px] leading-[0.94] font-semibold mb-8 max-w-[800px]">
          Expertise assembled around <em className="not-italic text-[hsl(var(--brand-coral))]">the mandate.</em>
        </h1>
        <p className="text-lg text-muted-foreground max-w-[500px] mb-16 leading-relaxed">
          Cognirise does not publish unverified biographies or imply a standing board. Relevant advisory roles are defined around the work, and named people are introduced only when participation is confirmed.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px border border-border bg-border">
          {[
            ["01", "Mandate and policy", "Clarify the institutional obligations, authority model and decisions that shape the work."],
            ["02", "Domain and operations", "Bring operating knowledge close to the process, hand-offs and people who will own the change."],
            ["03", "Architecture and delivery", "Challenge technical choices against integration realities, controls and the route into use."]
          ].map(([number, title, copy]) => (
            <div key={number} className="min-h-[300px] bg-white p-8 md:p-10 flex flex-col justify-between">
              <span className="text-[10px] font-bold tracking-widest text-[hsl(var(--brand-coral))]">{number}</span>
              <div>
                <h2 className="text-2xl font-semibold mb-4">{title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{copy}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12">
          <BrandButton href="/contact">Discuss the expertise required</BrandButton>
        </div>
      </section>
    </div>
  );
}