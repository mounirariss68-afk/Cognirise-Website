import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/assets";
import { PulseImage } from "@/components/ui/pulse-image";
import { HERO_PHRASES } from "@/site/content/home";

const FILM = {
  mp4: "/videos/cognirise/pulse-hero-motion.mp4",
  webm: "/videos/cognirise/pulse-hero-motion.webm",
  poster: "/images/cognirise/pulse-hero-film-poster.jpg",
};

/**
 * The home hero film: the existing video and poster with the rotating lines.
 * Only the lines changed. The headline beside it renders at once; nothing
 * waits for the video or a network lookup.
 */
export function HomeFilm() {
  const [index, setIndex] = useState(0);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % HERO_PHRASES.length), 5000);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const playbackAttempt = window.setTimeout(() => {
      const video = videoRef.current;
      if (!video || !video.paused) return;
      void video.play().catch(() => setVideoUnavailable(true));
    }, 250);
    const loadingGuard = window.setTimeout(() => {
      if ((videoRef.current?.readyState ?? 0) < HTMLMediaElement.HAVE_CURRENT_DATA) setVideoUnavailable(true);
    }, 8000);
    return () => {
      window.clearTimeout(playbackAttempt);
      window.clearTimeout(loadingGuard);
    };
  }, [prefersReducedMotion]);

  const phrase = HERO_PHRASES[index];

  if (prefersReducedMotion || videoUnavailable) {
    return (
      <div className="relative h-full w-full">
        <PulseImage src={assetUrl(FILM.poster)} alt="Cognirise: AI advisory, engineering and platform." className="h-full w-full object-cover" eager />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071936]/40 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/50 via-transparent to-transparent" />
        <div className="absolute bottom-14 left-6 z-10 text-white lg:bottom-[29px] lg:left-[34px]">
          <img src={assetUrl("/images/cognirise/logo-white.svg")} alt="Cognirise" className="h-auto w-[clamp(180px,18vw,300px)] drop-shadow-lg" />
          <div className="mt-2 text-[12px] uppercase tracking-[0.08em] opacity-90">AI advisory, engineering and platform.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative h-full w-full">
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        onError={() => setVideoUnavailable(true)}
        poster={assetUrl(FILM.poster)}
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={assetUrl(FILM.mp4)} type="video/mp4" />
        <source src={assetUrl(FILM.webm)} type="video/webm" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-r from-[#071936]/50 via-transparent to-[#071936]/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/70 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 z-10">
        <AnimatePresence mode="sync">
          <motion.div
            key={phrase.id}
            aria-hidden="true"
            initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -15, filter: "blur(4px)", transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-16 left-8 flex w-full flex-col items-start pr-8 lg:bottom-14 lg:left-12 lg:pr-12"
          >
            {"logo" in phrase ? (
              <>
                <img src={assetUrl("/images/cognirise/logo-white.svg")} alt="" className="h-auto w-[clamp(180px,18vw,300px)] drop-shadow-lg" />
                <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--brand-pink))] drop-shadow-md lg:text-[13px]">{phrase.sub}</div>
              </>
            ) : (
              <p className="max-w-[80%] font-display text-[clamp(28px,4vw,48px)] font-semibold leading-[1.1] tracking-[-0.05em] text-white drop-shadow-lg">
                {phrase.main}{" "}
                <span className="mt-1 block text-[hsl(var(--brand-coral))] sm:mt-0 sm:inline">{phrase.highlight}</span>
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="absolute right-6 top-6 w-12 border-t-[1.5px] border-white/20" />
      <div className="absolute right-6 top-6 h-12 border-r-[1.5px] border-white/20" />
      <div className="absolute bottom-6 left-6 w-12 border-b-[1.5px] border-white/20" />
      <div className="absolute bottom-6 left-6 h-12 border-l-[1.5px] border-white/20" />
    </div>
  );
}
