import React from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import { assetUrl } from "@/lib/assets";
import {
  fsAreas, fsCases, fsClose, fsCredit, fsHero, fsLevels, fsProjects, fsResearch, fsVoice,
} from "@/content/financial-services-launch";
import { fsStyles } from "./fsStyles";
import { FsAreasTable, FsLevelsTable, FsProjectsGrid, FsSectionHead, FsVoiceTable } from "./FsTables";
import { FsCreditFlow, FsTransferTable, FsVoiceFlow } from "./FsDiagrams";

export function FinancialServicesPage() {
  return (
    <main className="fs-page" data-testid="page-financial-services" data-fs-launch-override="true">
      <style>{fsStyles}</style>

      <section className="fs-hero" aria-labelledby="fs-hero-title">
        <div className="fs-hero-copy">
          <div className="fs-hero-top">
            <NavigationBackControl embedded />
            <p className="fs-kicker">{fsHero.eyebrow}</p>
          </div>
          <div className="fs-hero-bottom">
            <h1 id="fs-hero-title">{fsHero.title}</h1>
            <p data-testid="text-fs-hero-body">{fsHero.body}</p>
            <div className="fs-hero-actions">
              <BrandButton href={fsHero.primary.href} icon={<ArrowRight size={18} />} data-testid="button-fs-contact">{fsHero.primary.label}</BrandButton>
              <a className="fs-text-link" href={fsHero.secondary.href} data-testid="link-fs-examples">{fsHero.secondary.label} <ArrowDown size={15} aria-hidden="true" /></a>
            </div>
          </div>
        </div>
        <div className="fs-hero-image">
          <img src={assetUrl(fsHero.image)} alt={fsHero.imageAlt} />
        </div>
      </section>

      <section className="fs-section" aria-labelledby="fs-levels-title" data-slide={fsLevels.slide}>
        <FsSectionHead id="fs-levels-title" kicker="Adoption levels" title={fsLevels.title} intro={fsLevels.intro} />
        <FsLevelsTable />
        <p className="fs-note" data-testid="text-fs-target-note">{fsLevels.targetNote}</p>
      </section>

      <section className="fs-section alt" aria-labelledby="fs-areas-title" data-slide={fsAreas.slide}>
        <FsSectionHead id="fs-areas-title" kicker="Business areas" title={fsAreas.title} intro={fsAreas.intro} />
        <FsAreasTable />
        <p className="fs-note">{fsAreas.note}</p>
      </section>

      <section className="fs-section" aria-labelledby="fs-projects-title" data-slide={fsProjects.slide}>
        <FsSectionHead id="fs-projects-title" kicker="Starting projects" title={fsProjects.title} intro={fsProjects.intro} />
        <FsProjectsGrid />
      </section>

      <section className="fs-section alt" aria-labelledby="fs-credit-title">
        <FsSectionHead id="fs-credit-title" kicker={fsCredit.label} title={fsCredit.title} intro={fsCredit.intro} />
        <FsCreditFlow />
        <div style={{ marginTop: 56 }}>
          <h3 style={{ fontSize: 22, marginBottom: 18 }}>Who does each part of the work</h3>
          <FsTransferTable />
        </div>
      </section>

      <section className="fs-section" aria-labelledby="fs-voice-title-h" data-slide="11-12">
        <FsSectionHead id="fs-voice-title-h" kicker="Voice service" title={fsVoice.title} intro={fsVoice.intro} />
        <FsVoiceTable />
        <div className="fs-split">
          <div>
            <h3>How a call is handled</h3>
            <FsVoiceFlow />
          </div>
          <div>
            <h3>{fsVoice.launchTitle}</h3>
            <ul className="fs-launch" data-testid="list-fs-launch">
              {fsVoice.launch.map((l) => <li key={l.item}><strong>{l.item}</strong><span>{l.body}</span></li>)}
            </ul>
            <p className="fs-note" data-testid="text-fs-supplier-note">{fsVoice.supplierNote}</p>
          </div>
        </div>
      </section>

      <section className="fs-section alt" id="fs-examples" aria-labelledby="fs-cases-title" data-slide="13-14">
        <FsSectionHead id="fs-cases-title" kicker="Delivery examples" title={fsCases.title} intro={fsCases.intro} />
        <ol className="fs-cases">
          {fsCases.items.map((c) => (
            <li className="fs-case" key={c.id} data-testid={`case-fs-${c.id}`}>
              <h3>{c.client}</h3>
              <div><span className="fs-src">Problem</span><p>{c.problem}</p></div>
              <div><span className="fs-src">What was built</span><p>{c.built}</p></div>
              <div><span className="fs-src">Reported result</span><p className="fs-result">{c.result}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="fs-close" aria-labelledby="fs-close-title">
        <div>
          <p className="fs-kicker">Next step</p>
          <h2 id="fs-close-title">{fsClose.title}</h2>
          <p>{fsClose.body}</p>
          <BrandButton href={fsClose.cta.href} icon={<ArrowRight size={18} />} data-testid="button-fs-close-contact">{fsClose.cta.label}</BrandButton>
        </div>
        <div>
          <h3 style={{ fontSize: 20, marginBottom: 18 }}>Bring these to the first conversation</h3>
          <ul className="fs-check">{fsClose.checklist.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      </section>

      <section className="fs-research" aria-labelledby="fs-research-title">
        <p className="fs-kicker">Research context</p>
        <h2 id="fs-research-title" style={{ fontSize: 24, marginTop: 14 }}>Sources, checked {fsResearch.checked}</h2>
        <ol>
          {fsResearch.sources.map((s) => (
            <li key={s.id} data-testid={`source-fs-${s.id}`}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
              <span style={{ display: "block", marginTop: 6 }}>{s.finding}</span>
              <em>{s.caveat}</em>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
