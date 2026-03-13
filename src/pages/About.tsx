import { Link } from 'react-router-dom';
import { resolveAssetPath } from '../lib/assetPath';

export default function About() {
  return (
    <div className="grid lg:grid-cols-3 gap-10 items-start">
      <div className="space-y-4">
        <img
          src={resolveAssetPath('/images/leo_headshot.jpg')}
          alt="Headshot of Leo Nunez"
          className="aspect-square w-full rounded-2xl object-cover border border-white/10"
        />
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <p className="font-semibold">Leo Nunez</p>
          <p className="text-sm text-gray-400">Technical Designer &amp; Artist</p>
          <p className="text-sm text-gray-400">Based in sound, light, and live systems.</p>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-3xl font-semibold">About</h1>
        <p className="text-lg text-gray-200 leading-relaxed">
          I guide productions where technology must disappear into performance. My background spans theatre, short film, and experimental tools that give artists finer control over time and light.
        </p>
        <p className="text-gray-300 leading-relaxed">
          As a technical director and creative coder, I architect dependable show systems, prototype interaction, and translate creative needs into resilient pipelines. I thrive in rehearsal rooms, on tour, and in studios where iteration is fast and stakes are high.
        </p>
        <div className="flex flex-wrap gap-3">
          {[
  
  
  
  
  






].map((item) => (
            <span key={item} className="px-3 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-200">
              {item}
            </span>
          ))}
        </div>
        <div className="flex gap-4">
          <a
            href={resolveAssetPath('/docs/cv.pdf')}
            className="px-5 py-3 rounded-lg bg-accent text-foreground font-semibold shadow-glow"
            download="Leo_Nunez_CV.pdf"
          >
            Download CV
          </a>
          <Link to="/contact" className="px-5 py-3 rounded-lg border border-white/15 hover:border-accent transition">
            Contact
          </Link>
        </div>
        <p className="text-xs text-gray-500"></p>
      </div>
    </div>
  );
}
