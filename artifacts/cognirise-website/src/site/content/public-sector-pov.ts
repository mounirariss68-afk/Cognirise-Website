import type { Cta } from "./types";

/**
 * The public-sector point of view, "The AI-native government", in four market
 * editions. The Public Sector page carries the test, the six elements, where
 * the market stands, the card and the delivery order; this long read carries
 * what changes, the benefits the evidence supports, and the sources.
 */
export type PovBlock =
  | { kind: "p"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "table"; columns: string[]; rows: string[][]; caption: string }
  | { kind: "note"; text: string };

export type PovChapter = { num: string; title: string; blocks: PovBlock[] };
export type PovSource = { label: string; url: string; note: string };
export type PovMarket = "uae" | "ksa" | "turkiye" | "europe";

export type PovEdition = {
  market: PovMarket;
  label: string;
  /** Market-specific sentence that closes the lead. */
  leadClose: string;
  /** Market-specific rows for the "which services" table in chapter 3. */
  triggerRows: string[][];
  /** Chapter 5, the language chapter, differs by market. */
  language: PovBlock[];
  /** Chapter 6, the rules, differs by market. */
  rules: PovBlock[];
  /** How the four benefits apply in this market. */
  applicability: string;
  sources: PovSource[];
};

export const POV_META = {
  kicker: "Point of view",
  title: "The AI-native government",
  lead: "Most governments use AI. Almost none is AI-native: a service where the state notices what a citizen needs, does the work it already can, prepares the outcome, and a person confirms it. This long read sets out what changes when a government takes that step, and what the evidence supports.",
  primary: { label: "Book a Value Scan", href: "/value-scan" } as Cta,
  secondary: { label: "Back to Public Sector", href: "/industries/public-sector" } as Cta,
  image: { src: "/images/cognirise/industries/pulse-industry-public-sector-services.png", alt: "A public service hall redrawn as a sequence of confirmed steps, with people and screens side by side." },
  editionsLabel: "Editions",
  pointer: "The test, the six elements, where each market stands and the delivery order are on the"
};

export const EU_TIMETABLE: PovBlock = {
  kind: "table",
  caption: "The EU AI Act dates that matter to a public body",
  columns: ["Date", "What", "Detail"],
  rows: [
    ["2 August 2026", "Transparency", "A person must be told they are dealing with an AI system from the start. Article 50, in force and not deferred."],
    ["2 December 2027", "High-risk duties", "Full obligations where AI decides eligibility for essential public services: impact assessment, human oversight, logging, registration. Annex III, point 5."],
    ["2 August 2030", "No exemption for public bodies", "AI already in use by a public authority must comply. Private legacy systems are exempt unless they change materially. Public ones are not. Article 111(2)."],
  ],
};

const EU_TIMETABLE_NOTE: PovBlock = {
  kind: "note",
  text: "Dates from Regulation (EU) 2024/1689 as amended by Regulation (EU) 2026/1744, published on 24 July 2026. The high-risk duties were deferred by about sixteen months. They were not weakened.",
};

