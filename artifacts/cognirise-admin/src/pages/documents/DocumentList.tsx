import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { 
  useListDocuments, 
  useCreateDocument, 
  DocumentKind, 
  DocumentStatus,
  getListDocumentsQueryKey
} from "@workspace/api-client-react";
import {
  getListMarketEditionsQueryKey,
  useListMarketEditions,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, Filter, MoreHorizontal, ArrowRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useGetSession } from "@workspace/api-client-react";
import { PeopleMarketMatrix } from "./PeopleMarketMatrix";
import { officeCreationContent, officeSlug } from "./office-creation";
import { initialCmsContent } from "@workspace/api-zod";

const createDocSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format (e.g. my-post-name)"),
  market: z.string().min(1, "Market is required"),
  address: z.string().trim().optional(),
  phone: z.string().trim().max(80, "Phone number must be 80 characters or fewer").optional(),
});

const officeCreateDocSchema = createDocSchema.extend({
  title: z.string().trim().min(1, "Office name or city is required"),
  address: z.string().trim().min(1, "Full postal address is required"),
});

export default function DocumentList({ kind }: { kind: DocumentKind }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useGetSession();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DocumentStatus | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [slugWasEdited, setSlugWasEdited] = useState(false);

  const canCreate = session?.user?.role !== "viewer";
  const canManageAvailability = session?.user?.role === "editor"
    || session?.user?.role === "publisher"
    || session?.user?.role === "administrator";

  const { data: pageData, isLoading } = useListDocuments({
    kind,
    page,
    pageSize: 20,
    search: search || undefined,
    status
  }, { query: { queryKey: getListDocumentsQueryKey({ kind, page, pageSize: 20, search: search || undefined, status }) } });
  const peopleMatrixParams = { kind: "person" as const, page: 1, pageSize: 100 };
  const { data: peopleMatrixData } = useListDocuments(
    peopleMatrixParams,
    {
      query: {
        queryKey: getListDocumentsQueryKey(peopleMatrixParams),
        enabled: kind === "person",
      },
    },
  );
  const marketParams = { page: 1, pageSize: 100 };
  const { data: marketData, isLoading: areMarketsLoading, isError: marketsFailed } = useListMarketEditions(
    marketParams,
    { query: { queryKey: getListMarketEditionsQueryKey(marketParams) } },
  );
  const enabledMarkets = useMemo(
    () => (marketData?.items ?? []).filter((market) => market.enabled),
    [marketData?.items],
  );
  const primaryMarket = enabledMarkets.find((market) => market.isCanonical) ?? enabledMarkets[0];

  const createDocument = useCreateDocument();

  const form = useForm<z.infer<typeof createDocSchema>>({
    resolver: zodResolver(kind === "office" ? officeCreateDocSchema : createDocSchema),
    defaultValues: {
      title: "",
      slug: "",
      market: "",
      address: "",
      phone: "",
    }
  });

  useEffect(() => {
    if (!form.getValues("market") && primaryMarket) {
      form.setValue("market", primaryMarket.code, { shouldValidate: true });
    }
  }, [form, primaryMarket]);

  const getKindLabel = (k: string) => {
    return k.charAt(0).toUpperCase() + k.slice(1).replace('-', ' ');
  };

  const getStatusColor = (s: DocumentStatus) => {
    switch (s) {
      case "published": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "draft": return "bg-muted text-muted-foreground border-border";
      case "in-review": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "scheduled": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const onSubmitCreate = (values: z.infer<typeof createDocSchema>) => {
    const content = kind === "office" ? officeCreationContent(values) : initialCmsContent(kind);
    createDocument.mutate({
      data: {
        kind,
        title: values.title,
        slug: values.slug,
        markets: [values.market],
        content,
      }
    }, {
      onSuccess: (newDoc) => {
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey({ kind, page, pageSize: 20, search: search || undefined, status }) });
        toast({ title: "Created successfully" });
        setIsCreateOpen(false);
        form.reset({ title: "", slug: "", market: primaryMarket?.code ?? "", address: "", phone: "" });
        setSlugWasEdited(false);
        setLocation(`/content/${newDoc.id}`);
      },
      onError: (error) => {
        const apiError = error as any;
        toast({ title: "Creation failed", variant: "destructive", description: apiError.data?.error || apiError.error || apiError.message || "Check the office details and try again." });
      }
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight capitalize text-foreground">{getKindLabel(kind)}s</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Manage {kind} content and versions</p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create New
          </Button>
        )}
      </div>

      {kind === "person" && peopleMatrixData && enabledMarkets.length > 0 && (
        <PeopleMarketMatrix
          people={peopleMatrixData.items}
          markets={enabledMarkets}
          canManage={canManageAvailability}
          isAdministrator={session?.user?.role === "administrator"}
        />
      )}

      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-4 bg-muted/20">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder={`Search ${getKindLabel(kind)}s...`} 
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : v as DocumentStatus)}>
            <SelectTrigger className="w-[180px] bg-background">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in-review">In Review</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-sm z-10">
              <TableRow className="border-border">
                <TableHead className="font-mono text-xs uppercase tracking-wider">Title & Slug</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider w-[120px]">Status</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider w-[150px]">Markets</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider w-[180px]">Last Updated</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : pageData?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-mono text-sm">
                    No {kind}s found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                pageData?.items.map((doc) => (
                  <TableRow key={doc.id} className="border-border/50 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => setLocation(`/content/${doc.id}`)}>
                    <TableCell>
                      <div className="font-medium text-foreground">{doc.title}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{doc.slug}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider rounded-sm ${getStatusColor(doc.status)}`}>
                        {doc.status.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {doc.markets.map(m => (
                          <Badge key={m} variant="secondary" className="font-mono text-[10px] uppercase rounded-sm bg-secondary/50">
                            {m}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {format(new Date(doc.updatedAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent/10 hover:text-accent">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="font-mono text-xs">
                          <DropdownMenuItem onClick={() => setLocation(`/content/${doc.id}`)}>
                            Edit content
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/preview/${doc.slug}`, '_blank')}>
                            Preview
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {pageData && pageData.totalPages > 1 && (
          <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between text-sm font-mono text-muted-foreground">
            <div>
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, pageData.total)} of {pageData.total}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page === pageData.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open && !createDocument.isPending) {
            form.reset({ title: "", slug: "", market: primaryMarket?.code ?? "", address: "", phone: "" });
            setSlugWasEdited(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create {getKindLabel(kind)}</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {kind === "office"
                ? "Create a complete office draft. You can continue editing it before review."
                : "Initialize an incomplete governed draft. Fill the type-specific fields on the next screen before review."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-wider">{kind === "office" ? "Office name / city" : "Title"}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={kind === "office" ? "Amsterdam" : "Internal Document Title"}
                        {...field}
                        onChange={(event) => {
                          field.onChange(event);
                          if (kind === "office" && !slugWasEdited) {
                            form.setValue("slug", officeSlug(event.target.value), { shouldValidate: form.formState.isSubmitted });
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-wider">URL Slug</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={kind === "office" ? "amsterdam" : "my-document-name"}
                        className="font-mono text-sm"
                        {...field}
                        onChange={(event) => {
                          setSlugWasEdited(true);
                          field.onChange(event);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {kind === "office" && <>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider">Full postal address</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="Office, building, street, city, postcode, country" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider">Phone number (optional)</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+31 20 123 4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>}

              <FormField
                control={form.control}
                name="market"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-wider">Primary Market</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={areMarketsLoading || enabledMarkets.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select market" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {enabledMarkets.map((market) => (
                          <SelectItem key={market.id} value={market.code}>
                            {market.displayName}{market.isCanonical ? " (canonical)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {marketsFailed ? (
                      <p className="text-xs text-destructive">Markets could not be loaded. Try again before creating this document.</p>
                    ) : !areMarketsLoading && enabledMarkets.length === 0 ? (
                      <p className="text-xs text-destructive">No enabled market is available. Ask an administrator to enable one.</p>
                    ) : primaryMarket ? (
                      <p className="text-xs text-muted-foreground">
                        The primary edition starts in {primaryMarket.defaultLocale}; other editions can inherit through configured fallbacks.
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createDocument.isPending || areMarketsLoading || enabledMarkets.length === 0}>
                  {createDocument.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create & Edit
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
