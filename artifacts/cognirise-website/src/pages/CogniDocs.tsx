import { useState, useRef } from "react";
import { ArrowRight, Layers, ShieldCheck } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { EXTRACTION_LAYERS, DEMO_SCENARIOS } from "@/lib/cognidocs-content";
import { DemoViewer } from "@/components/cognidocs/DemoViewer";

import heroImg from "@/assets/generated_images/cognidocs-finance.jpg";

export default function CogniDocs() {
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const scenarioRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (index + 1) % DEMO_SCENARIOS.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (index - 1 + DEMO_SCENARIOS.length) % DEMO_SCENARIOS.length;
    }
    if (nextIndex !== -1) {
      e.preventDefault();
      setActiveScenarioIdx(nextIndex);
      scenarioRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <main className="flex flex-col" data-platform="cognidocs">
      {/* Hero Section */}
      <section className="px-6 md:px-12 pt-16 pb-24 md:pt-24 lg:pt-32 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-12">
          <div className="h-[2px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          Products / CogniDocs
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20">
          <div className="relative z-10">
            <h1 className="text-5xl md:text-6xl lg:text-[76px] leading-[0.94] font-semibold mb-8 tracking-tight">
              CogniDocs document intelligence.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-[560px] mb-8 leading-relaxed">
              Turn complex technical and financial documents into itemized, classified, auditable data for enterprise operations.
            </p>
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-[hsl(var(--brand-deep))] mb-10 border-l-2 border-[hsl(var(--brand-pink))] pl-4">
              Read. Itemize. Classify. Verify.
            </p>
            <div className="flex flex-wrap gap-4">
              <BrandButton href="/contact">Discuss your documents</BrandButton>
            </div>
          </div>
          
          <div className="relative min-h-[400px] lg:h-full w-full clip-diagonal-left bg-slate-100">
            <img src={heroImg} alt="Conceptual representation of technical document extraction" className="absolute inset-0 w-full h-full object-cover" data-pulse-image-resilient="true" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[hsl(var(--brand-deep))]/10 to-transparent" />
          </div>
        </div>
      </section>

      {/* The Problem / Editorial */}
      <section id="problem" className="bg-[#f5f3fa] px-6 py-20 md:px-12 md:py-32 border-t border-border">
        <div className="max-w-[1440px] mx-auto">
          <div className="max-w-4xl mb-16">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--brand-pink))] mb-6">Domain Coverage</div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold leading-tight">
              The world's infrastructure runs on documents that weren't written for machines.
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 mt-16">
            <div>
              <h3 className="text-2xl font-bold mb-6">Engineering & Technical Drawings</h3>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>Architectural, structural, mechanical, electrical and oil-installation drawings hold facts in lines, symbols and dimensions. OCR can recover labels, but text alone does not explain which component a dimension belongs to, which sheet supersedes another, or whether a scale is usable.</p>
                <p>CogniDocs brings geometry, labels and visual evidence together for bills of quantities (BOQ), quantity takeoff and tender evaluation. Evidence-linked findings can support procurement matching, technical queries, permit and code-compliance review—not replace an engineer's judgment or certify compliance.</p>
                <p>Other applications include piping and instrumentation diagram (P&amp;ID) digitisation, as-built asset registers, progress checks and facilities-management handover. CAD, vector PDF and BIM inputs require format, revision and scale checks within the agreed scope.</p>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-6">Finance & Complex Statements</h3>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>Bank and card statements vary in layout. Descriptions wrap across lines, tables continue across pages, and merchant names arrive as abbreviated payment strings. Recognising characters is only the beginning: a usable record needs its date, amount, currency, debit or credit direction and source location.</p>
                <p>CogniDocs itemises transactions and proposes normalised merchant names and industry categories. A descriptor such as “CRM*CAREEM RIDES DXB 8842” can be presented as Careem Rides, with a proposed transport category, while retaining the original wording for review.</p>
                <p>These records support reconciliation, expense management, accounting entry, spend analysis and audit tie-outs. Teams can also use them as inputs to lending and mortgage onboarding, VAT review, disputes, or fraud and tampering checks. Classification is not a lending decision or proof of fraud; uncertain matches need an analyst.</p>
              </div>
            </div>
          </div>

          {/* Validation / Handoff */}
          <div className="mt-16 bg-white border border-border p-8 md:p-12 shadow-sm">
            <h3 className="text-2xl font-bold mb-4">Human validation and reviewer handoff</h3>
            <p className="text-muted-foreground leading-relaxed text-lg max-w-4xl">
              Review starts with the original page or sheet, not just the extracted answer. Check the document revision, source location, units and assumptions; reconcile totals or quantities and investigate conflicting or missing evidence. A reviewer can accept, correct or hold a finding before it enters a downstream workflow. A confidence label helps prioritise attention—it is not proof that a finding is correct.
            </p>
          </div>
        </div>
      </section>

      {/* The IP / Extraction Layers */}
      <section className="px-6 py-20 md:px-12 md:py-32">
        <div className="max-w-[1440px] mx-auto grid lg:grid-cols-[1fr_1.2fr] gap-16 items-center">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--brand-violet))] mb-6">The Architecture</div>
            <h2 className="text-3xl md:text-5xl font-semibold leading-tight mb-8">
              Extraction fused from<br />
              <span className="brand-gradient-text">three independent layers.</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              CogniDocs combines vector geometry, positioned text and computer vision in a shared coordinate space. The available layers depend on the input: a scan has pixels but no native CAD vectors. Combining their findings connects a label or value to its table cell, component or sheet region.
            </p>
            <div className="border-l-2 border-[hsl(var(--brand-coral))] pl-6 my-8 py-2">
              <p className="font-bold text-xl text-[hsl(var(--brand-deep))] mb-2">Deterministic Validation</p>
              <p className="text-muted-foreground leading-relaxed">
                After fusion, deterministic code checks measurements, comparisons and sums against defined rules. Findings retain source references and review signals. Missing scale, ambiguous text or conflicting revisions should remain unresolved until a reviewer can confirm them.
              </p>
            </div>
          </div>
          
          <div className="grid gap-4">
            {EXTRACTION_LAYERS.map((layer) => (
              <div key={layer.id} className="bg-slate-50 border border-border p-6 flex items-start gap-6 hover:border-[hsl(var(--brand-pink))] transition-colors group">
                <div className="flex-shrink-0 w-12 h-12 bg-white border border-border flex items-center justify-center text-[hsl(var(--brand-deep))] group-hover:bg-[hsl(var(--brand-deep))] group-hover:text-white transition-colors">
                  <Layers className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-2 flex items-center gap-2">
                    {layer.name}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{layer.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demonstrations */}
      <section className="bg-[#fcfcfc] px-6 py-20 md:px-12 md:py-32 border-t border-border">
        <div className="max-w-[1440px] mx-auto">
          <header className="mb-12">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--brand-coral))] mb-6">Extraction Examples</div>
            <h2 className="text-3xl md:text-5xl font-semibold leading-tight max-w-2xl">
              Itemized, classified, and pinned to the page.
            </h2>
            <p className="text-lg text-muted-foreground mt-6 max-w-2xl leading-relaxed">
              Explore how unstructured pixels and cryptic text are transformed into verifiable facts ready for human review.
            </p>
          </header>
          
          <div className="mt-12">
            <div className="flex flex-wrap gap-2 border-b border-border pb-4" role="tablist" aria-label="Extraction demonstrations">
              {DEMO_SCENARIOS.map((scenario, idx) => {
                const isActive = activeScenarioIdx === idx;
                return (
                  <button
                    key={scenario.id}
                    ref={(el) => { scenarioRefs.current[idx] = el; }}
                    role="tab"
                    aria-selected={isActive}
                    id={`tab-${scenario.id}`}
                    aria-controls={`panel-${scenario.id}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveScenarioIdx(idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    className={`px-6 py-3 font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-coral))] ${
                      isActive 
                        ? "bg-[hsl(var(--brand-deep))] text-white" 
                        : "bg-white text-muted-foreground border border-border hover:bg-slate-50 hover:text-[hsl(var(--brand-deep))]"
                    }`}
                  >
                    {scenario.title}
                  </button>
                );
              })}
            </div>
            
            <div className="text-[hsl(var(--foreground))]">
              {DEMO_SCENARIOS.map((scenario, idx) => (
                <div
                  key={scenario.id}
                  id={`panel-${scenario.id}`}
                  role="tabpanel"
                  aria-labelledby={`tab-${scenario.id}`}
                  tabIndex={activeScenarioIdx === idx ? 0 : -1}
                  hidden={activeScenarioIdx !== idx}
                  className="focus-visible:outline-none"
                >
                  {activeScenarioIdx === idx && <DemoViewer scenario={scenario} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Integration with CogniOS */}
      <section className="px-6 py-20 md:px-12 md:py-32 border-t border-border">
        <div className="max-w-[1440px] mx-auto text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--brand-pink))] mb-6">Better together</div>
          <h2 className="text-3xl md:text-5xl font-semibold leading-tight mb-8">
            CogniDocs reads it.<br />CogniOS runs it.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16 leading-relaxed">
            Use CogniDocs as a standalone document-intelligence engine through API integration with existing finance, engineering or document systems. Agree the inputs, output schema, access boundaries and exception handling before connecting it. With CogniOS, source-linked findings become inputs to governed workflows.
          </p>
          
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-8 items-stretch max-w-5xl mx-auto text-left mb-12">
            <div className="bg-white border border-border p-8 shadow-sm flex flex-col h-full">
              <h3 className="text-2xl font-bold mb-4">CogniDocs</h3>
              <p className="text-muted-foreground leading-relaxed flex-1">
                Itemizes the tender bids, reads the permit drawings, classifies the statements — and hands over structured, evidence-pinned data.
              </p>
            </div>
            
            <div className="flex justify-center items-center text-[hsl(var(--brand-coral))] py-4">
              <ArrowRight className="w-8 h-8 hidden md:block" />
              <div className="h-8 w-[2px] bg-[hsl(var(--brand-coral))] md:hidden" />
            </div>
            
            <div className="bg-[hsl(var(--brand-deep))] text-white p-8 shadow-xl flex flex-col h-full">
              <h3 className="text-2xl font-bold mb-4">CogniOS</h3>
              <p className="text-white/70 leading-relaxed flex-1">
                Routes that data through governed workflows — bid evaluation, permit review, reconciliation — where agents prepare and a human decides.
              </p>
              <div className="mt-8">
                 <BrandButton href="/platforms/cognios" variant="inverse" className="w-full sm:w-auto">Explore CogniOS</BrandButton>
              </div>
            </div>
          </div>
          
          <div className="mt-12 bg-slate-50 border border-border inline-block p-5 max-w-3xl mx-auto">
            <p className="text-sm font-semibold flex flex-wrap items-center justify-center gap-3">
              <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Example workflow:</span>
              <span className="font-mono bg-white border border-border px-3 py-1.5 text-xs">RFQ arrives</span>
              <ArrowRight className="w-3 h-3 text-[hsl(var(--brand-pink))]" />
              <span className="font-mono bg-white border border-border px-3 py-1.5 text-xs">CogniDocs itemizes</span>
              <ArrowRight className="w-3 h-3 text-[hsl(var(--brand-pink))]" />
              <span className="font-mono bg-white border border-border px-3 py-1.5 text-xs">CogniOS drafts offer</span>
              <ArrowRight className="w-3 h-3 text-[hsl(var(--brand-pink))]" />
              <strong className="text-[hsl(var(--brand-deep))]">Your engineer approves it.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white border-t border-border px-6 py-20 md:px-12 md:py-32 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[hsl(var(--brand-pink))]/5 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-r from-[hsl(var(--brand-violet))]/5 to-transparent pointer-events-none" />
        
        <div className="max-w-[1440px] mx-auto relative z-10 text-center">
          <div className="w-16 h-16 bg-[hsl(var(--brand-deep))] text-white flex items-center justify-center rounded-full mx-auto mb-8 shadow-xl">
            <ShieldCheck className="w-8 h-8 text-[hsl(var(--brand-coral))]" />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--brand-coral))] mb-6">The standing challenge</div>
          <h2 className="text-4xl md:text-6xl font-semibold leading-tight mb-8">
            Discuss your document extraction needs.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Tell us about the document types, review requirements and systems involved. We can discuss scope, format compatibility and integration needs. This opens our contact page for an enquiry—not a booked demo or an upload. Please do not send sensitive documents before an appropriate sharing arrangement is agreed.
          </p>
          <BrandButton href="/contact">Discuss your documents</BrandButton>
        </div>
      </section>
    </main>
  );
}