/** The chapters that read the same in every edition. Chapter 3's table rows, chapter 5 and chapter 6 come from the edition. */
export function povChapters(edition: PovEdition): PovChapter[] {
  return [
    {
      num: "01",
      title: "Conversation opens the service. A structured object completes it.",
      blocks: [
        { kind: "p", text: "Conversational access will become normal. It will not replace the transaction. The difference decides where the money goes." },
        { kind: "ul", items: [
          "The head of the distribution, renew, pay, check status, upload, is high volume, well understood and already well served by forms. A dialogue turn there adds time and cost and nothing else.",
          "The tail, ambiguous, cross-departmental, \"which of these applies to me\", is where navigation has always failed and where conversation changes the outcome.",
        ] },
        { kind: "p", text: "So the business case is not conversation against forms. It is conversation against the phone call that a failed digital journey generates. Rank services by call volume relative to transaction volume and start at the top." },
      ],
    },
    {
      num: "02",
      title: "What we mean by \"the card\".",
      blocks: [
        { kind: "p", text: "An action card is a structured, interactive object that the service returns into the conversation. Its fields carry their own validation and are pre-filled with what the state already holds. It states what the citizen is agreeing to, and one button commits it. Five bands, in order:" },
        { kind: "ul", items: [
          "Identity and context: who this is for and what it concerns, resolved rather than retyped.",
          "Pre-filled from the register: what the state already holds, shown so it can be corrected.",
          "Changes only, validated: just what is different, each field with its own rule and error message.",
          "The consequence, computed: fee, entitlement, date or outcome, shown before commitment.",
          "The declaration, then one action: what the citizen attests to, and a single button.",
        ] },
        { kind: "p", text: "The formats already exist. Adaptive Cards is a declarative card format rendered by the host application. MCP Apps (SEP-1865, November 2025) lets a host review a template before it runs. WhatsApp Flows, RCS and Apple Messages for Business render multi-field forms inside a conversation." },
        { kind: "p", text: "Why the object matters to a government: a transcript records what was said. When a citizen later asks why a decision went the way it did, the useful record is what they were shown. That means the options, the checked fields, and what sat above the button they pressed. A structured submission can be shown again at any point. A transcript cannot reproduce it." },
        { kind: "p", text: "One architectural rule follows. The card is rendered by the trusted system, not written by the model. The model chooses which card and which fields; the register fills them. That keeps personal data out of the prompt, stops a compromised model from inventing a convincing declaration, and keeps the record of what the citizen saw under the state's control." },
      ],
    },
    {
      num: "03",
      title: "The state takes the first step, for a definable class of service.",
      blocks: [
        { kind: "p", text: "The class can be defined, and a government should define it before a programme starts rather than case by case during one. A service qualifies when all four are true:" },
        { kind: "ul", items: [
          "The facts that decide entitlement are already held by the state, in an authoritative register.",
          "Those facts are correct at the level of detail, and for the period, that the decision requires.",
          "The decision is an award, not a liability or a reduction.",
          "If it is wrong, the error is visible and can be put right.",
        ] },
        { kind: "p", text: "An offer the citizen confirms is safe and lawful. An adverse decision applied automatically on inferred data is the failure behind the best-known failures in this field. That is a rule to write down before the programme starts, not a technical setting." },
        { kind: "table", caption: "Which services this means", columns: ["Trigger", "Services", "In practice", "Mode"], rows: edition.triggerRows },
        { kind: "note", text: "A: awarded automatically. B: a pre-filled offer the citizen confirms. C: notified once and passed on." },
        { kind: "p", text: "A test worth running on your own catalogue: name a benefit whose eligibility turns only on age. The state knows every citizen's date of birth exactly. If that benefit still requires an application, the barrier is not data, and it falls hardest on the people least able to clear it." },
        { kind: "p", text: "A note on the word \"predictive\". Proactive services are often described as predicting when a citizen will need something. Every working example triggers on a fact that has been registered: a birth recorded, an income filed. Detect events; do not forecast needs." },
      ],
    },
    {
      num: "04",
      title: "The assistant arrives, and the question is whose.",
      blocks: [
        { kind: "p", text: "Within this period, a large share of citizens in digitally mature states will reach government through a conversational agent. The question is not whether that happens. It is whose agent it is, and most governments are answering by default rather than by decision. There are four options, and they are not exclusive." },
        { kind: "table", caption: "Four options for the assistant", columns: ["Option", "What it means", "When it applies"], rows: [
          ["Build", "A first-party government assistant", "Where the state can run it; needed anyway for authenticated transactions"],
          ["Publish", "A machine-reachable service surface any authorised agent can call", "Almost always; it is what makes the first-party assistant work too"],
          ["Partner", "Deliver inside a private platform with population reach", "Where reach cannot be achieved otherwise, accepting the dependency"],
          ["Regulate", "Conditions on assistants that mediate public services: accuracy disclosure, liability, no unauthorised transactions", "Necessary whatever else is chosen; we have not found a government that has done it"],
        ] },
        { kind: "p", text: "The missing piece for all four is delegation. That means proof that a named person authorised a named agent to take a named action, with a scope, an expiry and a way to revoke it. Versions for human intermediaries work at scale in several countries. We have not found a national digital identity that lets a citizen authorise a software agent in that way." },
        { kind: "p", text: "It is worth building for a reason beyond agents. A carer acting for a parent, an accountant for a business and an advice worker for a claimant need the same thing as an AI agent acting for a citizen. The assisted-access problem and the agent problem are one problem, and one piece of infrastructure serves both." },
      ],
    },
    {
      num: "05",
      title: "Language is an engineering constraint, not a translation task.",
      blocks: edition.language,
    },
    {
      num: "06",
      title: "The rules that will shape this, and where they come from.",
      blocks: edition.rules,
    },
  ];
}

