import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard';
import { getFeaturedProjects } from '../content/projects';

const heroItems = [
  { id: 'title', delay: 0 },
  { id: 'subtitle', delay: 0.1 },
  { id: 'actions', delay: 0.2 }
];

const focusChips = [
  'Music & Composition',
  'Sound Design & Audio Engineering',
  'Technical Direction',
  'Lighting & Production',
  'Interactive Media',
  'Code / Tools'
];

export default function Home() {
  const featured = getFeaturedProjects();

  return (
    <div className="space-y-16">
      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          {heroItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: item.delay, duration: 0.5 }}
            >
              {item.id === 'title' && (
                <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
                  Leo Nunez – Technical Director & Creative Coder
                </h1>
              )}
              {item.id === 'subtitle' && (
                <p className="text-lg text-gray-300 leading-relaxed">
                  I build tools and lead teams where code, light, and live bodies collide — from adaptive control systems to bold
                  theatre and film environments.
                </p>
              )}
              {item.id === 'actions' && (
                <div className="flex flex-wrap gap-4">
                  <Link
                    to="/work"
                    className="px-5 py-3 rounded-lg bg-accent text-foreground font-semibold shadow-glow"
                  >
                    View Work
                  </Link>
                  <Link
                    to="/about"
                    className="px-5 py-3 rounded-lg border border-white/15 hover:border-accent transition"
                  >
                    About Leo
                  </Link>
                </div>
              )}
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-gradient-to-br from-accent/30 via-black to-indigo-900/40 rounded-2xl p-8 border border-white/10 shadow-lg"
        >
          <p className="text-sm uppercase tracking-wide text-gray-300 mb-4">Hybrid practice</p>
          <h2 className="text-2xl font-semibold mb-4">Systems thinking meets live performance.</h2>
          <p className="text-gray-300 leading-relaxed">
            Whether it is designing resilient show networks, prototyping interactive media, or crafting new tools for stage
            managers, I bridge creative vision with dependable engineering.
          </p>
        </motion.div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Featured Work</h2>
          <Link to="/work" className="text-sm underline hover:text-accent">
            View all
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {featured.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-4">What I do</h3>
        <div className="flex flex-wrap gap-3">
          {focusChips.map((chip) => (
            <motion.span
              key={chip}
              whileHover={{ y: -2 }}
              className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm"
            >
              {chip}
            </motion.span>
          ))}
        </div>
      </section>
    </div>
  );
}
