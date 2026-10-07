/** Scoped Pulse styles for the Financial Services launch page. */
export const fsStyles = `
.fs-page{--ink:#102957;--deep:#071936;--paper:#fdfbf7;--ivory:#f7f2ea;--lilac:#f1edfb;--line:#cbd3e1;--muted:#4a5f80;--violet:#7659df;--pink:#db509e;--coral:#ff775d;background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;overflow:hidden}
.fs-page *{box-sizing:border-box}
.fs-page h1,.fs-page h2,.fs-page h3{font-family:Comfortaa,sans-serif;margin:0;letter-spacing:-.04em}
.fs-page :focus-visible{outline:3px solid var(--coral);outline-offset:4px}
.fs-kicker{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--ink)}
.fs-kicker::before{content:"";width:26px;height:2px;background:linear-gradient(90deg,var(--violet),var(--pink),var(--coral))}
.fs-src{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.fs-hero{display:grid;grid-template-columns:.9fr 1.1fr;gap:5vw;padding:34px 4.8vw 64px}
.fs-hero-copy{display:flex;flex-direction:column;justify-content:space-between;min-height:600px;gap:40px}
.fs-hero-top{display:flex;flex-direction:column;gap:28px}
.fs-hero-bottom h1{font-size:clamp(38px,4.8vw,74px);line-height:1.02;max-width:720px}
.fs-hero-bottom p{max-width:560px;margin:26px 0 0;color:var(--muted);font-size:18px;line-height:1.65}
.fs-hero-actions{display:flex;flex-wrap:wrap;align-items:center;gap:26px;margin-top:34px}
.fs-text-link{display:inline-flex;align-items:center;gap:8px;border-bottom:1px solid var(--pink);padding-bottom:4px;font-size:14px;font-weight:600;color:var(--ink);text-decoration:none}
.fs-hero-image{height:100%;min-height:600px;overflow:hidden;clip-path:polygon(10% 0,100% 0,100% 91%,0 100%,0 12%);background:var(--deep)}
.fs-hero-image img{width:100%;height:100%;object-fit:cover;display:block}
.fs-section{padding:96px 4.8vw;border-top:1px solid var(--line)}
.fs-section.alt{background:var(--ivory)}
.fs-head{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:5vw;align-items:end;margin-bottom:48px}
.fs-head h2{font-size:clamp(30px,3.4vw,52px);line-height:1.06;margin-top:18px}
.fs-head p{margin:0;max-width:620px;color:var(--muted);font-size:17px;line-height:1.65}
.fs-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.fs-table{width:100%;border-collapse:collapse;font-size:15px;line-height:1.5;min-width:760px}
.fs-table caption{text-align:left;padding-bottom:14px}
.fs-table th,.fs-table td{text-align:left;vertical-align:top;padding:20px 18px;border-bottom:1px solid var(--line)}
.fs-table thead th{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:700;border-bottom:2px solid var(--ink)}
.fs-table tbody th{font-family:Comfortaa,sans-serif;font-size:17px;font-weight:700;width:22%}
.fs-table ul{margin:0;padding-left:18px}.fs-table li+li{margin-top:4px}
.fs-table .fs-human{color:var(--ink);font-weight:600}
.fs-table tr.fs-target td,.fs-table tr.fs-target th{background:var(--lilac);font-size:14px}
.fs-table tr.fs-target th{font-family:Inter,sans-serif;font-size:13px}
.fs-note{margin:20px 0 0;max-width:820px;font-size:14px;line-height:1.6;color:var(--muted);padding-left:16px;border-left:2px solid var(--pink)}
.fs-projects{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-top:2px solid var(--ink)}
.fs-project{padding:30px 32px 34px 0;border-bottom:1px solid var(--line)}
.fs-project:nth-child(odd){border-right:1px solid var(--line)}.fs-project:nth-child(even){padding-left:32px}
.fs-project h3{font-size:22px;line-height:1.2;margin-bottom:20px}
.fs-project dl{display:grid;grid-template-columns:130px 1fr;gap:10px 18px;margin:0;font-size:15px;line-height:1.5}
.fs-project dt{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding-top:3px}
.fs-project dd{margin:0}
.fs-flow{display:grid;grid-template-columns:150px 1fr;gap:0;border-top:2px solid var(--ink)}
.fs-lane-label{padding:26px 18px 26px 0;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid var(--line)}
.fs-lane{list-style:none;margin:0;padding:22px 0;display:flex;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--line);counter-reset:step}
.fs-lane li{position:relative;flex:1 1 150px;padding:16px 16px 16px 18px;background:#fff8;border:1px solid var(--line);font-size:14px;line-height:1.45;font-weight:600}
.fs-lane.system li{border-left:3px solid var(--violet)}
.fs-lane.human li{border-left:3px solid var(--coral);background:#fff3ef}
.fs-boundary{grid-column:1/-1;display:flex;align-items:center;gap:14px;padding:14px 0;font-size:13px;font-weight:700;color:var(--pink)}
.fs-boundary::before,.fs-boundary::after{content:"";flex:1;height:0;border-top:2px dashed var(--pink)}
.fs-audit{display:flex;flex-wrap:wrap;gap:10px 28px;align-items:center;margin-top:26px;font-size:14px}
.fs-audit strong{font-family:Comfortaa,sans-serif}
.fs-audit span{display:inline-flex;align-items:center;gap:8px}.fs-audit span::before{content:"";width:8px;height:8px;background:var(--violet);transform:rotate(45deg)}
.fs-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:5vw;margin-top:56px}
.fs-split h3{font-size:22px;margin-bottom:18px}
.fs-voice-svg{width:100%;height:auto;display:block}
.fs-launch{list-style:none;margin:0;padding:0;border-top:2px solid var(--ink)}
.fs-launch li{display:grid;grid-template-columns:210px 1fr;gap:18px;padding:16px 0;border-bottom:1px solid var(--line);font-size:15px;line-height:1.5}
.fs-launch strong{font-weight:700}
.fs-cases{list-style:none;margin:0;padding:0;border-top:2px solid var(--ink)}
.fs-case{display:grid;grid-template-columns:200px repeat(3,minmax(0,1fr));gap:28px;padding:28px 0;border-bottom:1px solid var(--line);font-size:15px;line-height:1.55}
.fs-case h3{font-size:18px;line-height:1.25}
.fs-case .fs-src{display:block;margin-bottom:6px}
.fs-case p{margin:0}
.fs-case .fs-result{font-weight:600}
.fs-close{display:grid;grid-template-columns:1fr 1fr;gap:5vw;padding:104px 4.8vw;background:var(--lilac);border-top:1px solid var(--line)}
.fs-close h2{font-size:clamp(30px,3.6vw,54px);line-height:1.06;margin:18px 0 24px}
.fs-close p{color:var(--muted);font-size:17px;line-height:1.65;max-width:560px;margin:0 0 32px}
.fs-check{list-style:none;margin:0;padding:0;border-top:2px solid var(--ink)}
.fs-check li{display:flex;gap:14px;padding:16px 0;border-bottom:1px solid var(--line);font-weight:600}
.fs-check li::before{content:"";flex:none;width:10px;height:10px;margin-top:6px;background:linear-gradient(135deg,var(--violet),var(--coral))}
.fs-research{padding:64px 4.8vw 80px;border-top:1px solid var(--line)}
.fs-research ol{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 5vw;margin:28px 0 0;padding:0;list-style:none}
.fs-research li{font-size:14px;line-height:1.6;color:var(--muted)}
.fs-research a{color:var(--ink);font-weight:700;text-decoration:underline;text-decoration-color:var(--pink);text-underline-offset:3px}
.fs-research em{display:block;margin-top:6px;font-style:normal;font-size:13px}
@media (max-width:1023px){
.fs-hero{grid-template-columns:1fr;padding:24px 20px 48px}
.fs-hero-copy{min-height:0;gap:32px}.fs-hero-image{height:360px;min-height:0;order:2}
.fs-section{padding:64px 20px}.fs-head,.fs-split,.fs-close{grid-template-columns:1fr}
.fs-projects{grid-template-columns:1fr}.fs-project,.fs-project:nth-child(even){padding:26px 0;border-right:0}
.fs-flow{grid-template-columns:1fr}.fs-lane-label{border-bottom:0;padding:18px 0 0}
.fs-lane{flex-direction:column}.fs-lane li{flex:none}
.fs-case{grid-template-columns:1fr;gap:12px}
.fs-launch li{grid-template-columns:1fr;gap:4px}
.fs-close{padding:64px 20px}.fs-research{padding:48px 20px}.fs-research ol{grid-template-columns:1fr}
}
@media (max-width:640px){.fs-project dl{grid-template-columns:1fr;gap:4px}.fs-project dd{margin-bottom:10px}}
`;
