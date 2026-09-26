import { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/assets";

const FILM = {
  mobileMp4: assetUrl("/videos/cognirise/methodologies-pulse-hero-journey-720.mp4"),
  mp4: assetUrl("/videos/cognirise/methodologies-pulse-hero-journey.mp4"),
  webm: assetUrl("/videos/cognirise/methodologies-pulse-hero-journey.webm"),
  poster: assetUrl("/images/cognirise/methodologies-pulse-hero-journey-poster.jpg"),
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
  const [posterFailed, setPosterFailed] = useState(false);
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
      if (video?.paused) void video.play().catch((error: DOMException) => {
        // A source change or unmount can abort play without a media failure.
        if (error.name !== "AbortError" && videoRef.current === video) {
          console.warn("Methodologies film could not play:", error.name, error.message);
          setFailed(true);
        }
      });
    }, 250);
    // Slow delivery is not a broken film: the poster remains visible until
    // playback starts. Only actual media errors trigger the governed fallback.
    return () => window.clearTimeout(attempt);
  }, [reducedMotion, failed]);

  const checkSources = () => {
    // Chromium can report NETWORK_NO_SOURCE without setting video.error or
    // rejecting play() when every child <source> fails.
    window.setTimeout(() => {
      if (videoRef.current?.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        setFailed(true);
      }
    }, 250);
  };

  // With no video (reduced motion), a missing poster reveals the approved
  // governed image. With video, let playback proceed even if its poster fails.
  if (failed || (reducedMotion && posterFailed)) return null;

  return (
    <div
      className="absolute inset-0"
      aria-hidden="true"
      data-testid="methodologies-hero-film"
    >
      <img
        src={FILM.poster}
        alt=""
        draggable={false}
        onError={() => setPosterFailed(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {!reducedMotion && !failed && (
        <video
          ref={videoRef}
          className={`h-full w-full object-cover transition-opacity duration-500 ${playing ? "opacity-100" : "opacity-0"}`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={FILM.poster}
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
          onError={(event) => {
            // A rejected <source> (including a media query mismatch) can emit
            // an error while the video still has another playable source.
            if (!event.currentTarget.error) return;
            console.warn("Methodologies film media error:", event.currentTarget.error.code);
            setFailed(true);
          }}
        >
          <source src={FILM.mobileMp4} type="video/mp4" media="(max-width: 767px)" onError={checkSources} />
          <source src={FILM.mp4} type="video/mp4" onError={checkSources} />
          <source src={FILM.webm} type="video/webm" onError={checkSources} />
        </video>
      )}
    </div>
  );
}