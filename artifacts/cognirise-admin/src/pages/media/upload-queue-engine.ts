import {
  EMPTY_CAMPAIGN,
  EMPTY_MOTION,
  CAMPAIGN_FIELDS,
  IMAGE_ACCEPT,
  MOTION_FIELDS,
  STANDARD_UPLOAD_LIMIT,
  VIDEO_ACCEPT,
  VIDEO_UPLOAD_LIMIT,
  buildMotionMetadata,
  cleanCampaignMetadata,
} from "./MediaLibrary";
import type {
  CampaignField,
  LinkedInAssetKind,
  MediaCollection,
  MotionTextField,
  MotionVariant,
} from "./MediaLibrary";

export type QueueItemStatus = "draft" | "requesting" | "uploading" | "finalizing" | "completed" | "error";

export type QueueItem = {
  /** Persistent idempotency key. */
  id: string;
  file?: File;
  filename: string;
  size: number;
  mimeType: string;
  originalSha256?: string;
  collection: MediaCollection;
  linkedinAssetKind?: LinkedInAssetKind;
  motionFields?: Record<MotionTextField, string>;
  motionVariant?: MotionVariant;
  motionFlags?: { autoplay: boolean; loop: boolean; decorative: boolean; hasAudio: boolean };
  title: string;
  altText: string;
  credit: string;
  usage: string;
  campaignFields?: Record<CampaignField, string>;
  reviewed?: boolean;
  /** Once true, intake metadata is an immutable request snapshot. */
  started?: boolean;
  status: QueueItemStatus;
  progress: number;
  error?: string;
  mediaId?: string;
  objectPath?: string;
  /** Durable boundary: a true value means the file must never be PUT again. */
  putCompleted?: boolean;
  /** Local lifecycle timestamps used only for bounded queue retention. */
  queuedAt?: number;
  completedAt?: number;
  failedAt?: number;
};

export type UploadResponse = {
  media: { id: string; objectPath: string };
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
};

export type QueueEngineDependencies = {
  request: (body: Record<string, unknown>, idempotencyKey: string) => Promise<UploadResponse>;
  renew: (mediaId: string) => Promise<Omit<UploadResponse, "media">>;
  put: (
    url: string,
    method: string,
    headers: Record<string, string>,
    file: File,
    onProgress: (percent: number) => void,
  ) => Promise<void>;
  finalize: (mediaId: string, body: Record<string, unknown>) => Promise<unknown>;
  get: (mediaId: string) => Promise<{
    id?: string;
    status?: string;
    checksum?: string | null;
    size?: number;
    objectPath?: string;
  }>;
  sha256: (file: File) => Promise<string>;
  makeId: () => string;
};

export type QueueStorage = Pick<Storage, "getItem" | "setItem">;

export type QueueEngineOptions = {
  dependencies: QueueEngineDependencies;
  storage?: QueueStorage;
  storageKey?: string;
  onChange?: (queue: QueueItem[], persistenceError?: string) => void;
  onError?: (item: QueueItem | undefined, message: string) => void;
  onCompleted?: (item: QueueItem) => void | Promise<void>;
  now?: () => number;
};

export const MAX_QUEUE_ITEMS = 100;
export const QUEUE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

const workingStatuses: QueueItemStatus[] = ["requesting", "uploading", "finalizing"];
const finalizedMediaStatuses = new Set(["review", "ready", "rejected"]);
const collections = new Set<MediaCollection>(["website", "linkedin", "motion"]);
const linkedinKinds = new Set<LinkedInAssetKind>(["post", "header"]);
const motionVariants = new Set<MotionVariant>(["landscape", "portrait", "square", "mobile", "desktop"]);
const editableKeys = new Set<keyof QueueItem>([
  "title", "altText", "credit", "usage", "campaignFields", "motionFields",
  "motionVariant", "motionFlags", "reviewed",
]);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An error occurred during upload";
}

function isDisposableLocalItem(item: QueueItem): boolean {
  return item.status === "completed" || (item.status === "error" && !item.started);
}

