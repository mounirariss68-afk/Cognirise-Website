import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, ArrowRight, Download, Info, Printer, RotateCcw, Trash2 } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { MethodologyRelationship } from "@/components/MethodologyRelationship";
import { MethodPageHero } from "@/components/MethodPageHero";
import { useMethodSessionState, useUnsavedWorkWarning } from "@/lib/use-method-session-state";
import { downloadPrioritizationResultsPdf } from "@/lib/pulse-assessment-reports";

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

const DEFAULT_USE_CASES: UseCase[] = [
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
];

export const isUseCaseSessionState = (value: unknown): value is UseCase[] =>
  Array.isArray(value) && value.every((useCase) => {
    if (!useCase || typeof useCase !== "object" || Array.isArray(useCase)) return false;
    const candidate = useCase as Record<string, unknown>;
    if (
      typeof candidate.id !== "string"
      || typeof candidate.name !== "string"
      || typeof candidate.description !== "string"
      || typeof candidate.caveats !== "string"
      || typeof candidate.dependencies !== "string"
      || !candidate.scores
      || typeof candidate.scores !== "object"
      || Array.isArray(candidate.scores)
    ) return false;
    const scores = candidate.scores as Record<string, unknown>;
    return DIMENSIONS.every(({ id }) =>
      Number.isInteger(scores[id]) && (scores[id] as number) >= 1 && (scores[id] as number) <= 5
    );
  });

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
      className="bg-white border border-[#cbd3e1] rounded-sm shadow-[0_2px_10px_rgba(16,41,87,0.03)] overflow-hidden transition-shadow hover:shadow-[0_8px_30px_rgba(16,41,87,0.06)]"
    >
      <div className="p-6 md:p-8 lg:p-10 flex flex-col lg:flex-row gap-10">
        
        {/* Left Col: Info */}
        <div className="flex-[0.9] flex flex-col border-b lg:border-b-0 lg:border-r border-[#cbd3e1] pb-8 lg:pb-0 lg:pr-10">
           <div className="flex justify-between items-start mb-6">
             <span className="text-[10px] font-bold text-[hsl(var(--brand-pink))] uppercase tracking-[0.15em] block">Opportunity 0{index + 1}</span>
             <button onClick={() => removeUseCase(uc.id)} data-testid={`button-remove-use-case-${uc.id}`} className="text-[#a0afc0] hover:text-[hsl(var(--brand-coral))] transition-colors" aria-label="Remove opportunity"><Trash2 size={16} /></button>
           </div>
           
           <input 
             value={uc.name} 
             onChange={e => updateUseCase(uc.id, { name: e.target.value })} 
             data-testid={`input-use-case-name-${uc.id}`}
             placeholder="Opportunity Name"
             className="font-display text-[28px] font-semibold text-[#102957] bg-transparent outline-none border-b border-transparent hover:border-[#cbd3e1] focus:border-[hsl(var(--brand-pink))] transition-colors w-full pb-2 tracking-[-0.03em]"
           />

            <label className="mt-8 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#647491]" htmlFor={`description-${uc.id}`}>Outcome sought</label>
            <textarea
              id={`description-${uc.id}`}
              value={uc.description}
              onChange={e => updateUseCase(uc.id, { description: e.target.value })}
              data-testid={`textarea-description-${uc.id}`}
              placeholder="What business or service outcome would improve?"
              className="mt-3 h-24 w-full resize-none rounded-sm border border-[#cbd3e1] bg-[#fdfcfb] p-4 text-[14px] leading-relaxed text-[#405777] outline-none focus:border-[hsl(var(--brand-pink))] focus:bg-white transition-all shadow-inner"
            />
           
           <div className="mt-8 lg:mt-auto pt-6 border-t border-[#cbd3e1] border-dashed">
             <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#647491] mb-3">Caveats & Constraints</label>
             <textarea 
               value={uc.caveats} 
               onChange={e => updateUseCase(uc.id, { caveats: e.target.value })}
               data-testid={`textarea-caveats-${uc.id}`}
               placeholder="Record specific risks, data privacy concerns, or dependencies..."
               className="w-full text-[13px] leading-relaxed text-[#536887] bg-[#f3f5f8] p-4 rounded-sm border border-transparent focus:border-[#cbd3e1] focus:bg-white outline-none resize-none transition-all h-24"
             />
              <label className="mt-6 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#647491]" htmlFor={`dependencies-${uc.id}`}>Dependencies</label>
              <textarea
                id={`dependencies-${uc.id}`}
                value={uc.dependencies}
                onChange={e => updateUseCase(uc.id, { dependencies: e.target.value })}
                data-testid={`textarea-dependencies-${uc.id}`}
                placeholder="Name prerequisite data, access, policy, platform or owner decisions."
                className="mt-3 h-24 w-full resize-none rounded-sm border border-transparent bg-[#f3f5f8] p-4 text-[13px] leading-relaxed text-[#536887] outline-none transition-all focus:border-[#cbd3e1] focus:bg-white"
              />
           </div>
        </div>

        {/* Right Col: Scoring Grid */}
        <div className="flex-[1.1]">
           <div className="flex items-center justify-between mb-8">
             <h3 className="font-display text-xl font-semibold tracking-[-0.03em] text-[#102957]">Evaluation Criteria</h3>
             <span className="text-[12px] font-medium text-[#647491] bg-[#f3f5f8] px-3 py-1 rounded-sm border border-[#cbd3e1]">1–5 Scale</span>
           </div>
           
           <div className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
             {DIMENSIONS.map(dim => (
               <div key={dim.id}>
                 <div className="flex justify-between items-end mb-1">
                   <label className="text-[13px] font-bold text-[#102957]">{dim.label}</label>
                    <span className="text-[10px] text-[#a0afc0]" title={dim.desc} aria-label={dim.desc}><Info size={14} /></span>
                 </div>
                  <p className="mb-3 text-[11px] leading-relaxed text-[#647491]">{dim.desc}</p>
                 <ScorePills 
                   value={uc.scores[dim.id]} 
                   onChange={v => updateUseCase(uc.id, { scores: { ...uc.scores, [dim.id]: v } })} 
                   dimensionId={dim.id}
                   useCaseId={uc.id}
                 />
                 <div className="flex justify-between text-[9px] text-[#a0afc0] mt-2 uppercase tracking-widest font-bold">
                   <span>{dim.low}</span>
                   <span>{dim.high}</span>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
      
      {/* Footer: Recommendation */}
       <div className={`px-6 py-5 md:px-10 border-t border-[#cbd3e1] flex items-center justify-between gap-6 ${rec.bg}`} data-testid={`status-recommendation-${uc.id}`}>
        <div className="flex items-center gap-4">
          <span className={`text-[11px] font-bold uppercase tracking-[0.15em] border border-current px-3 py-1 bg-white/50 ${rec.color}`}>{rec.stage}</span>
          <span className="text-[14px] font-medium text-[#102957] max-w-2xl hidden md:block">{rec.reason}</span>
        </div>
        {rec.link && (
           <Link href={rec.link} data-testid={`link-idao-stage-${uc.id}`} className={`shrink-0 text-[13px] font-bold flex items-center gap-2 ${rec.color} hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]`}>
            View stage <ArrowRight size={16} />
          </Link>
        )}
      </div>
      <div className="px-6 py-4 bg-white md:hidden border-t border-[#cbd3e1]">
         <span className="text-[14px] font-medium text-[#102957]">{rec.reason}</span>
      </div>
       <div className="border-t border-[#cbd3e1] bg-[#fdfcfb] px-6 py-4 md:px-10 flex flex-col sm:flex-row sm:items-center gap-6" data-testid={`text-score-explanation-${uc.id}`}>
         <div className="flex-[0.4]">
           <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#647491] block mb-1">Score ({rec.score}/30)</span>
           <p className="text-[11px] leading-relaxed text-[#536887]">{getScoreExplanation(uc)}</p>
         </div>
         <div className="flex-[0.6] sm:border-l sm:border-[#cbd3e1] sm:pl-6">
           <p className="text-[11px] leading-relaxed text-[#405777]">
             <strong>Note on Control Burden:</strong> Reflects exposure and required oversight. It can change priority, scope, or IDAO entry point. <Link href="/methodologies/agent-authority-model" className="underline font-bold text-[hsl(var(--brand-pink))] hover:text-[#102957]">Use Agent Authority</Link> separately when a consequential handover exists.
           </p>
         </div>
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
      <h3 className="font-display text-2xl font-semibold text-[#102957] mb-3 tracking-[-0.03em]">{title}</h3>
      <p className="text-[14px] leading-relaxed text-[#536887] mb-6 max-w-2xl">{description}</p>
      <div className="grid gap-4">
        {items.map(({ uc, rec }, itemIndex) => {
          const tags = getTags(uc);
          return (
            <div key={uc.id} className="bg-white border border-[#cbd3e1] p-5 md:p-6 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm hover:border-[#a0afc0] transition-colors" data-testid={`card-analysis-${uc.id}`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#647491]">Sequence {String(itemIndex + 1).padStart(2, "0")}</span>
                <h4 className="font-display text-[22px] font-semibold text-[#102957] mt-1 mb-3">{uc.name || "Unnamed Opportunity"}</h4>
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-1 border border-current ${rec.bg} ${rec.color}`}>{rec.stage}</span>
                  {tags.map(tag => (
                    <span key={tag} className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-1 bg-[#102957] text-white">{tag}</span>
                  ))}
                </div>
                {uc.dependencies && <p className="mt-4 text-[13px] leading-relaxed text-[#536887] bg-[#f3f5f8] p-3 border-l-2 border-[#cbd3e1]"><strong className="text-[#102957]">Resolve before entry:</strong> {uc.dependencies}</p>}
                {uc.caveats && <p className="mt-2 text-[13px] leading-relaxed text-[#536887] bg-[#f3f5f8] p-3 border-l-2 border-[#cbd3e1]"><strong className="text-[#102957]">Caveat:</strong> {uc.caveats}</p>}
              </div>
              <div className="sm:text-right shrink-0 border-t sm:border-t-0 border-[#cbd3e1] pt-4 sm:pt-0">
                <span className="block text-[32px] font-display font-bold text-[#102957] leading-none mb-1">{rec.score} <span className="text-[16px] font-sans text-[#a0afc0] font-normal">/ 30</span></span>
                <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#647491]">Total Score</span>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

export default function AIUseCasePrioritization() {
  const [useCases, setUseCases] = useMethodSessionState<UseCase[]>(
    "cognirise:method:ai-use-case-prioritization:opportunities",
    DEFAULT_USE_CASES,
    { validate: isUseCaseSessionState },
  );
  const [downloadError, setDownloadError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const downloadLock = useRef(false);
  const cleanBaseline = useRef(JSON.stringify(DEFAULT_USE_CASES));
  const completeUseCases = useCases.length > 0 && useCases.every((useCase) => useCase.name.trim() && useCase.description.trim());
  const answeredUseCases = useCases.filter((useCase) => useCase.name.trim() && useCase.description.trim()).length;
  useUnsavedWorkWarning(JSON.stringify(useCases) !== cleanBaseline.current);

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

  const resetAssessment = () => {
    setUseCases(DEFAULT_USE_CASES.map((useCase) => ({ ...useCase, scores: { ...useCase.scores } })));
    setDownloadError("");
  };

  const downloadResults = async () => {
    if (!completeUseCases || isDownloading || downloadLock.current) return;
    downloadLock.current = true;
    setIsDownloading(true);
    setDownloadError("");
    try {
      await downloadPrioritizationResultsPdf(useCases);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Your results PDF could not be created. Please try again.");
    } finally {
      downloadLock.current = false;
      setIsDownloading(false);
    }
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
      <MethodPageHero
        breadcrumb="Methodologies / 03"
        title="AI Use-Case Portfolio Prioritization."
        description="A serious working instrument for transformation leaders to transparently evaluate AI opportunities against value, feasibility, and risk—before committing funding."
        supportingText={
          <p>
            This framework aligns decisions to your specific operational context, intentionally avoiding generic statistical benchmarks. The output connects directly to the IDAO delivery methodology.
          </p>
        }
        imageSrc="/images/cognirise/method-ucp-governed-ai-v3.jpg"
        imageAlt="Architectural gateways and transparent panels crossed by a flowing stream of violet, pink, and coral light."
        imageCaptionSubtitle="Portfolio Strategy"
        imageCaptionTitle="Directing energy where it earns value."
      />

      <MethodologyRelationship
        startHereWhen={<>You have multiple opportunities or a defined use case, and need to decide which should advance, how they sequence, and where they enter delivery.</>}
        decision={<>Which opportunities should advance, sequence or stop?</>}
        output={<>A transparent comparative scorecard and a clear recommendation to enter Innovate, Demonstrate, Activate, or to Stop.</>}
        connectsToIdao={<>Recommends whether an opportunity should stop, be investigated in <strong>Innovate</strong>, proved through <strong>Demonstrate</strong>, or moved into <strong>Activate</strong>.</>}
        connectsToAuthority={<>Examines exposure and required oversight (Control Burden dimension) to inform sequence and IDAO entry. Agent Authority will later govern the specific handovers inside the delivered workflow.</>}
        reassessWhen={<>Business value changes, new platform capabilities alter feasibility, or a previously stopped opportunity resolves its blocking dependency.</>}
        doesNotDecide={<>The systemic readiness of the organization (use AI Value-to-Scale) or the operational conditions of a detailed workflow (use Agentic Operations Readiness).</>}
      />

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-28 bg-[#f3f5f8] border-y border-[#cbd3e1]">
         <div className="max-w-[1200px] mx-auto">
           <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#102957] mb-5">
             <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
             The Portfolio
           </div>
           <div className="grid lg:grid-cols-[1fr_0.8fr] gap-12 lg:gap-20 mb-16">
             <div>
               <h2 className="font-display text-[clamp(36px,5vw,60px)] font-semibold tracking-[-.05em] leading-[0.95]">Score opportunities across six dimensions.</h2>
               <p className="mt-6 text-[17px] leading-relaxed text-[#405777]">
                 Reveal the responsible path to production. Each criterion uses your evidence and judgement on a 1–5 planning scale. The sum helps sequence comparable opportunities; specific thresholds determine the entry stage or stop decision.
               </p>
             </div>
             <div className="bg-white p-6 border-l-4 border-[hsl(var(--brand-coral))] shadow-sm h-fit">
               <p className="text-[14px] leading-relaxed text-[#536887]">
                 These are not market benchmarks, probabilities or a certification. Compare opportunities scored by the same decision group, record uncertainty as a caveat, and revisit scores when evidence changes.
               </p>
             </div>
           </div>

           <div className="mb-16 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 bg-[#102957] text-white overflow-hidden shadow-lg relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
             {[
               ["Stop", "Value at 1–2, or control burden and feasibility both at 1–2.", "text-[#a0afc0]", "bg-[#0b1c3d]"],
               ["Innovate", "Feasibility or time to evidence at 1–2; isolate the uncertainty first.", "text-[hsl(var(--brand-violet))]", "bg-[#0c2045]"],
               ["Demonstrate", "Adoption friction at 1–2, control burden at 1–3, or a mixed evidence profile.", "text-[hsl(var(--brand-pink))]", "bg-[#0d234a]"],
               ["Activate", "Feasibility and adoption readiness both at 4–5, with no prior stop condition.", "text-[hsl(var(--brand-coral))]", "bg-[#0e2752]"],
             ].map(([stage, rule, color, bgClass], idx) => (
               <div key={stage} className={`p-8 ${bgClass} ${idx < 3 ? 'border-b md:border-b-0 xl:border-r border-white/10' : ''} ${idx === 1 && 'md:border-b-0 xl:border-r border-white/10'} ${idx === 0 && 'md:border-r border-white/10'}`}>
                 <strong className={`text-[12px] uppercase tracking-[0.15em] ${color}`}>{stage}</strong>
                 <p className="mt-4 text-[14px] leading-relaxed text-[#d6deed]">{rule}</p>
               </div>
             ))}
           </div>

           <div className="space-y-12">
              {useCases.map((uc, index) => (
                 <UseCaseCard key={uc.id} uc={uc} index={index} updateUseCase={updateUseCase} removeUseCase={removeUseCase} />
              ))}
           </div>
           
           <button 
             onClick={addUseCase} 
             data-testid="button-add-use-case"
             className="mt-12 mx-auto flex items-center justify-center gap-3 text-[14px] font-bold text-[#102957] bg-white border border-[#cbd3e1] py-4 px-8 shadow-sm hover:border-[hsl(var(--brand-pink))] hover:text-[hsl(var(--brand-pink))] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]"
           >
             <Plus size={18} /> Add another opportunity
           </button>
            <div className="mt-8 border border-[#cbd3e1] bg-white p-5" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#647491]">Assessment progress</p>
                  <p className="mt-2 text-sm font-semibold text-[#102957]">{answeredUseCases} of {useCases.length} opportunities have a name and outcome.</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#647491]">Answers remain in this page only. Reloading or leaving clears unsaved work.</p>
                </div>
                <button type="button" onClick={resetAssessment} className="inline-flex items-center gap-2 text-xs font-bold text-[#102957] underline underline-offset-4"><RotateCcw size={14} /> Reset assessment</button>
              </div>
            </div>
         </div>
      </section>

      <section className="px-6 py-20 md:px-[4.8vw] lg:py-32 bg-white relative overflow-hidden">
         <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-[radial-gradient(circle_at_top_right,rgba(255,119,93,0.05),transparent_70%)] pointer-events-none" />
         
         <div className="max-w-[1200px] mx-auto relative z-10">
           <div className="max-w-3xl">
             <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#102957] mb-5">
               <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
               Analysis
             </div>
             <h2 className="font-display text-[clamp(42px,6vw,80px)] font-semibold tracking-[-.05em] leading-[0.95]">Portfolio Outcome</h2>
             <p className="mt-6 text-[19px] leading-relaxed text-[#405777]">
                Transparent sequencing and dependency recommendations based on the scored dimensions.
             </p>
           </div>
           
           <div className="mt-16 grid lg:grid-cols-[1fr_360px] gap-12 lg:gap-20">
              <div className="space-y-20">
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
                  <div className="text-center py-20 border border-dashed border-[#cbd3e1] bg-[#f3f5f8] rounded-sm">
                    <p className="text-[#536887] text-[15px]">Add opportunities to view the portfolio analysis.</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                 <div className="bg-[#102957] p-8 lg:p-10 text-white shadow-xl lg:sticky lg:top-[120px] relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
                   <h3 className="font-display text-[26px] font-semibold mb-4 tracking-[-0.04em]">Next Steps</h3>
                   <p className="text-[14px] text-[#d6deed] mb-8 leading-relaxed">
                     Bring your prioritized portfolio to a Value Scan. We will test the highest-scoring opportunity and map the exact route to production with your team.
                   </p>
                    <BrandButton href="/value-scan" variant="inverse" className="w-full justify-center" data-testid="link-value-scan">Book a Value Scan</BrandButton>
                   
                   <hr className="border-white/10 my-10" />
                   
                   <h3 className="font-display text-xl font-semibold mb-4 tracking-[-0.03em]">The IDAO Canon</h3>
                   <p className="text-[13px] text-[#d6deed] mb-6 leading-relaxed">
                     See how approved opportunities move through Innovate, Demonstrate, Activate, and Operate with governed controls.
                   </p>
                    <Link href="/methodologies/idao" data-testid="link-idao-methodology" className="text-[13px] font-bold text-[hsl(var(--brand-pink))] hover:text-white transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] w-fit">
                     Explore the methodology <ArrowRight size={16} />
                   </Link>
                    <div className="mt-8 border-t border-white/10 pt-6">
                      <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={downloadResults} disabled={!completeUseCases || isDownloading} className="inline-flex items-center gap-2 bg-white px-4 py-2.5 text-xs font-bold text-[#102957] disabled:cursor-not-allowed disabled:opacity-45">
                          <Download size={14} /> {isDownloading ? "Creating report…" : "Download results (PDF)"}
                        </button>
                        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 px-2 py-2.5 text-xs font-bold text-white underline underline-offset-4"><Printer size={14} /> Print</button>
                      </div>
                      {!completeUseCases && <p className="mt-3 text-xs leading-relaxed text-[#b9c7db]">Add a name and outcome to every opportunity before exporting a complete result.</p>}
                      {downloadError && <p role="alert" className="mt-3 border-l-2 border-[#ff9fcf] pl-3 text-xs leading-relaxed text-white">{downloadError}</p>}
                      <p className="mt-3 text-xs leading-relaxed text-[#b9c7db]">The designed Pulse PDF is generated locally. Opportunity notes are never sent to Cognirise.</p>
                    </div>
                 </div>
              </div>
           </div>
         </div>
      </section>
    </main>
  );
}
