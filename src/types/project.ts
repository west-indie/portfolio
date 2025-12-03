export type MediaItemType = 'image' | 'video' | 'embed';

export interface MediaItem {
  type: MediaItemType;
  src: string;
  caption?: string;
}

export interface ProjectLinks {
  github?: string;
  liveDemo?: string;
  press?: string[];
}

export interface Collaborator {
  name: string;
  role?: string;
}

export interface Project {
  slug: string;
  title: string;
  year: string;
  disciplines: string[];
  role: string;
  client?: string;
  location?: string;
  shortDescription: string;
  tags?: string[];
  featured?: boolean;
  techStack?: string[];
  collaborators?: Collaborator[];
  links?: ProjectLinks;
  media?: {
    heroImage?: string;
    gallery?: MediaItem[];
  };
  body: string;
}
