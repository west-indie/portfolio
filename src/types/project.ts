export type MediaItemType = 'image' | 'video' | 'embed';
export type ProjectLayout = 'theatre_v1' | 'theatre_v2' | 'film_v1' | 'general_v1' | 'codingv1';

export interface MediaItem {
  type: MediaItemType;
  src: string;
  caption?: string;
}

export interface LinkStackItem {
  title: string;
  url: string;
}

export interface ProjectLinks {
  stack?: LinkStackItem[];
  // Legacy alias kept for backwards compatibility with older frontmatter.
  press?: string[];
}

export interface Collaborator {
  name: string;
  role?: string;
}

export interface Project {
  slug: string;
  title: string;
  subtitle: string;
  year: string;
  month?: string;
  layout?: ProjectLayout;
  category?: string;
  entryLines?: string[];
  categoryMeta?: Record<string, string>;
  disciplines: string[];
  role: string;
  client?: string;
  location?: string;
  shortDescription: string;
  tags?: string[];
  moreWork?: string[];
  hidden?: boolean;
  hideFromWorkPage?: boolean;
  featured?: boolean;
  featuredOrder?: number;
  omitTechStack?: boolean;
  omitLinkStack?: boolean;
  techStack?: string[];
  collaborators?: Collaborator[];
  cast?: Collaborator[];
  links?: ProjectLinks;
  media?: {
    heroImage?: string;
    gallery?: MediaItem[];
    featured?: MediaItem[];
    omitFeaturedFromGallery?: boolean;
  };
  body: string;
}
