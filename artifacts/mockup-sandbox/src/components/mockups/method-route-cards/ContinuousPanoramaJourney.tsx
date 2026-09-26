import { useEffect, useRef } from "react";
import SignalJourney from "./SignalJourney";
import "./ContinuousPanoramaJourney.css";

export function ContinuousPanoramaJourney() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const image = rootRef.current?.querySelector<HTMLImageElement>(".sj-panorama-stage > img");
    if (image) {
      image.alt = "Seven connected architectural bays linked by one continuous violet light conduit; the highlighted bay follows the selected starting situation.";
    }
  }, []);

  return (
    <div className="continuous-panorama-shell" ref={rootRef}>
      <SignalJourney presentation="panorama" />
    </div>
  );
}

export default ContinuousPanoramaJourney;