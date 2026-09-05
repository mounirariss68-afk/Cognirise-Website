import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

const REVEAL_SELECTOR = "section, article";

export function PulseMotionPage({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const isHome = pathname === "/";

  useEffect(() => {
    const root = rootRef.current;
    if (!root || isHome) return;

    const cleanups: Array<() => void> = [];
    const reveals = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR))
      .filter((element) => !element.closest(".co-architecture-stage"));

    reveals.forEach((element, index) => {
      element.dataset.pulseReveal = index % 3 === 0 ? "arrival" : index % 2 === 0 ? "right" : "left";
    });

    if (reducedMotion || !("IntersectionObserver" in window)) {
      reveals.forEach((element) => {
        element.dataset.pulseVisible = "true";
      });
    } else {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            (entry.target as HTMLElement).dataset.pulseVisible = "true";
            revealObserver.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.06 },
      );

      reveals.forEach((element, index) => {
        if (index === 0) element.dataset.pulseVisible = "true";
        else revealObserver.observe(element);
      });
      cleanups.push(() => revealObserver.disconnect());
    }

    const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
    images.forEach((image, index) => {
      image.dataset.pulseImage = index % 2 === 0 ? "forward" : "return";
      image.decoding = "async";
      if (index > 0 && !image.hasAttribute("loading")) image.loading = "lazy";

      const markFailed = () => {
        image.dataset.pulseLoaded = "error";
        image.parentElement?.setAttribute("data-pulse-image-error", "true");
      };
      const markReady = () => {
        if (image.naturalWidth > 0) image.dataset.pulseLoaded = "true";
        else markFailed();
      };

      if (image.complete) {
        markReady();
      } else {
        image.addEventListener("load", markReady, { once: true });
        image.addEventListener("error", markFailed, { once: true });
        cleanups.push(() => {
          image.removeEventListener("load", markReady);
          image.removeEventListener("error", markFailed);
        });
      }
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [isHome, pathname, reducedMotion]);

  return (
    <motion.div
      key={pathname}
      ref={rootRef}
      className="pulse-motion-page"
      data-pulse-motion-page={isHome ? "home" : "interior"}
      initial={isHome || reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.48, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}