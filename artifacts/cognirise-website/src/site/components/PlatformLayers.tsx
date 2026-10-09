import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PlatformLayer } from "@/site/content/cognios";

/**
 * The three-layer platform diagram. Click a layer to list its components;
 * the other two stay visible. Keyboard operable; the component lists are the
 * only hidden content and open on demand.
 */
export function PlatformLayers({ layers }: { layers: PlatformLayer[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const accents = ["#8063e7", "#ff9a3d", "#db509e"];
  return (
    <ol className="mt-10 flex flex-col-reverse gap-3" aria-label="The three layers">
      {layers.map((layer, index) => {
        const isOpen = open === index;
        return (
          <li key={layer.name} className="border border-[#102957] bg-[#fdfcfb]" style={{ borderLeft: `6px solid ${accents[index]}` }}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`layer-${index}`}
              onClick={() => setOpen(isOpen ? null : index)}
              className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-inset md:px-7"
            >
              <span className="text-[10px] font-semibold tracking-[0.12em]" style={{ color: accents[index] }}>0{index + 1}</span>
              <span className="text-[15.5px] leading-[1.5] text-[#30486d]">
                <strong className="font-display text-[20px] font-semibold tracking-[-0.03em] text-[#102957]">{layer.name}</strong> {layer.line}
              </span>
              <ChevronDown aria-hidden="true" size={18} className={`text-[#6f7d94] transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <ul id={`layer-${index}`} className="grid grid-cols-1 gap-x-8 gap-y-2 border-t border-[#cbd3e1] px-5 py-5 text-[14px] text-[#405777] sm:grid-cols-2 md:px-7">
                {layer.components.map((component) => (
                  <li key={component} className="flex gap-3"><span aria-hidden="true" className="mt-[9px] h-[2px] w-[12px] shrink-0" style={{ background: accents[index] }} />{component}</li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