export const POV_IMPACT = {
  heading: "Three of the four real benefits are not cost reduction.",
  lead: "What the evidence supports, and how much of it applies in each market.",
  benefits: [
    { title: "Take-up", body: "Proactive delivery closes the gap between who is entitled and who claims. It is the largest single citizen benefit available, and it increases spending." },
    { title: "Consistency", body: "Rules as code remove variation between offices and officials. A policy change takes effect at once and can be tested, instead of a year of retraining." },
    { title: "Compressed variance", body: "A field study of 5,172 support agents given an AI assistant (Brynjolfsson, Li and Raymond, 2025) found output up by about a third for the newest staff. The most experienced saw little effect. It is a private-sector analogue. In casework and first-line advice, the value is bringing new staff to competence faster." },
    { title: "Speed", body: "The wait between application and decision disappears where the state already holds the facts. Processing measured in hours has fallen to seconds in live proactive services." },
  ],
  timeHeading: "Why time saved is not money saved",
  time: "Humlum and Vestergaard's study of some 25,000 Danish workers in eleven exposed occupations (2025) found self-reported time savings and no measurable effect on earnings or hours. About one worker in twelve reported entirely new tasks created by the tools. The likely mechanism, still a hypothesis, is that saved time is absorbed by checking and review before it reaches a budget line. Measure the new work as carefully as the saved work.",
  caseHeading: "The business case to make, and the one to avoid",
  caseBody: "For conversational services, build the case on first-time-right completion, fewer errors and fewer calls to the contact centre. Not on deflection, and not on headcount. For proactive services, say the arithmetic at the outset. This costs more; it reaches the people the law intended to reach; and it lowers the cost of serving the people it already reached.",
  caseNote: "A business case that shows a large net saving from proactive delivery is almost certainly counting money recovered from citizens.",
  measureHeading: "The measurement problem",
  measure: "We could not find a government cost-per-transaction dataset by channel published since 2012. Nor a published resolution rate for a named government conversational service, nor a controlled comparison of conversational entry against forms. A government that commissions its own baseline in the first quarter of an AI programme will be the only party able to say whether it worked. One metric to refuse: containment, or deflection. It measures a citizen failing to reach a person.",
};

export const POV_CLOSING = {
  heading: "Start where the registers already reach",
  body: "Bring one high-friction journey and the people who answer for it. In a one-day Value Scan we work out which of the four conditions it meets, what it needs, and what it would be worth.",
  cta: { label: "Book a Value Scan", href: "/value-scan" } as Cta,
  secondary: { label: "Back to Public Sector", href: "/industries/public-sector" } as Cta,
};

export const POV_SOURCES_HEADING = "Sources";
export const POV_SOURCES_LEAD = "Checked on 7 October 2026. Each figure is attributed to the body that published it. Foreign examples are marked as such and used for the evidence pattern only.";

const SHARED_SOURCES: PovSource[] = [
  { label: "OECD Observatory of Public Sector Innovation, Estonia's proactive family benefits", url: "https://oecd-opsi.org/innovations/proactive-family-benefits/", note: "Estonia, abroad: processing time and the share who had previously applied." },
  { label: "Brynjolfsson, Li and Raymond, Generative AI at Work (Quarterly Journal of Economics, 2025)", url: "https://arxiv.org/abs/2304.11771", note: "The field study of 5,172 support agents; a private-sector analogue." },
  { label: "Humlum and Vestergaard, Large Language Models, Small Labor Market Effects (2025)", url: "https://www.nber.org/papers/w33777", note: "Time savings reported by users with no measurable effect on earnings or hours." },
];

const ARABIC_TABLE: PovBlock = {
  kind: "table",
  caption: "Measured accuracy of 19 models on identical translated questions",
  columns: ["Language", "Measured"],
  rows: [["English", "62.8%"], ["Modern Standard Arabic", "51.9%"], ["Emirati", "49.8%"], ["Egyptian", "48.9%"], ["Saudi", "48.2%"], ["Moroccan", "45.0%"]],
};

