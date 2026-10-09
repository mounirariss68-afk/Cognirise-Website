import type { IndustryPage } from "./types";

const VALUE_SCAN = { label: "Book a Value Scan", href: "/value-scan" };
const CASES = { label: "See case studies", href: "/case-studies" };

export const FINANCIAL_SERVICES: IndustryPage = {
  slug: "financial-services",
  name: "Financial Services",
  path: "/industries/financial-services",
  meta: {
    title: "AI for Financial Services | Cognirise",
    description: "Where AI pays off for banks and lenders: credit preparation, fraud and AML triage, customer service, compliance and software delivery.",
  },
  hero: {
    kicker: "Financial Services",
    title: "AI for banks and lenders",
    lead: "Credit, customer service, compliance and software delivery. AI prepares the work and a person decides. One process at a time, with the result measured.",
    primary: VALUE_SCAN,
    secondary: CASES,
    image: { src: "/images/cognirise/industries/pulse-industry-financial-services.png", alt: "Document flows converging on a reviewed decision point in a financial operations landscape." },
  },
  useCases: [
    { task: "Credit and lending", aiDoes: "Prepares meeting briefs, summarises credit and collateral files, pre-screens applications against policy", personDecides: "The analyst checks the evidence and approves or rejects", measured: "Preparation time, rework, decision turnaround" },
    { task: "Risk and fraud", aiDoes: "Ranks transaction anomalies, prioritises AML alerts, supports portfolio scenarios", personDecides: "The investigator evaluates and escalates", measured: "Review time, false positives, confirmed detections" },
    { task: "Operations", aiDoes: "Checks onboarding documents, reconciles records across systems, prepares reports", personDecides: "Operations staff handle the exceptions", measured: "Manual touches, error rate, completion time" },
    { task: "Customer and sales", aiDoes: "Answers routine enquiries, suggests the next action, prioritises retention calls", personDecides: "Staff handle advice, complaints and sensitive cases", measured: "Resolution, conversion, complaints" },
    { task: "Engineering and IT", aiDoes: "Drafts code and tests, explains legacy systems, supports requirements analysis", personDecides: "Engineers review, test and approve", measured: "Delivery lead time, defects, rework" },
    { task: "Compliance", aiDoes: "Answers policy questions with linked sources, flags rule changes, prepares KYC and reporting material", personDecides: "Compliance interprets the rules and signs off", measured: "Review time, traceability, missed changes" },
  ],
  useCaseNote: "Fewer alerts alone does not prove better risk detection. Detection is measured against confirmed cases.",
  workflow: {
    heading: "One worked example: a credit decision",
    outro: "One record holds the source documents, the policy version, the reviewer's decision and the action taken.",
    steps: [
      { name: "Receive", lane: "system", text: "The application and its documents arrive and are brought together as one case.", owner: "The origination system", input: "The application and its documents", output: "One case with every document attached", logged: "Case id, documents received, time" },
      { name: "Extract", lane: "ai", text: "Facts are pulled from the documents, each linked to its source.", owner: "Document agent", input: "The case documents", output: "Facts pulled from the documents, each linked to its source", logged: "Each fact and the page it came from" },
      { name: "Check", lane: "ai", text: "The file is checked for completeness and against policy. Gaps go back to the analyst; nothing skips this step.", owner: "Policy agent", input: "The extracted facts and the policy version", output: "A completeness and policy check. Gaps go back to the analyst; nothing skips this step", logged: "Checks run, gaps found, policy version" },
      { name: "Draft", lane: "ai", text: "A recommendation is drafted. It is a proposal, not a decision.", owner: "Recommendation agent", input: "The checked file", output: "A recommendation. It is a proposal, not a decision", logged: "The draft and the evidence it cites" },
      { name: "Decide", lane: "person", text: "The credit committee or an authorised analyst approves, rejects or escalates, within the bank's limits.", owner: "The credit committee or an authorised analyst", input: "The draft and the evidence", output: "Approve, reject or escalate, within the bank's limits", logged: "Who decided, what, when, and why", approval: true },
      { name: "Execute", lane: "system", text: "Only an approval leads to action, and only the actions that were permitted.", owner: "The core banking system", input: "An approved decision", output: "Only an approval leads to action, and only the actions that were permitted", logged: "The action taken, against the approval" },
    ],
  },
  built: {
    heading: "What we have built",
    cards: [
      { title: "Leasing company.", body: "Quotes and credit work were done by hand across the ERP and documents. Business rules and specialist agents now prepare offer plans in seconds, with gated decision points. Every decision is logged against the rule set.", tag: "Client result" },
      { title: "Commercial bank, credit risk.", body: "Portfolio reviews were manual and periodic. Early-warning signals, disclosure monitoring and concentration checks now run daily and propose actions for analyst approval.", tag: "Client result" },
      { title: "Investment bank, call compliance.", body: "Brokerage calls were reviewed by sampling. Calls are now transcribed and checked against four risk gates; flagged calls go to a 24-hour review queue. Reported gate pass rate: 71%.", tag: "Client result" },
      { title: "State bank, virtual branch.", body: "Calls went unanswered at peak times. A voice workflow for intent, enquiry and consent runs on the bank's own servers; calls are resolved or routed with an outcome code. Response time under two seconds in this project.", tag: "Client result" },
    ],
    link: { label: "All financial services case studies", href: "/case-studies?industry=Financial%20Services" },
  },
  view: {
    heading: "Our view",
    body: "The value is not in the chatbot. It is in the processes that machine learning already moves: fraud, anti-money-laundering triage, claims, collections and onboarding. Generative AI shortens the human time around those decisions. Build for the regulator you have, not the one you fear: a model inventory, logging, bias testing, and an explanation the customer can understand.",
  },
  evidence: {
    heading: "What others have reported",
    rows: [
      { who: "HSBC", what: "AI transaction monitoring for financial crime", outcome: "2 to 4 times more financial crime detected; 60% fewer false-positive cases", source: "HSBC, June 2024", url: "https://www.hsbc.com/news-and-views/views/hsbc-views/harnessing-the-power-of-ai-to-fight-financial-crime", tag: "Published elsewhere" },
      { who: "Citi", what: "AI in client onboarding and KYC", outcome: "Document review from about an hour to about 15 minutes", source: "Reuters, April 2026", url: "https://finance.yahoo.com/sectors/technology/articles/citigroup-says-ai-helps-speed-161132650.html", tag: "Published elsewhere" },
      { who: "Allianz Partners", what: "Claims straight-through processing", outcome: "Claims lifecycle from 19 days to 4; 71% settled within 12 hours", source: "Allianz, 2026", url: "https://www.travelweekly.com/Travel-News/Travel-Agent-Issues/Allianz-Partners-leverages-AI-for-faster-payouts", tag: "Published elsewhere" },
      { who: "Central Bank of the UAE", what: "Guidance on AI and consumer protection", outcome: "Clear responsibility, fairness, transparency, human oversight and privacy expected of licensed institutions", source: "CBUAE, February 2026", url: "https://www.pinsentmasons.com/out-law/news/uae-central-bank-responsible-ai-guidance-financial-sector", tag: "Published elsewhere" },
    ],
  },
  market: {
    heading: "In the UAE",
    body: "The Central Bank's 2026 guidance expects human oversight, fairness and clear disclosure from licensed institutions, in Arabic and English. Where inference runs, and in which language a customer is told, are design inputs from day one.",
  },
  start: {
    heading: "How to start",
    body: "Bring one process with repeated manual work, a named owner and examples of real cases. We will identify the steps AI can handle, the decisions people must keep, the data needed and the measures for a pilot.",
    bring: ["The starting point: volumes, time and error rate today", "System and data access", "The person who decides", "The actions AI is allowed to take", "Test cases and acceptance criteria"],
  },
};

