import React from "react";
import type { TelecomPov } from "@workspace/api-zod";

const TelecomData = React.createContext<TelecomPov | null>(null);
const WorkflowSelection = React.createContext<{ id: string; select: (id: string) => void } | null>(null);

export function TelecomDataProvider({ value, children }: { value: TelecomPov; children: React.ReactNode }) {
  const [selected, select] = React.useState(value.scenarios[0]?.id ?? "");
  const id = value.scenarios.some(s => s.id === selected) ? selected : value.scenarios[0]?.id ?? "";
  return <TelecomData.Provider value={value}><WorkflowSelection.Provider value={{ id, select }}>{children}</WorkflowSelection.Provider></TelecomData.Provider>;
}

export function useTelecomWorkflow() {
  const workflow = React.useContext(WorkflowSelection);
  if (!workflow) throw new Error("Telecom workflow selection requires its edition provider.");
  return workflow;
}

export function useTelecomData(): TelecomPov {
  const data = React.useContext(TelecomData);
  if (!data) throw new Error("Telecom sections require the current edition's content.");
  return data;
}
