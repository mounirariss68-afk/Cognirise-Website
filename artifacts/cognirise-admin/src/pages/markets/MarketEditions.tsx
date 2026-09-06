import { useState } from "react";
import { useListMarketEditions, useCreateMarketEdition, getListMarketEditionsQueryKey, useGetSession } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings2, Plus, Shield, ShieldAlert, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

const createMarketSchema = z.object({
  code: z.string().min(2, "Code required").regex(/^[a-z][a-z0-9-]{1,15}$/, "Invalid code format (lowercase letters, numbers, hyphens)"),
  displayName: z.string().min(1, "Display Name required"),
  defaultLocale: z.string().min(2, "Default Locale required"),
  fallbackMarketCode: z.string().optional(),
  fallbackLocale: z.string().optional(),
});

export default function MarketEditions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useGetSession();
  const isAdministrator = session?.user?.role === "administrator";

  const { data, isLoading } = useListMarketEditions({ page: 1, pageSize: 50 }, { query: { queryKey: getListMarketEditionsQueryKey({ page: 1, pageSize: 50 }) } });
  const createMarket = useCreateMarketEdition();

  const form = useForm<z.infer<typeof createMarketSchema>>({
    resolver: zodResolver(createMarketSchema),
    defaultValues: { code: "", displayName: "", defaultLocale: "en-US", fallbackMarketCode: "", fallbackLocale: "" }
  });

  const onSubmit = (values: z.infer<typeof createMarketSchema>) => {
    createMarket.mutate({
      data: {
        code: values.code,
        displayName: values.displayName,
        defaultLocale: values.defaultLocale,
        fallbackMarketCode: values.fallbackMarketCode || null,
        fallbackLocale: values.fallbackLocale || null,
        isCanonical: false, // New markets are never canonical by default
        enabled: true
      }
    }, {
      onSuccess: () => {
        toast({ title: "Market created successfully" });
        setIsOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListMarketEditionsQueryKey({ page: 1, pageSize: 50 }) });
      },
      onError: (err) => {
        toast({ title: "Creation failed", description: (err as any).error, variant: "destructive" });
      }
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Market Editions</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Regional configurations, locales, and fallbacks</p>
        </div>
        {isAdministrator && (
          <Button onClick={() => setIsOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Market
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Market Code</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Display Name</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Locale / Fallback</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Canonical</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-mono text-sm">
                  No market editions configured.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map(market => (
                <TableRow key={market.id} className="hover:bg-muted/20">
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs bg-muted/50 rounded-sm">
                      {market.code}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{market.displayName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs text-foreground">{market.defaultLocale}</span>
                      {(market.fallbackMarketCode || market.fallbackLocale) && (
                        <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                          Fallback: {market.fallbackMarketCode || '-'} / {market.fallbackLocale || '-'}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {market.isCanonical ? (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-transparent font-mono text-[10px] uppercase gap-1">
                        <Shield className="w-3 h-3" /> Base Truth
                      </Badge>
                    ) : (
                      <span className="font-mono text-[10px] text-muted-foreground">Derived</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={market.enabled ? "default" : "secondary"} className={market.enabled ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-none border-transparent" : ""}>
                      {market.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isAdministrator ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <Settings2 className="w-4 h-4" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-6 flex items-start gap-3 bg-muted/30 border border-border p-4 rounded-lg">
        <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground mb-1">Canonical Market Protection</p>
          <p className="text-muted-foreground font-mono text-xs leading-relaxed">
            The canonical market serves as the global baseline. Deleting or disabling the canonical market is restricted as derived markets rely on its fallback data. Promote another market to canonical status before modifying the current one.
          </p>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Market Edition</DialogTitle>
            <DialogDescription className="font-mono text-xs mt-1">Configure a new regional delivery target.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="displayName" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs uppercase tracking-wider">Display Name</FormLabel>
                  <FormControl><Input placeholder="Europe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs uppercase tracking-wider">Market Code</FormLabel>
                  <FormControl><Input placeholder="europe" className="font-mono text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="defaultLocale" render={({ field }) => (
                  <FormItem><FormLabel className="font-mono text-xs uppercase tracking-wider">Default Locale</FormLabel>
                  <FormControl><Input placeholder="en-EU" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              
              <div className="pt-4 border-t border-border mt-4">
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-4">Fallback Resolution (Optional)</p>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="fallbackMarketCode" render={({ field }) => (
                    <FormItem><FormLabel className="font-mono text-xs uppercase tracking-wider">Fallback Market</FormLabel>
                    <FormControl><Input placeholder="global" className="font-mono text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="fallbackLocale" render={({ field }) => (
                    <FormItem><FormLabel className="font-mono text-xs uppercase tracking-wider">Fallback Locale</FormLabel>
                    <FormControl><Input placeholder="en-US" className="font-mono text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>
              <DialogFooter className="pt-4 mt-2">
                <Button variant="ghost" type="button" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMarket.isPending}>
                  {createMarket.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Create Market
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}