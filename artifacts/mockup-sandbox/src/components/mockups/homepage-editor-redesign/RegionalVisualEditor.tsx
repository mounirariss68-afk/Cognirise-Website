import { useMemo, useState } from "react";
import {
  ArrowDown, ArrowLeftRight, ArrowRight, ChevronDown, CircleAlert,
  ExternalLink, Eye, FileText, Globe2, Languages, Layers3,
  Monitor, Newspaper, Plus, RotateCcw, Save, Send, ShieldCheck, UsersRound, X,
} from "lucide-react";

type SectionKey = "home" | "team" | "case-studies" | "insights";
type HomeTarget = "hero" | "industries" | "services";
type Edition = {
  id: string; market: string; locale: string; status: string; inherited: string;
  headline: string; subhead: string; image: string;
  team: string[]; stories: string[]; insights: string[];
  itemOverrides: Record<string, string>; itemImages: Record<string, string>;
};

const imageOptions = [
  { label: "Governed AI · editorial abstract", src: "/__mockup/images/cognirise/pulse-library/cognirise-pulse-governed-ai-control-in-motion.jpg" },
  { label: "Financial services · office", src: "/__mockup/images/cognirise/site-financial.jpg" },
  { label: "Public sector · city services", src: "/__mockup/images/cognirise/site-government.jpg" },
  { label: "Telecommunications · signal field", src: "/__mockup/images/cognirise/pulse-library/cognirise-pulse-telecommunications-signal-field.jpg" },
];

const teamRecords = [
  { id: "maya", name: "Maya Rahman", role: "Managing Partner, Middle East", market: "UAE", source: "Person record · example" },
  { id: "omar", name: "Omar Al-Khatib", role: "Partner, Strategy & Transformation", market: "UAE", source: "Person record · example" },
  { id: "lina", name: "Lina Haddad", role: "Director, Applied AI", market: "KSA", source: "Person record · example" },
  { id: "elif", name: "Elif Demir", role: "Partner, Transformation", market: "Türkiye", source: "Person record · example" },
  { id: "anna", name: "Anna Weber", role: "Director, Applied AI", market: "Europe", source: "Person record · example" },
];

const storyRecords = [
  { id: "cs-uae", title: "Building trusted AI into the operating model", label: "Financial services · UAE", image: "/__mockup/images/cognirise/site-financial.jpg" },
  { id: "cs-civic", title: "One clearer journey for public services", label: "Public sector · UAE", image: "/__mockup/images/cognirise/site-government.jpg" },
  { id: "cs-network", title: "Connecting a distributed service operation", label: "Telecommunications · KSA", image: "/__mockup/images/cognirise/pulse-library/cognirise-pulse-telecommunications-signal-field.jpg" },
];

const insightRecords = [
  { id: "insight-trust", title: "The trust layer AI transformation is missing", label: "Perspectives · 8 min" },
  { id: "insight-model", title: "Redesigning work for human–agent teams", label: "Operating models · 6 min" },
  { id: "insight-market", title: "What leaders should localize—not translate", label: "Regional growth · 5 min" },
];
const homepageIndustries = [
  { title: "Financial services", image: "/__mockup/images/cognirise/site-financial.jpg" },
  { title: "Telecommunications", image: "/__mockup/images/cognirise/pulse-library/cognirise-pulse-telecommunications-signal-field.jpg" },
  { title: "Travel & hospitality", image: "/__mockup/images/cognirise/pulse-library/cognirise-pulse-logistics-moving-network.jpg" },
  { title: "Energy & resources", image: "/__mockup/images/cognirise/pulse-library/cognirise-pulse-energy-balancing-force.jpg" },
  { title: "Public sector", image: "/__mockup/images/cognirise/site-government.jpg" },
  { title: "Education", image: "/__mockup/images/cognirise/pulse-library/cognirise-pulse-knowledge-intelligence-living-index.jpg" },
];
const homepageServices = ["Strategy & operating model", "Forward-deployed engineering", "CogniOS platform"];

const initialEditions: Edition[] = [
  { id: "uae-en", market: "UAE", locale: "English", status: "Example · Published", inherited: "Regional source", headline: "We build what moves business forward.", subhead: "We turn complex ambition into working systems—with your people, your data and your teams in control.", image: imageOptions[0].src, team: ["maya", "omar"], stories: ["cs-uae", "cs-civic"], insights: ["insight-trust", "insight-model"], itemOverrides: {}, itemImages: {} },
  { id: "uae-ar", market: "UAE", locale: "Arabic", status: "Example · Draft", inherited: "UAE · English", headline: "نحوّل الطموح المعقّد إلى أثرٍ ملموس.", subhead: "استراتيجية وتقنية تعملان مع فرقكم، وتدعم أولوياتكم المحلية.", image: imageOptions[2].src, team: ["omar", "maya"], stories: ["cs-civic"], insights: ["insight-market"], itemOverrides: {}, itemImages: {} },
  { id: "ksa-en", market: "KSA", locale: "English", status: "Example · In review", inherited: "Regional source", headline: "Turn bold ambition into work that moves.", subhead: "Local context. Practical AI. Teams ready to make change real.", image: imageOptions[3].src, team: ["lina"], stories: ["cs-network"], insights: ["insight-market", "insight-trust"], itemOverrides: {}, itemImages: {} },
  { id: "ksa-ar", market: "KSA", locale: "Arabic", status: "Example · Draft", inherited: "KSA · English", headline: "حوّل الطموح إلى أثرٍ ملموس.", subhead: "حلول عملية تراعي سياق المملكة وتُمكّن فرق العمل.", image: imageOptions[3].src, team: ["lina"], stories: ["cs-network"], insights: ["insight-market"], itemOverrides: {}, itemImages: {} },
  { id: "turkiye-tr", market: "Türkiye", locale: "Turkish", status: "Illustrative · Not connected", inherited: "Regional source", headline: "Dönüşüm hedeflerinizi gerçek etkiye dönüştürüyoruz.", subhead: "İnsanlarınızı ve iş hedeflerinizi merkeze alan strateji ve teknoloji.", image: imageOptions[0].src, team: ["elif"], stories: ["cs-network"], insights: ["insight-model"], itemOverrides: {}, itemImages: {} },
  { id: "europe-en", market: "Europe", locale: "English", status: "Illustrative · Not connected", inherited: "Regional source", headline: "Turn complex change into progress you can see.", subhead: "Practical transformation shaped around your people, market and ambitions.", image: imageOptions[1].src, team: ["anna"], stories: ["cs-uae"], insights: ["insight-trust"], itemOverrides: {}, itemImages: {} },
];

