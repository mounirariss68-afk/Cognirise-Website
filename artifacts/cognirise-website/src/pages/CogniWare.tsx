import { Layers, Network } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";

export default function CogniWare() {
  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 pt-12 pb-24 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          Products / CogniWare
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-12 lg:gap-16">
          <div>
            <h1 className="text-5xl md:text-6xl lg:text-[85px] leading-[0.94] font-semibold mb-8 max-w-[700px]">
              Composable <em className="not-italic text-[hsl(var(--brand-coral))]">integration.</em>
            </h1>
            <p className="text-lg text-muted-foreground max-w-[460px] mb-10 leading-relaxed">
              CogniWare is the integration layer for connecting intelligence to the enterprise systems where work already happens.
            </p>
            <BrandButton href="/value-scan">Bring us one process</BrandButton>
          </div>
          
          <div className="bg-[hsl(var(--secondary))] border border-border p-12 flex flex-col justify-center gap-8">
             <div className="flex items-center gap-6">
               <div className="w-16 h-16 bg-[hsl(var(--brand-deep))] text-white flex items-center justify-center font-bold text-xs uppercase tracking-widest">ERP</div>
               <div className="flex-1 h-[2px] bg-gradient-to-r from-[hsl(var(--brand-deep))] to-[hsl(var(--brand-coral))]" />
               <div className="w-16 h-16 border-2 border-[hsl(var(--brand-coral))] flex items-center justify-center text-[hsl(var(--brand-coral))]"><Layers /></div>
             </div>
             <div className="flex items-center gap-6">
               <div className="w-16 h-16 bg-[hsl(var(--brand-deep))] text-white flex items-center justify-center font-bold text-xs uppercase tracking-widest">CRM</div>
               <div className="flex-1 h-[2px] bg-gradient-to-r from-[hsl(var(--brand-deep))] to-[hsl(var(--brand-pink))]" />
               <div className="w-16 h-16 border-2 border-[hsl(var(--brand-pink))] flex items-center justify-center text-[hsl(var(--brand-pink))]"><Network /></div>
             </div>
          </div>
        </div>
      </section>

      <section className="bg-[hsl(var(--brand-deep))] text-white px-6 md:px-12 py-24 w-full clip-diagonal-left">
        <div className="max-w-[1440px] mx-auto">
          <h2 className="text-4xl lg:text-5xl font-semibold mb-16">Meet the work where it lives.</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border-t border-white/20 pt-6">
              <h3 className="text-xl font-bold mb-4">No rip and replace</h3>
              <p className="text-white/70">Intelligence should enhance your core systems, not replace them. We integrate into the platforms your teams already use.</p>
            </div>
            <div className="border-t border-white/20 pt-6">
              <h3 className="text-xl font-bold mb-4">Controlled connections</h3>
              <p className="text-white/70">Integration patterns are shaped around the identity, access and data constraints of each environment.</p>
            </div>
            <div className="border-t border-white/20 pt-6">
              <h3 className="text-xl font-bold mb-4">Modular capability</h3>
              <p className="text-white/70">Deploy only the intelligence capabilities you need—vision, text, speech, or orchestration—directly into the workflow.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}