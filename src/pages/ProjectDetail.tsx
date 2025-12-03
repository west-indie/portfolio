import { Link, useParams } from 'react-router-dom';
import { getAllProjects, getProjectBySlug } from '../content/projects';
import { disciplineLabels } from '../config';
import type { MediaItem } from '../types/project';

function renderMedia(item: MediaItem) {
  if (item.type === 'image') {
    return <img src={item.src} alt={item.caption ?? ''} className="w-full rounded-lg border border-white/10" />;
  }
  if (item.type === 'video') {
    return (
      <video controls className="w-full rounded-lg border border-white/10">
        <source src={item.src} />
        <track kind="captions" label="Captions" src="/captions-placeholder.vtt" />
      </video>
    );
  }
  if (item.type === 'embed') {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/10">
        <iframe src={item.src} title={item.caption ?? 'Embedded media'} className="w-full h-full" allowFullScreen />
      </div>
    );
  }
  return null;
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const project = slug ? getProjectBySlug(slug) : undefined;
  const others = getAllProjects().filter((p) => p.slug !== slug).slice(0, 3);

  if (!project) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <Link to="/work" className="underline">
          Back to work
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <p className="text-sm text-gray-400">{project.year}</p>
        <h1 className="text-3xl font-semibold">{project.title}</h1>
        <p className="text-gray-300">
          {project.role} • {project.disciplines.map((d) => disciplineLabels[d] ?? d).join(' • ')}
        </p>
        {(project.client || project.location) && (
          <p className="text-gray-400 text-sm">
            {[project.client, project.location].filter(Boolean).join(' — ')}
          </p>
        )}
      </header>

      {project.media?.heroImage && (
        <img
          src={project.media.heroImage}
          alt={project.title}
          className="w-full rounded-2xl border border-white/10 shadow-lg"
        />
      )}

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div
            className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-gray-200"
            dangerouslySetInnerHTML={{ __html: project.body }}
          />

          {project.media?.gallery && project.media.gallery.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Media</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {project.media.gallery.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    {renderMedia(item)}
                    {item.caption && <p className="text-sm text-gray-400">{item.caption}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4 p-6 rounded-xl border border-white/10 bg-white/5">
          <div>
            <h3 className="font-semibold mb-2">Role</h3>
            <p className="text-gray-300">{project.role}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Disciplines</h3>
            <div className="flex flex-wrap gap-2">
              {project.disciplines.map((d) => (
                <span key={d} className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm">
                  {disciplineLabels[d] ?? d}
                </span>
              ))}
            </div>
          </div>
          {project.techStack && (
            <div>
              <h3 className="font-semibold mb-2">Tech</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                {project.techStack.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {project.collaborators && (
            <div>
              <h3 className="font-semibold mb-2">Collaborators</h3>
              <ul className="space-y-1 text-gray-300">
                {project.collaborators.map((c) => (
                  <li key={c.name}>
                    {c.name}
                    {c.role ? ` — ${c.role}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {project.links && (
            <div className="space-y-2">
              <h3 className="font-semibold">Links</h3>
              <div className="flex flex-col gap-2 text-accent">
                {project.links.github && (
                  <a href={project.links.github} className="underline">
                    GitHub
                  </a>
                )}
                {project.links.liveDemo && (
                  <a href={project.links.liveDemo} className="underline">
                    Live Demo
                  </a>
                )}
                {project.links.press?.map((p) => (
                  <a key={p} href={p} className="underline">
                    Press
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {others.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xl font-semibold">More work</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {others.map((project) => (
              <ProjectLink key={project.slug} slug={project.slug} title={project.title} role={project.role} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProjectLink({ slug, title, role }: { slug: string; title: string; role: string }) {
  return (
    <Link
      to={`/work/${slug}`}
      className="block p-4 rounded-lg border border-white/10 hover:border-accent transition"
    >
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-gray-400">{role}</p>
    </Link>
  );
}
