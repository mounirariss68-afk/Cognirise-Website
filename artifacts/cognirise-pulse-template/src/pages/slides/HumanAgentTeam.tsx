type HumanAgentTeamProps = {
  illustrationSide?: "left" | "right";
};

export function HumanAgentTeamLayout({ illustrationSide = "right" }: HumanAgentTeamProps) {
  const isRight = illustrationSide === "right";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg">
      <div
        className={
          isRight
            ? "absolute inset-0 bg-[radial-gradient(circle_at_74%_50%,rgba(219,80,158,0.07),transparent_25%)]"
            : "absolute inset-0 bg-[radial-gradient(circle_at_26%_50%,rgba(219,80,158,0.07),transparent_25%)]"
        }
      />

      <svg
        viewBox="0 0 840 560"
        className={
          isRight
            ? "absolute left-[73%] top-1/2 h-[56vh] w-[48vw] -translate-x-1/2 -translate-y-1/2"
            : "absolute left-[27%] top-1/2 h-[56vh] w-[48vw] -translate-x-1/2 -translate-y-1/2"
        }
        role="img"
        aria-label="Three people and three digital agents collaborating around a shared project workspace"
      >
        <defs>
          <linearGradient id="hatWorkspace" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#18366d" />
            <stop offset="1" stopColor="#102957" />
          </linearGradient>
          <linearGradient id="hatEnergy" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7659df" />
            <stop offset="0.52" stopColor="#db509e" />
            <stop offset="1" stopColor="#ff775d" />
          </linearGradient>
          <filter id="hatShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="14" stdDeviation="16" floodColor="#102957" floodOpacity=".16" />
          </filter>
        </defs>

        <ellipse cx="420" cy="486" rx="226" ry="28" fill="#102957" opacity=".08" />

        <path d="M420 134C354 134 309 170 277 218" fill="none" stroke="#7659df" strokeWidth="5" strokeLinecap="round" opacity=".72" />
        <path d="M518 177C557 198 581 229 591 266" fill="none" stroke="#db509e" strokeWidth="5" strokeLinecap="round" opacity=".72" />
        <path d="M561 365C528 402 484 420 435 423" fill="none" stroke="#ff775d" strokeWidth="5" strokeLinecap="round" opacity=".72" />
        <path d="M326 404C286 382 259 351 247 314" fill="none" stroke="#db509e" strokeWidth="5" strokeLinecap="round" opacity=".72" />
        <circle cx="420" cy="134" r="7" fill="#7659df" />
        <circle cx="518" cy="177" r="7" fill="#db509e" />
        <circle cx="591" cy="266" r="7" fill="#db509e" />
        <circle cx="561" cy="365" r="7" fill="#ff775d" />
        <circle cx="435" cy="423" r="7" fill="#ff775d" />
        <circle cx="326" cy="404" r="7" fill="#db509e" />
        <circle cx="247" cy="314" r="7" fill="#db509e" />
        <circle cx="277" cy="218" r="7" fill="#7659df" />

        <ellipse cx="420" cy="292" rx="166" ry="102" fill="url(#hatWorkspace)" filter="url(#hatShadow)" />
        <ellipse cx="420" cy="278" rx="166" ry="102" fill="#ffffff" stroke="#d9deea" strokeWidth="4" />
        <ellipse cx="420" cy="278" rx="130" ry="74" fill="#f1eff9" />
        <path d="M331 273C365 228 405 251 429 231C456 208 493 218 518 257C538 289 511 322 476 323C444 324 431 349 394 336C360 324 310 304 331 273Z" fill="url(#hatEnergy)" opacity=".2" />
        <circle cx="420" cy="278" r="46" fill="#ffffff" stroke="url(#hatEnergy)" strokeWidth="5" />
        <path d="M394 278H446M420 252V304" stroke="#102957" strokeWidth="7" strokeLinecap="round" />
        <circle cx="359" cy="262" r="10" fill="#7659df" />
        <circle cx="482" cy="252" r="10" fill="#db509e" />
        <circle cx="469" cy="312" r="10" fill="#ff775d" />
        <path d="M369 263L393 272M446 269L472 256M445 294L461 306" fill="none" stroke="#102957" strokeWidth="4" strokeLinecap="round" opacity=".58" />

        <circle cx="269" cy="169" r="31" fill="#efb49c" />
        <path d="M240 169C242 130 294 124 301 164C286 151 267 149 240 169Z" fill="#102957" />
        <path d="M218 264C219 215 239 192 269 192C299 192 320 215 321 264Z" fill="#102957" />
        <path d="M242 209L269 237L296 209" fill="#ffffff" opacity=".94" />
        <path d="M300 230C327 237 344 247 361 261" fill="none" stroke="#efb49c" strokeWidth="14" strokeLinecap="round" />
        <circle cx="365" cy="264" r="10" fill="#efb49c" />

        <circle cx="565" cy="179" r="31" fill="#8f5a47" />
        <path d="M535 175C538 138 588 129 598 166C583 154 562 153 535 175Z" fill="#221f32" />
        <path d="M515 269C516 220 536 198 566 198C596 198 617 220 618 269Z" fill="#7659df" />
        <path d="M539 215L566 242L593 215" fill="#ffffff" opacity=".94" />
        <path d="M535 237C508 241 490 250 473 264" fill="none" stroke="#8f5a47" strokeWidth="14" strokeLinecap="round" />
        <circle cx="469" cy="267" r="10" fill="#8f5a47" />

        <circle cx="329" cy="408" r="31" fill="#d58c68" />
        <path d="M299 405C302 368 350 359 361 397C343 385 325 385 299 405Z" fill="#5a302c" />
        <path d="M278 492C280 445 300 426 330 426C360 426 380 445 382 492Z" fill="#db509e" />
        <path d="M303 441L330 468L357 441" fill="#ffffff" opacity=".94" />
        <path d="M357 445C380 424 391 402 402 363" fill="none" stroke="#d58c68" strokeWidth="14" strokeLinecap="round" />
        <circle cx="404" cy="359" r="10" fill="#d58c68" />

        <rect x="405" y="72" width="82" height="82" rx="22" fill="#ffffff" stroke="#7659df" strokeWidth="5" filter="url(#hatShadow)" />
        <path d="M426 105H466M426 121H454" fill="none" stroke="#102957" strokeWidth="6" strokeLinecap="round" />
        <circle cx="427" cy="89" r="6" fill="#7659df" />
        <circle cx="465" cy="132" r="6" fill="#db509e" />

        <rect x="596" y="283" width="82" height="82" rx="22" fill="#ffffff" stroke="#db509e" strokeWidth="5" filter="url(#hatShadow)" />
        <circle cx="621" cy="308" r="8" fill="#102957" />
        <circle cx="653" cy="308" r="8" fill="#102957" />
        <path d="M620 338C631 347 643 347 654 338" fill="none" stroke="#ff775d" strokeWidth="6" strokeLinecap="round" />
        <path d="M637 283V267M596 324H580M678 324H694" fill="none" stroke="#db509e" strokeWidth="5" strokeLinecap="round" />

        <rect x="166" y="291" width="82" height="82" rx="22" fill="#ffffff" stroke="#ff775d" strokeWidth="5" filter="url(#hatShadow)" />
        <path d="M187 332L201 318L215 339L230 311" fill="none" stroke="#102957" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="187" cy="350" r="6" fill="#7659df" />
        <circle cx="230" cy="350" r="6" fill="#ff775d" />
        <path d="M207 291V275M166 332H150M248 332H264" fill="none" stroke="#ff775d" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function HumanAgentTeam() {
  return <HumanAgentTeamLayout illustrationSide="right" />;
}