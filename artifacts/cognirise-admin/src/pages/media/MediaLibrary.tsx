import { useState, useRef } from "react";
import { 
  useListMedia, 
  getListMediaQueryKey, 
  useRequestMediaUpload,
  useFinalizeMediaUpload
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, UploadCloud, FileImage, LayoutGrid, List } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function MediaLibrary() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid"|"list">("grid");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Finalization state
  const [finalizeAsset, setFinalizeAsset] = useState<any>(null); // from requestMediaUpload
  const [altText, setAltText] = useState("");
  const [credit, setCredit] = useState("");

  const requestUpload = useRequestMediaUpload();
  const finalizeUpload = useFinalizeMediaUpload();

  const { data, isLoading } = useListMedia({
    page,
    pageSize: 40,
    search: search || undefined
  }, { query: { queryKey: getListMediaQueryKey({ page, pageSize: 40, search: search || undefined }) } });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 50MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // 1. Request upload URL
      const reqRes = await requestUpload.mutateAsync({
        data: {
          filename: file.name,
          mimeType: file.type,
          size: file.size
        }
      });

      setUploadProgress(40);

      // 2. Direct PUT to GCS
      const putRes = await fetch(reqRes.uploadUrl, {
        method: reqRes.method,
        headers: reqRes.headers,
        body: file
      });

      if (!putRes.ok) {
        throw new Error("Failed to upload to storage");
      }

      setUploadProgress(80);

      // 3. Prompt for finalization metadata
      setFinalizeAsset(reqRes.media);
      setAltText("");
      setCredit("");

    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message || "An error occurred during upload", variant: "destructive" });
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
          credit: credit || undefined
        }
      });

      toast({ title: "Asset finalized successfully" });
      setFinalizeAsset(null);
      await queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ page, pageSize: 40, search: search || undefined }) });
    } catch (err: any) {
      toast({ title: "Finalization failed", description: err.error || "An error occurred", variant: "destructive" });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Media Library</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Managed assets and imagery</p>
        </div>
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp,image/avif,application/pdf" 
          />
          <Button 
            className="gap-2 font-mono uppercase tracking-wider text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {isUploading ? `Uploading... ${uploadProgress}%` : "Upload Asset"}
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search by filename or alt text..." 
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 bg-background border border-border rounded-md p-1">
            <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" className="h-7 w-7 rounded-sm" onClick={() => setView("grid")}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" className="h-7 w-7 rounded-sm" onClick={() => setView("list")}>
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : data?.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <FileImage className="w-12 h-12 opacity-20" />
              <p className="font-mono text-sm">No media assets found.</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {data?.items.map(asset => (
                <div key={asset.id} className="group relative rounded-lg border border-border bg-background overflow-hidden hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {asset.publicUrl ? (
                      <img src={asset.publicUrl} alt={asset.altText || asset.filename} className="w-full h-full object-cover" />
                    ) : (
                      <FileImage className="w-8 h-8 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="p-3 bg-card border-t border-border">
                    <p className="text-xs font-medium truncate" title={asset.filename}>{asset.filename}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">{(asset.size / 1024).toFixed(1)} KB • {asset.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-border bg-background overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Preview</th>
                    <th className="px-4 py-3 font-medium">Filename</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.items.map(asset => (
                    <tr key={asset.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 w-16">
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center overflow-hidden border border-border">
                          {asset.publicUrl ? (
                            <img src={asset.publicUrl} alt={asset.altText || asset.filename} className="w-full h-full object-cover" />
                          ) : (
                            <FileImage className="w-4 h-4 text-muted-foreground/50" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 font-medium">{asset.filename}</td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{(asset.size / 1024).toFixed(1)} KB</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${
                          asset.status === 'ready' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
                        {format(new Date(asset.createdAt), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!finalizeAsset} onOpenChange={(open) => !open && setFinalizeAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asset Metadata</DialogTitle>
            <DialogDescription className="font-mono text-xs mt-1">
              Add alt text for accessibility and any required usage credits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Alt Text</Label>
              <Textarea 
                value={altText} 
                onChange={(e) => setAltText(e.target.value)} 
                placeholder="Describe the image for screen readers"
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Credit / Rights</Label>
              <Input 
                value={credit} 
                onChange={(e) => setCredit(e.target.value)} 
                placeholder="e.g. Getty Images, Internal"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFinalizeAsset(null)}>Skip for now</Button>
            <Button onClick={handleFinalize} disabled={finalizeUpload.isPending}>
              {finalizeUpload.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Metadata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
