import { useMemo, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { assetUrl } from "@/lib/assets";
import { calculateMaturity, MATURITY_DIMENSIONS, MATURITY_STAGES, type MaturityAnswers } from "@/lib/value-to-scale";
import { BrandButton } from "@/components/ui/brand-button";

export function ValueToScaleAssessment() {
  const [answers, setAnswers] = useState<MaturityAnswers>({});
  const complete = MATURITY_DIMENSIONS.every((dimension) => answers[dimension.id]);
  const result = useMemo(() => calculateMaturity(answers), [answers]);

  return (
    <section id="assessment" className="scroll-mt-24 bg-[#eef0f5] px-6 py-20 md:px-[4.8vw] lg:py-28" aria-labelledby="maturity-assessment-title">
      <div className="mx-auto max-w-[1080px]">
        <div className="grid gap-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--brand-pink))]">10–15 minutes · local to this page</p>
            <h2 id="maturity-assessment-title" className="mt-4 font-display text-[clamp(40px,5.5vw,76px)] font-semibold leading-[.96] tracking-[-.08em]">Find the next evidence to earn.</h2>
          </div>
          <div>
            <p className="text-sm leading-[1.65] text-[#536887]">Your selections stay in this browser tab. Nothing is saved or sent to Cognirise. This is a directional planning tool, not an audit, certification or benchmark.</p>
            <a href={assetUrl("/downloads/cognirise-ai-value-to-scale-assessment.pdf")} download className="mt-4 inline-flex items-center gap-2 text-sm font-bold underline underline-offset-4"><Download size={16} /> Download printable worksheet (PDF)</a>
          </div>
        </div>

        <div className="mt-12 space-y-4">
          {MATURITY_DIMENSIONS.map((dimension, index) => (
            <fieldset key={dimension.id} className="border border-[#b9c4d5] bg-white p-5 md:p-7">
              <legend className="px-2 font-display text-xl font-semibold text-[#102957]">{index + 1}. {dimension.name}</legend>
              <p className="mt-2 text-sm leading-[1.55] text-[#405777]">{dimension.question}</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-5" aria-label={`${dimension.name} maturity stage`}>
                {MATURITY_STAGES.map((stage) => (
                  <label key={stage.score} className={`cursor-pointer border p-3 text-left transition-colors focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[hsl(var(--brand-coral))] ${answers[dimension.id] === stage.score ? "border-[#102957] bg-[#f0effa]" : "border-[#cbd3e1] hover:border-[#7659df]"}`}>
                    <input className="sr-only" type="radio" name={dimension.id} value={stage.score} checked={answers[dimension.id] === stage.score} onChange={() => setAnswers((current) => ({ ...current, [dimension.id]: stage.score }))} />
                    <strong className="block text-xs text-[#102957]">{stage.score} · {stage.name}</strong>
                    <span className="mt-1 block text-[10px] leading-[1.4] text-[#647491]">{stage.test}</span>
                  </label>
                ))}
              </div>
              <p className="mt-4 text-xs leading-[1.5] text-[#647491]"><strong>Evidence prompt:</strong> {dimension.evidence}</p>
            </fieldset>
          ))}
        </div>

        {!complete ? (
          <p role="status" className="mt-7 border-l-4 border-[hsl(var(--brand-coral))] bg-white p-4 text-sm font-semibold text-[#405777]">Choose one evidence-backed stage for every dimension to see your result.</p>
        ) : (
          <div className="mt-10 border border-[#102957] bg-[#102957] p-6 text-white md:p-9" aria-live="polite">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#ff9fcf]">Directional result</p>
            <h3 className="mt-3 font-display text-[clamp(34px,5vw,60px)] font-semibold tracking-[-.07em]">{result.stage.name} · {result.average.toFixed(1)} / 5</h3>
            <p className="mt-3 max-w-3xl text-sm leading-[1.65] text-[#d6deed]">{result.stage.test} The label is a summary, not the decision: the dimension pattern and missing evidence determine the next work.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {result.dimensions.map((dimension) => <div key={dimension.id} className="border border-white/20 p-4"><span className="text-[10px] text-white/60">{dimension.name}</span><strong className="mt-1 block text-2xl">{dimension.score}/5</strong></div>)}
            </div>
            <div className="mt-9 grid gap-8 lg:grid-cols-2">
              <div>
                <h4 className="font-display text-2xl font-semibold">Evidence gaps and checks</h4>
                <ul className="mt-4 space-y-3 text-sm text-[#d6deed]">{result.priorities.map((item) => <li key={item.id} className="border-l-2 border-[#ff9fcf] pl-3"><strong className="text-white">{item.name}:</strong> {item.score >= 4 ? "revalidate" : "confirm"} {item.evidence.toLowerCase()}</li>)}</ul>
              </div>
              <div>
                <h4 className="font-display text-2xl font-semibold">Prioritized actions</h4>
                <ol className="mt-4 space-y-3 text-sm text-[#d6deed]">{result.priorities.map((item, index) => <li key={item.id}><strong className="mr-2 text-[#ff9fcf]">0{index + 1}</strong>{item.action}</li>)}</ol>
              </div>
            </div>
            <div className="mt-9 flex flex-wrap gap-4 border-t border-white/20 pt-6">
              <BrandButton href="/value-scan" variant="inverse">Optionally discuss a Value Scan</BrandButton>
              <button type="button" onClick={() => setAnswers({})} className="inline-flex items-center gap-2 px-3 text-sm font-bold text-white underline underline-offset-4"><RotateCcw size={15} /> Clear my answers</button>
            </div>
            <p className="mt-4 text-xs text-white/55">Contact is optional. Your assessment answers are not included when you open or submit the separate Value Scan form.</p>
          </div>
        )}
      </div>
    </section>
  );
}
