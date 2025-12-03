import { motion } from 'framer-motion';
import { disciplineLabels, disciplinesOrdered } from '../config';

interface Props {
  active: string;
  onChange: (value: string) => void;
}

export default function DisciplineFilter({ active, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 mb-8">
      {disciplinesOrdered.map((key) => (
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
          {disciplineLabels[key] ?? key}
        </motion.button>
      ))}
    </div>
  );
}
