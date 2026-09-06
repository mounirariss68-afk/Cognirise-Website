import { Link, useSearch, useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useGetCmsPublishedPublications, useSubscribeNewsletter } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { trackEvent } from "@/lib/analytics";

export default function InsightsEditorial() {
  const [email, setEmail] = useState("");
  const subscribeNewsletter = useSubscribeNewsletter();
  const { toast } = useToast();
  const { market } = useMarketStore();
  const cmsPublications = useGetCmsPublishedPublications(market);
  const searchString = useSearch();
  const [location, setLocation] = useLocation();
  
  const searchParams = new URLSearchParams(searchString);
  const activeTopic = searchParams.get("topic") || "all";
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;

    subscribeNewsletter.mutate({
      data: {
        email,
        market: market,
        consent: true,
        sourcePage: window.location.pathname,
      }
    }, {
      onSuccess: () => {
        trackEvent("newsletter_subscribed", {
          market,
          source_page: window.location.pathname,
          form_type: "newsletter",
          delivery_source: "insights_editorial",
        });
        toast({
          title: "Subscribed successfully",
          description: "You are on the list. Watch this space.",
        });
        setEmail("");
      },
      onError: () => {
        toast({
          title: "Subscription failed",
          description: "Please try again later.",
          variant: "destructive"
        });
      }
    });
  };

  const isSubscribed = subscribeNewsletter.isSuccess;

  const topics = [
    { id: "all", label: "All Insights" },
    { id: "engineering", label: "Engineering" },
    { id: "governance", label: "Governance" },
    { id: "operations", label: "Operating Models" },
    { id: "strategy", label: "Strategy" }
  ];

  const articles = (cmsPublications.data?.publications ?? []).filter((item) => item.format === "article").map((item, index) => ({
    number: String(index + 1).padStart(2, "0"),
    title: item.title,
    copy: item.dek ?? "",
    topics: item.topics ?? [],
    url: `/insights/${item.slug}`,
  }));

  const filteredArticles = activeTopic === "all" ? articles : articles.filter(a => a.topics.includes(activeTopic));

  const handleTopicSelect = (topicId: string) => {
    if (topicId === "all") {
      setLocation("/insights");
    } else {
      setLocation(`/insights?topic=${topicId}`);
    }
  };

  return (
    <main className="ie">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .ie{--ink:#102957;--deep:#071936;--paper:#fdfcfb;--soft:#f1f3f7;--line:#cbd3e1;--violet:#7659df;--pink:#db509e;--coral:#ff775d;background:var(--paper);color:var(--ink);font-family:Inter,sans-serif;overflow:hidden}
        .ie *{box-sizing:border-box}
        .ie button,.ie input{font:inherit}
        .ie a{color:inherit;text-decoration:none;display:block}
        .ie :focus-visible{outline:3px solid var(--coral);outline-offset:4px}
        .ie-primary{border:1px solid var(--ink);cursor:pointer;color:#fff;background:var(--ink);font-weight:700;font-size:12px;padding:4px 4px 4px 17px;min-height:46px;display:inline-flex;align-items:center;gap:15px;position:relative;isolation:isolate;overflow:hidden;transition:transform .24s cubic-bezier(.2,.8,.2,1),box-shadow .24s}
        .ie-primary:before{content:"";position:absolute;z-index:-2;inset:-1px;background:linear-gradient(105deg,var(--violet),var(--pink),var(--coral));opacity:0;transition:opacity .24s}
        .ie-primary:after{content:"";position:absolute;z-index:-1;inset:1px;background:var(--ink);transition:background .24s}
        .ie-primary svg{width:36px;height:36px;padding:10px;background:#fff;color:var(--ink);transition:transform .24s,background .24s,color .24s}
        .ie-primary:hover{transform:translate(-3px,-3px);box-shadow:6px 6px 0 var(--coral)}
        .ie-primary:hover:before{opacity:1}
        .ie-primary:hover svg{transform:translate(3px,-3px);background:var(--coral);color:#fff}
        .ie-kicker{font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:600;display:flex;gap:10px;align-items:center}
        .ie-kicker:before{content:"";width:23px;height:1px;background:linear-gradient(90deg,var(--violet),var(--coral))}
        .ie-hero{padding:42px 4.8vw 0}
        .ie-hero-top{display:grid;grid-template-columns:1fr .7fr;gap:8vw;align-items:end}
        .ie h1,.ie h2,.ie h3{font-family:Comfortaa,sans-serif}
        .ie h1{font-size:clamp(63px,10vw,150px);letter-spacing:-.095em;line-height:.82;font-weight:600;margin:28px 0 18px}
        .ie h1 em{font-style:normal;color:var(--pink)}
        .ie-intro{font-size:16px;line-height:1.6;color:#415779;max-width:390px;margin:0 0 24px}
        .ie-hero-rule{border-top:1px solid var(--ink);margin-top:54px}
        .ie-feature{display:grid;grid-template-columns:1.14fr .86fr;min-height:610px}
        .ie-feature-visual{margin-top:0;position:relative;overflow:hidden;clip-path:polygon(0 0,100% 7%,100% 100%,8% 94%);background:var(--deep)}
        .ie-feature-visual img{width:100%;height:100%;object-fit:cover}
        .ie-feature-visual:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(7,25,54,.52),transparent 55%)}
        .ie-num{position:absolute;z-index:1;left:28px;bottom:24px;color:#fff;font-size:10px;letter-spacing:.13em;text-transform:uppercase}
        .ie-feature-copy{padding:72px 0 55px 8%;display:flex;flex-direction:column;justify-content:end}
        .ie-meta{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#687996;font-weight:600;margin-bottom:18px}
        .ie-feature h2{font-size:clamp(36px,4.5vw,68px);line-height:.96;letter-spacing:-.08em;margin:0 0 21px;font-weight:600;max-width:560px}
        .ie-feature p{font-size:16px;line-height:1.57;color:#435a7d;max-width:430px;margin:0 0 29px}
        .ie-text-link{border:0;border-bottom:1px solid var(--ink);background:transparent;color:var(--ink);padding:8px 0;display:inline-flex;width:max-content;gap:9px;align-items:center;font-size:12px;font-weight:700;cursor:pointer}
        .ie-text-link:hover{color:var(--pink);border-color:var(--pink)}

        .ie-articles{padding:80px 4.8vw 20px}
        .ie-articles-layout{display:grid;grid-template-columns:200px 1fr;gap:6vw}
        .ie-filters{border-top:1px solid var(--ink);padding-top:23px}
        .ie-filter-list{display:flex;flex-direction:column;gap:12px;margin-top:24px}
        .ie-filter-btn{border:0;background:none;text-align:left;color:#526786;font-size:14px;font-weight:600;cursor:pointer;padding:0;transition:color .2s}
        .ie-filter-btn:hover{color:var(--ink)}
        .ie-filter-active{color:var(--pink)!important}
        .ie-article-list{border-top:1px solid var(--ink);margin-top:0}

        .ie-signal{margin:0 4.8vw;padding:21px 0;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);display:grid;grid-template-columns:1.15fr 1fr 1fr}
        .ie-signal div{padding:0 20px;border-right:1px solid var(--line);font-size:12px;line-height:1.5}
        .ie-signal div:first-child{padding-left:0}
        .ie-signal div:last-child{border:0}
        .ie-signal b{display:block;font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:#6b7890;margin-bottom:5px}
        .ie-collections{padding:138px 4.8vw 120px}
        .ie-section-head{border-top:1px solid var(--ink);padding-top:23px;display:flex;justify-content:space-between;align-items:end;gap:30px}
        .ie-section-head h2{font-size:clamp(42px,5.3vw,77px);font-weight:600;letter-spacing:-.085em;line-height:.94;margin:19px 0 0;max-width:690px}
        .ie-section-head p{font-size:14px;color:#526786;line-height:1.55;max-width:285px}
        .ie-collection-grid{margin-top:52px;display:grid;grid-template-columns:.86fr 1.14fr;gap:12px}
        .ie-collection{min-height:440px;padding:28px;display:flex;flex-direction:column;justify-content:end;position:relative;overflow:hidden;background:var(--deep);color:#fff}
        .ie-collection img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.74;transition:transform .7s cubic-bezier(.2,.7,.2,1)}
        .ie-collection:hover img{transform:scale(1.055)}
        .ie-collection:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(7,25,54,.82),rgba(7,25,54,.08) 72%)}
        .ie-collection>*{position:relative;z-index:1}
        .ie-collection:nth-child(2){clip-path:polygon(0 8%,100% 0,100% 100%,5% 93%)}
        .ie-collection .ie-meta{color:#d8e0ef;margin-bottom:15px}
        .ie-collection h3{font-size:clamp(26px,3vw,45px);letter-spacing:-.075em;line-height:1;margin:0;max-width:470px}
        .ie-collection p{font-size:13px;line-height:1.5;color:#e1e6ef;max-width:390px;margin:16px 0 0}
        .ie-routes{background:var(--soft);padding:120px 4.8vw}
        .ie-routes-head{display:grid;grid-template-columns:1fr 1fr;gap:6vw;align-items:end}
        .ie-routes h2{font-size:clamp(42px,5vw,74px);line-height:.96;letter-spacing:-.085em;font-weight:600;margin:20px 0 0}
        .ie-routes-lead{font-size:17px;line-height:1.55;color:#3f5578;max-width:400px}
        .ie-route-list{border-top:1px solid var(--ink);margin-top:55px}
        .ie-route{width:100%;background:none;border:0;border-bottom:1px solid var(--line);padding:24px 8px;display:grid;grid-template-columns:75px 1fr 1.1fr 35px;align-items:center;gap:20px;text-align:left;color:var(--ink);cursor:pointer;transition:background .2s,padding .2s}
        .ie-route:hover{background:#e8e6f4;padding-left:22px}
        .ie-route span{font-size:10px;letter-spacing:.1em;color:#697a96}
        .ie-route h3{font-size:clamp(20px,2.25vw,30px);letter-spacing:-.06em;margin:0;line-height:1.06}
        .ie-route p{font-size:13px;line-height:1.5;color:#536887;margin:0;max-width:300px}
        .ie-route svg{justify-self:end;color:var(--coral)}
        
        .ie-article-list .ie-route{padding:28px 8px;border-bottom:1px solid var(--line)}
        .ie-article-list .ie-route p{display:block}

        .ie-letter{padding:115px 4.8vw 0}
        .ie-letter-wrap{display:grid;grid-template-columns:1fr 1fr;background:var(--deep);color:#fff;min-height:500px}
        .ie-letter-copy{padding:76px 12% 70px}
        .ie-letter h2{font-size:clamp(40px,5vw,72px);line-height:.95;letter-spacing:-.09em;font-weight:600;margin:18px 0 20px}
        .ie-letter p{font-size:16px;line-height:1.6;color:#d5dfed;max-width:420px}
        .ie-form{margin-top:33px;display:flex;border-bottom:1px solid rgba(255,255,255,.7);max-width:430px}
        .ie-form input{min-width:0;flex:1;background:none;border:0;color:#fff;padding:13px 0;outline:0}
        .ie-form input::placeholder{color:#b8c5d8}
        .ie-form button{border:0;background:none;color:#fff;font-size:11px;font-weight:700;cursor:pointer;padding:0 0 0 16px}
        .ie-form button:disabled{opacity:0.5;cursor:not-allowed}
        .ie-success{color:#fff!important;font-weight:600;padding-top:20px;display:block}
        .ie-letter-art{position:relative;overflow:hidden;clip-path:polygon(8% 0,100% 9%,100% 100%,0 93%)}
        .ie-letter-art img{width:100%;height:100%;object-fit:cover}
        .ie-letter-art-note{position:absolute;right:24px;bottom:22px;letter-spacing:.12em;font-size:10px;text-transform:uppercase;z-index:1}

        @media(max-width:760px){
          .ie-hero{padding:33px 21px 0}
          .ie-hero-top{display:block}
          .ie h1{font-size:66px;margin:25px 0 21px}
          .ie-hero-rule{margin-top:42px}
          .ie-feature{display:flex;flex-direction:column;min-height:0}
          .ie-feature-visual{height:420px;order:2}
          .ie-feature-copy{padding:43px 0 40px}
          .ie-feature h2{font-size:39px}
          .ie-articles{padding:40px 21px 20px}
          .ie-articles-layout{grid-template-columns:1fr;gap:30px}
          .ie-filter-list{flex-direction:row;flex-wrap:wrap}
          .ie-signal{margin:0 21px;display:block;padding:0}
          .ie-signal div{padding:15px 0;border-right:0;border-bottom:1px solid var(--line)}
          .ie-signal div:last-child{border-bottom:0}
          .ie-collections{padding:83px 21px}
          .ie-section-head{display:block}
          .ie-section-head h2{font-size:43px}
          .ie-section-head p{margin-top:26px}
          .ie-collection-grid{grid-template-columns:1fr;margin-top:35px}
          .ie-collection{min-height:360px;padding:22px}
          .ie-collection h3{font-size:31px}
          .ie-routes{padding:80px 21px}
          .ie-routes-head{display:block}
          .ie-routes h2{font-size:43px}
          .ie-routes-lead{margin-top:26px}
          .ie-route-list{margin-top:39px}
          .ie-route{grid-template-columns:32px 1fr 22px;gap:12px;padding:21px 0}
          .ie-route p{display:none}
          .ie-route h3{font-size:20px}
          .ie-letter{padding:76px 21px 40px}
          .ie-letter-wrap{display:flex;flex-direction:column}
          .ie-letter-copy{padding:57px 24px}
          .ie-letter h2{font-size:43px}
          .ie-letter-art{height:330px}
        }
      `}</style>
      
      <section className="ie-hero" id="insights">
        <div className="ie-hero-top">
          <div>
            <div className="ie-kicker">{marketLocation} / points of view</div>
            <h1>Work, made <em>visible.</em></h1>
          </div>
          <p className="ie-intro">A reading room for leaders building AI-native organisations: the operating questions behind the strategy, architecture and deployment.</p>
        </div>
        <div className="ie-hero-rule" />
      </section>

      <section className="ie-articles">
        <div className="ie-articles-layout">
          <aside className="ie-filters">
            <h2 className="ie-kicker">Topic filter</h2>
            <div className="ie-filter-list">
              {topics.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTopicSelect(t.id)}
                  className={`ie-filter-btn ${activeTopic === t.id ? 'ie-filter-active' : ''}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </aside>
          
          <div className="ie-article-list">
            {cmsPublications.isLoading ? (
              <p role="status" style={{ color: '#536887', paddingTop: '30px', fontSize: '14px' }}>Loading published perspectives…</p>
            ) : cmsPublications.isError ? (
              <p role="alert" style={{ color: '#536887', paddingTop: '30px', fontSize: '14px' }}>Published perspectives are currently unavailable.</p>
            ) : filteredArticles.length === 0 ? (
              <p style={{ color: '#536887', paddingTop: '30px', fontSize: '14px' }}>No articles found for this topic.</p>
            ) : (
              filteredArticles.map(({ number, title, copy, url }) => (
                <Link href={url} key={number} className="ie-route">
                  <span>{number}</span>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  <ArrowRight size={17} />
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="ie-signal" aria-label="Editorial focus">
        <div><b>From the {market.toUpperCase()}</b>Built for consequential work and regulated environments.</div>
        <div><b>For leaders</b>Executive clarity, technical depth and operational reality.</div>
        <div><b>In focus</b>Transformation, sovereign AI and a digital workforce.</div>
      </section>
      
      
      <section className="ie-routes" id="routes">
        <div className="ie-routes-head">
          <div>
            <div className="ie-kicker">Industry points of view</div>
            <h2>Different systems. Same demand for movement.</h2>
          </div>
          <p className="ie-routes-lead">Sector routes for {market.toUpperCase()} organisations where progress must be both fast and defensible.</p>
        </div>
        <div className="ie-route-list">
          {[
            ["01","Banking & financial services","Build intelligence into the work without compromising control.","governance"],
            ["02","Government & public sector","Sovereign capability for services with public consequence.","governance"],
            ["03","Telecoms","Turn complex operations into a stronger service engine.","operations"],
            ["04","Travel & hospitality","Make service moments more responsive, not more remote.","operations"],
            ["05","Energy & resources","Apply intelligence where safety, scale and continuity meet.","operations"],
            ["06","Manufacturing & conglomerates","Connect the operating picture across the enterprise.","operations"]
          ].map(([number,title,copy,topic]) => (
            <Link href={`/insights?topic=${topic}`} className="ie-route" key={title}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>
      </section>
      
      <section className="ie-letter" id="subscribe">
        <div className="ie-letter-wrap">
          <div className="ie-letter-copy">
            <div className="ie-kicker">The Cognirise brief</div>
            <h2>A useful signal, when it matters.</h2>
            <p>Occasional field notes on AI-native transformation, delivery and the systems that make intelligent work possible.</p>
            {isSubscribed ? (
              <p className="ie-success" role="status">You are on the list. Watch this space.</p>
            ) : (
              <form className="ie-form" onSubmit={submit}>
                <input 
                  type="email" 
                  required 
                  aria-label="Work email address" 
                  placeholder="Your work email" 
                  value={email} 
                  onChange={event => setEmail(event.target.value)} 
                  disabled={subscribeNewsletter.isPending}
                />
                <button type="submit" disabled={subscribeNewsletter.isPending}>
                  {subscribeNewsletter.isPending ? "Subscribing..." : "Subscribe"} <ArrowRight size={15} />
                </button>
              </form>
            )}
          </div>
          <div className="ie-letter-art">
            <img src={assetUrl('/images/cognirise/site-insights.jpg')} alt="" />
            <div className="ie-letter-art-note">field notes / {market.toUpperCase()}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
