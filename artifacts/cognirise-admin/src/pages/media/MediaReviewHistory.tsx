import { getListAuditEventsQueryKey, useListAuditEvents } from "@workspace/api-client-react";
import { format } from "date-fns";

type ReviewHistoryAsset = {
  id: string;
};

type MediaReviewHistoryProps = {
  asset: ReviewHistoryAsset;
  canInspect: boolean;
};

function decisionLabel(action: string): string {
  if (action === "media.approved") return "Approved";
  if (action === "media.rejected") return "Rejected";
  if (action === "media.updated") return "Metadata updated";
  if (action === "media.finalized") return "Uploaded";
  return action;
}

function actorLabel(actor: { name?: string; email?: string } | null | undefined): string {
  return actor?.name || actor?.email || "Unknown reviewer";
}

export function MediaReviewHistory({ asset, canInspect }: MediaReviewHistoryProps) {
  const history = useListAuditEvents(
    { page: 1, pageSize: 25, entityType: "media", entityId: asset.id },
    {
      query: {
        enabled: canInspect,
        retry: false,
        queryKey: getListAuditEventsQueryKey({ page: 1, pageSize: 25, entityType: "media", entityId: asset.id }),
      },
    },
  );

  if (!canInspect) {
    return (
      <section className="rounded-md border border-border bg-muted/10 p-4" aria-label="Review history">
        <h3 className="text-sm font-medium">Review history</h3>
        <p className="mt-1 text-xs text-muted-foreground">Review identity and audit history are available to administrators.</p>
      </section>
    );
  }

  const events = (history.data?.items ?? []).filter((event) => event.entityType === "media");
  return (
    <section className="space-y-3 rounded-md border border-border bg-muted/10 p-4" aria-label="Review history">
      <div>
        <h3 className="text-sm font-medium">Review history</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Immutable audit events for this asset. If an older event did not record its exact version, that identity is shown as not recorded.
        </p>
      </div>
      {history.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading audit history…</p>
      ) : history.isError ? (
        <p role="alert" className="text-xs text-destructive">Review history is unavailable. The asset itself is unchanged.</p>
      ) : events.length === 0 ? (
        <p className="text-xs text-muted-foreground">No audit events are available for this asset.</p>
      ) : (
        <ol className="space-y-2">
          {events.map((event) => {
            const metadata = event.metadata as Record<string, unknown> | undefined;
            const version = typeof metadata?.mediaVersionId === "string"
              ? metadata.mediaVersionId
              : typeof metadata?.versionId === "string"
                ? metadata.versionId
                : "not recorded";
            return (
              <li key={event.id} className="rounded border border-border bg-background p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{decisionLabel(event.action)}</span>
                  <time dateTime={new Date(event.createdAt).toISOString()} className="font-mono text-muted-foreground">
                    {format(new Date(event.createdAt), "MMM d, yyyy HH:mm")}
                  </time>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {actorLabel(event.actor)} · Version <span className="font-mono">{version}</span>
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}