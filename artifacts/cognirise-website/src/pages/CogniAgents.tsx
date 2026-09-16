import { Link } from "wouter";
import { ArrowRight, Settings, Workflow, Activity } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";

export default function CogniAgents() {
  return (
    <div className="flex flex-col">
      <section className="public-hero-shell px-6 md:px-12 py-24 max-w-[1440px] mx-auto w-full bg-[hsl(var(--brand-deep))] text-white my-12 clip-diagonal-left">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/50 mb-8">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              Products / CogniAgents
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-[85px] leading-[0.94] font-semibold mb-8">
              Execution, <em className="not-italic text-[hsl(var(--brand-coral))]">orchestrated.</em>
            </h1>
            <p className="text-lg text-white/80 max-w-[460px] mb-10 leading-relaxed">
              Governed agents that coordinate specialist tasks in defined operational environments. Moving work forward, autonomously.
            </p>
            <BrandButton href="/value-scan" variant="submit">Bring us one process</BrandButton>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/5 border border-white/10 p-6 flex flex-col gap-4 hover:bg-white/10 transition-colors">
               <Settings className="text-[hsl(var(--brand-pink))] w-6 h-6" />
               <h3 className="font-semibold text-lg">Specialist Skills</h3>
               <p className="text-sm text-white/60">Equipped with specific tools to perform exact operational tasks.</p>
             </div>
             <div className="bg-white/5 border border-white/10 p-6 flex flex-col gap-4 hover:bg-white/10 transition-colors mt-8">
               <Workflow className="text-[hsl(var(--brand-coral))] w-6 h-6" />
               <h3 className="font-semibold text-lg">Coordination</h3>
               <p className="text-sm text-white/60">Agents hand off tasks to one another or request human intervention.</p>
             </div>
             <div className="bg-white/5 border border-white/10 p-6 flex flex-col gap-4 hover:bg-white/10 transition-colors col-span-2">
               <Activity className="text-[hsl(var(--brand-violet))] w-6 h-6" />
               <h3 className="font-semibold text-lg">Strict Bounds</h3>
               <p className="text-sm text-white/60">Operating strictly within the permissions and audit trails defined by CogniOS.</p>
             </div>
          </div>
        </div>
      </section>

      <section className="px-6 md:px-12 py-24 max-w-[1440px] mx-auto w-full">
        <h2 className="text-4xl lg:text-6xl font-semibold mb-16 max-w-3xl">Agents that do work, not just talk about it.</h2>
        <div className="border-t border-foreground pt-8 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row gap-8 justify-between pb-8 border-b border-border">
            <div className="md:w-1/3">
              <h3 className="text-2xl font-bold">Action-Oriented</h3>
            </div>
            <div className="md:w-1/2">
              <p className="text-lg text-muted-foreground">Unlike standard chat interfaces, CogniAgents are deployed to execute complex sequences of API calls, data transformations, and system updates.</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-8 justify-between pb-8 border-b border-border">
            <div className="md:w-1/3">
              <h3 className="text-2xl font-bold">Human-in-the-loop</h3>
            </div>
            <div className="md:w-1/2">
              <p className="text-lg text-muted-foreground">Agents know their confidence limits. When an exception occurs, they automatically escalate to the designated human operator with full context.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}