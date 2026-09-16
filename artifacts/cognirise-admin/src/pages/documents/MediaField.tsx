import { useState } from "react";
import { getGetMediaQueryKey, getListMediaQueryKey, useGetMedia, useListMedia, useRequestMediaUpload, useFinalizeMediaUpload } from "@workspace/api-client-react";
import { Check, ImageIcon, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOverrides } from "./OverridesContext";
import { FieldOverrideIndicator } from "./FieldOverrideIndicator";

type Asset = {
  id: string;
  versionId: string;
  filename: string;
  publicUrl?: string | null;
  mimeType: string;
  status: string;
  altText?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
};
export type MediaSelection = {
  mediaId: string;
  mediaVersionId: string;
  role: "identity" | "logo" | "hero" | "supporting" | "background" | "icon" | "og-image" | "document";
  altText?: string;
};

export function MediaField({ label, value, legacyMediaId, onChange, accept = "image", required = false, role = "hero", overridePath, fieldPath, disabled = false }: {
  label: string;
  value?: MediaSelection;
  legacyMediaId?: string;
  onChange: (selection: MediaSelection | undefined) => void;
  accept?: "image" | "pdf" | "video";
  required?: boolean;
  role?: MediaSelection["role"];
  /** Stable snapshot path, for example content.heroMedia. */
  overridePath?: string;
  /** Stable focus target when this picker writes more than one stored field. */
  fieldPath?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [altText, setAltText] = useState("");
  const [uploadError, setUploadError] = useState("");
  const targetPath = fieldPath ?? overridePath;
  const fieldTargetId = targetPath
    ? `content-${targetPath.replace(/^content\./, "").replace(/[^a-zA-Z0-9_-]/g, "-")}`
    : undefined;
  const requestUpload = useRequestMediaUpload();
  const finalizeUpload = useFinalizeMediaUpload();
  const params = { page: 1, pageSize: 100, search: search || undefined, collection: "website" as const };
  const media = useListMedia(params, { query: { queryKey: getListMediaQueryKey(params), enabled: open || Boolean(value) } });
  const selectedMediaId = value?.mediaId ?? legacyMediaId ?? "";
  const overrides = useOverrides();
  const isOverride = Boolean(overridePath && overrides.operations.some((operation) =>
    operation.path === overridePath
      || operation.path.startsWith(`${overridePath}.`)
      || overridePath.startsWith(`${operation.path}.`),
  ));
  const change = (selection: MediaSelection | undefined) => {
    if (overridePath) overrides.onOverride?.(overridePath, selection);
    onChange(selection);
  };
  const exact = useGetMedia(selectedMediaId, {
    query: { queryKey: getGetMediaQueryKey(selectedMediaId), enabled: Boolean(selectedMediaId) },
  });
  const assets = ((media.data?.items ?? []) as Asset[]).filter((asset) =>
    ["ready", "active"].includes(asset.status)
    && Boolean(asset.versionId)
    && (accept === "pdf"
      ? asset.mimeType === "application/pdf"
      : accept === "video"
        ? asset.mimeType === "video/mp4" || asset.mimeType === "video/webm"
        : asset.mimeType.startsWith("image/")),
  );
  // Prefer the approved item from the current list over an older exact-item
  // snapshot. Approval changes the API status and appends a metadata version,
  // so a selected field must not keep rendering a stale review response.
  const selected = assets.find((asset) => asset.id === selectedMediaId)
    ?? (exact.data as Asset | undefined);
  const upload = async (file: File) => {
    if (
      (accept === "image" && !file.type.startsWith("image/"))
      || (accept === "video" && file.type !== "video/mp4" && file.type !== "video/webm")
      || (accept === "pdf" && file.type !== "application/pdf")
    ) return;
    const requested = await requestUpload.mutateAsync({ data: {
      filename: file.name, mimeType: file.type, size: file.size, collection: "website",
    } });
    const stored = await fetch(requested.uploadUrl, { method: requested.method, headers: requested.headers, body: file });
    if (!stored.ok) throw new Error("Upload failed");
    const finalized = await finalizeUpload.mutateAsync({ mediaId: requested.media.id, data: { objectPath: requested.media.objectPath, altText: altText || undefined } });
    change({ mediaId: finalized.id, mediaVersionId: finalized.versionId, role, altText: altText || undefined });
  };

  return (
    <div id={fieldTargetId} data-field-path={targetPath} tabIndex={fieldTargetId ? -1 : undefined} className="space-y-2">
      {overridePath && overrides.isAdapted && <FieldOverrideIndicator
        label={label}
        isOverride={isOverride}
        canEdit={overrides.canEdit}
        onResetToShared={() => overrides.onReset?.(overridePath)}
      />}
      <Label>{label} <span className={required ? "text-destructive" : "text-muted-foreground"}>{required ? "(required before publishing)" : "(optional)"}</span></Label>
      {selected ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 p-2 sm:gap-3" data-testid={`selected-media-${label.toLowerCase().replaceAll(" ", "-")}`}>
          {selected.publicUrl && selected.mimeType.startsWith("image/") ? (
            <img src={selected.publicUrl} alt={selected.altText || selected.filename} className="h-14 w-20 shrink-0 rounded object-cover" />
          ) : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
          <div className="min-w-0 flex-1 basis-[10rem]">
            <p className="truncate text-sm font-medium">{selected.filename}</p>
            <p className="text-xs text-muted-foreground">
              {selected.width && selected.height ? `${selected.width} × ${selected.height} · ` : ""}
              {value?.mediaVersionId ? `Pinned version ${value.mediaVersionId.slice(0, 8)}` : "Saved legacy asset"}
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={disabled} onClick={() => setOpen(true)} data-testid={`button-replace-${label.toLowerCase().replaceAll(" ", "-")}`}>Replace</Button>
          <Button type="button" size="icon" variant="ghost" disabled={disabled} onClick={() => change(undefined)} aria-label={`Remove ${label}`} data-testid={`button-remove-${label.toLowerCase().replaceAll(" ", "-")}`}><X className="h-4 w-4" /></Button>
        </div>
      ) : (
          <Button type="button" variant="outline" disabled={disabled} onClick={() => setOpen(true)} data-testid={`button-choose-${label.toLowerCase().replaceAll(" ", "-")}`}>
           <ImageIcon className="mr-2 h-4 w-4" /> Choose approved {accept}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">Choose by preview and filename. The saved revision pins the exact approved asset version.</p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-3xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Select {label}</DialogTitle>
            <DialogDescription>Only approved, versioned {accept === "pdf" ? "PDFs" : accept === "video" ? "MP4 and WebM video" : "images"} are shown.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search approved media…" className="pl-9" data-testid="input-search-contextual-media" />
          </div>
          <div className="rounded-md border border-dashed p-3">
            <Label htmlFor="contextual-media-upload" className="text-xs">Upload a new asset</Label>
            <Input id="contextual-media-upload" type="file" accept={accept === "pdf" ? "application/pdf" : accept === "video" ? "video/mp4,video/webm" : "image/*"} className="mt-2" onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try { setUploadError(""); await upload(file); setOpen(false); } catch (error) { setUploadError(error instanceof Error ? error.message : "Upload failed"); }
            }} data-testid="input-upload-contextual-media" />
            <Input value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Accessibility text (recommended)" className="mt-2" data-testid="input-contextual-media-alt" />
            <p className="mt-1 text-xs text-muted-foreground">The asset is finalized with this metadata and selected by immutable version. Publication remains blocked until media review approves it.</p>
            {uploadError && <p role="alert" className="mt-1 text-xs text-destructive">{uploadError}</p>}
          </div>
           <div className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
            {assets.map((asset) => (
              <button
                type="button"
                key={asset.id}
               onClick={() => { change({ mediaId: asset.id, mediaVersionId: asset.versionId, role, altText: asset.altText ?? undefined }); setOpen(false); }}
                className="overflow-hidden rounded-md border bg-card text-left hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid={`button-select-media-${asset.id}`}
              >
                <div className="flex h-28 items-center justify-center bg-muted">
                  {asset.publicUrl && asset.mimeType.startsWith("image/") ? <img src={asset.publicUrl} alt={asset.altText || asset.filename} loading="lazy" className="h-full w-full object-cover" /> : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
                </div>
                <div className="p-2">
                  <p className="truncate text-sm font-medium">{asset.filename}</p>
                  <p className="truncate text-xs text-muted-foreground">{asset.altText || asset.caption || "Metadata available in Media Library"}</p>
                  {value?.mediaId === asset.id && <span className="mt-1 flex items-center text-xs text-emerald-600"><Check className="mr-1 h-3 w-3" /> Selected version</span>}
                </div>
              </button>
            ))}
            {!media.isLoading && assets.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No matching approved media. Upload and approve an asset in Media Library first.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}