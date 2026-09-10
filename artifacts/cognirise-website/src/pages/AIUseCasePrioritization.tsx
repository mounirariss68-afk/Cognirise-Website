import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, ArrowRight, Info, Trash2 } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";

export type UseCase = {
  id: string;
  name: string;
  description: string;
  scores: Record<string, number>;
  caveats: string;
  dependencies: string;
};

export const DIMENSIONS = [
  { id: "value", label: "Value & Impact", low: "Marginal", high: "Transformational", desc: "Strategic and economic return." },
  { id: "feasibility", label: "Feasibility", low: "Unproven", high: "Production-ready", desc: "Data readiness and technical maturity." },
  { id: "timeToEvidence", label: "Time to Evidence", low: "Quarters", high: "Days", desc: "Speed to prove value." },
  { id: "adoptionFriction", label: "Adoption Friction", low: "High Disruption", high: "Seamless", desc: "Workflow disruption." },
  { id: "controlBurden", label: "Control Burden", low: "Critical Risk", high: "Standard Controls", desc: "Risk and compliance overhead." },
  { id: "reusePotential", label: "Reuse Potential", low: "Isolated", high: "Foundational", desc: "Component or agent reuse." },
] as const;

function Kicker({ children, inverse = false }: { children: React.ReactNode; inverse?: boolean }) {
  return (
    <div className={`flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] ${inverse ? "text-white/70" : "text-[#102957]"}`}>
      <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
      {children}
    </div>
  );
}

export function getRecommendation(uc: UseCase) {
  const { value, feasibility, timeToEvidence, adoptionFriction, controlBurden } = uc.scores;
  const score = Object.values(uc.scores).reduce((a, b) => a + b, 0);
  
  if (value <= 2) {
    return { stage: "Stop", color: "text-[#647491]", bg: "bg-[#f1f3f7]", reason: "Low strategic or economic value does not justify the investment.", link: null, score };
  }
  if (controlBurden <= 2 && feasibility <= 2) {
    return { stage: "Stop", color: "text-[#647491]", bg: "bg-[#f1f3f7]", reason: "High control burden combined with low technical feasibility presents an unacceptable delivery risk.", link: null, score };
  }
  if (feasibility <= 2) {
    return { stage: "Innovate", color: "text-[hsl(var(--brand-violet))]", bg: "bg-[hsl(var(--brand-violet))]/10", reason: "Unproven feasibility requires a bounded technical discovery phase before committing to production.", link: "/methodologies/idao#innovate", score };
  }
  if (timeToEvidence <= 2) {
    return { stage: "Innovate", color: "text-[hsl(var(--brand-violet))]", bg: "bg-[hsl(var(--brand-violet))]/10", reason: "Long time-to-evidence requires an Innovate cycle to isolate the fastest path to proof.", link: "/methodologies/idao#innovate", score };
  }
  if (adoptionFriction <= 2 || controlBurden <= 3) {
    return { stage: "Demonstrate", color: "text-[hsl(var(--brand-pink))]", bg: "bg-[hsl(var(--brand-pink))]/10", reason: "Significant adoption or control constraints require proving the capability in a restricted environment first.", link: "/methodologies/idao#demonstrate", score };
  }
  if (feasibility >= 4 && adoptionFriction >= 4) {
    return { stage: "Activate", color: "text-[hsl(var(--brand-coral))]", bg: "bg-[hsl(var(--brand-coral))]/10", reason: "High feasibility and low adoption friction indicate the workflow is ready for production integration and scaling.", link: "/methodologies/idao#activate", score };
  }
  
  return { stage: "Demonstrate", color: "text-[hsl(var(--brand-pink))]", bg: "bg-[hsl(var(--brand-pink))]/10", reason: "Balanced feasibility and friction suggest establishing a solid operating baseline before full activation.", link: "/methodologies/idao#demonstrate", score };
}

function getTags(uc: UseCase) {
  const tags = [];
  if (uc.scores.reusePotential >= 4) tags.push("Foundational");
  if (uc.scores.timeToEvidence >= 4 && uc.scores.feasibility >= 4) tags.push("Quick Win");
  if (uc.scores.value >= 4 && uc.scores.feasibility <= 3) tags.push("Strategic Bet");
  return tags;
}

