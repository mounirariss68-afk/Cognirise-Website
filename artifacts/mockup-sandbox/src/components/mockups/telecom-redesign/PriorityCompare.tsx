import React from "react";
import "./_group.css";
import "./PriorityCompare.css";
import content from "./_shared/content.json";

const data = content.telecomPov;
const properties = [
  ["Readiness", "readiness"], ["Dependencies", "dependencies"],
  ["Authority", "authority"], ["Validation", "validation"],
] as const;

export function PriorityCompare() {
  const [first, setFirst] = React.useState(0);
  const [second, setSecond] = React.useState(1);
  const left = data.candidates[first];
  const right = data.candidates[second];
  return <main className="telecom-exploration pc">
    <header className="pc-header">
      <div><span className="pc-kicker">Option B · Prioritisation</span><h1>Compare what each<br />opportunity requires.</h1></div>
      <p>Choose any two of the eight opportunity hypotheses. Compare the actual data conditions, dependencies, owner authority and validation work—without implying a ranking.</p>
    </header>
    <section className="pc-compare" aria-label="Compare two opportunity hypotheses">
      <div className="pc-columns">
        {[{ side: "A", candidate: left, selected: first, setSelected: setFirst }, { side: "B", candidate: right, selected: second, setSelected: setSecond }].map(({ side, candidate, selected, setSelected }) => (
          <div className={`pc-column pc-column-${side.toLowerCase()}`} key={side}>
            <label className="pc-choice"><span>Opportunity {side}</span><select value={selected} onChange={(event) => setSelected(Number(event.target.value))} aria-label={`Choose opportunity ${side}`}>
              {data.candidates.map((item, index) => <option key={item.id} value={index}>{item.title}</option>)}
            </select></label>
            <h2>{candidate.title}</h2>
            <p className="pc-hypothesis">{candidate.valueHypothesis}</p>
          </div>
        ))}
      </div>
      <div className="pc-rows" role="table" aria-label="Side-by-side opportunity requirements">
        {properties.map(([label, key], index) => <div className="pc-row" role="row" key={key}>
          <h3 className="pc-row-label" role="rowheader"><span>0{index + 1}</span>{label}</h3>
          <div className="pc-row-values">
            <p role="cell"><span className="pc-mobile-label">Opportunity A · {left.title}</span>{left[key]}</p>
            <p role="cell"><span className="pc-mobile-label">Opportunity B · {right.title}</span>{right[key]}</p>
          </div>
        </div>)}
      </div>
      <footer className="pc-note"><strong>Discussion comparison, not a readiness verdict.</strong><span>{data.note}</span></footer>
    </section>
  </main>;
}
