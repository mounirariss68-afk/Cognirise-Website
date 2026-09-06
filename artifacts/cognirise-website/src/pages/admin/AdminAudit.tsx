import React, { useState } from "react";
import { useListCmsAdminAuditEvents } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Loader2, Search, Activity, User, Target, ChevronRight } from "lucide-react";

export default function AdminAudit() {
  const { data, isLoading } = useListCmsAdminAuditEvents();
  const [search, setSearch] = useState("");
  const events = data?.events || [];

  const filtered = events.filter(e => 
    e.action.toLowerCase().includes(search.toLowerCase()) || 
    e.actor.toLowerCase().includes(search.toLowerCase()) ||
    e.target.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight mb-2 text-white">Audit Log</h1>
        <p className="text-white/60">Immutable record of editorial activity.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-white/10 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input 
              type="text"
              placeholder="Search by action, actor, or target..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-md py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-white/50" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-white/50 flex flex-col items-center">
            <Activity className="h-12 w-12 mb-4 opacity-20" />
            <p>No audit events found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-black/20 text-white/60 font-medium">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Actor</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Target</th>
                  <th className="px-6 py-3">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(event => (
                  <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-white/60 whitespace-nowrap">
                      {format(new Date(event.createdAt), "MMM d, HH:mm:ss")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-white">
                        <User className="h-4 w-4 text-white/40" />
                        <span className="font-mono text-xs">{event.actor}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/80 uppercase tracking-wider">
                        {event.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-white">
                        <Target className="h-4 w-4 text-white/40" />
                        <span className="font-mono text-xs">{event.target}</span>
                      </div>
                      {event.market && (
                        <div className="text-[10px] text-[hsl(var(--brand-coral))] font-bold uppercase mt-1">
                          Market: {event.market}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        event.outcome === "success" ? "text-emerald-400" : 
                        event.outcome === "failure" ? "text-red-400" : 
                        "text-white/60"
                      }`}>
                        {event.outcome}
                        {event.metadata && (
                          <span title={JSON.stringify(event.metadata)}>
                            <ChevronRight className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" />
                          </span>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
