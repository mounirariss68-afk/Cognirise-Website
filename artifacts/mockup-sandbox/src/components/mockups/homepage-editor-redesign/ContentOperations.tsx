import { useMemo, useState } from "react";
import {
  ArrowDownUp, ArrowRight, ArrowUpRight, BadgeCheck, CalendarDays,
  Check, ChevronDown, CircleAlert, Clock3, Eye, FilePlus2, Globe2,
  House, Languages, MoreHorizontal, Newspaper, Plus, Search,
  Send, ShieldCheck, SlidersHorizontal, UsersRound, X,
} from "lucide-react";

type View = "editions" | "stories" | "people" | "homepage";
type EditionStatus = "Published" | "In review" | "Draft" | "Needs setup";
type StoryStatus = "Published" | "Draft" | "In review";

type Edition = {
  id: string;
  market: string;
  locale: string;
  status: EditionStatus;
  revision: string;
  changed: string;
  note: string;
};

type Story = {
  id: string;
  title: string;
  client: string;
  sector: string;
  market: string;
  status: StoryStatus;
  changed: string;
  image: string;
};

type Person = {
  id: string;
  name: string;
  role: string;
  market: string;
  status: "Published" | "Draft";
  initials: string;
};

const initialEditions: Edition[] = [
  { id: "uae-en", market: "United Arab Emirates", locale: "English", status: "Published", revision: "r18", changed: "12 Jun 2025", note: "Current public edition" },
  { id: "uae-ar", market: "United Arab Emirates", locale: "Arabic", status: "Draft", revision: "r04", changed: "Edited 2 days ago", note: "Arabic adaptation in progress" },
  { id: "ksa-en", market: "Saudi Arabia", locale: "English", status: "In review", revision: "r09", changed: "Submitted yesterday", note: "Awaiting independent review" },
  { id: "ksa-ar", market: "Saudi Arabia", locale: "Arabic", status: "Needs setup", revision: "—", changed: "Not started", note: "No content configured yet" },
  { id: "qat-en", market: "Qatar", locale: "English", status: "Published", revision: "r07", changed: "28 May 2025", note: "Current public edition" },
];

const initialStories: Story[] = [
  { id: "cs-01", title: "From AI ambition to a governed operating model", client: "Regional financial group", sector: "Financial services", market: "UAE", status: "Published", changed: "Jun 12, 2025", image: "/__mockup/images/cognirise/site-financial.jpg" },
  { id: "cs-02", title: "Making citizen services work as one", client: "Public-sector authority", sector: "Public sector", market: "UAE", status: "In review", changed: "Jun 10, 2025", image: "/__mockup/images/cognirise/site-government.jpg" },
  { id: "cs-03", title: "A new operating rhythm for distributed teams", client: "Telecommunications provider", sector: "Telecommunications", market: "KSA", status: "Draft", changed: "Jun 09, 2025", image: "/__mockup/images/cognirise/pulse-library/cognirise-pulse-telecommunications-signal-field.jpg" },
  { id: "cs-04", title: "Modernizing the energy transition, step by step", client: "Energy company", sector: "Energy & resources", market: "Qatar", status: "Published", changed: "May 28, 2025", image: "/__mockup/images/cognirise/pulse-library/cognirise-pulse-energy-balancing-force.jpg" },
];

const initialPeople: Person[] = [
  { id: "p-01", name: "Maya Rahman", role: "Managing Partner, Middle East", market: "UAE · English", status: "Published", initials: "MR" },
  { id: "p-02", name: "Omar Al-Khatib", role: "Partner, Strategy & Transformation", market: "UAE · Arabic + English", status: "Published", initials: "OA" },
  { id: "p-03", name: "Lina Haddad", role: "Director, Applied AI", market: "KSA · English", status: "Draft", initials: "LH" },
  { id: "p-04", name: "Samir Nasser", role: "Principal, Operating Model", market: "Qatar · English", status: "Published", initials: "SN" },
];

const navItems: { id: View; label: string; icon: typeof Globe2; hint?: string }[] = [
  { id: "editions", label: "Regional editions", icon: Globe2 },
  { id: "stories", label: "Case studies", icon: Newspaper, hint: "4" },
  { id: "people", label: "People", icon: UsersRound, hint: "4" },
  { id: "homepage", label: "Homepage", icon: House, hint: "Occasional" },
];

const statusClass = (status: EditionStatus | StoryStatus | Person["status"]) =>
  status.toLowerCase().replaceAll(" ", "-");