function getScoreExplanation(uc: UseCase) {
  return DIMENSIONS.map((dimension) => `${dimension.label} ${uc.scores[dimension.id]}/5`).join(" · ");
}

function ScorePills({ value, onChange, dimensionId, useCaseId }: { value: number; onChange: (v: number) => void; dimensionId: string; useCaseId: string }) {
  return (
    <div className="flex gap-1 mt-2">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          data-testid={`button-score-${dimensionId}-${v}-${useCaseId}`}
          onClick={() => onChange(v)}
          className={`flex-1 h-8 text-[11px] font-bold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] ${
            value >= v 
              ? "bg-[#102957] border-[#102957] text-white" 
              : "bg-white border-[#cbd3e1] text-[#647491] hover:border-[hsl(var(--brand-pink))]"
          }`}
          aria-label={`Score ${v} for ${dimensionId}`}
          aria-pressed={value >= v}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function UseCaseCard({ uc, index, updateUseCase, removeUseCase }: { uc: UseCase; index: number; updateUseCase: (id: string, data: Partial<UseCase>) => void; removeUseCase: (id: string) => void }) {
  const rec = getRecommendation(uc);
  const reducedMotion = useReducedMotion();

  return (
    <motion.div 
      initial={reducedMotion ? false : { opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.4, delay: index * 0.05 }}
      className="bg-white border border-[#cbd3e1] rounded-sm shadow-sm overflow-hidden"
    >
      <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left Col: Info */}
        <div className="flex-[0.8] flex flex-col border-b lg:border-b-0 lg:border-r border-[#cbd3e1] pb-6 lg:pb-0 lg:pr-8">
           <div className="flex justify-between items-start mb-4">
             <span className="text-[10px] font-bold text-[hsl(var(--brand-pink))] uppercase tracking-wider block">Opportunity 0{index + 1}</span>
             <button onClick={() => removeUseCase(uc.id)} data-testid={`button-remove-use-case-${uc.id}`} className="text-[#647491] hover:text-[hsl(var(--brand-coral))] transition-colors" aria-label="Remove opportunity"><Trash2 size={16} /></button>
           </div>
           
           <input 
             value={uc.name} 
             onChange={e => updateUseCase(uc.id, { name: e.target.value })} 
             data-testid={`input-use-case-name-${uc.id}`}
             placeholder="Opportunity Name"
             className="font-display text-2xl font-semibold text-[#102957] bg-transparent outline-none border-b border-transparent hover:border-[#cbd3e1] focus:border-[hsl(var(--brand-pink))] transition-colors w-full pb-1"
           />

            <label className="mt-6 block text-[10px] font-bold uppercase tracking-wider text-[#647491]" htmlFor={`description-${uc.id}`}>Outcome sought</label>
            <textarea
              id={`description-${uc.id}`}
              value={uc.description}
              onChange={e => updateUseCase(uc.id, { description: e.target.value })}
              data-testid={`textarea-description-${uc.id}`}
              placeholder="What business or service outcome would improve?"
              className="mt-2 h-20 w-full resize-none rounded-sm border border-[#cbd3e1] bg-white p-3 text-[13px] leading-relaxed text-[#405777] outline-none focus:border-[hsl(var(--brand-pink))]"
            />
           
           <div className="mt-8 lg:mt-auto pt-4">
             <label className="block text-[10px] font-bold uppercase tracking-wider text-[#647491] mb-2">Caveats & Constraints</label>
             <textarea 
               value={uc.caveats} 
               onChange={e => updateUseCase(uc.id, { caveats: e.target.value })}
               data-testid={`textarea-caveats-${uc.id}`}
               placeholder="Record specific risks, data privacy concerns, or dependencies..."
               className="w-full text-[13px] leading-relaxed text-[#405777] bg-[#f1f3f7] p-3 rounded-sm border border-transparent focus:border-[#cbd3e1] focus:bg-white outline-none resize-none transition-all h-24"
             />
              <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-[#647491]" htmlFor={`dependencies-${uc.id}`}>Dependencies</label>
              <textarea
                id={`dependencies-${uc.id}`}
                value={uc.dependencies}
                onChange={e => updateUseCase(uc.id, { dependencies: e.target.value })}
                data-testid={`textarea-dependencies-${uc.id}`}
                placeholder="Name prerequisite data, access, policy, platform or owner decisions."
                className="mt-2 h-20 w-full resize-none rounded-sm border border-transparent bg-[#f1f3f7] p-3 text-[13px] leading-relaxed text-[#405777] outline-none transition-all focus:border-[#cbd3e1] focus:bg-white"
              />
           </div>
        </div>

        {/* Right Col: Scoring Grid */}
        <div className="flex-[1.2]">
           <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
             {DIMENSIONS.map(dim => (
               <div key={dim.id}>
                 <div className="flex justify-between items-end mb-1">
                   <label className="text-xs font-bold text-[#102957]">{dim.label}</label>
                    <span className="text-[10px] text-[#647491]" title={dim.desc} aria-label={dim.desc}><Info size={12} /></span>
                 </div>
                  <p className="mb-2 text-[10px] leading-relaxed text-[#647491]">{dim.desc}</p>
                 <ScorePills 
                   value={uc.scores[dim.id]} 
                   onChange={v => updateUseCase(uc.id, { scores: { ...uc.scores, [dim.id]: v } })} 
                   dimensionId={dim.id}
                   useCaseId={uc.id}
                 />
                 <div className="flex justify-between text-[9px] text-[#647491] mt-1.5 uppercase tracking-wider font-bold">
                   <span>{dim.low}</span>
                   <span>{dim.high}</span>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
      
      {/* Footer: Recommendation */}
       <div className={`px-6 py-4 md:px-8 border-t border-[#cbd3e1] flex items-center justify-between gap-4 ${rec.bg}`} data-testid={`status-recommendation-${uc.id}`}>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold uppercase tracking-wider ${rec.color}`}>Recommendation: {rec.stage}</span>
          <span className="text-[13px] text-[#405777] max-w-2xl hidden md:block">{rec.reason}</span>
        </div>
        {rec.link && (
           <Link href={rec.link} data-testid={`link-idao-stage-${uc.id}`} className={`shrink-0 text-xs font-bold flex items-center gap-1 ${rec.color} hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]`}>
            See IDAO stage <ArrowRight size={14} />
          </Link>
        )}
      </div>
      <div className="px-6 py-3 bg-white md:hidden border-t border-[#cbd3e1]">
         <span className="text-[13px] text-[#405777]">{rec.reason}</span>
      </div>
       <div className="border-t border-[#cbd3e1] bg-white px-6 py-3 md:px-8" data-testid={`text-score-explanation-${uc.id}`}>
         <span className="text-[10px] font-bold uppercase tracking-wider text-[#647491]">Calculation</span>
         <p className="mt-1 text-[11px] leading-relaxed text-[#536887]">{getScoreExplanation(uc)} = {rec.score}/30. The stage rule above uses the individual criteria, not the total alone.</p>
       </div>
    </motion.div>
  );
}

function AnalysisGroup({ title, description, items }: { title: string; description: string; items: { uc: UseCase; rec: ReturnType<typeof getRecommendation> }[] }) {
  if (items.length === 0) return null;
  const reducedMotion = useReducedMotion();
  
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: reducedMotion ? 0 : 0.4 }}
    >
      <h3 className="font-display text-2xl font-semibold text-[#102957] mb-3">{title}</h3>
      <p className="text-[13px] leading-relaxed text-[#536887] mb-6 max-w-2xl">{description}</p>
      <div className="grid gap-4">
        {items.map(({ uc, rec }, itemIndex) => {
          const tags = getTags(uc);
          return (
            <div key={uc.id} className="bg-white border border-[#cbd3e1] p-5 md:p-6 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm" data-testid={`card-analysis-${uc.id}`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#647491]">Sequence {String(itemIndex + 1).padStart(2, "0")}</span>
                <h4 className="font-bold text-[#102957] text-lg">{uc.name || "Unnamed Opportunity"}</h4>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm ${rec.bg} ${rec.color}`}>{rec.stage}</span>
                  {tags.map(tag => (
                    <span key={tag} className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm bg-[#102957] text-white">{tag}</span>
                  ))}
                </div>
                {uc.dependencies && <p className="mt-3 max-w-2xl text-[12px] leading-relaxed text-[#536887]"><strong className="text-[#102957]">Resolve before entry:</strong> {uc.dependencies}</p>}
                {uc.caveats && <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#536887]"><strong className="text-[#102957]">Caveat:</strong> {uc.caveats}</p>}
              </div>
              <div className="sm:text-right shrink-0 border-t sm:border-t-0 border-[#cbd3e1] pt-3 sm:pt-0">
                <span className="block text-2xl font-display font-bold text-[#102957]">{rec.score} <span className="text-sm font-sans text-[#647491]">/ 30</span></span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#647491]">Total Score</span>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

export default function AIUseCasePrioritization() {
  const [useCases, setUseCases] = useState<UseCase[]>([
    {
      id: "uc-1",
      name: "Customer Onboarding Document Extraction",
      description: "",
      scores: { value: 4, feasibility: 4, timeToEvidence: 4, adoptionFriction: 3, controlBurden: 2, reusePotential: 4 },
      caveats: "High data privacy requirements; PII handling must be strictly governed and approved.",
      dependencies: "Approved data access, retention rules and a named information owner."
    },
    {
      id: "uc-2",
      name: "Legacy System Chat Interface",
      description: "",
      scores: { value: 2, feasibility: 2, timeToEvidence: 2, adoptionFriction: 1, controlBurden: 2, reusePotential: 1 },
      caveats: "API access to the legacy core banking system is undocumented and notoriously unstable.",
      dependencies: "A stable read-only integration contract and accountable system owner."
    }
  ]);

  const addUseCase = () => {
    const newId = `uc-${Date.now()}`;
    setUseCases([...useCases, {
      id: newId,
      name: "",
      description: "",
      scores: { value: 3, feasibility: 3, timeToEvidence: 3, adoptionFriction: 3, controlBurden: 3, reusePotential: 3 },
      caveats: "",
      dependencies: ""
    }]);
  };

  const updateUseCase = (id: string, data: Partial<UseCase>) => {
    setUseCases(useCases.map(uc => uc.id === id ? { ...uc, ...data } : uc));
  };

  const removeUseCase = (id: string) => {
    setUseCases(useCases.filter(uc => uc.id !== id));
  };

  const analysis = useMemo(() => {
    const recommendations = useCases.map(uc => ({ uc, rec: getRecommendation(uc) }));
    const active = recommendations.filter(r => r.rec.stage !== "Stop");
    
    // Sort active by score descending
    active.sort((a, b) => b.rec.score - a.rec.score);
    
    const stops = recommendations.filter(r => r.rec.stage === "Stop");
    
    return { active, stops };
  }, [useCases]);

  return (
    <main className="bg-[#fdfcfb] text-[#102957] min-h-screen selection:bg-[hsl(var(--brand-pink))] selection:text-white">
      <header className="px-6 pt-12 pb-16 md:px-[4.8vw] lg:pb-20 border-b border-[#cbd3e1]">
         <Kicker>Methodologies / 03</Kicker>
         <h1 className="mt-6 font-display text-[clamp(40px,6vw,80px)] font-semibold leading-[0.95] tracking-[-0.08em] max-w-4xl">
            AI Use-Case Portfolio Prioritization.
         </h1>
         <div className="mt-8 border-t border-[#102957] pt-6 grid gap-6 md:grid-cols-2 max-w-4xl">
           <p className="text-[17px] leading-[1.6] text-[#405777]">
             A serious working instrument for transformation leaders to transparently evaluate AI opportunities against value, feasibility, and risk—before committing funding.
           </p>
           <p className="text-[15px] leading-[1.65] text-[#536887]">
             This framework aligns decisions to your specific operational context, intentionally avoiding generic statistical benchmarks. The output connects directly to the IDAO delivery methodology.
           </p>
         </div>
      </header>

      <section className="px-6 py-16 md:px-[4.8vw] bg-[#f1f3f7]">
         <div className="mb-10 max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-[-0.05em]">The Portfolio</h2>
             <p className="mt-3 text-[15px] leading-relaxed text-[#536887]">Score opportunities across six dimensions to reveal the responsible path to production. Each criterion uses your evidence and judgement on a 1–5 planning scale. The sum helps sequence comparable opportunities; specific thresholds determine the entry stage or stop decision.</p>
             <p className="mt-3 border-l-2 border-[hsl(var(--brand-coral))] pl-4 text-[12px] leading-relaxed text-[#647491]">These are not market benchmarks, probabilities or a certification. Compare opportunities scored by the same decision group, record uncertainty as a caveat, and revisit scores when evidence changes.</p>
         </div>

          <div className="mb-10 grid border-y border-[#cbd3e1] bg-white md:grid-cols-4" data-testid="text-decision-rules">
            {[
              ["Stop", "Value at 1–2, or control burden and feasibility both at 1–2."],
              ["Innovate", "Feasibility or time to evidence at 1–2; isolate the uncertainty first."],
              ["Demonstrate", "Adoption friction at 1–2, control burden at 1–3, or a mixed evidence profile."],
              ["Activate", "Feasibility and adoption readiness both at 4–5, with no prior stop condition."],
            ].map(([stage, rule]) => (
              <div key={stage} className="border-b border-[#cbd3e1] p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                <strong className="text-[11px] uppercase tracking-wider text-[#102957]">{stage}</strong>
                <p className="mt-2 text-[11px] leading-relaxed text-[#536887]">{rule}</p>
              </div>
            ))}
          </div>

         <div className="space-y-6">
            {useCases.map((uc, index) => (
               <UseCaseCard key={uc.id} uc={uc} index={index} updateUseCase={updateUseCase} removeUseCase={removeUseCase} />
            ))}
         </div>
         
         <button 
           onClick={addUseCase} 
           data-testid="button-add-use-case"
           className="mt-8 flex items-center gap-2 text-sm font-bold text-[hsl(var(--brand-pink))] hover:text-[hsl(var(--brand-violet))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]"
         >
           <Plus size={16} /> Add another opportunity
         </button>
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] border-t border-[#cbd3e1] bg-white">
         <div className="max-w-3xl">
           <h2 className="font-display text-[clamp(32px,5vw,56px)] font-semibold tracking-[-0.06em] leading-[0.95]">Portfolio Analysis</h2>
           <p className="mt-4 text-[17px] leading-relaxed text-[#536887]">
              Transparent sequencing and dependency recommendations based on the scored dimensions.
           </p>
         </div>
         
         <div className="mt-14 grid lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_380px] gap-12 lg:gap-16">
            <div className="space-y-16">
              <AnalysisGroup 
                title="Ready for Production (Activate)" 
                description="High feasibility and low adoption friction. These opportunities are ready for immediate technical integration and scaling without requiring bounded discovery."
                items={analysis.active.filter(r => r.rec.stage === "Activate")} 
              />
              <AnalysisGroup 
                title="Requires Evidence (Demonstrate & Innovate)" 
                description="High strategic value but constrained by feasibility, adoption friction, or lack of evidence. Sequence these into bounded proving grounds to earn the right to scale."
                items={analysis.active.filter(r => r.rec.stage === "Demonstrate" || r.rec.stage === "Innovate")} 
              />
              <AnalysisGroup 
                title="Do Not Fund (Stop)" 
                description="Low value or an unacceptable delivery risk profile. Stop these initiatives before investing resources."
                items={analysis.stops} 
              />
              
              {useCases.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-[#cbd3e1] rounded-sm">
                  <p className="text-[#647491] text-sm">Add opportunities to view the portfolio analysis.</p>
                </div>
              )}
            </div>
            
            <div className="space-y-6">
               <div className="bg-[#102957] p-8 text-white rounded-sm lg:sticky lg:top-[120px]">
                 <h3 className="font-display text-2xl font-semibold mb-4 tracking-[-0.04em]">Next Steps</h3>
                 <p className="text-[14px] text-[#d6deed] mb-8 leading-relaxed">
                   Bring your prioritized portfolio to a Value Scan. We will test the highest-scoring opportunity and map the exact route to production with your team.
                 </p>
                  <BrandButton href="/value-scan" variant="inverse" className="w-full justify-center" data-testid="link-value-scan">Book a Value Scan</BrandButton>
                 
                 <hr className="border-[#1e3a70] my-8" />
                 
                 <h3 className="font-display text-xl font-semibold mb-4 tracking-[-0.04em]">The IDAO Canon</h3>
                 <p className="text-[13px] text-[#d6deed] mb-6 leading-relaxed">
                   See how approved opportunities move through Innovate, Demonstrate, Activate, and Operate with governed controls.
                 </p>
                  <Link href="/methodologies/idao" data-testid="link-idao-methodology" className="text-[13px] font-bold text-[hsl(var(--brand-pink))] hover:text-white transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]">
                   Explore the methodology <ArrowRight size={14} />
                 </Link>
               </div>
            </div>
         </div>
      </section>
    </main>
  );
}
