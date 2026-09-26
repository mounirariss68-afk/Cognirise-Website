import { useEffect, useRef } from "react";
import SignalJourney from "./SignalJourney";
import "./ContinuousPanoramaJourney.css";

export function ContinuousPanoramaJourney() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const imageTargets = root?.querySelector(".sj-panorama-targets");
    const stops = Array.from(root?.querySelectorAll<HTMLElement>(".sj-stops .sj-stop") ?? []);
    const progress = root?.querySelector<SVGPathElement>(".sj-signal-progress");
    if (!imageTargets || stops.length === 0) return;

    const selectedIndex = () => stops.findIndex((stop) => stop.getAttribute("aria-checked") === "true");
    const setPreview = (index: number | null) => {
      stops.forEach((stop, stopIndex) => {
        stop.classList.toggle("is-preview", index === stopIndex);
      });
      if (progress) {
        const indexToShow = index ?? Math.max(0, selectedIndex());
        progress.style.strokeDasharray = `${indexToShow / (stops.length - 1) * 1000} 1000`;
      }
    };
    const targets = Array.from(imageTargets.querySelectorAll("button"));
    const listeners = targets.map((target, index) => {
      const enter = () => setPreview(index);
      const leave = () => setPreview(null);
      target.addEventListener("mouseenter", enter);
      target.addEventListener("mouseleave", leave);
      target.addEventListener("focus", enter);
      target.addEventListener("blur", leave);
      return () => {
        target.removeEventListener("mouseenter", enter);
        target.removeEventListener("mouseleave", leave);
        target.removeEventListener("focus", enter);
        target.removeEventListener("blur", leave);
      };
    });

    return () => listeners.forEach((removeListeners) => removeListeners());
  }, []);

  return (
    <div className="continuous-panorama-shell" ref={rootRef}>
      <SignalJourney presentation="panorama" imageHighlight />
    </div>
  );
}

export default ContinuousPanoramaJourney;