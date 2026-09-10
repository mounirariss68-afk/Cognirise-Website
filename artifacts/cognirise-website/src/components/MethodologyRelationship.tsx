import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

interface MethodologyRelationshipProps {
  startHereWhen: React.ReactNode;
  decision: React.ReactNode;
  output: React.ReactNode;
  connectsToIdao: React.ReactNode;
  connectsToAuthority: React.ReactNode;
  reassessWhen: React.ReactNode;
  doesNotDecide: React.ReactNode;
}

export function MethodologyRelationship({
  startHereWhen,
  decision,
  output,
  connectsToIdao,
  connectsToAuthority,
  reassessWhen,
  doesNotDecide,
}: MethodologyRelationshipProps) {
  return (
    <section className="bg-white border-y border-[#cbd3e1] py-20 px-6 md:px-[4.8vw] lg:py-28" aria-label="Methodology boundaries and connections">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="font-display text-[clamp(32px,4.5vw,60px)] font-semibold tracking-[-.06em] text-[#102957] mb-12 border-b border-[#102957] pb-6">Method boundary and connections</h2>
        
        <div className="grid gap-10 md:grid-cols-[1fr_1fr] lg:gap-16">
          <div className="space-y-8">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[.12em] text-[#647491]">Start here when</h3>
              <div className="mt-2 text-sm leading-[1.65] text-[#405777]">{startHereWhen}</div>
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[.12em] text-[#647491]">Decision</h3>
              <div className="mt-2 text-[19px] font-medium leading-[1.4] text-[#102957] font-display">{decision}</div>
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[.12em] text-[#647491]">Output</h3>
              <div className="mt-2 text-sm leading-[1.65] text-[#405777]">{output}</div>
            </div>
            <div className="pt-6 border-t border-[#cbd3e1]">
              <h3 className="text-[11px] font-bold uppercase tracking-[.12em] text-[#647491]">Does not decide</h3>
              <div className="mt-2 text-sm leading-[1.65] text-[#405777]">{doesNotDecide}</div>
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[.12em] text-[#647491]">Reassess when</h3>
              <div className="mt-2 text-sm leading-[1.65] text-[#405777]">{reassessWhen}</div>
            </div>
          </div>

          <div className="self-start space-y-6">
            <div className="flex flex-col border-l-4 border-[hsl(var(--brand-violet))] bg-[#f1f3f7] p-8">
              <h3 className="text-[11px] font-bold uppercase tracking-[.12em] text-[#102957]">How it connects to IDAO</h3>
              <div className="mt-3 text-[15px] leading-[1.65] text-[#405777]">{connectsToIdao}</div>
              <Link href="/methodologies/idao" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--brand-pink))] hover:text-[#102957] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] w-fit">
                See the IDAO methodology <ArrowRight size={14} />
              </Link>
            </div>
            
            <div className="flex flex-col border-l-4 border-[hsl(var(--brand-coral))] bg-[#f1f3f7] p-8">
              <h3 className="text-[11px] font-bold uppercase tracking-[.12em] text-[#102957]">How it connects to Agent Authority</h3>
              <div className="mt-3 text-[15px] leading-[1.65] text-[#405777]">{connectsToAuthority}</div>
              <Link href="/methodologies/agent-authority-model" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--brand-pink))] hover:text-[#102957] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] w-fit">
                See the Agent Authority Model <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
