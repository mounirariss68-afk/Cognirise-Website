import React from "react";
import { useGetCmsAdminDashboard, useProcessDueCmsAdminWorkflow, getGetCmsAdminDashboardQueryKey } from "@workspace/api-client-react";
import { FileText, Clock, Globe, ArrowRight, Loader2, PlayCircle, Archive, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function AdminDashboard() {
  const { data: dashboard, isLoading, error } = useGetCmsAdminDashboard();
  const processWorkflow = useProcessDueCmsAdminWorkflow();
  const { toast } = useToast();

  const handleProcessDue = () => {
    processWorkflow.mutate(undefined, {
      onSuccess: (res) => {
        toast({ title: "Workflow processed", description: `Processed ${res.processed} out of ${res.discovered} due items. (${res.status})` });
        queryClient.invalidateQueries({ queryKey: getGetCmsAdminDashboardQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to process", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--brand-pink))]" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-red-200">
        Failed to load dashboard data.
      </div>
    );
  }

  const { documents, editions, states } = dashboard;

  const statCards = [
    { label: "Total Documents", value: documents, icon: <FileText className="h-5 w-5" />, color: "text-[hsl(var(--brand-violet))]" },
    { label: "Market Editions", value: editions, icon: <Globe className="h-5 w-5" />, color: "text-[hsl(var(--brand-coral))]" },
    { label: "Pending Review", value: states.review, icon: <Clock className="h-5 w-5" />, color: "text-[hsl(var(--brand-pink))]" },
    { label: "Live Published", value: states.published, icon: <PlayCircle className="h-5 w-5" />, color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-8 fade-in animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2 text-white">Dashboard</h1>
          <p className="text-white/60">Overview of governed content across all markets.</p>
        </div>
        
        <button 
          onClick={handleProcessDue}
          disabled={processWorkflow.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded font-medium text-sm transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${processWorkflow.isPending ? 'animate-spin' : ''}`} />
          Process Scheduled
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-colors relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="text-sm font-medium text-white/60 mb-2">{stat.label}</div>
            <div className="text-4xl font-display font-bold tracking-tight text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-medium mb-6 text-white border-b border-white/10 pb-4">Workflow Distribution</h2>
          <div className="space-y-5">
            {[
              { state: "Draft", count: states.draft, color: "bg-white/20" },
              { state: "In Review", count: states.review, color: "bg-[hsl(var(--brand-pink))]" },
              { state: "Approved", count: states.approved, color: "bg-[hsl(var(--brand-violet))]" },
              { state: "Scheduled", count: states.scheduled, color: "bg-[hsl(var(--brand-coral))]" },
              { state: "Published", count: states.published, color: "bg-emerald-500" },
              { state: "Archived", count: states.archived, color: "bg-white/10" },
            ].map((item) => {
              const max = Math.max(1, editions);
              const percentage = Math.round((item.count / max) * 100);
              return (
                <div key={item.state}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-white/80">{item.state}</span>
                    <span className="font-mono text-white/50">{item.count}</span>
                  </div>
                  <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-b from-[hsl(var(--brand-violet))/10] to-transparent border border-[hsl(var(--brand-violet))/20] rounded-xl p-6 flex flex-col">
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--brand-violet))/20] flex items-center justify-center text-[hsl(var(--brand-violet))] mb-4">
            <FileText className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-medium mb-2 text-white">Content Hub</h2>
          <p className="text-sm text-white/60 mb-6 flex-1">
            Create, edit, and localize governed documents across the four target markets. Ensure regional compliance before publishing.
          </p>
          <Link href="/admin/content" className="inline-flex items-center justify-between px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded font-medium text-sm transition-colors group">
            Browse Content
            <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
}
