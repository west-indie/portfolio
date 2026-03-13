import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import PageTransition from './components/PageTransition';
import Home from './pages/Home';
import Work from './pages/Work';
import ProjectDetail from './pages/ProjectDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import type { Collaborator, LinkStackItem, MediaItem, MediaItemType } from './types/project';
import type { WorkbenchPreviewDraft } from './types/workbenchPreview';
import { normalizeProjectLayout } from './lib/projectLayout';
import { normalizeDisciplines } from './lib/disciplines';

const HIGHLIGHT_ACTIVE_ATTR = 'data-mwb-highlight';

const HIGHLIGHT_SELECTOR_BY_TARGET: Record<string, string[]> = {
  title: ['[data-mwb-highlight-id="title"]'],
  year: ['[data-mwb-highlight-id="year"]'],
  month: ['[data-mwb-highlight-id="year"]'],
  subtitle: ['[data-mwb-highlight-id="subtitle"]'],
  role: ['[data-mwb-highlight-id="role"]'],
  location: ['[data-mwb-highlight-id="location"]'],
  'hero-image': ['[data-mwb-highlight-id="hero-image"]'],
  disciplines: ['[data-mwb-highlight-id="disciplines"]'],
  'tech-stack': ['[data-mwb-highlight-id="tech-stack"]'],
  collaborators: ['[data-mwb-highlight-id="collaborators"]'],
  cast: ['[data-mwb-highlight-id="cast"]'],
  'links-github': ['[data-mwb-highlight-id="links-github"]', '[data-mwb-highlight-id="links"]'],
  'links-live-demo': ['[data-mwb-highlight-id="links-live-demo"]', '[data-mwb-highlight-id="links"]'],
  'links-stack': ['[data-mwb-highlight-id="links-stack"]', '[data-mwb-highlight-id="links"]'],
  'links-press': ['[data-mwb-highlight-id="links-press"]', '[data-mwb-highlight-id="links"]'],
  gallery: ['[data-mwb-highlight-id="gallery"]'],
  description: ['[data-mwb-highlight-id="description"]'],
  'entry-lines': ['[data-mwb-highlight-id="entry-lines"]'],
  'home-hero-title': ['section.grid h1'],
  'home-hero-subtitle': ['section.grid p.text-lg'],
  'home-hybrid-eyebrow': ['section.grid .bg-gradient-to-br p.text-sm.uppercase'],
  'home-hybrid-title': ['section.grid .bg-gradient-to-br h2'],
  'home-hybrid-body': ['section.grid .bg-gradient-to-br p.text-gray-300.leading-relaxed'],
  'home-featured-heading': ['section.space-y-6 h2.text-2xl'],
  'home-expertise-heading': ['section h3.text-xl'],
  'home-expertise-items': ['section .flex.flex-wrap.gap-3'],
  'work-eyebrow': ['header p.uppercase.tracking-wide'],
  'work-title': ['header h1.text-3xl'],
  'work-intro': ['header p.text-gray-300.max-w-2xl'],
  'work-all-label': ['header'],
  'about-name': ['div.space-y-4 div.p-4 p.font-semibold'],
  'about-role': ['div.space-y-4 div.p-4 p.text-sm.text-gray-400:first-of-type'],
  'about-tagline': ['div.space-y-4 div.p-4 p.text-sm.text-gray-400:last-of-type'],
  'about-title': ['div.lg\\:col-span-2 h1.text-3xl'],
  'about-intro': ['div.lg\\:col-span-2 p.text-lg'],
  'about-body': ['div.lg\\:col-span-2 p.text-gray-300.leading-relaxed'],
  'about-orgs': ['div.lg\\:col-span-2 .flex.flex-wrap.gap-3'],
  'about-note': ['div.lg\\:col-span-2 p.text-xs.text-gray-500'],
  'contact-title': ['div.space-y-4 h1.text-3xl'],
  'contact-intro': ['div.space-y-4 p.text-gray-300'],
  'contact-email': ['a[href^="mailto:"]'],
  'contact-links': ['div.space-y-2.text-gray-300'],
  'contact-form-submit': ['form button[type="submit"]'],
  'contact-form-success': ['form .text-green-400'],
};

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value : String(value || '');
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => normalizeString(item).trim()).filter(Boolean)
    : [];
}

