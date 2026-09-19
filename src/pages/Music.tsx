import { useMemo } from 'react';
import CompositionCard from '../components/CompositionCard';
import { getCompositionProjects } from '../content/projects';

function selectionOrder(project: ReturnType<typeof getCompositionProjects>[number]) {
  return project.composition?.selectedOrder ?? Number.MAX_SAFE_INTEGER;
}

export default function Music() {
  const compositions = useMemo(() => getCompositionProjects(), []);
  const selected = useMemo(() => {
    const explicitlySelected = compositions
      .filter((project) => project.composition?.selected)
      .sort((a, b) => selectionOrder(a) - selectionOrder(b));
    const chosen = [...explicitlySelected];
    for (const project of compositions) {
      if (chosen.length >= 6) break;
      if (!chosen.some((item) => item.slug === project.slug)) chosen.push(project);
    }
    return chosen.slice(0, 6);
  }, [compositions]);
  const selectedSlugs = useMemo(() => new Set(selected.map((project) => project.slug)), [selected]);
  const archive = useMemo(
    () => compositions.filter((project) => !selectedSlugs.has(project.slug)),
    [compositions, selectedSlugs],
  );

  return (
    <div className="music-page space-y-12">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.24em] text-accent">Music</p>
        <h1 className="text-3xl font-semibold">Composition and audio work</h1>
        <p className="max-w-2xl text-gray-300">
          Selected compositions and a chronological listening archive.
        </p>
      </header>

      {compositions.length > 0 ? (
        <>
          <section className="space-y-6" aria-labelledby="selected-compositions">
            <h2 id="selected-compositions" className="text-2xl font-semibold">Selected Compositions</h2>
            <div className="music-card-grid">
              {selected.map((project) => <CompositionCard key={project.slug} project={project} />)}
            </div>
          </section>

          <section className="space-y-6" aria-labelledby="all-compositions">
            <h2 id="all-compositions" className="text-2xl font-semibold">All Compositions</h2>
            {archive.length > 0 ? (
              <div className="music-card-grid music-card-grid--archive">
                {archive.map((project) => <CompositionCard key={project.slug} project={project} />)}
              </div>
            ) : <p className="text-gray-400">More compositions will appear here as the archive grows.</p>}
          </section>
        </>
      ) : (
        <section className="rounded-xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-xl font-semibold">The listening archive is being prepared.</h2>
          <p className="mt-2 text-gray-400">Composition entries will appear here when their selected excerpts are published.</p>
        </section>
      )}
    </div>
  );
}
