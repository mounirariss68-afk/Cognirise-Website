import { useState } from "react";
import { type DemoScenario } from "@/lib/cognidocs-content";
import { EngineeringPlan } from "./EngineeringPlan";
import engineeringImg from "@/assets/generated_images/cognidocs-engineering.jpg";
import financeImg from "@/assets/generated_images/cognidocs-pulse-document-intelligence.jpg";

function FinanceFacsimile({ activeFieldId }: { activeFieldId: string }) {
  return (
    <div className="font-mono text-xs border border-border p-6 bg-white shadow-sm h-full flex flex-col min-h-[300px]">
      <div className="text-right text-muted-foreground mb-6 leading-relaxed">
        Statement Date: 2024-10-15<br />
        Currency: USD
      </div>
      <div className="overflow-x-auto pb-4" tabIndex={0} role="region" aria-label="Illustrative statement table, scroll horizontally on small screens">
        <table className="w-full text-left border-collapse min-w-[400px]">
          <thead>
            <tr className="border-b-2 border-border text-muted-foreground">
              <th className="py-2 font-normal">Trans Date</th>
              <th className="font-normal">Description</th>
              <th className="text-right font-normal">Debit</th>
              <th className="text-right font-normal">Credit</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            <tr className="border-b border-border/50">
              <td className="py-4 text-slate-500">10-11</td>
              <td className="text-slate-500">TRANSFER TO ACC 1234</td>
              <td className="text-right text-slate-500">500.00</td>
              <td className="text-right"></td>
            </tr>
            <tr className="border-b border-border/50 bg-slate-50/50">
              <td className="py-4">10-12</td>
              <td>
                <span className={`px-1.5 py-0.5 rounded transition-colors inline-block ${activeFieldId === 'merchant' ? 'bg-[hsl(var(--brand-pink))]/10 text-[hsl(var(--brand-pink))] ring-1 ring-[hsl(var(--brand-pink))] font-bold' : ''}`}>
                  UBER*TRIP NYC 8842
                </span>
              </td>
              <td className="text-right"></td>
              <td className="text-right text-emerald-600 font-bold">
                <span className={`px-1.5 py-0.5 rounded transition-colors inline-block ${activeFieldId === 'amount' ? 'bg-[hsl(var(--brand-pink))]/10 text-[hsl(var(--brand-pink))] ring-1 ring-[hsl(var(--brand-pink))]' : ''}`}>
                  45.50 CR
                </span>
              </td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-4 text-slate-500">10-14</td>
              <td className="text-slate-500">MONTHLY ACCOUNT FEE</td>
              <td className="text-right text-slate-500">25.00</td>
              <td className="text-right"></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-auto pt-6 text-[10px] text-muted-foreground flex justify-between uppercase tracking-widest">
        <span>Page 1 of 4</span>
        <span>End of Statement</span>
      </div>
    </div>
  );
}


export function DemoViewer({ scenario }: { scenario: DemoScenario }) {
  const [activeFieldId, setActiveFieldId] = useState(scenario.fields[0].id);
  const activeField = scenario.fields.find(f => f.id === activeFieldId) || scenario.fields[0];
  const imgSource = scenario.id === "engineering" ? engineeringImg : financeImg;

  return (
    <div className="mt-8 border border-border bg-white p-6 md:p-12 shadow-sm">
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-12 items-start">
        <div className="flex flex-col h-full">
          <h3 className="text-2xl font-bold mb-4">{scenario.title}</h3>
          <p className="text-muted-foreground mb-8 leading-relaxed">{scenario.description}</p>
          
          <div className="flex flex-col gap-2 mb-8" role="group" aria-label={`Extraction fields for ${scenario.title}`}>
            {scenario.fields.map((field) => {
              const isActive = activeFieldId === field.id;
              return (
                <button
                  key={field.id}
                  aria-pressed={isActive}
                  onClick={() => setActiveFieldId(field.id)}
                  className={`text-left px-4 py-3 border-l-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-coral))] ${
                    isActive 
                      ? "border-[hsl(var(--brand-violet))] bg-[hsl(var(--brand-violet))]/5 text-[hsl(var(--brand-deep))] font-bold" 
                      : "border-transparent text-muted-foreground hover:bg-slate-50 hover:text-[hsl(var(--foreground))]"
                  }`}
                >
                  {field.label}
                </button>
              );
            })}
          </div>

          <div className="bg-slate-50 border border-border p-6 rounded-sm mt-auto" aria-live="polite">
            <div className="mb-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Extracted Value</span>
              <div className="text-lg font-mono font-bold text-[hsl(var(--brand-deep))]">{activeField.extractedValue}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-5 border-t border-border pt-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Confidence</span>
                <span className={`inline-flex px-2 py-1 font-bold uppercase tracking-wider text-[9px] ${
                  activeField.confidence === "High" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {activeField.confidence}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Evidence Location</span>
                <span className="font-mono text-xs">{activeField.evidence}</span>
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--brand-violet))] block mb-2">Reviewer Note</span>
              <p className="text-sm text-[hsl(var(--brand-deep))] font-medium leading-relaxed">{activeField.reviewerNote}</p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-6 h-full">
          <div className="flex-1 min-w-0 min-h-[400px]">
            {scenario.id === 'finance' ? <FinanceFacsimile activeFieldId={activeFieldId} /> : <EngineeringPlan activeFieldId={activeFieldId} />}
          </div>
          
          <div className="flex items-center gap-6 border-t border-border pt-6">
            <img src={imgSource} alt={`Conceptual art for ${scenario.title}`} className="w-24 h-24 object-cover border border-border shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-[hsl(var(--brand-deep))] block mb-1 uppercase tracking-widest text-[10px]">Illustrative Data</span>
              Fictional source excerpts and prewritten outputs explain the review process. No document is processed here; this is not customer evidence or a measured accuracy result.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}