const sections: { id: SectionKey; title: string; icon: typeof Globe2; hint: string }[] = [
  { id: "home", title: "Homepage", icon: Globe2, hint: "Text + media" },
  { id: "team", title: "People & team", icon: UsersRound, hint: "Regional profiles" },
  { id: "case-studies", title: "Case studies", icon: Newspaper, hint: "Edition selection" },
  { id: "insights", title: "Insights", icon: FileText, hint: "Edition selection" },
];

export function RegionalVisualEditor() {
  const [active, setActive] = useState<SectionKey>("home");
  const [homeTarget, setHomeTarget] = useState<HomeTarget>("hero");
  const [editions, setEditions] = useState(initialEditions);
  const [selectedId, setSelectedId] = useState("uae-en");
  const [drafts, setDrafts] = useState<Record<string, Edition>>(
    Object.fromEntries(initialEditions.map((edition) => [edition.id, edition])),
  );
  const [notice, setNotice] = useState("");
  const [showEditionMenu, setShowEditionMenu] = useState(false);
  const [showAddEdition, setShowAddEdition] = useState(false);
  const [newMarket, setNewMarket] = useState("Türkiye");
  const [newLocale, setNewLocale] = useState("English");
  const [workflow, setWorkflow] = useState<"none" | "review" | "release">("none");
  const [saved, setSaved] = useState(false);
  const selected = drafts[selectedId] ?? drafts["uae-en"];
  const currentStatus = editions.find((edition) => edition.id === selectedId)?.status ?? "Draft";
  const localeIsArabic = selected.locale === "Arabic";
  const rtl = localeIsArabic ? "rtl" : "ltr";

  const announce = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const update = (patch: Partial<Edition>) => {
    setDrafts((current) => ({ ...current, [selectedId]: { ...current[selectedId], ...patch } }));
    setSaved(false);
  };

  const toggleRecord = (key: "team" | "stories" | "insights", id: string) => {
    update({ [key]: selected[key].includes(id) ? selected[key].filter((item) => item !== id) : [...selected[key], id] });
  };
  const updateLocalizedItem = (id: string, value: string) => {
    update({ itemOverrides: { ...selected.itemOverrides, [id]: value } });
  };
  const updateLocalizedImage = (id: string, value: string) => {
    update({ itemImages: { ...selected.itemImages, [id]: value } });
  };

  const addEdition = () => {
    const localeCode = newLocale === "Arabic" ? "ar" : newLocale === "Turkish" ? "tr" : newLocale === "French" ? "fr" : "en";
    const id = `${newMarket.toLowerCase().replace(/[^a-z]+/g, "-")}-${localeCode}`;
    if (editions.some((edition) => edition.id === id)) {
      announce("That market and language edition already exists in this example.");
      return;
    }
    const base = drafts["uae-en"];
    const created: Edition = { ...base, id, market: newMarket, locale: newLocale, status: "Illustrative · Needs setup", inherited: "Regional source (preview provenance)", headline: "Add a regional homepage headline", subhead: "Add localized supporting copy for this edition.", image: imageOptions[0].src, team: [], stories: [], insights: [], itemOverrides: {}, itemImages: {} };
    setEditions((current) => [...current, created]);
    setDrafts((current) => ({ ...current, [id]: created }));
    setSelectedId(id);
    setActive("home");
    setShowAddEdition(false);
    announce(`${newMarket} · ${newLocale} added as a separate edition example.`);
  };

  const selectedTeam = useMemo(() => teamRecords.filter((person) => selected.team.includes(person.id)), [selected.team]);
  const selectedStories = useMemo(() => storyRecords.filter((story) => selected.stories.includes(story.id)), [selected.stories]);
  const selectedInsights = useMemo(() => insightRecords.filter((story) => selected.insights.includes(story.id)), [selected.insights]);
  const menuItems = active === "team" ? teamRecords : active === "case-studies" ? storyRecords : insightRecords;
  const activeRecords: string[] = active === "team" ? selected.team : active === "case-studies" ? selected.stories : selected.insights;

  return (
    <div className="rve">
      <style>{`
        .rve{--navy:#122951;--ink:#213651;--pink:#df4a88;--paper:#f4f2ec;--panel:#fffefa;--line:#d8d9d4;--muted:#74808e;min-height:100dvh;background:var(--paper);color:var(--ink);font:12px var(--app-font-sans),sans-serif}
        .rve *{box-sizing:border-box}.rve button,.rve input,.rve select,.rve textarea{font:inherit}.rve button{cursor:pointer}
        .rve-top{height:58px;padding:0 20px;background:var(--navy);color:#f6f4ee;display:flex;align-items:center;gap:16px;border-bottom:1px solid #334666;position:sticky;top:0;z-index:8}
        .rve-brand{font:700 15px var(--app-font-display),sans-serif;letter-spacing:-.05em;white-space:nowrap}.rve-brand i{font-style:normal;color:#eb75a8}.rve-divider{height:22px;width:1px;background:#60708a}.rve-crumb{font-size:11px;color:#c7d0db}.rve-topright{display:flex;align-items:center;gap:7px;margin-left:auto}
        .rve-edition{display:flex;align-items:center;gap:8px;position:relative}.rve-edition>button{border:1px solid #536681;border-radius:3px;background:transparent;color:#f5f4ee;padding:7px 9px;display:flex;align-items:center;gap:8px;font-size:10px}.rve-edition>button svg{width:13px;height:13px}.rve-menu{position:absolute;right:0;top:39px;z-index:15;width:270px;background:#fffefa;border:1px solid var(--line);box-shadow:0 12px 28px #10295125;padding:7px;color:var(--ink)}.rve-menu button{width:100%;display:flex;justify-content:space-between;align-items:center;border:0;background:transparent;padding:9px;text-align:left;color:var(--ink);font-size:10px}.rve-menu button:hover,.rve-menu button.chosen{background:#f2f0e9}.rve-menu small{display:block;color:var(--muted);font-size:8px;margin-top:4px}.rve-status{font:8px var(--app-font-mono),monospace;letter-spacing:.08em;text-transform:uppercase;color:#f2cc90;white-space:nowrap}.rve-action{border:1px solid #586984;background:transparent;color:#f8f7f1;border-radius:3px;padding:7px 9px;display:flex;gap:6px;align-items:center;font-size:9px}.rve-action svg{width:12px;height:12px}.rve-action.primary{background:#f4f0e8;color:var(--navy);border-color:#f4f0e8}.rve-action:hover{filter:brightness(1.06)}
        .rve-shell{display:grid;grid-template-columns:202px minmax(0,1fr);min-height:calc(100dvh - 58px)}.rve-side{background:#eae9e3;border-right:1px solid #d5d7d2;padding:18px 12px;display:flex;flex-direction:column;gap:20px}.rve-kicker{padding:0 9px 8px;font:8px var(--app-font-mono),monospace;color:#87919c;letter-spacing:.13em;text-transform:uppercase}
        .rve-sidebutton{width:100%;border:0;background:transparent;color:#56657a;border-radius:3px;text-align:left;padding:9px 9px;display:flex;align-items:center;gap:9px;font-size:10px}.rve-sidebutton svg{width:14px;height:14px}.rve-sidebutton.active{background:#fffefa;color:var(--navy);font-weight:600;box-shadow:0 1px 2px #11274710}.rve-sidebutton:hover:not(.active){background:#e2e2dc}
        .rve-editioncallout{margin-top:auto;padding:12px;border:1px solid #d3d5cf;background:#f3f2ed}.rve-editioncallout strong{display:block;font-size:9px;color:var(--navy);margin:7px 0 5px}.rve-editioncallout p{font-size:8px;line-height:1.5;color:#737f8c;margin:0}.rve-editioncallout button{margin-top:9px;background:none;border:0;color:#a3476c;padding:0;display:flex;align-items:center;gap:5px;font-size:8px}
        .rve-main{min-width:0;padding:18px 20px 24px}.rve-bar{display:flex;align-items:center;gap:9px;margin:0 auto 13px;max-width:1400px}.rve-back{height:28px;width:28px;border:1px solid var(--line);background:#fffefa;color:#55657b;display:grid;place-items:center}.rve-back svg{width:14px;height:14px}.rve-page-title{font-size:11px;font-weight:600;color:var(--navy)}.rve-page-meta{font-size:9px;color:#818b97}.rve-bar-right{margin-left:auto;display:flex;align-items:center;gap:7px}.rve-bar-right .rve-action{background:#fffefa;border-color:#d0d4d4;color:#344963}.rve-preview-label{display:flex;align-items:center;gap:6px;padding:8px 10px;background:#ebeae4;color:#657287;font:8px var(--app-font-mono),monospace;letter-spacing:.08em;text-transform:uppercase}
        .rve-workspace{display:grid;grid-template-columns:minmax(400px,1fr) 320px;gap:14px;max-width:1400px;margin:auto;align-items:start}.rve-canvas{min-width:0;border:1px solid #d9dcde;background:var(--panel);box-shadow:0 8px 28px #1029510c}.rve-canvashead{height:36px;padding:0 12px;border-bottom:1px solid #e7e8e5;background:#fcfbf8;display:flex;align-items:center;justify-content:space-between;font:8px var(--app-font-mono),monospace;color:#748091;letter-spacing:.07em;text-transform:uppercase}.rve-canvashead span{display:flex;align-items:center;gap:6px}.rve-live-dot{height:6px;width:6px;border-radius:50%;background:#4e8a77}.rve-site{background:#fff;color:#142b50}.rve-sitehead{height:42px;padding:0 24px;display:flex;align-items:center;gap:22px;border-bottom:1px solid #ececec}.rve-wordmark{font:700 12px var(--app-font-display),sans-serif;letter-spacing:-.05em;white-space:nowrap}.rve-wordmark i{color:var(--pink);font-style:normal}.rve-sitenav{display:flex;gap:17px;color:#68768a;font-size:8px}.rve-sitenav span:last-child{margin-left:auto}
        .rve-hero{display:grid;grid-template-columns:1fr .82fr;gap:20px;align-items:center;padding:32px 5.5% 26px;position:relative;border:2px solid transparent;cursor:pointer}.rve-hero.selected,.rve-contentsection.selected{border-color:var(--pink)}.rve-hero.selected{padding-top:43px}.rve-overline{font-size:7px;font-weight:600;letter-spacing:.16em;color:#778499;text-transform:uppercase}.rve-hero h1{font:600 clamp(25px,3vw,39px)/.99 var(--app-font-display),sans-serif;letter-spacing:-.07em;margin:12px 0;max-width:500px;color:var(--navy)}.rve-hero p{font-size:9px;line-height:1.6;color:#68788e;max-width:355px;margin:0 0 14px}.rve-hero-cta{display:inline-flex;align-items:center;gap:15px;background:var(--pink);color:#fff;padding:9px 11px;font-size:8px}.rve-hero-cta svg{width:11px;height:11px}.rve-hero-media{height:160px;overflow:hidden;position:relative;clip-path:polygon(5% 0,100% 5%,95% 100%,0 92%)}.rve-hero-media img{width:100%;height:100%;object-fit:cover;filter:saturate(.76)}.rve-image-tag{position:absolute;bottom:8px;right:8px;background:#122951dd;color:#fff;padding:5px 7px;font:7px var(--app-font-mono),monospace}
        .rve-proof{margin:0 5.5%;border-block:1px solid #1b3459;display:grid;grid-template-columns:repeat(3,1fr)}.rve-proof span{padding:9px 10px;border-right:1px solid #e4e6e6;font-size:7px;line-height:1.4;font-weight:600}.rve-proof span:last-child{border:0}
        .rve-industrygrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.rve-industry{position:relative;height:72px;overflow:hidden;background:#dfe2e1}.rve-industry img{width:100%;height:100%;object-fit:cover;filter:brightness(.66) saturate(.78)}.rve-industry b{position:absolute;left:8px;bottom:7px;color:white;font-size:8px;text-shadow:0 1px 4px #122951}.rve-record-origin{font-size:7px;color:#7f8b99;margin-top:7px}.rve-servicelist{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.rve-service{padding:11px 9px;border:1px solid #e3e5e4;background:#f9f8f4;font-size:8px;font-weight:600;color:#384d68}.rve-routepage{padding:20px 5.5% 26px;min-height:455px}.rve-routeintro{padding:23px 24px;background:#f4f3ee;border-bottom:1px solid #e6e6e0;margin-bottom:18px}.rve-routeintro small{font:7px var(--app-font-mono),monospace;color:#b24e77;letter-spacing:.14em;text-transform:uppercase}.rve-routeintro h1{font:600 27px/1 var(--app-font-display),sans-serif;letter-spacing:-.06em;color:var(--navy);margin:9px 0}.rve-routeintro p{font-size:9px;color:#718093;margin:0;max-width:420px;line-height:1.5}.rve-originbar{margin-bottom:12px;padding:8px 10px;border:1px solid #deded7;background:#f6f5ef;color:#6c798a;font-size:7px;line-height:1.5}
        .rve-contentsection{padding:19px 5.5% 20px;border:2px solid transparent;cursor:pointer}.rve-contenthead{display:flex;align-items:end;justify-content:space-between;margin-bottom:10px}.rve-contenthead small{font:7px var(--app-font-mono),monospace;color:#b24e77;letter-spacing:.13em;text-transform:uppercase}.rve-contenthead h2{font:600 19px/1 var(--app-font-display),sans-serif;letter-spacing:-.06em;margin:5px 0 0;color:var(--navy)}.rve-contenthead button{border:0;background:none;color:#758196;font-size:7px}.rve-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.rve-card{min-width:0;border:1px solid #e7e8e6;background:#fbfaf7;display:flex;align-items:center;gap:8px;padding:7px;text-align:left;color:#263d5c}.rve-card img{width:47px;height:36px;object-fit:cover;background:#e5e4dd;flex:none}.rve-card strong{font-size:7px;line-height:1.35;display:block}.rve-card small{display:block;color:#86909d;font-size:6px;margin-top:4px}.rve-person-card{padding:8px}.rve-person-initials{height:27px;width:27px;display:grid;place-items:center;border-radius:50%;background:#e9e4df;color:#31506f;font:7px var(--app-font-mono),monospace;flex:none}.rve-insight-cards .rve-card{padding:9px}.rve-sitefoot{background:var(--navy);color:#fff;padding:10px 5.5%;font-size:7px;letter-spacing:.08em;display:flex;justify-content:space-between}
        .rve-inspector{background:#fffefa;border:1px solid var(--line);min-height:440px;display:flex;flex-direction:column;position:sticky;top:73px}.rve-inspectorhead{padding:13px 14px 11px;border-bottom:1px solid #e8e6e0;display:flex;align-items:start;justify-content:space-between;gap:9px}.rve-inspectorhead small{font:7px var(--app-font-mono),monospace;color:#9a5976;letter-spacing:.11em;text-transform:uppercase}.rve-inspectorhead h2{font:600 16px var(--app-font-display),sans-serif;letter-spacing:-.05em;margin:5px 0 3px;color:var(--navy)}.rve-inspectorhead p{font-size:8px;color:#7c8794;margin:0}.rve-state-chip{font:7px var(--app-font-mono),monospace;text-transform:uppercase;color:#9f4770;background:#f7e9ef;padding:5px 6px;white-space:nowrap}
        .rve-inspectorbody{padding:13px 14px;display:grid;gap:12px}.rve-field label,.rve-field-label{display:block;color:#707e8f;font-size:8px;margin-bottom:5px}.rve-field input,.rve-field textarea,.rve-field select{width:100%;border:1px solid #d2d7d9;background:#fff;padding:8px;color:#213653;font-size:9px;outline-color:var(--pink)}.rve-field textarea{min-height:73px;line-height:1.5;resize:vertical}.rve-fieldhelp{font-size:7px;line-height:1.45;color:#8b949e;margin-top:5px}.rve-scope-note{display:flex;gap:7px;background:#f1f0ea;border:1px solid #e1dfd8;padding:8px;font-size:7px;line-height:1.5;color:#697787}.rve-scope-note svg{width:12px;height:12px;flex:none;color:#ae6e8a}.rve-rule{height:1px;background:#e8e6e0}
        .rve-recordlist{display:grid;gap:6px}.rve-record-entry{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px;align-items:stretch;border:1px solid #e1e1dc;background:#fbfaf7;padding:5px}.rve-record{display:flex;align-items:center;gap:7px;border:0;background:transparent;padding:2px;color:#334962;font-size:8px;min-width:0}.rve-record input{width:12px;height:12px;accent-color:var(--pink);flex:none}.rve-record span{min-width:0;flex:1}.rve-record b{display:block;font-size:8px}.rve-record small{display:block;color:#89929c;font-size:7px;margin-top:3px}.rve-record img{height:33px;width:45px;object-fit:cover}.rve-source-link{border:0;background:transparent;color:#a3476c;font-size:7px;display:flex;align-items:center;gap:3px;white-space:nowrap}.rve-source-link svg{width:9px;height:9px}.rve-localized-fields{margin-top:9px;padding-top:8px;border-top:1px solid #e8e6e0;display:grid;gap:7px}.rve-localized-fields>strong{font:7px var(--app-font-mono),monospace;letter-spacing:.08em;text-transform:uppercase;color:#788494}.rve-localized-field label{display:block;font-size:7px;color:#65748a;margin-bottom:4px}.rve-localized-field input,.rve-localized-field select{width:100%;border:1px solid #d2d7d9;background:#fff;padding:7px;color:#213653;font-size:8px}.rve-localized-field small{display:block;color:#929aa3;font-size:6px;margin-top:3px}.rve-inherit{width:100%;border:1px dashed #bdc4c9;background:#faf9f5;padding:7px;display:flex;align-items:center;gap:6px;color:#5f7084;font-size:7px;text-align:left}.rve-inherit svg{width:11px;height:11px}
        .rve-inspectorfoot{margin-top:auto;padding:11px 14px;border-top:1px solid #e8e6e0;display:flex;align-items:center;justify-content:space-between;gap:6px}.rve-inspectorfoot button{border:1px solid #cbd1d3;background:#fffefa;color:#354a65;padding:7px 8px;display:flex;align-items:center;gap:5px;font-size:8px}.rve-inspectorfoot button.primary{background:var(--navy);border-color:var(--navy);color:white}.rve-inspectorfoot svg{width:11px;height:11px}
        .rve-workflow{max-width:1400px;margin:12px auto 0;display:flex;justify-content:space-between;align-items:center;gap:9px;border:1px solid #dddcd5;background:#efeee8;padding:9px 11px}.rve-workflow small{font-size:7px;color:#737f8d}.rve-steps{display:flex;align-items:center;gap:10px}.rve-step{display:flex;align-items:center;gap:5px;font-size:7px;color:#788392;white-space:nowrap}.rve-step b{height:15px;width:15px;border:1px solid #c9cdd0;border-radius:50%;display:grid;place-items:center;font:7px var(--app-font-mono),monospace}.rve-step.active{color:var(--navy);font-weight:600}.rve-step.active b{background:var(--navy);border-color:var(--navy);color:#fff}
        .rve-modalback{position:fixed;inset:0;z-index:30;background:#12295155;display:flex;align-items:center;justify-content:center;padding:16px}.rve-modal{width:min(400px,100%);background:#fffefa;border:1px solid #d9d9d2;padding:18px;box-shadow:0 18px 50px #10295135}.rve-modalhead{display:flex;justify-content:space-between;align-items:start}.rve-modalhead small{font:8px var(--app-font-mono),monospace;text-transform:uppercase;color:var(--pink);letter-spacing:.12em}.rve-modalhead h2{font:600 19px var(--app-font-display);letter-spacing:-.05em;margin:5px 0 12px}.rve-modal p{font-size:9px;line-height:1.55;color:#75818e}.rve-modalfoot{display:flex;justify-content:flex-end;gap:7px;margin-top:16px}.rve-modalfoot button{border:1px solid #cbd1d3;background:#fffefa;color:#354a65;padding:8px 10px;font-size:9px}.rve-modalfoot button.primary{background:var(--navy);color:white}.rve-toast{position:fixed;bottom:17px;left:50%;transform:translateX(-50%);z-index:40;background:var(--navy);color:white;padding:10px 13px;font-size:9px;box-shadow:0 8px 22px #10295130;max-width:min(540px,calc(100vw - 28px))}
        @media(max-width:1000px){.rve-workspace{grid-template-columns:minmax(0,1fr) 285px}.rve-shell{grid-template-columns:175px minmax(0,1fr)}.rve-main{padding-inline:13px}.rve-top{padding-inline:13px;gap:9px}.rve-action{padding:7px}.rve-crumb{display:none}}
        @media(max-width:760px){.rve-top{height:auto;min-height:56px;flex-wrap:wrap;padding:8px 10px}.rve-topright{gap:5px}.rve-topright .rve-action span{display:none}.rve-status{display:none}.rve-shell{grid-template-columns:1fr}.rve-side{position:sticky;top:0;z-index:7;padding:6px 8px;border:0;border-bottom:1px solid var(--line);display:block}.rve-side>div:first-child{display:flex;align-items:center}.rve-kicker{display:none}.rve-side nav{display:flex;overflow:auto;gap:2px}.rve-sidebutton{width:auto;white-space:nowrap;padding:8px}.rve-sidebutton span{font-size:9px}.rve-editioncallout{display:none}.rve-main{padding:12px 9px 20px}.rve-workspace{grid-template-columns:1fr}.rve-inspector{position:static;min-height:0}.rve-inspectorfoot{margin-top:0}.rve-workflow{align-items:flex-start;flex-direction:column}.rve-steps{flex-wrap:wrap;gap:8px}.rve-bar{flex-wrap:wrap}.rve-bar-right{width:100%;margin-left:0}.rve-hero{grid-template-columns:1fr;padding:20px 5%}.rve-hero-media{height:135px}.rve-sitehead{padding:0 14px;gap:14px}.rve-sitenav{gap:9px}.rve-contentsection{padding:15px 5%}.rve-contenthead h2{font-size:16px}.rve-cards{grid-template-columns:1fr}.rve-industrygrid{grid-template-columns:repeat(2,minmax(0,1fr))}.rve-servicelist{grid-template-columns:1fr}.rve-routeintro{padding:17px}.rve-edition>button{padding:6px;font-size:8px}}
      `}</style>

      <header className="rve-top">
        <div className="rve-brand">cognirise <i>pulse</i></div>
        <div className="rve-divider" />
        <div className="rve-crumb">Editorial workspace <span style={{ padding: "0 5px", color: "#8090a9" }}>›</span> Page editor</div>
        <div className="rve-topright">
          <div className="rve-edition">
            <button onClick={() => setShowEditionMenu((value) => !value)} aria-expanded={showEditionMenu}>
              <Globe2 /> {selected.market} · {selected.locale} <ChevronDown />
            </button>
            {showEditionMenu && <div className="rve-menu">
              {editions.map((edition) => <button key={edition.id} className={selectedId === edition.id ? "chosen" : ""} onClick={() => { setSelectedId(edition.id); setShowEditionMenu(false); setSaved(false); }}>
                <span>{edition.market}<small>{edition.locale} · from {edition.inherited}</small></span><span className={`rve-state-chip ${edition.status === "Published" ? "" : "draft"}`}>{edition.status}</span>
              </button>)}
              <button onClick={() => { setShowEditionMenu(false); setShowAddEdition(true); }}><span><Plus size={13} /> Add regional edition</span><span>+</span></button>
            </div>}
          </div>
          <span className="rve-status">{saved ? "Draft saved locally" : `Illustrative data · ${currentStatus}`}</span>
          <button className="rve-action" onClick={() => announce("Buyer preview is shown on the canvas for this exact regional edition.")}><Eye /><span>Preview</span></button>
          <button className="rve-action primary" onClick={() => { setSaved(true); announce(`Draft saved locally for ${selected.market} · ${selected.locale}.`); }}><Save /><span>Save draft</span></button>
        </div>
      </header>

      <div className="rve-shell">
        <aside className="rve-side">
          <div>
            <div className="rve-kicker">This edition · {selected.locale}</div>
            <nav aria-label="Page content">
              {sections.map(({ id, title, icon: Icon, hint }) => <button key={id} className={`rve-sidebutton ${active === id ? "active" : ""}`} onClick={() => { setActive(id); if (id === "home") setHomeTarget("hero"); }}><Icon /><span>{title}</span><span style={{ marginLeft: "auto", color: "#8993a0", fontSize: 7 }}>{hint}</span></button>)}
            </nav>
          </div>
          <div className="rve-editioncallout">
            <div className="rve-kicker" style={{ padding: 0 }}>Edition inheritance</div>
            <strong>{selected.market} · {selected.locale}</strong>
            <p>{selected.inherited} is preview provenance only—not automatic fallback or publication. Changes here are scoped to this market and language; records stay linked.</p>
            <button onClick={() => announce(`Compare ${selected.locale} with ${selected.inherited}: differences are marked in the inspector.`)}><ArrowLeftRight /> Compare with source</button>
          </div>
        </aside>

        <main className="rve-main">
          <div className="rve-bar">
            <button className="rve-back" aria-label="Back" onClick={() => announce("You are editing one exact regional edition.")}><ArrowDown style={{ transform: "rotate(90deg)" }} /></button>
            <span className="rve-page-title">{sections.find((section) => section.id === active)?.title}</span><span className="rve-page-meta">/ {selected.market} / {selected.locale} · exact edition</span>
            <div className="rve-bar-right"><span className="rve-preview-label"><Monitor /> Buyer view · local draft</span><button className="rve-action" onClick={() => setShowAddEdition(true)}><Plus /><span>Manage editions</span></button></div>
          </div>

          <div className="rve-workspace">
            <section className="rve-canvas">
              <div className="rve-canvashead"><span><Eye /> {active === "home" ? "Homepage" : sections.find((section) => section.id === active)?.title} · {selected.locale} edition</span><span><i className="rve-live-dot" /> illustrative preview · layout fixed by website</span></div>
              <div className="rve-site" dir={rtl}>
                <header className="rve-sitehead"><span className="rve-wordmark">cognirise <i>pulse</i></span><nav className="rve-sitenav"><span>What we do</span><span>Industries</span><span>Our thinking</span><span>About</span></nav></header>
                {active === "home" ? <>
                  <section className={`rve-hero ${homeTarget === "hero" ? "selected" : ""}`} onClick={() => setHomeTarget("hero")}>
                    {homeTarget === "hero" && <span className="rve-image-tag" style={{ top: 8, bottom: "auto", left: 8, right: "auto" }}><Layers3 size={9} style={{ verticalAlign: "-2px" }} /> HOMEPAGE FIELD · THIS EDITION</span>}
                    <div><div className="rve-overline">{localeIsArabic ? "COGNIRISE PULSE · REGION" : "ENTERPRISE TRANSFORMATION, MADE REAL"}</div><h1>{selected.headline}</h1><p>{selected.subhead}</p><span className="rve-hero-cta">{localeIsArabic ? "اكتشف الإمكانات" : "Explore what’s possible"} <ArrowRight /></span></div>
                    <div className="rve-hero-media"><img src={selected.image} alt="Selected regional homepage image" /><span className="rve-image-tag">HOMEPAGE MEDIA · {selected.locale.toUpperCase()}</span></div>
                  </section>
                  <div className="rve-proof"><span>No long pilots. Prototype in 48 hours.</span><span>We don’t bill mandays. We deliver outcomes.</span><span>Working solutions, not PowerPoints.</span></div>
                  <section className={`rve-contentsection ${homeTarget === "industries" ? "selected" : ""}`} onClick={() => setHomeTarget("industries")}>
                    <div className="rve-contenthead"><div><small>APPLIED EXPERTISE · INDUSTRY RECORDS</small><h2>Built on expertise.</h2></div><span className="rve-record-origin">6 linked source records</span></div>
                    <div className="rve-industrygrid">{homepageIndustries.map((industry) => <div className="rve-industry" key={industry.title}><img src={industry.image} alt="" /><b>{industry.title}</b></div>)}</div>
                    <div className="rve-record-origin">Card titles and images come from governed Industry records, not this page.</div>
                  </section>
                  <section className={`rve-contentsection ${homeTarget === "services" ? "selected" : ""}`} onClick={() => setHomeTarget("services")}>
                    <div className="rve-contenthead"><div><small>WHAT WE DO · SERVICE-LINE RECORDS</small><h2>Strategy, engineering and platform.</h2></div><span className="rve-record-origin">Linked services</span></div>
                    <div className="rve-servicelist">{homepageServices.map((service) => <div className="rve-service" key={service}>{service}</div>)}</div>
                  </section>
                  <footer className="rve-sitefoot"><span>COGNIRISE PULSE</span><span>{selected.market.toUpperCase()} · {selected.locale.toUpperCase()}</span></footer>
                </> : active === "team" ? <section className="rve-routepage">
                  <div className="rve-routeintro"><small>ABOUT · PEOPLE SOURCE RECORDS</small><h1>People & team</h1><p>Profiles included in {selected.market} · {selected.locale}. Inclusion is edition-scoped; source Person records remain independent.</p></div>
                  <div className="rve-originbar">Buyer preview context · Team page only · illustrative records · excluded profiles stay suppressed in this edition.</div>
                  <div className="rve-cards">{selectedTeam.map((person) => { const personName = selected.itemOverrides[person.id] || person.name; return <div className="rve-card rve-person-card" key={person.id}><span className="rve-person-initials">{personName.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><span><strong>{personName}</strong><small>{person.role} · {person.market} · {person.source}</small></span></div>; })}</div>
                  <footer className="rve-sitefoot" style={{ marginTop: 28 }}><span>COGNIRISE PULSE · PEOPLE</span><span>{selected.market.toUpperCase()} · {selected.locale.toUpperCase()}</span></footer>
                </section> : active === "case-studies" ? <section className="rve-routepage">
                  <div className="rve-routeintro"><small>OUR WORK · CASE STUDY SOURCE RECORDS</small><h1>Selected work.</h1><p>Case studies available or featured in this edition, linked back to their source records.</p></div>
                  <div className="rve-originbar">Buyer preview context · Case studies route only · illustrative source records, not Homepage content.</div>
                  <div className="rve-cards">{selectedStories.map((story) => <div className="rve-card" key={story.id}><img src={selected.itemImages[story.id] || story.image} alt="" /><span><strong>{selected.itemOverrides[story.id] || story.title}</strong><small>{story.label} · source {story.id}</small></span></div>)}</div>
                  <footer className="rve-sitefoot" style={{ marginTop: 28 }}><span>COGNIRISE PULSE · CASE STUDIES</span><span>{selected.market.toUpperCase()} · {selected.locale.toUpperCase()}</span></footer>
                </section> : <section className="rve-routepage">
                  <div className="rve-routeintro"><small>OUR THINKING · INSIGHT SOURCE RECORDS</small><h1>Ideas for the work ahead.</h1><p>Insights selected for {selected.market} · {selected.locale}; localized headlines remain tied to their source records.</p></div>
                  <div className="rve-originbar">Buyer preview context · Insights route only · edition-specific featured selection.</div>
                  <div className="rve-cards rve-insight-cards">{selectedInsights.map((insight) => <div className="rve-card" key={insight.id}><span><strong>{selected.itemOverrides[insight.id] || insight.title}</strong><small>{insight.label} · source {insight.id}</small></span></div>)}</div>
                  <footer className="rve-sitefoot" style={{ marginTop: 28 }}><span>COGNIRISE PULSE · INSIGHTS</span><span>{selected.market.toUpperCase()} · {selected.locale.toUpperCase()}</span></footer>
                </section>}
              </div>
            </section>

            <aside className="rve-inspector">
              <header className="rve-inspectorhead"><div><small>{selected.market} · {selected.locale} / {active === "home" ? homeTarget === "hero" ? "Homepage fields" : homeTarget === "industries" ? "Industry collection" : "Service-line records" : active === "team" ? "People records" : active === "case-studies" ? "Case study records" : "Insight records"}</small><h2>{active === "home" ? homeTarget === "hero" ? "Hero content" : homeTarget === "industries" ? "Industries" : "Services" : sections.find((section) => section.id === active)?.title}</h2><p>Scope: {selected.market} · {selected.locale}</p></div><span className="rve-state-chip">{currentStatus}</span></header>
              {active === "home" ? <div className="rve-inspectorbody">
                <div className="rve-scope-note"><Languages /> <span><b>{selected.locale} edition</b><br />“{selected.inherited}” is preview provenance only—not automatic fallback or publication.</span></div>
                {homeTarget === "hero" ? <>
                  <div className="rve-field"><label htmlFor="rve-headline">Hero headline · homepage field</label><textarea id="rve-headline" dir={rtl} value={selected.headline} onChange={(event) => update({ headline: event.target.value })} /></div>
                  <div className="rve-field"><label htmlFor="rve-subhead">Supporting text · homepage field</label><textarea id="rve-subhead" dir={rtl} value={selected.subhead} onChange={(event) => update({ subhead: event.target.value })} /></div>
                  <div className="rve-field"><label htmlFor="rve-image">Hero image · approved media reference</label><select id="rve-image" value={selected.image} onChange={(event) => update({ image: event.target.value })}>{imageOptions.map((image) => <option key={image.src} value={image.src}>{image.label}</option>)}</select><div className="rve-fieldhelp">Media availability and approvals must be checked for this exact edition.</div></div>
                  <button className="rve-inherit" onClick={() => { update({ headline: drafts["uae-en"].headline, subhead: drafts["uae-en"].subhead, image: drafts["uae-en"].image }); announce("Example copy reset to the UAE English source."); }}><RotateCcw /> Reset text and image to UAE · English source</button>
                </> : homeTarget === "industries" ? <>
                  <div className="rve-scope-note"><Layers3 /> Industry cards link to six separate governed Industry records. Their titles and images are not copied into this page.</div>
                  <div className="rve-recordlist">{homepageIndustries.map((industry) => <div className="rve-record" key={industry.title}><img src={industry.image} alt="" /><span><b>{industry.title}</b><small>Industry source record · shared entry</small></span></div>)}</div>
                  <div className="rve-scope-note"><CircleAlert /> This fixed homepage composition does not currently expose regional card-count or ordering controls.</div>
                </> : <>
                  <div className="rve-scope-note"><Layers3 /> Services are linked service-line records, not text duplicated in the regional Homepage entry.</div>
                  <div className="rve-recordlist">{homepageServices.map((service) => <div className="rve-record" key={service}><span><b>{service}</b><small>Service-line source record · shared entry</small></span></div>)}</div>
                  <div className="rve-scope-note"><CircleAlert /> Page layout and service-tile structure are renderer-owned.</div>
                </>}
                <div className="rve-scope-note"><CircleAlert /> Page composition and section layout are website-owned. Only named content fields and references can be edited here.</div>
              </div> : <div className="rve-inspectorbody">
                {active === "team" ? <div className="rve-scope-note"><ShieldCheck /> Inclusion is scoped to this exact edition. Turning a person off suppresses them here; the inherited source cannot make that person reappear.</div> : <div className="rve-scope-note"><ShieldCheck /> Choose records available or featured in this route for {selected.market} · {selected.locale}. Source entries remain separate from Homepage fields.</div>}
                <div className="rve-field"><span className="rve-field-label">{active === "team" ? "People included in this edition" : active === "case-studies" ? "Case studies featured in this route" : "Insights featured in this route"}</span><div className="rve-recordlist">{menuItems.map((item) => {
                  const key = active === "team" ? "team" : active === "case-studies" ? "stories" : "insights";
                  const checked = selected[key].includes(item.id);
                  const sourceName = "source" in item ? item.source : `${active === "case-studies" ? "Case study" : "Insight"} source · ${item.id}`;
                  return <div className="rve-record-entry" key={item.id}>
                    <label className="rve-record"><input type="checkbox" checked={checked} onChange={() => toggleRecord(key, item.id)} />{"image" in item && typeof item.image === "string" && <img src={item.image} alt="" />}<span><b>{"name" in item ? item.name : item.title}</b><small>{"role" in item ? item.role : item.label} · {sourceName}</small></span></label>
                    <button className="rve-source-link" onClick={() => announce(`Open ${sourceName}; source stays separate from this edition.`)}>Open source <ExternalLink /></button>
                  </div>;
                })}</div>
                  <div className="rve-fieldhelp">Checked entries appear in the {active === "team" ? "People & team page" : active === "case-studies" ? "Case Studies route" : "Insights route"} preview—not on Homepage.</div>
                  <div className="rve-localized-fields"><strong>{active === "team" ? "Exact-edition Person variants" : "Exact-edition content variants"}</strong>
                    {menuItems.filter((item) => activeRecords.includes(item.id)).map((item) => {
                      const fallbackTitle = "name" in item ? item.name : item.title;
                      const baseImage = "image" in item && typeof item.image === "string" ? item.image : "";
                      return <div className="rve-localized-field" key={item.id}>
                        <label htmlFor={`local-${selectedId}-${item.id}`}>{active === "team" ? "Display name · Person record variant" : active === "case-studies" ? "Localized case-study title" : "Localized insight title"}</label>
                        <input id={`local-${selectedId}-${item.id}`} dir={rtl} value={selected.itemOverrides[item.id] ?? ""} placeholder={fallbackTitle} onChange={(event) => updateLocalizedItem(item.id, event.target.value)} />
                        <small>Blank uses source for preview only; it does not publish fallback content.</small>
                        {active === "case-studies" && baseImage && <><label htmlFor={`image-${selectedId}-${item.id}`} style={{ marginTop: 7 }}>Edition image reference</label><select id={`image-${selectedId}-${item.id}`} value={selected.itemImages[item.id] ?? baseImage} onChange={(event) => updateLocalizedImage(item.id, event.target.value)}>{imageOptions.map((option) => <option key={option.src} value={option.src}>{option.label}</option>)}</select></>}
                      </div>;
                    })}
                  </div>
                </div>
                <button className="rve-inherit" onClick={() => announce(`Source records for ${selected.market} · ${selected.locale} remain independently governed.`)}><ExternalLink /> Open selected source records</button>
                <div className="rve-scope-note"><CircleAlert /> Names, localized titles, media rights and disclosure changes require their own review before they can be released.</div>
              </div>}
              <footer className="rve-inspectorfoot"><button onClick={() => announce("Preview is a local example for the selected edition.")}><Eye /> Preview</button><button className="primary" onClick={() => { setSaved(true); announce(`Local draft saved for ${selected.market} · ${selected.locale}.`); }}><Save /> Save draft</button></footer>
            </aside>
          </div>

          <section className="rve-workflow">
            <small>Exact-edition workflow · Save is not approval or publication</small>
            <div className="rve-steps"><span className="rve-step active"><b>1</b> Draft</span><span className="rve-step"><b>2</b> Independent review</span><span className="rve-step"><b>3</b> Publish edition</span><span className="rve-step"><b>4</b> Release Center scope</span></div>
            <button className="rve-action" style={{ color: "var(--navy)", borderColor: "#cbd1d2" }} onClick={() => setWorkflow("review")}><Send /><span>Request review</span></button>
            <button className="rve-action" style={{ color: "var(--navy)", borderColor: "#cbd1d2" }} onClick={() => setWorkflow("release")}><ShieldCheck /><span>Release Center</span></button>
          </section>
        </main>
      </div>

      {showAddEdition && <div className="rve-modalback" onClick={() => setShowAddEdition(false)}><section className="rve-modal" onClick={(event) => event.stopPropagation()}>
        <header className="rve-modalhead"><div><small>Regional configuration</small><h2>Add a market edition</h2></div><button aria-label="Close" onClick={() => setShowAddEdition(false)}><X size={16} /></button></header>
        <p>Create a distinct destination first. This will not copy content, translate pages, approve media, or publish anything.</p>
        <div className="rve-field"><label>Strategic market</label><select value={newMarket} onChange={(event) => setNewMarket(event.target.value)}>{["UAE", "KSA", "Türkiye", "Europe"].map((market) => <option key={market}>{market}</option>)}</select></div>
        <div className="rve-field" style={{ marginTop: 10 }}><label>Language</label><select value={newLocale} onChange={(event) => setNewLocale(event.target.value)}><option>English</option><option>Arabic</option><option>Turkish</option><option>French</option></select></div>
        <div className="rve-modalfoot"><button onClick={() => setShowAddEdition(false)}>Cancel</button><button className="primary" onClick={addEdition}>Create unconfigured edition</button></div>
      </section></div>}
      {workflow !== "none" && <div className="rve-modalback" onClick={() => setWorkflow("none")}><section className="rve-modal" onClick={(event) => event.stopPropagation()}>
        <header className="rve-modalhead"><div><small>{workflow === "review" ? "Independent review" : "Scoped publication"}</small><h2>{workflow === "review" ? "Request review for this edition?" : "Open Release Center"}</h2></div><button aria-label="Close" onClick={() => setWorkflow("none")}><X size={16} /></button></header>
        <p>{workflow === "review" ? `This sends the saved ${selected.market} · ${selected.locale} revision to a separate reviewer. Review does not publish.` : `Release Center controls destination scope after reviewer approval and edition publication. Nothing publishes from this prototype.`}</p>
        <div className="rve-modalfoot"><button onClick={() => setWorkflow("none")}>Back to editing</button><button className="primary" onClick={() => { setWorkflow("none"); announce("Workflow action illustrated only. No request or publication occurred."); }}>{workflow === "review" ? "Continue to review request" : "Review release scope"}</button></div>
      </section></div>}
      {notice && <div className="rve-toast" role="status">{notice}</div>}
    </div>
  );
}