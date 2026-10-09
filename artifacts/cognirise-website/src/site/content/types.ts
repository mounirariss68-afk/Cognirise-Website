/**
 * Content types for the code-owned public pages.
 *
 * Every public page is written from one of these records. The words are the
 * approved copy from the website redesign; components render them and add no
 * copy of their own.
 */

export type Cta = { label: string; href: string };

export type FigureTag = "Client result" | "Published elsewhere" | "Target";

export type PageMeta = {
  /** Browser title, 60 characters or fewer, ending in "| Cognirise". */
  title: string;
  /** Meta description, 70 to 155 characters. */
  description: string;
};

export type Hero = {
  /** Small label above the headline. */
  kicker?: string;
  title: string;
  lead: string;
  primary: Cta;
  secondary?: Cta;
  image?: { src: string; alt: string; caption?: string };
};

export type Step = {
  id: number;
  name: string;
  time: string;
  /** One line, used on the Home strip. */
  summary: string;
  weDo: string;
  youDo: string;
  youHave: string;
  accent: string;
  image: string;
  imageAlt: string;
  imagePosition?: string;
};

export type UseCaseRow = {
  task: string;
  aiDoes: string;
  personDecides: string;
  measured: string;
};

export type WorkflowLane = "system" | "ai" | "person";

export type WorkflowStep = {
  name: string;
  lane: WorkflowLane;
  /** The one sentence shown in the numbered list under the diagram. */
  text: string;
  owner: string;
  input: string;
  output: string;
  logged: string;
  /** The step where a person approves before anything takes effect. */
  approval?: boolean;
};

export type CaseCard = {
  title: string;
  body: string;
  tag: FigureTag;
  industry?: string;
};

export type EvidenceRow = {
  who: string;
  what: string;
  outcome: string;
  source: string;
  url?: string;
  tag: FigureTag;
};

export type StatTile = { figure: string; label: string; source: string };

export type Milestone = { period: string; what: string; source: string };

export type MarketEdition = {
  market: "uae" | "ksa" | "turkiye" | "europe";
  heading: string;
  lead: string;
  milestones: Milestone[];
  stats: StatTile[];
  candidateServices: string;
};

export type ClosingBand = {
  heading: string;
  body: string;
  cta: Cta;
  secondary?: Cta;
};

export type IndustryPage = {
  slug: string;
  name: string;
  path: string;
  meta: PageMeta;
  hero: Hero;
  useCases: UseCaseRow[];
  /** One sentence under the use-case table, where a measure needs a caveat. */
  useCaseNote?: string;
  workflow: { heading: string; steps: WorkflowStep[]; outro?: string };
  /** "What we have built" cards; the Education page uses "Related work". */
  built: { heading: string; intro?: string; cards: CaseCard[]; link: Cta };
  view: { heading: string; body: string; link?: Cta };
  evidence: { heading: string; rows: EvidenceRow[] };
  market: { heading: string; body: string };
  start: { heading: string; body: string; bring: string[] };
};
