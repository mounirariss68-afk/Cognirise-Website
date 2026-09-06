const base = import.meta.env.BASE_URL;

export default function PulseJourneyVisual() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#f8f7f4]">
      <img
        src={`${base}images/pulse-journey-text-free-4k.png`}
        crossOrigin="anonymous"
        alt="Four-stage enterprise transformation journey connected by a continuous Pulse energy ribbon"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}