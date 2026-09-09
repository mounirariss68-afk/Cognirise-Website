import type { Document } from "@workspace/api-client-react";

type OfficeLifecycleDocument = Pick<Document, "kind" | "status" | "canPermanentlyDelete">;

export function officeLifecycleAction(
  document: OfficeLifecycleDocument,
): "restore" | "archive" | "delete" {
  if (document.kind !== "office") {
    throw new Error("Office lifecycle actions require an office document.");
  }
  if (document.status === "archived") return "restore";
  return document.canPermanentlyDelete ? "delete" : "archive";
}