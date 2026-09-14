import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Router } from 'wouter';
import { GuardrailsLayout, guardrailsMetadata } from './GuardrailsFramework';
import { LayerExplorer } from '@/components/guardrails/LayerExplorer';
import { MarkdownInline } from '@/components/guardrails/MarkdownInline';
import { guardrailsFixture } from '../../../../scripts/src/cms/guardrails-fixture';
import { guardrailsPresentation } from '../../../../scripts/src/cms/guardrails-redesign';

const mockContent: any = {
  template: 'guardrails',
  title: 'Test',
  seo: {},
  hero: { eyebrow: 'Eyebrow', headline: 'Headline', subheadline: 'Sub', primaryAction: { label: 'Click', href: '#' }, secondaryAction: { label: 'Click 2', href: '#' } },
  presentation: { version: 'guardrails-redesign-v1', hero: { headline: 'H', subheadline: 'S', detailsLabel: 'L' } },
  distinction: { heading: 'Distinction', body: ['Para 1'] },
  layers: {
    heading: 'Layers', intro: 'Intro', table: [{ id: 'policy', layer: 'Policy', whatItIs: 'x', inThisExample: 'y', whatGetsPastIt: 'z', strengthLabel: 's' }],
    tableHeaders: ['Layer', 'What', 'Ex', 'Past', 'Strength'], pullOut: 'Pull', closingLine: 'Close', aside: { heading: 'Aside', body: 'Body' },
    diagram: {
      rows: [{ id: '1', label: 'L1', description: 'D1', example: 'E1', bypassLabel: 'B1', bypass: 'By1', strength: 1, strengthLabel: 'S1' }],
      thresholdAfter: '1', thresholdLabel: 'Threshold'
    }
  },
  stoppingRule: {
    heading: 'Stop', intro: 'Intro', tableHeaders: ['H1', 'H2'], exposures: [{ id: 'internal-reversible', handover: 'Know', requirement: 'Req' }], pullOut: 'Pull',
    diagram: {
      heading: 'Heading', destinationHeading: 'Dest', bands: [{ id: 'b1', label: 'B1', description: 'Desc1', destination: 'd1', additionId: 'a1' }],
      destinations: [{ id: 'd1', label: 'D1', description: 'DescD1' }],
      additions: [{ id: 'a1', label: 'A1' }]
    }
  },
  maintenance: { heading: 'Maintenance', table: [{ id: 'policy', layer: 'Policy', set: 'S', prove: 'P', hold: 'H' }], tableHeaders: ['Layer', 'Set', 'Prove', 'Hold'], closingParagraph: 'Close' },
  method: { heading: 'Method', intro: 'Intro', phases: [{ id: '1', name: 'N1', caption: 'C1', steps: ['S1'] }] },
  questions: { heading: 'Qs', intro: 'Intro', panels: [] },
  measurement: { heading: 'Measure', statement: 'State', supportingLine: 'Support' },
  authority: { heading: 'Auth', body: ['Para'], linkCard: { title: 'Link', description: 'Desc', href: '#' } },
  references: { heading: 'Refs', intro: ['Intro'], groups: [{ id: '1', title: 'Grp', items: 'Items' }] },
  moves: { heading: 'Moves', moves: [{ number: 1, title: 'Title', body: 'Body' }], cta: { heading: 'CTA', body: 'Body', button: { label: 'Btn', href: '#' } }, footerNote: 'Note' },
};