function normalizeMonth(value: unknown): string {
  const text = normalizeString(value).trim();
  if (!/^\d{1,2}$/.test(text)) return '';
  const month = Number(text);
  if (!Number.isFinite(month) || month < 1 || month > 12) return '';
  return String(month).padStart(2, '0');
}

function normalizeStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, raw]) => {
    const normalizedKey = normalizeString(key).trim();
    const normalizedValue = normalizeString(raw).trim();
    if (!normalizedKey || !normalizedValue) return acc;
    acc[normalizedKey] = normalizedValue;
    return acc;
  }, {});
}

function normalizeCollaborators(value: unknown): Collaborator[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const next = item as Record<string, unknown>;
      const name = normalizeString(next.name).trim();
      const role = normalizeString(next.role).trim();
      if (!name) return null;
      return role ? { name, role } : { name };
    })
    .filter((item): item is Collaborator => Boolean(item));
}

function normalizeMediaType(value: unknown): MediaItemType {
  const raw = normalizeString(value).trim().toLowerCase();
  if (raw === 'video' || raw === 'embed' || raw === 'image') {
    return raw;
  }
  return 'image';
}

function normalizeGallery(value: unknown): MediaItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const next = item as Record<string, unknown>;
      const src = normalizeString(next.src).trim();
      const caption = normalizeString(next.caption).trim();
      if (!src) return null;
      return {
        type: normalizeMediaType(next.type),
        src,
        ...(caption ? { caption } : {}),
      };
    })
    .filter((item): item is MediaItem => Boolean(item));
}

function normalizeLinkStack(value: unknown): LinkStackItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        const raw = normalizeString(item).trim();
        if (!raw) return null;
        if (/^https?:\/\//i.test(raw)) {
          return {
            title: `Link ${index + 1}`,
            url: raw,
          };
        }
        const splitIndex = raw.indexOf(':');
        if (splitIndex <= 0) return null;
        const title = raw.slice(0, splitIndex).trim();
        const url = raw.slice(splitIndex + 1).trim();
        if (!title || !url) return null;
        return { title, url };
      }

      const next = item as Record<string, unknown>;
      const title = normalizeString(next.title).trim();
      const url = normalizeString(next.url).trim();
      if (!title || !url) return null;
      return { title, url };
    })
    .filter((item): item is LinkStackItem => Boolean(item));
}

function legacyPressToLinkStack(value: unknown): LinkStackItem[] {
  const links = normalizeStringArray(value);
  return links.map((url, index) => ({
    title: links.length > 1 ? `Press ${index + 1}` : 'Press',
    url,
  }));
}

function legacyDirectLinksToStack(value: unknown): LinkStackItem[] {
  if (!value || typeof value !== 'object') return [];
  const source = value as Record<string, unknown>;
  const out: LinkStackItem[] = [];
  const github = normalizeString(source.github).trim();
  if (github) out.push({ title: 'GitHub', url: github });
  const liveDemo = normalizeString(source.liveDemo).trim();
  if (liveDemo) out.push({ title: 'Live Demo', url: liveDemo });
  return out;
}

