import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Router } from 'wouter';
import { GuardrailsLayout, guardrailsMetadata } from './GuardrailsFramework';
import { MarkdownInline } from '@/components/guardrails/MarkdownInline';
import { guardrailsFixture } from '../../../../scripts/src/cms/guardrails-fixture';
import { guardrailsSetProveHoldContent } from '../../../../scripts/src/cms/guardrails-set-prove-hold';

const mockLegacyContent: any = {
  template: 'guardrails',
  contentVersion: 'guardrails-legacy-v1',
  title: 'Legacy Test',
  seo: {},
  hero: { eyebrow: 'Eyebrow', headline: 'Headline', subheadline: 'Sub', primaryAction: { label: 'Click', href: '/contact' }, secondaryAction: { label: 'Click 2', href: '/methodologies/agent-authority-model' } },
  distinction: { heading: 'Distinction', body: ['Para 1'] },
  layers: {
    heading: 'Layers', intro: 'Intro', table: [{ id: 'policy', layer: 'Policy', whatItIs: 'x', inThisExample: 'y', whatGetsPastIt: 'z', strengthLabel: 's', strength: 1 }],
    tableHeaders: ['Layer', 'What', 'Ex', 'Past', 'Strength'], pullOut: 'Pull', closingLine: 'Close', aside: { heading: 'Aside', body: 'Body' },
    diagram: {
      rows: [{ id: 'policy', label: 'L1', description: 'D1', example: 'E1', bypassLabel: 'B1', bypass: 'By1', strength: 1, strengthLabel: 'S1' }],
      title: 'T', description: 'D', kicker: 'K', rule: 'R', footer: 'F',
      thresholdAfter: 'prompt', thresholdLabel: 'Threshold'
    }
  },
  stoppingRule: {
    heading: 'Stop', intro: 'Intro', tableHeaders: ['H1', 'H2'], exposures: [{ id: 'internal-reversible', handover: 'Know', requirement: 'Req', enforcementLayer: 'prompt', additionId: 'none' }], pullOut: 'Pull',
    diagram: {
      heading: 'Heading', destinationHeading: 'Dest', bands: [{ id: 'internal-reversible', label: 'B1', description: 'Desc1', destination: 'prompt', additionId: 'none' }],
      destinations: [{ id: 'prompt', label: 'D1', description: 'DescD1' }],
      additions: [{ id: 'none', label: 'A1' }],
      title: 'T', description: 'D', kicker: 'K', footer: 'F', note: 'N'
    }
  },
  maintenance: { heading: 'Maintenance', table: [{ id: 'policy', layer: 'Policy', set: 'S', prove: 'P', hold: 'H' }], tableHeaders: ['Layer', 'Set', 'Prove', 'Hold'], closingParagraph: 'Close' },
  method: { heading: 'Method', intro: 'Intro', phases: [{ id: 'set', name: 'N1', caption: 'C1', steps: ['S1'] }] },
  questions: { heading: 'Qs', intro: 'Intro', panels: [] },
  measurement: { heading: 'Measure', statement: 'State', supportingLine: 'Support' },
  authority: { heading: 'Auth', body: ['Para'], linkCard: { title: 'Link', description: 'Desc', href: '#' } },
  references: { heading: 'Refs', intro: ['Intro'], groups: [{ id: 'forbid', title: 'Grp', items: 'Items' }] },
  moves: { heading: 'Moves', moves: [{ number: 1, title: 'Title', body: 'Body' }], cta: { heading: 'CTA', body: 'Body', button: { label: 'Btn', href: '/contact' } }, footerNote: 'Note' },
};

const mockNewContent: any = {
  ...guardrailsSetProveHoldContent,
};

describe('GuardrailsFramework Layout', () => {
  it('renders loading state', () => {
    const html = renderToString(<GuardrailsLayout framework={null} renderPolicy="loading" />);
    assert.match(html, /Loading the governed methodology…/);
  });

  it('renders unavailable state', () => {
    const html = renderToString(<GuardrailsLayout framework={null} renderPolicy="unavailable" />);
    assert.match(html, /This methodology is not currently published\./);
  });

  it('renders legacy layout when contentVersion is guardrails-legacy-v1', () => {
    const framework = {
      ...mockLegacyContent,
      id: 'legacy-framework',
      title: 'Legacy',
      seo: {},
    };
    const html = renderToString(
      <Router ssrPath="/methodologies/guardrails-framework">
        <GuardrailsLayout framework={framework} />
      </Router>
    );
    assert.match(html, /id="guardrails-layers-description"/);
    assert.match(html, /id="guardrails-exposure-description"/);
    assert.match(html, /State/); // measurement statement
    assert.match(html, /Support/); // measurement supporting line
  });

  it('renders the new Set Prove Hold layout correctly', () => {
    const framework = {
      ...mockNewContent,
      id: 'new-framework',
      title: 'New',
      seo: {},
    };
    const html = renderToString(
      <Router ssrPath="/methodologies/guardrails-framework">
        <GuardrailsLayout framework={framework} />
      </Router>
    );
    // Overview section
    assert.match(html, /data-guardrails-section="overview"/);
    assert.match(html, /Set, Prove &amp; Hold \(4 \+ 4 \+ 4\)/);
    // Layers section
    assert.match(html, /data-guardrails-section="layers"/);
    // Matrix section
    assert.match(html, /data-guardrails-section="lifecycle"/);
    // Next steps
    assert.match(html, /data-guardrails-section="next-steps"/);

    // Check that we render 12 actions
    assert.match(html, /data-guardrails-action="set-name"/);
    assert.match(html, /data-guardrails-action="hold-report"/);
    assert.match(html, /data-guardrails-layer="policy"/);
    assert.match(html, /data-guardrails-layer="architecture"/);
    assert.match(html, /data-guardrails-matrix-cell="architecture-hold"/);
    assert.match(html, /Selected action detail/);
    assert.match(html, /Failure condition/);
    assert.match(html, /What reaches AI/);
    assert.match(html, /AI model/);
    assert.doesNotMatch(html, /Draft hero media is not available/);
  });

  it('uses the saved OG image version independently from the hero', () => {
    const content: any = {
      ...mockNewContent,
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
});
