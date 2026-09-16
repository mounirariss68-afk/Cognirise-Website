import { Plus } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { SpatialDisclosure, SpatialDisclosureItem, SpatialDisclosureTrigger, SpatialDisclosurePanel } from "@/components/ui/spatial-disclosure";

export default function FAQ() {
  const faqs = [
    {
      q: "What is governed intelligence?",
      a: "Governed intelligence means defining what models and agents may do, what context they may use, where people remain responsible and what evidence the operating team needs. The exact controls depend on the process and environment."
    },
    {
      q: "Do you build custom models?",
      a: "We start with the work and its constraints rather than assuming one model. The architecture can consider different model, orchestration, context and governance options before a delivery route is agreed."
    },
    {
      q: "How does the Value Scan work?",
      a: "A Value Scan is a focused working session around one process under pressure. We surface the decision, data dependencies, human hand-offs and operating constraints, then frame a practical next route."
    },
    {
      q: "How do you approach deployment constraints?",
      a: "Deployment is not predetermined. We begin by documenting the environment, data boundaries, integration constraints and authority model. Any proposed hosting or infrastructure pattern is then evaluated against those requirements."
    }
  ];

  return (
    <div className="flex flex-col">
      <section className="public-hero-shell px-6 md:px-12 py-24 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          FAQ
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-[100px] leading-[0.94] font-semibold mb-16 max-w-[800px]">
          Clarity on <em className="not-italic text-[hsl(var(--brand-pink))]">control.</em>
        </h1>

        <SpatialDisclosure className="border-t border-foreground max-w-[900px]">
          {faqs.map((faq, i) => {
            const id = String(i);
            return (
              <SpatialDisclosureItem key={i} id={id}>
                <SpatialDisclosureTrigger
                  id={id}
                  className="w-full group flex items-center justify-between gap-8 px-4 py-8 border-b border-border cursor-pointer transition-all duration-300 hover:bg-[hsl(var(--brand-violet))/5] hover:pl-8 text-left data-[state=active]:bg-[hsl(var(--brand-violet))/5] data-[state=active]:pl-8"
                >
                  <h3 className="text-2xl font-semibold flex-1 group-hover:text-[hsl(var(--brand-pink))] transition-colors">
                    {faq.q}
                  </h3>
                  <Plus className="h-6 w-6 text-foreground group-hover:text-[hsl(var(--brand-pink))] transition-transform duration-300 group-data-[state=active]:rotate-45 group-data-[state=active]:text-[hsl(var(--brand-pink))]" />
                </SpatialDisclosureTrigger>

                <SpatialDisclosurePanel
                  id={id}
                  className="overflow-hidden transition-all duration-300 data-[state=inactive]:max-h-0 data-[state=inactive]:opacity-0 data-[state=active]:max-h-[500px] data-[state=active]:opacity-100"
                >
                  <div className="bg-[hsl(var(--brand-violet))/5] border-b border-border px-8 py-8 -mt-[1px]">
                    <p className="text-lg leading-relaxed text-foreground/80">{faq.a}</p>
                  </div>
                </SpatialDisclosurePanel>
              </SpatialDisclosureItem>
            );
          })}
        </SpatialDisclosure>
      </section>
      
      <section className="px-6 md:px-12 pb-24 max-w-[1440px] mx-auto w-full">
        <div className="bg-[hsl(var(--secondary))] p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h3 className="text-3xl font-bold mb-4">Have another question?</h3>
            <p className="text-muted-foreground">Our team is ready to discuss your specific operational challenges.</p>
          </div>
          <BrandButton href="/contact">Get in touch</BrandButton>
        </div>
      </section>
    </div>
  );
}
