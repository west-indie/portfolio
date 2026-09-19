import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPause, FaPlay } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { resolveAssetPath } from '../lib/assetPath';
import type { Project } from '../types/project';

const PLAY_EVENT = 'portfolio:composition-play';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

type PlayerProps = {
  project: Project;
  source?: string;
  label?: string;
  large?: boolean;
};

export function CompositionAudioPlayer({ project, source, label = 'Featured excerpt', large = false }: PlayerProps) {
  const playerId = useId();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioSrc = resolveAssetPath(source);
  const imageSrc = resolveAssetPath(project.media?.heroImage);

  useEffect(() => {
    const stopForAnotherPlayer = (event: Event) => {
      const activeId = (event as CustomEvent<string>).detail;
      if (activeId === playerId) return;
      audioRef.current?.pause();
    };
    window.addEventListener(PLAY_EVENT, stopForAnotherPlayer);
    return () => window.removeEventListener(PLAY_EVENT, stopForAnotherPlayer);
  }, [playerId]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    window.dispatchEvent(new CustomEvent<string>(PLAY_EVENT, { detail: playerId }));
    await audio.play();
  };

  const seek = (nextTime: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const knownDuration = duration || 0;
  const displayDuration = knownDuration ? formatTime(knownDuration) : (project.composition?.length || '0:00');

  return (
    <div className={`composition-player${large ? ' composition-player--large' : ''}`} aria-label={`${project.title} ${label}`}>
      <div className="composition-disc-wrap">
        <div className={`composition-disc${playing ? ' is-playing' : ''}`}>
          {imageSrc ? <img src={imageSrc} alt="" loading="lazy" decoding="async" /> : <span aria-hidden="true">♪</span>}
        </div>
        <button
          type="button"
          className="composition-play-button"
          onClick={() => void togglePlayback()}
          disabled={!audioSrc}
          aria-label={`${playing ? 'Pause' : 'Play'} ${project.title} ${label}`}
        >
          {playing ? <FaPause aria-hidden="true" /> : <FaPlay aria-hidden="true" />}
        </button>
      </div>
      <div className="composition-player-controls">
        <span className="composition-player-label">{label}</span>
        <input
          type="range"
          min={0}
          max={knownDuration || 1}
          step={0.1}
          value={Math.min(currentTime, knownDuration || 1)}
          onChange={(event) => seek(Number(event.target.value))}
          disabled={!audioSrc}
          aria-label={`Seek ${project.title} ${label}`}
        />
        <span className="composition-player-time" aria-live="off">
          {formatTime(currentTime)} / {displayDuration}
        </span>
      </div>
      {audioSrc ? (
        // Musical works do not have spoken content that requires a caption track.
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onEnded={() => setPlaying(false)}
        />
      ) : null}
    </div>
  );
}

export default function CompositionCard({ project }: { project: Project }) {
  const tags = Array.isArray(project.tags) ? project.tags : [];
  return (
    <motion.article whileHover={{ y: -4 }} className="composition-card gradient-border">
      <CompositionAudioPlayer project={project} source={project.composition?.featuredExcerpt} />
      <div className="composition-card-copy">
        <div className="composition-card-heading">
          <h3><Link to={`/work/${project.slug}`}>{project.title}</Link></h3>
          <span>{project.year}</span>
        </div>
        <p>{project.shortDescription || project.subtitle}</p>
        <div className="composition-card-meta">
          {project.composition?.length ? <span>{project.composition.length}</span> : null}
          <span>{project.role}</span>
        </div>
        {tags.length > 0 ? (
          <div className="composition-card-tags">
            {tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        ) : null}
        <Link className="composition-view-link" to={`/work/${project.slug}`}>View project</Link>
      </div>
    </motion.article>
  );
}
