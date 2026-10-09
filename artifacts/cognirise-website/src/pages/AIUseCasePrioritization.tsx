import { useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, ArrowRight, Download, Info, Printer, RotateCcw, Trash2 } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { MethodologyRelationship } from "@/components/MethodologyRelationship";
import { MethodPageHero } from "@/components/MethodPageHero";
import { useMethodSessionState, useUnsavedWorkWarning } from "@/lib/use-method-session-state";
import { downloadPrioritizationResultsPdf } from "@/lib/pulse-assessment-reports";
import { MethodologyCmsDelivery, methodologyEditorial, methodologyHero, useMethodologyCmsContent, useMethodologyCmsSeo } from "@/components/MethodologyCmsLayout";
import { aiUseCasePrioritizationEditorial } from "@workspace/api-zod";
import { UCP_EDITORIAL, UCP_HERO } from "@/site/content/methods/ai-use-case-prioritization";
import { methodSeo } from "@/site/content/methods/seo";

export type UseCase = {
  id: string;
  name: string;
  description: string;
  scores: Record<string, number>;
  caveats: string;
  dependencies: string;
};

export const DIMENSIONS = [
  { id: "value", label: "Value and impact", low: "Small", high: "Large", desc: "The business and financial return." },
  { id: "feasibility", label: "Feasibility", low: "Unproven", high: "Production-ready", desc: "How ready the data and the technology are." },
  { id: "timeToEvidence", label: "Time to evidence", low: "Quarters", high: "Days", desc: "How fast value can be proved." },
  { id: "adoptionFriction", label: "Adoption friction", low: "High disruption", high: "Fits the workflow", desc: "How much the workflow has to change." },
  { id: "controlBurden", label: "Control cost", low: "Heavy controls", high: "Standard controls", desc: "The risk and compliance work it needs." },
  { id: "reusePotential", label: "Reuse", low: "One-off", high: "Reusable", desc: "How much of it other work can reuse." },
] as const;

function defaultUseCases(
  sampleOpportunities: typeof aiUseCasePrioritizationEditorial.seed.sampleOpportunities,
): UseCase[] {
  return [
    {
      id: "uc-1",
      name: sampleOpportunities[0].name,
      description: "",
      scores: { value: 4, feasibility: 4, timeToEvidence: 4, adoptionFriction: 3, controlBurden: 2, reusePotential: 4 },
      caveats: sampleOpportunities[0].caveats,
      dependencies: sampleOpportunities[0].dependencies,
    },
    {
      id: "uc-2",
      name: sampleOpportunities[1].name,
      description: "",
      scores: { value: 2, feasibility: 2, timeToEvidence: 2, adoptionFriction: 1, controlBurden: 2, reusePotential: 1 },
      caveats: sampleOpportunities[1].caveats,
      dependencies: sampleOpportunities[1].dependencies,
    },
  ];
}

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
    return { stage: "Stop", color: "text-[#647491]", bg: "bg-[#f1f3f7]", reason: "The value is too low to justify the investment.", link: null, score };
  }
  if (controlBurden <= 2 && feasibility <= 2) {
    return { stage: "Stop", color: "text-[#647491]", bg: "bg-[#f1f3f7]", reason: "Heavy controls combined with low feasibility make the delivery risk too high.", link: null, score };
  }
  if (feasibility <= 2) {
    return { stage: "Innovate", color: "text-[hsl(var(--brand-violet))]", bg: "bg-[hsl(var(--brand-violet))]/10", reason: "Feasibility is unproven, so a short technical discovery comes before any commitment to build.", link: "/methodologies/idao#innovate", score };
  }
  if (timeToEvidence <= 2) {
    return { stage: "Innovate", color: "text-[hsl(var(--brand-violet))]", bg: "bg-[hsl(var(--brand-violet))]/10", reason: "Evidence would take too long, so an Innovate cycle finds the fastest path to proof first.", link: "/methodologies/idao#innovate", score };
  }
  if (adoptionFriction <= 2 || controlBurden <= 3) {
    return { stage: "Demonstrate", color: "text-[hsl(var(--brand-pink))]", bg: "bg-[hsl(var(--brand-pink))]/10", reason: "Adoption or control constraints mean the system should be proved in a restricted setting first.", link: "/methodologies/idao#demonstrate", score };
  }
  if (feasibility >= 4 && adoptionFriction >= 4) {
    return { stage: "Activate", color: "text-[hsl(var(--brand-coral))]", bg: "bg-[hsl(var(--brand-coral))]/10", reason: "High feasibility and low adoption friction: the workflow is ready to be built for production.", link: "/methodologies/idao#activate", score };
  }
  
  return { stage: "Demonstrate", color: "text-[hsl(var(--brand-pink))]", bg: "bg-[hsl(var(--brand-pink))]/10", reason: "Feasibility and friction are balanced: set a solid operating baseline before the full build.", link: "/methodologies/idao#demonstrate", score };
}

