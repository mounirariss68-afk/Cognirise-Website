import {
  defineMethodologyEditorialTemplate,
  fixedList,
  group,
  link,
  text,
} from "./contract";

/**
 * The hero is rendered by the shared methodology hero, rather than by this
 * route's editorial template. Keep its original values here so inventory and
 * migration code have one exact, route-owned baseline (including the source
 * path that must be reconciled to CMS media).
 */
export const heroSeed = {
  breadcrumb: "Methodologies / 03",
  title: "AI Use-Case Portfolio Prioritization.",
  description: "A serious working instrument for transformation leaders to transparently evaluate AI opportunities against value, feasibility, and risk—before committing funding.",
  supportingText: "This framework aligns decisions to your specific operational context, intentionally avoiding generic statistical benchmarks. The output connects directly to the IDAO delivery methodology.",
  imageSrc: "/images/cognirise/method-ucp-governed-ai-v3.jpg",
  imageAlt: "Architectural gateways and transparent panels crossed by a flowing stream of violet, pink, and coral light.",
  imageCaptionSubtitle: "Portfolio Strategy",
  imageCaptionTitle: "Directing energy where it earns value.",
} as const;

export const aiUseCasePrioritizationEditorial = defineMethodologyEditorialTemplate({
  template: "ai-use-case-prioritization",
  editorial: group({
    relationship: group({
      startHereWhen: text("You have multiple opportunities or a defined use case, and need to decide which should advance, how they sequence, and where they enter delivery.", "Relationship: start here when", { format: "long" }),
      decision: text("Which opportunities should advance, sequence or stop?", "Relationship: decision"),
      output: text("A transparent comparative scorecard and a clear recommendation to enter Innovate, Demonstrate, Activate, or to Stop.", "Relationship: output", { format: "long" }),
      connectsToIdaoBefore: text("Recommends whether an opportunity should stop, be investigated in", "Relationship: IDAO connection (before Innovate)", { format: "long" }),
      innovate: text("Innovate", "Relationship: IDAO connection (Innovate)"),
      connectsToIdaoBetweenInnovateAndDemonstrate: text(", proved through", "Relationship: IDAO connection (between Innovate and Demonstrate)", { format: "long" }),
      demonstrate: text("Demonstrate", "Relationship: IDAO connection (Demonstrate)"),
      connectsToIdaoBetweenDemonstrateAndActivate: text(", or moved into", "Relationship: IDAO connection (between Demonstrate and Activate)", { format: "long" }),
      activate: text("Activate", "Relationship: IDAO connection (Activate)"),
      connectsToIdaoAfter: text(".", "Relationship: IDAO connection (after Activate)"),
      connectsToAuthority: text("Examines exposure and required oversight (Control Burden dimension) to inform sequence and IDAO entry. Agent Authority will later govern the specific handovers inside the delivered workflow.", "Relationship: authority connection", { format: "long" }),
      reassessWhen: text("Business value changes, new platform capabilities alter feasibility, or a previously stopped opportunity resolves its blocking dependency.", "Relationship: reassess when", { format: "long" }),
      doesNotDecide: text("The systemic readiness of the organization (use AI Value-to-Scale) or the operational conditions of a detailed workflow (use Agentic Operations Readiness).", "Relationship: does not decide", { format: "long" }),
    }),
    portfolio: group({
      kicker: text("The Portfolio", "Portfolio kicker"),
      heading: text("Score opportunities across six dimensions.", "Portfolio heading"),
      introduction: text("Reveal the responsible path to production. Each criterion uses your evidence and judgement on a 1–5 planning scale. The sum helps sequence comparable opportunities; specific thresholds determine the entry stage or stop decision.", "Portfolio introduction", { format: "long" }),
      boundary: text("These are not market benchmarks, probabilities or a certification. Compare opportunities scored by the same decision group, record uncertainty as a caveat, and revisit scores when evidence changes.", "Portfolio boundary", { format: "long" }),
      addOpportunity: text("Add another opportunity", "Add opportunity action"),
      progressHeading: text("Assessment progress", "Assessment progress heading"),
      progressBetweenCounts: text("of", "Assessment progress between counts"),
      progressAfterCounts: text("opportunities have a name and outcome.", "Assessment progress after counts"),
      progressNotice: text("Answers remain in this page only. Reloading or leaving clears unsaved work.", "Assessment progress notice"),
      resetAssessment: text("Reset assessment", "Reset assessment action"),
    }),
    assessmentCard: group({
      opportunityPrefix: text("Opportunity 0", "Opportunity number prefix"),
      removeOpportunity: text("Remove opportunity", "Remove opportunity action"),
      opportunityNamePlaceholder: text("Opportunity Name", "Opportunity name placeholder"),
      outcomeSought: text("Outcome sought", "Outcome sought label"),
      outcomePlaceholder: text("What business or service outcome would improve?", "Outcome placeholder"),
      caveatsAndConstraints: text("Caveats & Constraints", "Caveats and constraints label"),
      caveatsPlaceholder: text("Record specific risks, data privacy concerns, or dependencies...", "Caveats placeholder"),
      dependencies: text("Dependencies", "Dependencies label"),
      dependenciesPlaceholder: text("Name prerequisite data, access, policy, platform or owner decisions.", "Dependencies placeholder"),
      evaluationCriteria: text("Evaluation Criteria", "Evaluation criteria heading"),
      scale: text("1–5 Scale", "Evaluation scale label"),
      viewStage: text("View stage", "IDAO stage action"),
      controlBurdenNote: group({
        heading: text("Note on Control Burden:", "Control burden note heading"),
        beforeAuthorityLink: text("Reflects exposure and required oversight. It can change priority, scope, or IDAO entry point.", "Control burden note before authority link", { format: "long" }),
        authorityLink: link("Use Agent Authority", "/methodologies/agent-authority-model", "Control burden authority link"),
        afterAuthorityLink: text("separately when a consequential handover exists.", "Control burden note after authority link", { format: "long" }),
      }),
    }),
    sampleOpportunities: fixedList("Sample opportunities", [
      group({
        name: text("Customer Onboarding Document Extraction", "First sample opportunity name"),
        caveats: text("High data privacy requirements; PII handling must be strictly governed and approved.", "First sample opportunity caveats", { format: "long" }),
        dependencies: text("Approved data access, retention rules and a named information owner.", "First sample opportunity dependencies", { format: "long" }),
      }),
      group({
        name: text("Legacy System Chat Interface", "Second sample opportunity name"),
        caveats: text("API access to the legacy core banking system is undocumented and notoriously unstable.", "Second sample opportunity caveats", { format: "long" }),
        dependencies: text("A stable read-only integration contract and accountable system owner.", "Second sample opportunity dependencies", { format: "long" }),
      }),
    ]),
    analysis: group({
      kicker: text("Analysis", "Analysis kicker"),
      heading: text("Portfolio Outcome", "Analysis heading"),
      introduction: text("Transparent sequencing and dependency recommendations based on the scored dimensions.", "Analysis introduction", { format: "long" }),
      groups: fixedList("Portfolio analysis groups", [
        group({
          title: text("Ready for Production (Activate)", "Activate analysis title"),
          description: text("High feasibility and low adoption friction. These opportunities are ready for immediate technical integration and scaling without requiring bounded discovery.", "Activate analysis description", { format: "long" }),
        }),
        group({
          title: text("Requires Evidence (Demonstrate & Innovate)", "Evidence analysis title"),
          description: text("High strategic value but constrained by feasibility, adoption friction, or lack of evidence. Sequence these into bounded proving grounds to earn the right to scale.", "Evidence analysis description", { format: "long" }),
        }),
        group({
          title: text("Do Not Fund (Stop)", "Stop analysis title"),
          description: text("Low value or an unacceptable delivery risk profile. Stop these initiatives before investing resources.", "Stop analysis description", { format: "long" }),
        }),
      ]),
      empty: text("Add opportunities to view the portfolio analysis.", "Empty portfolio analysis message"),
      sequencePrefix: text("Sequence", "Analysis sequence prefix"),
      unnamedOpportunity: text("Unnamed Opportunity", "Unnamed opportunity label"),
      resolveBeforeEntry: text("Resolve before entry:", "Dependency label"),
      caveat: text("Caveat:", "Caveat label"),
      totalScore: text("Total Score", "Total score label"),
    }),
    nextSteps: group({
      heading: text("Next Steps", "Next steps heading"),
      body: text("Bring your prioritized portfolio to a Value Scan. We will test the highest-scoring opportunity and map the exact route to production with your team.", "Next steps body", { format: "long" }),
      valueScan: link("Book a Value Scan", "/value-scan", "Value Scan action"),
      idaoHeading: text("The IDAO Canon", "IDAO Canon heading"),
      idaoBody: text("See how approved opportunities move through Innovate, Demonstrate, Activate, and Operate with governed controls.", "IDAO Canon body", { format: "long" }),
      idaoLink: link("Explore the methodology", "/methodologies/idao", "IDAO methodology action"),
      creatingReport: text("Creating report…", "Creating report status"),
      downloadResults: text("Download results (PDF)", "Download results action"),
      downloadFailure: text("Your results PDF could not be created. Please try again.", "Download failure message"),
      print: text("Print", "Print action"),
      incompleteExport: text("Add a name and outcome to every opportunity before exporting a complete result.", "Incomplete export message"),
      localPdfNotice: text("The designed Pulse PDF is generated locally. Opportunity notes are never sent to Cognirise.", "Local PDF privacy notice"),
    }),
  }),
});