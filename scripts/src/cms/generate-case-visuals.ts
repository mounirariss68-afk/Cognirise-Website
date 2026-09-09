import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { CASE_VISUAL_LABELS, caseStudyRecords } from "./case-studies.js";
import { websiteRoot } from "./common.js";

const run = promisify(execFile);
const outputDirectory = path.join(websiteRoot, "public/images/cognirise/cases");

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

type PRNG = () => number;

function lcg(seed: number): PRNG {
  return function() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  return Math.abs(hash);
}

function drawRect(x: number, y: number, w: number, h: number, fill: string, rx = 0) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}"/>`;
}

function drawText(x: number, y: number, text: string, fontSize: number, fill: string, weight = "normal", align = "start", font = "Arial, sans-serif") {
  return `<text x="${x}" y="${y}" font-size="${fontSize}" font-weight="${weight}" fill="${fill}" text-anchor="${align}" font-family="${font}">${escapeXml(text)}</text>`;
}

function drawSkeletonText(rng: PRNG, x: number, y: number, w: number, lines: number, fill: string, lineHeight = 14) {
  let out = "";
  for (let i = 0; i < lines; i++) {
    let lineW = w * (0.6 + rng() * 0.35);
    if (i === lines - 1) lineW = w * (0.3 + rng() * 0.4);
    out += `<rect x="${x}" y="${y + i * lineHeight}" width="${lineW}" height="${lineHeight * 0.6}" fill="${fill}" rx="${lineHeight * 0.3}"/>`;
  }
  return out;
}

