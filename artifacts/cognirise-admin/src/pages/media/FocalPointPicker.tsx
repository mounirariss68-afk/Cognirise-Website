import { useRef } from "react";
import { Button } from "@/components/ui/button";

export type FocalPoint = {
  x: number;
  y: number;
};

type FocalPointPickerProps = {
  src?: string | null;
  alt: string;
  value: FocalPoint | null;
  disabled?: boolean;
  onChange: (value: FocalPoint) => void;
  onClear: () => void;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Stores a non-destructive point of interest rather than changing the source
 * binary. The same point is rendered against each representative aspect
 * ratio so editors can see how a rendition will remain anchored.
 */
export function FocalPointPicker({
  src,
  alt,
  value,
  disabled = false,
  onChange,
  onClear,
}: FocalPointPickerProps) {
  const point = value ?? { x: 0.5, y: 0.5 };
  const imageAvailable = Boolean(src);
  const previews = [
    { label: "Hero crop", className: "aspect-[16/7]" },
    { label: "Card crop", className: "aspect-[4/3]" },
    { label: "Square crop", className: "aspect-square" },
  ];
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectPoint = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !buttonRef.current) return;
    const bounds = buttonRef.current.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    onChange({
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height),
    });
  };

  return (
    <section className="space-y-3 rounded-md border border-border bg-muted/10 p-3" aria-label="Focal point">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Focal point</h3>
          <p className="text-xs text-muted-foreground">
            Choose the subject to keep visible in non-destructive card and hero crops.
          </p>
        </div>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={disabled}>
            Reset to centre
          </Button>
        )}
      </div>
      {imageAvailable ? (
        <>
          <button
            ref={buttonRef}
            type="button"
            className="relative block aspect-video w-full overflow-hidden rounded-md border border-border bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
            onClick={selectPoint}
            aria-label="Choose focal point on image"
          >
            <img
              src={src ?? undefined}
              alt={alt}
              className="h-full w-full object-cover"
              style={{ objectPosition: `${point.x * 100}% ${point.y * 100}%` }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary/70 shadow-[0_0_0_1px_rgba(0,0,0,.45)]"
              style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            />
          </button>
          <div className="grid grid-cols-3 gap-2" aria-label="Focal point previews">
            {previews.map((preview) => (
              <figure key={preview.label} className="space-y-1">
                <div className={`overflow-hidden rounded border border-border bg-muted ${preview.className}`}>
                  <img
                    src={src ?? undefined}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover"
                    style={{ objectPosition: `${point.x * 100}% ${point.y * 100}%` }}
                  />
                </div>
                <figcaption className="text-center text-[10px] text-muted-foreground">{preview.label}</figcaption>
              </figure>
            ))}
          </div>
          <p className="text-[10px] font-mono text-muted-foreground">
            Position: {Math.round(point.x * 100)}% horizontal, {Math.round(point.y * 100)}% vertical
          </p>
        </>
      ) : (
        <p className="rounded border border-dashed border-border p-3 text-xs text-muted-foreground">
          A preview is unavailable for this asset, so a focal point cannot be selected here.
        </p>
      )}
    </section>
  );
}