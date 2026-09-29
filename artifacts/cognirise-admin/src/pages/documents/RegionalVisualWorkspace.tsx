import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, ChevronDown, Eye, FileText, Image as ImageIcon, Layers3, Link2, RotateCcw, ShieldAlert } from 'lucide-react';

export type RegionalPageContext = 'homepage' | 'about' | 'insights' | 'case-studies';

export interface RegionalEdition {
  /** This must identify a selected, exact market and locale; never a regional fallback. */
  market: string;
  locale: string;
  direction?: 'ltr' | 'rtl';
  /** Rendered verbatim from the editorial system; this component does not infer workflow state. */
  status: string;
  /** Provenance only. This is not an automatic fallback or a publishable edition. */
  lineage?: { label: string; sourceHref?: string };
  savedRevisionId?: string | number | null;
  hasUnsavedChanges: boolean;
}

export interface RegionalVisualTarget {
  fieldPath: string;
  /** Renderer-owned landing slot ID, for selection from the protected page. */
  slotId?: string;
  label: string;
  owner: string;
  editable: boolean;
  /** Local editor content. Text only; never interpreted as markup or claimed to be saved. */
  content?: string;
  imagePreview?: { src: string; alt: string };
  issueIds?: string[];
  sourceHref?: string;
  kind?: 'headline' | 'body' | 'media' | 'collection' | 'field';
}

export interface RegionalVisualIssue {
  id: string;
  targetPath: string;
  label: string;
  remedy: string;
}

export interface RegionalWorkspaceNavigation {
  pages: { context: RegionalPageContext; label: string }[];
  onSelectPage: (context: RegionalPageContext) => void;
  onBack?: () => void;
  onChangeEdition?: () => void;
  onOpenStructuredEditor?: () => void;
}

export interface RegionalVisualWorkspaceProps {
  edition: RegionalEdition;
  pageContext: RegionalPageContext;
  /** Optional parent-owned title for the selected page. */
  pageTitle?: string;
  /** URL returned for edition.savedRevisionId, not a local draft URL. Only same-origin URLs are exposed. */
  savedPreviewUrl?: string | null;
  /** Optional expiry of the protected saved-revision URL (ISO date, epoch milliseconds, or Date). Expired previews are never embedded. */
  previewExpiresAt?: string | number | Date | null;
  /** Parent retrieves a new protected URL; this component does not mint or silently reload revisions. */
  onRefreshPreview?: () => void;
  targets: RegionalVisualTarget[];
  selectedTargetPath: string | null;
  onSelect: (fieldPath: string) => void;
  /** Parent-owned, contextual editor for the selected target. No edits or saves happen here. */
  editingSlot?: ReactNode;
  issues: RegionalVisualIssue[];
  onIssue: (issue: RegionalVisualIssue) => void;
  navigation: RegionalWorkspaceNavigation;
  /** Parent-owned save, review, or release controls; this shell never simulates workflow actions. */
  workflowControls?: ReactNode;
  state?: 'ready' | 'loading' | 'error';
  errorMessage?: string;
  onRetry?: () => void;
}

const pageNames: Record<RegionalPageContext, string> = {
  homepage: 'Homepage',
  about: 'About',
  insights: 'Insights',
  'case-studies': 'Case studies',
};

