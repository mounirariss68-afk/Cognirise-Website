import { useRef, useState } from "react";
import {
  getListMediaQueryKey,
  useFinalizeMediaUpload,
  useListMedia,
  useRequestMediaUpload,
  useUpdateMedia,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  FileImage,
  ImageOff,
  LayoutGrid,
  Linkedin,
  List,
  Loader2,
  Pencil,
  Search,
  UploadCloud,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type MediaCollection = "website" | "linkedin";
type LinkedInAssetKind = "post" | "header";
type CampaignMetadata = {
  campaign?: string;
  edition?: string;
  title?: string;
  purpose?: string;
  pulseSource?: string;
  approvedUse?: string;
};
type CampaignField = keyof CampaignMetadata;
type ExtendedMediaAsset = {
  id: string;
  filename: string;
  objectPath: string;
  publicUrl?: string | null;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
  credit?: string | null;
  status: string;
  createdAt: string;
  collection?: MediaCollection | null;
  linkedinAssetKind?: LinkedInAssetKind | null;
  campaignMetadata?: CampaignMetadata | null;
};

const PAGE_SIZE = 40;
const EMPTY_CAMPAIGN: Record<CampaignField, string> = {
  campaign: "",
  edition: "",
  title: "",
  purpose: "",
  pulseSource: "",
  approvedUse: "",
};
const CAMPAIGN_FIELDS: Array<{ key: CampaignField; label: string; maxLength: number; placeholder: string; multiline?: boolean }> = [
  { key: "campaign", label: "Campaign", maxLength: 120, placeholder: "e.g. Human + Agent Advantage" },
  { key: "edition", label: "Edition", maxLength: 80, placeholder: "e.g. UAE launch" },
  { key: "title", label: "Title", maxLength: 160, placeholder: "Public-facing asset title" },
  { key: "purpose", label: "Purpose", maxLength: 300, placeholder: "What this asset is designed to achieve", multiline: true },
  { key: "pulseSource", label: "Pulse source", maxLength: 160, placeholder: "Source issue, article, or research" },
  { key: "approvedUse", label: "Approved use", maxLength: 300, placeholder: "Where and how this asset may be used", multiline: true },
];

function assetCampaign(asset: ExtendedMediaAsset) {
  return asset.campaignMetadata ?? {};
}

function cleanCampaignMetadata(values: Record<CampaignField, string>): CampaignMetadata | undefined {
  const entries = CAMPAIGN_FIELDS
    .map(({ key }) => [key, values[key].trim()] as const)
    .filter(([, value]) => value.length > 0);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function statusPresentation(status: string) {
  if (status === "ready" || status === "active") {
    return { label: "Available", className: "bg-emerald-500/10 text-emerald-700" };
  }
  if (status === "review") {
    return { label: "Awaiting review", className: "bg-amber-500/10 text-amber-700" };
  }
  if (status === "failed") {
    return { label: "Failed", className: "bg-red-500/10 text-red-700" };
  }
  if (status === "pending") {
    return { label: "Pending", className: "bg-amber-500/10 text-amber-700" };
  }
  return { label: "Unavailable", className: "bg-slate-500/10 text-slate-600" };
}

function StatusBadge({ status }: { status: string }) {
  const presentation = statusPresentation(status);
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${presentation.className}`}>
      {presentation.label}
    </span>
  );
}

function AssetPreview({
  asset,
  className,
  broken,
  onError,
}: {
  asset: ExtendedMediaAsset;
  className: string;
  broken: boolean;
  onError: () => void;
}) {
  const isPending = asset.status === "pending";
  const isFailed = asset.status === "failed";
  const isPreviewable = asset.status === "ready" || asset.status === "active" || asset.status === "review";
  const canRender = isPreviewable && Boolean(asset.publicUrl) && !broken;

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-muted ${className}`}>
      {canRender ? (
        <img
          src={asset.publicUrl ?? undefined}
          alt={asset.altText || asset.filename}
          className="h-full w-full object-cover"
          onError={onError}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-2 text-center text-muted-foreground">
          {isPending ? (
            <Loader2 className="h-6 w-6 animate-spin opacity-60" />
          ) : isFailed ? (
            <AlertTriangle className="h-6 w-6 text-red-500/70" />
          ) : broken || !asset.publicUrl ? (
            <ImageOff className="h-6 w-6 opacity-50" />
          ) : (
            <FileImage className="h-6 w-6 opacity-40" />
          )}
          <span className="text-[10px] font-mono leading-tight">
            {isPending ? "Processing" : isFailed ? "Upload failed" : broken ? "Preview unavailable" : "File unavailable"}
          </span>
        </div>
      )}
    </div>
  );
}

