import { useEffect, useRef } from "react";
import SignalJourney from "./SignalJourney";
import "./ContinuousPanoramaJourney.css";

export function ContinuousPanoramaJourney() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const image = root.querySelector<HTMLImageElement>(".sj-panorama-stage > img");
    const liveTitle = root.querySelector<HTMLElement>(".sj-panorama-caption strong");
    if (image) image.alt = "A continuous architectural panorama of seven different AI situations. Hover to preview a stop; select one to update the guidance below.";
    const syncTitle = () => {
      const selected = root.querySelector<HTMLButtonElement>('.sj-stop[aria-checked="true"]');
      const label = selected?.getAttribute("aria-label");
      if (liveTitle && label) liveTitle.textContent = label;
    };
    syncTitle();
    const stopObserver = root.querySelector(".sj-stops");
    if (!stopObserver) return;
    const observer = new MutationObserver(syncTitle);
    observer.observe(stopObserver, { attributes: true, subtree: true, attributeFilter: ["aria-checked"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="continuous-panorama-shell" ref={rootRef}>
      <SignalJourney presentation="panorama" />
    </div>
  );
}

export default ContinuousPanoramaJourney;