const UAE: PovEdition = {
  market: "uae",
  label: "United Arab Emirates",
  leadClose: "This is the UAE edition.",
  triggerRows: [
    ["Birth", "Family allowance, child benefit, registration bundle", "Abu Dhabi built a \"starting a family\" bundle across entities in 2022. Abroad, Estonia sends an offer to confirm.", "A · B"],
    ["Age", "Pension award, concessionary travel, school enrolment", "The state knows the date of birth exactly. An application adds no information.", "A"],
    ["Income", "Pre-filled tax returns, social tariffs, means-tested support", "Abroad, Portugal awards its social energy tariff automatically from a tax match.", "A · B"],
    ["Expiry", "Licence, permit and document renewal", "ICP's Taqdeer package (December 2025) renews passports and Emirates IDs for enrolled citizens before expiry.", "B · A"],
    ["Death", "Tell-us-once, survivor benefits, estate notification", "Abu Dhabi's bereavement bundle (2022): one notification, passed on.", "C · B"],
    ["Business", "Licence renewal, pre-filled returns, inspections", "Ajman (July 2026): a pre-expiry notice opens the renewal, the agent checks the lease, the customer confirms.", "B"],
  ],
  language: [
    { kind: "p", text: "Every published accuracy figure for government AI is an English-language figure. The drop in Arabic is large, and it depends on the model chosen." },
    ARABIC_TABLE,
    { kind: "note", text: "Gulf dialects perform best of the five tested; Emirati is the strongest." },
    { kind: "p", text: "Tool-calling degrades in Arabic even when the tools are described in English. Accuracy drops 5 to 10% when the citizen writes in Arabic, whichever language the tool descriptions use. That is what an agentic service does: look up a record, check eligibility, file a form. Keeping the back end in English does not fix it." },
    { kind: "ul", items: [
      "Citizens do not write in Modern Standard Arabic. They write in dialect, switch languages and transliterate. Build the evaluation set from real citizen queries.",
      "Arabic-specific is not automatically better. Published benchmarks show large general models matching or beating smaller Arabic-specific ones. Choose on measured performance.",
      "Arabic is the official language under Article 7 of the Constitution. Settle in policy which language version of an automated decision governs, before the first decision.",
    ] },
  ],
  rules: [
    { kind: "p", text: "Two regimes matter to a UAE entity: the UAE's own, and the EU's, which reaches further than most assume." },
    { kind: "h3", text: "In the UAE" },
    { kind: "ul", items: [
      "Federal entities work through standards, procurement and the AI Ethics Principles; Federal Decree-Law 45 of 2021 applies outside government.",
      "The Federal Authority for Artificial Intelligence and Data (June 2026) merges the AI Office, TDRA's digital government sector and the Emirates Data Office. It is the natural owner of what comes next.",
      "DIFC Regulation 10 (September 2023) binds autonomous systems: certification or a named Autonomous Systems Officer for high-risk systems. A working model already inside the UAE.",
      "The National Committee for Agentic AI's design guide (August 2026, Arabic) sets the rules for federal services. The customer states the need in their own words, nothing is asked for twice, and exceptions hand over to a competent employee. Four of the six elements are now federal design policy.",
      "Federal services with assistive AI are checked against a ten-item readiness template before launch. Three of its items, executing rather than linking, handing over with context and following through, are the committee's version of the test.",
    ] },
    { kind: "h3", text: "And the European timetable" },
    { kind: "p", text: "The EU AI Act binds any provider or deployer whose system output is used in the Union. For a UAE entity serving EU residents, or buying from a supplier that does, these dates already apply." },
    EU_TIMETABLE,
    EU_TIMETABLE_NOTE,
  ],
  applicability: "In the UAE, take-up is the weakest fit: high-coverage entitlement programmes leave less unclaimed than European welfare systems do. Consistency, compressed variance and speed apply directly. Speed is where the published UAE evidence is strongest: Zero Bureaucracy cut delivery time by over 70% before AI was the main instrument.",
  sources: [
    { label: "UAE Government portal, Agentic AI for Government Services and the design guide (updated 30 September 2026)", url: "https://u.ae/en/about-the-uae/digital-uae/digital-technology/Agentic-AI-for-Government-Services", note: "The committee and the design guide. The Arabic original governs." },
    { label: "The National, Ajman uses agentic AI to renew trade licence (23 July 2026)", url: "https://www.thenationalnews.com/news/uae/2026/07/23/ajman-uses-agentic-ai-to-renew-trade-licence-in-uae-government-first", note: "Press report of a government announcement." },
    { label: "UAE Government Media Office, phase 2 of the Zero Bureaucracy programme (16 June 2025)", url: "https://mediaoffice.ae/en/news/2025/june/16-06/mohammed-bin-rashid-launches-phase-2-of-zero-bureaucracy-programme", note: "Delivery time cut, as published by the programme." },
    { label: "Gulf News, UAE launches automatic passport and Emirates ID renewals (December 2025)", url: "https://gulfnews.com/uae/government/uae-launches-automatic-passport-and-emirates-id-renewals-1.500381132", note: "The Taqdeer package. Press report." },
    { label: "Morgan Lewis, UAE establishes Federal Authority for Artificial Intelligence and Data (June 2026)", url: "https://www.morganlewis.com/pubs/2026/06/uae-establishes-federal-authority-for-artificial-intelligence-and-data", note: "Law-firm summary of the decree." },
    { label: "DIFC, Regulation 10 on autonomous and semi-autonomous systems", url: "https://www.difc.com/business/registrars-and-commissioners/commissioner-of-data-protection/regulation-10", note: "Applies within the DIFC only." },
    { label: "arXiv 2510.27543, 19 models across English, Modern Standard Arabic and four dialects (2025)", url: "https://arxiv.org/html/2510.27543v1", note: "Academic benchmark, not a service evaluation." },
    { label: "arXiv 2601.05101, Arabic prompts with English tools (2025)", url: "https://arxiv.org/html/2601.05101v1", note: "Academic benchmark." },
    ...SHARED_SOURCES,
  ],
};

