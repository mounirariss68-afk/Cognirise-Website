import React from "react";
import { fsCredit } from "@/content/financial-services-launch";

export function FsCreditFlow() {
  return (
    <figure style={{ margin: 0 }} aria-labelledby="fs-credit-caption" data-testid="diagram-fs-credit">
      <figcaption id="fs-credit-caption" className="fs-src" style={{ marginBottom: 14 }}>{fsCredit.label}: two lanes of work</figcaption>
      <div className="fs-flow">
        <div className="fs-lane-label">AI and systems</div>
        <ol className="fs-lane system" aria-label="AI and system steps">
          {fsCredit.systemLane.map((s) => <li key={s}>{s}</li>)}
        </ol>
        <div className="fs-boundary" role="note">Approval boundary: nothing past this line happens without a person</div>
        <div className="fs-lane-label">People</div>
        <ol className="fs-lane human" aria-label="Human steps">
          {fsCredit.humanLane.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </div>
      <div className="fs-audit" data-testid="text-fs-audit">
        <strong>Audit record links:</strong>
        {fsCredit.audit.map((a) => <span key={a}>{a}</span>)}
      </div>
    </figure>
  );
}

export function FsTransferTable() {
  return (
    <div className="fs-table-wrap" tabIndex={0} role="region" aria-label="Who does the work, before and after" data-testid="table-fs-transfer">
      <table className="fs-table" style={{ minWidth: 520 }}>
        <thead><tr><th scope="col">Task</th><th scope="col">Before</th><th scope="col">After</th></tr></thead>
        <tbody>
          {fsCredit.transfer.map((t) => (
            <tr key={t.task}><th scope="row">{t.task}</th><td>{t.before}</td><td>{t.after}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Caller path with a separate transaction branch and a human exception branch. */
export function FsVoiceFlow() {
  const box = (x: number, y: number, w: number, label: string[], tone: "ink" | "violet" | "coral") => {
    const stroke = tone === "coral" ? "#ff775d" : tone === "violet" ? "#7659df" : "#102957";
    return (
      <g>
        <rect x={x} y={y} width={w} height={56} fill={tone === "coral" ? "#fff3ef" : "#fdfbf7"} stroke={stroke} strokeWidth={1.5} />
        <rect x={x} y={y} width={4} height={56} fill={stroke} />
        {label.map((l, i) => (
          <text key={l} x={x + 16} y={y + (label.length === 1 ? 33 : 25 + i * 17)} fontSize={13} fontWeight={600} fill="#102957" fontFamily="Inter, sans-serif">{l}</text>
        ))}
      </g>
    );
  };
  return (
    <figure style={{ margin: 0, overflowX: "auto" }} tabIndex={0} aria-label="Voice call handling diagram. Scroll horizontally on small screens." data-testid="diagram-fs-voice">
      <svg className="fs-voice-svg" style={{ minWidth: 560 }} viewBox="0 0 560 360" role="img" aria-labelledby="fs-voice-title fs-voice-desc">
        <title id="fs-voice-title">Voice call handling path</title>
        <desc id="fs-voice-desc">A caller passes identity and consent checks. Questions receive approved information; transactions run only as permitted actions. Both end with result confirmation. Exceptions, advice and disputes branch to the human service team with context recorded.</desc>
        <defs><marker id="fs-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#102957" /></marker></defs>
        {box(10, 10, 150, ["Caller"], "ink")}
        {box(10, 110, 150, ["Identity and", "consent checks"], "violet")}
        {box(220, 60, 160, ["Answer a question:", "approved information"], "violet")}
        {box(220, 160, 160, ["Start a transaction:", "permitted action only"], "violet")}
        {box(420, 110, 130, ["Confirm the", "result"], "ink")}
        {box(160, 280, 240, ["Human service team", "conversation and checks attached"], "coral")}
        <g stroke="#102957" strokeWidth={1.5} fill="none" markerEnd="url(#fs-arrow)">
          <path d="M85 66 V106" />
          <path d="M160 130 H190 V88 H216" />
          <path d="M160 146 H190 V188 H216" />
          <path d="M380 88 H400 V130 H416" />
          <path d="M380 188 H400 V146 H416" />
        </g>
        <path d="M85 166 V308 H156" stroke="#ff775d" strokeWidth={1.5} strokeDasharray="5 4" fill="none" markerEnd="url(#fs-arrow)" />
        <text x={94} y={250} fontSize={12} fill="#b43d22" fontFamily="Inter, sans-serif" fontWeight={600}>Exception, advice, dispute</text>
      </svg>
    </figure>
  );
}