export const TELECOMS: IndustryPage = {
  slug: "telecoms",
  name: "Telecoms",
  path: "/industries/telecoms",
  meta: {
    title: "AI for Telecoms | Cognirise",
    description: "Where AI pays off for an operator: customer service, billing disputes, revenue assurance, roaming fraud and sales, with a person approving.",
  },
  hero: {
    kicker: "Telecoms",
    title: "AI for the business side of an operator",
    lead: "Service, billing, revenue assurance, roaming and sales. AI prepares the case; your people approve anything that costs money or touches a customer.",
    primary: VALUE_SCAN,
    secondary: CASES,
    image: { src: "/images/cognirise/industries/pulse-industry-telecoms-network.png", alt: "Communications nodes linked by signals across a wide network landscape." },
  },
  useCases: [
    { task: "Customer service", aiDoes: "Answers routine questions, routes the rest to the right skill, drafts the reply and the next step for the agent", personDecides: "The agent handles complaints, exceptions and anything the customer disputes", measured: "Cost per resolved contact, transfers, repeat contacts, complaints" },
    { task: "Billing disputes", aiDoes: "Pulls usage, rating and billing records for the disputed invoice and checks them against policy", personDecides: "The billing owner approves credits within set limits", measured: "Disputes resolved without a repeat contact, time to resolution" },
    { task: "Revenue leakage", aiDoes: "Reconciles eligible usage against rating and billing and flags mismatches with the evidence", personDecides: "Revenue assurance approves corrections", measured: "Confirmed leakage found, revenue recovered net of cost" },
    { task: "Roaming and fraud", aiDoes: "Flags unusual usage patterns and assembles the case", personDecides: "The fraud team decides on restrictions and partner steering; network actions go to the NOC", measured: "Confirmed fraud losses, false positives, case time" },
    { task: "Sales hand-off", aiDoes: "Qualifies inbound and service contacts and prepares the offer within approved pricing", personDecides: "Sales accepts the lead; commercial review sets the offer", measured: "Conversion per contact, sales cycle" },
    { task: "Offers and retention", aiDoes: "Proposes the next best offer or retention action from approved offers", personDecides: "Marketing approves the campaign and its terms", measured: "Conversion, churn in treated cohorts, complaints" },
  ],
  workflow: {
    heading: "One worked example: a billing dispute",
    outro: "Credits and settlements need named approval within financial limits. Changes to the rating engine go through tested change control and roll-back; charging is never changed silently.",
    steps: [
      { name: "Detect", lane: "system", text: "A disputed invoice and the customer's note enter the case queue.", owner: "The case queue", input: "A disputed invoice and the customer's note", output: "A case, opened and assigned", logged: "Case id, invoice, time received" },
      { name: "Investigate", lane: "ai", text: "Usage, rating and billing records are pulled and checked against policy.", owner: "Dispute agent", input: "Usage, rating and billing records", output: "The records pulled and checked against policy", logged: "Records read, checks run, policy version" },
      { name: "Propose", lane: "ai", text: "A credit or a rejection is drafted, with the reasons and the evidence.", owner: "Dispute agent", input: "The checked records", output: "A credit or a rejection, drafted with the reasons and the evidence", logged: "The proposal and its evidence" },
      { name: "Approve", lane: "person", text: "The billing owner approves within set limits; the system applies the decision.", owner: "The billing owner", input: "The proposal", output: "Approval within set limits; the system applies the decision", logged: "Who approved, the amount, the limit applied", approval: true },
      { name: "Verify", lane: "system", text: "The change is logged, the customer is informed and the case is closed.", owner: "Billing and CRM", input: "The approved decision", output: "The change is logged, the customer is informed and the case is closed", logged: "Change applied, message sent, case closed" },
    ],
  },
  built: {
    heading: "What we have built",
    cards: [
      { title: "Enterprise connectivity and data-centre operator.", body: "Incident diagnosis, approvals and evidence were inconsistent. An operations workflow now links alerts to topology and runbooks, proposes recovery steps and pauses any disruptive action for an engineer's approval.", tag: "Client result" },
    ],
    intro: "This is the one telecoms case we can describe publicly today.",
    link: { label: "All case studies", href: "/case-studies" },
  },
  view: {
    heading: "Our view",
    body: "In an operator, AI pays where it takes cost out within a budget year. The two places that has happened are the contact centre and the network operations centre; everything else is a bet on future capacity. Start with assistance for your agents before self-service for customers, and measure cost per contact, not only satisfaction. Network actions stay with the network teams. Our work is the business around the network.",
  },
  evidence: {
    heading: "What others have reported",
    rows: [
      { who: "Virgin Media O2", what: "AI call routing and transfer avoidance", outcome: "1.3 million transfers avoided; 400,000 customer hours saved; complaints down 50% in 2025", source: "Virgin Media O2, January 2026", url: "https://news.virginmediao2.co.uk/ai-helps-virgin-media-o2-avoid-over-one-million-call-transfers-as-it-saves-customers-more-than-400000-hours-of-time-on-the-phone/", tag: "Published elsewhere" },
      { who: "Vodafone", what: "Customer-facing assistant (SuperTOBi), Portugal", outcome: "First-time resolution from 15% to 60%; single market, no methodology published", source: "Vodafone, July 2024", url: "https://www.vodafone.com/news/newsroom/technology/meet-super-tobi-vodafone-s-new-generative-ai-virtual-assistant-now-serving-customers-in-multiple-countries", tag: "Published elsewhere" },
      { who: "China Mobile", what: "Autonomous network operations centre", outcome: "Over 30% less back-office operations manpower; mean time to repair down 30%", source: "China Mobile via TM Forum, March 2026", url: "https://www.fierce-network.com/cloud/telcos-hit-level-4-autonomous-network-milestone-says-tm-forum", tag: "Published elsewhere" },
    ],
  },
  market: {
    heading: "In the Gulf",
    body: "Operators here run sovereign-cloud and national AI programmes. Data residency, lawful purpose, consent and consumer protection are reviewed with your legal and network owners before anything is deployed. Network and partner approvals stay explicit.",
  },
  start: {
    heading: "How to start",
    body: "Bring one workflow with a starting point you can measure: disputes per month, cost per contact, leakage found. We will scope a pilot with its stop conditions and its owner.",
    bring: ["The starting point: volumes, time and cost today", "Read-only access to the systems involved", "The person who approves credits, corrections or offers", "The actions AI may take without approval, if any", "Test cases and acceptance criteria"],
  },
};

