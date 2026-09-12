import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getGetMediaReferenceImpactQueryKey, useGetMediaReferenceImpact } from "@workspace/api-client-react";
import { FocalPointPicker, type FocalPoint } from "./FocalPointPicker";

type AssetDetailsPanelAsset = {
  id: string;
  filename: string;
  mimeType: string;
  publicUrl?: string | null;
  altText?: string | null;
  caption?: string | null;
  credit?: string | null;
};

type MediaAssetDetailsPanelProps = {
  asset: AssetDetailsPanelAsset;
  title: string;
  usage: string;
  altText: string;
  credit: string;
  focalPoint: FocalPoint | null;
  disabled?: boolean;
  onTitleChange: (value: string) => void;
  onUsageChange: (value: string) => void;
  onAltTextChange: (value: string) => void;
  onCreditChange: (value: string) => void;
  onFocalPointChange: (value: FocalPoint) => void;
  onFocalPointClear: () => void;
};

export function MediaAssetDetailsPanel({
  asset,
  title,
  usage,
  altText,
  credit,
  focalPoint,
  disabled = false,
  onTitleChange,
  onUsageChange,
  onAltTextChange,
  onCreditChange,
  onFocalPointChange,
  onFocalPointClear,
}: MediaAssetDetailsPanelProps) {
  const isImage = asset.mimeType.startsWith("image/");
  const references = useGetMediaReferenceImpact(asset.id, {
    query: {
      retry: false,
      queryKey: getGetMediaReferenceImpactQueryKey(asset.id),
    },
  });
  return (
    <section className="space-y-4" aria-label="Asset details">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="asset-title">Asset title</Label>
          <Input
            id="asset-title"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            maxLength={255}
            disabled={disabled}
            placeholder="Descriptive asset title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="asset-credit">Credit / rights</Label>
          <Input
            id="asset-credit"
            value={credit}
            onChange={(event) => onCreditChange(event.target.value)}
            maxLength={200}
            disabled={disabled}
            placeholder="Rights holder, source, and licence"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="asset-alt-text">Alt text</Label>
          <Textarea
            id="asset-alt-text"
            value={altText}
            onChange={(event) => onAltTextChange(event.target.value)}
            maxLength={300}
            disabled={disabled}
            placeholder="Describe the meaningful visual content; leave blank only when decorative"
            className="resize-none"
          />
          <p className="text-right text-[10px] font-mono text-muted-foreground">{altText.length}/300</p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="asset-caption">Caption / intended usage</Label>
          <Textarea
            id="asset-caption"
            value={usage}
            onChange={(event) => onUsageChange(event.target.value)}
            maxLength={500}
            disabled={disabled}
            placeholder="Caption or where and how this asset is approved to be used"
            className="resize-none"
          />
          <p className="text-right text-[10px] font-mono text-muted-foreground">{usage.length}/500</p>
        </div>
      </div>
      {isImage && (
        <FocalPointPicker
          src={asset.publicUrl}
          alt={altText || asset.filename}
          value={focalPoint}
          disabled={disabled}
          onChange={onFocalPointChange}
          onClear={onFocalPointClear}
        />
      )}
      <p className="text-xs text-muted-foreground">
        Metadata and focal-point changes create a new governed metadata version. Existing published references remain pinned to their selected immutable version.
      </p>
      <section className="space-y-2 rounded-md border border-border bg-muted/10 p-3" aria-label="Affected draft and live records">
        <div>
          <h3 className="text-sm font-medium">Affected draft/live records</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Read-only reference impact. Choosing a replacement never rewrites these records.
          </p>
        </div>
        {references.isLoading ? (
          <p className="text-xs text-muted-foreground">Checking governed references…</p>
        ) : references.isError ? (
          <p role="alert" className="text-xs text-destructive">Reference impact is unavailable. The asset and its references are unchanged.</p>
        ) : references.data?.referenceCount ? (
          <ul className="space-y-2">
            {references.data.references.map((reference) => (
              <li key={reference.referenceId} className="rounded border border-border bg-background p-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{reference.documentTitle}</span>
                  <span className="rounded-full border px-2 py-0.5 font-mono uppercase tracking-wide">
                    {reference.documentStatus}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {reference.documentKind} · {reference.fieldPath}
                  {reference.canonicalSlug ? ` · ${reference.canonicalSlug}` : ""}
                </p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  Pinned version: {reference.mediaVersionId ?? "not recorded"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No governed draft or live records currently reference this asset.</p>
        )}
      </section>
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
        <p><span className="font-medium text-foreground">Choose another asset:</span> change the asset in the draft assignment; published content is not rewritten.</p>
        <p className="mt-1"><span className="font-medium text-foreground">Upload a new version:</span> add new bytes through the upload queue. They receive a new immutable asset identity and fresh review.</p>
      </div>
    </section>
  );
}