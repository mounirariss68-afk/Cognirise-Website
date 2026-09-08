import { useState, useRef } from "react";
import { ArrowRight, Database, Activity, FileText, Server, LayoutGrid, Check, Shield } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { assetUrl } from "@/lib/assets";
import {
  AUTO_DATA_PIPELINE,
  AUTODATA_CAPABILITIES,
  AUTODATA_DEEP_DIVES,
  type PipelineStage,
} from "@/lib/autoDataContent";

function StageContext({ stage, idPrefix }: { stage: PipelineStage; idPrefix: string }) {
  return (
    <div className="space-y-8 font-mono text-sm">
      <div>
        <p className="mb-3 text-[10px] font-sans font-bold uppercase tracking-[.2em] text-muted-foreground">Raw input</p>
        <div className="break-words border-l-2 border-slate-300 bg-slate-100 p-4 text-slate-600" data-testid={`content-raw-${idPrefix}-${stage.id}`}>
          {stage.rawInput}
        </div>
      </div>
      <div>
        <p className="mb-3 text-[10px] font-sans font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-violet))]">Transformation purpose</p>
        <div className="break-words border-l-2 border-[hsl(var(--brand-violet))] bg-[hsl(var(--brand-violet))]/5 p-4 font-sans leading-7 text-[hsl(var(--brand-deep))]" data-testid={`content-purpose-${idPrefix}-${stage.id}`}>
          {stage.purpose}
        </div>
      </div>
      <div>
        <p className="mb-3 text-[10px] font-sans font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-violet))]">Persisted metadata</p>
        <div className="break-words border-l-2 border-[hsl(var(--brand-violet))] bg-[hsl(var(--brand-violet))]/5 p-4 text-[hsl(var(--brand-deep))]" data-testid={`content-meta-${idPrefix}-${stage.id}`}>
          {stage.metadata}
        </div>
      </div>
      <div>
        <p className="mb-3 text-[10px] font-sans font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-coral))]">Model-ready output</p>
        <div className="break-words border-l-2 border-[hsl(var(--brand-coral))] bg-[hsl(var(--brand-coral))]/5 p-4 font-bold text-[hsl(var(--brand-deep))]" data-testid={`content-output-${idPrefix}-${stage.id}`}>
          {stage.output}
        </div>
      </div>
    </div>
  );
}