export const ENERGY_RESOURCES: IndustryPage = {
  slug: "energy-resources",
  name: "Energy & Resources",
  path: "/industries/energy-resources",
  meta: {
    title: "AI for Energy & Resources | Cognirise",
    description: "Where AI pays off in plants, grids and field operations: from an asset signal to a safe work order, inspection, engineering knowledge and utility service.",
  },
  hero: {
    kicker: "Energy & Resources",
    title: "AI for plants, grids and field operations",
    lead: "From an asset signal to a safe work order. AI reads the data, matches it to history and proposes the work; an engineer approves it.",
    primary: VALUE_SCAN,
    secondary: CASES,
    image: { src: "/images/cognirise/industries/pulse-industry-energy-resources.png", alt: "Operational signals moving through geological layers and field infrastructure." },
  },
  useCases: [
    { task: "Maintenance signal to work order", aiDoes: "Matches a sensor anomaly to fault history, retrieves the procedure, proposes a work order with parts and permit needs", personDecides: "The maintenance planner approves the work", measured: "Unplanned downtime, false alerts, time from signal to work order" },
    { task: "Inspection by drone and vision", aiDoes: "Reads inspection imagery, flags defects and drafts the inspection record", personDecides: "The inspector confirms the finding and the action", measured: "Inspection hours, defects found, inspector exposure hours" },
    { task: "Engineering knowledge assistant", aiDoes: "Answers procedural questions from the approved manuals, drawings and incident reports, with the source", personDecides: "The engineer decides what to do with the answer", measured: "Time to answer, onboarding time for new engineers" },
    { task: "Utility customer service", aiDoes: "Handles routine enquiries and prepares refunds and account changes in Arabic and English", personDecides: "Staff handle disputes and exceptions", measured: "Resolution rate, cycle time per process" },
    { task: "Emissions monitoring and reporting", aiDoes: "Reconciles sensor data against the inventory and prepares the declaration", personDecides: "The environment team reviews and signs the declaration", measured: "Detected versus inventoried emissions, time to repair" },
    { task: "Permit and safety checks", aiDoes: "Checks a planned job against permits, isolation status and operating limits before work starts", personDecides: "The permit holder authorises the work", measured: "Permit cycle time, checks missed" },
  ],
  workflow: {
    heading: "One worked example: from a vibration alarm to a work order",
    outro: "No automated action touches a safety-instrumented system. The AI proposes; the plant decides.",
    steps: [
      { name: "Detect", lane: "system", text: "A vibration sensor on a pump crosses its threshold.", owner: "The historian", input: "A vibration sensor on a pump crosses its threshold", output: "An alarm with the asset and the reading", logged: "Asset, reading, time" },
      { name: "Match", lane: "ai", text: "The pattern is compared with the asset's history and known fault signatures.", owner: "Maintenance agent", input: "The alarm and the asset's history", output: "The pattern compared with the asset's history and known fault signatures", logged: "Signatures compared, confidence, history used" },
      { name: "Propose", lane: "ai", text: "A work order is drafted: the likely fault, the procedure, the parts in stock, the permit needed.", owner: "Maintenance agent", input: "The likely fault", output: "A draft work order: the likely fault, the procedure, the parts in stock, the permit needed", logged: "The draft and its sources" },
      { name: "Approve", lane: "person", text: "The maintenance planner accepts, changes or rejects the work order.", owner: "The maintenance planner", input: "The draft work order", output: "Accepted, changed or rejected", logged: "Who decided, what changed, when", approval: true },
      { name: "Execute and learn", lane: "system", text: "The work order is issued; the outcome is recorded against the signal for next time.", owner: "The maintenance system", input: "The approved work order", output: "The work order is issued; the outcome is recorded against the signal for next time", logged: "Work order number, outcome, time to repair" },
    ],
  },
  built: {
    heading: "What we have built",
    cards: [
      { title: "Industrial materials producer.", body: "Routine technical questions depended on a few process experts. A bilingual assistant now searches the approved technical library and returns a sourced answer; uncertain questions go to an expert.", tag: "Client result" },
      { title: "Cross-border manufacturer, embedded emissions.", body: "Production, supplier and energy data sat in separate systems. A data pipeline now validates the inputs, calculates product-level emissions and routes declarations for review.", tag: "Client result" },
    ],
    link: { label: "All case studies", href: "/case-studies?industry=Energy" },
  },
  view: {
    heading: "Our view",
    body: "The AI that has proven itself in this sector works alongside the engineer, inside the physics, in a fenced environment. Claim cycle time, not barrels: months to hours on seismic work, days to minutes on a refund. Capture the knowledge of the engineers who are retiring before it leaves with them. Keep the models and the data in your own structures, and rent the frontier. Safety limits and permits are part of the design, not an afterthought.",
  },
  evidence: {
    heading: "What others have reported",
    rows: [
      { who: "DEWA", what: "Virtual employee for customer service", outcome: "1.6 million enquiries in 2025; refund time from 4 days to 8 minutes", source: "Reuters and Zawya, 2026", url: "https://www.zawya.com/en/projects/technology-telecom/dubais-dewa-says-ai-cuts-customer-refund-time-from-four-days-to-eight-minutes-417963", tag: "Published elsewhere" },
      { who: "Shell", what: "Predictive maintenance on rotating equipment", outcome: "10,000 assets, 11,000 models, 15 million predictions a day; no downtime percentage published", source: "C3 AI and Shell, March 2022", url: "https://ir.c3.ai/news-releases/news-release-details/shell-achieves-major-milestone-scales-artificial-intelligence", tag: "Published elsewhere" },
      { who: "PG&E", what: "AI monitoring for wildfire prevention", outcome: "17 fires intercepted, 1,000 outages prevented in 2025", source: "PG&E, 2025", url: "https://www.actionnewsnow.com/pg-e-monitoring-center-prevented-17-fires-saved-6m/article_3c54792d-78dc-4f55-9bf5-7cf1d2601138.html", tag: "Published elsewhere" },
      { who: "Unilever", what: "Process digital twins for yield and waste", outcome: "Waste down 20% and capacity up 10% at one site; defects down 30% over four years at another", source: "Unilever, June 2026", url: "https://www.unilever.com/news/press-and-media/press-releases/2026/unilever-scales-digital-twins-across-global-manufacturing-network-with-accenture/", tag: "Published elsewhere" },
    ],
  },
  market: {
    heading: "In the Gulf",
    body: "Operators here run world-scale assets and sovereign AI programmes. Field data stays in-country; models run on your infrastructure where residency requires it. Arabic and English parity is part of the acceptance test.",
  },
  start: {
    heading: "How to start",
    body: "Bring one asset class or one process with a measurable starting point: unplanned downtime, inspection hours, permit cycle time. We will scope the first signal-to-work-order loop and its safety boundary.",
    bring: ["The starting point: downtime, inspection hours or cycle time today", "Access to the historian, the maintenance system and the procedures", "The planner or permit holder who approves the work", "The safety limits no automation may cross", "Test cases from past incidents"],
  },
};

