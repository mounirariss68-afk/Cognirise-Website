import { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/assets";

const poster = assetUrl("/images/cognirise/team-living-portrait-poster.jpg");
const mp4 = assetUrl("/videos/cognirise/team-living-portrait.mp4");
const webm = assetUrl("/videos/cognirise/team-living-portrait.webm");

/**
 * An opt-in design preview, not a published CMS hero film. The approved
 * landing image remains in the parent figure and is never replaced.
 */
export function TeamHeroFilmPreview() {
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion || failed) return;
    // Autoplay may be denied even for muted video. Keep the poster in that case.
    void video.current?.play().catch(() => setFailed(true));
  }, [reducedMotion, failed]);

  return (
    <div className="absolute inset-0 bg-[#f2ede5]" data-testid="team-film-preview">
      {!posterFailed && (
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-contain object-center lg:object-cover"
          onError={() => setPosterFailed(true)}
        />
      )}
      {!reducedMotion && !failed && (
        <video
          ref={video}
          className={`absolute inset-0 h-full w-full object-contain object-center transition-opacity duration-500 lg:object-cover ${playing ? "opacity-100" : "opacity-0"}`}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
          onError={() => { setFailed(true); setPlaying(false); }}
        >
          <source src={mp4} type="video/mp4" />
          <source src={webm} type="video/webm" />
        </video>
      )}
      <span className="sr-only">The living team portrait: a UAE-based woman leader shapes the work, an Emirati forward-deployed engineer and colleague extend it through agent paths, a woman assurance specialist checks a coral control point, and two women and two men decide together.</span>
    </div>
  );
}