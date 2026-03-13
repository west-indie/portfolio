import type { LinkStackItem, Project } from '../../types/project';

export interface ProjectLayoutProps {
  project: Project;
  others: Project[];
  stackLinks: LinkStackItem[];
}
