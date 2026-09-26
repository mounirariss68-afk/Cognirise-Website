import { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/assets";
import "./MethodologiesHeroFilm.css";

const FILM = {
  mobileMp4: assetUrl("/videos/cognirise/methodologies-hero-clean-cut-20260926/methodologies-pulse-hero-journey-720.mp4"),
  mp4: assetUrl("/videos/cognirise/methodologies-hero-clean-cut-20260926/methodologies-pulse-hero-journey.mp4"),
  webm: assetUrl("/videos/cognirise/methodologies-hero-clean-cut-20260926/methodologies-pulse-hero-journey.webm"),
  poster: assetUrl("/images/cognirise/methodologies-pulse-hero-journey-poster.jpg"),
};

// Timed to the actual 51-second film, not wall-clock time. Each chapter
// matches one of the seven starting situations in the decision journey below.
const JOURNEY_HEADLINES = [
  { from: 0, heading: "Finding where AI can help?", emphasis: "Find value with us." },
  { from: 6.5, heading: "More ideas than resources?", emphasis: "Choose the right bets." },
  { from: 13.5, heading: "Already have a strategy?", emphasis: "Put it to work." },
  { from: 19, heading: "A process needs to change?", emphasis: "Improve the work." },
  { from: 27, heading: "A pilot needs a path forward?", emphasis: "Release with confidence." },
  { from: 34.5, heading: "Ready to reach further?", emphasis: "Expand what works." },
  { from: 41, heading: "Results falling short?", emphasis: "Recover missing value." },
] as const;

/** UAE-English film. The poster is its first frame; no legacy hero image is mounted. */
export function MethodologiesHeroFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [chapter, setChapter] = useState(0);

  const syncHeadline = () => {
    const time = videoRef.current?.currentTime ?? 0;
    for (let index = JOURNEY_HEADLINES.length - 1; index >= 0; index--) {
      if (time >= JOURNEY_HEADLINES[index].from) {
        setChapter(index);
        break;
      }
    }
  };

  useEffect(() => {
    if (unavailable || needsGesture) return;
    let resumeTimer: number | undefined;
    const resume = () => {
      resumeTimer = undefined;
      if (document.visibilityState !== "visible") return;
      const video = videoRef.current;
      if (!video?.paused || video.ended || video.error) return;
      void video.play().catch((error: DOMException) => {
        if (error.name === "AbortError" || videoRef.current !== video || document.visibilityState !== "visible") return;
        if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
          setUnavailable(true);
        } else {
          // Autoplay can be denied by the host browser/iframe. Only a visitor's
          // own click can unlock it; never misreport this as damaged media.
          setNeedsGesture(true);
        }
      });
    };
    const scheduleResume = () => {
      if (resumeTimer !== undefined) window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(resume, 250);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleResume();
    };
    const video = videoRef.current;
    scheduleResume();
    video?.addEventListener("pause", scheduleResume);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      if (resumeTimer !== undefined) window.clearTimeout(resumeTimer);
      video?.removeEventListener("pause", scheduleResume);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [unavailable, needsGesture]);

  useEffect(() => {
    if (started || unavailable || needsGesture) return;
    const timer = window.setTimeout(() => setLoading(true), 3000);
    return () => window.clearTimeout(timer);
  }, [started, unavailable, needsGesture]);

  const checkSources = () => {
    // A media-query mismatch can reject one <source> without breaking the
    // video. Only an exhausted source list with no decoded frame is fatal.
    window.setTimeout(() => {
      const video = videoRef.current;
      if (video?.networkState === HTMLMediaElement.NETWORK_NO_SOURCE &&
        video.readyState === HTMLMediaElement.HAVE_NOTHING && video.currentTime === 0) {
        setUnavailable(true);
      }
    }, 250);
  };

  const playFromGesture = () => {
    const video = videoRef.current;
    if (!video) return;
    setNeedsGesture(false);
    void video.play().catch((error: DOMException) => {
      if (videoRef.current !== video || error.name === "AbortError") return;
      if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        setUnavailable(true);
      } else {
        setNeedsGesture(true);
      }
    });
  };

  return (
    <div className="absolute inset-0 bg-[#132040]" data-testid="methodologies-hero-film">
      {!unavailable && (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          aria-hidden="true"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={FILM.poster}
          tabIndex={-1}
          onTimeUpdate={syncHeadline}
          onSeeking={syncHeadline}
          onSeeked={syncHeadline}
          onLoadedMetadata={syncHeadline}
          onPlaying={() => {
            syncHeadline();
            setStarted(true);
            setLoading(false);
            setNeedsGesture(false);
          }}
          onError={(event) => {
            if (event.currentTarget.error) setUnavailable(true);
          }}
        >
          <source src={FILM.mobileMp4} type="video/mp4" media="(max-width: 767px)" onError={checkSources} />
          <source src={FILM.mp4} type="video/mp4" onError={checkSources} />
          <source src={FILM.webm} type="video/webm" onError={checkSources} />
        </video>
      )}
      {!unavailable && (
        <>
          <div className="methodologies-film-caption" aria-hidden="true" data-testid="methodologies-film-caption">
            <p className="methodologies-film-eyebrow">Wherever you are, Cognirise is with you</p>
            <div key={chapter} className="methodologies-film-chapter">
              <p className="methodologies-film-question">{JOURNEY_HEADLINES[chapter].heading}</p>
              <p className="methodologies-film-headline">{JOURNEY_HEADLINES[chapter].emphasis}</p>
            </div>
            <span className="methodologies-film-progress" aria-hidden="true">
              {String(chapter + 1).padStart(2, "0")} / 07
            </span>
          </div>
          <ol className="sr-only" aria-label="How Cognirise supports your AI journey">
            {JOURNEY_HEADLINES.map(({ heading, emphasis }) => (
              <li key={heading}>{heading} {emphasis}</li>
            ))}
          </ol>
        </>
      )}
      {loading && !needsGesture && !unavailable && (
        <span className="absolute bottom-5 left-5 rounded bg-[#102957]/90 px-3 py-2 text-sm text-white" role="status">
          Loading film…
        </span>
      )}
      {needsGesture && !unavailable && (
        <button
          type="button"
          onClick={playFromGesture}
          data-testid="methodologies-film-play"
          className="absolute bottom-5 left-5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#102957] shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Play film
        </button>
      )}
      {unavailable && (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center text-white" role="alert">
          <p>The film could not load.</p>
          <button
            type="button"
            onClick={() => {
              setStarted(false);
              setLoading(false);
              setUnavailable(false);
            }}
            className="rounded-full border border-white px-5 py-2 font-semibold focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Retry film
          </button>
        </div>
      )}
    </div>
  );
}