const KSA: PovEdition = {
  market: "ksa",
  label: "Saudi Arabia",
  leadClose: "This is the Saudi Arabia edition.",
  triggerRows: [
    ["Birth", "Family allowance, child benefit, registration bundle", "Abroad, Austria pays on a registered birth; Estonia sends an offer to confirm.", "A · B"],
    ["Age", "Pension award, concessionary travel, school enrolment", "The state knows the date of birth exactly. An application adds no information.", "A"],
    ["Income", "Pre-filled tax returns, social tariffs, means-tested support", "Abroad, Portugal has awarded its social energy tariff automatically from a tax match since 2016.", "A · B"],
    ["Expiry", "Licence, permit and document renewal", "The commercial registry system in force since April 2025 replaced renewal with an annual confirmation that the registered data is still correct. Confirm, not apply.", "B"],
    ["Death", "Tell-us-once, survivor benefits, estate notification", "One notification passed on, instead of the same conversation repeated at the worst time.", "C · B"],
    ["Business", "Licence renewal, pre-filled returns, inspections", "The annual confirmation of the commercial registration, with the Zakat filing shown as a consequence before the owner commits.", "B"],
  ],
  language: [
    { kind: "p", text: "Saudi Arabia has built the measurement instrument the rest of the region lacks. BALSAM makes this a question that can be answered with evidence." },
    ARABIC_TABLE,
    { kind: "note", text: "The gap is to English, and it depends on the model chosen." },
    { kind: "p", text: "Tool-calling degrades in Arabic even when the tools are described in English. Accuracy drops 5 to 10% when the citizen writes in Arabic, whichever language the tool descriptions use. Looking up a record, checking eligibility and filing a form are what an agentic service does. Keeping the back end in English does not fix it." },
    { kind: "ul", items: [
      "BALSAM is the regional asset. SDAIA and the King Salman Global Academy launched it in September 2024. The first 2025 report evaluated 22 models across 12,786 questions and 54 tasks.",
      "It produced a useful finding: large general models outperformed smaller Arabic-specific models. Model choice for Arabic services can be made on evidence, not on origin.",
      "Citizens do not write in Modern Standard Arabic. They write in dialect, switch languages and transliterate. Build the evaluation set from real citizen queries, not from written documents.",
      "Arabic is the official language of government. Where a service runs bilingually, which version of an automated decision governs is worth settling in policy before the first decision.",
    ] },
  ],
  rules: [
    { kind: "p", text: "Saudi Arabia is unusual: the state made itself a controller under the same law it applies to everyone else." },
    { kind: "h3", text: "In Saudi Arabia" },
    { kind: "ul", items: [
      "PDPL: Royal Decree M/19 (2021), amended by M/148 (2023), fully enforceable since 14 September 2024. Article 1 names public entities first among controllers, and registration is mandatory.",
      "Residency: cloud computing rules restrict the transfer of government-related data outside the Kingdom, and sector rules in finance, telecoms and IoT go further. In-country inference is the default position.",
      "SDAIA is regulator, national data infrastructure operator and AI champion in one body, which makes the link between data policy and AI deployment unusually direct.",
    ] },
    { kind: "h3", text: "And the European timetable" },
    { kind: "p", text: "The EU AI Act binds any provider or deployer whose system output is used in the Union. For a Saudi entity serving EU residents, or buying from a supplier that does, these dates already apply." },
    EU_TIMETABLE,
    EU_TIMETABLE_NOTE,
  ],
  applicability: "In Saudi Arabia, consistency and compressed variance are the strongest fits. Qiyas measures more than 220 entities, each at its own point on one published scale. Speed is already shown at platform level. Take-up applies to means-tested and eligibility-based programmes.",
  sources: [
    { label: "Digital Government Authority, Qiyas programme", url: "https://dga.gov.sa/en/programs/qiyas", note: "Entity-level measurement and the published results." },
    { label: "Argaam, new commercial registry and trade name systems take effect (3 April 2025)", url: "https://www.argaam.com/en/article/articledetail/id/1802243", note: "The move from renewal to annual confirmation. Press report." },
    { label: "Morgan Lewis, Saudi PDPL transition period ends 14 September 2024", url: "https://www.morganlewis.com/pubs/2024/09/saudi-arabia-personal-data-protection-law-transition-period-ends-september-14", note: "Enforceability date and controller scope. Law-firm summary." },
    { label: "BALSAM: a platform for benchmarking Arabic large language models (ArabicNLP 2025)", url: "https://aclanthology.org/2025.arabicnlp-main.21/", note: "The benchmark's design and scope." },
    { label: "arXiv 2510.27543, evaluation of 19 models across English, Modern Standard Arabic and four dialects (2025)", url: "https://arxiv.org/html/2510.27543v1", note: "The English to Arabic gap, including Saudi dialect at 48.2%. Academic benchmark." },
    { label: "arXiv 2601.05101, Arabic prompts with English tools (2025)", url: "https://arxiv.org/html/2601.05101v1", note: "Tool-calling accuracy in Arabic. Academic benchmark." },
    ...SHARED_SOURCES,
  ],
};

