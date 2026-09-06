import React, { useState } from "react";
import { useListCmsAdminDocuments, useCreateCmsAdminDocument, getListCmsAdminDocumentsQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Plus, Search, FileText, Loader2, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

function CreateDocumentModal({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const [canonicalSlug, setCanonicalSlug] = useState("");
  const [routeKind, setRouteKind] = useState("landing");
  const [title, setTitle] = useState("");
  const createDoc = useCreateCmsAdminDocument();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleCreate = () => {
    if (!canonicalSlug || !title) return;
    
    // Generate UUID, normalize to alphanumeric/dash/underscore
    const id = crypto.randomUUID().replace(/-/g, '');
    
    createDoc.mutate({
      data: {
          documentId: id,
          payload: {
          schemaVersion: 1,
            documentId: id,
          market: "uae",
          fallbackMode: "canonical",
            content: {
              kind: "page",
              title,
              routeKind,
              canonicalSlug,
              summary: "A governed UAE page draft.",
              topics: [],
              sections: [{
                id: `${id}-hero`,
                type: "hero",
                heading: title,
                body: [{
                  type: "block",
                  style: "normal",
                  children: [{ type: "span", text: "Draft content ready for editorial review.", marks: [] }],
                }],
              }],
              seo: {
                metaTitle: title,
                metaDescription: "A governed UAE page draft.",
                noIndex: false,
              },
              ownership: {
                owner: { id: "admin" },
                sensitivity: "public",
              },
          }
        }
      }
    }, {
      onSuccess: (res) => {
        toast({ title: "Document created", description: "Navigating to editor..." });
        queryClient.invalidateQueries({ queryKey: getListCmsAdminDocumentsQueryKey() });
        onOpenChange(false);
        setLocation(`/admin/content/${res.document.id}/uae`);
      },
      onError: (err: any) => {
        toast({ title: "Creation failed", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0A101C] border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Canonical Slug</label>
            <input 
              type="text"
              value={canonicalSlug}
              onChange={(e) => setCanonicalSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="e.g. my-new-page"
              className="w-full bg-black/20 border border-white/10 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-[hsl(var(--brand-pink))] focus:ring-1 focus:ring-[hsl(var(--brand-pink))]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Page Title</label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Display title"
              className="w-full bg-black/20 border border-white/10 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-[hsl(var(--brand-pink))] focus:ring-1 focus:ring-[hsl(var(--brand-pink))]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">Route Kind</label>
            <select 
              value={routeKind}
              onChange={(e) => setRouteKind(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-[hsl(var(--brand-pink))] focus:ring-1 focus:ring-[hsl(var(--brand-pink))]"
            >
              <option value="landing">Landing</option>
              <option value="service">Service</option>
              <option value="platform">Platform</option>
              <option value="industry">Industry</option>
              <option value="home">Home</option>
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
              onClick={handleCreate}
              disabled={!canonicalSlug || !title || createDoc.isPending}
              className="px-4 py-2 bg-[hsl(var(--brand-pink))] hover:bg-[hsl(var(--brand-pink))/90] text-white rounded text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {createDoc.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Document
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminContentList() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useListCmsAdminDocuments();
  
  const documents = data?.documents || [];
  const editions = data?.editions || [];
  
  const filtered = documents.filter(d => 
    d.kind.toLowerCase().includes(search.toLowerCase()) || 
    (d.canonicalSlug || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2 text-white">Governed Content</h1>
          <p className="text-white/60">Manage pages, publications, and structured data.</p>
        </div>
        
        <button 
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--brand-pink))] hover:bg-[hsl(var(--brand-pink))/90] text-white rounded font-medium text-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Document
        </button>
      </div>

      <CreateDocumentModal open={createOpen} onOpenChange={setCreateOpen} />

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input 
              type="text"
              placeholder="Search by slug or kind..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-md py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[hsl(var(--brand-pink))] focus:ring-1 focus:ring-[hsl(var(--brand-pink))] transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--brand-pink))]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-white/50 flex flex-col items-center">
            <FileText className="h-12 w-12 mb-4 opacity-20" />
            <p>No documents found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-black/20 text-white/60 font-medium">
                <tr>
                  <th className="px-6 py-3">Document</th>
                  <th className="px-6 py-3">Kind / Route</th>
                  <th className="px-6 py-3">Markets</th>
                  <th className="px-6 py-3">Last Updated</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(doc => {
                  const docEditions = editions.filter(e => e.documentId === doc.id);
                  return (
                    <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{doc.canonicalSlug || "Untitled"}</div>
                        <div className="text-xs text-white/40 font-mono mt-1">{doc.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80">
                          {doc.kind}
                        </span>
                        {doc.routeKind && (
                          <div className="text-xs text-white/50 mt-1">{doc.routeKind} route</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {docEditions.map(ed => {
                            const stateColors: Record<string, string> = {
                              draft: "text-white/50 border-white/10",
                              review: "text-[hsl(var(--brand-pink))] border-[hsl(var(--brand-pink))/20] bg-[hsl(var(--brand-pink))/10]",
                              approved: "text-[hsl(var(--brand-violet))] border-[hsl(var(--brand-violet))/20] bg-[hsl(var(--brand-violet))/10]",
                              published: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10",
                            };
                            const color = stateColors[ed.publicationState] || "text-white/50 border-white/10";
                            return (
                              <Link 
                                key={ed.id}
                                href={`/admin/content/${doc.id}/${ed.market}`}
                                className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${color} hover:opacity-80 transition-opacity`}
                                title={`Edit ${ed.market.toUpperCase()} edition`}
                              >
                                {ed.market}
                              </Link>
                            )
                          })}
                          {docEditions.length === 0 && <span className="text-xs text-white/30 italic">No editions</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white/60">
                        {format(new Date(doc.updatedAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/admin/content/${doc.id}/uae`} // default to UAE as primary
                          className="inline-flex items-center justify-center p-2 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]"
                          aria-label={`Edit ${doc.canonicalSlug || "document"}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}