import { type ComponentType, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { marked } from 'marked';
import TheatreV1Layout from '../components/project-layouts/TheatreV1Layout';
import TheatreV2Layout from '../components/project-layouts/TheatreV2Layout';
import FilmV1Layout from '../components/project-layouts/FilmV1Layout';
import GeneralV1Layout from '../components/project-layouts/GeneralV1Layout';
import CodingV1Layout from '../components/project-layouts/CodingV1Layout';
import type { ProjectLayoutProps } from '../components/project-layouts/types';
import { getAllProjects, getProjectBySlug } from '../content/projects';
import { normalizeDisciplines } from '../lib/disciplines';
import { resolveProjectLayout } from '../lib/projectLayout';
import type { LinkStackItem, Project, ProjectLayout } from '../types/project';
import type { WorkbenchPreviewDraft } from '../types/workbenchPreview';

const PROJECT_LAYOUT_COMPONENTS: Record<ProjectLayout, ComponentType<ProjectLayoutProps>> = {
  theatre_v1: TheatreV1Layout,
  theatre_v2: TheatreV2Layout,
  film_v1: FilmV1Layout,
  general_v1: GeneralV1Layout,
  codingv1: CodingV1Layout,
};

function normalizeLinkStack(value: unknown): LinkStackItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        const raw = String(item || '').trim();
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
      const title = String(next.title || '').trim();
      const url = String(next.url || '').trim();
      if (!title || !url) return null;
      return { title, url };
    })
    .filter((item): item is LinkStackItem => Boolean(item));
}

function legacyPressToLinkStack(value: unknown): LinkStackItem[] {
  const pressLinks = Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  return pressLinks.map((url, index) => ({
    title: pressLinks.length > 1 ? `Press ${index + 1}` : 'Press',
    url,
  }));
}

function legacyDirectLinksToStack(value: unknown): LinkStackItem[] {
  if (!value || typeof value !== 'object') return [];
  const source = value as Record<string, unknown>;
  const out: LinkStackItem[] = [];
  const github = String(source.github || '').trim();
  if (github) out.push({ title: 'GitHub', url: github });
  const liveDemo = String(source.liveDemo || '').trim();
  if (liveDemo) out.push({ title: 'Live Demo', url: liveDemo });
  return out;
}