const TURKIYE: PovEdition = {
  market: "turkiye",
  label: "Türkiye",
  leadClose: "This is the Türkiye edition.",
  triggerRows: [
    ["Birth", "Family allowance, child benefit, registration bundle", "Abroad, Austria pays on a registered birth; Estonia sends an offer to confirm.", "A · B"],
    ["Age", "Pension award, concessionary travel, school enrolment", "The state knows the date of birth exactly. An application adds no information.", "A"],
    ["Income", "Pre-filled tax returns, social tariffs, means-tested support", "BSYS already runs 52 automated queries across 16 institutions for social assistance, in place of a fifteen-day document process.", "A · B"],
    ["Expiry", "Licence, permit and document renewal", "The state issued the document and holds the date. The clearest case for offer-and-confirm.", "B"],
    ["Death", "Tell-us-once, survivor benefits, estate notification", "One notification passed on, instead of the same conversation repeated at the worst time.", "C · B"],
    ["Business", "Licence renewal, pre-filled returns, inspections", "Where the return is most measurable, and where delegation to an agent is already solved.", "B"],
  ],
  language: [
    { kind: "p", text: "Türkiye has real benchmarks, and they produce two findings that should change how a model is chosen." },
    { kind: "table", caption: "TR-MMLU results by model", columns: ["Model", "Measured"], rows: [["GPT-4o", "84.84%"], ["Claude 3.5 Sonnet", "84.4%"], ["Llama 3.3", "79.42%"], ["Gemini 1.5 Pro", "76.74%"], ["Gemma2-27B", "72.1%"]] },
    { kind: "note", text: "TR-MMLU: 6,200 questions across 62 categories, 39 models. TurkishMMLU, built on more than 10,000 natively written questions, places the same model at the top." },
    { kind: "p", text: "Measured Turkish performance is what counts. The Cetvel benchmark compares Turkish-centric and multilingual models on Turkish tasks and finds large differences between them. Choose the model for a Turkish-language service on measured Turkish performance." },
    { kind: "ul", items: [
      "Tokenisation is a cost line and an accuracy driver. Turkish runs at roughly 2.2 to 2.8 tokens per word across the major tokenisers, and the share of valid Turkish tokens tracks the benchmark score closely.",
      "A national model is in development. BİLGE, from TÜBİTAK BİLGEM, is intended for government services. It belongs on the same benchmarks as every other candidate.",
      "The 2026 to 2030 plan commits to a joint Turkic-languages model with the Organization of Turkic States.",
      "e-Devlet runs Turkish-first with an English option. Where a service answers in more than one language, which version governs an automated decision is worth settling in policy first.",
    ] },
  ],
  rules: [
    { kind: "p", text: "Türkiye's AI law is before the Assembly, and the EU's already reaches Turkish organisations." },
    { kind: "h3", text: "In Türkiye" },
    { kind: "ul", items: [
      "KVKK: Law 6698 binds public institutions, with VERBİS registration for public bodies since April 2019. Law 7499 (in force 1 June 2024) added adequacy decisions, binding corporate rules and standard contractual clauses to the transfer regime.",
      "Localisation: sector rules are dense in banking, payments, capital markets, health, telecoms and tax, plus Circular 2019/12 for critical public data. In-country inference is the legal default.",
      "AI law: three bills are before the Assembly; the 2024 proposal follows the EU AI Act and is in committee. The AI Action Plan commits to five sector regulatory sandboxes and an ethics board within a year.",
    ] },
    { kind: "h3", text: "And the European timetable" },
    { kind: "p", text: "As an EU candidate country and a major exporter, Türkiye is doubly exposed to the EU AI Act. It binds Turkish organisations whose system output is used in the Union, and it is the template the pending domestic bill follows." },
    EU_TIMETABLE,
    EU_TIMETABLE_NOTE,
  ],
  applicability: "In Türkiye, consistency and speed are the strongest fits, on an estate of 1,128 institutions where one standard applied across all of them is the largest single prize. Take-up applies directly: BSYS already shows the mechanism, removing about 10% of duplicate payments while reaching 30 million citizens.",
  sources: [
    { label: "Erdem & Erdem, Türkiye AI Action Plan (2026 to 2030) circular published in the Official Gazette (August 2026)", url: "https://www.erdem-erdem.av.tr/turkiye-yapay-zeka-eylem-plani-2026-2030-genelgesi-resmi-gazetede-yayimlandi", note: "The circular, its axes and actions. Law-firm summary." },
    { label: "e-Devlet Kapısı, official statistics", url: "https://turkiye.gov.tr/edevlet-istatistikleri", note: "User, service and institution counts. Live page; figures move monthly." },
    { label: "Ministry of Family and Social Services, Türkiye's Integrated Social Assistance System (BSYS)", url: "https://www.aile.gov.tr/SYGM/PDF/Turkiyenin_Butunlesik_Sosyal_Yardim_Sistemi.pdf", note: "The 52 queries, 16 institutions and the replaced 15-day process." },
    { label: "Cybersecurity and Digital Transformation Office, Circular 2019/12 on information security measures", url: "https://cbddo.gov.tr/mevzuat/2019-12-sayili-bilgi-guvenligi-tedbirleri-cumhurbaskanligi-genelgesi/", note: "The localisation rule for critical public data. Official text." },
    { label: "arXiv 2508.13044, TR-MMLU (2025)", url: "https://arxiv.org/html/2508.13044v1", note: "Turkish benchmark results by model. Academic benchmark." },
    { label: "Cetvel: a unified benchmark for Turkish (EACL 2026)", url: "https://aclanthology.org/2026.eacl-long.46/", note: "Turkish-centric against multilingual models. Academic benchmark." },
    { label: "Cybersecurity and Digital Transformation Office, National AI Strategy and action plans", url: "https://cbddo.gov.tr/uyzs", note: "The predecessor strategy and BİLGE. Official page." },
    ...SHARED_SOURCES,
  ],
};

