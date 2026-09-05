export function scrollToSection(id: string) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "start",
  });
}