function getTags(uc: UseCase) {
  const tags = [];
  if (uc.scores.reusePotential >= 4) tags.push("Foundational");
  if (uc.scores.timeToEvidence >= 4 && uc.scores.feasibility >= 4) tags.push("Quick win");
  if (uc.scores.value >= 4 && uc.scores.feasibility <= 3) tags.push("Strategic bet");
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

function UseCaseCard({ uc, index, updateUseCase, removeUseCase, editorial }: {
  uc: UseCase;
  index: number;
  updateUseCase: (id: string, data: Partial<UseCase>) => void;
  removeUseCase: (id: string) => void;
  editorial: typeof aiUseCasePrioritizationEditorial.seed.assessmentCard;
}) {
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
              <span className="text-[10px] font-bold text-[hsl(var(--brand-pink))] uppercase tracking-[0.15em] block">{editorial.opportunityPrefix}{index + 1}</span>
              <button onClick={() => removeUseCase(uc.id)} data-testid={`button-remove-use-case-${uc.id}`} className="text-[#a0afc0] hover:text-[hsl(var(--brand-coral))] transition-colors" aria-label={editorial.removeOpportunity}><Trash2 size={16} /></button>
           </div>
           
           <input 
             value={uc.name} 
             onChange={e => updateUseCase(uc.id, { name: e.target.value })} 
             data-testid={`input-use-case-name-${uc.id}`}
              placeholder={editorial.opportunityNamePlaceholder}
             className="font-display text-[28px] font-semibold text-[#102957] bg-transparent outline-none border-b border-transparent hover:border-[#cbd3e1] focus:border-[hsl(var(--brand-pink))] transition-colors w-full pb-2 tracking-[-0.03em]"
           />

             <label className="mt-8 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#647491]" htmlFor={`description-${uc.id}`}>{editorial.outcomeSought}</label>
            <textarea
              id={`description-${uc.id}`}
              value={uc.description}
              onChange={e => updateUseCase(uc.id, { description: e.target.value })}
              data-testid={`textarea-description-${uc.id}`}
               placeholder={editorial.outcomePlaceholder}
              className="mt-3 h-24 w-full resize-none rounded-sm border border-[#cbd3e1] bg-[#fdfcfb] p-4 text-[14px] leading-relaxed text-[#405777] outline-none focus:border-[hsl(var(--brand-pink))] focus:bg-white transition-all shadow-inner"
            />
           
           <div className="mt-8 lg:mt-auto pt-6 border-t border-[#cbd3e1] border-dashed">
              <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#647491] mb-3">{editorial.caveatsAndConstraints}</label>
             <textarea 
               value={uc.caveats} 
               onChange={e => updateUseCase(uc.id, { caveats: e.target.value })}
               data-testid={`textarea-caveats-${uc.id}`}
                placeholder={editorial.caveatsPlaceholder}
               className="w-full text-[13px] leading-relaxed text-[#536887] bg-[#f3f5f8] p-4 rounded-sm border border-transparent focus:border-[#cbd3e1] focus:bg-white outline-none resize-none transition-all h-24"
             />
               <label className="mt-6 block text-[10px] font-bold uppercase tracking-[0.15em] text-[#647491]" htmlFor={`dependencies-${uc.id}`}>{editorial.dependencies}</label>
              <textarea
                id={`dependencies-${uc.id}`}
                value={uc.dependencies}
                onChange={e => updateUseCase(uc.id, { dependencies: e.target.value })}
                data-testid={`textarea-dependencies-${uc.id}`}
                placeholder={editorial.dependenciesPlaceholder}
                className="mt-3 h-24 w-full resize-none rounded-sm border border-transparent bg-[#f3f5f8] p-4 text-[13px] leading-relaxed text-[#536887] outline-none transition-all focus:border-[#cbd3e1] focus:bg-white"
              />
           </div>
        </div>

        {/* Right Col: Scoring Grid */}
        <div className="flex-[1.1]">
           <div className="flex items-center justify-between mb-8">
              <h3 className="font-display text-xl font-semibold tracking-[-0.03em] text-[#102957]">{editorial.evaluationCriteria}</h3>
              <span className="text-[12px] font-medium text-[#647491] bg-[#f3f5f8] px-3 py-1 rounded-sm border border-[#cbd3e1]">{editorial.scale}</span>
           </div>
           
           <div className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
             {DIMENSIONS.map(dim => (
               <div key={dim.id}>
                 <div className="flex justify-between items-end mb-1">
                   <label className="text-[13px] font-bold text-[#102957]">{dim.label}</label>
                    <span className="text-[10px] text-[#a0afc0]" title={dim.desc} aria-label={dim.desc}><Info size={14} /></span>
                 </div>
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
          <span className="text-[14px] font-medium text-[#102957] max-w-2xl block">{rec.reason}</span>
        </div>
        {rec.link && (
           <Link href={rec.link} data-testid={`link-idao-stage-${uc.id}`} className={`shrink-0 text-[13px] font-bold flex items-center gap-2 ${rec.color} hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]`}>
             {editorial.viewStage} <ArrowRight size={16} />
          </Link>
        )}
      </div>
       <div className="border-t border-[#cbd3e1] bg-[#fdfcfb] px-6 py-4 md:px-10" data-testid={`text-score-explanation-${uc.id}`}>
         <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#647491] block mb-1">Score ({rec.score}/30)</span>
         <p className="text-[11px] leading-relaxed text-[#536887]">{getScoreExplanation(uc)}</p>
       </div>
    </motion.div>
  );
}

function AnalysisGroup({ title, description, items, editorial }: {
  title: string;
  description: string;
  items: { uc: UseCase; rec: ReturnType<typeof getRecommendation> }[];
  editorial: typeof aiUseCasePrioritizationEditorial.seed.analysis;
}) {
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
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#647491]">{editorial.sequencePrefix} {String(itemIndex + 1).padStart(2, "0")}</span>
                <h4 className="font-display text-[22px] font-semibold text-[#102957] mt-1 mb-3">{uc.name || editorial.unnamedOpportunity}</h4>
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-1 border border-current ${rec.bg} ${rec.color}`}>{rec.stage}</span>
                  {tags.map(tag => (
                    <span key={tag} className="text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-1 bg-[#102957] text-white">{tag}</span>
                  ))}
                </div>
                {uc.dependencies && <p className="mt-4 text-[13px] leading-relaxed text-[#536887] bg-[#f3f5f8] p-3 border-l-2 border-[#cbd3e1]"><strong className="text-[#102957]">{editorial.resolveBeforeEntry}</strong> {uc.dependencies}</p>}
                {uc.caveats && <p className="mt-2 text-[13px] leading-relaxed text-[#536887] bg-[#f3f5f8] p-3 border-l-2 border-[#cbd3e1]"><strong className="text-[#102957]">{editorial.caveat}</strong> {uc.caveats}</p>}
              </div>
              <div className="sm:text-right shrink-0 border-t sm:border-t-0 border-[#cbd3e1] pt-4 sm:pt-0">
                <span className="block text-[32px] font-display font-bold text-[#102957] leading-none mb-1">{rec.score} <span className="text-[16px] font-sans text-[#a0afc0] font-normal">/ 30</span></span>
                 <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-[#647491]">{editorial.totalScore}</span>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function AIUseCasePrioritizationContent() {
  const cms = useMethodologyCmsContent("ai-use-case-prioritization");
  useMethodologyCmsSeo(cms, methodSeo("/methodologies/ai-use-case-prioritization"));
  const editorial = methodologyEditorial<"ai-use-case-prioritization", typeof aiUseCasePrioritizationEditorial>(
    "ai-use-case-prioritization",
    cms,
    UCP_EDITORIAL,
  );
  const hero = methodologyHero(cms, UCP_HERO);
  const defaultCases = defaultUseCases(editorial.sampleOpportunities);
  const [useCases, setUseCases] = useMethodSessionState<UseCase[]>(
    "cognirise:method:ai-use-case-prioritization:opportunities",
    defaultCases,
    { validate: isUseCaseSessionState },
  );
  const [downloadError, setDownloadError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const downloadLock = useRef(false);
  const cleanBaseline = useRef(JSON.stringify(defaultCases));
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
    setUseCases(defaultCases.map((useCase) => ({ ...useCase, scores: { ...useCase.scores } })));
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
      setDownloadError(error instanceof Error ? error.message : editorial.nextSteps.downloadFailure);
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
    <div className="bg-[#fdfcfb] text-[#102957] min-h-screen selection:bg-[hsl(var(--brand-pink))] selection:text-white">
      <MethodPageHero
        {...hero}
        imageResolved={"imageResolved" in hero && hero.imageResolved}
        supportingText={<p>{hero.supportingText}</p>}
      />

      <MethodologyRelationship
        startHereWhen={editorial.relationship.startHereWhen}
        decision={editorial.relationship.decision}
        output={editorial.relationship.output}
        connectsToIdao={<>{editorial.relationship.connectsToIdaoBefore}{" "}<strong>{editorial.relationship.innovate}</strong>{editorial.relationship.connectsToIdaoBetweenInnovateAndDemonstrate}{" "}<strong>{editorial.relationship.demonstrate}</strong>{editorial.relationship.connectsToIdaoBetweenDemonstrateAndActivate}{" "}<strong>{editorial.relationship.activate}</strong>{editorial.relationship.connectsToIdaoAfter}</>}
        connectsToAuthority={editorial.relationship.connectsToAuthority}
        reassessWhen={editorial.relationship.reassessWhen}
        doesNotDecide={editorial.relationship.doesNotDecide}
      />
      <section className="px-6 py-20 md:px-[4.8vw] lg:py-28 bg-[#f3f5f8] border-y border-[#cbd3e1]">
         <div className="max-w-[1200px] mx-auto">
           <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#102957] mb-5">
             <span className="h-[2px] w-[23px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
              {editorial.portfolio.kicker}
           </div>
           <div className="grid lg:grid-cols-[1fr_0.8fr] gap-12 lg:gap-20 mb-16">
             <div>
              <h2 className="font-display text-[clamp(36px,5vw,60px)] font-semibold tracking-[-.05em] leading-[0.95]">{editorial.portfolio.heading}</h2>
               <p className="mt-6 text-[17px] leading-relaxed text-[#405777]">
                {editorial.portfolio.introduction}
               </p>
             </div>
             <div className="bg-white p-6 border-l-4 border-[hsl(var(--brand-coral))] shadow-sm h-fit">
               <p className="text-[14px] leading-relaxed text-[#536887]">
                {editorial.portfolio.boundary}
               </p>
             </div>
           </div>

           <div className="mb-16 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 bg-[#102957] text-white overflow-hidden shadow-lg relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
             {[
               ["Stop", "Value at 1 or 2, or control cost and feasibility both at 1 or 2.", "text-[#a0afc0]", "bg-[#0b1c3d]"],
               ["Innovate", "Feasibility or time to evidence at 1 or 2: pin down the uncertainty first.", "text-[hsl(var(--brand-violet))]", "bg-[#0c2045]"],
               ["Demonstrate", "Adoption friction at 1 or 2, control cost at 1 to 3, or mixed evidence.", "text-[hsl(var(--brand-pink))]", "bg-[#0d234a]"],
               ["Activate", "Feasibility and adoption both at 4 or 5, with no stop condition.", "text-[hsl(var(--brand-coral))]", "bg-[#0e2752]"],
             ].map(([stage, rule, color, bgClass], idx) => (
               <div key={stage} className={`p-8 ${bgClass} ${idx < 3 ? 'border-b md:border-b-0 xl:border-r border-white/10' : ''} ${idx === 1 && 'md:border-b-0 xl:border-r border-white/10'} ${idx === 0 && 'md:border-r border-white/10'}`}>
                 <strong className={`text-[12px] uppercase tracking-[0.15em] ${color}`}>{stage}</strong>
                 <p className="mt-4 text-[14px] leading-relaxed text-[#d6deed]">{rule}</p>
               </div>
             ))}
           </div>

           <dl className="mb-10 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 text-[13px] leading-relaxed text-[#405777]">
              {DIMENSIONS.map((dim) => (
                <div key={dim.id} className="border-t border-[#cbd3e1] pt-3">
                  <dt className="font-bold text-[#102957]">{dim.label}</dt>
                  <dd>{dim.desc}</dd>
                </div>
              ))}
           </dl>
           <div className="space-y-12">
              {useCases.map((uc, index) => (
                  <UseCaseCard key={uc.id} uc={uc} index={index} updateUseCase={updateUseCase} removeUseCase={removeUseCase} editorial={editorial.assessmentCard} />
              ))}
           </div>
           <p className="mt-6 text-[12px] leading-relaxed text-[#405777]">
              <strong>{editorial.assessmentCard.controlBurdenNote.heading}</strong>{" "}{editorial.assessmentCard.controlBurdenNote.beforeAuthorityLink}{" "}<Link href={editorial.assessmentCard.controlBurdenNote.authorityLink.href} className="underline font-bold text-[hsl(var(--brand-pink))] hover:text-[#102957]">{editorial.assessmentCard.controlBurdenNote.authorityLink.label}</Link>{" "}{editorial.assessmentCard.controlBurdenNote.afterAuthorityLink}
           </p>
           
           <button 
             onClick={addUseCase} 
             data-testid="button-add-use-case"
             className="mt-12 mx-auto flex items-center justify-center gap-3 text-[14px] font-bold text-[#102957] bg-white border border-[#cbd3e1] py-4 px-8 shadow-sm hover:border-[hsl(var(--brand-pink))] hover:text-[hsl(var(--brand-pink))] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]"
           >
              <Plus size={18} /> {editorial.portfolio.addOpportunity}
           </button>
            <div className="mt-8 border border-[#cbd3e1] bg-white p-5" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#647491]">{editorial.portfolio.progressHeading}</p>
                  <p className="mt-2 text-sm font-semibold text-[#102957]">{answeredUseCases} {editorial.portfolio.progressBetweenCounts} {useCases.length} {editorial.portfolio.progressAfterCounts}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#647491]">{editorial.portfolio.progressNotice}</p>
                </div>
                <button type="button" onClick={resetAssessment} className="inline-flex items-center gap-2 text-xs font-bold text-[#102957] underline underline-offset-4"><RotateCcw size={14} /> {editorial.portfolio.resetAssessment}</button>
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
                {editorial.analysis.kicker}
             </div>
              <h2 className="font-display text-[clamp(42px,6vw,80px)] font-semibold tracking-[-.05em] leading-[0.95]">{editorial.analysis.heading}</h2>
             <p className="mt-6 text-[19px] leading-relaxed text-[#405777]">
                 {editorial.analysis.introduction}
             </p>
           </div>
           
           <div className="mt-16 grid lg:grid-cols-[1fr_360px] gap-12 lg:gap-20">
              <div className="space-y-20">
                <AnalysisGroup 
                  title={editorial.analysis.groups[0].title}
                  description={editorial.analysis.groups[0].description}
                  items={analysis.active.filter(r => r.rec.stage === "Activate")} 
                  editorial={editorial.analysis}
                />
                <AnalysisGroup 
                  title={editorial.analysis.groups[1].title}
                  description={editorial.analysis.groups[1].description}
                  items={analysis.active.filter(r => r.rec.stage === "Demonstrate" || r.rec.stage === "Innovate")} 
                  editorial={editorial.analysis}
                />
                <AnalysisGroup 
                  title={editorial.analysis.groups[2].title}
                  description={editorial.analysis.groups[2].description}
                  items={analysis.stops} 
                  editorial={editorial.analysis}
                />
                
                {useCases.length === 0 && (
                  <div className="text-center py-20 border border-dashed border-[#cbd3e1] bg-[#f3f5f8] rounded-sm">
                    <p className="text-[#536887] text-[15px]">{editorial.analysis.empty}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                 <div className="bg-[#102957] p-8 lg:p-10 text-white shadow-xl lg:sticky lg:top-[120px] relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
                   <h3 className="font-display text-[26px] font-semibold mb-4 tracking-[-0.04em]">{editorial.nextSteps.heading}</h3>
                   <p className="text-[14px] text-[#d6deed] mb-8 leading-relaxed">
                     {editorial.nextSteps.body}
                   </p>
                    <BrandButton href={editorial.nextSteps.valueScan.href} variant="inverse" className="w-full justify-center" data-testid="link-value-scan">{editorial.nextSteps.valueScan.label}</BrandButton>
                   
                   <hr className="border-white/10 my-10" />
                   
                   <h3 className="font-display text-xl font-semibold mb-4 tracking-[-0.03em]">{editorial.nextSteps.idaoHeading}</h3>
                   <p className="text-[13px] text-[#d6deed] mb-6 leading-relaxed">
                     {editorial.nextSteps.idaoBody}
                   </p>
                    <Link href={editorial.nextSteps.idaoLink.href} data-testid="link-idao-methodology" className="text-[13px] font-bold text-[hsl(var(--brand-pink))] hover:text-white transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] w-fit">
                      {editorial.nextSteps.idaoLink.label} <ArrowRight size={16} />
                   </Link>
                    <div className="mt-8 border-t border-white/10 pt-6">
                      <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={downloadResults} disabled={!completeUseCases || isDownloading} className="inline-flex items-center gap-2 bg-white px-4 py-2.5 text-xs font-bold text-[#102957] disabled:cursor-not-allowed disabled:opacity-45">
                          <Download size={14} /> {isDownloading ? editorial.nextSteps.creatingReport : editorial.nextSteps.downloadResults}
                        </button>
                        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 px-2 py-2.5 text-xs font-bold text-white underline underline-offset-4"><Printer size={14} /> {editorial.nextSteps.print}</button>
                      </div>
                      {!completeUseCases && <p className="mt-3 text-xs leading-relaxed text-[#b9c7db]">{editorial.nextSteps.incompleteExport}</p>}
                      {downloadError && <p role="alert" className="mt-3 border-l-2 border-[#ff9fcf] pl-3 text-xs leading-relaxed text-white">{downloadError}</p>}
                      <p className="mt-3 text-xs leading-relaxed text-[#b9c7db]">{editorial.nextSteps.localPdfNotice}</p>
                    </div>
                 </div>
              </div>
           </div>
         </div>
      </section>
    </div>
  );
}

export default function AIUseCasePrioritization() {
  return <MethodologyCmsDelivery slug="ai-use-case-prioritization"><AIUseCasePrioritizationContent /></MethodologyCmsDelivery>;
}