export const TRAVEL_HOSPITALITY: IndustryPage = {
  slug: "travel-hospitality",
  name: "Travel & Hospitality",
  path: "/industries/travel-hospitality",
  meta: {
    title: "AI for Travel & Hospitality | Cognirise",
    description: "Where AI pays off for airlines, hotels and tour operators: post-booking service, disruption, check-in, ground operations and group sales.",
  },
  hero: {
    kicker: "Travel & Hospitality",
    title: "AI for airlines, hotels and tour operators",
    lead: "Service, disruption and operations. AI reads the booking, the policy and the live inventory, and proposes the action. Your staff decide the exceptions.",
    primary: VALUE_SCAN,
    secondary: CASES,
    image: { src: "/images/cognirise/industries/pulse-industry-travel-hospitality.png", alt: "Passenger routes through a layered terminal as an aircraft departs." },
  },
  useCases: [
    { task: "Post-booking service", aiDoes: "Answers questions about a booking, prepares changes and refunds within policy", personDecides: "Staff handle complaints, waivers and anything outside policy", measured: "Resolution without a hand-off, cost per contact, complaints" },
    { task: "Disruption re-accommodation", aiDoes: "Assembles rebooking options across inventory, partners and the passenger's status", personDecides: "The duty manager approves outside set limits; within limits, the system acts and reports", measured: "Time to re-accommodate, missed connections, disputed reversals" },
    { task: "Pre-arrival check-in", aiDoes: "Collects identity documents before arrival and prepares the registration", personDecides: "Front desk verifies on arrival and handles exceptions", measured: "Check-in minutes, front-desk hours, registration compliance" },
    { task: "Ground operations", aiDoes: "Flags bottlenecks in turnaround and proposes gate and stand changes", personDecides: "Operations control decides", measured: "Taxi minutes, gate conflicts, delay minutes" },
    { task: "Group sales and RFPs", aiDoes: "Drafts proposals from the request and the inventory", personDecides: "The sales manager prices and sends", measured: "RFP turnaround, win rate" },
    { task: "Guest messaging", aiDoes: "Handles routine requests on WhatsApp and in-app and schedules them with housekeeping and concierge", personDecides: "Staff handle special requests and problems", measured: "Response time, requests completed, guest ratings" },
  ],
  workflow: {
    heading: "One worked example: a cancelled flight",
    outro: "The reversal window must be shorter than the time a released seat stays available. That is a design rule, not a detail.",
    steps: [
      { name: "Detect", lane: "system", text: "The cancellation is confirmed; affected passengers are listed by status and connection.", owner: "Operations control", input: "A confirmed cancellation", output: "Affected passengers listed by status and connection", logged: "Flight, passengers affected, time" },
      { name: "Assemble", lane: "ai", text: "Options are gathered within fare rules, partner agreements and seat availability.", owner: "Re-accommodation agent", input: "The passenger list, fare rules, partner agreements and seat availability", output: "Options gathered within the rules", logged: "Options considered and the rules applied" },
      { name: "Propose", lane: "ai", text: "A rebooking per passenger is drafted, with the hotel or voucher where the rules allow.", owner: "Re-accommodation agent", input: "The options", output: "A rebooking per passenger, with the hotel or voucher where the rules allow", logged: "The proposal per passenger" },
      { name: "Approve", lane: "person", text: "Within set limits the system rebooks and reports; above them the duty manager decides.", owner: "The duty manager", input: "Proposals above the set limits", output: "Within set limits the system rebooks and reports; above them the duty manager decides", logged: "Who decided, the limit, the reason", approval: true },
      { name: "Inform and log", lane: "system", text: "The passenger is told; the decision, the reason and the reversal window are recorded.", owner: "Reservations and messaging", input: "The decision", output: "The passenger is told; the decision, the reason and the reversal window are recorded", logged: "Message sent, reversal window, time" },
    ],
  },
  built: {
    heading: "What we have built",
    cards: [
      { title: "Government agency for tourism.", body: "AI assistants that guide visitors through itineraries and the region. Engagement up 15%, time on site up 30%.", tag: "Client result" },
      { title: "Hotel group, retired assets.", body: "Furniture and equipment leaving service had no record and no route. A portal now registers each item, matches it to reuse, donation or recycling, and keeps the evidence for every hand-off.", tag: "Client result" },
    ],
    link: { label: "All case studies", href: "/case-studies?industry=Travel" },
  },
  view: {
    heading: "Our view",
    body: "The AI that has paid in travel is operational and grounded: lower cost to serve, less waste in operations. The AI that is marketed is conversational and ungrounded. Own the servicing layer, changes, refunds and re-accommodation, because that is where the cost and the loyalty sit. Treat pricing on personal data as a disclosure question before it is a revenue question. The guest can always reach a person.",
  },
  evidence: {
    heading: "What others have reported",
    rows: [
      { who: "Airbnb", what: "AI support agent", outcome: "Support cost per booking down 16% year on year; about 45% of issues resolved without a person", source: "Skift and TechCrunch, 2026", url: "https://techcrunch.com/2026/02/13/airbnb-says-a-third-of-its-customer-support-is-now-handled-by-ai-in-the-u-s-and-canada/", tag: "Published elsewhere" },
      { who: "Booking Holdings", what: "Agents in customer service", outcome: "Double-digit fall in service cost per booking; total service cost down in 2025 while bookings rose 12%", source: "Booking Holdings results, 2026", url: "https://www.phocuswire.com/booking-holdings-q4-full-year-2025-earnings", tag: "Published elsewhere" },
      { who: "Dubai Airports and ICP", what: "Biometric smart corridor at DXB", outcome: "6 to 14 seconds per traveller, up to ten at once", source: "Gulf News, September 2025", url: "https://gulfnews.com/business/aviation/dubai-expands-ai-powered-red-carpet-smart-corridor-at-dxb-terminal-3-1.500254531", tag: "Published elsewhere" },
      { who: "Rotana with H2O", what: "Pre-arrival check-in at 15 Abu Dhabi hotels", outcome: "Identity documents collected on WhatsApp one to two days before arrival; no outcome figure published", source: "Hotel Management Network, August 2026", url: "https://www.hotelmanagement-network.com/news/h2o-check-in-rotana-hotels/", tag: "Published elsewhere" },
    ],
  },
  market: {
    heading: "In the Gulf",
    body: "Guest data includes passport and residency details, so consent, retention and where the data lives are settled before the first message is sent. Arabic and English service parity is part of the acceptance test.",
  },
  start: {
    heading: "How to start",
    body: "Bring one journey that breaks: a cancellation, a refund, a late check-in. We will trace it from the first signal to the resolved case and scope the first build.",
    bring: ["Volumes and cost per contact today", "Access to the reservation, inventory and loyalty systems, read-only to start", "The duty manager or service lead who decides the exceptions", "The policy limits inside which the system may act alone", "Real cases from the last quarter"],
  },
};

