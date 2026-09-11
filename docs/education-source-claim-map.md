# Education source and claim map

This note records the evidence decisions behind the canonical UAE Education record in `industries.ts`. It is editorial working material, not page copy.

## Source-backed claims retained

| Page claim | Source used | Editorial treatment |
| --- | --- | --- |
| Purposeful educational use can support learning, while task performance is not automatically durable learning. | OECD, *Digital Education Outlook 2026* | Retained as a synthesis, without lifting headline statistics. |
| Effective adoption depends on educational purpose, educator capability, equity, infrastructure and evaluation. | World Bank, *AI Revolution in Education* | Retained as a high-level policy synthesis. |
| AI and data skills are growing in importance alongside analytical thinking, creativity and adaptability. | World Economic Forum, *Future of Jobs Report 2025* | Retained without labour-market forecasts or percentages. |
| Singapore’s education AI approach is purposeful and retains human interaction and teacher judgment. | Singapore Ministry of Education, *Artificial Intelligence in Education* | Used for the K–12 application and global signal. |
| Aila creates curriculum-aligned lesson plans from quality-assured resources while teachers iteratively review and refine them. | UK Government AI Knowledge Hub, *Aila: AI Lesson Assistant* | Retained as a bounded teacher-planning example; early usage and survey figures omitted. |
| Australia has a national framework for responsible and ethical generative AI use in schools. | Australian Government Department of Education | Used with Singapore as a governance signal; no claim that one framework covers both countries. |
| An instructor-designed tutor was tested in a randomised undergraduate physics setting. | Scientific Reports article available through PubMed Central | Kept narrowly framed as one study, with no general performance promise. |
| Yale presents discipline-specific teaching support and assessment redesign. | Yale, *AI for Teaching and Learning 2026* | Used as institution-published practice, not independent outcome evidence. |
| Caltech reports scientist-taught data agents that retain domain instruction. | Caltech institutional report on the Point72-funded programme | Used only as a company-reported illustration of researcher-led workflows. |
| MIT, Stanford and the University of California frame AI through cross-disciplinary education, structured experimentation and responsible coordination. | Official institutional programme pages | Synthesised without outcome claims. |
| NOVA links AI with institutional transformation and process redesign; the UAE teacher programme supports practical educator capability. | UAE Ministry of Education; UAE Ministry of Education and HBMSU | Used only in entries marked `market: "uae"`. |
| Saudi Arabia’s Academic Framework for AI Qualifications guides the development, evaluation and accreditation of higher-education AI programmes, including programme quality and learning outcomes. | Saudi Data & AI Authority, *Saudi Academic Framework for AI Qualifications* | Maintained as separate `market: "ksa"` evidence for the Saudi edition; no participation, performance or labour-market outcome is inferred. |
| Saudi Arabia’s Human Capability Development Program prioritises knowledge, basic and future skills, and preparation for future labour-market needs. | Saudi Vision 2030, *Human Capability Development Program* | Used only to frame the Saudi direction around human capability; no programme outcome is claimed. |

## Corrected reference decisions

- The supplied document’s Harvard inline reference points to Oman. Harvard is reference 30 in its bibliography; the page now links to the published study itself.
- Aila is bibliography reference 21, not the Caltech reference implied by the educator paragraph.
- Australia and Singapore guardrails are bibliography references 20 and 22, not Stanford and Yale.
- The supplied UAE curriculum paragraph also points to a US Department of Education report. The canonical record links the UAE curriculum and teacher-programme pages directly instead.
- Harvard Gazette was not treated as independent evidence. Where the study is discussed, the peer-reviewed article is the evidence source.

## Qualified or omitted material

- The Harvard learning-gain multiplier is omitted from page copy. Although a published study is now accessible, the application intentionally communicates the bounded study design rather than a portable numerical promise.
- Caltech’s “weeks to about an hour” statement is omitted from page copy. It is supported only by Caltech’s programme/fundraising report and was not independently verified; the source is labelled `Company-reported`.
- Early Aila adoption, workload and satisfaction figures are omitted because they are not necessary to establish the bounded curriculum-grounded pattern.
- Qatar, Oman, Jordan and Saudi material is omitted from the canonical UAE record. Saudi evidence is held separately in `education-saudi-evidence.ts` for a strict KSA projection; no combined UAE/Saudi row or paragraph is retained.
- No external example is presented as Cognirise work or as a guaranteed outcome.

## Access and verification notes

Web search and source-page extraction were used to inspect the OECD, WEF, Singapore, UK Aila, Australian, Harvard/Scientific Reports, Yale, Caltech and UAE Ministry pages. For Saudi Arabia, the SDAIA framework page and linked framework PDF were inspected directly: they support guidance for higher-education programme development, evaluation, accreditation, quality and graduate learning outcomes. The official Human Capability Development Program PDF was also inspected directly and supports the future-skills and human-capability direction. Search results about school curricula, teacher counts and population-scale initiatives were not used, so the Saudi copy carries none of that unverified precision.

The World Bank PDF is retained as the bibliography’s official source; its web landing-page extraction was limited, so the copy uses only the broad framework reflected in the supplied report and source metadata. The Arabic UAE curriculum page was discoverable but was not used for numerical or detailed curriculum claims. These limitations are why the canonical and market-specific copy avoid precision beyond what was directly supported.

## Post-merge development publication

- Regenerate and review the governed files with `pnpm --filter @workspace/scripts cms:inventory -- --write` and `pnpm --filter @workspace/scripts cms:import -- --write`.
- Apply only through `pnpm --filter @workspace/scripts cms:reconcile`. It is development-only and production-blocked.
- Read the explicit Education result: `published` and `reused` require the exact governed payload and immutable media pin; `preserved-editorial` means newer editorial authority was left untouched; `new-draft` means a fresh exact import is still awaiting the governed immutable-media cutover. A draft with unknown payload drift is rejected before any publication step.
- Replay reconciliation to verify idempotency. Before promotion, verify the approved public pointer, governed SEO, market-isolated projections and immutable media-version reference.

## Acceptance verification

- Desktop and 390px mobile checks confirmed the complete narrative, responsive callouts and signals table, five convictions, five value domains, three application groups, seven capabilities, loaded approved artwork, and working service/Value Scan destinations.
- Published responses for all four existing markets were checked against the revised contract and source associations. Foreign editorial copy, source URLs and SEO are excluded. The API deliberately retains truthful fallback provenance (`market` is the source edition, `requestedMarket` is the audience, and `usedFallback` records the difference); shared revision IDs and immutable artwork are not regional evidence.
- Focused authoring, legacy/v2 validation, protected preview, market projection and reconciliation tests passed. Authenticated browser save/reload/preview was not exercised: the browser had no authorized CMS session, and authentication was not bypassed.
- Publication additionally checks every market derivative the source can serve, including empty market-only application groups, disappearing signals/sources, reduced conviction counts and broken source associations. Incomplete drafts remain saveable; invalid derivatives block approval with market-specific field errors.
- Broader suites surfaced unrelated existing Contact phone-render and landing-content parity assertions. These were not changed as part of the Education update.
- This work changes development content and its post-merge reconciliation only; production publication was not performed.