import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  formatCategoryLabel,
  formatDisciplineLabel,
  resolveCategoryDetailEntries,
} from '../../config';
import { resolveAssetPath } from '../../lib/assetPath';
import type { MediaItem } from '../../types/project';
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
        <track kind="captions" label="Captions" src={resolveAssetPath('/captions-placeholder.vtt')} />
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

export default function CodingV2Layout({
  project,
  others,
  stackLinks,
}: ProjectLayoutProps) {
  const ribbonRef = useRef<HTMLDivElement | null>(null);
  const [activeImage, setActiveImage] = useState<{ src: string; alt: string } | null>(null);
  const [isRibbonScrolling, setIsRibbonScrolling] = useState(false);
  const [ribbonMarker, setRibbonMarker] = useState<RibbonMarkerState>({
    hasOverflow: false,
    offset: 0,
    thumbWidth: 100,
  });
  const categoryLabel = formatCategoryLabel(project.category);
  const categoryDetails = useMemo(
    () => resolveCategoryDetailEntries(project.category, project.categoryMeta, project.entryLines),
    [project.category, project.categoryMeta, project.entryLines],
  );
  const sidebarDetails = useMemo(() => {
    if (categoryDetails.some((entry) => entry.label.toLowerCase() === 'type')) {
      return categoryDetails;
    }
    return categoryLabel
      ? [{ label: 'Type', value: categoryLabel }, ...categoryDetails]
      : categoryDetails;
  }, [categoryDetails, categoryLabel]);
  const projectContext = [...new Set(
    [project.client, project.location]
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  )].join(' - ');

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
  }, [project.media]);

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

      {sidebarDetails.map((entry) => (
        <div key={`${entry.label}:${entry.value}`} data-mwb-highlight-id="category-meta">
          <h3 className="font-semibold mb-2">{entry.label}</h3>
          <p className="text-gray-300">{entry.value}</p>
        </div>
      ))}

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
    <div className="space-y-6" data-project-layout="codingv2">
      <header className="space-y-3">
        <p className="text-sm text-gray-400" data-mwb-highlight-id="year">
          {project.year}
        </p>

        <div className="grid gap-5 lg:grid-cols-3 lg:gap-10">
          <div className="space-y-3 lg:col-span-2">
            <h1 className="text-3xl font-semibold" data-mwb-highlight-id="title">
              {project.title}
            </h1>

            <p className="text-gray-300" data-mwb-highlight-id="subtitle">
              {project.subtitle}
            </p>

            <p className="text-gray-300">
              {[project.role, categoryLabel].filter(Boolean).join(' \u2022 ')}
            </p>

            {projectContext ? (
              <p className="text-gray-400 text-sm" data-mwb-highlight-id="location">
                {projectContext}
              </p>
            ) : null}
          </div>

          {!project.omitLinkStack ? (
            <div
              className="grid grid-cols-1 gap-3 self-start sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
              data-mwb-highlight-id="links"
            >
              {hasLinks ? (
                stackLinks.map((link) => {
                  const isDownload = /download/i.test(link.title) || /\.zip(?:$|[?#])/i.test(link.url);
                  return (
                    <a
                      key={`${link.title}:${link.url}`}
                      href={link.url}
                      className={isDownload
                        ? 'inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-center font-semibold text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background'
                        : 'inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-center font-semibold text-white transition hover:border-accent hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background'}
                      data-mwb-highlight-id="links-stack"
                      download={isDownload ? '' : undefined}
                      target={isDownload ? undefined : '_blank'}
                      rel={isDownload ? undefined : 'noreferrer'}
                      aria-label={`${link.title}${isDownload ? '' : ' (opens in a new tab)'}`}
                    >
                      {link.title}
                    </a>
                  );
                })
              ) : (
                <>
                  <button
                    type="button"
                    disabled
                    className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-center font-semibold text-white opacity-50"
                    title="Download will be available when the first release is published."
                  >
                    Download for Windows (.zip)
                  </button>
                  <button
                    type="button"
                    disabled
                    className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-center font-semibold text-white opacity-50"
                    title="Source code will be available when the repository is published."
                  >
                    View source
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
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
