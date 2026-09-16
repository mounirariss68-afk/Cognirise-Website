import { useEffect, useRef, useState } from "react";
import {
  useCreateDocument,
  getGetDocumentRevisionQueryKey,
  getGetMediaReferenceImpactQueryKey,
  getGetMediaQueryKey,
  getListAuditEventsQueryKey,
  getListMediaQueryKey,
  useGetSession,
  useGetDocumentRevision,
  useListDocuments,
  useFinalizeMediaUpload,
  useGetMedia,
  useListMedia,
  useRequestMediaUpload,
  useReviewMedia,
  useSubmitDocument,
  useUpdateDocument,
  useUpdateMedia,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Download,
  Eye,
  FileImage,
  ImageOff,
  LayoutGrid,
  Linkedin,
  List,
  Loader2,
  Pencil,
  PlaySquare,
  Search,
  UploadCloud,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  buildHeroDraftContent,
  EMPTY_HERO_SELECTION,
  heroSelectionIssues,
  mergeHeroAssetRecords,
  type HeroAssetRecord,
  type HeroAssetSelection,
} from "./hero-assignment";
import {
  CMS_HERO_DOCUMENT_SLUGS,
  type CmsHeroFilmSlot,
} from "@workspace/api-zod";
import { BatchUploadZone } from "./BatchUploadZone";
import { MediaAssetDetailsPanel } from "./MediaAssetDetailsPanel";
import { MediaReviewHistory } from "./MediaReviewHistory";
import type { FocalPoint } from "./FocalPointPicker";
import { canAccessAnyContentCapability } from "@/lib/content-capability";

export type MediaCollection = "website" | "linkedin" | "motion";
export type LinkedInAssetKind = "post" | "header";
export type CampaignMetadata = {
  campaign?: string;
  edition?: string;
  title?: string;
  purpose?: string;
  pulseSource?: string;
  approvedUse?: string;
};
export type CampaignField = keyof CampaignMetadata;
export type MotionVariant = "landscape" | "portrait" | "square" | "mobile" | "desktop";
export type MotionMetadata = {
  groupId: string;
  variant: MotionVariant;
  posterMediaId?: string;
  reducedMotionMediaId?: string;
  autoplay: boolean;
  loop: boolean;
  accessibility: {
    decorative: boolean;
    hasAudio: boolean;
    captionsMediaId?: string;
    transcript?: string;
    audioDescription?: string;
  };
};
export type MotionTextField = "groupId" | "posterMediaId" | "reducedMotionMediaId" | "captionsMediaId" | "transcript" | "audioDescription";
export type ExtendedMediaAsset = {
  id: string;
  versionId: string;
  filename: string;
  objectPath: string;
  publicUrl?: string | null;
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
  caption?: string | null;
  credit?: string | null;
  status: string;
  createdAt: string;
  collection?: MediaCollection | null;
  linkedinAssetKind?: LinkedInAssetKind | null;
  campaignMetadata?: CampaignMetadata | null;
  motionMetadata?: MotionMetadata | null;
  focalPoint?: FocalPoint | null;
  updatedAt?: string;
  canEdit?: boolean;
  canReview?: boolean;
  canInspect?: boolean;
};

type HeroSlot = CmsHeroFilmSlot;

