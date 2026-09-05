export type ArchitectureComponent = { id: string; name: string; responsibility: string; details: string[]; engine?: string };
export type ArchitectureLayer = { id: string; number: string; name: string; responsibility: string; principle: string; controls: string[]; engine?: string; components: ArchitectureComponent[] };

const component = (id: string, name: string, responsibility: string, details: string[], engine?: string): ArchitectureComponent => ({ id, name, responsibility, details, engine });

export const architectureLayers: ArchitectureLayer[] = [
  { id: "experience", number: "06", name: "Experience layer", responsibility: "Everything a person sees or touches, designed around the operating context without becoming the source of business truth.", principle: "Makes the route understandable to the people who hold authority.", controls: ["Session context", "Input validation", "Visible decision states"], engine: "CogniTalk", components: [
    component("conversational-front-door", "Conversational front door", "Frames a contextual conversation between people and intelligence.", ["Thread and response patterns", "Attachment hand-off", "Feedback and correction capture"], "CogniTalk"),
    component("persona-portal", "Persona portal", "Organises requests, decisions and follow-up around a working role.", ["Role-aware navigation", "Request and approval views", "Domain workspaces"]),
    component("companion-touchpoints", "Companion touchpoints", "Extends selected interactions to the places where work happens.", ["Field interaction patterns", "Notification touchpoints", "Approval hand-offs"], "CogniTalk"),
    component("accessible-runtime", "Accessible interaction runtime", "Keeps interaction patterns usable across supported channels and contexts.", ["Layout and content tokens", "Accessibility patterns", "Interaction-quality checks"]),
    component("experience-api", "Experience API", "Composes contextual information for an experience without owning business truth.", ["Persona context", "Domain aggregation", "Notification preferences"])
  ]},
  { id: "intelligence", number: "05", name: "Intelligence layer", responsibility: "Reasons, retrieves and proposes structured work while leaving authoritative state changes to the process layer.", principle: "Prepares work with bounded agency; authority remains legible.", controls: ["Tool boundaries", "Run records", "Escalation paths"], engine: "CogniAgents", components: [
    component("orchestrator", "Orchestrator", "Routes intent, plans work and coordinates bounded tool use.", ["Intent routing", "Work-step budgets", "Recorded tool calls"], "CogniAgents"),
    component("specialist-roster", "Specialist agent roster", "Defines specialist roles, scope and working context.", ["Agent taxonomy", "Scoped capabilities", "Draft workspaces"], "CogniAgents"),
    component("retrieval-citation", "Retrieval & citation pipeline", "Connects responses to relevant evidence and context.", ["Query shaping", "Retrieval and re-ranking", "Citation binding"], "CogniDocs"),
    component("model-gateway", "Model gateway", "Provides a controlled boundary for model selection and prompt handling.", ["Provider abstraction", "Prompt versioning", "Metering and fallback patterns"], "CogniAgents"),
    component("guardrails", "Guardrails runtime", "Applies policy checks before and after intelligent work.", ["Input screening", "Output checks", "Human escalation signals"], "CogniAgents"),
    component("proactive-monitors", "Proactive monitors", "Surfaces conditions that call for review or prepared action.", ["Scheduled checks", "Event watching", "Alert preparation"])
  ]},
  { id: "process", number: "04", name: "Process layer", responsibility: "Owns state transitions, approvals and the explicit contract between a proposal and an authorised action.", principle: "Changes the world only through visible rules, authority and evidence.", controls: ["Role-validated transitions", "Approval boundaries", "Repeat-safe actions"], engine: "CogniWare", components: [
    component("workflow-engine", "Workflow engine", "Coordinates defined stages, transitions, timers and escalations.", ["Externalised workflow definitions", "Instance and state management", "Escalation and delegation patterns"]),
    component("approval-delegation", "Approval & delegation", "Makes decision authority and delegation explicit in the flow.", ["Approval-tier patterns", "Delegation context", "Multiple-reviewer rules"]),
    component("prepared-action", "Prepared-action executor", "Turns an approved proposal into a typed, traceable system action.", ["Typed action contracts", "Target adapters", "Repeat-safe and compensating patterns"], "CogniWare"),
    component("case-correspondence", "Case & correspondence", "Keeps the evidence, decisions and follow-up for a piece of work together.", ["Case context", "Task and follow-up views", "Decision records"]),
    component("process-catalog", "Process catalog", "Describes processes, ownership, controls and their relationship to agents and workflows.", ["Process hierarchy", "Ownership and control context", "Links to workflows and capabilities"]),
    component("notification-digest", "Notification & digest", "Coordinates relevant updates without making the notification channel authoritative.", ["Channel routing", "Scheduled digests", "Template governance"])
  ]},
  { id: "knowledge", number: "03", name: "Knowledge layer", responsibility: "Creates governed, retrievable projections of enterprise knowledge while keeping source records distinct.", principle: "Keeps useful context attributable, governed and rebuildable.", controls: ["Source attribution", "Access-aware retrieval", "Version awareness"], engine: "CogniDocs", components: [
    component("corpus-management", "Corpus management", "Brings documents and governed sources into a structured knowledge context.", ["Document intake", "Source registry", "Lifecycle and supersession context"], "CogniDocs"),
    component("chunking-indexing", "Chunking & indexing", "Creates retrievable representations that preserve useful document structure.", ["Structure-aware segmentation", "Metadata capture", "Search-index preparation"], "CogniDocs"),
    component("precedent-store", "Precedent & decision store", "Makes prior decisions available as reference context.", ["Decision context", "Rationale capture", "Similar-case retrieval"]),
    component("knowledge-capture", "Knowledge capture", "Turns working activity into reviewable institutional context.", ["Meeting-to-decision patterns", "Role and practice notes", "Review before publication"]),
    component("analytics-metrics", "Analytics & metrics", "Defines reusable measures and aggregations for operational insight.", ["Metric definitions", "Aggregation patterns", "Domain reporting views"]),
    component("ontology-master-data", "Ontology & master data", "Maintains shared terms, entities and cross-references for the operating context.", ["Enterprise vocabulary", "Code-list stewardship", "Identifier cross-reference"])
  ]},
  { id: "integration", number: "02", name: "Integration layer", responsibility: "Connects existing systems and services without allowing vendor schemas to define the enterprise.", principle: "Links intelligence to the enterprise without hiding the transaction boundary.", controls: ["Explicit contracts", "Traceable exchanges", "Controlled actions"], engine: "CogniWare", components: [
    component("api-gateway", "API gateway", "Creates a managed boundary between the architecture and connected systems.", ["Service interfaces", "Access mediation", "Request routing"], "CogniWare"),
    component("event-bus", "Event bus", "Carries events between work contexts and connected systems.", ["Event patterns", "Subscription boundaries", "Operational signals"], "CogniWare"),
    component("connectors", "Connector library", "Adapts enterprise systems into a consistent integration approach.", ["System adapters", "Data mappings", "Failure handling"], "CogniWare"),
    component("canonical-model", "Canonical model & translation", "Establishes shared meaning across connected work and vendor schemas.", ["Shared entities", "Translation rules", "Change stewardship"], "CogniWare"),
    component("id-cross-reference", "ID cross-reference & sync", "Reconciles identifiers and changes across connected systems.", ["Identifier mapping", "Change detection", "Conflict and reconciliation patterns"], "CogniWare")
  ]},
  { id: "foundation", number: "01", name: "Foundation layer", responsibility: "Provides authoritative records, identity, evidence, storage and the runtime boundaries beneath every other layer.", principle: "Provides the durable record and operating boundaries for every other layer.", controls: ["Identity context", "Evidence records", "Operational visibility"], components: [
    component("system-record", "System of record", "Holds the enterprise records that remain authoritative.", ["Transactional data", "Classification context", "Record integrity"]),
    component("identity-roles", "Identity, roles & personas", "Connects people, roles and entitlements to the operating context.", ["Role patterns", "Entitlement rules", "Delegation context"]),
    component("audit-evidence", "Audit & evidence", "Captures the information needed to understand how work moved.", ["Event records", "Decision evidence", "Retention patterns"]),
    component("storage", "Object & document storage", "Maintains attached material and supporting artefacts.", ["Document storage", "Classification tags", "Evidence handling"]),
    component("platform-services", "Platform services", "Supplies the shared services that support operation and observation.", ["Jobs and queues", "Observability patterns", "Configuration stewardship"]),
    component("security-boundaries", "Security boundaries", "Defines how identity, network, key and recovery decisions are shaped for an environment.", ["Key and encryption patterns", "Network and service boundaries", "Recovery planning"])
  ]}
];

export const architectureSpines = [
  { id: "assurance", number: "A", name: "AI governance & assurance", description: "The control plane that travels with the work across all six layers.", components: ["Policy & authority registry", "AI registry & evaluation", "Assurance event pipeline", "Explainability & citation audit", "Control mapping"] },
  { id: "operations", number: "B", name: "Platform engineering & operations", description: "The engineering discipline that keeps the route observable and adaptable.", components: ["Observability", "Delivery & infrastructure practice", "Model operations", "Cost stewardship", "Resilience planning"] }
];

export const findLayer = (id?: string | null) => architectureLayers.find((layer) => layer.id === id) ?? architectureLayers[0];