import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="grid lg:grid-cols-3 gap-10 items-start">
      <div className="space-y-4">
        <div className="aspect-square rounded-2xl bg-gradient-to-br from-accent/40 via-black to-indigo-900/40 border border-white/10 flex items-center justify-center text-3xl font-semibold">
          Headshot
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <p className="font-semibold">Leo Nunez</p>
          <p className="text-sm text-gray-400">Technical Director & Creative Coder</p>
          <p className="text-sm text-gray-400">Based in motion, light, and live systems.</p>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-3xl font-semibold">About</h1>
        <p className="text-lg text-gray-200 leading-relaxed">
          I guide productions where technology must disappear into performance. My background spans theatre, short film, and
          experimental tools that give artists finer control over time and light.
        </p>
        <p className="text-gray-300 leading-relaxed">
          As a technical director and creative coder, I architect dependable show systems, prototype interaction, and translate
          creative needs into resilient pipelines. I thrive in rehearsal rooms, on tour, and in studios where iteration is fast
          and stakes are high.
        </p>
        <div className="flex flex-wrap gap-3">
          {['The Public Theater', 'Electric Bloom', 'Movement Lab', 'Open Signal'].map((item) => (
            <span key={item} className="px-3 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-200">
              {item}
            </span>
          ))}
        </div>
        <div className="flex gap-4">
          <a
            href="/cv.pdf"
            className="px-5 py-3 rounded-lg bg-accent text-foreground font-semibold shadow-glow"
            download
          >
            Download CV
          </a>
          <Link to="/contact" className="px-5 py-3 rounded-lg border border-white/15 hover:border-accent transition">
            Contact
          </Link>
        </div>
        <p className="text-xs text-gray-500">Note: Replace with real cv.pdf in public/</p>
      </div>
    </div>
  );
}