function boundedQueueItems(items: QueueItem[]): QueueItem[] {
  if (items.length <= MAX_QUEUE_ITEMS) return items;
  const disposable = items.filter(isDisposableLocalItem);
  const protectedItems = items.filter((item) => !isDisposableLocalItem(item));
  const terminalCapacity = Math.max(0, MAX_QUEUE_ITEMS - protectedItems.length);
  const terminalToKeep = terminalCapacity ? disposable.slice(-terminalCapacity) : [];
  const keepIds = new Set(terminalToKeep.map((item) => item.id));
  // Never silently evict drafts, working uploads, or started failures. Only
  // finalized rows and pre-start validation failures are bounded.
  return items.filter((item) => !isDisposableLocalItem(item) || keepIds.has(item.id));
}

function persistedItems(items: QueueItem[]): QueueItem[] {
  return boundedQueueItems(items).map(({ file: _file, ...item }) => {
    const safe = { ...item } as QueueItem & Record<string, unknown>;
    delete safe.uploadUrl;
    delete safe.method;
    delete safe.headers;
    return safe;
  });
}

function restoreItems(raw: string | null, now = Date.now()): QueueItem[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Saved upload queue is invalid");
  const restored = parsed
    .filter((item): item is QueueItem => Boolean(
      item && typeof item === "object" && typeof (item as QueueItem).id === "string"
      && typeof (item as QueueItem).filename === "string",
    ))
    .map((item) => {
      const restored: QueueItem = { ...item, file: undefined };
      if (restored.status === "completed") {
        restored.completedAt = restored.completedAt ?? now;
        if (now - restored.completedAt > QUEUE_RETENTION_MS) return undefined;
        restored.progress = 100;
      } else if (restored.putCompleted && restored.mediaId && restored.objectPath) {
        restored.status = "error";
        restored.progress = 100;
        restored.error = "Finalization was interrupted. Retry to finish without re-uploading.";
        restored.failedAt = restored.failedAt ?? now;
      } else {
        restored.status = "error";
        restored.progress = 0;
        restored.error = "File missing. Reselect the original file to continue.";
        restored.failedAt = restored.failedAt ?? now;
      }
      return restored;
    })
    .filter((item): item is QueueItem => Boolean(item))
    .filter((item) => !(
      item.status === "error"
      && !item.started
      && item.failedAt !== undefined
      && now - item.failedAt > QUEUE_RETENTION_MS
    ));
  return boundedQueueItems(restored);
}

export class UploadQueueEngine {
  private queue: QueueItem[] = [];
  private persistenceError?: string;
  private readonly active = new Map<string, Promise<void>>();
  private transferTail: Promise<void> = Promise.resolve();
  private activeCount = 0;
  private readonly now: () => number;

  constructor(private readonly options: QueueEngineOptions) {
    this.now = options.now ?? Date.now;
    if (options.storage && options.storageKey) {
      try {
        this.queue = restoreItems(options.storage.getItem(options.storageKey), this.now());
      } catch (error) {
        this.persistenceError = `Unable to read saved upload queue: ${errorMessage(error)}`;
      }
    }
  }

  getQueue(): QueueItem[] {
    return this.queue;
  }

  getPersistenceError(): string | undefined {
    return this.persistenceError;
  }

  isBusy(): boolean {
    return this.activeCount > 0;
  }

  private emit(persist = true): void {
    if (persist && this.options.storage && this.options.storageKey) {
      try {
        this.options.storage.setItem(this.options.storageKey, JSON.stringify(persistedItems(this.queue)));
        this.persistenceError = undefined;
      } catch (error) {
        this.persistenceError = `Unable to save upload queue: ${errorMessage(error)}`;
      }
    }
    this.options.onChange?.([...this.queue], this.persistenceError);
  }

  private mutate(id: string, updates: Partial<QueueItem>): QueueItem | undefined {
    let result: QueueItem | undefined;
    this.queue = this.queue.map((item) => {
      if (item.id !== id) return item;
      const lifecycle: Partial<QueueItem> = {};
      if (updates.status && updates.status !== item.status) {
        if (updates.status === "completed") {
          lifecycle.completedAt = this.now();
          lifecycle.failedAt = undefined;
        } else if (updates.status === "error") {
          lifecycle.failedAt = this.now();
          lifecycle.completedAt = undefined;
        } else {
          lifecycle.completedAt = undefined;
          lifecycle.failedAt = undefined;
        }
      }
      result = { ...item, ...updates, ...lifecycle };
      return result;
    });
    this.emit();
    return result;
  }

