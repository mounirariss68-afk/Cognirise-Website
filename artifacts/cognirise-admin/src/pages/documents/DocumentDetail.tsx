import { useState, useRef, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  useGetDocument, 
  useUpdateDocument,
  useSubmitDocument,
  usePublishDocument,
  useArchiveDocument,
  useListDocumentRevisions,
  useRollbackDocument,
  usePreviewDocument,
  useGetSession,
  getGetDocumentQueryKey,
  getPreviewDocumentQueryKey,
  getListDocumentRevisionsQueryKey,
  DocumentStatus,
  SeoMetadataInput
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, Globe, Archive, ChevronLeft, CheckCircle2, AlertTriangle, Eye, RotateCcw, Save, GitCompare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

export default function DocumentDetail() {
  const [, params] = useRoute("/content/:id");
  const id = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: session } = useGetSession();
  const isPublisherOrAdmin = session?.user?.role === "publisher" || session?.user?.role === "administrator";

  const { data: doc, isLoading } = useGetDocument(id!, { query: { enabled: !!id, queryKey: getGetDocumentQueryKey(id!) } });
  
  const updateDoc = useUpdateDocument();
  const submitDoc = useSubmitDocument();
  const publishDoc = usePublishDocument();
  const archiveDoc = useArchiveDocument();
  const rollbackDoc = useRollbackDocument();

  // Load preview info explicitly if authenticated & needed
  const { data: previewData } = usePreviewDocument(id!, { query: { enabled: !!id, queryKey: getPreviewDocumentQueryKey(id!) } });

  // Revisions data
  const { data: revisionsData } = useListDocumentRevisions(id!, { query: { enabled: !!id, queryKey: getListDocumentRevisionsQueryKey(id!) } });

  // Local state for editor fields
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [contentJson, setContentJson] = useState("");
  const [seo, setSeo] = useState<SeoMetadataInput>({ title: "", description: "", canonicalUrl: "", noIndex: false });
  
  const initialized = useRef(false);
  const lastSaved = useRef({ title: "", summary: "", contentJson: "", seo: {} as any });

  const [hasUnsaved, setHasUnsaved] = useState(false);
  
  // Dialog states
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishRevisionId, setPublishRevisionId] = useState<string | null>(null);

  // Comparison states
  const [selectedRevs, setSelectedRevs] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  useEffect(() => {
    if (doc && !initialized.current) {
      setTitle(doc.title);
      setSummary(doc.summary || "");
      const formattedContent = JSON.stringify(doc.content || {}, null, 2);
      setContentJson(formattedContent);
      const formattedSeo = doc.seo ? {
        title: doc.seo.title || "",
        description: doc.seo.description || "",
        canonicalUrl: doc.seo.canonicalUrl || "",
        noIndex: doc.seo.noIndex || false
      } : { title: "", description: "", canonicalUrl: "", noIndex: false };
      
      setSeo(formattedSeo);
      
      lastSaved.current = { title: doc.title, summary: doc.summary || "", contentJson: formattedContent, seo: formattedSeo };
      initialized.current = true;
    }
  }, [doc]);

  // Check for unsaved changes against lastSaved ref
  useEffect(() => {
    if (!initialized.current) return;
    const isDirty = title !== lastSaved.current.title || 
                    summary !== lastSaved.current.summary || 
                    contentJson !== lastSaved.current.contentJson ||
                    JSON.stringify(seo) !== JSON.stringify(lastSaved.current.seo);
    setHasUnsaved(isDirty);
  }, [title, summary, contentJson, seo]);

  // Before unload protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsaved]);

  const isJsonValid = useMemo(() => {
    try {
      JSON.parse(contentJson);
      return true;
    } catch(e) {
      return false;
    }
  }, [contentJson]);

  const handleSave = () => {
    if (!doc) return;
    
    let parsedContent = {};
    try {
      parsedContent = JSON.parse(contentJson);
    } catch (e) {
      toast({ title: "Invalid JSON", description: "Please fix JSON errors before saving", variant: "destructive" });
      return;
    }

    updateDoc.mutate({
      documentId: id!,
      data: {
        title,
        summary: summary || null,
        content: parsedContent,
        seo,
        revisionNumber: doc.revisionNumber
      }
    }, {
      onSuccess: (updated) => {
        lastSaved.current = { title, summary, contentJson, seo };
        setHasUnsaved(false);
        // Patch cache locally to avoid full refetch triggering save loops
        queryClient.setQueryData(getGetDocumentQueryKey(id!), (old: any) => old ? { ...old, ...updated } : old);
        toast({ title: "Saved successfully" });
      },
      onError: (err) => {
        toast({ title: "Save failed", description: (err as any).error, variant: "destructive" });
      }
    });
  };

  const handleSeoChange = (field: keyof SeoMetadataInput, value: any) => {
    setSeo(prev => ({ ...prev, [field]: value }));
  };

  if (!id) return null;

  if (isLoading || !doc) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getStatusColor = (s: DocumentStatus) => {
    switch (s) {
      case "published": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "draft": return "bg-muted text-muted-foreground border-border";
      case "in-review": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "scheduled": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const handleAction = (action: "submit" | "publish" | "archive") => {
    const opts = {
      onSuccess: (updated: any) => {
        queryClient.setQueryData(getGetDocumentQueryKey(id!), updated);
        toast({ title: `Document ${action}ed successfully` });
        if (action === "publish") setPublishOpen(false);
      },
      onError: (err: any) => toast({ title: "Action failed", description: err.error, variant: "destructive" })
    };

    if (action === "submit") submitDoc.mutate({ documentId: id!, data: {} }, opts);
    if (action === "archive") archiveDoc.mutate({ documentId: id!, data: {} }, opts);
    if (action === "publish" && publishRevisionId) {
      publishDoc.mutate({ documentId: id!, data: { revisionId: publishRevisionId } }, opts);
    }
  };

  const handleRollback = (revisionId: string) => {
    rollbackDoc.mutate({ documentId: id!, data: { revisionId } }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetDocumentQueryKey(id!), updated);
        toast({ title: "Rollback successful" });
        initialized.current = false; // Force form re-init from new data
      },
      onError: (err: any) => toast({ title: "Rollback failed", description: err.error, variant: "destructive" })
    });
  };

  const handleRevCheckbox = (checked: boolean, revId: string) => {
    if (checked) {
      if (selectedRevs.length >= 2) {
        setSelectedRevs([selectedRevs[1], revId]);
      } else {
        setSelectedRevs([...selectedRevs, revId]);
      }
    } else {
      setSelectedRevs(selectedRevs.filter(r => r !== revId));
    }
  };

  // Find the latest revision ID for the publish dialog default
  const latestRevId = revisionsData?.items[0]?.id;
  
  // Data for comparison
  const compareRev1 = revisionsData?.items.find(r => r.id === selectedRevs[0]);
  const compareRev2 = revisionsData?.items.find(r => r.id === selectedRevs[1]);
  const [baseRev, targetRev] = [compareRev1, compareRev2].sort((a, b) => (a?.number || 0) - (b?.number || 0));

  return (
    <div className="flex flex-col h-full bg-muted/10">
      {/* Top Bar */}
      <header className="flex-none h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/${doc.kind}s`)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="h-4 w-px bg-border"></div>
          <div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider rounded-sm ${getStatusColor(doc.status)}`}>
                {doc.status.replace('-', ' ')}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">Rev {doc.revisionNumber}</span>
              
              {hasUnsaved && (
                <span className="font-mono text-[10px] text-amber-500 flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Unsaved changes</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {previewData?.previewUrl && (
            <Button variant="outline" size="sm" onClick={() => window.open(previewData.previewUrl, "_blank")} className="font-mono uppercase tracking-wider text-xs mr-2">
              <Eye className="w-3.5 h-3.5 mr-2" /> Live Preview
            </Button>
          )}

          <Button 
            onClick={handleSave} 
            disabled={updateDoc.isPending || !hasUnsaved || !isJsonValid} 
            size="sm" 
            variant="default" 
            className="font-mono uppercase tracking-wider text-xs"
          >
            {updateDoc.isPending ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin"/> : <Save className="w-3.5 h-3.5 mr-2" />}
            Save Draft
          </Button>

          {doc.status === "draft" && (
            <Button variant="outline" size="sm" onClick={() => handleAction("submit")} disabled={submitDoc.isPending || hasUnsaved || !isJsonValid} className="font-mono uppercase tracking-wider text-xs">
              <Send className="w-3.5 h-3.5 mr-2" /> Submit Review
            </Button>
          )}
          {isPublisherOrAdmin && ["approved", "in-review", "draft"].includes(doc.status) && (
            <Button size="sm" onClick={() => { setPublishRevisionId(latestRevId || null); setPublishOpen(true); }} disabled={hasUnsaved || !isJsonValid} className="font-mono uppercase tracking-wider text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              <Globe className="w-3.5 h-3.5 mr-2" /> Publish...
            </Button>
          )}
          {isPublisherOrAdmin && (
            doc.status !== "archived" ? (
               <Button variant="ghost" size="sm" onClick={() => handleAction("archive")} className="text-muted-foreground hover:text-destructive" title="Archive Document">
                 <Archive className="w-4 h-4" />
               </Button>
            ) : (
               <span className="font-mono text-xs text-muted-foreground ml-2">Archived Document</span>
            )
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Column: Editor */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar border-r border-border">
          <div className="max-w-3xl mx-auto space-y-8">
            <div>
              <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Display Title</label>
              <Input 
                value={title}
                onChange={(e) => { setTitle(e.target.value); }}
                className="text-3xl font-bold tracking-tight h-auto py-3 px-4 bg-background border-border/50 focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
              />
            </div>
            
            <div>
              <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Summary / Deck</label>
              <Textarea 
                value={summary}
                onChange={(e) => { setSummary(e.target.value); }}
                className="text-lg leading-relaxed min-h-[100px] resize-y bg-background border-border/50 focus-visible:ring-1 focus-visible:ring-primary shadow-sm"
                placeholder="Brief summary appearing in cards and lists..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Structured JSON Content</label>
                {!isJsonValid && <span className="font-mono text-[10px] text-destructive flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Invalid JSON</span>}
              </div>
              <Textarea 
                value={contentJson}
                onChange={(e) => setContentJson(e.target.value)}
                className={`font-mono text-sm leading-relaxed min-h-[400px] resize-y bg-background focus-visible:ring-1 shadow-sm ${!isJsonValid ? 'border-destructive focus-visible:ring-destructive' : 'border-border/50 focus-visible:ring-primary'}`}
                placeholder="{}"
              />
              <p className="font-mono text-[10px] text-muted-foreground mt-2">
                Directly edit the document payload. Structure must adhere to the {doc.kind} schema constraints.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Metadata & Sidepanes */}
        <div className="w-[320px] bg-card flex flex-col h-full border-l border-border">
          <Tabs defaultValue="metadata" className="flex flex-col h-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent p-0 h-12">
              <TabsTrigger value="metadata" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full font-mono text-[10px] uppercase tracking-wider px-3">Metadata</TabsTrigger>
              <TabsTrigger value="seo" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full font-mono text-[10px] uppercase tracking-wider px-3">SEO</TabsTrigger>
              <TabsTrigger value="revisions" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-full font-mono text-[10px] uppercase tracking-wider px-3">Revisions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="metadata" className="flex-1 overflow-y-auto p-4 space-y-6 mt-0">
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">URL Slug</label>
                <div className="font-mono text-sm text-foreground bg-muted/30 p-2 rounded border border-border/50 break-all">{doc.slug}</div>
              </div>
              
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Market Targeting</label>
                <div className="flex flex-wrap gap-2">
                  {doc.markets.map(m => (
                    <Badge key={m} variant="secondary" className="font-mono text-[10px] uppercase rounded-sm bg-accent/10 text-accent border border-accent/20">
                      {m}
                    </Badge>
                  ))}
                </div>
                <p className="font-mono text-[10px] text-muted-foreground mt-2 leading-relaxed opacity-80">
                  Visible in explicit markets. Unselected markets will inherit the <strong>uae</strong> global base fallback automatically unless overridden.
                </p>
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Timeline</label>
                <div className="space-y-2 text-[11px] font-mono border border-border/50 rounded p-3 bg-muted/10">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{format(new Date(doc.createdAt), "dd MMM yy HH:mm")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updated</span>
                    <span>{format(new Date(doc.updatedAt), "dd MMM yy HH:mm")}</span>
                  </div>
                  {doc.publishedAt && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Published</span>
                      <span>{format(new Date(doc.publishedAt), "dd MMM yy HH:mm")}</span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="seo" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">SEO Title</Label>
                <Input 
                  value={seo.title} 
                  onChange={(e) => handleSeoChange("title", e.target.value)}
                  placeholder="Defaults to display title"
                  className="font-mono text-xs"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">SEO Description</Label>
                <Textarea 
                  value={seo.description} 
                  onChange={(e) => handleSeoChange("description", e.target.value)}
                  placeholder="Meta description for search engines..."
                  className="font-mono text-xs resize-none min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Canonical URL</Label>
                <Input 
                  value={seo.canonicalUrl || ""} 
                  onChange={(e) => handleSeoChange("canonicalUrl", e.target.value)}
                  placeholder="https://..."
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Switch 
                  checked={seo.noIndex}
                  onCheckedChange={(c) => handleSeoChange("noIndex", c)}
                  id="noIndex"
                />
                <Label htmlFor="noIndex" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">No Index (Hide from Search)</Label>
              </div>
            </TabsContent>

            <TabsContent value="revisions" className="flex-1 overflow-y-auto p-0 mt-0 flex flex-col">
               <div className="p-3 bg-muted/20 border-b border-border sticky top-0 z-10 flex justify-between items-center">
                 <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Select 2 to Compare</span>
                 <Button 
                   size="sm" 
                   variant="outline" 
                   disabled={selectedRevs.length !== 2}
                   onClick={() => setCompareModalOpen(true)}
                   className="h-7 text-[10px] uppercase tracking-wider font-mono px-2"
                 >
                   <GitCompare className="w-3 h-3 mr-1" /> Compare
                 </Button>
               </div>
               {revisionsData?.items.map(rev => (
                 <div key={rev.id} className="p-4 border-b border-border/50 hover:bg-muted/30 transition-colors group flex gap-3">
                    <Checkbox 
                      checked={selectedRevs.includes(rev.id)}
                      onCheckedChange={(c) => handleRevCheckbox(!!c, rev.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-mono text-xs font-semibold">Revision {rev.number}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{format(new Date(rev.createdAt), "MMM d HH:mm")}</span>
                      </div>
                      {rev.note && <p className="text-[10px] text-muted-foreground font-mono mb-2">{rev.note}</p>}
                      
                      <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isPublisherOrAdmin && doc.revisionNumber !== rev.number && (
                          <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 font-mono uppercase tracking-wider" onClick={() => handleRollback(rev.id)}>
                             <RotateCcw className="w-3 h-3 mr-1" /> Rollback
                          </Button>
                        )}
                      </div>
                    </div>
                 </div>
               ))}
               {!revisionsData?.items.length && (
                 <div className="p-4 text-center text-xs font-mono text-muted-foreground">No revisions saved yet.</div>
               )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Content</DialogTitle>
            <DialogDescription className="font-mono text-xs mt-2">
              Select the exact revision you want to make live across {doc.markets.join(", ")}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="space-y-2">
               <Label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Target Revision</Label>
               <select 
                  className="w-full font-mono text-sm p-2 bg-background border border-border rounded-md focus-visible:ring-1 focus-visible:ring-primary outline-none"
                  value={publishRevisionId || ""}
                  onChange={(e) => setPublishRevisionId(e.target.value)}
               >
                 <option value="" disabled>Select a revision...</option>
                 {revisionsData?.items.map(rev => (
                   <option key={rev.id} value={rev.id}>
                     Revision {rev.number} ({format(new Date(rev.createdAt), "MMM d, HH:mm")})
                   </option>
                 ))}
               </select>
             </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => handleAction("publish")} 
              disabled={publishDoc.isPending || !publishRevisionId} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono uppercase tracking-wider text-xs"
            >
              {publishDoc.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle2 className="w-4 h-4 mr-2"/>}
              Confirm Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={compareModalOpen} onOpenChange={setCompareModalOpen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border flex-none">
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-primary" />
              Compare Revisions
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Comparing Revision {baseRev?.number} (Base) with Revision {targetRev?.number} (Target)
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex bg-muted/10">
            {/* Left: Base Rev */}
            <div className="flex-1 overflow-y-auto border-r border-border p-6 space-y-6 custom-scrollbar">
               <div>
                  <Badge variant="outline" className="mb-4 font-mono text-[10px] uppercase tracking-wider bg-background">
                    Revision {baseRev?.number}
                  </Badge>
                  <div className="space-y-4">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Title</div>
                      <div className="font-medium">{baseRev?.snapshot.title}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Summary</div>
                      <div className="text-sm">{baseRev?.snapshot.summary || <span className="text-muted-foreground italic">None</span>}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">JSON Content</div>
                      <pre className="text-xs font-mono bg-muted/30 p-4 rounded-md border border-border overflow-x-auto">
                        {JSON.stringify(baseRev?.snapshot.content, null, 2)}
                      </pre>
                    </div>
                  </div>
               </div>
            </div>

            {/* Right: Target Rev */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
               <div>
                  <Badge variant="outline" className="mb-4 font-mono text-[10px] uppercase tracking-wider bg-background border-primary text-primary">
                    Revision {targetRev?.number}
                  </Badge>
                  <div className="space-y-4">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Title</div>
                      <div className={`font-medium ${baseRev?.snapshot.title !== targetRev?.snapshot.title ? 'bg-emerald-500/10 text-emerald-600 px-1 -mx-1 rounded' : ''}`}>
                        {targetRev?.snapshot.title}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Summary</div>
                      <div className={`text-sm ${baseRev?.snapshot.summary !== targetRev?.snapshot.summary ? 'bg-emerald-500/10 text-emerald-600 px-1 -mx-1 rounded' : ''}`}>
                        {targetRev?.snapshot.summary || <span className="text-muted-foreground italic">None</span>}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">JSON Content</div>
                      <pre className="text-xs font-mono bg-muted/30 p-4 rounded-md border border-border overflow-x-auto">
                        {JSON.stringify(targetRev?.snapshot.content, null, 2)}
                      </pre>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}