const EUROPE: PovEdition = {
  market: "europe",
  label: "European Union",
  leadClose: "This is the European Union edition.",
  triggerRows: [
    ["Birth", "Family allowance, child benefit, registration bundle", "Austria pays automatically on a registered birth since 2015; Estonia sends an offer to confirm.", "A · B"],
    ["Age", "Pension award, concessionary travel, school enrolment", "The state knows the date of birth exactly. An application adds no information.", "A"],
    ["Income", "Pre-filled tax returns, social tariffs, means-tested support", "Portugal has awarded its social energy tariff automatically from a tax match since 2016.", "A · B"],
    ["Expiry", "Licence, permit and document renewal", "The state issued the document and holds the date. The clearest case for offer-and-confirm.", "B"],
    ["Death", "Tell-us-once, survivor benefits, estate notification", "One notification passed on, instead of the same conversation repeated at the worst time.", "C · B"],
    ["Business", "Licence renewal, pre-filled returns, inspections", "Where the return is most measurable, and where delegation to an agent is already solved.", "B"],
  ],
  language: [
    { kind: "p", text: "In EU law there is no privileged source text. That is a design constraint on automated decisions, not a translation problem." },
    { kind: "table", caption: "Llama-3.1-70B-Instruct average across the EU20 benchmark suite", columns: ["Language", "Measured"], rows: [["English", "79%"], ["Greek", "70%"], ["Slovenian", "67%"], ["Bulgarian", "66%"], ["Latvian", "66%"], ["Lithuanian", "65%"]] },
    { kind: "note", text: "21 languages. On MMLU the English to Lithuanian gap is 18 points; on HellaSwag the English to Latvian gap is 25." },
    { kind: "p", text: "The gap tracks the share of training data, not the difficulty of the language. Lithuanian is 0.16% of common crawled text, Latvian 0.12%, Slovenian 0.15%. It is a supply problem with a known shape, which is why the Union treats it as infrastructure rather than procurement." },
    { kind: "ul", items: [
      "All language versions are equally authentic (Regulation 1/1958 and Article 55(1) TEU). A decision generated in one language and served in another is not a translation of the decision. It is the decision, and evaluation has to cover every language a service is delivered in.",
      "The Union is building the supply side. ALT-EDIC (February 2024) has a public-administration mandate; EuroLLM covers all 24 official languages; OpenEuroLLM is funded under Digital Europe.",
      "The benchmark already exists. The EU20 suite evaluates 40 models across 21 languages, so a Member State can choose a model on measured performance in its own language today.",
    ] },
  ],
  rules: [
    { kind: "p", text: "Unusually for this field, a European public body can plan against a known timetable." },
    { kind: "h3", text: "In the European Union" },
    { kind: "ul", items: [
      "Deployer duties: AI Act Article 26 requires human oversight by competent people with the authority to intervene, monitoring, incident reporting and log retention for at least six months. Article 26(8) adds a duty for public authorities to check EU database registration before use.",
      "Impact assessment: Article 27 requires a fundamental rights impact assessment from bodies under public law and from private providers of public services. The Omnibus lets it cross-reference the data protection assessment.",
      "Procurement: the Commission's model contractual clauses for AI exist in high-risk and light versions in all 24 languages. They are a compliance overlay; the commercial terms still need drafting.",
    ] },
    { kind: "h3", text: "The timetable" },
    { kind: "p", text: "These dates apply directly, without national transposition." },
    EU_TIMETABLE,
    EU_TIMETABLE_NOTE,
  ],
  applicability: "In the Union, take-up is the strongest fit anywhere in this article: Estonia found that 97% of proactive-benefit recipients had previously had to apply. Consistency matters most in federal and regional states. All four benefits apply; the constraint is evaluation in 24 languages.",
  sources: [
    { label: "CyberLawWatch, EU Digital Omnibus on AI enters into force (31 July 2026)", url: "https://www.cyberlawwatch.com/2026/07/31/eu-digital-omnibus-on-ai-enters-into-force/", note: "Regulation 2026/1744 and the amended dates. Commentary; the Official Journal text governs." },
    { label: "Gibson Dunn, EU AI Act Omnibus agreement, postponed high-risk deadlines", url: "https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/", note: "The 2 December 2027 date and what was not changed. Law-firm summary." },
    { label: "ERR News, parents no longer have to apply for family benefits (2019)", url: "https://news.err.ee/991789/parents-no-longer-have-to-apply-for-family-benefits", note: "The October 2019 launch in Estonia. Press report." },
    { label: "arXiv 2410.08928, EU20, a multilingual benchmark suite for European languages (2024)", url: "https://arxiv.org/abs/2410.08928", note: "Per-language results and the training-data correlation. Academic benchmark." },
    ...SHARED_SOURCES,
  ],
};

export const POV_EDITIONS: Record<PovMarket, PovEdition> = { uae: UAE, ksa: KSA, turkiye: TURKIYE, europe: EUROPE };

export function povEdition(market: string): PovEdition {
  return POV_EDITIONS[(market in POV_EDITIONS ? market : "uae") as PovMarket];
}
