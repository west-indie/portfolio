import { useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import DisciplineFilter from '../components/DisciplineFilter';
import ProjectCard from '../components/ProjectCard';
import { getAllProjects } from '../content/projects';

export default function Work() {
  const projects = useMemo(() => getAllProjects(), []);
  const [filter, setFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return projects;
    return projects.filter((p) => p.disciplines?.includes(filter));
  }, [filter, projects]);

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="uppercase tracking-wide text-sm text-gray-400">Portfolio</p>
        <h1 className="text-3xl font-semibold">Work</h1>
        <p className="text-gray-300 max-w-2xl">
          Control systems, theatre and lighting direction, and experimental media. I build the connective tissue between
          technology and live performance.
        </p>
      </header>

      <DisciplineFilter active={filter} onChange={setFilter} />

      <LayoutGroup>
        <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filtered.map((project) => (
              <motion.div
                layout
                key={project.slug}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <ProjectCard project={project} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
