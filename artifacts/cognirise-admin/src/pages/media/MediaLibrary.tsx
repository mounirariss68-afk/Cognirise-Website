import { useEffect, useRef, useState } from "react";
import {
  useCreateDocument,
  getGetDocumentRevisionQueryKey,
  getGetMediaQueryKey,
  getListMediaQueryKey,
  useGetDocumentRevision,
  useListDocuments,
  useFinalizeMediaUpload,
  useGetMedia,
  useListMedia,
  useRequestMediaUpload,
  useSubmitDocument,
  useUpdateDocument,
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
  PlaySquare,
  Search,
  UploadCloud,
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

type MediaCollection = "website" | "linkedin" | "motion";
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
type MotionVariant = "landscape" | "portrait" | "square" | "mobile" | "desktop";
type MotionMetadata = {
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
type MotionTextField = "groupId" | "posterMediaId" | "reducedMotionMediaId" | "captionsMediaId" | "transcript" | "audioDescription";
type ExtendedMediaAsset = {
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
};

type HeroSlot = CmsHeroFilmSlot;

function HeroAssignments() {
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
      await submitDocument.mutateAsync({ documentId: updated.id, data: {} });
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
      <Select value={selection[slot][role]?.id} onValueChange={(value) =>
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
        <Input className="w-64" aria-label="Search active hero media" placeholder="Search active media…" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(["homepage", "industries"] as const).map((slot) => (
          <div key={slot} className="space-y-3 rounded-lg border p-4">
            <h3 className="font-medium">{slot === "homepage" ? "Homepage" : "Industries"}</h3>
            {chooser(slot, "poster", "Poster image", "image")}
            {chooser(slot, "mp4", "MP4 source", "video/mp4")}
            {chooser(slot, "webm", "WebM source", "video/webm")}
            {errors(slot).length > 0 && <div role="alert" className="text-xs text-destructive">{errors(slot).join(" ")}</div>}
            <Button onClick={() => saveDraft(slot)} disabled={createDocument.isPending || updateDocument.isPending || submitDocument.isPending}>
              Save draft &amp; submit for review
            </Button>
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

const PAGE_SIZE = 40;
const STANDARD_UPLOAD_LIMIT = 50 * 1024 * 1024;
const VIDEO_UPLOAD_LIMIT = 250 * 1024 * 1024;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,application/pdf";
const VIDEO_ACCEPT = "video/mp4,video/webm";
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
const EMPTY_MOTION: Record<MotionTextField, string> = {
  groupId: "",
  posterMediaId: "",
  reducedMotionMediaId: "",
  captionsMediaId: "",
  transcript: "",
  audioDescription: "",
};
const MOTION_FIELDS: Array<{ key: MotionTextField; label: string; maxLength: number; placeholder: string; multiline?: boolean }> = [
  { key: "groupId", label: "Asset group", maxLength: 120, placeholder: "e.g. homepage-hero" },
  { key: "posterMediaId", label: "Poster media ID", maxLength: 120, placeholder: "Media library ID for the poster image" },
  { key: "reducedMotionMediaId", label: "Reduced-motion fallback ID", maxLength: 120, placeholder: "Media library ID for the static fallback" },
  { key: "captionsMediaId", label: "Captions media ID", maxLength: 120, placeholder: "Media library ID for the captions file" },
  { key: "transcript", label: "Transcript", maxLength: 10000, placeholder: "Transcript for speech and meaningful sound", multiline: true },
  { key: "audioDescription", label: "Audio description", maxLength: 2000, placeholder: "Describe essential visual information", multiline: true },
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

function buildMotionMetadata(
  values: Record<MotionTextField, string>,
  variant: MotionVariant,
  flags: { autoplay: boolean; loop: boolean; decorative: boolean; hasAudio: boolean },
): MotionMetadata {
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

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-muted ${className}`}>
      {canRender ? (
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
  const [uploadCollection, setUploadCollection] = useState<MediaCollection>("website");
  const [uploadLinkedinKind, setUploadLinkedinKind] = useState<LinkedInAssetKind>("post");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [motionSetupOpen, setMotionSetupOpen] = useState(false);
  const [finalizeAsset, setFinalizeAsset] = useState<ExtendedMediaAsset | null>(null);
  const [title, setTitle] = useState("");
  const [usage, setUsage] = useState("");
  const [altText, setAltText] = useState("");
  const [credit, setCredit] = useState("");
  const [campaignFields, setCampaignFields] = useState<Record<CampaignField, string>>(EMPTY_CAMPAIGN);
  const [motionFields, setMotionFields] = useState<Record<MotionTextField, string>>(EMPTY_MOTION);
  const [motionVariant, setMotionVariant] = useState<MotionVariant>("landscape");
  const [motionFlags, setMotionFlags] = useState({ autoplay: false, loop: false, decorative: false, hasAudio: false });
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
    const selectedCollection = uploadCollection;
    const isVideoUpload = selectedCollection === "motion";
    if (isVideoUpload && !["video/mp4", "video/webm"].includes(file.type)) {
      toast({ title: "Unsupported video", description: "Videos & animations accepts MP4 and WebM files only.", variant: "destructive" });
      return;
    }
    if (isVideoUpload && !motionFields.groupId.trim()) {
      toast({ title: "Asset group required", description: "Configure a group and variant before uploading motion media.", variant: "destructive" });
      return;
    }
    if (!isVideoUpload && !IMAGE_ACCEPT.split(",").includes(file.type)) {
      toast({ title: "Unsupported file", description: "Website and LinkedIn uploads accept JPEG, PNG, WebP, AVIF, and PDF files.", variant: "destructive" });
      return;
    }
    const uploadLimit = isVideoUpload ? VIDEO_UPLOAD_LIMIT : STANDARD_UPLOAD_LIMIT;
    if (file.size > uploadLimit) {
      toast({
        title: "File too large",
        description: isVideoUpload ? "Maximum video file size is 250MB." : "Maximum file size is 50MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    try {
      const requestData = {
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        collection: selectedCollection,
        linkedinAssetKind: selectedCollection === "linkedin" ? uploadLinkedinKind : undefined,
        motionMetadata: selectedCollection === "motion"
          ? buildMotionMetadata(motionFields, motionVariant, motionFlags)
          : undefined,
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
      setFinalizeAsset({ ...(response.media as ExtendedMediaAsset), collection: selectedCollection });
      setTitle((current) => current.trim() || file.name.replace(/\.[^.]+$/, ""));
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
      const finalizeData = {
        objectPath: finalizeAsset.objectPath,
        altText: altText || undefined,
        caption: usage || undefined,
        credit: credit || undefined,
        campaignMetadata: finalizeAsset.collection === "linkedin" ? cleanCampaignMetadata(campaignFields) : undefined,
        motionMetadata: finalizeAsset.collection === "motion"
          ? buildMotionMetadata(motionFields, motionVariant, motionFlags)
          : undefined,
      };
      await finalizeUpload.mutateAsync({
        mediaId: finalizeAsset.id,
        data: finalizeData,
      });
      if (finalizeAsset.collection === "motion" && title.trim()) {
        const extension = finalizeAsset.filename.match(/\.[^.]+$/)?.[0] ?? "";
        await updateMedia.mutateAsync({
          mediaId: finalizeAsset.id,
          data: { filename: `${title.trim()}${extension}` },
        });
      }
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
    setTitle(asset.filename.replace(/\.[^.]+$/, ""));
    setUsage(asset.caption ?? "");
    setAltText(asset.altText ?? "");
    setCredit(asset.credit ?? "");
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
    if (!editingAsset) return;
    try {
      const extension = editingAsset.filename.match(/\.[^.]+$/)?.[0] ?? "";
      const updateData = editingAsset.collection === "motion"
        ? {
            filename: `${title.trim()}${extension}`,
            altText: altText.trim() || null,
            caption: usage.trim() || null,
            credit: credit.trim() || null,
            motionMetadata: buildMotionMetadata(motionFields, motionVariant, motionFlags),
          }
        : { campaignMetadata: cleanCampaignMetadata(campaignFields) ?? null };
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
      setEditingAsset(null);
      toast({ title: editingAsset.collection === "motion" ? "Video metadata saved" : "Campaign metadata saved" });
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
  const motionForm = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="motion-title" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Title</Label>
        <Input id="motion-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} placeholder="Descriptive asset title" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="motion-usage" className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Approved usage</Label>
        <Textarea id="motion-usage" value={usage} onChange={(event) => setUsage(event.target.value)} maxLength={500} placeholder="Where and how this motion asset may be used" className="resize-none" />
      </div>
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
                 <SelectItem value="motion">Videos &amp; animations</SelectItem>
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
            accept={uploadCollection === "motion" ? VIDEO_ACCEPT : IMAGE_ACCEPT}
          />
          <Button
            className="gap-2 text-xs font-mono uppercase tracking-wider"
            onClick={() => uploadCollection === "motion" ? setMotionSetupOpen(true) : fileInputRef.current?.click()}
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
          <TabsTrigger value="motion" className="gap-2">
            <PlaySquare className="h-4 w-4" /> Videos &amp; animations
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {collection === "motion" && <HeroAssignments />}

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
                             <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEditor(asset)} aria-label={`Edit campaign metadata for ${asset.filename}`}>
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
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => openEditor(asset)} aria-label={`Edit video metadata for ${asset.filename}`}>
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
                    {collection === "motion" && <th className="px-4 py-3 font-medium">Video metadata</th>}
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

      <Dialog open={motionSetupOpen} onOpenChange={setMotionSetupOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure motion upload</DialogTitle>
            <DialogDescription>
              Set the required group, variant, and accessibility decisions before selecting an MP4 or WebM file.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">{motionForm}</div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMotionSetupOpen(false)}>Cancel</Button>
            <Button
              disabled={!motionFields.groupId.trim()}
              onClick={() => {
                setMotionSetupOpen(false);
                fileInputRef.current?.click();
              }}
            >
              Choose MP4 or WebM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(finalizeAsset)} onOpenChange={(open) => !open && setFinalizeAsset(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asset metadata</DialogTitle>
            <DialogDescription className="mt-1 text-xs font-mono">
               Add governed accessibility, rights, and usage context before publishing the asset.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs font-mono">
              Collection: {finalizeAsset?.collection === "linkedin"
                ? `LinkedIn • ${uploadLinkedinKind === "header" ? "Profile header" : "Post image"}`
                : finalizeAsset?.collection === "motion" ? "Videos & animations" : "Website"}
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
            {finalizeAsset?.collection === "motion" && (
              <div className="border-t border-border pt-4">
                <p className="mb-2 text-xs font-mono uppercase tracking-wider text-primary">Video &amp; animation details</p>
                <p className="mb-4 text-xs text-muted-foreground">
                  Record a poster and static fallback media ID so motion has a governed loading and reduced-motion alternative.
                </p>
                {motionForm}
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
            <DialogTitle>{editingAsset?.collection === "motion" ? "Edit video metadata" : "Edit LinkedIn campaign metadata"}</DialogTitle>
            <DialogDescription>
              Keep the governed {editingAsset?.collection === "motion" ? "motion asset context" : "campaign context"} for {editingAsset?.filename} current.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingAsset?.collection === "motion" && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Accessibility summary</Label>
                  <Textarea value={altText} onChange={(event) => setAltText(event.target.value)} maxLength={300} placeholder="Concise description for assistive technology" className="resize-none" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Credit / rights</Label>
                  <Input value={credit} onChange={(event) => setCredit(event.target.value)} maxLength={200} placeholder="Rights holder, source, and licence" />
                </div>
              </>
            )}
            {editingAsset?.collection === "motion" ? motionForm : campaignForm}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingAsset(null)}>Cancel</Button>
            <Button onClick={saveAssetMetadata} disabled={updateMedia.isPending}>
              {updateMedia.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save metadata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}