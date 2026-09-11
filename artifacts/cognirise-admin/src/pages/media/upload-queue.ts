import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  finalizeMediaUpload,
  getListMediaQueryKey,
  getMedia,
  renewMediaUpload,
  requestMediaUpload,
  useGetSession,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import type {
  LinkedInAssetKind,
  MediaCollection,
  MotionTextField,
  MotionVariant,
} from "./MediaLibrary";
import {
  UploadQueueEngine,
  type QueueEngineDependencies,
  type QueueItem,
} from "./upload-queue-engine";

export type { QueueItem, QueueItemStatus } from "./upload-queue-engine";

export async function computeSha256(file: File): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function uploadWithXHR(
  url: string,
  method: string,
  headers: Record<string, string>,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

const getSessionKey = (userId: string) => `media-upload-queue-${userId}`;

type QueueState = {
  owner?: string;
  queue: QueueItem[];
  persistenceError?: string;
  busy: boolean;
};

export function useBatchUpload() {
  const { data: session } = useGetSession();
  const userId = session?.user?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const engineRef = useRef<{ userId: string; engine: UploadQueueEngine } | undefined>(undefined);
  const [state, setState] = useState<QueueState>({ queue: [], busy: false });

  useEffect(() => {
    engineRef.current = undefined;
    setState({ owner: userId, queue: [], busy: false });
    if (!userId) return;

    let active = true;
    const assertActiveOwner = () => {
      if (!active) throw new Error("The signed-in user changed or the Media Library was closed. Reopen this user's queue to resume.");
    };
    const dependencies: QueueEngineDependencies = {
      request: async (body, idempotencyKey) => {
        assertActiveOwner();
        const response = await requestMediaUpload(
          body as unknown as Parameters<typeof requestMediaUpload>[0],
          { headers: { "Idempotency-Key": idempotencyKey } },
        );
        return {
          media: { id: response.media.id, objectPath: response.media.objectPath },
          uploadUrl: response.uploadUrl,
          method: response.method,
          headers: response.headers,
        };
      },
      renew: async (mediaId) => {
        assertActiveOwner();
        const response = await renewMediaUpload(mediaId);
        return {
          uploadUrl: response.uploadUrl,
          method: response.method,
          headers: response.headers,
        };
      },
      put: (...args) => {
        assertActiveOwner();
        return uploadWithXHR(...args);
      },
      finalize: (mediaId, body) => {
        assertActiveOwner();
        return finalizeMediaUpload(mediaId, body as unknown as Parameters<typeof finalizeMediaUpload>[1]);
      },
      get: (mediaId) => {
        assertActiveOwner();
        return getMedia(mediaId);
      },
      sha256: computeSha256,
      makeId: () => crypto.randomUUID(),
    };

    const engine = new UploadQueueEngine({
      dependencies,
      storage: sessionStorage,
      storageKey: getSessionKey(userId),
      onChange: (queue, persistenceError) => {
        if (active) setState({ owner: userId, queue, persistenceError, busy: engine.isBusy() });
      },
      onError: (item, message) => {
        if (!active) return;
        toast({
          title: item ? `Upload failed: ${item.filename}` : "Upload queue error",
          description: message,
          variant: "destructive",
        });
      },
      onCompleted: async () => {
        if (active) await queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
      },
    });
    engineRef.current = { userId, engine };
    // The constructor emits before engineRef can be assigned.
    setState({
      owner: userId,
      queue: engine.getQueue(),
      persistenceError: engine.getPersistenceError(),
      busy: engine.isBusy(),
    });
    return () => {
      active = false;
      if (engineRef.current?.engine === engine) engineRef.current = undefined;
    };
  }, [queryClient, toast, userId]);

  const currentEngine = useCallback(() => {
    const current = engineRef.current;
    if (!current || current.userId !== userId) return undefined;
    return current.engine;
  }, [userId]);

  const addFiles = useCallback((
    files: File[],
    collection: MediaCollection,
    linkedinKind?: LinkedInAssetKind,
    motionFields?: Record<MotionTextField, string>,
    motionVariant?: MotionVariant,
    motionFlags?: { autoplay: boolean; loop: boolean; decorative: boolean; hasAudio: boolean },
  ) => currentEngine()?.addFiles(
    files, collection, linkedinKind, motionFields, motionVariant, motionFlags,
  ) ?? Promise.resolve(), [currentEngine]);

  const removeItem = useCallback((id: string) => currentEngine()?.removeItem(id), [currentEngine]);
  const updateItem = useCallback(
    (id: string, updates: Partial<QueueItem>) => currentEngine()?.updateItem(id, updates),
    [currentEngine],
  );
  const processItem = useCallback(
    (id: string) => currentEngine()?.processItem(id) ?? Promise.resolve(),
    [currentEngine],
  );
  const processAll = useCallback(
    () => currentEngine()?.processAll() ?? Promise.resolve(),
    [currentEngine],
  );
  const reattachFile = useCallback(
    (id: string, file: File) => currentEngine()?.reattachFile(id, file) ?? Promise.resolve(false),
    [currentEngine],
  );

  return {
    queue: state.owner === userId ? state.queue : [],
    addFiles,
    removeItem,
    updateItem,
    processItem,
    processAll,
    reattachFile,
    persistenceError: state.owner === userId ? state.persistenceError : undefined,
    busy: state.owner === userId && state.busy,
  };
}