function renderUI(template: string, rng: PRNG, w: number, h: number, labels: readonly string[], title: string) {
  let out = "";
  const accent = ["#8c5cff", "#ee6c58", "#cf3f91"][Math.floor(rng() * 3)];
  
  out += `<rect x="0" y="0" width="${w}" height="72" fill="#f8f9fc" rx="24"/>`;
  out += `<path d="M 0 72 L ${w} 72" stroke="#e1ddeb" stroke-width="2"/>`;
  out += `<circle cx="40" cy="36" r="16" fill="${accent}" opacity="0.2"/>`;
  out += `<circle cx="40" cy="36" r="8" fill="${accent}"/>`;
  out += drawText(76, 42, title, 20, "#101b3d", "bold");
  
  const embedLabels = (lx: number, ly: number, style: 'cards' | 'stats') => {
    let lOut = "";
    labels.forEach((lbl, i) => {
      if (style === 'cards') {
        lOut += drawRect(lx + i * 320, ly, 300, 140, "#ffffff", 16);
        lOut += `<rect x="${lx + i * 320}" y="${ly}" width="300" height="140" fill="none" stroke="#e1ddeb" stroke-width="2" rx="16"/>`;
        lOut += drawText(lx + i * 320 + 24, ly + 40, `Metric 0${i+1}`, 14, "#6c6e80", "bold");
        lOut += drawText(lx + i * 320 + 24, ly + 80, lbl, 22, "#101b3d", "bold");
        lOut += `<rect x="${lx + i * 320 + 24}" y="${ly + 105}" width="${100 + rng() * 100}" height="8" fill="${accent}" rx="4"/>`;
      } else if (style === 'stats') {
        lOut += `<rect x="${lx}" y="${ly + i * 100}" width="280" height="80" fill="#f8f9fc" rx="12"/>`;
        lOut += drawText(lx + 20, ly + i * 100 + 35, lbl, 18, "#101b3d", "bold");
        lOut += drawText(lx + 20, ly + i * 100 + 60, `Status: Active`, 14, "#6c6e80");
      }
    });
    return lOut;
  };

  const variant = rng();

  if (template === 'knowledge-assistant') {
    if (variant < 0.5) {
      out += drawRect(0, 72, 300, h - 72, "#f8f9fc");
      out += drawText(30, 120, "Recent Queries", 16, "#101b3d", "bold");
      for(let i=0; i<8; i++) {
        out += drawRect(20, 150 + i * 50, 260, 40, i===0 ? "#ffffff" : "transparent", 8);
        out += drawText(40, 175 + i * 50, i===0 ? labels[0] : `Historical session ${i+1}`, 14, i===0 ? "#101b3d" : "#6c6e80", i===0?"bold":"normal");
      }
      out += drawRect(350, 120, w - 750, h - 250, "#ffffff");
      out += drawRect(380, 150, 400, 80, "#f3edff", 16);
      out += drawText(400, 180, "Can you provide the standard procedure?", 16, "#101b3d");
      out += drawRect(w - 780, 260, 400, 180, "#f8f9fc", 16);
      out += drawText(w - 760, 295, labels[1], 18, "#101b3d", "bold");
      out += drawSkeletonText(rng, w - 760, 320, 350, 5, "#e1ddeb", 20);
      out += drawRect(350, h - 100, w - 750, 60, "#ffffff", 30);
      out += `<rect x="350" y="${h-100}" width="${w-750}" height="60" fill="none" stroke="#e1ddeb" stroke-width="2" rx="30"/>`;
      out += drawText(380, h - 65, "Ask a question...", 16, "#6c6e80");
      out += `<circle cx="${w - 390}" cy="${h-70}" r="20" fill="${accent}"/>`;
      out += drawRect(w - 350, 72, 350, h - 72, "#ffffff");
      out += `<line x1="${w-350}" y1="72" x2="${w-350}" y2="${h}" stroke="#e1ddeb" stroke-width="2"/>`;
      out += drawText(w - 320, 120, "Sources & Evidence", 16, "#101b3d", "bold");
      out += embedLabels(w - 320, 150, 'stats');
    } else {
      out += `<rect x="0" y="72" width="${w}" height="250" fill="${accent}" opacity="0.05"/>`;
      out += drawText(w/2, 160, "Knowledge Center", 36, "#101b3d", "bold", "middle");
      out += drawRect(w/2 - 400, 220, 800, 64, "#ffffff", 32);
      out += `<rect x="${w/2 - 400}" y="220" width="800" height="64" fill="none" stroke="#e1ddeb" stroke-width="2" rx="32"/>`;
      out += drawText(w/2 - 350, 258, `Search for "${labels[0]}"...`, 20, "#6c6e80");
      out += embedLabels(w/2 - 480, 380, 'cards');
      for(let row=0; row<2; row++) {
        for(let col=0; col<4; col++) {
          const ax = 80 + col * ((w-200)/4);
          const ay = 580 + row * 200;
          out += `<rect x="${ax}" y="${ay}" width="${(w-280)/4}" height="160" fill="#ffffff" stroke="#e1ddeb" stroke-width="2" rx="16"/>`;
          out += drawSkeletonText(rng, ax + 20, ay + 20, ((w-280)/4) - 40, 4, "#e1ddeb", 18);
          out += `<rect x="${ax + 20}" y="${ay + 120}" width="80" height="20" fill="#f8f9fc" rx="10"/>`;
        }
      }
    }
  } 
  else if (template === 'analytics-dashboard') {
    if (variant < 0.5) {
      out += drawRect(0, 72, 250, h - 72, "#101b3d");
      out += drawText(30, 120, "Dashboards", 14, "#6c6e80", "bold");
      out += drawText(30, 160, "Overview", 16, "#ffffff", "bold");
      out += drawText(30, 200, "Performance", 16, "#6c6e80");
      out += embedLabels(300, 100, 'cards');
      out += `<rect x="300" y="280" width="${w - 350}" height="400" fill="#ffffff" stroke="#e1ddeb" stroke-width="2" rx="16"/>`;
      out += drawText(330, 320, labels[1], 20, "#101b3d", "bold");
      let path = `M 350 600 `;
      for(let i=1; i<=10; i++) {
        path += `L ${350 + i * ((w-450)/10)} ${600 - rng() * 250} `;
      }
      out += `<path d="${path}" fill="none" stroke="${accent}" stroke-width="4" stroke-linejoin="round"/>`;
      for(let i=0; i<5; i++) {
        out += `<line x1="350" y1="${350 + i*60}" x2="${w-100}" y2="${350 + i*60}" stroke="#f8f9fc" stroke-width="2"/>`;
      }
      for(let i=0; i<3; i++) {
        out += `<rect x="${300 + i*((w-310)/3)}" y="710" width="${((w-370)/3)}" height="200" fill="#ffffff" stroke="#e1ddeb" stroke-width="2" rx="16"/>`;
        out += drawSkeletonText(rng, 320 + i*((w-310)/3), 740, ((w-370)/3)-40, 3, "#e1ddeb", 18);
      }
    } else {
      out += drawText(60, 120, "Global Analytics", 28, "#101b3d", "bold");
      out += embedLabels(60, 160, 'cards');
      out += `<rect x="60" y="340" width="${(w-150)*0.6}" height="300" fill="#ffffff" stroke="#e1ddeb" stroke-width="2" rx="16"/>`;
      out += drawText(90, 380, labels[2], 20, "#101b3d", "bold");
      for(let i=0; i<12; i++) {
        const barH = 50 + rng() * 180;
        out += `<rect x="${100 + i*40}" y="${600 - barH}" width="24" height="${barH}" fill="${rng() > 0.5 ? accent : "#101b3d"}" rx="4"/>`;
      }
      out += `<rect x="${60 + (w-150)*0.6 + 30}" y="340" width="${(w-150)*0.4}" height="300" fill="#ffffff" stroke="#e1ddeb" stroke-width="2" rx="16"/>`;
      out += `<circle cx="${60 + (w-150)*0.6 + 30 + ((w-150)*0.4)/2}" cy="490" r="80" fill="none" stroke="#f8f9fc" stroke-width="30"/>`;
      out += `<circle cx="${60 + (w-150)*0.6 + 30 + ((w-150)*0.4)/2}" cy="490" r="80" fill="none" stroke="${accent}" stroke-width="30" stroke-dasharray="300 200"/>`;
      out += `<rect x="60" y="670" width="${w-120}" height="280" fill="#ffffff" stroke="#e1ddeb" stroke-width="2" rx="16"/>`;
      out += drawText(90, 710, "Recent Events", 20, "#101b3d", "bold");
      for(let i=0; i<4; i++) {
        out += `<rect x="90" y="${740 + i*50}" width="${w-180}" height="40" fill="#f8f9fc" rx="8"/>`;
        out += drawText(110, 765, `Event trace ${hashString(labels[0]+i).toString(16)}`, 14, "#101b3d");
        out += drawText(w - 200, 765, "Completed", 14, "#10b981", "bold");
      }
    }
  }
  else if (template === 'workflow-console') {
    if (variant < 0.5) {
      out += drawText(60, 130, "Active Workflows", 28, "#101b3d", "bold");
      out += drawRect(w - 220, 100, 160, 48, accent, 24);
      out += drawText(w - 140, 130, "New Task", 16, "#ffffff", "bold", "middle");
      const cols = [labels[0], labels[1], labels[2], "Done"];
      cols.forEach((col, i) => {
        const cx = 60 + i * ((w-120)/4);
        out += drawRect(cx, 180, ((w-160)/4), h-200, "#f8f9fc", 16);
        out += drawText(cx + 20, 220, col, 18, "#101b3d", "bold");
        const cards = 2 + Math.floor(rng() * 4);
        for(let j=0; j<cards; j++) {
          const cy = 250 + j * 140;
          out += drawRect(cx + 16, cy, ((w-160)/4) - 32, 120, "#ffffff", 12);
          out += `<rect x="${cx+16}" y="${cy}" width="${((w-160)/4)-32}" height="120" fill="none" stroke="#e1ddeb" stroke-width="2" rx="12"/>`;
          out += drawText(cx + 36, cy + 30, `Task-${Math.floor(rng()*1000)}`, 14, "#6c6e80");
          out += drawText(cx + 36, cy + 60, j === 0 ? "Review needed" : "Standard flow", 16, "#101b3d", "bold");
          out += `<circle cx="${cx+46}" cy="${cy+95}" r="12" fill="#101b3d" opacity="0.1"/>`;
          out += `<circle cx="${cx+76}" cy="${cy+95}" r="12" fill="${accent}" opacity="0.2"/>`;
        }
      });
    } else {
      out += drawRect(0, 72, 250, h - 72, "#ffffff");
      out += `<line x1="250" y1="72" x2="250" y2="${h}" stroke="#e1ddeb" stroke-width="2"/>`;
      out += drawText(280, 120, "Queue", 24, "#101b3d", "bold");
      for(let i=0; i<10; i++) {
        const rowY = 160 + i * 70;
        out += drawRect(280, rowY, w - 750, 60, i===1 ? "#f3edff" : "#ffffff", 12);
        out += `<rect x="280" y="${rowY}" width="${w-750}" height="60" fill="none" stroke="${i===1 ? accent : '#e1ddeb'}" stroke-width="2" rx="12"/>`;
        out += `<circle cx="310" cy="${rowY + 30}" r="16" fill="#f8f9fc"/>`;
        out += drawText(340, rowY + 35, i===1 ? labels[0] : `Item #${i+1000}`, 16, "#101b3d", i===1?"bold":"normal");
        out += drawRect(w - 550, rowY + 15, 80, 30, "#e1ddeb", 15);
      }
      out += drawRect(w - 450, 72, 450, h - 72, "#ffffff");
      out += `<line x1="${w-450}" y1="72" x2="${w-450}" y2="${h}" stroke="#e1ddeb" stroke-width="2"/>`;
      out += drawText(w - 410, 130, labels[0], 24, "#101b3d", "bold");
      out += drawText(w - 410, 160, "Status: Pending Review", 16, "#6c6e80");
      out += embedLabels(w - 410, 200, 'stats');
      out += drawRect(w - 410, 600, 370, 200, "#f8f9fc", 16);
      out += drawText(w - 390, 640, "Activity", 18, "#101b3d", "bold");
      for(let j=0; j<3; j++) {
        out += `<circle cx="${w-380}" cy="${680 + j*40}" r="6" fill="${accent}"/>`;
        out += drawText(w - 360, 685 + j*40, `Step ${j+1} completed`, 14, "#6c6e80");
      }
    }
  }
  else if (template === 'commerce-experience') {
    if (variant < 0.5) {
      out += drawRect(60, 100, w-120, 350, "#f8f9fc", 24);
      out += drawText(120, 180, "Featured Catalog", 42, "#101b3d", "bold");
      out += drawText(120, 230, labels[0], 24, "#6c6e80");
      out += drawRect(120, 280, 180, 50, "#101b3d", 25);
      out += drawText(210, 312, "View collection", 16, "#ffffff", "bold", "middle");
      out += drawRect(w - 500, 140, 400, 270, "#e1ddeb", 16);
      out += drawText(60, 520, labels[1], 24, "#101b3d", "bold");
      for(let i=0; i<4; i++) {
        const cx = 60 + i * ((w-120)/4);
        out += drawRect(cx, 560, ((w-160)/4), 350, "#ffffff", 16);
        out += `<rect x="${cx}" y="560" width="${((w-160)/4)}" height="350" fill="none" stroke="#e1ddeb" stroke-width="2" rx="16"/>`;
        out += drawRect(cx + 20, 580, ((w-160)/4)-40, 200, "#f8f9fc", 12);
        out += drawText(cx + 20, 820, `Item ${hashString(labels[2]+i).toString(16)}`, 18, "#101b3d", "bold");
        out += drawText(cx + 20, 850, "$1,299.00", 16, "#6c6e80");
      }
    } else {
      out += drawRect(0, 72, 300, h - 72, "#ffffff");
      out += `<line x1="300" y1="72" x2="300" y2="${h}" stroke="#e1ddeb" stroke-width="2"/>`;
      out += drawText(40, 130, "Filters", 20, "#101b3d", "bold");
      const filters = ["Category", "Price Range", labels[0], "Availability"];
      filters.forEach((f, i) => {
        out += drawText(40, 190 + i*80, f, 16, "#101b3d", "bold");
        out += `<rect x="40" y="${210 + i*80}" width="20" height="20" fill="#f8f9fc" stroke="#e1ddeb" stroke-width="2" rx="4"/>`;
        out += drawText(70, 225 + i*80, "Option 1", 14, "#6c6e80");
      });
      out += drawText(340, 130, labels[1], 24, "#101b3d", "bold");
      for(let row=0; row<3; row++) {
        for(let col=0; col<3; col++) {
          const cx = 340 + col * ((w-380)/3);
          const cy = 180 + row * 320;
          out += drawRect(cx, cy, ((w-420)/3), 280, "#ffffff", 16);
          out += `<rect x="${cx}" y="${cy}" width="${((w-420)/3)}" height="280" fill="none" stroke="#e1ddeb" stroke-width="2" rx="16"/>`;
          out += drawRect(cx + 20, cy + 20, ((w-420)/3)-40, 160, "#f3edff", 12);
          out += drawText(cx + 20, cy + 215, `Product variant ${row*3+col}`, 16, "#101b3d", "bold");
          out += drawText(cx + 20, cy + 245, "In stock", 14, "#10b981");
        }
      }
    }
  }
  else if (template === 'governance-console') {
    if (variant < 0.5) {
      out += drawRect(0, 72, 250, h-72, "#101b3d");
      out += drawText(30, 130, "Policies", 16, "#ffffff", "bold");
      out += drawText(30, 180, "Audit Log", 16, "#6c6e80");
      out += drawText(290, 130, labels[0], 28, "#101b3d", "bold");
      out += drawRect(w - 200, 100, 160, 40, "#ffffff", 8);
      out += `<rect x="${w-200}" y="100" width="160" height="40" fill="none" stroke="#e1ddeb" stroke-width="2" rx="8"/>`;
      out += drawText(w - 120, 125, "Export Report", 14, "#101b3d", "bold", "middle");
      out += drawRect(290, 180, w-330, 40, "#f8f9fc", 8);
      out += drawText(310, 205, "Rule ID", 14, "#6c6e80", "bold");
      out += drawText(450, 205, "Condition", 14, "#6c6e80", "bold");
      out += drawText(w - 250, 205, "Status", 14, "#6c6e80", "bold");
      for(let i=0; i<8; i++) {
        const cy = 240 + i*70;
        out += `<rect x="290" y="${cy}" width="${w-330}" height="60" fill="#ffffff" stroke="#e1ddeb" stroke-width="2" rx="8"/>`;
        out += drawText(310, cy+35, `POL-00${i+1}`, 16, "#101b3d", "bold");
        if (i === 1 || i === 4) {
          out += drawRect(450, cy+15, 300, 30, "#ffeeea", 4);
          out += drawText(460, cy+35, labels[1], 14, "#ee6c58");
          out += drawRect(w - 250, cy+15, 80, 30, "#ffeeea", 15);
          out += drawText(w - 210, cy+35, "Failed", 12, "#ee6c58", "bold", "middle");
        } else {
          out += drawText(450, cy+35, i===0 ? labels[2] : `Standard compliance check ${i}`, 14, "#101b3d");
          out += drawRect(w - 250, cy+15, 80, 30, "#e6f8f1", 15);
          out += drawText(w - 210, cy+35, "Passed", 12, "#10b981", "bold", "middle");
        }
      }
    } else {
      out += drawText(60, 130, "Governance Overview", 28, "#101b3d", "bold");
      out += embedLabels(60, 170, 'cards');
      out += drawRect(60, 350, (w-150)/2, 500, "#ffffff", 16);
      out += `<rect x="60" y="350" width="${(w-150)/2}" height="500" fill="none" stroke="#e1ddeb" stroke-width="2" rx="16"/>`;
      out += drawText(90, 400, "Recent Violations", 20, "#101b3d", "bold");
      for(let i=0; i<6; i++) {
        out += drawText(90, 450 + i*60, labels[1], 16, "#101b3d");
        out += `<line x1="90" y1="${480 + i*60}" x2="${60 + (w-150)/2 - 30}" y2="${480 + i*60}" stroke="#f8f9fc" stroke-width="2"/>`;
      }
      out += drawRect(60 + (w-150)/2 + 30, 350, (w-150)/2, 500, "#ffffff", 16);
      out += `<rect x="${60 + (w-150)/2 + 30}" y="350" width="${(w-150)/2}" height="500" fill="none" stroke="#e1ddeb" stroke-width="2" rx="16"/>`;
      out += drawText(60 + (w-150)/2 + 60, 400, "Risk Distribution", 20, "#101b3d", "bold");
      out += `<circle cx="${60 + (w-150)/2 + 30 + ((w-150)/2)/2}" cy="600" r="120" fill="none" stroke="#f8f9fc" stroke-width="40"/>`;
      out += `<circle cx="${60 + (w-150)/2 + 30 + ((w-150)/2)/2}" cy="600" r="120" fill="none" stroke="${accent}" stroke-width="40" stroke-dasharray="400 400"/>`;
      out += `<circle cx="${60 + (w-150)/2 + 30 + ((w-150)/2)/2}" cy="600" r="70" fill="none" stroke="#e1ddeb" stroke-width="20"/>`;
    }
  }
  else if (template === 'operations-console') {
    if (variant < 0.5) {
      out += drawRect(0, 72, w, h-72, "#101b3d");
      out += drawText(40, 120, "Live Topology", 24, "#ffffff", "bold");
      const nodes: {x: number, y: number}[] = [];
      for(let i=0; i<15; i++) {
        nodes.push({
          x: 100 + rng() * (w - 500),
          y: 200 + rng() * (h - 300)
        });
      }
      for(let i=0; i<20; i++) {
        const n1 = nodes[Math.floor(rng()*nodes.length)];
        const n2 = nodes[Math.floor(rng()*nodes.length)];
        out += `<line x1="${n1.x}" y1="${n1.y}" x2="${n2.x}" y2="${n2.y}" stroke="#6c6e80" stroke-width="2" opacity="0.4"/>`;
      }
      nodes.forEach((n, i) => {
        out += `<circle cx="${n.x}" cy="${n.y}" r="${10 + rng()*15}" fill="${i===0 ? '#ee6c58' : accent}"/>`;
        if(i < 3) {
          out += drawText(n.x, n.y + 35, labels[i], 12, "#ffffff", "normal", "middle");
        }
      });
      out += drawRect(w - 350, 72, 350, h-72, "#0a1128");
      out += drawText(w - 320, 120, "Active Alerts", 18, "#ffffff", "bold");
      for(let i=0; i<5; i++) {
        out += drawRect(w - 320, 150 + i*90, 290, 70, "#101b3d", 8);
        out += `<circle cx="${w - 300}" cy="${185 + i*90}" r="6" fill="${i===0 ? '#ee6c58' : '#10b981'}"/>`;
        out += drawText(w - 280, 175 + i*90, i===0 ? labels[0] : `Node telemetry OK`, 14, "#ffffff", "bold");
        out += drawText(w - 280, 200 + i*90, "System check passed", 12, "#6c6e80");
      }
    } else {
      out += drawRect(0, 72, w, h-72, "#f8f9fc");
      out += drawText(40, 120, "Operations Center", 24, "#101b3d", "bold");
      out += embedLabels(40, 150, 'cards');
      out += drawRect(40, 320, (w-120)*0.6, h-360, "#101b3d", 16);
      out += drawText(70, 360, "System Log", 16, "#6c6e80", "bold");
      for(let i=0; i<15; i++) {
        out += drawText(70, 400 + i*30, `[14:32:0${i}] ${i===2 ? labels[1] : 'Executing command sequence...'}`, 14, i===2 ? "#ee6c58" : "#8c5cff", "normal", "start", "monospace");
      }
      out += drawRect(40 + (w-120)*0.6 + 40, 320, (w-120)*0.4, h-360, "#ffffff", 16);
      out += `<rect x="${40 + (w-120)*0.6 + 40}" y="320" width="${(w-120)*0.4}" height="${h-360}" fill="none" stroke="#e1ddeb" stroke-width="2" rx="16"/>`;
      out += drawText(40 + (w-120)*0.6 + 70, 360, labels[2], 18, "#101b3d", "bold");
      for(let i=0; i<3; i++) {
        const cy = 450 + i*150;
        const cx = 40 + (w-120)*0.6 + 40 + ((w-120)*0.4)/2;
        out += `<path d="M ${cx - 80} ${cy + 30} A 80 80 0 0 1 ${cx + 80} ${cy + 30}" fill="none" stroke="#f8f9fc" stroke-width="20"/>`;
        out += `<path d="M ${cx - 80} ${cy + 30} A 80 80 0 0 1 ${cx} ${cy - 50}" fill="none" stroke="${accent}" stroke-width="20"/>`;
        out += drawText(cx, cy + 20, `${Math.floor(rng()*100)}%`, 24, "#101b3d", "bold", "middle");
      }
    }
  }

  return out;
}

