import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/assets";
import { PulseImage } from "@/components/ui/pulse-image";

const PHRASES = [
  { id: "p1", main: "Intelligence", highlight: "becomes momentum." },
  { id: "p2", main: "Strategy.", highlight: "Engineered." },
  { id: "p3", main: "48-hour prototype.", highlight: "Delivered." },
  { id: "p4", main: "Agents.", highlight: "Governed." },
  { id: "p5", main: "Work.", highlight: "In production." },
  { id: "p6", logo: true, sub: "AI-native advisory & engineering." }
];

export function HeroFilm() {
  const [index, setIndex] = useState(0);
  const [videoUnavailable, setVideoUnavailable] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;
    
    // 6 phrases over 30 seconds = 5s per phrase
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % PHRASES.length);
    }, 5000);
    
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
      if ((videoRef.current?.readyState ?? 0) < HTMLMediaElement.HAVE_CURRENT_DATA) {
        setVideoUnavailable(true);
      }
    }, 8000);

    return () => {
      window.clearTimeout(playbackAttempt);
      window.clearTimeout(loadingGuard);
    };
  }, [prefersReducedMotion]);

  if (prefersReducedMotion || videoUnavailable) {
    return (
      <div className="w-full h-full relative">
        <PulseImage
          src={assetUrl("/images/cognirise/pulse-hero-film-poster.jpg")}
          alt="Cognirise AI-native advisory and engineering." 
          className="w-full h-full object-cover"
          eager
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071936]/40 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/50 via-transparent to-transparent" />
        <div className="absolute z-10 left-6 lg:left-[34px] bottom-14 lg:bottom-[29px] text-white">
          <img
            src={assetUrl("/images/cognirise/logo-white.svg")}
            alt="Cognirise"
            className="w-[clamp(180px,18vw,300px)] h-auto drop-shadow-lg"
          />
          <div className="text-[12px] tracking-[0.08em] uppercase opacity-90 mt-2">
            AI-native advisory & engineering.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative group">
      {/* Video Background */}
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
        poster={assetUrl("/images/cognirise/pulse-hero-film-poster.jpg")}
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src={assetUrl("/videos/cognirise/pulse-hero-motion.mp4")} type="video/mp4" />
        <source src={assetUrl("/videos/cognirise/pulse-hero-motion.webm")} type="video/webm" />
      </video>

      <p className="sr-only">
        Intelligence becomes momentum. Strategy. Engineered. 48-hour prototype.
        Delivered. Agents. Governed. Work. In production. Cognirise — AI-native
        advisory &amp; engineering.
      </p>

      {/* Overlays for depth and text legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#071936]/50 via-transparent to-[#071936]/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/70 via-transparent to-transparent" />
      
      {/* Cinematic Text Sequence */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <AnimatePresence mode="sync">
          <motion.div
            key={PHRASES[index].id}
            aria-hidden="true"
            initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -15, filter: "blur(4px)", transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-16 lg:bottom-14 left-8 lg:left-12 flex flex-col items-start w-full pr-8 lg:pr-12"
          >
            {PHRASES[index].logo ? (
              // Final Lockup
              <>
                <img
                  src={assetUrl("/images/cognirise/logo-white.svg")}
                  alt=""
                  className="w-[clamp(180px,18vw,300px)] h-auto drop-shadow-lg"
                />
                <div className="text-[11px] lg:text-[13px] tracking-[0.15em] uppercase text-[hsl(var(--brand-pink))] mt-3 font-semibold drop-shadow-md">
                  {PHRASES[index].sub}
                </div>
              </>
            ) : (
              // Standard Phrases
              <h2 className="font-display font-semibold text-[clamp(28px,4vw,48px)] tracking-[-0.05em] leading-[1.1] text-white max-w-[80%] drop-shadow-lg">
                {PHRASES[index].main}{" "}
                <span className="text-[hsl(var(--brand-coral))] block sm:inline mt-1 sm:mt-0">
                  {PHRASES[index].highlight}
                </span>
              </h2>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Decorative architectural/motion lines overlay */}
      <div className="absolute top-6 right-6 w-12 border-t-[1.5px] border-white/20" />
      <div className="absolute top-6 right-6 h-12 border-r-[1.5px] border-white/20" />
      <div className="absolute bottom-6 left-6 w-12 border-b-[1.5px] border-white/20" />
      <div className="absolute bottom-6 left-6 h-12 border-l-[1.5px] border-white/20" />
    </div>
  );
}