describe('GuardrailsFramework Layout', () => {
  it('retains replaced source qualifications in the real source fixture', () => {
    const framework = {
      ...guardrailsFixture.content,
      title: guardrailsFixture.title,
      id: 'guardrails-source-fixture',
      slug: guardrailsFixture.slug,
      summary: guardrailsFixture.summary,
      media: undefined,
      publishedAt: '',
      updatedAt: '',
      market: 'uae',
      requestedMarket: 'uae',
      usedFallback: false,
      seo: guardrailsFixture.seo,
      presentation: guardrailsPresentation,
    };
    const normalize = (html: string) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const html = normalize(renderToString(<Router ssrPath="/methodologies/guardrails-framework"><GuardrailsLayout framework={framework} /></Router>));
    const source = guardrailsFixture.content;
    const retained = [
      ...source.distinction.body, source.layers.intro, source.layers.exampleText,
      source.stoppingRule.intro, source.stoppingRule.diagram.note,
      source.stoppingRule.diagram.footer, source.method.intro,
      ...source.authority.body, ...source.references.intro,
      source.measurement.statement, source.measurement.supportingLine,
      source.moves.footerNote,
      guardrailsPresentation.authority.detailsLabel,
      guardrailsPresentation.sourcesNextStep.detailsLabel,
    ];
    for (const text of retained) {
      assert.ok(html.includes(normalize(renderToString(<MarkdownInline text={text} />))), `Missing retained source: ${text}`);
    }
  });
  it('renders loading state', () => {
    const html = renderToString(<GuardrailsLayout framework={null} renderPolicy="loading" />);
    assert.match(html, /Loading the governed methodology…/);
  });

  it('renders unavailable state', () => {
    const html = renderToString(<GuardrailsLayout framework={null} renderPolicy="unavailable" />);
    assert.match(html, /This methodology is not currently published\./);
  });

  it('keeps the original fixture on the legacy composition until redesign is marked', () => {
    const framework = {
      ...guardrailsFixture.content,
      title: guardrailsFixture.title,
      id: 'guardrails-original-fixture',
      slug: guardrailsFixture.slug,
      summary: guardrailsFixture.summary,
      media: undefined,
      publishedAt: '',
      updatedAt: '',
      market: 'uae',
      requestedMarket: 'uae',
      usedFallback: false,
      seo: guardrailsFixture.seo,
    };
    const legacyHtml = renderToString(
      <Router ssrPath="/methodologies/guardrails-framework">
        <GuardrailsLayout framework={framework} />
      </Router>,
    );
    assert.match(legacyHtml, /id="guardrails-layers-description"/);
    assert.match(legacyHtml, /id="guardrails-exposure-description"/);
    assert.equal((legacyHtml.match(/<section\b/g) || []).length, 10);

    const redesignedHtml = renderToString(
      <Router ssrPath="/methodologies/guardrails-framework">
        <GuardrailsLayout framework={{ ...framework, presentation: guardrailsPresentation }} />
      </Router>,
    );
    assert.match(redesignedHtml, /Read the reviewed introduction/);
    assert.equal((redesignedHtml.match(/<section\b/g) || []).length, 6);
  });

  it('renders the complete layout with sections', () => {
    const html = renderToString(<GuardrailsLayout framework={mockContent} renderPolicy="cms" />);
    assert.match(html, /Distinction/);
    assert.match(html, /Layers/);
    assert.match(html, /State/);
    assert.match(html, /Support/);
    assert.equal((html.match(/<section\b/g) || []).length, 6);
  });

  it('keeps reviewed detail content closed while the measurement copy is visible', () => {
    const html = renderToString(<GuardrailsLayout framework={mockContent} renderPolicy="cms" />);
    assert.match(html, /<details/);
    assert.doesNotMatch(html, /<details[^>]*open/);
    assert.match(html, /Measure/);
    assert.match(html, /State/);
    assert.match(html, /Support/);
  });

  it('uses the saved OG image version independently from the hero', () => {
    const content: any = {
      ...mockContent,
      heroMedia: { mediaId: 'hero', mediaVersionId: 'hero-v1' },
      media: [
        { id: 'hero', versionId: 'hero-v1', url: '/hero-v1.jpg' },
        { id: 'social', versionId: 'social-v1', url: '/social-v1.jpg' },
        { id: 'social', versionId: 'social-v2', url: '/social-v2.jpg' },
      ],
      seo: {
        title: 'Test',
        description: 'Description',
        noIndex: false,
        ogImageMedia: { mediaId: 'social', mediaVersionId: 'social-v1', role: 'og-image' },
      },
    };
    const first = guardrailsMetadata(content, 'cms').imageUrl;
    const second = guardrailsMetadata({
      ...content,
      seo: {
        ...content.seo,
        ogImageMedia: { ...content.seo.ogImageMedia, mediaVersionId: 'social-v2' },
      },
    }, 'cms').imageUrl;
    assert.equal(first, '/social-v1.jpg');
    assert.equal(second, '/social-v2.jpg');
    assert.equal(guardrailsMetadata({
      ...content,
      seo: {
        ...content.seo,
        ogImageMedia: { ...content.seo.ogImageMedia, mediaVersionId: 'missing' },
      },
    }, 'cms').imageUrl, undefined);
  });

  it('keeps the layer threshold visible between wrapping control groups', () => {
    const rows = ['policy', 'prompt', 'runtime', 'architecture'].map((id, index) => ({
      id,
      label: id,
      description: `Description ${id}`,
      example: `Example ${id}`,
      bypassLabel: 'Bypass',
      bypass: `Bypass ${id}`,
      strength: index + 1,
      strengthLabel: `${index + 1} of 4`,
    }));
    const content: any = {
      ...mockContent,
      layers: {
        ...mockContent.layers,
        tableHeaders: ['Layer', 'What', 'Example', 'Past', 'Strength'],
        diagram: {
          ...mockContent.layers.diagram,
          rows,
          thresholdAfter: 'prompt',
          thresholdLabel: 'Above this line, you are asking',
        },
      },
    };
    const html = renderToString(<LayerExplorer content={content} />);
    assert.match(html, /data-guardrails-threshold/);
    assert.match(html, /role="separator"/);
    assert.match(html, /whitespace-normal/);
    assert.doesNotMatch(html, /whitespace-nowrap/);
  });
});
