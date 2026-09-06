const base = import.meta.env.BASE_URL;

export default function DisruptiveConsulting() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#f8f7f4]">
      <img
        src={`${base}images/disruptive-consulting-pulse.png`}
        crossOrigin="anonymous"
        alt="A rigid traditional consulting machine fractures through a Pulse current and reforms as an open adaptive operating system"
        className="absolute inset-0 h-full w-full object-contain"
      />
    </div>
  );
}