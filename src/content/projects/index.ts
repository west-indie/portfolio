import matter from 'gray-matter';
import { marked } from 'marked';
import type { Project } from '../../types/project';

const projectFiles = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true });

function normalizeProject(raw: string): Project {
  const { data, content } = matter(raw);
  const body = marked.parse(content).toString();

  const project: Project = {
    slug: data.slug ?? '',
    title: data.title ?? 'Untitled',
    year: data.year ?? '—',
    disciplines: Array.isArray(data.disciplines) ? data.disciplines : [],
    role: data.role ?? 'Artist',
    client: data.client,
    location: data.location,
    shortDescription: data.shortDescription ?? '',
    tags: data.tags,
    featured: Boolean(data.featured),
    techStack: data.techStack,
    collaborators: data.collaborators,
    links: data.links,
    media: data.media,
    body
  };

  return project;
}

const projects: Project[] = Object.values(projectFiles)
  .map((raw) => normalizeProject(raw as string))
  .filter((p) => p.slug)
  .sort((a, b) => (b.year ?? '').localeCompare(a.year ?? '') || a.title.localeCompare(b.title));

export function getAllProjects(): Project[] {
  return projects;
}

export function getFeaturedProjects(): Project[] {
  return projects.filter((p) => p.featured);
}

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getDisciplines(): string[] {
  const set = new Set<string>();
  projects.forEach((p) => p.disciplines?.forEach((d) => set.add(d)));
  return Array.from(set);
}