function artwork(record: { title: string, template: string }, labels: readonly string[], index: number) {
  const seed = hashString(record.title);
  const rng = lcg(seed);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">\n`;
  svg += `<defs>
    <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffaf4"/><stop offset="1" stop-color="#f3edff"/></linearGradient>
    <clipPath id="screen-clip"><rect width="1600" height="1000"/></clipPath>
  </defs>\n`;
  svg += `<rect width="1600" height="1000" fill="url(#wash)"/>\n`;
  svg += `<g clip-path="url(#screen-clip)">\n`;

  const compType = rng();
  if (compType > 0.5) {
    const accent = ["#8c5cff", "#ee6c58", "#cf3f91"][Math.floor(rng() * 3)];
    svg += `<path d="M-200 200 C400 -100 800 500 1800 100" fill="none" stroke="${accent}" stroke-width="40" opacity="0.1"/>`;
    svg += `<path d="M-100 800 C500 1100 900 400 1700 900" fill="none" stroke="${accent}" stroke-width="20" opacity="0.15"/>`;
  }

  let scale = 1;
  let dx = 0;
  let dy = 0;
  
  if (compType < 0.2) {
    scale = 1.15;
    dx = -80;
    dy = -40;
  } else if (compType < 0.4) {
    scale = 0.85;
    dx = 120;
    dy = 75;
  } else if (compType < 0.6) {
    scale = 1.05;
    dx = -40;
    dy = -80;
  } else {
    scale = 1;
    dx = 80;
    dy = 60;
  }

  const appW = 1600 / scale - (dx > 0 ? dx * 2 : 0);
  const appH = 1000 / scale - (dy > 0 ? dy * 2 : 0);
  let gTransform = `translate(${dx}, ${dy}) scale(${scale})`;
  if (dx === 0 && dy === 0 && scale === 1) gTransform = "";

  svg += `<g ${gTransform ? `transform="${gTransform}"` : ""}>\n`;
  svg += `<rect x="0" y="12" width="${Math.max(1600, appW)}" height="${Math.max(1000, appH)}" rx="24" fill="#101b3d" opacity="0.08"/>\n`;
  svg += `<rect x="0" y="0" width="${Math.max(1600, appW)}" height="${Math.max(1000, appH)}" rx="24" fill="#ffffff" stroke="#e1ddeb" stroke-width="2"/>\n`;

  svg += renderUI(record.template, rng, Math.max(1600, appW), Math.max(1000, appH), labels, record.title);
  svg += `</g>\n`;

  svg += `<rect x="0" y="940" width="1600" height="60" fill="#fff" opacity="0.9"/>`;
  svg += `<text x="800" y="975" fill="#6c6e80" font-size="16" font-family="Arial, sans-serif" text-anchor="middle" font-weight="bold">ILLUSTRATIVE RECONSTRUCTION · NO CLIENT DATA OR BRANDING</text>\n`;
  svg += `</g></svg>`;
  
  return svg;
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const records = caseStudyRecords();
  if (records.length !== CASE_VISUAL_LABELS.length) throw new Error("Case visual labels do not match the governed case count.");
  await Promise.all(records.map(async (record, index) => {
    const slug = record.fields?.slug || (record as any).slug; 
    const filename = `${String(index + 1).padStart(2, "0")}-${slug}.png`;
    const svg = path.join(outputDirectory, `.${filename}.svg`);
    const output = path.join(outputDirectory, filename);
    const content = record.fields?.content || record;
    await writeFile(svg, artwork({ title: record.name, template: (content as any).template || (content as any).visual?.template }, CASE_VISUAL_LABELS[index], index), "utf8");
    await run("convert", [svg, "-strip", "-define", "png:compression-level=9", output]);
    await rm(svg);
  }));
  console.log(`Generated ${records.length} deterministic case visuals.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});