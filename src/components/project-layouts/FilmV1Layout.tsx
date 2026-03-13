import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCategoryLabel, formatDisciplineLabel, resolveLayoutDetailEntries } from '../../config';
import { resolveAssetPath } from '../../lib/assetPath';
import type { MediaItem, ProjectLayout } from '../../types/project';
import type { ProjectLayoutProps } from './types';

type DisplayMediaItem = MediaItem & {
  isHero?: boolean;
  key: string;
};

type RibbonMarkerState = {
  hasOverflow: boolean;
  offset: number;
  thumbWidth: number;
};

function renderMedia(item: MediaItem, imageAlt?: string) {
  const src = resolveAssetPath(item.src);
  if (item.type === 'image') {
    return (
      <img
        src={src}
        alt={imageAlt ?? item.caption ?? ''}
        className="block h-full w-auto max-w-none cursor-zoom-in"
        loading="lazy"
      />
    );
  }
  if (item.type === 'video') {
    return (
      <video controls className="block h-full w-auto max-w-none bg-black">
        <source src={src} />
        <track kind="captions" label="Captions" src="/captions-placeholder.vtt" />
      </video>
    );
  }
  if (item.type === 'embed') {
    return <iframe src={src} title={item.caption ?? 'Embedded media'} className="h-full w-full" allowFullScreen loading="lazy" />;
  }
  return null;
}

function renderFeaturedMedia(item: MediaItem, imageAlt?: string) {
  const src = resolveAssetPath(item.src);
  if (item.type === 'image') {
    return (
      <img
        src={src}
        alt={imageAlt ?? item.caption ?? ''}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    );
  }
  if (item.type === 'video') {
    return (
      <video controls className="h-full w-full object-cover bg-black">
        <source src={src} />
        <track kind="captions" label="Captions" src="/captions-placeholder.vtt" />
      </video>
    );
  }
  if (item.type === 'embed') {
    return <iframe src={src} title={item.caption ?? 'Embedded media'} className="h-full w-full" allowFullScreen loading="lazy" />;
  }
  return null;
}