function HeroAssignments({ canEdit }: { canEdit: boolean }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Record<HeroSlot, HeroAssetSelection>>({
    homepage: EMPTY_HERO_SELECTION,
    industries: EMPTY_HERO_SELECTION,
  });
  const [retainedAssets, setRetainedAssets] = useState<Map<string, HeroAssetRecord>>(new Map());
  const [initialized, setInitialized] = useState<Record<HeroSlot, boolean>>({
    homepage: false,
    industries: false,
  });
  const documents = useListDocuments({
    page: 1,
    pageSize: 100,
    kind: "site-configuration",
  });
  const media = useListMedia({ page: 1, pageSize: 100, search: search || undefined });
  const homepageDocument = documents.data?.items.find(
    (item) => item.slug === CMS_HERO_DOCUMENT_SLUGS.homepage,
  );
  const industriesDocument = documents.data?.items.find(
    (item) => item.slug === CMS_HERO_DOCUMENT_SLUGS.industries,
  );
  const homepagePublished = useGetDocumentRevision(
    homepageDocument?.id ?? "",
    homepageDocument?.publishedRevisionId ?? "",
    {
      query: {
        enabled: Boolean(homepageDocument?.publishedRevisionId),
        queryKey: getGetDocumentRevisionQueryKey(
          homepageDocument?.id ?? "",
          homepageDocument?.publishedRevisionId ?? "",
        ),
      },
    },
  );
  const industriesPublished = useGetDocumentRevision(
    industriesDocument?.id ?? "",
    industriesDocument?.publishedRevisionId ?? "",
    {
      query: {
        enabled: Boolean(industriesDocument?.publishedRevisionId),
        queryKey: getGetDocumentRevisionQueryKey(
          industriesDocument?.id ?? "",
          industriesDocument?.publishedRevisionId ?? "",
        ),
      },
    },
  );
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const submitDocument = useSubmitDocument();
  const assets = ((media.data?.items ?? []) as ExtendedMediaAsset[])
    .filter((asset) => asset.status === "ready" && Boolean(asset.versionId));
  const homepageHero = (homepagePublished.data?.snapshot.content as Record<string, any> | undefined)?.hero;
  const industriesHero = (industriesPublished.data?.snapshot.content as Record<string, any> | undefined)?.hero;
  const publishedIds = {
    homepage: {
      poster: homepageHero?.posterMediaId ?? "",
      mp4: homepageHero?.sources?.find((source: any) => source.mimeType === "video/mp4")?.mediaId ?? "",
      webm: homepageHero?.sources?.find((source: any) => source.mimeType === "video/webm")?.mediaId ?? "",
    },
    industries: {
      poster: industriesHero?.posterMediaId ?? "",
      mp4: industriesHero?.sources?.find((source: any) => source.mimeType === "video/mp4")?.mediaId ?? "",
      webm: industriesHero?.sources?.find((source: any) => source.mimeType === "video/webm")?.mediaId ?? "",
    },
  };
  const exactMedia = (id: string) => ({
    query: { enabled: Boolean(id), queryKey: getGetMediaQueryKey(id) },
  });
  const homepagePoster = useGetMedia(publishedIds.homepage.poster, exactMedia(publishedIds.homepage.poster));
  const homepageMp4 = useGetMedia(publishedIds.homepage.mp4, exactMedia(publishedIds.homepage.mp4));
  const homepageWebm = useGetMedia(publishedIds.homepage.webm, exactMedia(publishedIds.homepage.webm));
  const industriesPoster = useGetMedia(publishedIds.industries.poster, exactMedia(publishedIds.industries.poster));
  const industriesMp4 = useGetMedia(publishedIds.industries.mp4, exactMedia(publishedIds.industries.mp4));
  const industriesWebm = useGetMedia(publishedIds.industries.webm, exactMedia(publishedIds.industries.webm));
  useEffect(() => {
    const exactPublished = [
      homepagePoster.data,
      homepageMp4.data,
      homepageWebm.data,
      industriesPoster.data,
      industriesMp4.data,
      industriesWebm.data,
    ].filter(Boolean) as ExtendedMediaAsset[];
    setRetainedAssets((current) => mergeHeroAssetRecords(current, [...assets, ...exactPublished]));
  }, [
    media.data,
    homepagePoster.data,
    homepageMp4.data,
    homepageWebm.data,
    industriesPoster.data,
    industriesMp4.data,
    industriesWebm.data,
  ]);

  useEffect(() => {
    const published = {
      homepage: homepagePublished.data?.snapshot,
      industries: industriesPublished.data?.snapshot,
    };
    for (const slot of ["homepage", "industries"] as const) {
      const document = slot === "homepage" ? homepageDocument : industriesDocument;
      const snapshot = published[slot] ?? (document?.publishedRevisionId ? undefined : document);
      const hero = (snapshot?.content as Record<string, any> | undefined)?.hero;
      if (!hero || initialized[slot]) continue;
      const ids = {
        poster: hero.posterMediaId ?? "",
        mp4: hero.sources?.find((source: any) => source.mimeType === "video/mp4")?.mediaId ?? "",
        webm: hero.sources?.find((source: any) => source.mimeType === "video/webm")?.mediaId ?? "",
      };
      if (Object.values(ids).some((id) => !retainedAssets.has(id))) continue;
      setSelection((current) => ({
        ...current,
        [slot]: {
          poster: retainedAssets.get(ids.poster) ?? current[slot].poster,
          mp4: retainedAssets.get(ids.mp4) ?? current[slot].mp4,
          webm: retainedAssets.get(ids.webm) ?? current[slot].webm,
        },
      }));
      setInitialized((current) => ({ ...current, [slot]: true }));
    }
  }, [
    homepageDocument,
    industriesDocument,
    homepagePublished.data,
    industriesPublished.data,
    initialized,
    retainedAssets,
  ]);

  const errors = (slot: HeroSlot) => heroSelectionIssues(selection[slot]);

  const saveDraft = async (slot: HeroSlot) => {
    if (!canEdit) return;
    try {
      const issues = errors(slot);
      if (issues.length) throw new Error(issues.join(" "));
      const { content, mediaIds } = buildHeroDraftContent(slot, selection[slot]);
      const document = slot === "homepage" ? homepageDocument : industriesDocument;
      const updated = document
        ? await updateDocument.mutateAsync({
            documentId: document.id,
            data: {
              revisionNumber: document.revisionNumber,
              content,
              mediaIds,
              market: "uae",
              locale: "en-US",
            },
          })
        : await createDocument.mutateAsync({
            data: {
              kind: "site-configuration",
              slug: CMS_HERO_DOCUMENT_SLUGS[slot],
              title: `${slot === "homepage" ? "Homepage" : "Industries"} hero`,
              content,
              mediaIds,
              markets: ["uae"],
            },
          });
      if (!updated.currentRevisionId) {
        throw new Error("The hero draft did not return a revision to submit.");
      }
      await submitDocument.mutateAsync({ documentId: updated.id, data: { revisionId: updated.currentRevisionId } });
      await queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).includes("documents") });
      toast({
        title: `${slot === "homepage" ? "Homepage" : "Industries"} hero submitted`,
        description: "A pinned draft revision is in review. A publisher must use the existing document publication control.",
      });
    } catch (error: unknown) {
      const detail = typeof error === "object" && error && "error" in error ? String(error.error) : "The hero draft could not be submitted.";
      toast({ title: "Hero assignment failed", description: detail, variant: "destructive" });
    }
  };

  const options = (slot: HeroSlot, role: keyof HeroAssetSelection, mimeType: string) => {
    const selected = selection[slot][role];
    const available = assets.filter((item) =>
    mimeType === "image" ? item.mimeType.startsWith("image/") : item.mimeType === mimeType
    );
    return selected && !available.some((item) => item.id === selected.id)
      ? [selected, ...available]
      : available;
  };
  const chooser = (slot: HeroSlot, role: keyof HeroAssetSelection, label: string, mimeType: string) => (
    <div className="space-y-1">
      <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Select disabled={!canEdit} value={selection[slot][role]?.id} onValueChange={(value) =>
        setSelection((current) => ({ ...current, [slot]: { ...current[slot], [role]: retainedAssets.get(value) ?? null } }))
      }>
        <SelectTrigger aria-label={`${slot} ${label}`}><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {options(slot, role, mimeType).map((item) => <SelectItem key={item.id} value={item.id}>{item.filename}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <section className="mb-4 rounded-xl border border-border bg-card p-4" aria-label="Hero film assignments">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold">Website hero assignments</h2>
          <p className="text-xs text-muted-foreground">Create a governed draft with immutable versions. Publication remains in the publisher document control.</p>
        </div>
        <Input disabled={!canEdit} className="w-64" aria-label="Search active hero media" placeholder="Search active media…" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(["homepage", "industries"] as const).map((slot) => (
          <div key={slot} className="space-y-3 rounded-lg border p-4">
            <h3 className="font-medium">{slot === "homepage" ? "Homepage" : "Industries"}</h3>
            {chooser(slot, "poster", "Poster image", "image")}
            {chooser(slot, "mp4", "MP4 source", "video/mp4")}
            {chooser(slot, "webm", "WebM source", "video/webm")}
            {errors(slot).length > 0 && <div role="alert" className="text-xs text-destructive">{errors(slot).join(" ")}</div>}
             <Button onClick={() => saveDraft(slot)} disabled={!canEdit || createDocument.isPending || updateDocument.isPending || submitDocument.isPending}>
              Save draft &amp; submit for review
            </Button>
             {!canEdit && <p className="text-xs text-muted-foreground">Viewers can inspect hero assignments but cannot change or submit them.</p>}
            {(slot === "homepage" ? homepageDocument : industriesDocument) && (
              <Button
                variant="outline"
                onClick={() => setLocation(`/content/${(slot === "homepage" ? homepageDocument : industriesDocument)!.id}`)}
              >
                Open publisher control
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export const PAGE_SIZE = 40;
export const STANDARD_UPLOAD_LIMIT = 50 * 1024 * 1024;
export const VIDEO_UPLOAD_LIMIT = 250 * 1024 * 1024;
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,application/pdf";
export const VIDEO_ACCEPT = "video/mp4,video/webm";
export const EMPTY_CAMPAIGN: Record<CampaignField, string> = {
  campaign: "",
  edition: "",
  title: "",
  purpose: "",
  pulseSource: "",
  approvedUse: "",
};
export const CAMPAIGN_FIELDS: Array<{ key: CampaignField; label: string; maxLength: number; placeholder: string; multiline?: boolean }> = [
  { key: "campaign", label: "Campaign", maxLength: 120, placeholder: "e.g. Human + Agent Advantage" },
  { key: "edition", label: "Edition", maxLength: 80, placeholder: "e.g. UAE launch" },
  { key: "title", label: "Title", maxLength: 160, placeholder: "Public-facing asset title" },
  { key: "purpose", label: "Purpose", maxLength: 300, placeholder: "What this asset is designed to achieve", multiline: true },
  { key: "pulseSource", label: "Pulse source", maxLength: 160, placeholder: "Source issue, article, or research" },
  { key: "approvedUse", label: "Approved use", maxLength: 300, placeholder: "Where and how this asset may be used", multiline: true },
];
export const EMPTY_MOTION: Record<MotionTextField, string> = {
  groupId: "",
  posterMediaId: "",
  reducedMotionMediaId: "",
  captionsMediaId: "",
  transcript: "",
  audioDescription: "",
};
export const MOTION_FIELDS: Array<{ key: MotionTextField; label: string; maxLength: number; placeholder: string; multiline?: boolean }> = [
  { key: "groupId", label: "Asset group", maxLength: 120, placeholder: "e.g. homepage-hero" },
  { key: "posterMediaId", label: "Poster media ID", maxLength: 120, placeholder: "Media library ID for the poster image" },
  { key: "reducedMotionMediaId", label: "Reduced-motion fallback ID", maxLength: 120, placeholder: "Media library ID for the static fallback" },
  { key: "captionsMediaId", label: "Captions media ID", maxLength: 120, placeholder: "Media library ID for the captions file" },
  { key: "transcript", label: "Transcript", maxLength: 10000, placeholder: "Transcript for speech and meaningful sound", multiline: true },
  { key: "audioDescription", label: "Audio description", maxLength: 2000, placeholder: "Describe essential visual information", multiline: true },
];

export function assetCampaign(asset: ExtendedMediaAsset) {
  return asset.campaignMetadata ?? {};
}

export function cleanCampaignMetadata(values: Record<CampaignField, string>): CampaignMetadata | undefined {
  const entries = CAMPAIGN_FIELDS
    .map(({ key }) => [key, values[key].trim()] as const)
    .filter(([, value]) => value.length > 0);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function buildMotionMetadata(
  values: Record<MotionTextField, string>,
  variant: MotionVariant,
  flags: { autoplay: boolean; loop: boolean; decorative: boolean; hasAudio: boolean },
) {
  const optional = (key: MotionTextField) => values[key].trim() || undefined;
  return {
    groupId: values.groupId.trim(),
    variant,
    posterMediaId: optional("posterMediaId"),
    reducedMotionMediaId: optional("reducedMotionMediaId"),
    autoplay: flags.autoplay,
    loop: flags.loop,
    accessibility: {
      decorative: flags.decorative,
      hasAudio: flags.hasAudio,
      captionsMediaId: optional("captionsMediaId"),
      transcript: optional("transcript"),
      audioDescription: optional("audioDescription"),
    },
  };
}

function statusPresentation(status: string) {
  if (status === "ready" || status === "active") {
    return { label: "Available", className: "bg-emerald-500/10 text-emerald-700" };
  }
  if (status === "review") {
    return { label: "Awaiting review", className: "bg-amber-500/10 text-amber-700" };
  }
  if (status === "rejected") {
    return { label: "Rejected", className: "bg-slate-500/10 text-slate-700" };
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
  const isVideo = asset.collection === "motion" || asset.mimeType === "video/mp4" || asset.mimeType === "video/webm";
  const isImage = asset.mimeType.startsWith("image/");

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-muted ${className}`}>
      {canRender && (isVideo || isImage) ? (
        isVideo ? (
          <video
            src={asset.publicUrl ?? undefined}
            controls
            preload="metadata"
            aria-label={asset.altText || asset.filename}
            className="h-full w-full bg-black object-contain"
            onError={onError}
          >
            Your browser does not support this video. {asset.motionMetadata?.accessibility.audioDescription}
          </video>
        ) : (
          <img
            src={asset.publicUrl ?? undefined}
            alt={asset.altText || asset.filename}
            className="h-full w-full object-cover"
            onError={onError}
          />
        )
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
  const size = asset.size >= 1024 * 1024 ? `${(asset.size / 1024 / 1024).toFixed(1)} MB` : `${(asset.size / 1024).toFixed(1)} KB`;
  return (
    <p className="mt-1 text-[10px] font-mono text-muted-foreground">
      {dimensions} • {size}
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
  const [title, setTitle] = useState("");
  const [usage, setUsage] = useState("");
  const [altText, setAltText] = useState("");
  const [credit, setCredit] = useState("");
  const [focalPoint, setFocalPoint] = useState<FocalPoint | null>(null);
  const [campaignFields, setCampaignFields] = useState<Record<CampaignField, string>>(EMPTY_CAMPAIGN);
  const [motionFields, setMotionFields] = useState<Record<MotionTextField, string>>(EMPTY_MOTION);
  const [motionVariant, setMotionVariant] = useState<MotionVariant>("landscape");
  const [motionFlags, setMotionFlags] = useState({ autoplay: false, loop: false, decorative: false, hasAudio: false });
  const [editingAsset, setEditingAsset] = useState<ExtendedMediaAsset | null>(null);
  const [reviewAsset, setReviewAsset] = useState<ExtendedMediaAsset | null>(null);
  const reviewSubmitting = useRef(false);
  const [reviewPending, setReviewPending] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [sourceRightsApproved, setSourceRightsApproved] = useState(false);
  const [accessibilityApproved, setAccessibilityApproved] = useState(false);
  const [downloadingAssetId, setDownloadingAssetId] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMedia = useUpdateMedia();
  const reviewMedia = useReviewMedia();
  const { data: session } = useGetSession();
  // Per-asset API permissions replace broad session role checks
  // (`session?.user?.role === "administrator"` / `session?.user?.role === "publisher"`).
  const canUpload = canAccessAnyContentCapability(session?.user, "edit");

  const websiteCount = useListMedia({ page: 1, pageSize: 1, collection: "website" });
  const linkedinCount = useListMedia({ page: 1, pageSize: 1, collection: "linkedin" });
  const motionCount = useListMedia({ page: 1, pageSize: 1, collection: "motion" });
  const collectionCounts: Record<MediaCollection, number | undefined> = {
    website: websiteCount.data?.total,
    linkedin: linkedinCount.data?.total,
    motion: motionCount.data?.total,
  };

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
    setPage(1);
    setBrokenPreviews({});
  };

  const openEditor = (asset: ExtendedMediaAsset) => {
    if (asset.canEdit !== true) return;
    setEditingAsset(asset);
    setCampaignFields({
      ...EMPTY_CAMPAIGN,
      ...Object.fromEntries(
        Object.entries(asset.campaignMetadata ?? {}).map(([key, value]) => [key, value ?? ""]),
      ),
    });
    setTitle(asset.filename.replace(/\.[^.]+$/, ""));
    setUsage(asset.caption ?? "");
    setAltText(asset.altText ?? "");
    setCredit(asset.credit ?? "");
    setFocalPoint(asset.focalPoint ?? null);
    setMotionFields({
      ...EMPTY_MOTION,
      ...Object.fromEntries(
        Object.entries({
          groupId: asset.motionMetadata?.groupId,
          posterMediaId: asset.motionMetadata?.posterMediaId,
          reducedMotionMediaId: asset.motionMetadata?.reducedMotionMediaId,
          captionsMediaId: asset.motionMetadata?.accessibility.captionsMediaId,
          transcript: asset.motionMetadata?.accessibility.transcript,
          audioDescription: asset.motionMetadata?.accessibility.audioDescription,
        }).map(([key, value]) => [key, value ?? ""]),
      ),
    });
    setMotionVariant(asset.motionMetadata?.variant ?? "landscape");
    setMotionFlags({
      autoplay: asset.motionMetadata?.autoplay ?? false,
      loop: asset.motionMetadata?.loop ?? false,
      decorative: asset.motionMetadata?.accessibility.decorative ?? false,
      hasAudio: asset.motionMetadata?.accessibility.hasAudio ?? false,
    });
  };

  const saveAssetMetadata = async () => {
    if (!editingAsset || editingAsset.canEdit !== true) return;
    if (!title.trim()) {
      toast({ title: "Asset title is required", description: "Enter a filename before saving metadata.", variant: "destructive" });
      return;
    }
    try {
      const extension = editingAsset.filename.match(/\.[^.]+$/)?.[0] ?? "";
      const commonMetadata = {
        filename: `${title.trim()}${extension}`,
        altText: altText.trim() || null,
        caption: usage.trim() || null,
        credit: credit.trim() || null,
        focalPoint,
      };
      const updateData = editingAsset.collection === "motion"
        ? {
            ...commonMetadata,
            motionMetadata: buildMotionMetadata(motionFields, motionVariant, motionFlags),
          }
        : editingAsset.collection === "linkedin"
          ? { ...commonMetadata, campaignMetadata: cleanCampaignMetadata(campaignFields) ?? null }
          : commonMetadata;
      const updated = await updateMedia.mutateAsync({
        mediaId: editingAsset.id,
        data: updateData,
      });
      queryClient.setQueriesData(
        { queryKey: getListMediaQueryKey() },
        (current: typeof data) => current
          ? { ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) }
          : current,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetMediaQueryKey(editingAsset.id) }),
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetMediaReferenceImpactQueryKey(editingAsset.id) }),
        queryClient.invalidateQueries({
          queryKey: getListAuditEventsQueryKey({
            page: 1,
            pageSize: 25,
            entityType: "media",
            entityId: editingAsset.id,
          }),
        }),
      ]);
      setEditingAsset(null);
      toast({
        title: "Metadata saved — awaiting publisher review",
        description: editingAsset.collection === "motion"
          ? "The new video metadata version is pending publisher review."
          : editingAsset.collection === "linkedin"
            ? "The new campaign metadata version is pending publisher review."
            : "The new image metadata and focal point are pending publisher review.",
      });
    } catch (error: unknown) {
      const detail = typeof error === "object" && error && "error" in error ? String(error.error) : "An error occurred";
      toast({ title: "Metadata update failed", description: detail, variant: "destructive" });
    }
  };

  const handleDownload = async (asset: ExtendedMediaAsset) => {
    if (!asset.publicUrl || !["review", "ready", "active"].includes(asset.status)) {
      toast({
        title: "File unavailable",
        description: `${asset.filename} is not available to download.`,
        variant: "destructive",
      });
      return;
    }
    setDownloadingAssetId(asset.id);
    const downloadUrl = `/api/media/${encodeURIComponent(asset.id)}/download`;
    try {
      const preflight = await fetch(downloadUrl, {
        credentials: "include",
        headers: { Range: "bytes=0-0" },
      });
      if (!preflight.ok) throw new Error();
      await preflight.body?.cancel();
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = asset.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      toast({ title: "Download started", description: asset.filename });
    } catch {
      toast({
        title: "Download unavailable",
        description: `${asset.filename} could not be retrieved. The file may be missing from storage.`,
        variant: "destructive",
      });
    } finally {
      setDownloadingAssetId(null);
    }
  };

  const submitReview = async (decision: "approve" | "reject") => {
    if (!reviewAsset || reviewAsset.canReview !== true || reviewSubmitting.current) return;
    if (decision === "approve" && (!sourceRightsApproved || !accessibilityApproved)) return;
    reviewSubmitting.current = true;
    setReviewPending(true);
    setReviewError(null);
    try {
      const updated = await reviewMedia.mutateAsync({
        mediaId: reviewAsset.id,
         data: {
           decision,
           sourceRightsApproved,
           accessibilityApproved,
         },
      });
      queryClient.setQueriesData(
        { queryKey: getListMediaQueryKey() },
        (current: typeof data) => current
          ? { ...current, items: current.items.map((item) => item.id === updated.id ? updated : item) }
          : current,
      );
      // Keep the exact-asset consumer in step with the list response too. Document
      // editors can have an approved asset selected while this library is open.
      queryClient.setQueryData(getGetMediaQueryKey(updated.id), updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetMediaQueryKey(updated.id) }),
      ]);
      toast({
        title: decision === "approve" ? "Asset approved" : "Asset rejected",
        description: decision === "approve"
          ? `${reviewAsset.filename} is now Available.`
          : `${reviewAsset.filename} has been removed from the review queue.`,
      });
      setReviewAsset(null);
    } catch (error: unknown) {
      const detail = typeof error === "object" && error && "data" in error
        && typeof error.data === "object" && error.data && "error" in error.data
        ? String(error.data.error)
        : error instanceof Error && error.message.trim()
          ? error.message
          : "The review decision could not be saved.";
      const message = `${detail} Retry the decision, or refresh the library before reopening Review.`;
      setReviewError(message);
      toast({ title: "Review failed", description: message, variant: "destructive" });
    } finally {
      reviewSubmitting.current = false;
      setReviewPending(false);
    }
  };

  const assetActions = (asset: ExtendedMediaAsset, compact = false) => {
    const downloadable = Boolean(asset.publicUrl) && ["review", "ready", "active"].includes(asset.status);
    return (
      <div className={`flex ${compact ? "flex-col items-end" : "flex-nowrap items-center"} gap-2`}>
        {asset.status === "review" && asset.canReview === true && (
          <Button
            variant="outline"
            size="sm"
            className={compact ? undefined : "shrink-0 gap-1.5 px-2"}
            onClick={() => {
              if (reviewSubmitting.current) return;
              setReviewError(null);
              setSourceRightsApproved(false);
              setAccessibilityApproved(false);
              setReviewAsset(asset);
            }}
          >
            <Eye className="h-3.5 w-3.5" />
            Review
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className={compact ? undefined : "shrink-0 gap-1.5 px-2"}
          disabled={!downloadable || downloadingAssetId === asset.id}
          onClick={() => handleDownload(asset)}
          aria-label={`Download ${asset.filename}`}
        >
          {downloadingAssetId === asset.id
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Download className="h-3.5 w-3.5" />}
          Download
        </Button>
      </div>
    );
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
  const motionForm = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Variant</Label>
        <Select value={motionVariant} onValueChange={(value) => setMotionVariant(value as MotionVariant)}>
          <SelectTrigger aria-label="Motion variant"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["landscape", "portrait", "square", "mobile", "desktop"] as const).map((variant) => (
              <SelectItem key={variant} value={variant}>{variant[0].toUpperCase() + variant.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {MOTION_FIELDS.map((field) => (
        <div key={field.key} className={`space-y-2 ${field.multiline ? "sm:col-span-2" : ""}`}>
          <Label htmlFor={`motion-${field.key}`} className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            {field.label}
          </Label>
          {field.multiline ? (
            <Textarea
              id={`motion-${field.key}`}
              value={motionFields[field.key]}
              onChange={(event) => setMotionFields((current) => ({ ...current, [field.key]: event.target.value }))}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              className="resize-none"
            />
          ) : (
            <Input
              id={`motion-${field.key}`}
              value={motionFields[field.key]}
              onChange={(event) => setMotionFields((current) => ({ ...current, [field.key]: event.target.value }))}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              required={field.key === "groupId"}
            />
          )}
          <p className="text-right text-[10px] font-mono text-muted-foreground">
            {motionFields[field.key].length}/{field.maxLength}
          </p>
        </div>
      ))}
      <div className="flex flex-wrap gap-x-6 gap-y-3 sm:col-span-2">
        {([
          ["autoplay", "Autoplay"],
          ["loop", "Loop"],
          ["decorative", "Decorative motion"],
          ["hasAudio", "Contains audio"],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={motionFlags[key]}
              onChange={(event) => setMotionFlags((current) => ({ ...current, [key]: event.target.checked }))}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Media Library</h1>
          <p className="mt-1 text-sm font-mono text-muted-foreground">Managed website, LinkedIn, and motion assets</p>
        </div>
      </div>

      <div className="mb-8">
        <BatchUploadZone />
      </div>

      <Tabs value={collection} onValueChange={selectCollection} className="mb-3">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-3">
          <TabsTrigger value="website" className="h-auto min-w-0 justify-between gap-2 border border-border bg-card px-4 py-3 data-[state=active]:border-primary">
            <span className="flex min-w-0 items-center gap-2"><FileImage className="h-4 w-4" /> Website</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{collectionCounts.website ?? "—"}</span>
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="h-auto min-w-0 justify-between gap-2 border border-border bg-card px-4 py-3 data-[state=active]:border-primary">
            <span className="flex min-w-0 items-center gap-2"><Linkedin className="h-4 w-4" /> LinkedIn</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{collectionCounts.linkedin ?? "—"}</span>
          </TabsTrigger>
          <TabsTrigger value="motion" className="h-auto min-w-0 justify-between gap-2 border border-border bg-card px-4 py-3 data-[state=active]:border-primary">
            <span className="flex min-w-0 items-center gap-2"><PlaySquare className="h-4 w-4 shrink-0" /> <span className="truncate">Videos &amp; animations</span></span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{collectionCounts.motion ?? "—"}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {collection === "motion" && <HeroAssignments canEdit={canUpload} />}

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 p-4">
          <div className="relative min-w-60 max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${collection === "linkedin" ? "LinkedIn" : collection === "motion" ? "video and animation" : "website"} assets…`}
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
              <p className="text-sm font-mono">No {collection === "linkedin" ? "LinkedIn" : collection === "motion" ? "video or animation" : "website"} assets found.</p>
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
                             <Button disabled={asset.canEdit !== true} variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEditor(asset)} aria-label={`Edit campaign metadata for ${asset.filename}`}>
                               <Pencil className="h-3.5 w-3.5" />
                             </Button>
                           </div>
                        </div>
                      )}
                      {collection === "motion" && (
                        <div className="space-y-1 border-t border-border/60 pt-2 text-[11px]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{asset.filename}</p>
                              {(asset.motionMetadata?.groupId || asset.motionMetadata?.variant) && (
                                <p className="truncate font-mono text-[10px] uppercase tracking-wide text-primary">
                                  {[asset.motionMetadata.groupId, asset.motionMetadata.variant].filter(Boolean).join(" • ")}
                                </p>
                              )}
                              {asset.caption && <p className="line-clamp-2 text-muted-foreground">Usage: {asset.caption}</p>}
                            </div>
                            <Button disabled={asset.canEdit !== true} variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEditor(asset)} aria-label={`Edit video metadata for ${asset.filename}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                      <p className="line-clamp-2 text-[11px] text-muted-foreground">{asset.altText || "No alt text provided"}</p>
                      <p className="truncate text-[10px] font-mono text-muted-foreground" title={asset.credit || undefined}>
                        {asset.credit ? `Credit: ${asset.credit}` : "Credit not recorded"}
                      </p>
                      {asset.status === "review" && asset.canReview !== true && (
                        <p className="text-[10px] font-mono text-amber-700">Awaiting a publisher review</p>
                      )}
                       {assetActions(asset)}
                       {collection === "website" && (
                         <Button
                           disabled={asset.canEdit !== true}
                           variant="outline"
                           size="sm"
                           className="w-full gap-1.5"
                           onClick={() => openEditor(asset)}
                           aria-label={`Edit image metadata for ${asset.filename}`}
                         >
                           <Pencil className="h-3.5 w-3.5" />
                           Edit image metadata
                         </Button>
                       )}
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
                    {collection === "motion" && <th className="px-4 py-3 font-medium">Video metadata</th>}
                    <th className="px-4 py-3 font-medium">Accessibility / rights</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
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
                              <Button disabled={asset.canEdit !== true} variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={() => openEditor(asset)}>Edit metadata</Button>
                          </td>
                        )}
                        {collection === "motion" && (
                          <td className="max-w-80 px-4 py-3">
                            <p className="font-medium">{asset.filename}</p>
                            <p className="text-[10px] font-mono uppercase tracking-wide text-primary">
                              {[asset.motionMetadata?.groupId, asset.motionMetadata?.variant].filter(Boolean).join(" • ") || "Group / variant not recorded"}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{asset.caption || "Approved usage not recorded"}</p>
                            <p className="line-clamp-2 text-xs text-muted-foreground">{asset.credit || "Rights not recorded"}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              Poster: {asset.motionMetadata?.posterMediaId || "Not assigned"} • Fallback: {asset.motionMetadata?.reducedMotionMediaId || "Not assigned"}
                            </p>
                              <Button disabled={asset.canEdit !== true} variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={() => openEditor(asset)}>Edit metadata</Button>
                          </td>
                        )}
                        <td className="max-w-64 px-4 py-3">
                          <p className="line-clamp-2 text-xs">{asset.altText || "No alt text provided"}</p>
                          <p className="mt-1 truncate text-[10px] font-mono text-muted-foreground">{asset.credit ? `Credit: ${asset.credit}` : "Credit not recorded"}</p>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={asset.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <p className="mb-2 text-xs font-mono text-muted-foreground">{format(new Date(asset.createdAt), "MMM d, yyyy")}</p>
                          {asset.status === "review" && asset.canReview !== true && (
                            <p className="mb-2 text-[10px] font-mono text-amber-700">Awaiting publisher review</p>
                          )}
                          {assetActions(asset, true)}
                           {collection === "website" && (
                             <Button
                               disabled={asset.canEdit !== true}
                               variant="link"
                               size="sm"
                               className="mt-1 h-auto p-0 text-xs"
                               onClick={() => openEditor(asset)}
                               aria-label={`Edit image metadata for ${asset.filename}`}
                             >
                               Edit image metadata
                             </Button>
                           )}
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


      <Dialog open={Boolean(editingAsset)} onOpenChange={(open) => !open && setEditingAsset(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAsset?.collection === "motion"
                ? "Edit video metadata"
                : editingAsset?.collection === "linkedin"
                  ? "Edit LinkedIn campaign metadata"
                  : "Edit image metadata"}
            </DialogTitle>
            <DialogDescription>
              Keep the governed metadata for {editingAsset?.filename} current without changing its source bytes.
            </DialogDescription>
          </DialogHeader>
          <fieldset disabled={editingAsset?.canEdit !== true} className="space-y-4 py-4">
            {editingAsset && (
              <MediaAssetDetailsPanel
                asset={editingAsset}
                title={title}
                usage={usage}
                altText={altText}
                credit={credit}
                focalPoint={focalPoint}
                disabled={editingAsset?.canEdit !== true}
                onTitleChange={setTitle}
                onUsageChange={setUsage}
                onAltTextChange={setAltText}
                onCreditChange={setCredit}
                onFocalPointChange={setFocalPoint}
                onFocalPointClear={() => setFocalPoint(null)}
              />
            )}
            {editingAsset?.collection === "motion" ? motionForm : editingAsset?.collection === "linkedin" ? campaignForm : null}
          </fieldset>
          {editingAsset && <MediaReviewHistory asset={editingAsset} canInspect={editingAsset.canInspect === true} />}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingAsset(null)}>Cancel</Button>
            <Button onClick={saveAssetMetadata} disabled={editingAsset?.canEdit !== true || updateMedia.isPending}>
              {updateMedia.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save metadata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reviewAsset)}
        onOpenChange={(open) => {
          if (!open && !reviewSubmitting.current) {
            setReviewError(null);
            setSourceRightsApproved(false);
            setAccessibilityApproved(false);
            setReviewAsset(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review media asset</DialogTitle>
            <DialogDescription>
              Inspect the preview and governed metadata before making this asset available.
            </DialogDescription>
          </DialogHeader>
          {reviewAsset && (
            <div className="space-y-4 py-2">
              <AssetPreview
                asset={reviewAsset}
                className="aspect-video max-h-80 rounded-md border border-border"
                broken={Boolean(brokenPreviews[reviewAsset.id])}
                onError={() => setBrokenPreviews((current) => ({ ...current, [reviewAsset.id]: true }))}
              />
              <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-4 text-sm sm:grid-cols-2">
                <div><p className="text-[10px] font-mono uppercase text-muted-foreground">Filename</p><p className="break-all font-medium">{reviewAsset.filename}</p></div>
                <div><p className="text-[10px] font-mono uppercase text-muted-foreground">Type and size</p><p>{reviewAsset.mimeType} • {(reviewAsset.size / 1024 / 1024).toFixed(2)} MB</p></div>
                <div><p className="text-[10px] font-mono uppercase text-muted-foreground">Collection</p><p>{reviewAsset.collection === "motion" ? "Videos & animations" : reviewAsset.collection === "linkedin" ? "LinkedIn" : "Website"}</p></div>
                <div><p className="text-[10px] font-mono uppercase text-muted-foreground">Status</p><StatusBadge status={reviewAsset.status} /></div>
                <div className="sm:col-span-2"><p className="text-[10px] font-mono uppercase text-muted-foreground">Alt text / accessibility</p><p>{reviewAsset.altText || "Not provided"}</p></div>
                <div className="sm:col-span-2"><p className="text-[10px] font-mono uppercase text-muted-foreground">Usage</p><p>{reviewAsset.caption || reviewAsset.campaignMetadata?.approvedUse || "Not provided"}</p></div>
                <div className="sm:col-span-2"><p className="text-[10px] font-mono uppercase text-muted-foreground">Credit / rights</p><p>{reviewAsset.credit || "Not recorded"}</p></div>
              </div>
                <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-4 text-sm">
                  <p className="font-medium">
                    Approve this asset?
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    It will move to Available and can be assigned to governed content.
                  </p>
                </div>
                <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-4">
                  <p className="text-sm font-medium">Confirm source review gates</p>
                  <p className="text-xs text-muted-foreground">
                    Approval creates a new immutable metadata version; the original source version and binary remain unchanged.
                  </p>
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox disabled={reviewPending} checked={sourceRightsApproved} onCheckedChange={(checked) => setSourceRightsApproved(checked === true)} />
                    <span>I confirm documented source rights and permission are approved.</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox disabled={reviewPending} checked={accessibilityApproved} onCheckedChange={(checked) => setAccessibilityApproved(checked === true)} />
                    <span>I confirm the source accessibility review is complete and approved.</span>
                  </label>
                </div>
              <p className="text-xs text-muted-foreground">Reject removes this asset from the review queue and keeps it unavailable for content assignment.</p>
              {reviewError && <p role="alert" className="text-sm text-destructive">{reviewError}</p>}
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => submitReview("reject")} disabled={reviewPending}>
              <X className="h-4 w-4" /> Reject
            </Button>
            <Button onClick={() => submitReview("approve")} disabled={reviewPending || !sourceRightsApproved || !accessibilityApproved}>
              {reviewPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
