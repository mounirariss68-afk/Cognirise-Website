import { createContext, useContext } from "react";
import type { SharedMarketOverride } from "@workspace/api-client-react";

type OverridesContextType = {
  isAdapted: boolean;
  canEdit: boolean;
  operations: SharedMarketOverride[];
  /** Marks a real locally edited leaf until the normal draft PATCH persists it. */
  onOverride?: (path: string, value: unknown) => void;
  /** Removes persisted sparse operations and rematerializes the exact draft. */
  onReset?: (path: string) => void;
};

export const OverridesContext = createContext<OverridesContextType>({
  isAdapted: false,
  canEdit: false,
  operations: [],
});

export const useOverrides = () => useContext(OverridesContext);
