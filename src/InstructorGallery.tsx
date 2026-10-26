import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePreferences } from './preferences';
export default function InstructorGallery({
  photos,
  name,
}: {
  photos: { id: string; url: string }[];
  name: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { t } = usePreferences();
  useEffect(() => {
    setActive(0);
    if (track.current) track.current.scrollLeft = 0;
  }, [photos]);
  function go(index: number) {
    const element = track.current;
    if (!element) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollTo({ left: element.clientWidth * index, behavior: reduce ? 'auto' : 'smooth' });
  }
  return (
    <div className="instructor-gallery" role="region" aria-label={t('Müəllim qalereyası')}>
      <div
        className="gallery-track"
        ref={track}
        tabIndex={0}
        onScroll={() => {
          if (track.current)
            setActive(Math.round(track.current.scrollLeft / track.current.clientWidth));
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            go(
              Math.max(
                0,
                Math.min(photos.length - 1, active + (event.key === 'ArrowRight' ? 1 : -1)),
              ),
            );
          }
        }}
      >
        {photos.map((photo, index) => (
          <img
            key={photo.id}
            className="instructor-photo"
            src={photo.url}
            alt={`${name} — ${index + 1} / ${photos.length}`}
            loading={index === 0 ? 'eager' : 'lazy'}
          />
        ))}
      </div>
      {photos.length > 1 && (
        <div className="gallery-controls">
          <button
            type="button"
            className="gallery-arrow"
            onClick={() => go(Math.max(0, active - 1))}
            disabled={active === 0}
            aria-label={t('Əvvəlki şəkil')}
          >
            <ChevronLeft size={18} />
          </button>
          <span aria-live="polite">
            {active + 1} / {photos.length}
          </span>
          <button
            type="button"
            className="gallery-arrow"
            onClick={() => go(Math.min(photos.length - 1, active + 1))}
            disabled={active === photos.length - 1}
            aria-label={t('Növbəti şəkil')}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