function dedupeLinkStack(value: LinkStackItem[]): LinkStackItem[] {
  const out: LinkStackItem[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(value) ? value : []) {
    const title = String(item?.title || '').trim();
    const url = String(item?.url || '').trim();
    if (!title || !url) continue;
    const key = `${title.toLowerCase()}|${url.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, url });
  }
  return out;
}

function resolveStackLinks(links: Project['links'] | WorkbenchPreviewDraft['links'] | undefined): LinkStackItem[] {
  if (!links || typeof links !== 'object') return [];
  const source = links as Record<string, unknown>;
  const direct = legacyDirectLinksToStack(source);
  const stack = normalizeLinkStack(source.stack);
  const press = stack.length > 0 ? [] : legacyPressToLinkStack(source.press);
  return dedupeLinkStack([...direct, ...stack, ...press]);
}

function buildProjectFromPreviewDraft(draft: WorkbenchPreviewDraft, base?: Project): Project {
  const stack = resolveStackLinks(draft.links);
  const disciplines = normalizeDisciplines(draft.disciplines);

  return {
    slug: draft.slug.trim() || base?.slug || '',
    title: draft.title,
    subtitle: draft.subtitle,
    year: draft.year,
    month: draft.month,
    layout: draft.layout,
    category: draft.category || base?.category,
    entryLines: draft.entryLines,
    categoryMeta: draft.categoryMeta,
    disciplines,
    role: draft.role,
    client: draft.client,
    location: draft.location,
    shortDescription: draft.subtitle,
    tags: draft.tags,
    moreWork: draft.moreWork,
    hidden: draft.hidden,
    hideFromWorkPage: draft.hideFromWorkPage,
    featured: base?.featured,
    omitTechStack: draft.omitTechStack,
    omitLinkStack: draft.omitLinkStack,
    techStack: draft.techStack,
    collaborators: draft.collaborators,
    cast: draft.cast,
    links: stack.length > 0 ? { stack } : undefined,
    media: {
      heroImage: draft.media.heroImage.trim() || undefined,
      gallery: draft.media.gallery,
      featured: base?.media?.featured ?? base?.media?.placeholders,
      omitFeaturedFromGallery: base?.media?.omitFeaturedFromGallery,
    },
    body: marked.parse(draft.description || '').toString(),
  };
}

type ProjectDetailProps = {
  previewDraft: WorkbenchPreviewDraft | null;
};

export default function ProjectDetail({ previewDraft }: ProjectDetailProps) {
  const { slug } = useParams();
  const routeSlug = String(slug || '').trim();
  const savedProject = routeSlug ? getProjectBySlug(routeSlug) : undefined;

  const draftMatchesRoute = Boolean(
    previewDraft
    && String(previewDraft.slug || '').trim()
    && String(previewDraft.slug || '').trim() === routeSlug,
  );

  const project = useMemo(() => {
    if (draftMatchesRoute && previewDraft) {
      return buildProjectFromPreviewDraft(previewDraft, savedProject);
    }
    return savedProject;
  }, [draftMatchesRoute, previewDraft, savedProject]);

  const activeSlug = String(project?.slug || routeSlug || '').trim();

  const others = useMemo(() => {
    const allProjects = getAllProjects();
    const bySlug = new Map<string, Project>();
    allProjects.forEach((candidate) => {
      const candidateSlug = String(candidate.slug || '').trim();
      if (!candidateSlug || bySlug.has(candidateSlug)) return;
      bySlug.set(candidateSlug, candidate);
    });

    const selected: Project[] = [];
    const seenSlugs = new Set<string>();
    if (activeSlug) seenSlugs.add(activeSlug);

    const appendProject = (candidate: Project | undefined) => {
      if (!candidate || selected.length >= 3) return;
      const candidateSlug = String(candidate.slug || '').trim();
      if (!candidateSlug || seenSlugs.has(candidateSlug)) return;
      seenSlugs.add(candidateSlug);
      selected.push(candidate);
    };

    (project?.moreWork || []).forEach((candidateSlug) => {
      appendProject(bySlug.get(String(candidateSlug || '').trim()));
    });

    if (selected.length < 3) {
      const activeCategory = String(project?.category || '').trim().toLowerCase();
      const activeDisciplines = new Set(
        (project?.disciplines || [])
          .map((discipline) => String(discipline || '').trim().toLowerCase())
          .filter(Boolean),
      );

      allProjects
        .map((candidate, index) => {
          const candidateSlug = String(candidate.slug || '').trim();
          if (!candidateSlug || seenSlugs.has(candidateSlug)) return null;
          const candidateCategory = String(candidate.category || '').trim().toLowerCase();
          const sharedDisciplineCount = (candidate.disciplines || []).reduce((count, discipline) => (
            activeDisciplines.has(String(discipline || '').trim().toLowerCase())
              ? count + 1
              : count
          ), 0);
          const score = (activeCategory && candidateCategory === activeCategory ? 2 : 0) + sharedDisciplineCount;
          return { candidate, score, index };
        })
        .filter((entry): entry is { candidate: Project; score: number; index: number } => Boolean(entry))
        .sort((a, b) => (
          b.score - a.score
          || String(b.candidate.year || '').localeCompare(String(a.candidate.year || ''))
          || a.candidate.title.localeCompare(b.candidate.title)
          || a.index - b.index
        ))
        .forEach((entry) => appendProject(entry.candidate));
    }

    return selected.slice(0, 3);
  }, [activeSlug, project?.category, project?.disciplines, project?.moreWork]);

  const stackLinks = useMemo(() => resolveStackLinks(project?.links), [project?.links]);

  const projectPageLayout = useMemo<ProjectLayout>(
    () => resolveProjectLayout(project?.layout, project?.category),
    [project?.layout, project?.category],
  );

  if (!project || project.hidden === true) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <Link to="/work" className="underline">
          Back to work
        </Link>
      </div>
    );
  }

  const LayoutComponent = PROJECT_LAYOUT_COMPONENTS[projectPageLayout];

  return (
    <LayoutComponent
      project={project}
      others={others}
      stackLinks={stackLinks}
    />
  );
}
