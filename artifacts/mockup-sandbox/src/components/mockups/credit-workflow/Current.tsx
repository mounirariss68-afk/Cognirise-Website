import React from "react";
import { fsCredit } from "./_source/content";
import { FsCreditFlow, FsTransferTable } from "./_source/FsDiagrams";
import { FsSectionHead } from "./_source/FsTables";
import { fsStyles } from "./_source/fsStyles";
import "./_group.css";

export function Current() {
  return (
    <main className="credit-workflow-preview fs-page min-h-screen">
      <style>{fsStyles}</style>
      <section className="fs-section alt" aria-labelledby="fs-credit-title">
        <FsSectionHead id="fs-credit-title" kicker={fsCredit.label} title={fsCredit.title} intro={fsCredit.intro} />
        <FsCreditFlow />
        <div style={{ marginTop: 56 }}>
          <h3 style={{ fontSize: 22, marginBottom: 18 }}>Who does each part of the work</h3>
          <FsTransferTable />
        </div>
      </section>
    </main>
  );
}
