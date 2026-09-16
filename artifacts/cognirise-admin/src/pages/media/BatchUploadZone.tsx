import { useEffect, useRef, useState } from "react";
import { useGetSession } from "@workspace/api-client-react";
import { AlertTriangle, Check, FileImage, Loader2, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBatchUpload } from "./upload-queue";
import { QueuedMetadataFields } from "./QueuedMetadataFields";
import { droppedFiles, validateIntake } from "./upload-intake";
import { IMAGE_ACCEPT, VIDEO_ACCEPT, type MediaCollection, type LinkedInAssetKind } from "./MediaLibrary";
import { canAccessAnyContentCapability } from "@/lib/content-capability";

export function BatchUploadZone() {
  const {
    queue,
    addFiles,
    removeItem,
    clearCompleted,
    discardFailed,
    updateItem,
    processItem,
    processAll,
    reattachFile,
    persistenceError,
  } = useBatchUpload();
  const { data: session } = useGetSession();
  const canUpload = canAccessAnyContentCapability(session?.user, "edit");
  const [collection, setCollection] = useState<MediaCollection>("website");
  const [linkedinKind, setLinkedinKind] = useState<LinkedInAssetKind>("post");
  const [dragging, setDragging] = useState(false);
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [metadataId, setMetadataId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = queue.find((item) => item.id === metadataId);
  const busy = queue.some((item) => ["requesting", "uploading", "finalizing"].includes(item.status));
  const completedCount = queue.filter((item) => item.status === "completed").length;
  const failedCount = queue.filter((item) => item.status === "error").length;

  useEffect(() => {
    const preventFileNavigation = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
    };
    window.addEventListener("dragover", preventFileNavigation);
    window.addEventListener("drop", preventFileNavigation);
    return () => {
      window.removeEventListener("dragover", preventFileNavigation);
      window.removeEventListener("drop", preventFileNavigation);
    };
  }, []);

  async function intake(files: File[], rejected: string[] = []) {
    if (!canUpload) return;
    const result = validateIntake(files, collection);
    setIssues([...rejected, ...result.errors]);
    setIntakeBusy(true);
    try {
      await addFiles(result.files, collection, collection === "linkedin" ? linkedinKind : undefined);
    } catch (error) {
      setIssues((current) => [...current, error instanceof Error ? error.message : "Files could not be queued."]);
    } finally {
      setIntakeBusy(false);
    }
  }

  if (!canUpload) return <p className="rounded-lg border p-4 text-sm text-muted-foreground">An editor, publisher, or administrator can upload media. You can browse the library below.</p>;

  return (
    <section className="space-y-4" aria-label="Upload media">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="queue-collection">Collection for new files</Label>
          <Select value={collection} onValueChange={(value) => setCollection(value as MediaCollection)}>
            <SelectTrigger id="queue-collection" className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="motion">Videos &amp; animations</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {collection === "linkedin" && <div className="space-y-1">
          <Label htmlFor="queue-linkedin-kind">LinkedIn asset kind</Label>
          <Select value={linkedinKind} onValueChange={(value) => setLinkedinKind(value as LinkedInAssetKind)}>
            <SelectTrigger id="queue-linkedin-kind" className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="post">Post image</SelectItem>
              <SelectItem value="header">Profile header</SelectItem>
            </SelectContent>
          </Select>
        </div>}
        <p className="text-xs text-muted-foreground">Changing this selection or a library tab does not change queued files.</p>
      </div>
      <div
        data-testid="media-drop-zone"
        onDragOver={(event) => { event.preventDefault(); if (event.dataTransfer.types.includes("Files")) setDragging(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const result = droppedFiles(event.dataTransfer);
          void intake(result.files, result.errors);
        }}
        className={`flex min-h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center ${dragging ? "border-primary bg-primary/5" : "border-border bg-card"}`}
      >
        <UploadCloud className="mb-2 h-7 w-7 text-muted-foreground" aria-hidden="true" />
        <h2 className="font-medium">{dragging ? "Drop files to add them" : "Drag and drop files here"}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {collection === "motion" ? "MP4, WebM up to 250 MiB each" : "JPEG, PNG, WebP, AVIF, PDF up to 50 MiB each"}. Files only, not folders.
        </p>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          aria-label="Choose multiple media files"
          accept={collection === "motion" ? VIDEO_ACCEPT : IMAGE_ACCEPT}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = "";
            void intake(files);
          }}
        />
        <Button type="button" variant="secondary" className="mt-4" onClick={() => fileInput.current?.click()}>Browse files</Button>
        {intakeBusy && <p role="status" className="mt-2 text-xs">Checking file identities…</p>}
      </div>
      {issues.length > 0 && <div role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
        <p className="font-medium">These files were not added. Valid files are still queued.</p>
        <ul className="list-inside list-disc">{issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>
        <Button variant="ghost" size="sm" onClick={() => setIssues([])}>Dismiss file errors</Button>
      </div>}
      {persistenceError && <p role="alert" className="text-sm text-destructive">{persistenceError}</p>}
      <p className="text-xs text-muted-foreground">Review each file’s metadata, then upload. New assets await publisher review and are not published. This tab retains queue metadata after reload; files not yet transferred must be reselected.</p>

      {queue.length > 0 && <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Upload queue ({queue.length})</h3>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void processAll()} disabled={busy || !queue.some((item) => item.reviewed && item.status !== "completed" && (item.file || item.putCompleted))}>Upload reviewed files</Button>
            {completedCount > 0 && (
              <Button variant="outline" onClick={() => clearCompleted()} disabled={busy}>
                Clear completed ({completedCount})
              </Button>
            )}
            {failedCount > 0 && (
              <Button variant="outline" onClick={() => discardFailed()} disabled={busy}>
                Discard failed ({failedCount})
              </Button>
            )}
          </div>
        </div>
         <p className="text-xs text-muted-foreground">
           Queue cleanup only removes local rows. It never deletes an approved server asset, changes a published reference, or cancels an in-flight transfer.
         </p>
        <div className="max-h-[480px] space-y-2 overflow-y-auto" aria-live="polite">
          {queue.map((item) => {
            const working = ["requesting", "uploading", "finalizing"].includes(item.status);
            const completed = item.status === "completed";
            const missing = !item.file && !item.putCompleted && !completed;
            const status = completed ? "Uploaded — awaiting review"
              : item.status === "error" ? `Failed: ${item.error}`
              : item.status === "uploading" ? `Uploading ${item.progress}%`
              : item.status === "finalizing" ? "Verifying stored file and finalizing"
              : item.status === "requesting" ? "Preparing secure upload"
              : missing ? "Reselect the original file to continue"
              : item.reviewed ? "Metadata reviewed — ready to upload" : "Metadata review required";
            return <article key={item.id} className="rounded-lg border bg-card p-4" aria-label={`Queued file ${item.filename}`}>
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {working ? <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin" /> : completed ? <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" /> : item.status === "error" ? <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-destructive" /> : <FileImage className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">{item.filename}</p>
                    <p className="text-xs text-muted-foreground">{item.collection}{item.linkedinAssetKind ? ` · ${item.linkedinAssetKind}` : ""} · {(item.size / 1024 ** 2).toFixed(2)} MiB</p>
                    <p className={`mt-1 text-xs ${item.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{status}</p>
                    {completed && item.mediaId && <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">Asset: {item.mediaId}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {missing && <div>
                    <Label htmlFor={`reselect-${item.id}`} className="text-xs">Reselect original</Label>
                    <Input id={`reselect-${item.id}`} type="file" className="mt-1 max-w-56 text-xs" onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      if (file) void reattachFile(item.id, file);
                    }} />
                  </div>}
                  <Button variant="outline" size="sm" onClick={() => setMetadataId(item.id)}>{item.started ? "View metadata" : "Review metadata"}</Button>
                  {!completed && <Button size="sm" disabled={busy || !item.reviewed || missing} onClick={() => void processItem(item.id)}>{item.started ? "Retry" : "Upload"}</Button>}
                  {item.status === "error" && <Button variant="ghost" size="icon" aria-label={`Discard failed ${item.filename}`} onClick={() => discardFailed(item.id)}><Trash2 className="h-4 w-4" /></Button>}
                  {!item.started && item.status !== "error" && <Button variant="ghost" size="icon" aria-label={`Remove ${item.filename} from queue`} onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </div>
              {item.status === "uploading" && <progress className="mt-3 h-2 w-full accent-primary" aria-label={`Upload progress for ${item.filename}`} value={item.progress} max={100} />}
            </article>;
          })}
        </div>
      </div>}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setMetadataId(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.started ? "Queued upload metadata" : "Review queued metadata"}</DialogTitle>
            <DialogDescription>{selected?.filename}. Once upload starts, metadata is locked for safe retries. Later edits are available in the library.</DialogDescription>
          </DialogHeader>
          {selected && <QueuedMetadataFields item={selected} update={(updates) => updateItem(selected.id, updates)} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMetadataId(null)}>Close</Button>
            {selected && !selected.started && <Button
              disabled={selected.collection === "motion" && !selected.motionFields?.groupId.trim()}
              onClick={() => { updateItem(selected.id, { reviewed: true }); setMetadataId(null); }}
            >Confirm metadata review</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}