import FilmV1Layout from './FilmV1Layout';
import type { ProjectLayoutProps } from './types';

/** Scoring uses the film case-study structure with its own stable layout identity. */
export default function ScoringV1Layout(props: ProjectLayoutProps) {
  return <FilmV1Layout {...props} detailLayout="scoring_v1" layoutId="scoring_v1" />;
}
