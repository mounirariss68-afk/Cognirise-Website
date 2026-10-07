import React from "react";
import "./_group.css";
import "./selected-telecom-sections.css";
import { ValueMap } from "./ValueMap";
import { PriorityMap } from "./PriorityMap";
import { WorkforceMap } from "./WorkforceMap";
import { ArchitectureTrace } from "./ArchitectureTrace";
import { WorkflowLanes } from "./WorkflowLanes";
import { InvestigationPaths } from "./InvestigationPaths";

const sections = [
  ["telecom-selected-value-pools", "Value pools"],
  ["telecom-selected-prioritisation", "Prioritisation"],
  ["telecom-selected-workforce", "18 departments"],
  ["telecom-selected-architecture", "Architecture"],
  ["telecom-selected-workflows", "Workflows"],
  ["telecom-selected-rafm", "Revenue & fraud"],
] as const;

export function SelectedTelecomSections() {
  return (
    <div className="selected-telecom">
      <nav className="selected-telecom-nav" aria-label="Telecom page sections">
        <a className="selected-telecom-mark" href="#telecom-selected-value-pools">COGNIRISE <span>TELECOM</span></a>
        <div>{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</div>
      </nav>
      <section id={sections[0][0]}><ValueMap /></section>
      <section id={sections[1][0]}><PriorityMap /></section>
      <section id={sections[2][0]}><WorkforceMap /></section>
      <section id={sections[3][0]}><ArchitectureTrace /></section>
      <section id={sections[4][0]}><WorkflowLanes /></section>
      <section id={sections[5][0]}><InvestigationPaths /></section>
    </div>
  );
}