export default function DatatoolpackAutoData() {
  const [activeStage, setActiveStage] = useState(0);
  const stageRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = (index + 1) % AUTO_DATA_PIPELINE.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex = (index - 1 + AUTO_DATA_PIPELINE.length) % AUTO_DATA_PIPELINE.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = AUTO_DATA_PIPELINE.length - 1;
    }

    if (nextIndex !== -1) {
      e.preventDefault();
      setActiveStage(nextIndex);
      stageRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <main className="overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]" data-platform="datatoolpack-autodata">
      <section className="mx-auto max-w-[1440px] px-6 pb-16 pt-8 md:px-12 md:pb-24 md:pt-12">
        <p className="mb-8 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground">
          <span className="h-px w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          Alliance platform / Data preparation
        </p>
        <div className="grid items-end gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-16">
          <header className="relative z-10 pb-4">
            <p className="mb-5 text-sm font-bold text-[hsl(var(--brand-pink))]">Datatoolpack AutoData</p>
            <h1 className="max-w-[680px] text-5xl font-semibold leading-[.94] tracking-tight md:text-7xl lg:text-[88px]" data-testid="heading-datatoolpack">
              Raw data,<br />prepared for AI.
            </h1>
            <p className="mt-8 max-w-[610px] text-base leading-8 text-muted-foreground md:text-lg">
              AutoData is a deterministic model-readiness layer. It sits between heterogeneous raw enterprise data and your existing ML or AutoML platform, automating the journey from noisy field signals to a precise, trusted matrix without replacing model training.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <BrandButton href="/value-scan" data-testid="link-value-scan-datatoolpack">Explore a governed fit</BrandButton>
            </div>
          </header>
          <figure className="relative h-[480px] overflow-hidden bg-[#eef1f6] md:h-[660px] clip-diagonal">
            <img src={assetUrl("/images/cognirise/alliance-datatoolpack.jpg")} alt="Irregular translucent data fragments moving through luminous processing planes and emerging as a structured dataset." width="1024" height="1024" className="h-full w-full object-cover" data-testid="image-hero-datatoolpack" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/35 via-transparent to-white/10" aria-hidden="true" />
            <figcaption className="absolute bottom-7 left-7 right-7 border-l-2 border-[hsl(var(--brand-coral))] bg-white/85 px-5 py-4 text-[10px] font-bold uppercase tracking-[.16em] backdrop-blur md:left-10 md:right-auto">
              Original Cognirise visual / concept, not product UI
            </figcaption>
          </figure>
        </div>
      </section>

      <section id="stack-position" className="scroll-mt-24 bg-[#f5f3fa] px-6 py-20 md:px-12 md:py-32">
        <div className="mx-auto max-w-[1440px]">
          <header className="mb-14">
             <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))] mb-4">The Stack Position</p>
             <h2 className="text-3xl font-semibold leading-tight md:text-5xl">Connecting raw enterprise contexts to execution.</h2>
          </header>
          
          <div className="grid gap-6 md:grid-cols-3 items-stretch">
            <div className="bg-white p-8 border border-border shadow-sm flex flex-col h-full">
               <Database className="h-6 w-6 text-muted-foreground mb-6" />
               <h3 className="text-lg font-semibold mb-6">Raw Enterprise Data</h3>
               <ul className="space-y-4 mt-auto">
                 <li className="flex items-center gap-3 text-sm font-semibold text-muted-foreground"><FileText className="h-4 w-4" /> Files</li>
                 <li className="flex items-center gap-3 text-sm font-semibold text-muted-foreground"><Server className="h-4 w-4" /> Warehouses</li>
                 <li className="flex items-center gap-3 text-sm font-semibold text-muted-foreground"><LayoutGrid className="h-4 w-4" /> Streams</li>
                 <li className="flex items-center gap-3 text-sm font-semibold text-muted-foreground"><Activity className="h-4 w-4" /> Telemetry</li>
               </ul>
            </div>

            <div className="autodata-stack-card bg-[hsl(var(--brand-deep))] text-white shadow-xl relative overflow-hidden clip-diagonal-bottom" data-testid="card-autodata-stack">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                 <Shield className="h-24 w-24" />
               </div>
               <div className="autodata-stack-card-content relative z-10 flex h-full flex-col" data-testid="content-autodata-stack">
                 <p className="mb-6 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-coral))]">AutoData Layer</p>
                 <h3 className="mb-4 text-2xl font-bold">Deterministic model-readiness</h3>
                 <p className="mt-auto text-sm leading-relaxed text-white/70">
                   Provides automated preparation, transforming messy intake into structured matrices without replacing model training itself.
                 </p>
               </div>
            </div>

            <div className="bg-white p-8 border border-border shadow-sm flex flex-col h-full">
               <Activity className="h-6 w-6 text-[hsl(var(--brand-violet))] mb-6" />
               <h3 className="text-lg font-semibold mb-6">Model Execution</h3>
               <div className="mt-auto p-4 border border-[hsl(var(--brand-violet))]/20 bg-[hsl(var(--brand-violet))]/5">
                 <p className="text-sm font-semibold text-[hsl(var(--brand-deep))]">Existing ML or AutoML platform</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pipeline" className="mx-auto max-w-[1440px] scroll-mt-24 px-6 py-20 md:px-12 md:py-32">
        <header className="mb-14 grid gap-7 md:grid-cols-[.35fr_1fr]">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-coral))] pt-2">8-Stage Pipeline</p>
          <div>
            <h2 className="max-w-[870px] text-4xl font-semibold leading-none md:text-6xl">A visible route through the preparation capability.</h2>
          </div>
        </header>

        <div className="autodata-pipeline-interactive gap-12 lg:gap-20 items-start">
          <div className="flex flex-col gap-2" role="tablist" aria-label="AutoData preparation stages" aria-orientation="vertical">
            {AUTO_DATA_PIPELINE.map((stage, idx) => {
              const isActive = activeStage === idx;
              return (
                <button
                  key={stage.id}
                  ref={(el) => { stageRefs.current[idx] = el; }}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${stage.id}`}
                  id={`tab-${stage.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveStage(idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  className={`text-left px-6 py-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-coral))] border-l-2 ${
                    isActive 
                      ? "border-[hsl(var(--brand-pink))] bg-slate-50 text-[hsl(var(--brand-pink))] font-bold" 
                      : "border-transparent text-muted-foreground hover:bg-slate-50/50 hover:text-[hsl(var(--brand-deep))] font-semibold"
                  }`}
                  data-testid={`tab-stage-${stage.id}`}
                >
                  <span className="text-[10px] uppercase tracking-widest opacity-60 mr-4 block mb-1">Stage 0{idx + 1}</span>
                  {stage.name}
                </button>
              )
            })}
          </div>

          <div className="sticky top-28">
            {AUTO_DATA_PIPELINE.map((stage, index) => (
              <div
                key={stage.id}
                id={`panel-${stage.id}`}
                role="tabpanel"
                aria-labelledby={`tab-${stage.id}`}
                tabIndex={activeStage === index ? 0 : -1}
                aria-live={activeStage === index ? "polite" : "off"}
                hidden={activeStage !== index}
                className="border border-border bg-[#fcfcfc] p-8 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-coral))] md:p-12"
              >
                <h3 className="mb-8 text-3xl font-bold">{stage.name}</h3>
                <StageContext stage={stage} idPrefix="interactive" />
              </div>
            ))}
          </div>
        </div>

        <div className="autodata-pipeline-linear space-y-8" data-testid="list-pipeline-linear">
          {AUTO_DATA_PIPELINE.map((stage, index) => (
            <article key={stage.id} className="border border-border bg-[#fcfcfc] p-6 sm:p-8" data-testid={`card-stage-linear-${stage.id}`}>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-coral))]">Stage 0{index + 1}</p>
              <h3 className="mb-8 text-2xl font-bold">{stage.name}</h3>
              <StageContext stage={stage} idPrefix="linear" />
            </article>
          ))}
        </div>
      </section>

      <section id="inference-replay" className="scroll-mt-24 border-t border-border bg-[#eef1f6] px-6 py-20 md:px-12 md:py-32">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid lg:grid-cols-[1fr_1.5fr] gap-16 mb-24">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))] mb-4">Inference architecture</p>
              <h2 className="text-4xl font-semibold leading-none mb-6">Fitted-transform replay.</h2>
              <p className="text-lg leading-8 text-muted-foreground">
                Execution-time data needs the same preparation logic used for training. AutoData is described as persisting each stage’s fitted metadata and replaying that state at inference rather than refitting. Model training remains in the customer’s existing ML platform.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-px bg-border">
              {AUTODATA_CAPABILITIES.map((cap) => (
                <article key={cap.title} className="bg-[#fcfcfc] p-8">
                  <Check className="h-5 w-5 text-[hsl(var(--brand-coral))]" aria-hidden="true" />
                  <h3 className="mt-5 text-xl font-semibold">{cap.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{cap.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="collaborative-delivery" className="scroll-mt-24 bg-[#fdfcfb] px-6 py-24 md:px-12">
        <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[.42fr_1fr]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-pink))]">Collaborative delivery</p>
            <h2 className="mt-6 text-4xl font-semibold leading-none md:text-5xl">Specialist platform. Accountable integration.</h2>
          </div>
          <div>
            <p className="max-w-[850px] text-xl leading-9">
              Datatoolpack brings the specialist AutoData platform and its data-preparation capability. Cognirise shapes the data product and quality approach, connects the relevant source and destination systems, and integrates AutoData outputs into governed analytics, model, and CogniOS delivery workflows. Together, the teams provide a clear route from specialist capability to accountable enterprise delivery.
            </p>
            <BrandButton href="/contact" className="mt-9" data-testid="link-contact-datatoolpack">Discuss the integration</BrandButton>
          </div>
        </div>
      </section>

      <section id="deep-dive" className="mx-auto max-w-[1440px] scroll-mt-24 px-6 py-20 md:px-12" aria-labelledby="datatoolpack-deep-dive">
        <div className="grid gap-10 border-t border-[hsl(var(--brand-deep))] pt-7 md:grid-cols-[.35fr_1fr]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--brand-coral))]">Continue exploring</p>
            <h2 id="datatoolpack-deep-dive" className="mt-4 text-3xl font-semibold">Go deeper with Datatoolpack.</h2>
          </div>
          <ul className="grid gap-px bg-border sm:grid-cols-2">
            {AUTODATA_DEEP_DIVES.map((link) => (
              <li key={link.url} className="bg-[#fcfcfc] p-7">
                <a href={link.url} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 text-base font-bold text-[hsl(var(--brand-pink))] hover:underline" data-testid={`link-deep-dive-${link.id}`}>
                  {link.label}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{link.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
