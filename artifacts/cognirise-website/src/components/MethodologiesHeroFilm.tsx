import { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/assets";

const FILM = {
  mp4: assetUrl("/videos/cognirise/methodologies-pulse-hero.mp4"),
  webm: assetUrl("/videos/cognirise/methodologies-pulse-hero.webm"),
  poster: assetUrl("/images/cognirise/methodologies-pulse-hero-poster.jpg"),
};

/**
 * The UAE route's new film is a presentation layer over the exact approved
 * methodologies-hero-media image. The image remains in the page underneath,
 * including if the route's film and poster cannot load. Other market editions
 * retain their own governed hero images until their film is approved.
 */
export function MethodologiesHeroFilm() {
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion || failed) return;
    const attempt = window.setTimeout(() => {
      const video = videoRef.current;
      if (video?.paused) void video.play().catch(() => setFailed(true));
    }, 250);
    const loadingGuard = window.setTimeout(() => {
      if ((videoRef.current?.readyState ?? 0) < HTMLMediaElement.HAVE_CURRENT_DATA) {
        setFailed(true);
      }
    }, 8000);
    return () => {
      window.clearTimeout(attempt);
      window.clearTimeout(loadingGuard);
    };
  }, [reducedMotion, failed]);

  return (
    <div
      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url("${FILM.poster}")` }}
      aria-hidden="true"
      data-testid="methodologies-hero-film"
    >
      {!reducedMotion && !failed && (
        <video
          ref={videoRef}
          className={`h-full w-full object-cover transition-opacity duration-500 ${playing ? "opacity-100" : "opacity-0"}`}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={FILM.poster}
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
          onError={() => setFailed(true)}
        >
          <source src={FILM.mp4} type="video/mp4" />
          <source src={FILM.webm} type="video/webm" />
        </video>
      )}
    </div>
  );
}