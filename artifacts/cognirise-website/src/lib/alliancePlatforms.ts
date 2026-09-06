export type AlliancePlatform = {
  slug: "lupitor" | "datatoolpack" | "bunjee-ai";
  name: string;
  eyebrow: string;
  headline: string;
  summary: string;
  problem: string;
  mechanism: string;
  heroImage: string;
  heroAlt: string;
  facts: Array<{ value: string; label: string; sourceUrl: string }>;
  workflow: Array<{ label: string; title: string; description: string }>;
  differentiators: Array<{ title: string; description: string }>;
  contribution: string;
  sources: Array<{ label: string; url: string; supports: string }>;
  verifiedOn: string;
  meta: { title: string; description: string; socialImage: string };
};

export const ALLIANCE_PLATFORMS: Record<AlliancePlatform["slug"], AlliancePlatform> = {
  lupitor: {
    slug: "lupitor",
    name: "Lupitor",
    eyebrow: "Alliance platform / Conversational AI",
    headline: "Customer conversations, operated with control.",
    summary: "Lupitor is an enterprise platform for building, deploying and operating verified AI agents across voice, chat, email, SMS and WhatsApp.",
    problem: "Customer conversations happen at volume, across languages and channels, where an incorrect answer can become a service, trust or regulatory event. The operating requirement is not simply fluent conversation—it is a system teams can deploy, verify and supervise.",
    mechanism: "Lupitor connects enterprise knowledge, policies and systems to conversational agents, then applies verification before an answer reaches the customer. One agent can carry context across supported channels and operate in the language the customer uses.",
    heroImage: "/images/cognirise/alliance-lupitor.jpg",
    heroAlt: "A human figure facing luminous conversation paths as they pass through a series of verification gates.",
    facts: [
      { value: "99+", label: "languages listed by Lupitor", sourceUrl: "https://www.lupitor.com/" },
      { value: "5", label: "channels: voice, chat, email, SMS and WhatsApp", sourceUrl: "https://www.lupitor.com/" },
      { value: "3", label: "custody choices: cloud, sovereign cloud and air-gapped", sourceUrl: "https://www.lupitor.com/" },
    ],
    workflow: [
      { label: "01 / Ground", title: "Connect trusted knowledge", description: "Link files, knowledge bases, databases and APIs so the agent works from the enterprise source of truth." },
      { label: "02 / Define", title: "Set policies and actions", description: "Define how the agent should behave and connect it to the systems needed to complete approved work." },
      { label: "03 / Verify", title: "Check before delivery", description: "Run responses through verification layers before they reach the customer, with transcripts and escalations available for oversight." },
      { label: "04 / Operate", title: "Deploy to the required boundary", description: "Use Lupitor-managed cloud, sovereign or in-country infrastructure, or a fully air-gapped environment with no public internet dependency." },
    ],
    differentiators: [
      { title: "One context across channels", description: "Voice, chat, email, SMS and WhatsApp can share the same agent context rather than becoming separate conversational silos." },
      { title: "Deployment follows data custody", description: "The same platform proposition extends from managed cloud to sovereign cloud and fully air-gapped infrastructure." },
      { title: "Verification is part of operation", description: "Lupitor describes every answer as checked against the enterprise source of truth before customer delivery." },
    ],
    contribution: "Cognirise frames the operating journey, integrates Lupitor with enterprise systems and CogniOS workflows, and designs the governance, escalation and human-authority boundaries around its use. Lupitor remains the product owner.",
    sources: [
      { label: "Lupitor product overview", url: "https://www.lupitor.com/", supports: "Platform proposition, channels, 99+ languages, verification and three deployment choices." },
      { label: "Government & public sector", url: "https://www.lupitor.com/industries/government-public-sector", supports: "Air-gapped deployment inside the customer environment with no public internet dependency." },
    ],
    verifiedOn: "6 September 2026",
    meta: {
      title: "Lupitor Conversational AI Alliance | Cognirise",
      description: "Explore Lupitor’s verified multilingual, multichannel AI agents and cloud, sovereign cloud and air-gapped deployment with Cognirise integration.",
      socialImage: "/images/cognirise/alliance-lupitor.jpg",
    },
  },
  datatoolpack: {
    slug: "datatoolpack",
    name: "Datatoolpack AutoData",
    eyebrow: "Alliance platform / Data preparation",
    headline: "Raw data, prepared for AI.",
    summary: "AutoData automates the profiling, cleaning, transformation and feature preparation needed to turn raw datasets into structured, AI-ready outputs.",
    problem: "Machine-learning and analytics teams lose momentum when missing values, inconsistent formats, anomalies and unprocessed features turn preparation into repeated manual work. The dataset needs a visible, repeatable route from intake to usable output.",
    mechanism: "Teams bring data into AutoData, choose and configure a preparation pipeline, run automated processing, and export the resulting AI-ready dataset with stage outputs and a pipeline report.",
    heroImage: "/images/cognirise/alliance-datatoolpack.jpg",
    heroAlt: "Irregular translucent data fragments moving through luminous processing planes and emerging as a structured dataset.",
    facts: [
      { value: "30+", label: "native connectors listed across data sources", sourceUrl: "https://datatoolpack.com/" },
      { value: "3", label: "supported upload formats: CSV, JSON and Parquet", sourceUrl: "https://datatoolpack.com/" },
      { value: "1 route", label: "from profiling to AI-ready export", sourceUrl: "https://autodata.datatoolpack.com/" },
    ],
    workflow: [
      { label: "01 / Profile", title: "Understand the dataset", description: "Inspect structure, quality, missing values and distributions before preparation decisions are applied." },
      { label: "02 / Prepare", title: "Clean and transform", description: "Standardize formats, handle missing data, numericalize values, reduce noise and prepare useful features." },
      { label: "03 / Detect", title: "Surface anomalies", description: "Identify outliers and unusual patterns as part of the automated preparation pipeline." },
      { label: "04 / Export", title: "Deliver an auditable output", description: "Export AI-ready datasets, stage-level CSV files and a report documenting transformations and runtime." },
    ],
    differentiators: [
      { title: "Preset pipeline automation", description: "Multiple preparation steps can run through configured workflows rather than disconnected point tools." },
      { title: "Connectors at the intake edge", description: "AutoData lists native connectors across databases, warehouses, storage, streaming and SaaS alongside file upload." },
      { title: "Outputs retain the preparation story", description: "Stage files and a pipeline report make the path from raw input to prepared output more visible." },
    ],
    contribution: "Cognirise identifies the data product and quality boundary, connects AutoData to the relevant source and destination systems, and places its outputs inside governed analytics, model and CogniOS delivery workflows. Datatoolpack remains the product owner.",
    sources: [
      { label: "Datatoolpack AutoData overview", url: "https://datatoolpack.com/", supports: "Profiling, cleaning, feature engineering, anomaly detection, pipeline automation, AI-ready export and 30+ connectors." },
      { label: "AutoData pipeline", url: "https://autodata.datatoolpack.com/", supports: "Pipeline stages, transformations, stage CSV outputs and pipeline report." },
    ],
    verifiedOn: "6 September 2026",
    meta: {
      title: "Datatoolpack AutoData Alliance | Cognirise",
      description: "Explore automated data profiling, cleaning, transformation, anomaly detection, pipeline automation and AI-ready export through AutoData.",
      socialImage: "/images/cognirise/alliance-datatoolpack.jpg",
    },
  },
  "bunjee-ai": {
    slug: "bunjee-ai",
    name: "bunjee.ai",
    eyebrow: "Alliance platform / Organizational intelligence",
    headline: "Scale how your best people think.",
    summary: "bunjee.ai captures how experts and leaders think, structures that knowledge into an organizational intelligence layer, and deploys it where teams need it.",
    problem: "Scarce experts become queues for decisions, reviews and explanations. Important judgment stays trapped in conversations, documents and individual availability instead of becoming a living capability the organization can use.",
    mechanism: "Bunjee captures conversations, videos, documents and processes, structures the material into an intelligence layer, and deploys the relevant expertise into recruitment, onboarding, communication, assessment and training.",
    heroImage: "/images/cognirise/alliance-bunjee.jpg",
    heroAlt: "An expert in a luminous workspace connected by subtle knowledge threads to teams across the organization.",
    facts: [
      { value: "5", label: "applications on one intelligence layer", sourceUrl: "https://www.bunjee.ai/" },
      { value: "30+", label: "languages listed for AI-led interviews", sourceUrl: "https://www.bunjee.ai/" },
      { value: "3 steps", label: "capture, structure and deploy", sourceUrl: "https://www.bunjee.ai/" },
    ],
    workflow: [
      { label: "01 / Capture", title: "Learn from the experts", description: "Collect knowledge from conversations, videos, documents and the processes used by experienced people." },
      { label: "02 / Structure", title: "Create a living intelligence layer", description: "Organize and understand the captured material so expertise can be found and applied consistently." },
      { label: "03 / Deploy", title: "Put expertise into the work", description: "Make the right organizational knowledge available in the moment and application where teams need it." },
    ],
    differentiators: [
      { title: "One layer, multiple people journeys", description: "The same organizational intelligence proposition supports recruitment, onboarding, communication, assessment and training." },
      { title: "Knowledge extends beyond documents", description: "Capture includes conversations, videos and processes as well as existing written material." },
      { title: "Hiring decisions retain rationale", description: "The recruitment flow describes consistent rubrics, ranked shortlists, transcripts and supporting rationale." },
    ],
    contribution: "Cognirise defines where expert judgment should become reusable, designs the authority and access model, and integrates bunjee.ai into people, knowledge and CogniOS workflows. bunjee.ai remains the product owner.",
    sources: [
      { label: "bunjee.ai organizational intelligence overview", url: "https://www.bunjee.ai/", supports: "Capture–structure–deploy model, five applications, recruitment workflow and 30+ interview languages." },
    ],
    verifiedOn: "6 September 2026",
    meta: {
      title: "bunjee.ai Organizational Intelligence Alliance | Cognirise",
      description: "Explore how bunjee.ai captures expert knowledge and deploys organizational intelligence across hiring, onboarding, communication, assessment and training.",
      socialImage: "/images/cognirise/alliance-bunjee.jpg",
    },
  },
};

export const ALLIANCE_PLATFORM_LIST = Object.values(ALLIANCE_PLATFORMS);