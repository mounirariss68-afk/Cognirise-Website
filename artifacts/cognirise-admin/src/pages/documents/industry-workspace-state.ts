import type { IndustrySectionId } from "@workspace/api-zod";

export type IndustryDisclosureState = "expanded" | "collapsed" | undefined;
export type IndustryPreviewViewport = "desktop" | "tablet" | "mobile";

export const INDUSTRY_PREVIEW_WIDTHS: Readonly<Record<IndustryPreviewViewport, number>> = {
  desktop: 1280,
  tablet: 768,
  mobile: 390,
};

export const INDUSTRY_PREVIEW_WIDTH_CLASSES: Readonly<Record<IndustryPreviewViewport, string>> = {
  desktop: "w-[1280px] min-w-[1280px]",
  tablet: "w-[768px] min-w-[768px]",
  mobile: "w-[390px] min-w-[390px]",
};

/** Uses the workspace's available inline size, not the browser viewport. */
export function industryWorkspaceLayout(availableWidth: number): "stacked" | "preview-row" | "three-column" {
  if (availableWidth < 760) return "stacked";
  return availableWidth >= 1280 ? "three-column" : "preview-row";
}

export function nextIndustryDisclosureState(current: IndustryDisclosureState): "expanded" | "collapsed" {
  return current === "expanded" ? "collapsed" : "expanded";
}

export function industryPreviewFocusMessage(
  section: IndustrySectionId,
  expandable: boolean,
  state: IndustryDisclosureState,
) {
  return {
    type: "industry-preview-focus" as const,
    section,
    state: expandable ? state : undefined,
  };
}

/**
 * Keeps protected-preview issuance last-request-wins for both automatic
 * revision changes and an editor’s manual refresh. Rejections are consumed so
 * a revoked/expired capability cannot create an unhandled promise.
 */
export function createLatestPreviewRequestCoordinator<T>(
  onValue: (value: T) => void,
  onError: () => void,
) {
  let sequence = 0;
  return {
    async issue(request: () => Promise<T>) {
      const requestSequence = ++sequence;
      try {
        const value = await request();
        if (requestSequence === sequence) onValue(value);
      } catch {
        if (requestSequence === sequence) onError();
      }
    },
    cancel() {
      sequence += 1;
    },
  };
}