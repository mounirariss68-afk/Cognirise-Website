import { useState } from "react";

export function PulseImage({
  src,
  alt,
  className = "",
  style,
  eager = false,
  fallbackColor,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  eager?: boolean;
  fallbackColor?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`bg-[linear-gradient(135deg,#102957_0%,#2d2868_46%,#db509e_100%)] ${className}`}
        style={fallbackColor ? { backgroundColor: fallbackColor, background: 'none', ...style } : style}
        role="img"
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      onError={() => setFailed(true)}
      data-pulse-image-resilient="true"
    />
  );
}