  updateItem(id: string, updates: Partial<QueueItem>): void {
    const current = this.queue.find((item) => item.id === id);
    if (!current || current.started) return;
    const accepted = Object.fromEntries(
      Object.entries(updates).filter(([key]) => editableKeys.has(key as keyof QueueItem)),
    ) as Partial<QueueItem>;
    if (Object.keys(accepted).some((key) => key !== "reviewed") && updates.reviewed !== true) {
      accepted.reviewed = false;
    }
    if (Object.keys(accepted).length) this.mutate(id, accepted);
  }

  async addFiles(
    files: File[],
    collection: MediaCollection,
    linkedinAssetKind?: LinkedInAssetKind,
    motionFields?: Record<MotionTextField, string>,
    motionVariant?: MotionVariant,
    motionFlags?: { autoplay: boolean; loop: boolean; decorative: boolean; hasAudio: boolean },
  ): Promise<void> {
    const additions: QueueItem[] = [];
    for (const file of files) {
      if (this.queue.length + additions.length >= MAX_QUEUE_ITEMS) {
        this.options.onError?.(
          undefined,
          `Upload queue limit reached (${MAX_QUEUE_ITEMS} items). Clear completed or discard failed entries before adding more files.`,
        );
        break;
      }
      try {
        additions.push({
          id: this.options.dependencies.makeId(),
          file,
          filename: file.name,
          size: file.size,
          mimeType: file.type,
          originalSha256: await this.options.dependencies.sha256(file),
          collection,
          linkedinAssetKind,
          motionFields: { ...(motionFields ?? EMPTY_MOTION) },
          motionVariant: motionVariant ?? "landscape",
          motionFlags: { ...(motionFlags ?? { autoplay: false, loop: false, decorative: false, hasAudio: false }) },
          title: file.name.replace(/\.[^.]+$/, ""),
          altText: "",
          credit: "",
          usage: "",
          campaignFields: { ...EMPTY_CAMPAIGN },
          reviewed: false,
          started: false,
          status: "draft",
          progress: 0,
          queuedAt: this.now(),
        });
      } catch (error) {
        this.options.onError?.(undefined, `Failed to process ${file.name}: ${errorMessage(error)}`);
      }
    }
    if (additions.length) {
      this.queue = [...this.queue, ...additions];
      this.emit();
    }
  }

  removeItem(id: string): void {
    const item = this.queue.find((candidate) => candidate.id === id);
    if (!item || item.started) return;
    this.queue = this.queue.filter((candidate) => candidate.id !== id);
    this.emit();
  }

  /**
   * Local queue cleanup never calls the media API. A completed item already
   * represents a finalized server asset, so clearing this row cannot delete
   * or unpublish that asset.
   */
  clearCompleted(): number {
    const count = this.queue.filter((item) => item.status === "completed").length;
    if (!count) return 0;
    this.queue = this.queue.filter((item) => item.status !== "completed");
    this.emit();
    return count;
  }

  /**
   * Remove only terminal local failures. In-flight work is intentionally not
   * removable, and this operation does not attempt storage cleanup.
   */
  discardFailed(id?: string): number {
    const removable = new Set(
      this.queue
        .filter((item) => item.status === "error" && !this.active.has(item.id) && (!id || item.id === id))
        .map((item) => item.id),
    );
    if (!removable.size) return 0;
    this.queue = this.queue.filter((item) => !removable.has(item.id));
    this.emit();
    return removable.size;
  }

  async reattachFile(id: string, file: File): Promise<boolean> {
    const item = this.queue.find((candidate) => candidate.id === id);
    if (!item) return false;
    if (!item.originalSha256) {
      this.options.onError?.(item, "The original checksum is missing; this upload cannot be safely resumed.");
      return false;
    }
    try {
      const checksum = await this.options.dependencies.sha256(file);
      if (checksum !== item.originalSha256 || file.size !== item.size) {
        this.options.onError?.(item, "The selected file does not match the original.");
        return false;
      }
      this.mutate(id, { file, error: undefined, status: item.started ? "error" : "draft" });
      return true;
    } catch (error) {
      this.options.onError?.(item, `Failed to verify file: ${errorMessage(error)}`);
      return false;
    }
  }

