import { ArrowDown } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { ArchitectureStage } from "@/components/cognios/ArchitectureStage";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import { PlatformsHeroMedia } from "@/components/platforms/platforms-hero-media";
import "./CogniOSPlatform.css";

const proof = ["Full lifecycle governance", "Performance management", "Scheduling & orchestration", "On-prem AI/ML ops", "App builder"];

const capabilities = [
  { title: "Lifecycle governance", body: "Every agent and workflow moves through a controlled lifecycle: design, review, approval, deployment, monitoring and retirement. Versioning, role-based sign-off and a central agent registry mean you always know what is running, who owns it and why it was approved." },
  { title: "Performance management", body: "Track each agent against business KPIs, answer quality, task completion, latency and cost per run. Built-in evaluation catches regressions and drift before users do, and dashboards show value delivered per function." },
  { title: "Scheduling and orchestration", body: "Run workflows on schedules, on events or on demand. CogniOS handles queues, retries, dependencies between agents and handovers to human reviewers, so multi-step processes run reliably at scale." },
  { title: "AI/ML ops on your infrastructure", body: "Serve, version and monitor models on your own hardware or private cloud. A model registry, GPU scheduling, open-weight model deployment, fine-tuning pipelines and evaluation runs keep your AI stack sovereign and under control." },
  { title: "Spawn new applications", body: "Compose new AI apps from CogniBase knowledge sources, CogniAgents workflows and ready-made interface templates. What used to be a months-long project becomes a configurable build." },
  { title: "Control and audit", body: "Central policies set which data, tools and actions each agent can use. Full audit trails, risk classification per use case and an instant kill switch support oversight under the EU AI Act and internal governance." },
];

const lifecycle = [
  { title: "Design.", body: "Define the workflow, data sources, tools and human checkpoints, starting from a CogniAgents template or from scratch." },
  { title: "Approve.", body: "Risk owners review scope, data access and risk class before anything goes live." },
  { title: "Deploy.", body: "Release to a schedule, an event trigger or an interface, with version control and rollback." },
  { title: "Monitor.", body: "Track quality, cost, usage and KPIs continuously, with alerts on drift or failure." },
  { title: "Improve.", body: "Evaluate changes against test sets, then promote new versions with a full record." },
  { title: "Retire.", body: "Decommission agents cleanly, with their history preserved for audit." },
];

const family = [
  { title: "CogniBase", body: "CogniBase connects AI to your documents, data and systems with grounded, cited answers." },
  { title: "CogniAgents", body: "CogniAgents deliver function-specific workflows with best practices built in." },
  { title: "CogniOS", body: "CogniOS governs, schedules, runs and scales them, and turns them into new applications." },
];

const audiences = [
  { title: "CIOs and CTOs", body: "CIOs and CTOs get one view of every AI system in the organisation, with its cost and value." },
  { title: "Risk and compliance teams", body: "Risk and compliance teams get approvals, risk classification and audit trails in one place." },
  { title: "AI and platform teams", body: "AI and platform teams get model serving, scheduling and monitoring without stitching tools together." },
  { title: "Business owners", body: "Business owners get faster delivery of new AI use cases, built on components that are already proven." },
];

const deployments = [
  { title: "On-premises.", body: "Fully isolated, with models running on your own GPUs." },
  { title: "Private cloud.", body: "Deployed into your own cloud tenant." },
  { title: "Managed EU cloud.", body: "Operated for you in European regions." },
];

const questions = [
  { title: "Do we need CogniBase and CogniAgents to use CogniOS?", body: "No. CogniOS can govern and monitor existing agents too, but it delivers the most value with the full Cogni stack." },
  { title: "Which models can we run?", body: "Open-weight models on your own hardware, commercial models via API, or both, all managed in one registry." },
  { title: "How does CogniOS support the EU AI Act?", body: "Through an agent inventory, risk classification, human oversight controls, logging and documentation for every use case. It supports your obligations rather than replacing your compliance process." },
  { title: 'What does "spawning an app" mean in practice?', body: "You combine a knowledge source, one or more agent workflows and an interface template into a new application, configured rather than coded from zero." },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="co-eyebrow">{children}</span>;
}