export function ContentOperations() {
  const [view, setView] = useState<View>("editions");
  const [editions, setEditions] = useState(initialEditions);
  const [stories, setStories] = useState(initialStories);
  const [people, setPeople] = useState(initialPeople);
  const [selectedEditionId, setSelectedEditionId] = useState("uae-en");
  const [storyFilter, setStoryFilter] = useState<"All" | StoryStatus>("All");
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState<"new-story" | "new-person" | "edition" | "record" | null>(null);
  const [notice, setNotice] = useState("");
  const [recordTitle, setRecordTitle] = useState("");
  const [recordKind, setRecordKind] = useState<"story" | "person">("story");
  const [formTitle, setFormTitle] = useState("");
  const [formDetail, setFormDetail] = useState("");
  const [formSector, setFormSector] = useState("Financial services");
  const [formMarket, setFormMarket] = useState("UAE");
  const [recordDetail, setRecordDetail] = useState("");
  const [recordSector, setRecordSector] = useState("");
  const [recordMarket, setRecordMarket] = useState("");
  const [editionMarket, setEditionMarket] = useState("Oman");
  const [editionLocale, setEditionLocale] = useState("English");

  const selectedEdition = editions.find((edition) => edition.id === selectedEditionId) ?? editions[0];
  const filteredStories = useMemo(() => stories.filter((story) => {
    const matchesStatus = storyFilter === "All" || story.status === storyFilter;
    const term = query.trim().toLowerCase();
    const matchesQuery = !term || [story.title, story.client, story.sector, story.market].some((value) => value.toLowerCase().includes(term));
    return matchesStatus && matchesQuery;
  }), [stories, storyFilter, query]);
  const filteredPeople = useMemo(() => people.filter((person) => {
    const term = query.trim().toLowerCase();
    return !term || [person.name, person.role, person.market].some((value) => value.toLowerCase().includes(term));
  }), [people, query]);

  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const switchView = (next: View) => {
    setView(next);
    setQuery("");
    setNotice("");
  };

  const addStory = () => {
    if (!formTitle.trim()) {
      announce("Add a working title before saving the case study.");
      return;
    }
    const created: Story = {
      id: `cs-${Date.now()}`,
      title: formTitle.trim(),
      client: formDetail.trim() || "Client details to add",
      sector: formSector,
      market: formMarket,
      status: "Draft",
      changed: "Just now",
      image: "/__mockup/images/cognirise/site-work-proof.jpg",
    };
    setStories((current) => [created, ...current]);
    setDrawer(null);
    setFormTitle("");
    setFormDetail("");
    switchView("stories");
    announce("Case study added to this local prototype as a draft.");
  };

  const addPerson = () => {
    if (!formTitle.trim()) {
      announce("Add a name before saving the profile.");
      return;
    }
    const created: Person = {
      id: `p-${Date.now()}`,
      name: formTitle.trim(),
      role: formDetail.trim() || "Role to add",
      market: `${formMarket} · English`,
      status: "Draft",
      initials: formTitle.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase(),
    };
    setPeople((current) => [created, ...current]);
    setDrawer(null);
    setFormTitle("");
    setFormDetail("");
    switchView("people");
    announce("Team profile added to this local prototype as a draft.");
  };

  const addEdition = () => {
    const created: Edition = {
      id: `edition-${Date.now()}`,
      market: editionMarket,
      locale: editionLocale,
      status: "Needs setup",
      revision: "—",
      changed: "Not started",
      note: "New market edition · setup required",
    };
    setEditions((current) => [...current, created]);
    setSelectedEditionId(created.id);
    setDrawer(null);
    announce(`${editionMarket} · ${editionLocale} added as an unconfigured edition.`);
  };

  const selectedStory = stories.find((story) => story.title === recordTitle);
  const selectedPerson = people.find((person) => person.name === recordTitle);
  const saveRecord = () => {
    if (recordKind === "story") {
      setStories((current) => current.map((story) => story.title === recordTitle ? {
        ...story, title: formTitle.trim() || recordTitle, client: recordDetail.trim() || story.client,
        sector: recordSector || story.sector, market: recordMarket || story.market,
        status: story.status === "Published" ? "Draft" : story.status, changed: "Just now",
      } : story));
      setRecordTitle(formTitle.trim() || recordTitle);
    } else {
      setPeople((current) => current.map((person) => person.name === recordTitle ? {
        ...person, name: formTitle.trim() || recordTitle, role: recordDetail.trim() || person.role,
        market: `${recordMarket || person.market.split(" · ")[0]} · English`,
        status: person.status === "Published" ? "Draft" : person.status,
        initials: (formTitle.trim() || recordTitle).split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase(),
      } : person));
      setRecordTitle(formTitle.trim() || recordTitle);
    }
    setDrawer(null);
    announce("Changes saved to a local draft example. A previously published record moves back to draft.");
  };

  return (
    <div className="co-shell">
      <style>{`
        .co-shell{--ink:#182b4a;--navy:#112851;--pink:#dc4e8a;--paper:#f5f3ee;--card:#fffefa;--line:#deddd6;--muted:#727e8d;--green:#467866;--amber:#bd8139;min-height:100dvh;background:var(--paper);color:var(--ink);font-family:var(--app-font-sans),sans-serif;font-size:13px}
        .co-shell *{box-sizing:border-box}.co-shell button,.co-shell input,.co-shell select,.co-shell textarea{font:inherit}.co-shell button{cursor:pointer}
        .co-top{height:58px;background:var(--navy);color:#f6f5f0;display:flex;align-items:center;padding:0 23px;gap:17px;border-bottom:1px solid #314565;position:sticky;top:0;z-index:5}
        .co-logo{font:700 15px var(--app-font-display),sans-serif;letter-spacing:-.055em;white-space:nowrap}.co-logo i{font-style:normal;color:#ed77ab}
        .co-sep{height:20px;width:1px;background:#60708a}.co-context{font-size:11px;color:#c6cfda}.co-topright{display:flex;align-items:center;gap:9px;margin-left:auto}.co-statusline{font-size:9px;color:#f4cd94;text-transform:uppercase;letter-spacing:.11em;white-space:nowrap}
        .co-topbutton{border:1px solid #536581;background:transparent;color:#f6f5f0;padding:8px 10px;border-radius:3px;display:inline-flex;align-items:center;gap:7px;font-size:10px}.co-topbutton svg{width:13px;height:13px}.co-topbutton:hover{background:#ffffff12}
        .co-layout{min-height:calc(100dvh - 58px);display:grid;grid-template-columns:218px minmax(0,1fr)}
        .co-sidebar{background:#ecebe5;border-right:1px solid #d8d9d3;padding:21px 13px 14px;display:flex;flex-direction:column;gap:20px}
        .co-sidecaption{padding:0 9px 8px;font:9px var(--app-font-mono),monospace;letter-spacing:.13em;text-transform:uppercase;color:#89919a}
        .co-nav{display:grid;gap:3px}.co-nav button{display:flex;align-items:center;gap:10px;width:100%;border:0;border-radius:3px;background:transparent;text-align:left;color:#536176;padding:10px 9px;font-size:11px}.co-nav button.active{background:#fffefa;color:var(--navy);box-shadow:0 1px 3px #17294910;font-weight:600}.co-nav button:hover:not(.active){background:#e4e4de}.co-nav svg{width:15px;height:15px;flex:none}.co-navhint{margin-left:auto;font-size:8px;color:#9199a0}
        .co-sidecallout{margin-top:auto;background:var(--navy);color:#f5f3ed;padding:14px;border-radius:3px}.co-sidecallout small{font:8px var(--app-font-mono),monospace;letter-spacing:.12em;text-transform:uppercase;color:#d994b3}.co-sidecallout strong{display:block;font-size:12px;margin:7px 0 5px}.co-sidecallout p{font-size:9px;line-height:1.5;color:#c7ced8;margin:0 0 11px}.co-sidecallout button{border:0;background:transparent;padding:0;color:#f5a6c9;display:flex;align-items:center;gap:5px;font-size:9px}.co-sidecallout svg{width:12px;height:12px}
        .co-main{min-width:0;padding:25px clamp(17px,3vw,42px) 42px;max-width:1540px;width:100%;margin:0 auto}
        .co-headingrow{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:20px}.co-eyebrow{font:9px var(--app-font-mono),monospace;color:var(--pink);letter-spacing:.14em;text-transform:uppercase}.co-headingrow h1{font:600 clamp(25px,3vw,34px)/1.04 var(--app-font-display),sans-serif;letter-spacing:-.06em;margin:7px 0 7px;color:var(--navy)}.co-headingrow p{font-size:11px;color:var(--muted);margin:0}.co-heading-actions{display:flex;gap:8px;align-items:center}
        .co-button{border:1px solid #cdd2d3;background:#fffefa;color:#344965;border-radius:3px;padding:8px 11px;display:inline-flex;align-items:center;gap:7px;font-size:10px;white-space:nowrap}.co-button:hover{border-color:#b24c76;background:#fffafd}.co-button svg{width:13px;height:13px}.co-button.primary{background:var(--navy);border-color:var(--navy);color:#fff}.co-button.accent{background:var(--pink);border-color:var(--pink);color:white}
        .co-focusband{display:grid;grid-template-columns:minmax(0,1fr) 245px;gap:15px;margin-bottom:18px}
        .co-focus{min-height:112px;background:var(--navy);color:#f8f6f0;padding:19px 21px;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:20px}
        .co-focus:after{content:"";position:absolute;width:280px;height:280px;border:1px solid #ffffff18;border-radius:50%;right:130px;top:-150px;box-shadow:0 0 0 22px #ffffff08,0 0 0 44px #ffffff05;pointer-events:none}
        .co-focuscopy{position:relative;z-index:1}.co-focuscopy small{font:9px var(--app-font-mono),monospace;color:#ee8eb8;letter-spacing:.13em;text-transform:uppercase}.co-focuscopy h2{font:500 20px/1.15 var(--app-font-display),sans-serif;letter-spacing:-.04em;margin:8px 0 5px}.co-focuscopy p{margin:0;color:#c7ced9;font-size:10px;line-height:1.5;max-width:440px}.co-focusmetric{position:relative;z-index:1;text-align:right;white-space:nowrap}.co-focusmetric strong{display:block;font:500 32px/1 var(--app-font-display),sans-serif;letter-spacing:-.06em}.co-focusmetric span{display:block;margin-top:7px;color:#c9d1dc;font-size:9px}
        .co-summary{background:#eae8e0;border:1px solid var(--line);padding:15px;display:flex;flex-direction:column;justify-content:center}.co-summary label{font:8px var(--app-font-mono),monospace;letter-spacing:.12em;text-transform:uppercase;color:#7e8791}.co-summary strong{font:500 18px var(--app-font-display),sans-serif;color:var(--navy);margin:6px 0}.co-summary p{font-size:9px;line-height:1.45;color:#6d7887;margin:0}
        .co-contentgrid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(255px,.78fr);gap:15px;align-items:start}
        .co-panel{background:var(--card);border:1px solid var(--line)}.co-panelhead{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 12px;border-bottom:1px solid #e8e6e0;gap:12px}.co-paneltitle{display:flex;align-items:center;gap:8px}.co-paneltitle svg{width:15px;height:15px;color:var(--pink)}.co-paneltitle h2{font:600 12px var(--app-font-sans),sans-serif;margin:0;color:#213854}.co-paneltitle p{font-size:9px;color:#89919b;margin:4px 0 0}.co-panelactions{display:flex;align-items:center;gap:7px}
        .co-marketgroup{display:grid;grid-template-columns:150px minmax(0,1fr);border-bottom:1px solid #ebe9e3;min-height:72px}.co-marketgroup:last-child{border-bottom:0}.co-marketname{display:flex;align-items:center;gap:10px;padding:12px 14px;border-right:1px solid #eeece6}.co-marketmark{height:30px;width:30px;border:1px solid #dcdad2;background:#f1f0ea;display:grid;place-items:center;color:var(--navy);font:9px var(--app-font-mono),monospace}.co-marketname strong{display:block;font-size:10px;color:#30435e}.co-marketname small{display:block;font-size:8px;color:#9299a0;margin-top:4px}
        .co-editioncells{display:grid;grid-template-columns:repeat(auto-fit,minmax(157px,1fr));gap:7px;padding:9px}
        .co-editioncell{min-height:52px;border:1px solid transparent;background:#f7f6f2;text-align:left;padding:8px 9px;position:relative;transition:transform .16s,border-color .16s}.co-editioncell:hover{border-color:#c5ccd1;transform:translateY(-1px)}.co-editioncell.selected{border-color:#de5a91;background:#fff7fa;box-shadow:0 0 0 1px #de5a9130}.co-editiontop{display:flex;align-items:center;justify-content:space-between;gap:7px}.co-locale{font-size:9px;font-weight:600;color:#354962}.co-editioncell small{display:block;font-size:8px;color:#8b949d;margin-top:6px}.co-status{font:8px var(--app-font-mono),monospace;text-transform:uppercase;letter-spacing:.04em;padding:4px 5px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}.co-status:before{content:"";width:5px;height:5px;border-radius:50%;background:currentColor}.co-status.published{color:#467866;background:#e6efe9}.co-status.in-review{color:#a36c2e;background:#f6eddc}.co-status.draft{color:#ad4d74;background:#f7e8ee}.co-status.needs-setup{color:#737e8d;background:#eceeeF}
        .co-tablefoot{padding:10px 15px;border-top:1px solid #e8e6e0;background:#fbfaf7;color:#7d8794;font-size:8px;display:flex;align-items:center;justify-content:space-between;gap:8px}.co-tablefoot button{border:0;background:none;color:#9a456d;font-size:8px;display:flex;align-items:center;gap:5px}.co-tablefoot svg{width:11px;height:11px}
        .co-rightstack{display:grid;gap:13px}.co-detail{padding:14px 15px}.co-detailtop{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.co-detailtop small{font:8px var(--app-font-mono),monospace;letter-spacing:.11em;text-transform:uppercase;color:#888f98}.co-detailtop h3{font:500 17px/1.1 var(--app-font-display),sans-serif;letter-spacing:-.045em;color:var(--navy);margin:6px 0 5px}.co-detailtop p{font-size:9px;color:#778290;margin:0}.co-detailrev{font:9px var(--app-font-mono),monospace;background:#f0eee8;padding:5px 6px;color:#707b88}
        .co-detailstatus{display:flex;align-items:center;justify-content:space-between;padding:11px 0;margin-top:12px;border-block:1px solid #eceae4}.co-detailstatus span:first-child{font-size:9px;color:#7a8591}.co-detailstatus strong{font-size:9px;color:#37566f;font-weight:600}
        .co-scope-list{display:grid;gap:0}.co-scope-row{display:grid;grid-template-columns:1fr auto;gap:10px;padding:10px 0;border-bottom:1px solid #efede7;align-items:center}.co-scope-row:last-child{border-bottom:0}.co-scope-row strong{font-size:9px;color:#41536a;font-weight:600}.co-scope-row small{display:block;font-size:8px;color:#9399a1;margin-top:3px}.co-scope-state{font:8px var(--app-font-mono),monospace;color:#697785;text-align:right}.co-scope-state.issue{color:#b96a43}
        .co-reviewbox{background:#f3f1eb;border:1px solid #e3e0d8;padding:12px 13px}.co-reviewbox-head{display:flex;justify-content:space-between;align-items:center}.co-reviewbox-head b{font-size:9px;color:#344965}.co-reviewbox p{font-size:8px;line-height:1.5;color:#77828f;margin:7px 0 10px}.co-reviewbox button{border:0;background:none;padding:0;color:#a2446c;font-size:8px;display:flex;align-items:center;gap:5px}.co-reviewbox button svg{width:11px;height:11px}
        .co-worklist{margin-top:14px}.co-workrows{padding:3px 14px 4px}.co-workrow{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:9px;align-items:center;padding:9px 0;border-bottom:1px solid #efede8}.co-workrow:last-child{border:0}.co-workicon{height:28px;width:28px;display:grid;place-items:center;background:#f2f0e9;color:#a4476f}.co-workicon svg{width:13px;height:13px}.co-workrow strong{font-size:9px;color:#3d5068;display:block}.co-workrow small{display:block;margin-top:4px;font-size:8px;color:#9299a0}.co-workrow .co-status{font-size:7px}
        .co-sectionbar{display:flex;align-items:center;gap:9px;margin-bottom:13px}.co-search{display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid #d9dad4;background:#fffefa;min-width:235px}.co-search svg{width:13px;height:13px;color:#8c959e}.co-search input{border:0;outline:0;background:transparent;min-width:0;width:100%;font-size:10px;color:var(--ink)}.co-filter{display:flex;align-items:center;gap:6px;border:1px solid #d9dad4;background:#fffefa;padding:8px 9px;font-size:9px;color:#53657a}.co-filter svg{width:12px;height:12px}.co-toggle{display:flex;gap:3px;padding:3px;background:#e9e7e0;margin-left:auto}.co-toggle button{border:0;background:transparent;padding:6px 9px;color:#788391;font-size:8px}.co-toggle button.active{background:#fffefa;color:var(--navy);box-shadow:0 1px 2px #10295712}
        .co-record-list{border:1px solid var(--line);background:var(--card)}.co-record-head{display:grid;grid-template-columns:minmax(0,1fr) 128px 126px 94px 25px;gap:12px;padding:10px 14px;background:#f3f1eb;border-bottom:1px solid #e5e3dc;font:8px var(--app-font-mono),monospace;letter-spacing:.08em;text-transform:uppercase;color:#87909a}.co-record-row{display:grid;grid-template-columns:minmax(0,1fr) 128px 126px 94px 25px;gap:12px;align-items:center;padding:10px 14px;border-bottom:1px solid #edeae4;min-height:68px}.co-record-row:last-child{border:0}.co-record-main{display:flex;align-items:center;gap:10px;min-width:0}.co-record-img{height:42px;width:57px;object-fit:cover;flex:none;background:#e7e5df}.co-record-title{min-width:0}.co-record-title strong{font-size:10px;line-height:1.35;color:#2c425f;display:block}.co-record-title small{font-size:8px;color:#89929b;display:block;margin-top:5px}.co-record-cell{font-size:9px;color:#687687}.co-record-cell small{display:block;font-size:8px;color:#949ba1;margin-top:3px}.co-rowmenu{border:0;background:none;color:#77818c;padding:4px}.co-rowmenu svg{width:15px;height:15px}.co-empty{padding:34px 20px;text-align:center;color:#75808d;font-size:10px}.co-empty strong{display:block;color:#30435d;font-size:12px;margin-bottom:6px}
        .co-people-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.co-person{background:var(--card);border:1px solid var(--line);padding:14px;display:grid;grid-template-columns:42px 1fr auto;gap:11px;align-items:center;cursor:pointer;transition:transform .16s,border-color .16s}.co-person:hover{transform:translateY(-1px);border-color:#c3c9ce}.co-avatar{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#e6e5dc;color:#344c68;font:10px var(--app-font-mono),monospace}.co-person:nth-child(3n+2) .co-avatar{background:#f4e6eb;color:#944b6a}.co-person strong{display:block;font-size:10px;color:#30445f}.co-person small{display:block;font-size:8px;color:#7f8994;margin-top:4px}.co-person-meta{display:flex;align-items:center;gap:7px;margin-top:8px}.co-person-markets{font-size:8px;color:#9299a0}.co-person>svg{width:14px;height:14px;color:#89929b}
        .co-homecard{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(230px,.8fr);gap:18px;align-items:stretch}.co-homepreview{background:#fffefa;border:1px solid var(--line);padding:21px;position:relative;overflow:hidden}.co-homepreview small{font:8px var(--app-font-mono),monospace;color:#a54c75;letter-spacing:.11em;text-transform:uppercase}.co-homepreview h2{font:500 clamp(23px,2.8vw,34px)/1 var(--app-font-display),sans-serif;letter-spacing:-.065em;color:#172f52;max-width:450px;margin:16px 0 10px}.co-homepreview p{font-size:10px;color:#75818e;line-height:1.5;max-width:350px}.co-homeimage{margin:17px 0 0;height:128px;background:#e4e5e2;overflow:hidden}.co-homeimage img{width:100%;height:100%;object-fit:cover;object-position:center 40%}.co-homeaside{display:grid;align-content:start;gap:10px}.co-homeaside section{background:var(--card);border:1px solid var(--line);padding:15px}.co-homeaside h3{font:600 10px var(--app-font-sans),sans-serif;margin:0 0 9px}.co-homeaside p{font-size:9px;line-height:1.5;color:#78838f;margin:0}.co-homeaside .co-button{margin-top:11px}.co-mutedtag{display:inline-flex;align-items:center;gap:5px;border:1px solid #e0ddd5;background:#f3f1eb;padding:5px 7px;font:8px var(--app-font-mono),monospace;color:#717b88}
        .co-drawerback{position:fixed;inset:0;background:#14284855;z-index:20;display:flex;justify-content:flex-end;animation:co-fade .18s ease-out}.co-drawer{width:min(430px,100%);height:100%;background:#f8f7f3;border-left:1px solid #d2d5d3;box-shadow:-16px 0 40px #14284824;padding:21px;display:flex;flex-direction:column;gap:14px;overflow:auto;animation:co-slide .2s ease-out}.co-drawerhead{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e1dfd8;padding-bottom:13px}.co-drawerhead small{font:8px var(--app-font-mono),monospace;color:var(--pink);letter-spacing:.12em;text-transform:uppercase}.co-drawerhead h2{font:500 22px var(--app-font-display),sans-serif;letter-spacing:-.05em;margin:5px 0 0;color:var(--navy)}.co-iconbtn{border:0;background:none;color:#778390;padding:4px}.co-iconbtn svg{width:17px;height:17px}.co-formfield label{display:block;font-size:9px;color:#687789;margin-bottom:6px}.co-formfield input,.co-formfield select,.co-formfield textarea{width:100%;border:1px solid #d4d8d8;background:#fffefa;color:#253a58;padding:10px;font-size:11px;outline-color:#dc4e8a}.co-formfield textarea{min-height:100px;resize:vertical}.co-formhelp{font-size:8px;color:#88919b;line-height:1.5;margin-top:6px}.co-drawerfooter{margin-top:auto;border-top:1px solid #dfded8;padding-top:13px;display:flex;justify-content:space-between;gap:8px}.co-drawerinfo{display:flex;gap:9px;background:#f0eee8;border:1px solid #e3e0d8;padding:11px;font-size:8px;line-height:1.5;color:#76818d}.co-drawerinfo svg{width:14px;height:14px;flex:none;color:#b77a36}
        .co-toast{position:fixed;z-index:30;bottom:20px;left:50%;transform:translateX(-50%);background:var(--navy);color:#fff;padding:10px 14px;box-shadow:0 8px 24px #1428482a;font-size:9px;animation:co-fade .18s ease-out}
        @keyframes co-fade{from{opacity:0}to{opacity:1}}@keyframes co-slide{from{transform:translateX(12px);opacity:.6}to{transform:translateX(0);opacity:1}}
        @media(max-width:980px){.co-layout{grid-template-columns:184px minmax(0,1fr)}.co-contentgrid{grid-template-columns:minmax(0,1fr)}.co-rightstack{grid-template-columns:repeat(2,minmax(0,1fr))}.co-record-head,.co-record-row{grid-template-columns:minmax(0,1fr) 105px 115px 90px 20px;gap:8px}.co-marketgroup{grid-template-columns:130px minmax(0,1fr)}}
        @media(max-width:690px){.co-top{padding:0 11px;gap:9px}.co-context,.co-sep{display:none}.co-statusline{display:none}.co-topbutton{padding:7px}.co-layout{grid-template-columns:1fr}.co-sidebar{position:sticky;top:58px;z-index:4;padding:5px 8px;border-right:0;border-bottom:1px solid #d5d6d0;display:block}.co-sidecaption,.co-sidecallout{display:none}.co-nav{display:flex;overflow:auto;gap:3px}.co-nav button{width:auto;white-space:nowrap;padding:8px}.co-navhint{display:none}.co-main{padding:18px 11px 30px}.co-headingrow{align-items:flex-start;flex-direction:column}.co-heading-actions{width:100%}.co-focusband{grid-template-columns:1fr}.co-focus{min-height:104px;padding:16px}.co-focusmetric strong{font-size:27px}.co-contentgrid{grid-template-columns:1fr}.co-rightstack{grid-template-columns:1fr}.co-marketgroup{grid-template-columns:1fr}.co-marketname{border-right:0;border-bottom:1px solid #efede8;padding-bottom:5px}.co-editioncells{grid-template-columns:repeat(2,minmax(0,1fr))}.co-sectionbar{flex-wrap:wrap}.co-search{flex:1;min-width:165px}.co-toggle{margin-left:0}.co-record-head{display:none}.co-record-row{grid-template-columns:minmax(0,1fr) 24px;gap:7px}.co-record-cell{display:none}.co-people-grid{grid-template-columns:1fr}.co-homecard{grid-template-columns:1fr}.co-topright{gap:5px}.co-topbutton span{display:none}}
      `}</style>

      <header className="co-top">
        <div className="co-logo">cognirise <i>pulse</i></div>
        <div className="co-sep" />
        <div className="co-context">Editorial workspace <span style={{ color: "#7889a2", padding: "0 5px" }}>›</span> {view === "editions" ? "Regional editions" : view === "stories" ? "Case studies" : view === "people" ? "People" : "Homepage"}</div>
        <div className="co-topright">
          <span className="co-statusline">Concept · local example data</span>
          <button className="co-topbutton" onClick={() => announce("This prototype shows editorial controls; it is not connected to the CMS.")}><Eye /><span>Preview site</span></button>
          <button className="co-topbutton" onClick={() => announce("Account and governance controls would appear here.")}><MoreHorizontal /></button>
        </div>
      </header>

      <div className="co-layout">
        <aside className="co-sidebar">
          <div>
            <div className="co-sidecaption">Workspace</div>
            <nav className="co-nav" aria-label="Editorial sections">
              {navItems.map(({ id, label, icon: Icon, hint }) => (
                <button key={id} className={view === id ? "active" : ""} onClick={() => switchView(id)}>
                  <Icon /><span>{label}</span>{hint && <span className="co-navhint">{hint}</span>}
                </button>
              ))}
            </nav>
          </div>
          <div className="co-sidecallout">
            <small>Release discipline</small>
            <strong>Localize with confidence.</strong>
            <p>Every market and language edition keeps its own draft, review, and publication state.</p>
            <button onClick={() => announce("The exact-edition release path is shown in the current edition panel.")}>How editions work <ArrowRight /></button>
          </div>
        </aside>

        <main className="co-main">
          {view === "editions" && <>
            <div className="co-headingrow">
              <div><div className="co-eyebrow">Regional publishing</div><h1>One site. Every market, in sync.</h1><p>Manage language-specific editions without losing track of what is live where.</p></div>
              <div className="co-heading-actions">
                <button className="co-button" onClick={() => announce("Edition comparison is a local prototype control.")}><ArrowDownUp /> Compare editions</button>
                <button className="co-button primary" onClick={() => setDrawer("edition")}><Plus /> Add an edition</button>
              </div>
            </div>

            <div className="co-focusband">
              <section className="co-focus">
                <div className="co-focuscopy"><small>Regional governance · overview</small><h2>Know what’s ready, before you release.</h2><p>Editorial changes are grouped by market and language. Reviewer approval and public release stay explicit, separate steps.</p></div>
                <div className="co-focusmetric"><strong>{editions.length}</strong><span>editions in scope</span></div>
              </section>
              <section className="co-summary"><label>Needs attention</label><strong>{editions.filter((edition) => edition.status === "Draft" || edition.status === "In review" || edition.status === "Needs setup").length} editions</strong><p>Drafts, queued reviews and locales that haven’t been set up yet.</p></section>
            </div>

            <div className="co-contentgrid">
              <section className="co-panel">
                <header className="co-panelhead">
                  <div className="co-paneltitle"><Globe2 /><div><h2>Market × language</h2><p>Select an exact edition to see its release state</p></div></div>
                  <div className="co-panelactions"><button className="co-button" onClick={() => announce("Filters would narrow this edition matrix by market and locale.")}><SlidersHorizontal /> Filter</button></div>
                </header>
                <div>
                  {Array.from(new Set(editions.map((edition) => edition.market))).map((market) => {
                    const group = editions.filter((edition) => edition.market === market);
                    const code = market === "United Arab Emirates" ? "AE" : market === "Saudi Arabia" ? "SA" : market === "Qatar" ? "QA" : market.slice(0, 2).toUpperCase();
                    return <div className="co-marketgroup" key={market}>
                      <div className="co-marketname"><div className="co-marketmark">{code}</div><div><strong>{market}</strong><small>{group.length} {group.length === 1 ? "locale" : "locales"}</small></div></div>
                      <div className="co-editioncells">
                        {group.map((edition) => <button key={edition.id} className={`co-editioncell ${selectedEditionId === edition.id ? "selected" : ""}`} onClick={() => setSelectedEditionId(edition.id)}>
                          <span className="co-editiontop"><span className="co-locale">{edition.locale === "Arabic" ? <><Languages size={11} style={{ verticalAlign: "-2px", marginRight: 4 }} />Arabic</> : edition.locale}</span><span className={`co-status ${statusClass(edition.status)}`}>{edition.status}</span></span>
                          <small>{edition.revision} · {edition.changed}</small>
                        </button>)}
                      </div>
                    </div>;
                  })}
                </div>
                <footer className="co-tablefoot"><span>Illustrative edition set · exact availability and status must come from governed CMS data.</span><button onClick={() => setDrawer("edition")}>Configure another locale <ArrowUpRight /></button></footer>
              </section>

              <div className="co-rightstack">
                <section className="co-panel co-detail">
                  <div className="co-detailtop"><div><small>Selected edition</small><h3>{selectedEdition.market}</h3><p>{selectedEdition.locale} · exact edition</p></div><span className="co-detailrev">{selectedEdition.revision}</span></div>
                  <div className="co-detailstatus"><span>Public status</span><span className={`co-status ${statusClass(selectedEdition.status)}`}>{selectedEdition.status}</span></div>
                  <div className="co-scope-list">
                    <div className="co-scope-row"><div><strong>Case studies</strong><small>{selectedEdition.status === "Published" ? "Approved items currently included" : "Changes belong to this edition"}</small></div><span className="co-scope-state">{selectedEdition.status === "Needs setup" ? "Not configured" : "Manage →"}</span></div>
                    <div className="co-scope-row"><div><strong>People & team</strong><small>Profiles, role labels, market visibility</small></div><span className="co-scope-state">Manage →</span></div>
                    <div className="co-scope-row"><div><strong>Homepage</strong><small>Fixed layout · occasional copy updates</small></div><span className="co-scope-state">Rare changes</span></div>
                  </div>
                  <button className="co-button" style={{ width: "100%", justifyContent: "center", marginTop: 11 }} onClick={() => announce(`Opening the ${selectedEdition.market} · ${selectedEdition.locale} edition detail in this local prototype.`)}><Eye /> View exact edition</button>
                </section>

                <section className="co-reviewbox">
                  <div className="co-reviewbox-head"><b>Next step for {selectedEdition.market}</b><span className={`co-status ${statusClass(selectedEdition.status)}`}>{selectedEdition.status}</span></div>
                  <p>{selectedEdition.note}. Saving a draft won’t approve it or publish it to other markets.</p>
                  {selectedEdition.status === "Draft" ? <button onClick={() => announce("Review request staged locally. No reviewer has been notified.")}><Send /> Request independent review</button> :
                    selectedEdition.status === "In review" ? <button onClick={() => announce("Review status is illustrative; no CMS reviewer has been contacted.")}><Clock3 /> View review handoff</button> :
                    selectedEdition.status === "Needs setup" ? <button onClick={() => announce(`Setup ${selectedEdition.market} · ${selectedEdition.locale} as a separate edition.`)}><Plus /> Start edition setup</button> :
                    <button onClick={() => announce("A reviewed new revision would be required before publication.")}><BadgeCheck /> Review published revision</button>}
                </section>
              </div>
            </div>

            <section className="co-panel co-worklist">
              <header className="co-panelhead"><div className="co-paneltitle"><Clock3 /><div><h2>Editorial work in motion</h2><p>High-frequency records surfaced first; homepage upkeep stays secondary</p></div></div><button className="co-button" onClick={() => switchView("stories")}>Open content library <ArrowRight /></button></header>
              <div className="co-workrows">
                <button className="co-workrow" style={{ width: "100%", textAlign: "left", background: "transparent", border: 0, cursor: "pointer" }} onClick={() => switchView("stories")}><span className="co-workicon"><Newspaper /></span><span><strong>{stories.filter((story) => story.status !== "Published").length} case studies need editorial attention</strong><small>Write once; scope each approved edition independently.</small></span><span className="co-status draft">Open library</span></button>
                <button className="co-workrow" style={{ width: "100%", textAlign: "left", background: "transparent", border: 0, cursor: "pointer" }} onClick={() => switchView("people")}><span className="co-workicon"><UsersRound /></span><span><strong>{people.filter((person) => person.status === "Draft").length} team profile in draft</strong><small>People records and their edition-specific visibility.</small></span><span className="co-status in-review">Review profiles</span></button>
              </div>
            </section>
          </>}

          {view === "stories" && <>
            <div className="co-headingrow">
              <div><div className="co-eyebrow">Published proof</div><h1>Case studies</h1><p>Keep the source story clear, then manage where each approved version appears.</p></div>
              <div className="co-heading-actions"><button className="co-button" onClick={() => announce("Market assignment filter is available in the editorial library concept.")}><SlidersHorizontal /> Market scope</button><button className="co-button accent" onClick={() => { setFormTitle(""); setFormDetail(""); setFormSector("Financial services"); setFormMarket("UAE"); setDrawer("new-story"); }}><FilePlus2 /> New case study</button></div>
            </div>
            <div className="co-sectionbar">
              <label className="co-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, client, sector…" /></label>
              <button className="co-filter" onClick={() => setStoryFilter(storyFilter === "All" ? "Draft" : storyFilter === "Draft" ? "In review" : storyFilter === "In review" ? "Published" : "All")}><SlidersHorizontal /> {storyFilter} <ChevronDown /></button>
              <div className="co-toggle">{(["All", "Draft", "In review", "Published"] as const).map((filter) => <button key={filter} className={storyFilter === filter ? "active" : ""} onClick={() => setStoryFilter(filter)}>{filter}</button>)}</div>
            </div>
            <section className="co-record-list">
              <div className="co-record-head"><span>Story</span><span>Sector</span><span>Market scope</span><span>State</span><span /></div>
              {filteredStories.map((story) => <button key={story.id} className="co-record-row" style={{ width: "100%", textAlign: "left", background: "transparent", border: 0, cursor: "pointer" }} onClick={() => { setRecordKind("story"); setRecordTitle(story.title); setFormTitle(story.title); setRecordDetail(story.client); setRecordSector(story.sector); setRecordMarket(story.market); setDrawer("record"); }}>
                <span className="co-record-main"><img className="co-record-img" src={story.image} alt="" /><span className="co-record-title"><strong>{story.title}</strong><small>{story.client} · edited {story.changed}</small></span></span>
                <span className="co-record-cell">{story.sector}</span><span className="co-record-cell">{story.market}<small>edition scope</small></span><span className={`co-status ${statusClass(story.status)}`}>{story.status}</span><MoreHorizontal className="co-rowmenu" />
              </button>)}
              {filteredStories.length === 0 && <div className="co-empty"><strong>No matching case studies</strong>Try another search or clear the status filter.</div>}
            </section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 2px", color: "#838d98", fontSize: 9 }}><span>{filteredStories.length} illustrative records · statuses are sample data, not live CMS values.</span><span>Source story ≠ published market edition</span></div>
          </>}

          {view === "people" && <>
            <div className="co-headingrow">
              <div><div className="co-eyebrow">Who we are</div><h1>People & team</h1><p>Maintain trusted profiles, then choose which approved editions feature them.</p></div>
              <div className="co-heading-actions"><button className="co-button" onClick={() => announce("Profile market visibility can be scoped by edition in the full CMS.")}><SlidersHorizontal /> Visibility rules</button><button className="co-button accent" onClick={() => { setFormTitle(""); setFormDetail(""); setFormMarket("UAE"); setDrawer("new-person"); }}><Plus /> Add a person</button></div>
            </div>
            <div className="co-sectionbar">
              <label className="co-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, role, market…" /></label>
              <button className="co-filter" onClick={() => announce("Profile role filters are a concept control.")}><SlidersHorizontal /> All roles <ChevronDown /></button>
              <span style={{ marginLeft: "auto", color: "#87919b", fontSize: 9 }}>{people.length} profile records</span>
            </div>
            <div className="co-people-grid">
              {filteredPeople.map((person) => <button key={person.id} className="co-person" onClick={() => { setRecordKind("person"); setRecordTitle(person.name); setFormTitle(person.name); setRecordDetail(person.role); setRecordMarket(person.market.split(" · ")[0]); setDrawer("record"); }}>
                <span className="co-avatar">{person.initials}</span><span><strong>{person.name}</strong><small>{person.role}</small><span className="co-person-meta"><span className={`co-status ${statusClass(person.status)}`}>{person.status}</span><span className="co-person-markets">{person.market}</span></span></span><ArrowUpRight />
              </button>)}
              {filteredPeople.length === 0 && <div className="co-empty"><strong>No matching profiles</strong>Try a different name or market.</div>}
            </div>
            <section className="co-panel" style={{ marginTop: 15 }}>
              <header className="co-panelhead"><div className="co-paneltitle"><ShieldCheck /><div><h2>Identity and approval</h2><p>Profile copy and image approval remain part of the editorial workflow</p></div></div><span className="co-mutedtag">No placeholder portraits</span></header>
              <div style={{ padding: "14px 16px", color: "#73808d", fontSize: 9, lineHeight: 1.6 }}>Keep roles, biographies and image rights verifiable. A profile can be ready for one market and still need localization or review before appearing in another edition.</div>
            </section>
          </>}

          {view === "homepage" && <>
            <div className="co-headingrow"><div><div className="co-eyebrow">Occasional maintenance</div><h1>Homepage content</h1><p>Kept out of the daily workflow, but still easy to find when the message needs to change.</p></div><span className="co-mutedtag"><CalendarDays /> Infrequent updates</span></div>
            <div className="co-homecard">
              <section className="co-homepreview"><small>Current fixed layout · buyer preview concept</small><h2>We build what moves business forward.</h2><p>Keep the familiar visual preview available for headline, narrative and named media slots—without making it the default editorial workspace.</p><div className="co-homeimage"><img src="/__mockup/images/cognirise/pulse-hero.jpg" alt="Abstract Cognirise Pulse hero art" /></div></section>
              <div className="co-homeaside">
                <section><span className="co-mutedtag">Content ownership</span><h3>Know what can change here</h3><p>Homepage text slots are editable. Industry cards, service lines and hero media link to their governed source records. Page structure remains renderer-owned.</p><button className="co-button" onClick={() => announce("A source-aware visual page editor would open here; this screen is a prototype.")}><Eye /> Open visual homepage editor</button></section>
                <section><h3>Next review</h3><p>Save an exact draft, request independent review, publish that approved edition, then use Release Center for its intended site scope.</p><button className="co-button" onClick={() => switchView("editions")}><Globe2 /> Return to edition overview</button></section>
              </div>
            </div>
          </>}
        </main>
      </div>

      {drawer && <div className="co-drawerback" onClick={() => setDrawer(null)}>
        <section className="co-drawer" onClick={(event) => event.stopPropagation()}>
          <header className="co-drawerhead"><div><small>{drawer === "edition" ? "Market configuration" : drawer === "new-story" ? "Editorial record" : drawer === "new-person" ? "Team directory" : "Record details"}</small><h2>{drawer === "edition" ? "Add regional edition" : drawer === "new-story" ? "Start a case study" : drawer === "new-person" ? "Add a team member" : recordTitle}</h2></div><button className="co-iconbtn" aria-label="Close panel" onClick={() => setDrawer(null)}><X /></button></header>
          {drawer === "edition" ? <>
            <div className="co-formfield"><label>Market</label><select value={editionMarket} onChange={(event) => setEditionMarket(event.target.value)}>{["Oman", "Kuwait", "Bahrain", "Jordan"].map((market) => <option key={market}>{market}</option>)}</select><div className="co-formhelp">Creating an edition configures a distinct destination; it does not copy or publish content automatically.</div></div>
            <div className="co-formfield"><label>Primary locale</label><select value={editionLocale} onChange={(event) => setEditionLocale(event.target.value)}><option>English</option><option>Arabic</option></select></div>
            <div className="co-drawerinfo"><CircleAlert /> New editions start unconfigured. Assign content and owners, prepare any needed localization, then use the normal independent-review process.</div>
            <footer className="co-drawerfooter"><button className="co-button" onClick={() => setDrawer(null)}>Cancel</button><button className="co-button primary" onClick={addEdition}><Plus /> Add unconfigured edition</button></footer>
          </> : drawer === "new-story" || drawer === "new-person" ? <>
            <div className="co-formfield"><label>{drawer === "new-story" ? "Working title" : "Full name"}</label><input autoFocus value={formTitle} onChange={(event) => setFormTitle(event.target.value)} placeholder={drawer === "new-story" ? "A clear, specific case-study headline" : "First and last name"} /></div>
            {drawer === "new-story" && <>
              <div className="co-formfield"><label>Client / organization</label><input value={formDetail} onChange={(event) => setFormDetail(event.target.value)} placeholder="Use the approved public-facing name" /></div>
              <div className="co-formfield"><label>Sector</label><select value={formSector} onChange={(event) => setFormSector(event.target.value)}>{["Financial services", "Public sector", "Telecommunications", "Energy & resources", "Other"].map((sector) => <option key={sector}>{sector}</option>)}</select></div>
            </>}
            {drawer === "new-person" && <div className="co-formfield"><label>Role / title</label><input value={formDetail} onChange={(event) => setFormDetail(event.target.value)} placeholder="Role as it should appear on the site" /></div>}
            <div className="co-formfield"><label>Primary market</label><select value={formMarket} onChange={(event) => setFormMarket(event.target.value)}><option>UAE</option><option>KSA</option><option>Qatar</option><option>Regional</option></select><div className="co-formhelp">This is a starting scope. Locale-specific content and release decisions are handled separately.</div></div>
            <div className="co-drawerinfo"><ShieldCheck /> Saving creates a local draft example only. It does not publish the record, confirm client disclosure, approve a portrait, or notify a reviewer.</div>
            <footer className="co-drawerfooter"><button className="co-button" onClick={() => setDrawer(null)}>Cancel</button><button className="co-button primary" onClick={drawer === "new-story" ? addStory : addPerson}><Check /> Save draft example</button></footer>
          </> : <>
            {recordKind === "story" && selectedStory ? <>
              <div className="co-formfield"><label>Working title · case study source</label><textarea value={formTitle} onChange={(event) => setFormTitle(event.target.value)} /></div>
              <div className="co-formfield"><label>Client / disclosure</label><input value={recordDetail} onChange={(event) => setRecordDetail(event.target.value)} /></div>
              <div className="co-formfield"><label>Sector</label><input value={recordSector} onChange={(event) => setRecordSector(event.target.value)} /></div>
              <div className="co-formfield"><label>Edition scope</label><input value={`${recordMarket} · English`} onChange={(event) => setRecordMarket(event.target.value.split(" · ")[0])} /></div>
            </> : selectedPerson ? <>
              <div className="co-formfield"><label>Profile name</label><input value={formTitle} onChange={(event) => setFormTitle(event.target.value)} /></div>
              <div className="co-formfield"><label>Role / biography</label><textarea value={recordDetail} onChange={(event) => setRecordDetail(event.target.value)} /></div>
              <div className="co-formfield"><label>Primary market</label><select value={recordMarket} onChange={(event) => setRecordMarket(event.target.value)}><option>UAE</option><option>KSA</option><option>Qatar</option><option>Regional</option></select></div>
              <div className="co-formfield"><label>Profile image</label><div className="co-drawerinfo"><CircleAlert /> Select only an approved identity asset; this concept uses initials instead of placeholder portraits.</div></div>
            </> : <div className="co-empty"><strong>Record is unavailable</strong>Close this panel and reopen the record from its library.</div>}
            <div className="co-drawerinfo"><ShieldCheck /> Edit and save a draft first. Independent review, edition publication and scoped release remain separate actions.</div>
            <footer className="co-drawerfooter"><button className="co-button" onClick={() => setDrawer(null)}>Close</button><button className="co-button primary" onClick={saveRecord}><Check /> Save draft example</button></footer>
          </>}
        </section>
      </div>}
      {notice && <div className="co-toast" role="status">{notice}</div>}
    </div>
  );
}