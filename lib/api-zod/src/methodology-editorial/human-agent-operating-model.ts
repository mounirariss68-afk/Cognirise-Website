import {
  defineMethodologyEditorialTemplate,
  fixed,
  fixedList,
  group,
  link,
  text,
} from "./contract";

/** The shared hero continues to use the framework hero schema and its
 * immutable CMS media reference. Keep the original compiled values here for
 * migration inventory and the no-CMS delivery path. */
export const heroSeed = {
  breadcrumb: "Methodologies / 04",
  title: "Redesign the work, not just the technology.",
  description: "Turn an AI-enabled workflow into a clear operating agreement between people and agents—who owns the outcome, who may decide, how handovers work and what proves the model is taking hold.",
  imageSrc: "/images/cognirise/method-haom-v2.jpg",
  imageAlt: "Cinematic raster composition showing human-agent interaction and handovers",
  imageCaptionSubtitle: "Human-Agent Operating Model Playbook",
  imageCaptionTitle: "Collaboration without shadow coordination.",
} as const;

export const humanAgentOperatingModelEditorial = defineMethodologyEditorialTemplate({
  template: "human-agent-operating-model",
  editorial: group({
    relationship: group({
      startHereWhen: text("An AI capability is entering live work, requiring changes to roles, rights, handovers, incentives, and operational measures.", "Start here when", { format: "long" }),
      decision: text("How must roles, rights and handovers change when AI enters real work?", "Decision", { format: "long" }),
      output: text("A role and handover design, decision-rights map, capability plan, incentive changes, and adoption measures.", "Output", { format: "long" }),
      connectsToIdao: text("Shapes roles, handovers, capabilities, incentives and measures throughout Innovate, Demonstrate, Activate and Operate. Live evidence can return weak assumptions to the responsible stage.", "Connection to IDAO", { format: "long" }),
      connectsToAuthority: text("Converts identified handovers into explicit propose, approve, act, intervene and demotion rights. Uses the Agent Authority Model calculation to bound the autonomy of those rights.", "Connection to Agent Authority", { format: "long" }),
      reassessWhen: text("Agents gain new capabilities, exception volume overwhelms human supervisors, or business incentives drift away from the workflow's purpose.", "Reassess when", { format: "long" }),
      doesNotDecide: text("If the underlying workflow is stable enough to automate (use Agentic Operations Readiness).", "Does not decide", { format: "long" }),
    }),
    boundary: group({
      kicker: text("The Boundary", "Boundary kicker"),
      heading: text("A rollout installs a tool. An operating model changes how work runs.", "Boundary heading", { format: "long" }),
      technologyRollout: group({
        heading: text("Technology rollout", "Technology rollout heading"),
        items: fixedList("Technology rollout points", [
          text("Configures access and integrations", "Technology rollout point 1"),
          text("Explains features and prompts", "Technology rollout point 2"),
          text("Tracks attendance, licences and usage", "Technology rollout point 3"),
          text("Supports initial technical adoption", "Technology rollout point 4"),
        ] as const),
      }),
      operatingModelChange: group({
        heading: text("Operating-model change", "Operating-model change heading"),
        items: fixedList("Operating-model change points", [
          text("Changes roles, accountabilities and spans", "Operating-model change point 1"),
          text("Reallocates decision and intervention rights", "Operating-model change point 2"),
          text("Redesigns handovers, controls and incentives", "Operating-model change point 3"),
          text("Proves outcomes persist in live operation", "Operating-model change point 4"),
        ] as const),
      }),
    }),
    playbook: group({
      kicker: text("Five design moves", "Playbook kicker"),
      heading: text("Start with one real workflow. Finish with an operable design.", "Playbook heading", { format: "long" }),
      outputLabel: text("Output", "Playbook output label"),
      steps: fixedList("Five design moves", [
        group({
          id: fixed("trace-live-work"),
          number: fixed("01"),
          title: text("Trace the live work", "Design move 1 title"),
          description: text("Map the work as it happens: demand, decisions, exceptions, queues, evidence and the people who carry hidden coordination.", "Design move 1 description", { format: "long" }),
          output: text("Work and handover baseline", "Design move 1 output"),
        }),
        group({
          id: fixed("redesign-roles-and-handovers"),
          number: fixed("02"),
          title: text("Redesign roles and handovers", "Design move 2 title"),
          description: text("Decide what people lead, what agents support or execute, and how ownership moves without losing context or accountability.", "Design move 2 description", { format: "long" }),
          output: text("Role and handover design", "Design move 2 output"),
        }),
        group({
          id: fixed("set-decision-rights"),
          number: fixed("03"),
          title: text("Set decision rights", "Design move 3 title"),
          description: text("Name who proposes, approves, acts, intervenes and remains accountable for each consequential decision and handover.", "Design move 3 description", { format: "long" }),
          output: text("Decision-rights map", "Design move 3 output"),
        }),
        group({
          id: fixed("build-operating-capability"),
          number: fixed("04"),
          title: text("Build operating capability", "Design move 4 title"),
          description: text("Define the judgement, supervision, exception handling, evidence literacy and improvement routines each role needs.", "Design move 4 description", { format: "long" }),
          output: text("Capability and enablement plan", "Design move 4 output"),
        }),
        group({
          id: fixed("align-incentives-and-measures"),
          number: fixed("05"),
          title: text("Align incentives and measures", "Design move 5 title"),
          description: text("Remove targets that reward unsafe automation or hidden rework. Measure confident use, intervention, quality and sustained outcomes.", "Design move 5 description", { format: "long" }),
          output: text("Adoption measures and incentive changes", "Design move 5 output"),
        }),
      ] as const),
    }),
    handoverChoreography: group({
      heading: text("Handover Choreography across IDAO", "Handover choreography heading"),
      stages: fixedList("IDAO handover choreography stages", [
        group({ id: fixed("innovate"), stage: text("Innovate", "Innovate stage"), body: text("Identify roles and constraints.", "Innovate stage description", { format: "long" }) }),
        group({ id: fixed("demonstrate"), stage: text("Demonstrate", "Demonstrate stage"), body: text("Test handover logic safely.", "Demonstrate stage description", { format: "long" }) }),
        group({ id: fixed("activate"), stage: text("Activate", "Activate stage"), body: text("Install explicit rights pointing to Agent Authority.", "Activate stage description", { format: "long" }) }),
        group({ id: fixed("operate"), stage: text("Operate", "Operate stage"), body: text("Measure and loop back.", "Operate stage description", { format: "long" }) }),
      ] as const),
    }),
    decisionRights: group({
      kicker: text("Decision-rights map", "Decision-rights kicker"),
      heading: text("Make authority visible at every move.", "Decision-rights heading", { format: "long" }),
      description: text("A role title is not a control. The map records what the person and agent may do at each point, the evidence they need and the condition that moves authority back to a person.", "Decision-rights description", { format: "long" }),
      headers: group({
        right: text("Right", "Decision-rights table right header"),
        person: text("Person", "Decision-rights table person header"),
        agent: text("Agent", "Decision-rights table agent header"),
      }),
      rows: fixedList("Decision-rights table rows", [
        group({ id: fixed("frame"), right: text("Frame", "Frame right"), person: text("Sets the outcome, boundaries and evidence required", "Frame person"), agent: text("Contributes options and operating evidence", "Frame agent") }),
        group({ id: fixed("recommend"), right: text("Recommend", "Recommend right"), person: text("Challenges assumptions and interprets context", "Recommend person"), agent: text("Produces traceable analysis or a proposed next action", "Recommend agent") }),
        group({ id: fixed("approve"), right: text("Approve", "Approve right"), person: text("Retains authority where exposure requires it", "Approve person"), agent: text("Waits at the defined gate and preserves the approval record", "Approve agent") }),
        group({ id: fixed("act"), right: text("Act", "Act right"), person: text("Handles exceptions and actions reserved for people", "Act person"), agent: text("Executes only within its permitted authority and constraints", "Act agent") }),
        group({ id: fixed("intervene"), right: text("Intervene", "Intervene right"), person: text("Pauses, overrides, escalates or demotes authority", "Intervene person"), agent: text("Surfaces thresholds, uncertainty and control breaches", "Intervene agent") }),
      ] as const),
      authorityCeiling: group({
        heading: text("Consequential handovers need an authority ceiling.", "Authority ceiling heading", { format: "long" }),
        description: text("For every explicit propose, approve, act, intervene, and demotion right that can materially affect a person, record, system or service, point to the Agent Authority Model calculation to set permitted autonomy.", "Authority ceiling description", { format: "long" }),
        cta: link("Set the authority", "/methodologies/agent-authority-model", "Authority ceiling call to action"),
      }),
    }),
    capability: group({
      kicker: text("Capability, not attendance", "Capability kicker"),
      heading: text("Prepare people to operate, challenge and improve the system.", "Capability heading", { format: "long" }),
      description: text("The capability plan is role-specific. It combines practice in live scenarios, observed proficiency and support at the moment of work—not a generic course-completion target.", "Capability description", { format: "long" }),
      cards: fixedList("Capability cards", [
        group({ id: fixed("role-practice"), icon: fixed("users"), title: text("Role practice", "Role practice title"), body: text("Rehearse the normal route, exceptions and fallback with the people who will own them.", "Role practice description", { format: "long" }) }),
        group({ id: fixed("control-fluency"), icon: fixed("shield-check"), title: text("Control fluency", "Control fluency title"), body: text("Recognise uncertainty, challenge evidence, intervene and document why authority changed.", "Control fluency description", { format: "long" }) }),
        group({ id: fixed("handover-discipline"), icon: fixed("git-branch"), title: text("Handover discipline", "Handover discipline title"), body: text("Pass context, state and accountability without creating shadow coordination.", "Handover discipline description", { format: "long" }) }),
        group({ id: fixed("improvement-ownership"), icon: fixed("arrow-right"), title: text("Improvement ownership", "Improvement ownership title"), body: text("Use operating evidence to adjust roles, controls and workflow—not only the model.", "Improvement ownership description", { format: "long" }) }),
      ] as const),
    }),
    measures: group({
      kicker: text("Adoption and sustained operation", "Measures kicker"),
      heading: text("Measure behaviour, control and outcomes—not logins alone.", "Measures heading", { format: "long" }),
      description: text("Activation begins when the redesigned route can run safely in live work. Sustained operation begins when the client team owns the routines, evidence and improvement cycle.", "Measures description", { format: "long" }),
      groups: fixedList("Adoption measure groups", [
        group({ id: fixed("use"), title: text("Use", "Use measure title"), measures: fixedList("Use measures", [text("Eligible work using the new route", "Use measure 1"), text("Active use by role and team", "Use measure 2"), text("Fallback to the old process", "Use measure 3")] as const) }),
        group({ id: fixed("control"), title: text("Control", "Control measure title"), measures: fixedList("Control measures", [text("Interventions made in time", "Control measure 1"), text("Exceptions resolved by the named owner", "Control measure 2"), text("Authority demotions and control breaches", "Control measure 3")] as const) }),
        group({ id: fixed("capability"), title: text("Capability", "Capability measure title"), measures: fixedList("Capability measures", [text("Observed proficiency in live work", "Capability measure 1"), text("Confidence to challenge an agent output", "Capability measure 2"), text("Time to independent operation", "Capability measure 3")] as const) }),
        group({ id: fixed("outcome"), title: text("Outcome", "Outcome measure title"), measures: fixedList("Outcome measures", [text("Quality and cycle-time movement", "Outcome measure 1"), text("Rework displaced rather than hidden", "Outcome measure 2"), text("Value sustained after handover", "Outcome measure 3")] as const) }),
      ] as const),
    }),
    idaoConnection: group({
      kicker: text("Connection to IDAO", "IDAO connection kicker"),
      heading: text("Design before launch. Learn after it.", "IDAO connection heading", { format: "long" }),
      activateLabel: text("Activate", "IDAO Activate label"),
      activateDescription: text("uses the role, rights, capability and measure designs to prepare the live workflow, rehearse exceptions and confirm ownership.", "IDAO Activate description", { format: "long" }),
      operateLabel: text("Operate", "IDAO Operate label"),
      operateDescription: text("uses real performance, interventions and workforce evidence to improve the model and return weak assumptions to the right IDAO stage.", "IDAO Operate description", { format: "long" }),
      cta: link("Explore the IDAO lifecycle", "/methodologies/idao#lifecycle", "IDAO lifecycle call to action"),
    }),
    finalCta: group({
      kicker: text("Start with live work", "Final call to action kicker"),
      heading: text("Bring one workflow where people and agents must work together.", "Final call to action heading", { format: "long" }),
      description: text("We will identify the first operating-model decision, the evidence it needs and the right IDAO entry point.", "Final call to action description", { format: "long" }),
      cta: link("Book a Value Scan", "/value-scan", "Final call to action"),
    }),
  }),
});