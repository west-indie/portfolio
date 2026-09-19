export type MediaItemType = 'image' | 'video' | 'embed';
export type ProjectLayout = 'general_v1' | 'composition_v1' | 'film_v1' | 'theatre_v2' | 'coding_v2' | 'scoring_v1';

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

export interface CompositionCredit {
  label: string;
  value: string;
}

export interface CompositionDetails {
  length?: string;
  about?: string;
  arrangementNotes?: string;
  featuredExcerpt?: string;
  fullAudio?: string;
  selected?: boolean;
  selectedOrder?: number;
  imageCredit?: string;
  imageSubject?: string;
  imageNote?: string;
  instrumentation?: string[];
  credits?: CompositionCredit[];
}

export interface Project {
  slug: string;
  title: string;
  subtitle: string;
  year: string;
  month?: string;
  layout: ProjectLayout;
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
  omitWorkflow?: boolean;
  composition?: CompositionDetails;
  techStack?: string[];
  collaborators?: Collaborator[];
  cast?: Collaborator[];
  links?: ProjectLinks;
  media?: {
    heroImage?: string;
    heroFit?: 'width' | 'height';
    gallery?: MediaItem[];
    featured?: MediaItem[];
    // Legacy alias retained while older entries are migrated to featured.
    placeholders?: MediaItem[];
    omitFeaturedFromGallery?: boolean;
  };
  body: string;
}
