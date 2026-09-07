import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Category {
  id: string;
  label: string;
}

interface ProgressiveCategoryDisclosureProps {
  categories: Category[];
  initialCount?: number;
  activeId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

export function ProgressiveCategoryDisclosure({
  categories,
  initialCount = 4,
  activeId,
  onSelect,
  className = "",
}: ProgressiveCategoryDisclosureProps) {
  const [expanded, setExpanded] = useState(false);

  const visibleCategories = expanded ? categories : categories.slice(0, initialCount);
  const hiddenCount = categories.length - initialCount;
  const showToggle = categories.length > initialCount;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {visibleCategories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          aria-pressed={activeId === cat.id}
          onClick={() => onSelect?.(cat.id)}
          data-testid={`category-${cat.id}`}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200
            ${
              activeId === cat.id
                ? "bg-[hsl(var(--brand-deep))] text-white shadow-md"
                : "bg-secondary text-foreground hover:bg-[hsl(var(--brand-violet))/10] hover:text-[hsl(var(--brand-pink))]"
            }
          `}
        >
          {cat.label}
        </button>
      ))}

      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-transparent text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border hover:border-[hsl(var(--brand-pink))/30]"
          aria-expanded={expanded}
          data-testid="button-toggle-categories"
        >
          {expanded ? (
            <>
              Show fewer <ChevronUp size={14} />
            </>
          ) : (
            <>
              +{hiddenCount} <ChevronDown size={14} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