  processItem(id: string): Promise<void> {
    const existing = this.active.get(id);
    if (existing) return existing;

    const item = this.queue.find((candidate) => candidate.id === id);
    if (!item || item.status === "completed") return Promise.resolve();
    if (!item.started && !item.reviewed) {
      const message = "Review and confirm metadata before starting.";
      this.mutate(id, { error: message });
      this.options.onError?.(item, message);
      return Promise.resolve();
    }
    if (!item.file && !item.putCompleted) {
      const message = `File missing. Reselect ${item.filename} to continue.`;
      this.mutate(id, { status: "error", error: message });
      this.options.onError?.(item, message);
      return Promise.resolve();
    }
    const validationError = this.validatePreflight(item);
    if (validationError) {
      this.mutate(id, { status: "error", error: validationError });
      this.options.onError?.(item, validationError);
      return Promise.resolve();
    }

    // Snapshot the reviewed intake synchronously, before this method yields.
    this.mutate(id, { started: true, status: "requesting", progress: 0, error: undefined });
    if (this.persistenceError) {
      const message = `${this.persistenceError}. Upload was not started.`;
      this.mutate(id, { started: item.started === true, status: "error", error: message });
      this.options.onError?.(item, message);
      return Promise.resolve();
    }
    this.activeCount += 1;
    const run = this.transferTail.then(() => this.runItem(id));
    this.transferTail = run.catch(() => undefined);
    const tracked = run.finally(() => {
      this.active.delete(id);
      this.activeCount -= 1;
      this.emit(false);
    });
    this.active.set(id, tracked);
    this.emit(false);
    return tracked;
  }

  async processAll(): Promise<void> {
    const ids = this.queue
      .filter((item) =>
        item.status !== "completed"
        && !workingStatuses.includes(item.status)
        && (item.started === true || item.reviewed === true),
      )
      .map((item) => item.id);
    for (const id of ids) await this.processItem(id);
  }

  private validatePreflight(item: QueueItem): string | undefined {
    if (!item.filename || item.filename.length > 255) {
      return "Filename must contain 1–255 characters.";
    }
    if (!item.mimeType || item.mimeType.length > 120) {
      return "File type must contain 1–120 characters.";
    }
    if (!Number.isInteger(item.size) || item.size < 1) {
      return "File size must be a positive whole number.";
    }
    if (!collections.has(item.collection)) {
      return "Choose a valid media collection.";
    }
    const sizeLimit = item.collection === "motion" ? VIDEO_UPLOAD_LIMIT : STANDARD_UPLOAD_LIMIT;
    if (item.size > sizeLimit) {
      return `File exceeds the ${item.collection === "motion" ? "250MB" : "50MB"} upload limit.`;
    }
    const acceptedTypes = new Set(
      (item.collection === "motion" ? VIDEO_ACCEPT : IMAGE_ACCEPT).split(","),
    );
    if (!acceptedTypes.has(item.mimeType)) {
      return `File type ${item.mimeType} is not supported for the ${item.collection} collection.`;
    }
    if (item.collection === "linkedin" && (
      !item.linkedinAssetKind || !linkedinKinds.has(item.linkedinAssetKind)
    )) {
      return "Choose a valid LinkedIn asset kind.";
    }
    if (item.altText.length > 300) return "Alt text must not exceed 300 characters.";
    if (item.usage.length > 500) return "Caption must not exceed 500 characters.";
    if (item.credit.length > 200) return "Credit must not exceed 200 characters.";

    if (item.collection === "linkedin") {
      const values = item.campaignFields ?? EMPTY_CAMPAIGN;
      for (const field of CAMPAIGN_FIELDS) {
        if ((values[field.key] ?? "").length > field.maxLength) {
          return `${field.label} must not exceed ${field.maxLength} characters.`;
        }
      }
    }

    if (item.collection === "motion") {
      const fields = item.motionFields ?? EMPTY_MOTION;
      if (!fields.groupId?.trim()) return "Asset group is required for motion uploads.";
      if (!item.motionVariant || !motionVariants.has(item.motionVariant)) {
        return "Choose a valid motion variant.";
      }
      for (const field of MOTION_FIELDS) {
        if ((fields[field.key] ?? "").length > field.maxLength) {
          return `${field.label} must not exceed ${field.maxLength} characters.`;
        }
      }
    }
    return undefined;
  }

  private remoteIsCompleted(
    item: QueueItem,
    remote: Awaited<ReturnType<QueueEngineDependencies["get"]>>,
  ): boolean {
    return Boolean(
      remote.status
      && finalizedMediaStatuses.has(remote.status)
      && (!remote.id || remote.id === item.mediaId)
      && remote.checksum === item.originalSha256
      && remote.size === item.size,
    );
  }