function dedupeLinkStack(value: LinkStackItem[]): LinkStackItem[] {
  const out: LinkStackItem[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(value) ? value : []) {
    const title = normalizeString(item?.title).trim();
    const url = normalizeString(item?.url).trim();
    if (!title || !url) continue;
    const key = `${title.toLowerCase()}|${url.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, url });
  }
  return out;
}

function resolveLinkStack(value: unknown): LinkStackItem[] {
  if (!value || typeof value !== 'object') return [];
  const source = value as Record<string, unknown>;
  const direct = legacyDirectLinksToStack(source);
  const stack = normalizeLinkStack(source.stack);
  const press = stack.length > 0 ? [] : legacyPressToLinkStack(source.press);
  return dedupeLinkStack([...direct, ...stack, ...press]);
}

function normalizePreviewDraft(value: unknown): WorkbenchPreviewDraft | null {
  if (!value || typeof value !== 'object') return null;
  const draft = value as Record<string, unknown>;

  const linksRaw = draft.links && typeof draft.links === 'object'
    ? draft.links as Record<string, unknown>
    : null;

  const mediaRaw = draft.media && typeof draft.media === 'object'
    ? draft.media as Record<string, unknown>
    : null;

  return {
    slug: normalizeString(draft.slug).trim(),
    title: normalizeString(draft.title),
    subtitle: normalizeString(draft.subtitle),
    year: normalizeString(draft.year),
    month: normalizeMonth(draft.month) || '01',
    layout: normalizeProjectLayout(draft.layout),
    category: normalizeString(draft.category).trim(),
    categoryMeta: normalizeStringMap(draft.categoryMeta),
    role: normalizeString(draft.role),
    client: normalizeString(draft.client),
    location: normalizeString(draft.location),
    tags: normalizeStringArray(draft.tags),
    disciplines: normalizeDisciplines(draft.disciplines),
    moreWork: normalizeStringArray(draft.moreWork),
    hidden: draft.hidden === true,
    hideFromWorkPage: draft.hideFromWorkPage === true,
    omitTechStack: draft.omitTechStack === true,
    omitLinkStack: draft.omitLinkStack === true,
    techStack: normalizeStringArray(draft.techStack),
    collaborators: normalizeCollaborators(draft.collaborators),
    cast: normalizeCollaborators(draft.cast),
    links: {
      stack: resolveLinkStack(linksRaw),
    },
    media: {
      heroImage: normalizeString(mediaRaw?.heroImage).trim(),
      gallery: normalizeGallery(mediaRaw?.gallery),
    },
    description: normalizeString(draft.description),
    entryLines: normalizeStringArray(draft.entryLines),
  };
}

function clearPreviewHighlights() {
  document.querySelectorAll(`[${HIGHLIGHT_ACTIVE_ATTR}="true"]`).forEach((node) => {
    node.removeAttribute(HIGHLIGHT_ACTIVE_ATTR);
  });
}

function resolveHighlightNode(target: string): HTMLElement | null {
  const selectors = HIGHLIGHT_SELECTOR_BY_TARGET[target] || [];
  for (const selector of selectors) {
    const node = document.querySelector<HTMLElement>(selector);
    if (node) return node;
  }
  return null;
}

function applyPreviewHighlight(target: string) {
  clearPreviewHighlights();
  const normalized = normalizeString(target).trim();
  if (!normalized) return;

  const node = resolveHighlightNode(normalized);
  if (!node) return;

  node.setAttribute(HIGHLIGHT_ACTIVE_ATTR, 'true');
  node.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
}

function AppRoutes({ previewDraft }: { previewDraft: WorkbenchPreviewDraft | null }) {
  const location = useLocation();
  const key = useMemo(() => location.pathname, [location.pathname]);

  return (
    <Layout>
      <PageTransition key={key}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/work" element={<Work />} />
          <Route path="/work/:slug" element={<ProjectDetail previewDraft={previewDraft} />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>
    </Layout>
  );
}

export default function App() {
  const [previewDraft, setPreviewDraft] = useState<WorkbenchPreviewDraft | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const payload = event.data as { type?: string; target?: unknown; draft?: unknown } | null;
      if (!payload || typeof payload !== 'object') return;

      if (payload.type === 'mwb:highlight-target') {
        applyPreviewHighlight(normalizeString(payload.target).trim());
        return;
      }

      if (payload.type === 'mwb:entry-draft') {
        setPreviewDraft(normalizePreviewDraft(payload.draft));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearPreviewHighlights();
    };
  }, []);

  return <AppRoutes previewDraft={previewDraft} />;
}
