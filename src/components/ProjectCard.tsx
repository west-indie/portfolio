import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Project } from '../types/project';
import { formatCategoryLabel, formatDisciplineLabel } from '../config';
import { resolveAssetPath } from '../lib/assetPath';
import { MAX_PROJECT_CARD_DISCIPLINES } from '../lib/disciplines';

interface Props {
  project: Project;
  showTags?: boolean;
}

export default function ProjectCard({ project, showTags = true }: Props) {
  const { slug, title, subtitle, category, role, year, disciplines, media, entryLines, tags } = project;
  const image = media?.heroImage;
  const imageSrc = resolveAssetPath(image);
  const leadLine = Array.isArray(entryLines) ? entryLines.find((line) => String(line || '').trim()) : '';
  const categoryLabel = formatCategoryLabel(category);

  return (
    <motion.div whileHover={{ y: -6 }} className="h-full">
      <Link
        to={`/work/${slug}`}
        className="block h-full bg-white/5 rounded-xl overflow-hidden gradient-border transition-shadow hover:shadow-glow"
      >
        <div className="relative aspect-video bg-gradient-to-br from-accent/20 via-black to-indigo-700/30">
          {imageSrc ? (
            <img src={imageSrc} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-foreground/70">
              {title}
            </div>
          )}
          {categoryLabel ? (
            <span className="absolute bottom-3 left-3 rounded-full border border-accent/55 bg-black/70 px-3 py-1 text-[11px] font-semibold tracking-wide text-accent backdrop-blur-sm shadow-[0_0_18px_rgba(124,58,237,0.22)]">
              {categoryLabel}
            </span>
          ) : null}
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <span className="text-sm text-gray-400">{year}</span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">{subtitle}</p>
          {leadLine ? <p className="text-xs text-gray-400">{leadLine}</p> : null}
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-foreground">{role}</span>
            {disciplines.slice(0, MAX_PROJECT_CARD_DISCIPLINES).map((d) => (
              <span key={d} className="px-2 py-1 text-xs rounded-full bg-accent/10 text-accent">
                {formatDisciplineLabel(d) || d}
              </span>
            ))}
            {showTags
              ? (Array.isArray(tags) ? tags : []).slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-1 text-xs rounded-full border border-white/10 bg-white/5 text-gray-300">
                    {tag}
                  </span>
                ))
              : null}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
