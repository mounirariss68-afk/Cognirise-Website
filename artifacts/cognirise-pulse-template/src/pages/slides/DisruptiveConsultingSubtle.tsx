const base = import.meta.env.BASE_URL;

export default function DisruptiveConsultingSubtle() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#f8f7f4]">
      <img
        src={`${base}images/disruptive-consulting-pulse-subtle.png`}
        crossOrigin="anonymous"
        alt="A restrained Pulse ribbon transforms a layered consulting system into a calm open operating model"
        className="absolute inset-0 h-full w-full object-contain"
      />
    </div>
  );
}