import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import DisciplineFilter from '../components/DisciplineFilter';
import ProjectCard from '../components/ProjectCard';
import { disciplineDefinitions, disciplineLabels, disciplinesOrdered, projectGroupDefinitions, projectGroupLabels, workPageSettings } from '../config';
import { getWorkProjects } from '../content/projects';
import { resolveProjectLayout } from '../lib/projectLayout';

const DISCIPLINE_CHIP_PREFIX = 'discipline:';
const PROJECT_GROUP_CHIP_PREFIX = 'group:';

function resolveProjectGroupToken(layout: string) {
  if (layout === 'codingv1') return 'codingv1';
  if (layout === 'film_v1') return 'film_v1';
  if (layout === 'theatre_v1' || layout === 'theatre_v2') return 'theatre_v2';
  return '';
}

function normalizeChipId(value: string) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';

  if (raw.startsWith(DISCIPLINE_CHIP_PREFIX)) {
    const token = raw.slice(DISCIPLINE_CHIP_PREFIX.length).trim();
    return token ? `${DISCIPLINE_CHIP_PREFIX}${token}` : '';
  }

  if (raw.startsWith(PROJECT_GROUP_CHIP_PREFIX)) {
    const token = raw.slice(PROJECT_GROUP_CHIP_PREFIX.length).trim();
    return token ? `${PROJECT_GROUP_CHIP_PREFIX}${token}` : '';
  }

  return '';
}

export default function Work() {
  const projects = useMemo(() => getWorkProjects(), []);
  const [filter, setFilter] = useState<string>('all');

  const hiddenDisciplineTokenSet = useMemo(() => {
    const hidden = new Set(
      (Array.isArray(workPageSettings.hiddenDisciplineTokens) ? workPageSettings.hiddenDisciplineTokens : [])
        .map((token) => String(token || '').trim().toLowerCase())
        .filter(Boolean),
    );

    if (workPageSettings.showDisciplineFilter === false && hidden.size < 1) {
      disciplineDefinitions.forEach((item) => {
        const token = String(item?.token || '').trim().toLowerCase();
        if (token) hidden.add(token);
      });
    }

    return hidden;
  }, []);

  const visibleDisciplineFilterOptions = useMemo(() => {
    return disciplinesOrdered
      .filter((token) => token !== 'all' && !hiddenDisciplineTokenSet.has(token));
  }, [hiddenDisciplineTokenSet]);

  const hiddenProjectGroupTokenSet = useMemo(() => new Set(
    (Array.isArray(workPageSettings.hiddenProjectGroupTokens) ? workPageSettings.hiddenProjectGroupTokens : [])
      .map((token) => String(token || '').trim().toLowerCase())
      .filter(Boolean),
  ), []);

  const visibleProjectGroupOptions = useMemo(() => {
    const seen = new Set<string>();

    projects.forEach((project) => {
      const layout = resolveProjectLayout(project.layout, project.category);
      const group = resolveProjectGroupToken(layout);
      if (!group || hiddenProjectGroupTokenSet.has(group) || seen.has(group)) return;
      seen.add(group);
    });

    return projectGroupDefinitions
      .map((item) => item.token)
      .filter((token) => seen.has(token));
  }, [hiddenProjectGroupTokenSet, projects]);

  const orderedWorkChipOptions = useMemo(() => {
    const availableChips = [
      ...visibleDisciplineFilterOptions.map((token) => `${DISCIPLINE_CHIP_PREFIX}${token}`),
      ...visibleProjectGroupOptions.map((token) => `${PROJECT_GROUP_CHIP_PREFIX}${token}`),
    ];
    const availableChipSet = new Set(availableChips);
    const ordered: string[] = [];
    const seen = new Set<string>();

    (Array.isArray(workPageSettings.chipOrder) ? workPageSettings.chipOrder : []).forEach((rawChip) => {
      const normalized = normalizeChipId(rawChip);
      if (!normalized || !availableChipSet.has(normalized) || seen.has(normalized)) return;
      seen.add(normalized);
      ordered.push(normalized);
    });

    availableChips.forEach((chip) => {
      if (seen.has(chip)) return;
      seen.add(chip);
      ordered.push(chip);
    });

    return ordered;
  }, [visibleDisciplineFilterOptions, visibleProjectGroupOptions]);

  const visibleFilterOptions = useMemo(
    () => ['all', ...orderedWorkChipOptions],
    [orderedWorkChipOptions],
  );

  const filterLabels = useMemo(() => {
    const labels: Record<string, string> = {};

    visibleDisciplineFilterOptions.forEach((token) => {
      labels[`${DISCIPLINE_CHIP_PREFIX}${token}`] = disciplineLabels[token] ?? token;
    });
    visibleProjectGroupOptions.forEach((token) => {
      labels[`${PROJECT_GROUP_CHIP_PREFIX}${token}`] = projectGroupLabels[token] ?? token;
    });

    return labels;
  }, [visibleDisciplineFilterOptions, visibleProjectGroupOptions]);

  useEffect(() => {
    if (!visibleFilterOptions.includes(filter)) {
      setFilter('all');
    }
  }, [filter, visibleFilterOptions]);

  const filtered = useMemo(() => {
    if (filter === 'all') return projects;

    if (filter.startsWith(DISCIPLINE_CHIP_PREFIX)) {
      const disciplineToken = filter.slice(DISCIPLINE_CHIP_PREFIX.length).trim();
      if (!disciplineToken) return projects;
      return projects.filter((project) => project.disciplines?.includes(disciplineToken));
    }

    if (filter.startsWith(PROJECT_GROUP_CHIP_PREFIX)) {
      const groupToken = filter.slice(PROJECT_GROUP_CHIP_PREFIX.length).trim();
      if (!groupToken) return projects;
      return projects.filter((project) => {
        const layout = resolveProjectLayout(project.layout, project.category);
        return resolveProjectGroupToken(layout) === groupToken;
      });
    }

    return projects;
  }, [filter, projects]);

  const showFilter = orderedWorkChipOptions.length > 0;

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="uppercase tracking-wide text-sm text-gray-400">Portfolio</p>
        <h1 className="text-3xl font-semibold">Work</h1>
        <p className="text-gray-300 max-w-2xl">
          Sound and lighting direction, experimental design, and control systems. I design the connective tissue between technology and immersive experiences.
        </p>
      </header>

      {showFilter ? (
        <DisciplineFilter
          active={filter}
          onChange={setFilter}
          options={visibleFilterOptions}
          labels={filterLabels}
          allLabel="All Work"
        />
      ) : null}

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
                <ProjectCard project={project} showTags={false} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </div>
  );
}