export default function CogniOSPlatform() {
  return (
    <main className="co-page">
      <section className="co-hero co-frame public-hero-shell" aria-labelledby="co-title">
        <div className="co-hero-grid">
          <div className="co-hero-copy">
            <div className="co-hero-top">
              <NavigationBackControl embedded />
              <Eyebrow>Products / CogniOS</Eyebrow>
            </div>
            <div className="co-hero-narrative">
            <h1 id="co-title" className="co-heading">The operating system for <span>enterprise AI.</span></h1>
            <p>CogniOS manages the full lifecycle of your agentic workflows, from design and approval to scheduling, monitoring and retirement. It runs your models on your own infrastructure and lets you spawn new AI applications from the Cogni toolset in days.</p>
            <div className="co-actions">
              <BrandButton href="/contact" data-testid="link-cognios-demo-hero">Book a demo</BrandButton>
              <a href="#architecture" className="co-jump" data-testid="link-cognios-architecture">See the architecture <ArrowDown size={16} aria-hidden="true" /></a>
            </div>
            </div>
          </div>
          <div className="co-hero-art co-hero-film" aria-hidden="true">
            <PlatformsHeroMedia />
          </div>
        </div>
        <div className="co-proof" aria-label="CogniOS at a glance">
          {proof.map(item => <span key={item}><i aria-hidden="true" />{item}</span>)}
        </div>
      </section>

      <section className="co-problem co-frame" aria-labelledby="co-problem-title">
        <div><Eyebrow>The problem</Eyebrow><h2 id="co-problem-title" className="co-heading">The first AI agent is easy. The twentieth is where it breaks down.</h2></div>
        <div className="co-problem-copy">
          <p>Agents get built in silos with no shared inventory, no owner and no approval trail. Nobody can say which agents are running, what they cost or whether they still perform. Models sit on scattered servers without monitoring. And every new use case starts from scratch.</p>
          <strong>CogniOS gives AI the same operational discipline you expect from any other enterprise system.</strong>
        </div>
      </section>

      <section className="co-capabilities" aria-labelledby="co-capabilities-title">
        <div className="co-frame">
          <div className="co-section-intro"><div><Eyebrow>CogniOS</Eyebrow><h2 id="co-capabilities-title" className="co-heading">Core capabilities</h2></div></div>
          <div className="co-cap-list">
            {capabilities.map((item, index) => <article className="co-cap" key={item.title}><span>{String(index + 1).padStart(2, "0")} / 06</span><h3>{item.title}</h3><p>{item.body}</p></article>)}
          </div>
        </div>
      </section>

      <section className="co-lifecycle co-frame" aria-labelledby="co-life-title">
        <div className="co-section-intro"><div><Eyebrow>From design to retirement</Eyebrow><h2 id="co-life-title" className="co-heading">The agent lifecycle</h2></div></div>
        <div className="co-life-track">
          {lifecycle.map((item, index) => <article className="co-life-step" key={item.title}><span>{String(index + 1).padStart(2, "0")} / 06</span><h3>{item.title}</h3><p>{item.body}</p></article>)}
        </div>
      </section>

      <section className="co-architecture" id="architecture" aria-labelledby="co-arch-title">
        <div className="co-frame">
          <div className="co-section-intro"><div><Eyebrow>Reference architecture</Eyebrow><h2 id="co-arch-title" className="co-heading">Explore the operating system.</h2></div></div>
          <ArchitectureStage />
        </div>
      </section>

      <section className="co-family" aria-labelledby="co-family-title">
        <div className="co-frame">
          <Eyebrow>Cogni product family</Eyebrow>
          <h2 id="co-family-title" className="co-heading">One platform, three layers</h2>
          <div className="co-family-map">
            <span>Connected by design</span>
            <div className="co-family-rows">{family.map(item => <div className="co-family-row" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></div>)}</div>
          </div>
          <p className="co-family-note">Start with any layer. CogniOS brings them together as your AI estate grows.</p>
        </div>
      </section>

      <section className="co-audiences co-frame" aria-labelledby="co-audience-title">
        <div className="co-section-intro"><div><Eyebrow>Teams and leaders</Eyebrow><h2 id="co-audience-title" className="co-heading">Who it's for</h2></div></div>
        <div className="co-audience-list">{audiences.map(item => <article className="co-audience" key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
      </section>

      <section className="co-deploy" aria-labelledby="co-deploy-title">
        <div className="co-frame">
          <div className="co-section-intro"><div><Eyebrow>Your infrastructure</Eyebrow><h2 id="co-deploy-title" className="co-heading">Deployment options</h2></div></div>
          <div className="co-deploy-list">{deployments.map((item, index) => <article className="co-deploy-row" key={item.title}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div>
        </div>
      </section>

      <section className="co-faq co-frame" aria-labelledby="co-faq-title">
        <div><Eyebrow>Questions</Eyebrow><h2 id="co-faq-title" className="co-heading">FAQ</h2></div>
        <div className="co-faq-list">{questions.map((item, index) => <article className="co-faq-item" key={item.title} data-testid={`faq-cognios-${index + 1}`}><span>0{index + 1}</span><div><h3>{item.title}</h3><p>{item.body}</p></div></article>)}</div>
      </section>

      <section className="co-close" aria-labelledby="co-close-title">
        <div className="co-close-inner co-frame">
          <Eyebrow>CogniOS</Eyebrow>
          <h2 id="co-close-title" className="co-heading">Run AI like the rest of your enterprise.</h2>
          <p>Governed, measured, scheduled and on your own terms.</p>
          <BrandButton href="/contact" data-testid="link-cognios-demo-closing">Book a demo</BrandButton>
          <div className="co-close-foot">CogniOS / Cognirise</div>
        </div>
      </section>
    </main>
  );
}