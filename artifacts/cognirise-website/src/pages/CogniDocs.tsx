import { Link } from "wouter";
import { ArrowRight, Search, FileText, Database } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";

export default function CogniDocs() {
  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 pt-8 md:pt-12 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          Products / CogniDocs
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-12 lg:gap-16 pb-24">
          <div className="relative z-10 pt-12">
            <h1 className="text-5xl md:text-6xl lg:text-[90px] leading-[0.94] font-semibold mb-8 max-w-[600px]">
              Knowledge, <em className="not-italic text-[hsl(var(--brand-pink))]">retrieved.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[460px] mb-10 leading-relaxed">
              CogniDocs turns scattered enterprise knowledge into controlled, structured context. 
            </p>
            <BrandButton href="/value-scan">Bring us one process</BrandButton>
          </div>
          
          <div className="relative h-[400px] lg:h-auto bg-[hsl(var(--brand-deep))] clip-diagonal flex items-center justify-center p-12">
             <div className="w-full max-w-sm bg-white/10 backdrop-blur border border-white/20 p-6 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
               <div className="flex items-center gap-4 mb-6 border-b border-white/20 pb-4">
                 <Search className="text-white/50 w-5 h-5" />
                 <div className="h-4 bg-white/20 rounded w-1/2" />
               </div>
               <div className="space-y-4">
                 <div className="flex items-center gap-3">
                   <FileText className="text-[hsl(var(--brand-coral))] w-4 h-4" />
                   <div className="h-2 bg-white/40 rounded w-3/4" />
                 </div>
                 <div className="flex items-center gap-3">
                   <Database className="text-[hsl(var(--brand-pink))] w-4 h-4" />
                   <div className="h-2 bg-white/30 rounded w-full" />
                 </div>
                 <div className="flex items-center gap-3">
                   <FileText className="text-[hsl(var(--brand-violet))] w-4 h-4" />
                   <div className="h-2 bg-white/20 rounded w-2/3" />
                 </div>
               </div>
             </div>
          </div>
        </div>
      </section>

      <section className="bg-[hsl(var(--secondary))] px-6 md:px-12 py-24 w-full border-t border-foreground">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))] mb-4">01 / Ingest</div>
            <h3 className="text-2xl font-bold mb-4">Connect the sources</h3>
            <p className="text-muted-foreground leading-relaxed">Securely ingest unstructured and structured documents from existing repositories, maintaining original access controls.</p>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))] mb-4">02 / Structure</div>
            <h3 className="text-2xl font-bold mb-4">Vectorize and index</h3>
            <p className="text-muted-foreground leading-relaxed">Transform raw text into high-dimensional vectors, enabling semantic search and context retrieval for AI models.</p>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))] mb-4">03 / Retrieve</div>
            <h3 className="text-2xl font-bold mb-4">Provide context</h3>
            <p className="text-muted-foreground leading-relaxed">Serve exact, cited passages to agents and users, ensuring every answer is grounded in verifiable enterprise truth.</p>
          </div>
        </div>
      </section>
    </div>
  );
}