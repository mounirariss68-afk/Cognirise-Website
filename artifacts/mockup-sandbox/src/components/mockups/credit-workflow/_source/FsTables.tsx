import React from "react";
import { fsAreas, fsLevels, fsProjects, fsVoice } from "./content";

export function FsSectionHead({ kicker, title, intro, id }: { kicker: string; title: string; intro: string; id: string }) {
  return (
    <div className="fs-head">
      <div>
        <p className="fs-kicker">{kicker}</p>
        <h2 id={id}>{title}</h2>
      </div>
      <p>{intro}</p>
    </div>
  );
}

export function FsLevelsTable() {
  return (
    <div className="fs-table-wrap" tabIndex={0} role="region" aria-labelledby="fs-levels-title" data-testid="table-fs-levels">
      <table className="fs-table">
        <caption className="fs-src">Three levels of adoption</caption>
        <thead>
          <tr><th scope="col">Level</th><th scope="col">What changes</th><th scope="col">Banking example</th><th scope="col">What people still do</th></tr>
        </thead>
        <tbody>
          {fsLevels.rows.map((row) => (
            <tr key={row.level}>
              <th scope="row">{row.level}</th>
              <td>{row.changes}</td>
              <td>{row.example}</td>
              <td className="fs-human">{row.people}</td>
            </tr>
          ))}
          <tr className="fs-target" data-testid="row-fs-illustrative-targets">
            <th scope="row">Illustrative productivity targets</th>
            {fsLevels.rows.map((row) => (
              <td key={row.level}><strong>{row.target}</strong> target · indicative period {row.period}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function FsAreasTable() {
  return (
    <div className="fs-table-wrap" tabIndex={0} role="region" aria-labelledby="fs-areas-title" data-testid="table-fs-areas">
      <table className="fs-table">
        <caption className="fs-src">Banking work map</caption>
        <thead>
          <tr><th scope="col">Business area</th><th scope="col">Work AI can do</th><th scope="col">Human decision</th><th scope="col">Measure</th></tr>
        </thead>
        <tbody>
          {fsAreas.rows.map((row) => (
            <tr key={row.area}>
              <th scope="row">{row.area}</th>
              <td><ul>{row.work.map((w) => <li key={w}>{w}</li>)}</ul></td>
              <td className="fs-human">{row.human}</td>
              <td>{row.measure}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FsProjectsGrid() {
  return (
    <div className="fs-projects">
      {fsProjects.rows.map((p, i) => (
        <article className="fs-project" key={p.name} data-testid={`project-fs-${i}`}>
          <h3>{p.name}</h3>
          <dl>
            <dt>Inputs</dt><dd>{p.inputs}</dd>
            <dt>First deliverable</dt><dd>{p.deliverable}</dd>
            <dt>Success measure</dt><dd>{p.measure}</dd>
          </dl>
        </article>
      ))}
    </div>
  );
}

export function FsVoiceTable() {
  return (
    <div className="fs-table-wrap" tabIndex={0} role="region" aria-label="Seven voice-service journey groups" data-testid="table-fs-voice">
      <table className="fs-table">
        <caption className="fs-src">Seven journey groups</caption>
        <thead>
          <tr><th scope="col">Journey group</th><th scope="col">Typical tasks</th><th scope="col">Measure</th></tr>
        </thead>
        <tbody>
          {fsVoice.journeys.map((j) => (
            <tr key={j.group}><th scope="row">{j.group}</th><td>{j.task}</td><td>{j.measure}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
