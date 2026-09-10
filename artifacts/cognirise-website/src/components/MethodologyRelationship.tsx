import { ArrowRight, ChevronDown } from "lucide-react";
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
    <section className="bg-[#fdfcfb] border-y border-[#cbd3e1] py-16 px-6 md:px-[4.8vw] lg:py-20" aria-label="Methodology boundaries and connections">
      <div className="max-w-[900px] mx-auto">
        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[.12em] text-[#647491]">Decision</h3>
            <div className="mt-2 text-[22px] font-semibold leading-[1.3] text-[#102957] font-display tracking-[-0.03em]">{decision}</div>
          </div>
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[.12em] text-[#647491]">Output</h3>
            <div className="mt-3 text-[15px] leading-[1.6] text-[#405777]">{output}</div>
          </div>
        </div>

        <details className="mt-12 group border border-[#cbd3e1] bg-white rounded-sm">
          <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-[#f3f5f8] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] [&::-webkit-details-marker]:hidden">
            <span className="text-[12px] font-bold uppercase tracking-[0.15em] text-[#102957]">Method Boundary & Connections</span>
            <ChevronDown size={18} className="text-[#647491] group-open:rotate-180 transition-transform" />
          </summary>
          
          <div className="p-6 border-t border-[#cbd3e1] bg-[#fdfcfb] grid md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-[.12em] text-[#647491]">Start here when</h4>
                <div className="mt-2 text-[14px] leading-[1.6] text-[#405777]">{startHereWhen}</div>
              </div>
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-[.12em] text-[#647491]">Does not decide</h4>
                <div className="mt-2 text-[14px] leading-[1.6] text-[#405777]">{doesNotDecide}</div>
              </div>
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-[.12em] text-[#647491]">Reassess when</h4>
                <div className="mt-2 text-[14px] leading-[1.6] text-[#405777]">{reassessWhen}</div>
              </div>
            </div>

            <div className="space-y-8 border-t md:border-t-0 md:border-l border-[#cbd3e1] pt-8 md:pt-0 md:pl-10">
              <div>
                <h4 className="text-[14px] font-bold text-[#102957]">Connection to IDAO</h4>
                <div className="mt-2 text-[14px] leading-[1.6] text-[#405777]">{connectsToIdao}</div>
                <Link href="/methodologies/idao" className="mt-4 inline-flex items-center gap-2 text-[12px] font-bold text-[hsl(var(--brand-pink))] hover:text-[hsl(var(--brand-violet))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] w-fit">
                  See the IDAO methodology <ArrowRight size={14} />
                </Link>
              </div>
              
              <div>
                <h4 className="text-[14px] font-bold text-[#102957]">Connection to Agent Authority</h4>
                <div className="mt-2 text-[14px] leading-[1.6] text-[#405777]">{connectsToAuthority}</div>
                <Link href="/methodologies/agent-authority-model" className="mt-4 inline-flex items-center gap-2 text-[12px] font-bold text-[hsl(var(--brand-coral))] hover:text-[hsl(var(--brand-pink))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] w-fit">
                  See the Agent Authority Model <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}