export const EDUCATION: IndustryPage = {
  slug: "education",
  name: "Education",
  path: "/industries/education",
  meta: {
    title: "AI for Education | Cognirise",
    description: "Where AI pays off for schools, universities and education authorities: teacher planning, student support, admissions, research and family communication.",
  },
  hero: {
    kicker: "Education",
    title: "AI for schools, universities and education authorities",
    lead: "Learning, teaching and the services around them. AI drafts, finds and prepares; teachers, advisers and researchers decide.",
    primary: VALUE_SCAN,
    secondary: CASES,
    image: { src: "/images/cognirise/industries/pulse-industry-education-campus-v4.png", alt: "A sunlit education campus atrium with library shelves, learning stairs and science rooms." },
  },
  useCases: [
    { task: "Teacher planning", aiDoes: "Turns approved standards and materials into lesson sequences, differentiated activities, rubrics and feedback", personDecides: "The teacher edits, approves and owns the pedagogy", measured: "Planning hours, use of approved materials, teacher ratings" },
    { task: "Student support and advising", aiDoes: "Answers a student's question in their own words from the policy and the student's record, and books the right appointment", personDecides: "The adviser decides anything with consequences: placement, welfare, discipline", measured: "Time to answer, cases resolved first time, adviser hours" },
    { task: "Admissions and registration", aiDoes: "Checks documents, completes forms from records already held and flags what is missing", personDecides: "Admissions staff decide the exceptions", measured: "Processing time, repeat requests for documents" },
    { task: "Research workflows", aiDoes: "Finds literature, drafts analysis code and documents the method, with sources", personDecides: "The researcher is responsible for sources, methods and results", measured: "Time to first result, reproducibility" },
    { task: "Family communication", aiDoes: "Drafts attendance, progress and event messages in the family's language", personDecides: "The school approves what is sent", measured: "Response rates, time saved, complaints" },
    { task: "Institutional knowledge", aiDoes: "Answers staff questions from policies, procedures and past decisions, with the source", personDecides: "Staff decide what to do with the answer", measured: "Time to answer, repeat questions" },
  ],
  workflow: {
    heading: "One worked example: a student asks for help",
    steps: [
      { name: "Ask", lane: "system", text: "The student writes, in their own words, that they may need to defer an exam.", owner: "The student portal", input: "The student writes, in their own words, that they may need to defer an exam", output: "A request, with the student identified", logged: "Student id, request text, time" },
      { name: "Find", lane: "ai", text: "The assistant finds the deferral policy and the student's record, with the relevant dates.", owner: "Student support assistant", input: "The request", output: "The deferral policy and the student's record, with the relevant dates", logged: "Policy version, records read" },
      { name: "Propose", lane: "ai", text: "It drafts an answer, the form pre-filled, and an appointment with the right adviser.", owner: "Student support assistant", input: "The policy and the record", output: "A draft answer, the form pre-filled, and an appointment with the right adviser", logged: "The draft and the appointment offered" },
      { name: "Decide", lane: "person", text: "The adviser approves the deferral, or changes the answer. Nothing with consequences is sent without them.", owner: "The adviser", input: "The draft", output: "The adviser approves the deferral, or changes the answer", logged: "Who decided, what changed, when", approval: true },
      { name: "Record", lane: "system", text: "The decision, the policy version and the message sent are logged for the student's file.", owner: "The student record system", input: "The decision", output: "The decision, the policy version and the message sent are logged for the student's file", logged: "Decision, policy version, message" },
    ],
  },
  built: {
    heading: "Related work",
    intro: "Our education work is not public yet. The closest published work is in knowledge assistants and services with a person deciding:",
    cards: [
      { title: "Industrial materials producer.", body: "A bilingual assistant that answers technical questions from the approved library, with the source, and routes the rest to an expert.", tag: "Client result" },
      { title: "European startup facilitator.", body: "A self-service portal where agents handle the front and back office; setting up a company went from 4 days to 4 minutes.", tag: "Client result" },
    ],
    link: { label: "All case studies", href: "/case-studies" },
  },
  view: {
    heading: "Our view",
    body: "Move the unit of innovation from the tool to the journey: the complete learner, teacher, researcher or family journey, not another chatbot. Lead with educational purpose and measure learning, workload and equity, not usage. In schools, access must be age-appropriate and teacher-controlled. In universities, agents act only inside approved, reviewable workflows, and the researcher stays responsible for the result.",
  },
  evidence: {
    heading: "What others have reported",
    rows: [
      { who: "UK Department for Education", what: "Aila, an AI lesson assistant", outcome: "Teachers create and adapt lesson plans from quality-assured national curriculum resources, with the teacher in control", source: "UK Government AI Knowledge Hub", url: "https://ai.gov.uk/knowledge-hub/tools/aila%3A-ai-lesson-assistant/", tag: "Published elsewhere" },
      { who: "Singapore Ministry of Education", what: "AI features in the national Student Learning Space", outcome: "Supports self-directed and collaborative learning while keeping teacher judgement central", source: "Singapore MOE", url: "https://www.moe.gov.sg/education-in-sg/educational-technology-journey/edtech-masterplan/artificial-intelligence-in-education", tag: "Published elsewhere" },
      { who: "Harvard", what: "A course-specific physics tutor, randomised study", outcome: "Scaffolded, self-paced practice in one course; a narrow setting that supports careful evaluation, not a general claim", source: "Scientific Reports", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260", tag: "Published elsewhere" },
      { who: "UAE Ministry of Education", what: "National AI curriculum and teacher upskilling", outcome: "AI literacy across ages, with a national programme to train teachers", source: "UAE Ministry of Education", url: "https://www.moe.gov.ae/en/mediacenter/news/Pages/MOE-and-HBMSU-launch-the-National-AI-Upskilling-Programme-for-Teachers.aspx", tag: "Published elsewhere" },
    ],
  },
  market: {
    heading: "In the UAE",
    body: "The national AI curriculum and the teacher upskilling programme set the direction. The opportunity is to connect classroom practice, educator capability and institutional redesign to measurable learning and public value.",
  },
  start: {
    heading: "How to start",
    body: "Bring one journey: student support, admissions, teacher planning or family communication. We will map it with the people who run it and scope the first build, with the safeguards written down first.",
    bring: ["Volumes and hours today", "The policies and materials the assistant may use", "The adviser, teacher or registrar who decides", "The age and access rules that apply", "Real cases from the last term"],
  },
};

export const MANUFACTURING: IndustryPage = {
  slug: "manufacturing",
  name: "Manufacturing",
  path: "/industries/manufacturing",
  meta: {
    title: "AI for Manufacturing | Cognirise",
    description: "Where AI pays off on the shop floor: in-line quality inspection, maintenance, planning, bill-of-materials optimisation and the shop-floor knowledge base.",
  },
  hero: {
    kicker: "Manufacturing",
    title: "AI for the shop floor",
    lead: "Quality, maintenance, planning and the knowledge of the people who run the line. AI sees, predicts and proposes; the operator and the maintenance lead decide.",
    primary: VALUE_SCAN,
    secondary: CASES,
    image: { src: "/images/cognirise/industries/pulse-industry-manufacturing-production.png", alt: "A production line with inspection stations and operators on the shop floor." },
  },
  useCases: [
    { task: "In-line quality inspection", aiDoes: "Reads camera and sensor data, flags defects and drafts the inspection record", personDecides: "The quality lead confirms rejects and adjusts the line", measured: "Defect escape rate and false-positive rate, both, always" },
    { task: "Maintenance signal to work order", aiDoes: "Matches telemetry to fault signatures, retrieves the procedure, proposes the work order and parts", personDecides: "The maintenance lead approves the work", measured: "Unplanned downtime, nuisance alerts, time from signal to work order" },
    { task: "Shop-floor knowledge assistant", aiDoes: "Answers procedure and troubleshooting questions from the SOPs, shift logs and maintenance history, in the operator's language", personDecides: "The operator decides what to do with the answer", measured: "Time to answer, SOP compliance, onboarding time" },
    { task: "Production planning and scheduling", aiDoes: "Proposes schedules and labour allocation against orders, capacity and skills", personDecides: "The planner approves the schedule", measured: "Throughput against the recorded starting point, overtime" },
    { task: "Bill of materials and cost", aiDoes: "Proposes recipe and material changes that meet quality limits at lower cost", personDecides: "The process engineer approves the change", measured: "Material cost per unit, quality within limits" },
    { task: "Emissions and compliance reporting", aiDoes: "Validates production, supplier and energy inputs and prepares the declaration", personDecides: "The compliance owner reviews and signs", measured: "Time to prepare, errors found before submission" },
  ],
  workflow: {
    heading: "One worked example: a fault on the line",
    steps: [
      { name: "Detect", lane: "system", text: "Telemetry on a filling line drifts outside its normal range.", owner: "Line telemetry", input: "Telemetry on a filling line drifts outside its normal range", output: "An alert with the line, the sensor and the reading", logged: "Line, sensor, reading, time" },
      { name: "Match", lane: "ai", text: "The pattern is compared with known fault signatures and the line's history.", owner: "Maintenance agent", input: "The alert and the line's history", output: "The pattern compared with known fault signatures and the line's history", logged: "Signatures compared, confidence" },
      { name: "Propose", lane: "ai", text: "The likely cause, the procedure and the parts are drafted into a work order.", owner: "Maintenance agent", input: "The likely cause", output: "The likely cause, the procedure and the parts, drafted into a work order", logged: "The draft and its sources" },
      { name: "Approve", lane: "person", text: "The maintenance lead approves the work before anything is issued.", owner: "The maintenance lead", input: "The draft work order", output: "Approved, changed or rejected before anything is issued", logged: "Who decided, what changed, when", approval: true },
      { name: "Execute and learn", lane: "system", text: "The work order is issued; the outcome is recorded against the signal.", owner: "The maintenance system", input: "The approved work order", output: "The work order is issued; the outcome is recorded against the signal", logged: "Work order number, outcome, time to repair" },
    ],
  },
  built: {
    heading: "What we have built",
    cards: [
      { title: "Industrial company, cement.", body: "Mixture recipes had to be managed against quality levels by hand. A deep-learning model now proposes the bill of materials against quality limits. Material cost down 20%.", tag: "Client result" },
      { title: "Beverage manufacturer.", body: "Line faults were diagnosed from memory. A maintenance flow now compares telemetry with known fault signatures, retrieves the procedure and requires approval before issuing work.", tag: "Client result" },
      { title: "Defence manufacturer.", body: "No direct way to query inventory and cost. An assistant answers ERP questions and suggests cost options. Total cost of materials down 20%.", tag: "Client result" },
      { title: "Cross-border manufacturer, embedded emissions.", body: "A data pipeline validates supplier, production and energy inputs, calculates product-level emissions and routes declarations for review.", tag: "Client result" },
    ],
    link: { label: "All manufacturing case studies", href: "/case-studies?industry=Manufacturing" },
  },
  view: {
    heading: "Our view",
    body: "Start where the physics is. The AI that has earned its place on the shop floor sees, simulates and predicts. The humanoid and the lights-out factory have not. Run it at the edge. Design the false-positive budget before the first alert reaches an operator. Use generative AI on the engineers' knowledge, not on the machine's safety function.",
  },
  evidence: {
    heading: "What others have reported",
    rows: [
      { who: "Unilever", what: "Process digital twins across its plants", outcome: "Waste down 20% and capacity up 10% at one site; defects down 30% over four years at another", source: "Unilever, June 2026", url: "https://www.unilever.com/news/press-and-media/press-releases/2026/unilever-scales-digital-twins-across-global-manufacturing-network-with-accenture/", tag: "Published elsewhere" },
      { who: "GE Aerospace", what: "AI inspection of engine blades", outcome: "Inspection time from 3 hours to 1.5; accuracy expected to improve; extended to further engine types", source: "GE Aerospace, October 2024", url: "https://www.geaerospace.com/news/press-releases/ge-aerospace-expanding-application-ai-blade-inspections-cfm-leap-and-ge9x-engines", tag: "Published elsewhere" },
      { who: "Emirates Global Aluminium", what: "Edge inference for video analytics, shop-floor apps", outcome: "86% lower cost than public cloud and 13 times faster response, as reported by the consultant; 1,500 users on shop-floor apps", source: "McKinsey case study", url: "https://www.mckinsey.com/capabilities/tech-and-ai/how-we-help-clients/rewired-in-action/emirates-global-aluminium-leading-the-industry-with-ai-driven-transformation", tag: "Published elsewhere" },
      { who: "Bosch", what: "Agent-based maintenance and labour scheduling", outcome: "Reduced unplanned downtime; savings of several million euros projected, not yet reported", source: "Bosch Tech Day, June 2025", url: "https://us.bosch-press.com/pressportal/us/en/press-release-27776.html", tag: "Published elsewhere" },
    ],
  },
  market: {
    heading: "In the Gulf",
    body: "Local value and skills, not labour cost, drive automation here. Edge inference keeps video and operator data in-country and works when disconnected. Arabic, English and the languages your operators speak are part of the acceptance test.",
  },
  start: {
    heading: "How to start",
    body: "Bring one line or one asset class with a measurable starting point: defect escape rate, unplanned downtime, planning hours. We will scope the first loop and the false-positive budget with your operators.",
    bring: ["The starting point: defects, downtime or hours today", "Access to the historian, the MES and the maintenance system", "The quality lead or maintenance lead who approves", "The safety functions no automation may touch", "Labelled examples from past faults or defects"],
  },
};

export const INDUSTRY_PAGES: IndustryPage[] = [FINANCIAL_SERVICES, TELECOMS, ENERGY_RESOURCES, TRAVEL_HOSPITALITY, EDUCATION, MANUFACTURING];