function extractFilenameNumber(src: string): number | null {
  const sanitized = String(src || '').trim().split(/[?#]/)[0] || '';
  const fileName = sanitized.split('/').pop() || '';
  const stem = fileName.replace(/\.[^./]+$/, '');
  const match = stem.match(/(\d+)(?!.*\d)/);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortGalleryByFilenameNumber(items: MediaItem[]): MediaItem[] {
  return [...items]
    .map((item, index) => ({
      item,
      index,
      src: item.src,
      number: extractFilenameNumber(item.src),
    }))
    .sort((a, b) => {
      if (a.number != null && b.number != null && a.number !== b.number) {
        return a.number - b.number;
      }
      if (a.number != null && b.number == null) return -1;
      if (a.number == null && b.number != null) return 1;
      if (a.src !== b.src) return a.src.localeCompare(b.src);
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

type FilmV1LayoutOptions = {
  detailLayout?: ProjectLayout;
  layoutId?: ProjectLayout;
};

type FilmV1LayoutProps = ProjectLayoutProps & FilmV1LayoutOptions;

export default function FilmV1Layout({
  project,
  others,
  stackLinks,
  detailLayout = 'film_v1',
  layoutId = 'film_v1',
}: FilmV1LayoutProps) {
  const ribbonRef = useRef<HTMLDivElement | null>(null);
  const [activeImage, setActiveImage] = useState<{ src: string; alt: string } | null>(null);
  const [isRibbonScrolling, setIsRibbonScrolling] = useState(false);
  const [ribbonMarker, setRibbonMarker] = useState<RibbonMarkerState>({
    hasOverflow: false,
    offset: 0,
    thumbWidth: 100,
  });
  const categoryLabel = formatCategoryLabel(project.category);
  const categoryDetailEntries = useMemo(
    () => resolveLayoutDetailEntries(detailLayout, project.categoryMeta, project.entryLines),
    [detailLayout, project.categoryMeta, project.entryLines],
  );

  const mergedMedia = useMemo<DisplayMediaItem[]>(() => {
    if (!project.media) return [];

    const merged: DisplayMediaItem[] = [];
    const seen = new Set<string>();
    const featuredSrcSet = new Set(
      (Array.isArray(project.media.featured)
        ? project.media.featured
        : (Array.isArray(project.media.placeholders) ? project.media.placeholders : []))
        .map((item) => String(item?.src || '').trim())
        .filter(Boolean),
    );

    const pushMedia = (item: MediaItem, isHero = false) => {
      const src = String(item.src || '').trim();
      if (!src) return;
      const key = `${item.type}:${src}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push({
        ...item,
        src,
        caption: item.caption ? String(item.caption).trim() : undefined,
        isHero,
        key,
      });
    };

    if (project.media.heroImage) {
      pushMedia({ type: 'image', src: project.media.heroImage }, true);
    }

    const sortedGallery = Array.isArray(project.media.gallery)
      ? sortGalleryByFilenameNumber(project.media.gallery)
      : [];
    const filteredGallery = project.media.omitFeaturedFromGallery
      ? sortedGallery.filter((item) => !featuredSrcSet.has(String(item.src || '').trim()))
      : sortedGallery;
    filteredGallery.forEach((item) => pushMedia(item));

    return merged;
  }, [
    project.media,
    project.media?.heroImage,
    project.media?.gallery,
    project.media?.featured,
    project.media?.placeholders,
    project.media?.omitFeaturedFromGallery,
  ]);

  const featuredMedia = useMemo<MediaItem[]>(() => {
    const featured = Array.isArray(project.media?.featured)
      ? project.media.featured
      : (Array.isArray(project.media?.placeholders) ? project.media.placeholders : []);

    return featured
      .map((item) => {
        const src = String(item?.src || '').trim();
        if (!src) return null;
        const type = item.type === 'video' || item.type === 'embed' || item.type === 'image'
          ? item.type
          : 'image';
        return {
          type,
          src,
          ...(item.caption ? { caption: String(item.caption).trim() } : {}),
        };
      })
      .filter((item): item is MediaItem => Boolean(item))
      .slice(0, 2);
  }, [project.media?.featured, project.media?.placeholders]);

  useEffect(() => {
    if (!activeImage) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeImage]);

  useEffect(() => {
    const ribbon = ribbonRef.current;
    if (!ribbon) return undefined;

    let frameId = 0;
    let markerHideTimeoutId = 0;

    const syncRibbonMarker = () => {
      const clientWidth = ribbon.clientWidth;
      const scrollWidth = ribbon.scrollWidth;
      const scrollLeft = ribbon.scrollLeft;
      const hasOverflow = scrollWidth - clientWidth > 1;

      if (!hasOverflow) {
        setRibbonMarker({
          hasOverflow: false,
          offset: 0,
          thumbWidth: 100,
        });
        return;
      }

      const visibleRatio = clientWidth / scrollWidth;
      const thumbWidth = Math.min(100, Math.max(16, visibleRatio * 100));
      const maxScroll = scrollWidth - clientWidth;
      const maxOffset = 100 - thumbWidth;
      const atStart = scrollLeft <= 1;
      const atEnd = scrollLeft + clientWidth >= scrollWidth - 1;
      const rawProgress = maxScroll > 0 ? (scrollLeft / maxScroll) : 0;
      const progress = atStart ? 0 : (atEnd ? 1 : Math.min(1, Math.max(0, rawProgress)));
      const offset = progress * maxOffset;

      setRibbonMarker({
        hasOverflow: true,
        offset,
        thumbWidth,
      });
    };

    const requestSync = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(syncRibbonMarker);
    };

    const handleScroll = () => {
      requestSync();
      setIsRibbonScrolling(true);
      if (markerHideTimeoutId) window.clearTimeout(markerHideTimeoutId);
      markerHideTimeoutId = window.setTimeout(() => {
        setIsRibbonScrolling(false);
      }, 180);
    };

    requestSync();

    ribbon.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', requestSync);

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(requestSync);
      observer.observe(ribbon);
      const content = ribbon.firstElementChild;
      if (content instanceof HTMLElement) observer.observe(content);
    }

    const delayedSyncId = window.setTimeout(requestSync, 300);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (markerHideTimeoutId) window.clearTimeout(markerHideTimeoutId);
      window.clearTimeout(delayedSyncId);
      ribbon.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', requestSync);
      observer?.disconnect();
    };
  }, [mergedMedia.length, project.slug]);

  const hasLinks = !project.omitLinkStack && stackLinks.length > 0;

  const detailAside = (
    <aside className="space-y-4 p-6 rounded-xl border border-white/10 bg-white/5">
      <div data-mwb-highlight-id="role">
        <h3 className="font-semibold mb-2">Role</h3>
        <p className="text-gray-300">{project.role}</p>
      </div>

      <div data-mwb-highlight-id="disciplines">
        <h3 className="font-semibold mb-2">Disciplines</h3>
        <div className="flex flex-wrap gap-2">
          {project.disciplines.map((discipline) => (
            <span key={discipline} className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm">
              {formatDisciplineLabel(discipline) || discipline}
            </span>
          ))}
        </div>
      </div>

      {!project.omitTechStack && project.techStack && project.techStack.length > 0 ? (
        <div data-mwb-highlight-id="tech-stack">
          <h3 className="font-semibold mb-2">Tech</h3>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            {project.techStack.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {categoryDetailEntries.length > 0 ? (
        <div className="space-y-3" data-mwb-highlight-id="entry-lines">
          {categoryDetailEntries.map((entry, index) => (
            <div key={`${entry.label}:${index}`}>
              <h3 className="font-semibold">{entry.label}</h3>
              <p className="mt-1 text-gray-300 whitespace-pre-line">{entry.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {project.collaborators && project.collaborators.length > 0 ? (
        <div data-mwb-highlight-id="collaborators">
          <h3 className="font-semibold mb-2">Collaborators</h3>
          <ul className="space-y-1 text-gray-300">
            {project.collaborators.map((collaborator) => (
              <li key={collaborator.name}>
                {collaborator.name}
                {collaborator.role ? ` - ${collaborator.role}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {project.cast && project.cast.length > 0 ? (
        <div data-mwb-highlight-id="cast">
          <h3 className="font-semibold mb-2">Cast</h3>
          <ul className="space-y-1 text-gray-300">
            {project.cast.map((member) => (
              <li key={`${member.name}:${member.role || ''}`}>
                {member.name}
                {member.role ? ` - ${member.role}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasLinks ? (
        <div className="space-y-2" data-mwb-highlight-id="links">
          <h3 className="font-semibold">Links</h3>
          <div className="flex flex-col gap-2 text-accent">
            {stackLinks.map((link) => (
              <a key={`${link.title}:${link.url}`} href={link.url} className="underline" data-mwb-highlight-id="links-stack">
                {link.title}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );

  const ribbonItems = (
    <div className="flex h-full min-w-max items-stretch gap-0">
      {mergedMedia.map((item) => (
        <figure
          key={item.key}
          className={`media-ribbon-item relative flex-none h-full overflow-hidden ${item.type === 'embed' ? 'aspect-video' : ''}`}
          data-mwb-highlight-id={item.isHero ? 'hero-image' : undefined}
        >
          {item.type === 'image' ? (
            <button
              type="button"
              className="block h-full w-auto border-0 bg-transparent p-0"
              onClick={() => setActiveImage({
                src: resolveAssetPath(item.src),
                alt: item.isHero ? project.title : (item.caption ?? project.title),
              })}
            >
              {renderMedia(item, item.isHero ? project.title : undefined)}
            </button>
          ) : (
            renderMedia(item, item.isHero ? project.title : undefined)
          )}

          {item.caption ? (
            <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 py-2 text-sm text-gray-200">
              {item.caption}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );

  return (
    <div className="space-y-6" data-project-layout={layoutId}>
      <header className="space-y-3">
        <p className="text-sm text-gray-400" data-mwb-highlight-id="year">
          {project.year}
        </p>

        <h1 className="text-3xl font-semibold" data-mwb-highlight-id="title">
          {project.title}
        </h1>

        <p className="text-gray-300" data-mwb-highlight-id="subtitle">
          {project.subtitle}
        </p>

        <p className="text-gray-300">
          {[project.role, categoryLabel].filter(Boolean).join(' \u2022 ')}
        </p>

        {(project.client || project.location) ? (
          <p className="text-gray-400 text-sm" data-mwb-highlight-id="location">
            {[project.client, project.location].filter(Boolean).join(' - ')}
          </p>
        ) : null}
      </header>

      {mergedMedia.length > 0 ? (
        <div className="media-ribbon-shell" data-mwb-highlight-id="gallery">
          {ribbonMarker.hasOverflow ? (
            <div className={`media-ribbon-marker${isRibbonScrolling ? ' is-active' : ''}`} aria-hidden="true">
              <div className="media-ribbon-marker-track">
                <span
                  className="media-ribbon-marker-thumb"
                  style={{
                    width: `${ribbonMarker.thumbWidth}%`,
                    left: `${ribbonMarker.offset}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          <div
            ref={ribbonRef}
            className="media-ribbon h-96 overflow-x-auto overflow-y-hidden scroll-smooth"
          >
            {ribbonItems}
          </div>
        </div>
      ) : null}

      <div className="grid lg:grid-cols-3 gap-10 items-start">
        <div className="lg:col-span-2 space-y-8">
          <div
            className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-gray-200"
            dangerouslySetInnerHTML={{ __html: project.body }}
            data-mwb-highlight-id="description"
          />

          <section aria-label="Featured media">
            <div className="grid sm:grid-cols-2 gap-3">
              {[0, 1].map((featuredIndex) => {
                const featured = featuredMedia[featuredIndex];
                const articleClassName = featured
                  ? 'group aspect-[4/3] overflow-hidden rounded-lg border border-white/20 bg-black/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/80 hover:ring-2 hover:ring-accent/45 focus-within:-translate-y-0.5 focus-within:border-accent/80 focus-within:ring-2 focus-within:ring-accent/45'
                  : 'aspect-[4/3] rounded-lg border border-dashed border-white/20 bg-white/[0.03]';

                return (
                  <article
                    key={`featured-${featuredIndex}`}
                    aria-label={`Featured media ${featuredIndex + 1}`}
                    className={articleClassName}
                  >
                    {featured ? (
                      featured.type === 'image' ? (
                        <button
                          type="button"
                          className="block h-full w-full border-0 bg-transparent p-0"
                          onClick={() => setActiveImage({
                            src: resolveAssetPath(featured.src),
                            alt: featured.caption ?? project.title,
                          })}
                        >
                          {renderFeaturedMedia(featured, featured.caption ?? project.title)}
                        </button>
                      ) : (
                        renderFeaturedMedia(featured, featured.caption ?? project.title)
                      )
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        {detailAside}
      </div>

      {others.length > 0 ? (
        <section className="space-y-4">
          <h3 className="text-xl font-semibold">Related work</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {others.map((otherProject) => (
              <ProjectLink
                key={otherProject.slug}
                slug={otherProject.slug}
                title={otherProject.title}
                role={otherProject.role}
              />
            ))}
          </div>
        </section>
      ) : null}

      {activeImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 cursor-zoom-out"
          role="button"
          tabIndex={0}
          aria-label="Close image preview"
          onClick={() => setActiveImage(null)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setActiveImage(null);
            }
          }}
        >
          <img
            src={activeImage.src}
            alt={activeImage.alt}
            className="max-h-[94vh] max-w-[94vw] object-contain"
          />
        </div>
      ) : null}
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
