import { useState } from "react";
import { assetUrl } from "@/lib/assets";

const poster = assetUrl("/media/platforms/cognios-rotation-poster.jpg");
const fallback = assetUrl("/media/platforms/cognios-rotation-fallback.jpg");

export function PlatformsHeroMedia({
  fallbackSrc = fallback,
  fallbackAlt = "A layered CogniOS ecosystem connected by a luminous central spine.",
  objectPosition,
}: {
  fallbackSrc?: string;
  fallbackAlt?: string;
  objectPosition?: string;
} = {}) {
  const [playbackFailed, setPlaybackFailed] = useState(false);

  return (
    <div className="platforms-hero-media absolute inset-0" data-playback-failed={playbackFailed}>
      <img
        src={fallbackSrc}
        alt={fallbackAlt}
        style={{ objectPosition }}
        className="platforms-hero-fallback absolute inset-0 h-full w-full object-cover"
      />
      {!playbackFailed && (
        <video
          className="platforms-hero-video absolute inset-0 h-full w-full object-cover"
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onError={() => setPlaybackFailed(true)}
        >
          <source src={assetUrl("/media/platforms/cognios-rotation.webm")} type="video/webm" />
          <source src={assetUrl("/media/platforms/cognios-rotation.mp4")} type="video/mp4" />
        </video>
      )}
    </div>
  );
}