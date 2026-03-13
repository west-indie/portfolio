import { motion } from 'framer-motion';
import { disciplineLabels, disciplinesOrdered } from '../config';

interface Props {
  active: string;
  onChange: (value: string) => void;
  options?: string[];
  labels?: Record<string, string>;
  allLabel?: string;
  className?: string;
}

export default function DisciplineFilter({
  active,
  onChange,
  options = disciplinesOrdered,
  labels,
  allLabel = 'All',
  className = 'flex flex-wrap gap-3 mb-8',
}: Props) {
  const safeOptions = Array.isArray(options) && options.length > 0 ? options : ['all'];

  return (
    <div className={className}>
      {safeOptions.map((key) => (
        <motion.button
          key={key}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onChange(key)}
          className={`px-3 py-2 rounded-full border transition ${
            active === key
              ? 'bg-accent text-foreground border-accent'
              : 'border-white/10 text-gray-300 hover:border-accent/60'
          }`}
        >
          {key === 'all' ? allLabel : (labels?.[key] ?? disciplineLabels[key] ?? key)}
        </motion.button>
      ))}
    </div>
  );
}