/** Accept a path on this application origin only; reject javascript:, data:, and protocol-relative URLs. */
function safeSameOriginUrl(value?: string | null): string | null {
  if (!value || typeof window === 'undefined' || value.startsWith('//') || value.startsWith('\\\\')) return null;
  try {
    const url = new URL(value, window.location.href);
    return url.origin === window.location.origin && (url.protocol === 'http:' || url.protocol === 'https:')
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function TargetTile({
  target, selected, onSelect, lead = false, imageUrl,
}: {
  target: RegionalVisualTarget;
  selected: boolean;
  onSelect: (fieldPath: string) => void;
  lead?: boolean;
  imageUrl?: string | null;
}) {
  const isImage = target.kind === 'media' || !!target.imagePreview;
  return (
    <button
      type="button"
      className={`rvw-target${lead ? ' rvw-target--lead' : ''}${isImage ? ' rvw-target--image' : ''}`}
      aria-pressed={selected}
      aria-label={`Select ${target.label}, ${target.fieldPath}${target.issueIds?.length ? `, ${target.issueIds.length} linked issues` : ''}`}
      onClick={() => onSelect(target.fieldPath)}
      data-testid={`button-visual-target-${target.fieldPath}`}
      dir="auto"
    >
      {isImage ? (
        <>
          {imageUrl ? <img src={imageUrl} alt={target.imagePreview?.alt ?? ''} loading="lazy" /> : <span className="rvw-image-fallback"><ImageIcon aria-hidden="true" /></span>}
          <span className="rvw-image-label">{target.label}</span>
        </>
      ) : (
        <>
          <span className="rvw-target-kicker">{target.label}</span>
          <span className="rvw-target-content">{target.content || 'No local content'}</span>
           <span className="rvw-target-owner">{target.owner} · {target.editable ? 'Editable here' : 'Read only'}</span>
        </>
      )}
      {!!target.issueIds?.length && <span className="rvw-target-count" aria-hidden="true">{target.issueIds.length}</span>}
    </button>
  );
}

export function RegionalVisualWorkspace({
  edition, pageContext, pageTitle, savedPreviewUrl, previewExpiresAt, onRefreshPreview, targets, selectedTargetPath, onSelect,
  editingSlot, issues, onIssue, navigation, workflowControls, state = 'ready', errorMessage, onRetry,
}: RegionalVisualWorkspaceProps) {
  const [requestedView, setRequestedView] = useState<'preview' | 'map'>('preview');
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const tabId = useId();
  const hasSavedRevision = edition.savedRevisionId != null;
  const hasPreviewRequest = hasSavedRevision && !!savedPreviewUrl;
  const activeView = hasPreviewRequest && requestedView === 'preview' ? 'preview' : 'map';
  const expiryTime = previewExpiresAt == null ? null : previewExpiresAt instanceof Date
    ? previewExpiresAt.getTime()
    : typeof previewExpiresAt === 'number' ? previewExpiresAt : Date.parse(previewExpiresAt);
  const previewExpired = expiryTime != null && (!Number.isFinite(expiryTime) || expiryTime <= now);
  useEffect(() => {
    if (expiryTime == null || !Number.isFinite(expiryTime) || expiryTime <= Date.now()) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(expiryTime - Date.now(), 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [expiryTime, now]);
  const selected = targets.find((target) => target.fieldPath === selectedTargetPath);
  const firstLead = targets.find((target) => target.kind === 'headline') ?? targets.find((target) => target.kind !== 'media' && !target.imagePreview);
  const firstImage = targets.find((target) => target.kind === 'media' || target.imagePreview);
  const remainder = targets.filter((target) => target !== firstLead && target !== firstImage);
  const selectedIssues = selected
    ? issues.filter((issue) => issue.targetPath === selected.fieldPath && (!selected.issueIds || selected.issueIds.includes(issue.id)))
    : [];
  const previewUrl = hasSavedRevision ? safeSameOriginUrl(savedPreviewUrl) : null;
  useEffect(() => {
    if (activeView !== 'preview' || !previewUrl || previewExpired) return;
    const frame = frameRef.current;
    if (!frame) return;
    let attachedDocument: Document | null = null;
    const selectVisibleField = (event: MouseEvent) => {
      // The event target belongs to the iframe's JavaScript realm, so a parent
      // window `instanceof Element` check would reject every valid click.
      const eventTarget = event.target as Element | null;
      const node = eventTarget?.nodeType === 1 && typeof eventTarget.closest === 'function'
        ? eventTarget.closest<HTMLElement>('[data-cms-slot], [data-cms-field]')
        : null;
      if (!node) return;
      const target = targets.find((candidate) =>
        (node.dataset.cmsSlot && candidate.slotId === node.dataset.cmsSlot)
        || (node.dataset.cmsField && candidate.fieldPath === node.dataset.cmsField));
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      onSelect(target.fieldPath);
      setRequestedView('map');
    };
    const attach = () => {
      try {
        const nextDocument = frame.contentDocument;
        if (attachedDocument === nextDocument) return;
        attachedDocument?.removeEventListener('click', selectVisibleField, true);
        attachedDocument = nextDocument;
        attachedDocument?.addEventListener('click', selectVisibleField, true);
      } catch {
        // A preview on a different origin cannot be inspected. The content map remains usable.
      }
    };
    frame.addEventListener('load', attach);
    attach();
    return () => {
      frame.removeEventListener('load', attach);
      attachedDocument?.removeEventListener('click', selectVisibleField, true);
    };
  }, [activeView, onSelect, previewExpired, previewUrl, targets]);
  const lineageUrl = safeSameOriginUrl(edition.lineage?.sourceHref);
  const sourceUrl = safeSameOriginUrl(selected?.sourceHref);
  const title = pageTitle || pageNames[pageContext];
  const renderTile = (target: RegionalVisualTarget, lead = false) => (
    <TargetTile
      key={target.fieldPath}
      target={target}
      lead={lead}
      selected={selectedTargetPath === target.fieldPath}
      onSelect={onSelect}
      imageUrl={safeSameOriginUrl(target.imagePreview?.src)}
    />
  );

  return (
    <section className="rvw" aria-label={`Regional visual editor for ${edition.market}, ${edition.locale}`}>
      <header className="rvw-top">
        <div className="rvw-brand">
          <div className="rvw-brandmark">cognirise <span>pulse</span></div>
          <div className="rvw-brandline" aria-hidden="true" />
          <div className="rvw-brandname">REGIONAL<br />EDITOR</div>
        </div>
        <div className="rvw-top-actions">
          {navigation.onChangeEdition && (
            <button type="button" className="rvw-edition" onClick={navigation.onChangeEdition} data-testid="button-change-edition" aria-label={`Change edition, current ${edition.market}, ${edition.locale}`}>
              {edition.market} · {edition.locale} <ChevronDown aria-hidden="true" />
            </button>
          )}
          {!navigation.onChangeEdition && <span className="rvw-edition" data-testid="text-current-edition">{edition.market} · {edition.locale}</span>}
          {navigation.onOpenStructuredEditor && (
            <button type="button" className="rvw-icon-button" onClick={navigation.onOpenStructuredEditor} data-testid="button-open-structured-editor">
              <FileText aria-hidden="true" /> Structured editor
            </button>
          )}
        </div>
      </header>

      <div className="rvw-intro">
        <div>
          <span className="rvw-overline">Exact edition / {edition.market} / {edition.locale}</span>
          <h2>{title} <span aria-hidden="true">/</span> Visual workspace</h2>
          <p>Choose a field in the content map to inspect its owner and edit in context.</p>
        </div>
        <span className="rvw-status" data-testid="status-edition">{edition.status}</span>
      </div>

      <nav className="rvw-tabs" aria-label="Regional page sections">
        {navigation.pages.map((page) => (
          <button
            type="button" key={page.context} className="rvw-tab"
            aria-current={page.context === pageContext ? 'page' : undefined}
            onClick={() => navigation.onSelectPage(page.context)}
            data-testid={`button-page-${page.context}`}
          >{page.label}</button>
        ))}
      </nav>

      <div className="rvw-view-switch" role="tablist" aria-label="Workspace view">
        {hasPreviewRequest && (
          <button
            id={`${tabId}-preview-tab`} type="button" role="tab"
            className="rvw-view-tab" aria-selected={activeView === 'preview'}
            aria-controls={`${tabId}-preview-panel`}
            onClick={() => setRequestedView('preview')}
            data-testid="button-view-saved-preview"
          ><Eye aria-hidden="true" /> Saved preview</button>
        )}
        <button
          id={`${tabId}-map-tab`} type="button" role="tab"
          className="rvw-view-tab" aria-selected={activeView === 'map'}
          aria-controls={`${tabId}-map-panel`}
          onClick={() => setRequestedView('map')}
          data-testid="button-view-content-map"
        ><Layers3 aria-hidden="true" /> Content map</button>
      </div>

      {activeView === 'preview' && (
        <div className="rvw-preview" id={`${tabId}-preview-panel`} role="tabpanel" aria-labelledby={`${tabId}-preview-tab`}>
          <div className="rvw-preview-bar">
            <div>
              <strong data-testid="status-immutable-preview">Immutable saved revision {edition.savedRevisionId}</strong>
              <p>Protected page preview for {edition.market} · {edition.locale}. Choose marked text to open its source field, or use Content map. Unsaved local changes are excluded.</p>
            </div>
            {onRefreshPreview && (
              <button type="button" className="rvw-text-button" onClick={onRefreshPreview} data-testid="button-refresh-saved-preview">
                <RotateCcw aria-hidden="true" /> Refresh preview link
              </button>
            )}
          </div>
          {previewExpired ? (
            <div className="rvw-empty" role="status">
              <ShieldAlert aria-hidden="true" /><strong>Preview link expired</strong>
              <p>The saved revision has not changed. Request a new protected link to view it, or use the content map.</p>
              {onRefreshPreview && <button type="button" className="rvw-text-button" onClick={onRefreshPreview} data-testid="button-refresh-expired-preview"><RotateCcw aria-hidden="true" /> Refresh preview link</button>}
            </div>
          ) : previewUrl ? (
            <iframe
              ref={frameRef}
              key={`${edition.market}:${edition.locale}:${edition.savedRevisionId}:${previewUrl}`}
              className="rvw-preview-frame"
              src={previewUrl}
              title={`Saved revision ${edition.savedRevisionId} preview, ${edition.market}, ${edition.locale}`}
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="same-origin"
              loading="lazy"
              data-testid="frame-saved-revision-preview"
            />
          ) : (
            <div className="rvw-empty" role="status">
              <ShieldAlert aria-hidden="true" /><strong>Protected preview unavailable</strong>
              <p>The supplied preview URL is not on this origin. The content map remains available.</p>
            </div>
          )}
        </div>
      )}

      {activeView === 'map' && <div className="rvw-body" id={`${tabId}-map-panel`} role="tabpanel" aria-labelledby={`${tabId}-map-tab`}>
        <div className="rvw-canvas">
          <div className="rvw-canvas-header">
            <strong>Content map <span aria-hidden="true">·</span> {title}</strong>
            <span>{targets.length} selectable {targets.length === 1 ? 'field' : 'fields'}</span>
          </div>
          <div className="rvw-canvas-note">
            This map shows supplied local editor values. It is not a website preview and does not include unsaved changes in the saved revision.
          </div>
          {state === 'loading' ? (
            <div className="rvw-skeleton" role="status" aria-label="Loading visual targets"><span /><span /><span /></div>
          ) : state === 'error' ? (
            <div className="rvw-empty" role="alert">
              <ShieldAlert aria-hidden="true" /><strong>Content map unavailable</strong>
              <p>{errorMessage || 'The visual targets could not be loaded. The structured editor remains available.'}</p>
              {onRetry && <button type="button" className="rvw-text-button" onClick={onRetry} data-testid="button-retry-visual-targets"><RotateCcw aria-hidden="true" /> Try again</button>}
            </div>
          ) : targets.length === 0 ? (
            <div className="rvw-empty">
              <Layers3 aria-hidden="true" /><strong>No mapped fields on this page</strong>
              <p>Use the structured editor for fields that are not mapped to this visual workspace.</p>
              {navigation.onOpenStructuredEditor && <button type="button" className="rvw-text-button" onClick={navigation.onOpenStructuredEditor} data-testid="button-open-structured-empty">Open structured editor</button>}
            </div>
          ) : (
            <div className="rvw-page" dir={edition.direction ?? 'auto'}>
              <div className="rvw-page-head"><strong>cognirise <span style={{ color: '#b83c73' }}>pulse</span></strong><span>{edition.market} · {edition.locale}</span></div>
              <div className="rvw-feature">
                {firstLead && renderTile(firstLead, true)}
                {firstImage && renderTile(firstImage)}
              </div>
              {remainder.length > 0 && <div className="rvw-target-list">{remainder.map((target) => renderTile(target))}</div>}
            </div>
          )}
        </div>

        <aside className="rvw-inspector" aria-label="Selected field inspector">
          <div className="rvw-inspector-head">
            <span className="rvw-overline">Field inspector</span>
            <h3>{selected?.label ?? 'Select a field'}</h3>
          </div>
          <div className="rvw-inspector-body">
            {selected ? (
              <>
                <div className="rvw-path" data-testid="text-selected-field-path">{selected.fieldPath}</div>
                <dl className="rvw-details">
                  <dt>Owner</dt><dd data-testid="text-selected-field-owner">{selected.owner}</dd>
                   <dt>Access</dt><dd>{selected.editable ? 'Editable in this edition' : 'Read only in this edition'}</dd>
                  <dt>Source</dt><dd>{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" data-testid="link-field-source">View source <ArrowUpRight size={12} aria-hidden="true" /></a> : 'No source link supplied'}</dd>
                </dl>
                 {!selected.editable && <div className="rvw-readonly">This exact edition is not editable right now. Check your access and its workflow status before making changes.</div>}
                <div className="rvw-edit-region">
                  <h4>Contextual editing</h4>
                  {selected.editable && editingSlot ? editingSlot : <p>{selected.editable ? 'No editor is available for this field. Use the structured editor.' : 'Editing is not available in this edition.'}</p>}
                </div>
              </>
            ) : (
              <div className="rvw-empty"><Layers3 aria-hidden="true" /><strong>Start with a field</strong><p>Select an outlined area on the map to see its source, issues, and editing controls.</p></div>
            )}
          </div>
          {selectedIssues.length > 0 && (
            <div className="rvw-issues">
              <h4>{selectedIssues.length} {selectedIssues.length === 1 ? 'issue' : 'issues'} for this field</h4>
              {selectedIssues.map((issue) => (
                <button type="button" key={issue.id} className="rvw-issue" onClick={() => onIssue(issue)} data-testid={`button-issue-${issue.id}`}>
                  <strong>{issue.label}</strong><span>{issue.remedy}</span>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>}

      <footer className="rvw-footer">
        <p data-testid="text-revision-context">
          {edition.hasUnsavedChanges ? 'Unsaved local edits · ' : 'No local changes indicated · '}
          {edition.savedRevisionId != null ? `Saved revision ${edition.savedRevisionId}` : 'No saved revision supplied'}
          {edition.lineage && <> <span aria-hidden="true">·</span> Source: {lineageUrl ? <a href={lineageUrl} target="_blank" rel="noopener noreferrer" data-testid="link-edition-lineage">{edition.lineage.label}</a> : edition.lineage.label}</>}
          . Lineage is provenance, not automatic publication.
        </p>
        <div className="rvw-footer-actions">
          {navigation.onBack && <button type="button" className="rvw-text-button" onClick={navigation.onBack} data-testid="button-back-workspace"><ArrowLeft aria-hidden="true" /> Back</button>}
          {previewUrl && !previewExpired && <a className="rvw-text-button" href={previewUrl} target="_blank" rel="noopener noreferrer" data-testid="link-preview-saved-revision" title="Open only the supplied saved immutable revision"><Eye aria-hidden="true" /> Open saved revision <ArrowUpRight aria-hidden="true" /></a>}
          {workflowControls}
        </div>
      </footer>
      {!previewUrl && savedPreviewUrl && <span className="sr-only" role="status">Saved preview unavailable: a same-origin saved revision URL is required.</span>}
      <span className="sr-only"><Link2 aria-hidden="true" /> This workspace does not save or publish content.</span>
    </section>
  );
}

export default RegionalVisualWorkspace;