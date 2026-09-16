import { useState, useRef } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { EXTRACTION_LAYERS, DEMO_SCENARIOS, COGNIDOCS_EDITIONS } from "@/lib/cognidocs-content";
import { DemoViewer } from "@/components/cognidocs/DemoViewer";

import heroImg from "@/assets/generated_images/cognidocs-pulse-document-intelligence.jpg";
import layersImg from "@/assets/generated_images/cognidocs-pulse-extraction-layers.jpg";

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
      <section className="public-hero-shell px-6 md:px-12 pt-6 md:pt-8 pb-12 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6 md:mb-12">
          <div className="h-[2px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          Products / CogniDocs
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[0.84fr_1.16fr] gap-8 lg:gap-10 items-end pb-8">
          <div className="relative z-10 pb-4">
            <h1 className="text-[40px] leading-[1.05] sm:text-[50px] md:text-6xl lg:text-[clamp(50px,6.35vw,100px)] lg:leading-[0.94] font-semibold mb-6 lg:mb-7 tracking-tight font-display break-words">
              CogniDocs document intelligence.
            </h1>
            <p className="text-base text-muted-foreground max-w-[440px] mb-8 leading-[1.6]">
              Turn complex technical and financial documents into itemized, classified, auditable data for enterprise operations.
            </p>
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-[hsl(var(--brand-deep))] mb-8 border-l-2 border-[hsl(var(--brand-pink))] pl-4">
              Read. Itemize. Classify. Verify.
            </p>
            <div className="flex flex-wrap gap-4">
              <BrandButton href="/contact">Discuss your documents</BrandButton>
            </div>
          </div>
          
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] lg:aspect-auto lg:h-[630px] clip-diagonal bg-[hsl(var(--brand-deep))] overflow-hidden">
            <img src={heroImg} alt="Sculptural engineering and financial document planes with aligned evidence fragments connected by a violet-to-coral light trail." className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-1000 platforms-hero-fallback" fetchPriority="high" data-pulse-image-resilient="true" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[hsl(var(--brand-deep))]/20 to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* The Problem / Editorial */}
      <section id="problem" className="bg-[#fcfcfc] px-6 py-20 md:px-12 md:py-32 border-t border-border">
        <div className="max-w-[1440px] mx-auto">
          <div className="max-w-4xl mb-16">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--brand-pink))] mb-6">Domain Coverage</div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-semibold leading-tight font-display">
              The world's infrastructure runs on documents that weren't written for machines.
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 mt-16">
            <div>
              <h3 className="text-2xl font-bold mb-6 font-display">Engineering & Technical Drawings</h3>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>Architectural, structural, mechanical, electrical and oil-installation drawings hold facts in lines, symbols and dimensions. OCR can recover labels, but text alone does not explain which component a dimension belongs to, which sheet supersedes another, or whether a scale is usable.</p>
                <p>CAD, vector PDF and BIM inputs require format, revision and scale checks within the agreed scope before their contents can be extracted and linked to visual evidence. These findings support procurement matching, technical queries and code-compliance review—they do not replace an engineer's judgment or certify compliance.</p>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-6 font-display">Finance & Complex Statements</h3>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>Bank and card statements vary in layout. Descriptions wrap across lines, tables continue across pages, and merchant names arrive as abbreviated payment strings.</p>
                <p>Recognising characters is only the beginning: a usable record needs its date, amount, currency, debit or credit direction and source location. Classification supports workflows like lending onboarding or fraud checks, but it is not a lending decision or proof of fraud; uncertain matches need an analyst.</p>
              </div>
            </div>
          </div>

          {/* Validation / Handoff */}
          <div className="mt-16 bg-white border border-border p-8 md:p-12 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[hsl(var(--brand-pink))]/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-4 font-display">Human validation and reviewer handoff</h3>
              <p className="text-muted-foreground leading-relaxed text-lg max-w-4xl">
                Review starts with the original page or sheet, not just the extracted answer. Check the document revision, source location, units and assumptions; reconcile totals or quantities and investigate conflicting or missing evidence. A reviewer can accept, correct or hold a finding before it enters a downstream workflow. A confidence label helps prioritise attention—it is not proof that a finding is correct.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The IP / Extraction Layers */}
      <section id="extraction-layers" className="px-6 py-20 md:px-12 md:py-32">
        <div className="max-w-[1440px] mx-auto grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-12 lg:gap-16 items-start">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--brand-violet))] mb-6">The Architecture</div>
            <h2 className="text-3xl md:text-5xl font-semibold leading-tight mb-8 font-display">
              Extraction fused from<br />
              <span className="brand-gradient-text">three independent layers.</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              CogniDocs combines vector geometry, positioned text and computer vision in a shared coordinate space. The available layers depend on the input: a scan has pixels but no native CAD vectors. Combining their findings connects a label or value to its table cell, component or sheet region.
            </p>
            <div className="border-l-2 border-[hsl(var(--brand-coral))] pl-6 my-8 py-2">
              <p className="font-bold text-xl text-[hsl(var(--brand-deep))] mb-2 font-display">Deterministic Validation</p>
              <p className="text-muted-foreground leading-relaxed">
                After fusion, deterministic code checks measurements, comparisons and sums against defined rules. Findings retain source references and review signals. Missing scale, ambiguous text or conflicting revisions should remain unresolved until a reviewer can confirm them.
              </p>
            </div>
          </div>
          
          <figure className="min-w-0" aria-label="Three independent extraction layers">
            <img
              src={layersImg}
              alt="Three separated, spatially aligned document planes: vector geometry above positioned text regions above pixel-based visual evidence, sharing the same document coordinates."
              className="block w-full h-auto"
              loading="lazy"
              decoding="async"
            />
            <figcaption className="mt-8 grid gap-6">
              {EXTRACTION_LAYERS.map((layer) => (
                <div key={layer.id} id={layer.id} className="pl-5 border-l-2" style={{ borderColor: `hsl(var(--brand-${layer.color}))` }}>
                  <h3 className="text-lg font-bold mb-1 font-display">{layer.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{layer.description}</p>
                </div>
              ))}
            </figcaption>
          </figure>
        </div>
      </section>

      {/* One Engine, Two Editions */}
      <section className="px-6 py-20 md:px-12 md:py-32 bg-[#fcfcfc] border-t border-border">
        <div className="max-w-[1440px] mx-auto">
          <div className="text-center mb-16">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--brand-violet))] mb-6">One engine, two editions</div>
            <h2 className="text-3xl md:text-5xl font-semibold leading-tight font-display max-w-4xl mx-auto">
              Wherever documents hold the numbers, CogniDocs gets them out.
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {COGNIDOCS_EDITIONS.map((edition) => {
              const isFinance = edition.id === "finance";
              const brandColor = isFinance ? "var(--brand-violet)" : "var(--brand-coral)";
              
              return (
                <article key={edition.id} aria-labelledby={`edition-${edition.id}`} className="border-t-2 pt-8 md:pt-10 flex flex-col min-w-0" style={{ borderColor: `hsl(${brandColor})` }}>
                  <div className="relative z-10">
                    <h3 id={`edition-${edition.id}`} className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">{edition.name}</h3>
                    <p className="text-2xl md:text-3xl font-semibold mb-6 text-[hsl(var(--brand-deep))] font-display">
                      {edition.headline}
                    </p>
                    <p className="text-muted-foreground leading-relaxed mb-8 text-lg">
                      {edition.description}
                    </p>

                    <ul className="space-y-6 mb-12">
                      {edition.features.map((feature, idx) => (
                        <li key={idx} className="flex gap-4">
                          <div className="w-1.5 h-1.5 rounded-full mt-2.5 shrink-0" style={{ backgroundColor: `hsl(${brandColor})` }} />
                          <p className="text-muted-foreground leading-relaxed">
                            <strong className="text-foreground">{feature.title}</strong> — {feature.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto pt-8 border-t border-border/50">
                    <div className="text-sm font-bold text-foreground mb-4">Applications</div>
                    <ul className="flex flex-wrap gap-2 text-sm text-[hsl(var(--brand-deep))]">
                      {edition.applications.map(app => (
                        <li key={app} className="bg-slate-50 border border-border px-3 py-1.5 rounded-sm">{app}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Demonstrations */}
      <section className="bg-white px-6 py-20 md:px-12 md:py-32 border-t border-border">
        <div className="max-w-[1440px] mx-auto">
          <header className="mb-12">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--brand-coral))] mb-6">Extraction Examples</div>
            <h2 className="text-3xl md:text-5xl font-semibold leading-tight max-w-2xl font-display">
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
          <h2 className="text-3xl md:text-5xl font-semibold leading-tight mb-8 font-display">
            CogniDocs reads it.<br />CogniOS runs it.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16 leading-relaxed">
            Use CogniDocs as a standalone document-intelligence engine through API integration with existing finance, engineering or document systems. Agree the inputs, output schema, access boundaries and exception handling before connecting it. With CogniOS, source-linked findings become inputs to governed workflows.
          </p>
          
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-8 items-stretch max-w-5xl mx-auto text-left mb-12">
            <div className="bg-white border border-border p-8 shadow-sm flex flex-col h-full">
              <h3 className="text-2xl font-bold mb-4 font-display">CogniDocs</h3>
              <p className="text-muted-foreground leading-relaxed flex-1">
                Itemizes the tender bids, reads the permit drawings, classifies the statements — and hands over structured, evidence-pinned data.
              </p>
            </div>
            
            <div className="flex justify-center items-center text-[hsl(var(--brand-coral))] py-4">
              <ArrowRight className="w-8 h-8 hidden md:block" />
              <div className="h-8 w-[2px] bg-[hsl(var(--brand-coral))] md:hidden" />
            </div>
            
            <div className="bg-[hsl(var(--brand-deep))] text-white p-8 shadow-xl flex flex-col h-full">
              <h3 className="text-2xl font-bold mb-4 font-display">CogniOS</h3>
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
          <h2 className="text-4xl md:text-6xl font-semibold leading-tight mb-8 font-display">
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