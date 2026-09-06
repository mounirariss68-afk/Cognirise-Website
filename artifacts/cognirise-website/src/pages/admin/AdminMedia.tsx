import React, { useState, useEffect } from "react";
import { getListCmsAdminMediaQueryKey, previewCmsAdminMediaVersion, useListCmsAdminMedia, useCreateCmsMediaUploadIntent, useFinalizeCmsMediaUpload, useUpdateCmsAdminMedia, useArchiveCmsAdminMedia } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Loader2, Search, Upload, Image as ImageIcon, FileText, CheckCircle2, ShieldAlert, X, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

function UploadModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const createIntent = useCreateCmsMediaUploadIntent();
  const finalizeUpload = useFinalizeCmsMediaUpload();
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!file || !title) return;
    setUploading(true);
    setProgress(10);
    
    try {
      const intentResult = await createIntent.mutateAsync({
        data: {
          title,
          altText,
          decorative: !altText,
          contentType: file.type as any,
          size: file.size
        }
      });
      
      setProgress(40);

      const xhr = new XMLHttpRequest();
      await new Promise((resolve, reject) => {
        xhr.open("PUT", intentResult.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(40 + (e.loaded / e.total) * 40);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
          else reject(new Error(`Upload failed: ${xhr.statusText}`));
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });
      
      setProgress(90);

      await finalizeUpload.mutateAsync({
        data: {
          mediaId: intentResult.mediaId,
          objectPath: intentResult.objectPath
        }
      });
      
      setProgress(100);
      toast({ title: "Upload complete", description: "Media asset has been saved and is pending processing." });
      
       queryClient.invalidateQueries({ queryKey: getListCmsAdminMediaQueryKey() });
      onOpenChange(false);
      
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setProgress(0);
      setFile(null);
      setTitle("");
      setAltText("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0A101C] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Media Asset</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">File</label>
            <input 
              type="file" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={uploading}
              className="w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-colors cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Title</label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
              className="w-full bg-black/20 border border-white/10 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-[hsl(var(--brand-violet))] focus:ring-1 focus:ring-[hsl(var(--brand-violet))]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Alt Text (Optional)</label>
            <input 
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              disabled={uploading}
              placeholder="Leave blank if decorative"
              className="w-full bg-black/20 border border-white/10 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-[hsl(var(--brand-violet))] focus:ring-1 focus:ring-[hsl(var(--brand-violet))]"
            />
          </div>
          
          {uploading && (
            <div className="pt-2">
              <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>Uploading...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-[hsl(var(--brand-violet))] transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button 
              onClick={() => onOpenChange(false)}
              disabled={uploading}
              className="px-4 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpload}
              disabled={!file || !title || uploading}
              className="px-4 py-2 bg-[hsl(var(--brand-violet))] hover:bg-[hsl(var(--brand-violet))/90] text-white rounded text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              Upload Asset
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditModal({ asset, open, onOpenChange }: { asset: any, open: boolean, onOpenChange: (o: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [lifecycleState, setLifecycleState] = useState<any>("draft");
  const updateMedia = useUpdateCmsAdminMedia();
  const { toast } = useToast();

  useEffect(() => {
    if (asset && open) {
      setTitle(asset.title || "");
      setAltText(asset.altText || "");
      setLifecycleState(asset.lifecycleState || "draft");
    }
  }, [asset, open]);

  const handleUpdate = () => {
    updateMedia.mutate({
      mediaId: asset.id,
      data: {
        title,
        altText,
        decorative: !altText,
        lifecycleState
      }
    }, {
      onSuccess: () => {
        toast({ title: "Asset updated", description: "Metadata saved successfully." });
        queryClient.invalidateQueries({ queryKey: getListCmsAdminMediaQueryKey() });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({ title: "Update failed", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0A101C] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Media Asset</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Title</label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-[hsl(var(--brand-violet))] focus:ring-1 focus:ring-[hsl(var(--brand-violet))]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Alt Text</label>
            <input 
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Leave blank if decorative"
              className="w-full bg-black/20 border border-white/10 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-[hsl(var(--brand-violet))] focus:ring-1 focus:ring-[hsl(var(--brand-violet))]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Status</label>
            <select 
              value={lifecycleState}
              onChange={(e) => setLifecycleState(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-[hsl(var(--brand-violet))] focus:ring-1 focus:ring-[hsl(var(--brand-violet))]"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <button 
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpdate}
              disabled={!title || updateMedia.isPending}
              className="px-4 py-2 bg-[hsl(var(--brand-violet))] hover:bg-[hsl(var(--brand-violet))/90] text-white rounded text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {updateMedia.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AuthenticatedMediaPreview({ asset }: { asset: any }) {
  const [src, setSrc] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!asset.latestVersion?.previewUrl) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setFailed(false);
    setSrc(undefined);
    previewCmsAdminMediaVersion(asset.id, asset.latestVersion.version, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setFailed(true);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset.latestVersion?.previewUrl]);

  if (asset.kind === "image" && src) {
    return <img src={src} alt={asset.decorative ? "" : asset.altText || asset.title} className="h-full w-full object-contain" />;
  }
  if (asset.kind === "document" && src) {
    return (
      <a href={src} target="_blank" rel="noreferrer" className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/60 hover:text-white">
        <FileText className="h-8 w-8" />
        <span className="text-xs">Open PDF preview</span>
      </a>
    );
  }
  return asset.kind === "image"
    ? <ImageIcon className={`h-8 w-8 ${failed ? "text-red-400/60" : "text-white/20"}`} />
    : <FileText className={`h-8 w-8 ${failed ? "text-red-400/60" : "text-white/20"}`} />;
}

export default function AdminMedia() {
  const { data, isLoading, error } = useListCmsAdminMedia();
  const archiveMutation = useArchiveCmsAdminMedia();
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<any>(null);
  const media = data?.media || [];
  const { toast } = useToast();

  const filtered = media.filter(m => m.title.toLowerCase().includes(search.toLowerCase()));

  const handleArchive = (id: string) => {
    archiveMutation.mutate({ mediaId: id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCmsAdminMediaQueryKey() });
        toast({ title: "Asset archived", description: "The media asset has been archived." });
      },
      onError: (err: any) => {
        toast({ title: "Archive failed", description: err.message || "The asset could not be archived.", variant: "destructive" });
      },
    });
  };

  return (
    <div className="space-y-6 fade-in animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2 text-white">Media Library</h1>
          <p className="text-white/60">Manage governed imagery and document assets.</p>
        </div>
        
        <button 
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--brand-violet))] hover:bg-[hsl(var(--brand-violet))/90] text-white rounded font-medium text-sm transition-colors"
        >
          <Upload className="h-4 w-4" />
          Upload Asset
        </button>
      </div>

      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
      <EditModal asset={editAsset} open={!!editAsset} onOpenChange={(open) => !open && setEditAsset(null)} />

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input 
              type="text"
              placeholder="Search assets by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-md py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[hsl(var(--brand-violet))] focus:ring-1 focus:ring-[hsl(var(--brand-violet))] transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--brand-violet))]" />
          </div>
        ) : error ? (
          <div className="p-12 flex flex-col items-center justify-center text-red-400">
            <ShieldAlert className="h-8 w-8 mb-2 opacity-80" />
            <p>Failed to load media assets.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-white/50 flex flex-col items-center">
            <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
            <p>No media assets found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
            {filtered.map(asset => (
              <div key={asset.id} className="bg-black/20 border border-white/10 rounded-lg overflow-hidden group hover:border-white/30 transition-colors flex flex-col relative">
                <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditAsset(asset); }}
                    className="bg-black/60 hover:bg-white/20 text-white p-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-violet))]"
                    title="Edit asset"
                    aria-label="Edit asset"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleArchive(asset.id); }}
                    className="bg-black/60 hover:bg-red-500 text-white p-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-violet))]"
                    title="Archive asset"
                    aria-label="Archive asset"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                
                <div className="aspect-square bg-white/5 flex items-center justify-center relative overflow-hidden">
                  <AuthenticatedMediaPreview asset={asset} />
                  {asset.lifecycleState === "published" && (
                    <div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-0.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                  )}
                  {asset.lifecycleState === "pending" && (
                    <div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-0.5">
                      <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <div className="text-sm font-medium text-white truncate" title={asset.title}>{asset.title}</div>
                  {asset.latestVersion && <p className="mt-1 text-xs text-white/40">Version {asset.latestVersion.version}</p>}
                  <div className="text-xs text-white/40 mt-1 flex justify-between items-center">
                    <span className="capitalize">{asset.kind}</span>
                    <span>{format(new Date(asset.updatedAt), "MMM d")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