  private requestBody(item: QueueItem): Record<string, unknown> {
    return {
      filename: item.filename,
      mimeType: item.mimeType,
      size: item.size,
      checksum: item.originalSha256,
      collection: item.collection,
      linkedinAssetKind: item.collection === "linkedin" ? item.linkedinAssetKind : undefined,
      campaignMetadata: item.collection === "linkedin"
        ? cleanCampaignMetadata(item.campaignFields ?? { ...EMPTY_CAMPAIGN })
        : undefined,
      motionMetadata: item.collection === "motion"
        ? buildMotionMetadata(item.motionFields ?? { ...EMPTY_MOTION }, item.motionVariant ?? "landscape", item.motionFlags!)
        : undefined,
    };
  }

  private finalizeBody(item: QueueItem): Record<string, unknown> {
    return {
      objectPath: item.objectPath,
      checksum: item.originalSha256,
      altText: item.altText || undefined,
      caption: item.usage || undefined,
      credit: item.credit || undefined,
      collection: item.collection,
      linkedinAssetKind: item.collection === "linkedin" ? item.linkedinAssetKind : undefined,
      campaignMetadata: item.collection === "linkedin"
        ? cleanCampaignMetadata(item.campaignFields ?? { ...EMPTY_CAMPAIGN })
        : undefined,
      motionMetadata: item.collection === "motion"
        ? buildMotionMetadata(item.motionFields ?? { ...EMPTY_MOTION }, item.motionVariant ?? "landscape", item.motionFlags!)
        : undefined,
    };
  }

  private async runItem(id: string): Promise<void> {
    try {
      let item = this.queue.find((candidate) => candidate.id === id)!;
      let upload: Omit<UploadResponse, "media"> | undefined;
      if (!item.mediaId) {
        const response = await this.options.dependencies.request(this.requestBody(item), item.id);
        item = this.mutate(id, {
          mediaId: response.media.id,
          objectPath: response.media.objectPath,
        })!;
        upload = response;
      } else if (!item.putCompleted) {
        // The PUT may have succeeded immediately before durable putCompleted storage failed.
        // A finalized matching asset is authoritative and must never be PUT again.
        try {
          const remote = await this.options.dependencies.get(item.mediaId);
          if (this.remoteIsCompleted(item, remote)) {
            const completed = this.mutate(id, {
              status: "completed",
              progress: 100,
              putCompleted: true,
              error: undefined,
            })!;
            await this.options.onCompleted?.(completed);
            return;
          }
        } catch {
          // Pending/unavailable lookup: renew the upload URL and continue normally.
        }
        upload = await this.options.dependencies.renew(item.mediaId);
      }

      if (!item.putCompleted) {
        if (!item.file || !upload) throw new Error("The original file is required to resume this upload.");
        this.mutate(id, { status: "uploading", progress: 0 });
        try {
          await this.options.dependencies.put(
            upload.uploadUrl, upload.method, upload.headers, item.file,
            (progress) => this.mutate(id, { progress }),
          );
        } catch {
          // A URL can expire between issuance and PUT. Renew once; retries later also renew.
          upload = await this.options.dependencies.renew(item.mediaId!);
          await this.options.dependencies.put(
            upload.uploadUrl, upload.method, upload.headers, item.file,
            (progress) => this.mutate(id, { progress }),
          );
        }
        item = this.mutate(id, { putCompleted: true, progress: 100 })!;
      }

      this.mutate(id, { status: "finalizing", progress: 100 });
      item = this.queue.find((candidate) => candidate.id === id)!;
      await this.options.dependencies.finalize(item.mediaId!, this.finalizeBody(item));
      const completed = this.mutate(id, { status: "completed", progress: 100, error: undefined })!;
      await this.options.onCompleted?.(completed);
    } catch (error) {
      const current = this.queue.find((candidate) => candidate.id === id);
      if (current?.status === "finalizing" && current.mediaId && current.originalSha256) {
        try {
          const remote = await this.options.dependencies.get(current.mediaId);
          if (this.remoteIsCompleted(current, remote)) {
            const completed = this.mutate(id, { status: "completed", progress: 100, error: undefined })!;
            await this.options.onCompleted?.(completed);
            return;
          }
        } catch {
          // Preserve the original failure below.
        }
      }
      const message = errorMessage(error);
      const failed = this.mutate(id, { status: "error", error: message });
      this.options.onError?.(failed, message);
    }
  }
}