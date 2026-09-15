import React, { useState, useRef } from 'react';
import { Maximize, Minimize, RefreshCcw, FileText } from 'lucide-react';

export function EngineeringPlan({ activeFieldId }: { activeFieldId: string }) {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale(s => Math.min(s * 1.5, 8));
  const handleZoomOut = () => setScale(s => Math.max(s / 1.5, 1));
  const handleReset = () => {
    setScale(1);
    if (containerRef.current) {
      containerRef.current.scrollTo(0, 0);
    }
  };

  const hlDim = activeFieldId === 'dimension';
  const hlMat = activeFieldId === 'material';
  const hlQty = activeFieldId === 'quantity';

  return (
    <div className="flex flex-col h-full bg-[#f8f9fb] border border-border shadow-inner relative z-0 min-h-[500px] max-h-[700px]">
      {/* Grid background for the viewer */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      
      {/* Header bar */}
      <div className="flex flex-wrap justify-between items-center px-4 py-2 bg-white border-b border-border shadow-sm shrink-0 min-w-0 gap-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700 min-w-0 truncate">
          <FileText size={16} className="text-slate-400 shrink-0" />
          <span className="truncate">DWG: M-104_PUMP_HOUSE_REV_B</span>
        </div>
        <div className="flex gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 shrink-0">
           <button type="button" onClick={handleZoomOut} disabled={scale <= 1} className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-600 disabled:opacity-50 disabled:hover:bg-transparent" aria-label="Zoom Out" data-testid="button-zoom-out"><Minimize size={14}/></button>
           <button onClick={handleReset} className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-600" aria-label="Reset Zoom" data-testid="button-zoom-reset"><RefreshCcw size={14}/></button>
           <button type="button" onClick={handleZoomIn} disabled={scale >= 8} className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-600 disabled:opacity-50 disabled:hover:bg-transparent" aria-label="Zoom In" data-testid="button-zoom-in"><Maximize size={14}/></button>
        </div>
      </div>

      {/* Canvas container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4 md:p-8 relative bg-slate-50"
        tabIndex={0}
        role="region"
        aria-label="Engineering drawing viewer. Use zoom controls and arrow keys to inspect the plan."
        data-engineering-plan
        data-zoom={scale}
      >
         <div 
           style={{ 
             width: `${100 * scale}%`,
           }} 
           className="bg-white shadow-xl border border-slate-300 mx-auto"
         >
           <svg 
             viewBox="0 0 2000 1300" 
             className="w-full h-auto text-slate-800" 
             style={{ fontFamily: 'monospace' }}
             role="img"
             aria-label="Engineering Plan: Pump House General Arrangement"
           >
             <title>Pump House General Arrangement</title>
             <desc>
               Detailed fictional engineering plan showing a pump house with three pump skids (P-101A, P-101B, P-101C).
               {hlDim ? " Evidence: Dimension chain showing 4500mm grid spacing between Grid 2 and 3." : ""}
               {hlMat ? " Evidence: Floor slab hatched as Reinforced Concrete Slab matching legend." : ""}
               {hlQty ? " Evidence: Three pump units present, with P-101C enclosed in a Revision B cloud." : ""}
             </desc>

             <defs>
               <pattern id="concrete" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(45)">
                 <rect width="40" height="40" fill="#f8f8f8" />
                 <line x1="0" y1="0" x2="0" y2="40" stroke="#d1d5db" strokeWidth="1" />
                 <circle cx="20" cy="20" r="1.5" fill="#9ca3af" />
                 <circle cx="10" cy="30" r="1" fill="#9ca3af" />
                 <circle cx="30" cy="10" r="1" fill="#9ca3af" />
               </pattern>
               <pattern id="concrete-hl" patternUnits="userSpaceOnUse" width="40" height="40" patternTransform="rotate(45)">
                 <rect width="40" height="40" fill="hsl(var(--brand-violet) / 0.15)" />
                 <line x1="0" y1="0" x2="0" y2="40" stroke="hsl(var(--brand-violet) / 0.4)" strokeWidth="1" />
                 <circle cx="20" cy="20" r="1.5" fill="hsl(var(--brand-violet))" />
                 <circle cx="10" cy="30" r="1" fill="hsl(var(--brand-violet))" />
                 <circle cx="30" cy="10" r="1" fill="hsl(var(--brand-violet))" />
               </pattern>

               <g id="pump-skid">
                 {/* Skid base (center is 0,0) */}
                 <rect x="-90" y="-140" width="180" height="280" fill="#f8fafc" stroke="#334155" strokeWidth="2" strokeDasharray="10,5"/>
                 
                 {/* Main pump body (Top) */}
                 <circle cx="0" cy="-80" r="45" fill="#fff" stroke="#0f172a" strokeWidth="2.5" />
                 <circle cx="0" cy="-80" r="18" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1" />
                 
                 {/* Motor / Drive (Bottom) */}
                 <rect x="-25" y="-10" width="50" height="100" fill="#fff" stroke="#0f172a" strokeWidth="2.5" />
                 <rect x="-35" y="90" width="70" height="40" fill="#fff" stroke="#0f172a" strokeWidth="2.5" />
                 
                 {/* Shaft / Coupling */}
                 <line x1="0" y1="-35" x2="0" y2="-10" stroke="#0f172a" strokeWidth="4" />
                 
                 {/* Clearance boundary */}
                 <rect x="-130" y="-170" width="260" height="340" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,4" opacity="0.4" />
               </g>

               {/* Vertical Valve (Flow is Up/Down) */}
               <g id="valve-v">
                 <path d="M -12,-15 L 12,-15 L -12,15 L 12,15 Z" fill="#fff" stroke="#0f172a" strokeWidth="2" />
               </g>
               
               {/* Horizontal Valve (Flow is Left/Right) */}
               <g id="valve-h">
                 <path d="M -15,-12 L -15,12 L 15,-12 L 15,12 Z" fill="#fff" stroke="#0f172a" strokeWidth="2" />
               </g>
             </defs>

             {/* Background */}
             <rect width="2000" height="1300" fill="#ffffff" />

             {/* Grid Lines */}
             <g stroke="#cbd5e1" strokeDasharray="25,10,5,10" strokeWidth="1.5">
               {/* Vertical */}
               <line x1="200" y1="180" x2="200" y2="1020" />
               <line x1="650" y1="180" x2="650" y2="1020" />
               <line x1="1100" y1="180" x2="1100" y2="1020" />
               <line x1="1550" y1="180" x2="1550" y2="1020" />
               {/* Horizontal */}
               <line x1="180" y1="200" x2="1570" y2="200" />
               <line x1="180" y1="650" x2="1570" y2="650" />
               <line x1="180" y1="1000" x2="1570" y2="1000" />
             </g>

             {/* Floor Slab (Material Evidence) */}
             <g data-engineering-evidence="material" data-active={hlMat}>
               <rect 
                 x="220" y="220" width="1310" height="760" 
                 fill={hlMat ? "url(#concrete-hl)" : "url(#concrete)"} 
                 className="transition-all duration-300"
               />
               {hlMat && (
                 <rect x="220" y="220" width="1310" height="760" fill="none" stroke="hsl(var(--brand-violet))" strokeWidth="4" className="pointer-events-none" />
               )}
             </g>

             {/* Concrete Walls */}
             <g fill="#e2e8f0" stroke="#475569" strokeWidth="2">
                <rect x="180" y="180" width="1390" height="40" />
                <rect x="180" y="980" width="1390" height="40" />
                <rect x="180" y="220" width="40" height="760" />
                <rect x="1530" y="220" width="40" height="230" />
                <rect x="1530" y="700" width="40" height="280" />
             </g>

             {/* Double-leaf Door */}
             <g stroke="#0f172a" strokeWidth="3" fill="none">
               {/* Top Leaf */}
               <line x1="1530" y1="450" x2="1405" y2="450" />
               <path d="M 1405,450 A 125 125 0 0 0 1530,575" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6,4" />
               {/* Bottom Leaf */}
               <line x1="1530" y1="700" x2="1405" y2="700" />
               <path d="M 1405,700 A 125 125 0 0 1 1530,575" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6,4" />
             </g>

             {/* External Piping Headers */}
             {/* Suction Header DN300 */}
             <g stroke="#0f172a" strokeWidth="8" fill="none">
               <line x1="100" y1="260" x2="1450" y2="260" />
             </g>
             <g fill="#0f172a">
               <polygon points="150,250 170,260 150,270" />
               <polygon points="1400,250 1420,260 1400,270" />
             </g>
             <text x="100" y="245" fontSize="16" fontWeight="bold" fill="#0f172a">DN300 SUCTION FROM TANK T-501</text>
             
             {/* Discharge Header DN250 */}
             <g stroke="#0f172a" strokeWidth="6" fill="none">
               <line x1="350" y1="940" x2="1600" y2="940" />
             </g>
             <g fill="#0f172a">
               <polygon points="380,930 400,940 380,950" />
               <polygon points="1550,930 1570,940 1550,950" />
             </g>
             <text x="1600" y="925" fontSize="16" fontWeight="bold" fill="#0f172a" textAnchor="end">DN250 DISCHARGE TO PROCESS</text>

             {/* Branch Lines to Pumps */}
             <g fill="none" stroke="#0f172a" strokeWidth="4">
                {/* P-101A (Skid Center 425) */}
                <line x1="425" y1="260" x2="425" y2="475" />
                <path d="M 470 520 L 520 520 L 520 940" />
                {/* P-101B (Skid Center 875) */}
                <line x1="875" y1="260" x2="875" y2="475" />
                <path d="M 920 520 L 970 520 L 970 940" />
                {/* P-101C (Skid Center 1325) */}
                <line x1="1325" y1="260" x2="1325" y2="475" />
                <path d="M 1370 520 L 1420 520 L 1420 940" />
             </g>

             {/* Branch Valves */}
             <g>
               <use href="#valve-v" x="425" y="360" />
               <use href="#valve-v" x="520" y="750" />
               
               <use href="#valve-v" x="875" y="360" />
               <use href="#valve-v" x="970" y="750" />
               
               <use href="#valve-v" x="1325" y="360" />
               <use href="#valve-v" x="1420" y="750" />
             </g>

             {/* Equipment: Pump Skids (Quantity Evidence) */}
             <g className={hlQty ? "opacity-100 transition-opacity" : "opacity-90"}>
               {/* P-101A */}
               <g data-equipment-tag="P-101A" className={hlQty ? "text-[hsl(var(--brand-coral))]" : "text-[#0f172a]"}>
                 <use href="#pump-skid" x="425" y="600" />
                 <rect x="365" y="780" width="120" height="30" fill="white" stroke="currentColor" strokeWidth="1" />
                 <text x="425" y="800" textAnchor="middle" fontSize="20" fontWeight="bold" fill="currentColor">P-101A</text>
               </g>

               {/* P-101B */}
               <g data-equipment-tag="P-101B" className={hlQty ? "text-[hsl(var(--brand-coral))]" : "text-[#0f172a]"}>
                 <use href="#pump-skid" x="875" y="600" />
                 <rect x="815" y="780" width="120" height="30" fill="white" stroke="currentColor" strokeWidth="1" />
                 <text x="875" y="800" textAnchor="middle" fontSize="20" fontWeight="bold" fill="currentColor">P-101B</text>
               </g>

               {/* P-101C (with Revision Cloud) */}
               <g data-engineering-evidence="quantity" data-active={hlQty}>
                 <g data-equipment-tag="P-101C" className={hlQty ? "text-[hsl(var(--brand-coral))]" : "text-[#0f172a]"}>
                   <use href="#pump-skid" x="1325" y="600" />
                   <rect x="1265" y="780" width="120" height="30" fill="white" stroke="currentColor" strokeWidth="1" />
                   <text x="1325" y="800" textAnchor="middle" fontSize="20" fontWeight="bold" fill="currentColor">P-101C</text>
                 </g>

                 {/* Revision Cloud P-101C */}
                 <g className={`transition-all duration-500 ${hlQty ? "opacity-100" : "opacity-60"}`}>
                   <path 
                     d="M 1150,350 Q 1200,320 1250,340 Q 1300,300 1350,330 Q 1400,310 1450,340 Q 1500,350 1490,400 Q 1530,450 1480,500 Q 1530,560 1490,620 Q 1520,680 1480,730 Q 1500,780 1440,790 Q 1380,830 1320,790 Q 1250,820 1200,780 Q 1150,810 1120,750 Q 1080,700 1130,640 Q 1080,580 1120,520 Q 1080,450 1130,400 Q 1100,350 1150,350 Z" 
                     fill={hlQty ? "hsl(var(--brand-coral) / 0.1)" : "none"}
                     stroke={hlQty ? "hsl(var(--brand-coral))" : "#ea580c"}
                     strokeWidth={hlQty ? "4" : "2"}
                     strokeDasharray="12,6"
                   />
                   <rect x="1420" y="320" width="160" height="30" fill="white" stroke={hlQty ? "hsl(var(--brand-coral))" : "#ea580c"} strokeWidth="1" />
                   <text x="1500" y="340" textAnchor="middle" fontSize="14" fontWeight="bold" fill={hlQty ? "hsl(var(--brand-coral))" : "#ea580c"}>
                     REV B (ADDITION)
                   </text>
                 </g>
               </g>
             </g>

             {/* Grid Bubbles & Extensions */}
             <g stroke="#0f172a" strokeWidth="1.5">
               {/* Ext lines X */}
               <line x1="200" y1="180" x2="200" y2="40" stroke="#94a3b8" />
               <line x1="650" y1="180" x2="650" y2="40" stroke="#94a3b8" />
               <line x1="1100" y1="180" x2="1100" y2="40" stroke="#94a3b8" />
               <line x1="1550" y1="180" x2="1550" y2="40" stroke="#94a3b8" />
               
               {/* Ext lines Y */}
               <line x1="180" y1="200" x2="40" y2="200" stroke="#94a3b8" />
               <line x1="180" y1="650" x2="40" y2="650" stroke="#94a3b8" />
               <line x1="180" y1="1000" x2="40" y2="1000" stroke="#94a3b8" />
             </g>

             <g stroke="#334155" strokeWidth="1.5" fill="#fff" fontSize="22" textAnchor="middle" dominantBaseline="central">
                {/* X Bubbles */}
                <circle cx="200" cy="160" r="22" /> <text x="200" y="162" fill="#0f172a">1</text>
                <circle cx="650" cy="160" r="22" /> <text x="650" y="162" fill="#0f172a">2</text>
                <circle cx="1100" cy="160" r="22" /> <text x="1100" y="162" fill="#0f172a">3</text>
                <circle cx="1550" cy="160" r="22" /> <text x="1550" y="162" fill="#0f172a">4</text>
                
                {/* Y Bubbles */}
                <circle cx="160" cy="200" r="22" /> <text x="160" y="202" fill="#0f172a">A</text>
                <circle cx="160" cy="650" r="22" /> <text x="160" y="652" fill="#0f172a">B</text>
                <circle cx="160" cy="1000" r="22" /> <text x="160" y="1002" fill="#0f172a">C</text>
             </g>

             {/* Dimension Chains */}
             <g stroke="#0f172a" fill="#0f172a">
               {/* X Overall: 13500 */}
               <line x1="200" y1="60" x2="1550" y2="60" strokeWidth="1.5" />
               <line x1="190" y1="70" x2="210" y2="50" strokeWidth="2.5" />
               <line x1="1540" y1="70" x2="1560" y2="50" strokeWidth="2.5" />
               <text x="875" y="50" textAnchor="middle" fontSize="22" fontWeight="bold">13500</text>
               
               {/* X Segments: 4500 */}
               <line x1="200" y1="110" x2="1550" y2="110" strokeWidth="1.5" />
               <line x1="190" y1="120" x2="210" y2="100" strokeWidth="2.5" />
               <line x1="640" y1="120" x2="660" y2="100" strokeWidth="2.5" />
               <line x1="1090" y1="120" x2="1110" y2="100" strokeWidth="2.5" />
               <line x1="1540" y1="120" x2="1560" y2="100" strokeWidth="2.5" />
               
               <text x="425" y="100" textAnchor="middle" fontSize="22">4500</text>
               <text x="1325" y="100" textAnchor="middle" fontSize="22">4500</text>

               {/* Y Overall: 8000 */}
               <line x1="60" y1="200" x2="60" y2="1000" strokeWidth="1.5" />
               <line x1="50" y1="210" x2="70" y2="190" strokeWidth="2.5" />
               <line x1="50" y1="1010" x2="70" y2="990" strokeWidth="2.5" />
               <g transform="translate(50, 600) rotate(-90)">
                 <text x="0" y="0" textAnchor="middle" fontSize="22" fontWeight="bold">8000</text>
               </g>

               {/* Y Segments: 4500, 3500 */}
               <line x1="110" y1="200" x2="110" y2="1000" strokeWidth="1.5" />
               <line x1="100" y1="210" x2="120" y2="190" strokeWidth="2.5" />
               <line x1="100" y1="660" x2="120" y2="640" strokeWidth="2.5" />
               <line x1="100" y1="1010" x2="120" y2="990" strokeWidth="2.5" />
               <g transform="translate(100, 425) rotate(-90)">
                 <text x="0" y="0" textAnchor="middle" fontSize="22">4500</text>
               </g>
               <g transform="translate(100, 825) rotate(-90)">
                 <text x="0" y="0" textAnchor="middle" fontSize="22">3500</text>
               </g>
             </g>

             {/* Highlighted Dimension Evidence */}
             <g data-engineering-evidence="dimension" data-active={hlDim}>
                <line x1="650" y1="110" x2="1100" y2="110" stroke={hlDim ? "hsl(var(--brand-violet))" : "#0f172a"} strokeWidth={hlDim ? 4 : 1.5} className="transition-all duration-300" />
                <line x1="640" y1="120" x2="660" y2="100" stroke={hlDim ? "hsl(var(--brand-violet))" : "#0f172a"} strokeWidth={hlDim ? 4 : 2.5} className="transition-all duration-300" />
                <line x1="1090" y1="120" x2="1110" y2="100" stroke={hlDim ? "hsl(var(--brand-violet))" : "#0f172a"} strokeWidth={hlDim ? 4 : 2.5} className="transition-all duration-300" />
                
                {hlDim && (
                   <rect x="650" y="80" width="450" height="50" fill="hsl(var(--brand-violet)/0.1)" stroke="hsl(var(--brand-violet))" strokeWidth="2" strokeDasharray="6,4" />
                )}
                
                <rect x="830" y="75" width="90" height="30" fill="white" />
                <text x="875" y="100" textAnchor="middle" fontSize="22" fontWeight="bold" fill={hlDim ? "hsl(var(--brand-violet))" : "#0f172a"} className="transition-all duration-300">4500</text>
             </g>

             {/* Right Sidebar: Legend, Revision, Title Block */}
             <g transform="translate(1650, 180)">
                {/* Legend */}
                <rect width="300" height="230" fill="#fff" stroke="#0f172a" strokeWidth="2" />
                <rect x="0" y="0" width="300" height="40" fill="#e2e8f0" stroke="#0f172a" strokeWidth="2" />
                <text x="150" y="26" textAnchor="middle" fontWeight="bold" fontSize="16" fill="#0f172a">LEGEND</text>
                
                <rect x="20" y="60" width="40" height="40" fill="url(#concrete)" stroke="#475569" strokeWidth="1.5" />
                <text x="80" y="75" fontSize="14" fill="#0f172a" fontWeight="bold">REINFORCED CONCRETE</text>
                <text x="80" y="95" fontSize="14" fill="#0f172a">FLOOR SLAB</text>
                {hlMat && (
                   <rect x="15" y="55" width="270" height="50" fill="hsl(var(--brand-violet)/0.1)" stroke="hsl(var(--brand-violet))" strokeWidth="2" strokeDasharray="6,4" className="pointer-events-none" />
                )}

                <rect x="20" y="120" width="40" height="40" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6,4" opacity="0.4" />
                <text x="80" y="145" fontSize="14" fill="#0f172a">MAINTENANCE CLEARANCE</text>

                <use href="#valve-h" x="40" y="195" />
                <text x="80" y="200" fontSize="14" fill="#0f172a">ISOLATION VALVE</text>
             </g>

             <g transform="translate(1650, 440)">
                {/* Revision History */}
                <rect width="300" height="210" fill="#fff" stroke="#0f172a" strokeWidth="2" />
                <rect x="0" y="0" width="300" height="40" fill="#e2e8f0" stroke="#0f172a" strokeWidth="2" />
                <text x="150" y="26" textAnchor="middle" fontWeight="bold" fontSize="16" fill="#0f172a">REVISION HISTORY</text>
                
                <line x1="0" y1="70" x2="300" y2="70" stroke="#0f172a" strokeWidth="1" />
                <text x="15" y="60" fontSize="12" fontWeight="bold" fill="#0f172a">REV</text>
                <text x="65" y="60" fontSize="12" fontWeight="bold" fill="#0f172a">DATE</text>
                <text x="150" y="60" fontSize="12" fontWeight="bold" fill="#0f172a">DESCRIPTION</text>
                
                <text x="15" y="95" fontSize="12" fill="#0f172a">0</text>
                <text x="65" y="95" fontSize="12" fill="#0f172a">2023-01-10</text>
                <text x="150" y="95" fontSize="12" fill="#0f172a">ISSUED FOR DESIGN</text>
                <line x1="0" y1="110" x2="300" y2="110" stroke="#cbd5e1" strokeWidth="1" />
                
                <text x="15" y="135" fontSize="12" fill="#0f172a">A</text>
                <text x="65" y="135" fontSize="12" fill="#0f172a">2023-06-15</text>
                <text x="150" y="135" fontSize="12" fill="#0f172a">ISSUED FOR REVIEW</text>
                <line x1="0" y1="150" x2="300" y2="150" stroke="#cbd5e1" strokeWidth="1" />
                
                <rect x="0" y="150" width="300" height="50" fill={hlQty ? "hsl(var(--brand-coral)/0.1)" : "none"} className="transition-colors duration-300" />
                <text x="15" y="175" fontSize="12" fontWeight="bold" fill={hlQty ? "hsl(var(--brand-coral))" : "#0f172a"} className="transition-colors duration-300">B</text>
                <text x="65" y="175" fontSize="12" fontWeight="bold" fill={hlQty ? "hsl(var(--brand-coral))" : "#0f172a"} className="transition-colors duration-300">2024-11-20</text>
                <text x="150" y="175" fontSize="12" fontWeight="bold" fill={hlQty ? "hsl(var(--brand-coral))" : "#0f172a"} className="transition-colors duration-300">ADDED P-101C</text>
             </g>

             <g transform="translate(1650, 680)">
                {/* Title Block */}
                <rect width="300" height="260" fill="#fff" stroke="#0f172a" strokeWidth="3" />
                
                <line x1="0" y1="60" x2="300" y2="60" stroke="#0f172a" strokeWidth="2" />
                <text x="150" y="38" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#0f172a">PUMP HOUSE / DEMO</text>
                
                <line x1="0" y1="120" x2="300" y2="120" stroke="#0f172a" strokeWidth="2" />
                <text x="15" y="85" fontSize="12" fill="#64748b">DRAWING TITLE</text>
                <text x="15" y="105" fontSize="18" fontWeight="bold" fill="#0f172a">PUMP HOUSE G.A.</text>
                
                <line x1="0" y1="160" x2="300" y2="160" stroke="#0f172a" strokeWidth="2" />
                <line x1="150" y1="120" x2="150" y2="160" stroke="#0f172a" strokeWidth="2" />
                <text x="15" y="138" fontSize="10" fill="#64748b">SCALE</text>
                <text x="15" y="152" fontSize="14" fill="#0f172a">N.T.S.</text>
                <text x="165" y="138" fontSize="10" fill="#64748b">DATE</text>
                <text x="165" y="152" fontSize="14" fill="#0f172a">2024-11-20</text>
                
                <line x1="0" y1="210" x2="300" y2="210" stroke="#0f172a" strokeWidth="2" />
                <line x1="150" y1="160" x2="150" y2="210" stroke="#0f172a" strokeWidth="2" />
                <text x="15" y="180" fontSize="10" fill="#64748b">DRAWING NUMBER</text>
                <text x="15" y="200" fontSize="16" fontWeight="bold" fill="#0f172a">M-104</text>
                
                <text x="165" y="180" fontSize="10" fill="#64748b">REVISION</text>
                <text x="165" y="200" fontSize="16" fontWeight="bold" fill={hlQty ? "hsl(var(--brand-coral))" : "#0f172a"} className="transition-colors duration-300">B</text>

                <rect x="0" y="210" width="300" height="50" fill="#fee2e2" />
                <text x="150" y="240" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#dc2626">ILLUSTRATIVE - PRELIMINARY</text>
             </g>

             {/* North Arrow */}
             <g transform="translate(100, 1150)">
                <circle cx="0" cy="0" r="40" fill="none" stroke="#0f172a" strokeWidth="2" />
                <polygon points="0,-50 -20,15 0,5 20,15" fill="#0f172a" />
                <text x="0" y="-60" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#0f172a">N</text>
             </g>

           </svg>
         </div>
      </div>
      <div className="border-t border-border bg-white p-3 text-xs text-slate-600">
        <p><strong>Illustrative — not for construction.</strong> Zoom {Math.round(scale * 100)}%. Zoom in, then scroll or use arrow keys within the drawing.</p>
        <details className="mt-2">
          <summary className="cursor-pointer font-semibold">Drawing notes and text equivalent</summary>
          <p className="mt-2">M-104, Revision B. Grid spacing is 4500 mm between each of grids 1–4, total 13500 mm. Vertical spans are 4500 and 3500 mm, total 8000 mm. The floor hatch denotes reinforced concrete slab. Three pump sets P-101A, P-101B and P-101C connect to suction and discharge headers; P-101C is enclosed in the Revision B addition cloud. Confirm the design revision before using the count. Dashed outlines denote maintenance clearance. This is a fictional, prewritten example, not an engineered installation.</p>
        </details>
      </div>
    </div>
  );
}