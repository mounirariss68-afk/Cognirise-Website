import { MessageSquare } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";

export default function CogniTalk() {
  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 pt-12 pb-24 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          Products / CogniTalk
        </div>
        
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          <div className="flex-1">
            <h1 className="text-5xl md:text-6xl lg:text-[85px] leading-[0.94] font-semibold mb-8">
              The conversation <em className="not-italic text-[hsl(var(--brand-pink))]">layer.</em>
            </h1>
            <p className="text-lg text-muted-foreground max-w-[460px] mb-10 leading-relaxed">
              A conversational interface that connects people to enterprise intelligence in the flow of real work.
            </p>
            <BrandButton href="/value-scan">Bring us one process</BrandButton>
          </div>
          
           <div className="flex-1 w-full bg-[hsl(var(--secondary))] p-12 relative overflow-hidden border border-border">
             <div className="absolute top-0 right-0 p-4">
               <MessageSquare className="w-8 h-8 text-[hsl(var(--brand-coral))]/20" />
             </div>
            
            <div className="flex flex-col gap-6 relative z-10">
              <div className="bg-white p-4 rounded-tl-xl rounded-tr-xl rounded-br-xl shadow-sm border border-border w-3/4 self-start">
                 <p className="text-sm font-medium">Find the current operating procedure and surface the relevant steps.</p>
              </div>
              <div className="bg-[hsl(var(--brand-deep))] text-white p-4 rounded-tl-xl rounded-tr-xl rounded-bl-xl shadow-sm w-5/6 self-end">
                 <p className="text-sm">I found the controlled source in CogniDocs. Here are the sections relevant to this request, with citations for review.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[hsl(var(--brand-deep))] text-white py-24 px-6 md:px-12 w-full clip-diagonal-bottom">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <h2 className="text-4xl lg:text-5xl font-semibold mb-8">Designed around the conversation.</h2>
            <p className="text-white/80 text-lg leading-relaxed">
              The interaction model is shaped around the people, terminology, permissions and decisions involved in the work.
            </p>
          </div>
          <div>
             <h2 className="text-4xl lg:text-5xl font-semibold mb-8">Context-aware.</h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Through CogniOS, conversations can draw on controlled enterprise knowledge and present source references for people to review.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}