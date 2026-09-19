import { Link } from 'react-router-dom';
import { CompositionAudioPlayer } from '../CompositionCard';
import { formatDisciplineLabel } from '../../config';
import { resolveAssetPath } from '../../lib/assetPath';
import type { ProjectLayoutProps } from './types';

function relatedProjectLabel(category: string | undefined) {
  if (category === 'short-film' || category === 'feature-film' || category === 'film') return 'View film project';
  if (category === 'performance' || category === 'theatre') return 'View theatre project';
  if (category === 'composition' || category === 'music') return 'View complete score';
  return 'View project';
}

export default function CompositionV1Layout({ project, others, stackLinks }: ProjectLayoutProps) {
  const composition = project.composition || {};
  const fullSource = composition.fullAudio || composition.featuredExcerpt;
  const imageSrc = resolveAssetPath(project.media?.heroImage);

  return (
    <div className="composition-project space-y-10" data-project-layout="composition_v1">
      <header className="composition-project-header">
        <div className="space-y-3">
          <p className="text-sm text-gray-400">{project.year}</p>
          <h1 className="text-4xl font-semibold">{project.title}</h1>
          <p className="max-w-2xl text-lg text-gray-300">{project.shortDescription || project.subtitle}</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm">{project.role}</span>
            {composition.length ? <span className="rounded-full bg-white/10 px-3 py-1 text-sm">{composition.length}</span> : null}
            {(project.tags || []).map((tag) => <span key={tag} className="rounded-full bg-accent/10 px-3 py-1 text-sm text-accent">{tag}</span>)}
          </div>
        </div>
      </header>

      <section className="space-y-4" aria-labelledby="full-composition-heading">
        <h2 id="full-composition-heading" className="text-2xl font-semibold">Full Composition</h2>
        <CompositionAudioPlayer project={project} source={fullSource} label="Full composition" large />
      </section>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {composition.about ? <section className="space-y-3"><h2 className="text-2xl font-semibold">About the Piece</h2><p className="whitespace-pre-line leading-relaxed text-gray-200">{composition.about}</p></section> : null}
          {composition.arrangementNotes ? <section className="space-y-3"><h2 className="text-2xl font-semibold">Composition / Arrangement</h2><p className="whitespace-pre-line leading-relaxed text-gray-200">{composition.arrangementNotes}</p></section> : null}
          <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-gray-200" dangerouslySetInnerHTML={{ __html: project.body }} />

          {imageSrc ? (
            <section className="space-y-4" aria-labelledby="visual-reference-heading">
              <h2 id="visual-reference-heading" className="text-2xl font-semibold">Visual Reference</h2>
              <figure className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <img src={imageSrc} alt={composition.imageSubject || project.title} className="max-h-[36rem] w-full object-contain" />
                {(composition.imageCredit || composition.imageSubject || composition.imageNote) ? (
                  <figcaption className="space-y-2 border-t border-white/10 p-5 text-sm text-gray-300">
                    {composition.imageSubject ? <p>{composition.imageSubject}</p> : null}
                    {composition.imageNote ? <p><strong className="text-white">Image Note:</strong> {composition.imageNote}</p> : null}
                    {composition.imageCredit ? <p className="text-gray-400">Image credit: {composition.imageCredit}</p> : null}
                  </figcaption>
                ) : null}
              </figure>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6 rounded-xl border border-white/10 bg-white/5 p-6">
          <div><h2 className="font-semibold">Role</h2><p className="mt-1 text-gray-300">{project.role}</p></div>
          {composition.instrumentation && composition.instrumentation.length > 0 ? (
            <div><h2 className="font-semibold">Instrumentation</h2><p className="mt-1 text-gray-300">{composition.instrumentation.join(' · ')}</p></div>
          ) : null}
          {composition.credits && composition.credits.length > 0 ? (
            <div><h2 className="font-semibold">Credits</h2><dl className="mt-2 space-y-2 text-sm">{composition.credits.map((credit) => <div key={`${credit.label}:${credit.value}`}><dt className="text-gray-400">{credit.label}</dt><dd>{credit.value}</dd></div>)}</dl></div>
          ) : null}
          <div><h2 className="font-semibold">Disciplines</h2><div className="mt-2 flex flex-wrap gap-2">{project.disciplines.map((discipline) => <span key={discipline} className="rounded-full bg-accent/10 px-3 py-1 text-sm text-accent">{formatDisciplineLabel(discipline) || discipline}</span>)}</div></div>
          {stackLinks.length > 0 ? <div className="space-y-2">{stackLinks.map((link) => <a key={`${link.title}:${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-white/15 px-4 py-2 text-center">{link.title}</a>)}</div> : null}
        </aside>
      </div>

      {others.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Related Project</h2>
          <div className="grid gap-4 md:grid-cols-3">{others.map((related) => <Link key={related.slug} to={`/work/${related.slug}`} className="rounded-lg border border-white/10 p-4 hover:border-accent"><strong>{related.title}</strong><span className="mt-1 block text-sm text-gray-400">{relatedProjectLabel(related.category)}</span></Link>)}</div>
        </section>
      ) : null}
    </div>
  );
}