function MetadataLine({ asset }: { asset: ExtendedMediaAsset }) {
  const dimensions = asset.width && asset.height ? `${asset.width} × ${asset.height}` : "Dimensions unavailable";
  return (
    <p className="mt-1 text-[10px] font-mono text-muted-foreground">
      {dimensions} • {(asset.size / 1024).toFixed(1)} KB
    </p>
  );
}

export default function MediaLibrary() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [collection, setCollection] = useState<MediaCollection>("website");
  const [linkedinKind, setLinkedinKind] = useState<LinkedInAssetKind | "all">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [brokenPreviews, setBrokenPreviews] = useState<Record<string, true>>({});
  const [uploadCollection, setUploadCollection] = useState<MediaCollection>("website");
  const [uploadLinkedinKind, setUploadLinkedinKind] = useState<LinkedInAssetKind>("post");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [finalizeAsset, setFinalizeAsset] = useState<ExtendedMediaAsset | null>(null);
  const [altText, setAltText] = useState("");
  const [credit, setCredit] = useState("");
  const [campaignFields, setCampaignFields] = useState<Record<CampaignField, string>>(EMPTY_CAMPAIGN);
  const [editingAsset, setEditingAsset] = useState<ExtendedMediaAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const requestUpload = useRequestMediaUpload();
  const finalizeUpload = useFinalizeMediaUpload();
  const updateMedia = useUpdateMedia();

  // These contract fields are intentionally supplied ahead of generated client regeneration.
  const listParams = {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    collection,
    linkedinAssetKind: collection === "linkedin" && linkedinKind !== "all" ? linkedinKind : undefined,
  };
  const queryKey = getListMediaQueryKey(listParams);
  const { data, isLoading, isError } = useListMedia(listParams, { query: { queryKey } });
  const assets = (data?.items ?? []) as ExtendedMediaAsset[];

  const selectCollection = (nextCollection: string) => {
    const next = nextCollection as MediaCollection;
    setCollection(next);
    setUploadCollection(next);
    setPage(1);
    setBrokenPreviews({});
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 50MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    try {
      const requestData = {
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        collection: uploadCollection,
        linkedinAssetKind: uploadCollection === "linkedin" ? uploadLinkedinKind : undefined,
      };
      const response = await requestUpload.mutateAsync({ data: requestData });
      setUploadProgress(40);

      const putResponse = await fetch(response.uploadUrl, {
        method: response.method,
        headers: response.headers,
        body: file,
      });
      if (!putResponse.ok) throw new Error("Failed to upload to storage");

      setUploadProgress(80);
      setFinalizeAsset(response.media as ExtendedMediaAsset);
      setAltText("");
      setCredit("");
      setCampaignFields(EMPTY_CAMPAIGN);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An error occurred during upload";
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFinalize = async () => {
    if (!finalizeAsset) return;
    try {
      await finalizeUpload.mutateAsync({
        mediaId: finalizeAsset.id,
        data: {
          objectPath: finalizeAsset.objectPath,
          altText: altText || undefined,
          credit: credit || undefined,
          campaignMetadata: finalizeAsset.collection === "linkedin" ? cleanCampaignMetadata(campaignFields) : undefined,
        },
      });
      toast({ title: "Asset finalized successfully" });
      setFinalizeAsset(null);
      await queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
    } catch (error: unknown) {
      const detail = typeof error === "object" && error && "error" in error ? String(error.error) : "An error occurred";
      toast({ title: "Finalization failed", description: detail, variant: "destructive" });
    }
  };

  const openEditor = (asset: ExtendedMediaAsset) => {
    setEditingAsset(asset);
    setCampaignFields({
      ...EMPTY_CAMPAIGN,
      ...Object.fromEntries(
        Object.entries(asset.campaignMetadata ?? {}).map(([key, value]) => [key, value ?? ""]),
      ),
    });
  };

  const saveCampaignMetadata = async () => {
    if (!editingAsset) return;
    try {
      const updated = await updateMedia.mutateAsync({
        mediaId: editingAsset.id,
        data: { campaignMetadata: cleanCampaignMetadata(campaignFields) ?? null },
      });
      queryClient.setQueriesData(
        { queryKey: getListMediaQueryKey() },
        (current: typeof data) => current
          ? { ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) }
          : current,
      );
      setEditingAsset(null);
      toast({ title: "Campaign metadata saved" });
    } catch (error: unknown) {
      const detail = typeof error === "object" && error && "error" in error ? String(error.error) : "An error occurred";
      toast({ title: "Metadata update failed", description: detail, variant: "destructive" });
    }
  };

  const campaignForm = (
    <div className="grid gap-4 sm:grid-cols-2">
      {CAMPAIGN_FIELDS.map((field) => (
        <div key={field.key} className={`space-y-2 ${field.multiline ? "sm:col-span-2" : ""}`}>
          <Label htmlFor={`campaign-${field.key}`} className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {field.label}
          </Label>
          {field.multiline ? (
            <Textarea
              id={`campaign-${field.key}`}
              value={campaignFields[field.key]}
              onChange={(event) => setCampaignFields((current) => ({ ...current, [field.key]: event.target.value }))}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              className="resize-none"
            />
          ) : (
            <Input
              id={`campaign-${field.key}`}
              value={campaignFields[field.key]}
              onChange={(event) => setCampaignFields((current) => ({ ...current, [field.key]: event.target.value }))}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
            />
          )}
          <p className="text-right text-[10px] font-mono text-muted-foreground">
            {campaignFields[field.key].length}/{field.maxLength}
          </p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Media Library</h1>
          <p className="mt-1 text-sm font-mono text-muted-foreground">Managed website and LinkedIn assets</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">New upload collection</Label>
            <Select value={uploadCollection} onValueChange={(value) => setUploadCollection(value as MediaCollection)}>
              <SelectTrigger className="w-36 bg-background" aria-label="New upload collection">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {uploadCollection === "linkedin" && (
            <div className="space-y-1">
              <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">LinkedIn asset kind</Label>
              <Select value={uploadLinkedinKind} onValueChange={(value) => setUploadLinkedinKind(value as LinkedInAssetKind)}>
                <SelectTrigger className="w-32 bg-background" aria-label="LinkedIn asset kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post">Post image</SelectItem>
                  <SelectItem value="header">Profile header</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
          />
          <Button
            className="gap-2 text-xs font-mono uppercase tracking-wider"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {isUploading ? `Uploading ${uploadProgress}%` : "Upload asset"}
          </Button>
        </div>
      </div>

      <Tabs value={collection} onValueChange={selectCollection} className="mb-3">
        <TabsList>
          <TabsTrigger value="website" className="gap-2">
            <FileImage className="h-4 w-4" /> Website
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="gap-2">
            <Linkedin className="h-4 w-4" /> LinkedIn
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 p-4">
          <div className="relative min-w-60 max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${collection === "linkedin" ? "LinkedIn" : "website"} assets…`}
              className="bg-background pl-9"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="flex items-center gap-3">
            {collection === "linkedin" && (
              <Select
                value={linkedinKind}
                onValueChange={(value) => {
                  setLinkedinKind(value as LinkedInAssetKind | "all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-40 bg-background" aria-label="Filter LinkedIn assets">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LinkedIn</SelectItem>
                  <SelectItem value="post">Post images</SelectItem>
                  <SelectItem value="header">Profile headers</SelectItem>
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-1 rounded-md border border-border bg-background p-1">
              <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" className="h-7 w-7 rounded-sm" onClick={() => setView("grid")} aria-label="Grid view">
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" className="h-7 w-7 rounded-sm" onClick={() => setView("list")} aria-label="List view">
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <AlertTriangle className="h-10 w-10 text-red-500/60" />
              <p className="text-sm font-mono">The media collection could not be loaded.</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4 text-muted-foreground">
              <FileImage className="h-12 w-12 opacity-20" />
              <p className="text-sm font-mono">No {collection === "linkedin" ? "LinkedIn" : "website"} assets found.</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {assets.map((asset) => {
                const campaign = assetCampaign(asset);
                return (
                  <article key={asset.id} className="overflow-hidden rounded-lg border border-border bg-background transition-all hover:border-primary/50 hover:shadow-md">
                    <AssetPreview
                      asset={asset}
                      className="aspect-square"
                      broken={Boolean(brokenPreviews[asset.id])}
                      onError={() => setBrokenPreviews((current) => ({ ...current, [asset.id]: true }))}
                    />
                    <div className="space-y-2 border-t border-border bg-card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-xs font-medium" title={asset.filename}>{asset.filename}</p>
                        <StatusBadge status={asset.status} />
                      </div>
                      <MetadataLine asset={asset} />
                      {collection === "linkedin" && (
                        <div className="space-y-1 border-t border-border/60 pt-2 text-[11px]">
                          <p className="font-mono uppercase tracking-wide text-primary">{asset.linkedinAssetKind === "header" ? "Profile header" : "Post image"}</p>
                           <div className="flex items-start justify-between gap-2">
                             <div>
                               {campaign.title && <p className="font-medium">{campaign.title}</p>}
                               {campaign.campaign && <p className="text-muted-foreground">Campaign: {campaign.campaign}</p>}
                               {campaign.edition && <p className="text-muted-foreground">Edition: {campaign.edition}</p>}
                               {campaign.purpose && <p className="line-clamp-2 text-muted-foreground">Purpose: {campaign.purpose}</p>}
                               {campaign.pulseSource && <p className="truncate text-muted-foreground">Pulse: {campaign.pulseSource}</p>}
                               {campaign.approvedUse && <p className="line-clamp-2 text-muted-foreground">Approved: {campaign.approvedUse}</p>}
                             </div>
                             <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEditor(asset)} aria-label={`Edit campaign metadata for ${asset.filename}`}>
                               <Pencil className="h-3.5 w-3.5" />
                             </Button>
                           </div>
                        </div>
                      )}
                      <p className="line-clamp-2 text-[11px] text-muted-foreground">{asset.altText || "No alt text provided"}</p>
                      <p className="truncate text-[10px] font-mono text-muted-foreground" title={asset.credit || undefined}>
                        {asset.credit ? `Credit: ${asset.credit}` : "Credit not recorded"}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border bg-background">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-muted/50 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Preview</th>
                    <th className="px-4 py-3 font-medium">Asset</th>
                    {collection === "linkedin" && <th className="px-4 py-3 font-medium">LinkedIn campaign</th>}
                    <th className="px-4 py-3 font-medium">Accessibility / rights</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assets.map((asset) => {
                    const campaign = assetCampaign(asset);
                    return (
                      <tr key={asset.id} className="align-top transition-colors hover:bg-muted/30">
                        <td className="w-20 px-4 py-3">
                          <AssetPreview
                            asset={asset}
                            className="h-14 w-14 rounded border border-border"
                            broken={Boolean(brokenPreviews[asset.id])}
                            onError={() => setBrokenPreviews((current) => ({ ...current, [asset.id]: true }))}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="max-w-56 truncate font-medium" title={asset.filename}>{asset.filename}</p>
                          <MetadataLine asset={asset} />
                        </td>
                        {collection === "linkedin" && (
                          <td className="px-4 py-3">
                            <p className="text-[10px] font-mono uppercase tracking-wide text-primary">{asset.linkedinAssetKind === "header" ? "Profile header" : "Post image"}</p>
                            <p className="mt-1 font-medium">{campaign.title || "Campaign title not recorded"}</p>
                             <p className="text-xs text-muted-foreground">{campaign.campaign ? `Campaign: ${campaign.campaign}` : "Campaign not recorded"}</p>
                             <p className="text-xs text-muted-foreground">{campaign.edition ? `Edition: ${campaign.edition}` : "Edition not recorded"}</p>
                             {campaign.purpose && <p className="mt-1 max-w-72 text-xs text-muted-foreground">Purpose: {campaign.purpose}</p>}
                             {campaign.pulseSource && <p className="max-w-72 text-xs text-muted-foreground">Pulse: {campaign.pulseSource}</p>}
                             {campaign.approvedUse && <p className="max-w-72 text-xs text-muted-foreground">Approved: {campaign.approvedUse}</p>}
                             <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={() => openEditor(asset)}>Edit metadata</Button>
                          </td>
                        )}
                        <td className="max-w-64 px-4 py-3">
                          <p className="line-clamp-2 text-xs">{asset.altText || "No alt text provided"}</p>
                          <p className="mt-1 truncate text-[10px] font-mono text-muted-foreground">{asset.credit ? `Credit: ${asset.credit}` : "Credit not recorded"}</p>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={asset.status} /></td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-muted-foreground">
                          {format(new Date(asset.createdAt), "MMM d, yyyy")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs font-mono text-muted-foreground">
            <span>{data.total} assets • Page {data.page} of {data.totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={Boolean(finalizeAsset)} onOpenChange={(open) => !open && setFinalizeAsset(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asset metadata</DialogTitle>
            <DialogDescription className="mt-1 text-xs font-mono">
               Add accessibility, rights, and campaign context before publishing the asset.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs font-mono">
              Collection: {uploadCollection === "linkedin" ? `LinkedIn • ${uploadLinkedinKind === "header" ? "Profile header" : "Post image"}` : "Website"}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Alt text</Label>
              <Textarea value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Describe the image for screen readers" className="resize-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Credit / rights</Label>
              <Input value={credit} onChange={(event) => setCredit(event.target.value)} placeholder="e.g. Internal, Getty Images" />
            </div>
            {finalizeAsset?.collection === "linkedin" && (
              <div className="border-t border-border pt-4">
                <p className="mb-4 text-xs font-mono uppercase tracking-wider text-primary">LinkedIn campaign details</p>
                {campaignForm}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFinalizeAsset(null)}>Skip for now</Button>
            <Button onClick={handleFinalize} disabled={finalizeUpload.isPending}>
              {finalizeUpload.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save metadata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingAsset)} onOpenChange={(open) => !open && setEditingAsset(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit LinkedIn campaign metadata</DialogTitle>
            <DialogDescription>Keep the governed campaign context for {editingAsset?.filename} current.</DialogDescription>
          </DialogHeader>
          <div className="py-4">{campaignForm}</div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingAsset(null)}>Cancel</Button>
            <Button onClick={saveCampaignMetadata} disabled={updateMedia.isPending}>
              {updateMedia.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save metadata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}