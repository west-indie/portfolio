import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Project } from '../types/project';
import { disciplineLabels } from '../config';

interface Props {
  project: Project;
}

export default function ProjectCard({ project }: Props) {
  const { slug, title, role, year, disciplines, shortDescription, media } = project;
  const image = media?.heroImage;

  return (
    <motion.div whileHover={{ y: -6 }} className="h-full">
      <Link
        to={`/work/${slug}`}
        className="block h-full bg-white/5 rounded-xl overflow-hidden gradient-border transition-shadow hover:shadow-glow"
      >
        <div className="aspect-video bg-gradient-to-br from-accent/20 via-black to-indigo-700/30">
          {image ? (
            <img src={image} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-foreground/70">
              {title}
            </div>
          )}
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <span className="text-sm text-gray-400">{year}</span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{shortDescription}</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-foreground">{role}</span>
            {disciplines.map((d) => (
              <span key={d} className="px-2 py-1 text-xs rounded-full bg-accent/10 text-accent">
                {disciplineLabels[d] ?? d}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
