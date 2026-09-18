import type { Collaborator, LinkStackItem, MediaItem, ProjectLayout } from './project';

export interface WorkbenchPreviewDraft {
  slug: string;
  title: string;
  subtitle: string;
  year: string;
  month: string;
  layout?: ProjectLayout;
  category: string;
  categoryMeta: Record<string, string>;
  role: string;
  client: string;
  location: string;
  tags: string[];
  disciplines: string[];
  moreWork: string[];
  hidden: boolean;
  hideFromWorkPage: boolean;
  omitTechStack: boolean;
  omitLinkStack: boolean;
  omitWorkflow: boolean;
  techStack: string[];
  collaborators: Collaborator[];
  cast: Collaborator[];
  links: {
    stack: LinkStackItem[];
  };
  media: {
    heroImage: string;
    heroFit: 'width' | 'height';
    gallery: MediaItem[];
    featured: MediaItem[];
    omitFeaturedFromGallery: boolean;
  };
  description: string;
  entryLines: string[];
}
