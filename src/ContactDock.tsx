import { useEffect, useState } from 'react';
import { Phone, MessageCircle, X } from 'lucide-react';
import SocialLinks from './SocialLinks';
import { useContent } from './content';
import { usePreferences } from './preferences';

export default function ContactDock() {
  const { settings } = useContent();
  const { t } = usePreferences();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const courses = document.getElementById('courses');
      const reachedCourses =
        !!courses && courses.getBoundingClientRect().top <= window.innerHeight / 2;
      setVisible(reachedCourses);
      if (!reachedCourses) setOpen(false);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [settings.showCourses]);
  if (!visible) return null;

  return (
    <aside className={`contact-dock ${open ? 'is-open' : ''}`} aria-label={t('Sürətli əlaqə')}>
      <div className="contact-dock-links" id="contact-dock-links" hidden={!open}>
        <SocialLinks />
        {settings.phone && (
          <a
            className="social-link contact-phone"
            href={`tel:${settings.phone}`}
            aria-label={`${t('Zəng et')}: ${settings.phoneDisplay}`}
            title={t('Zəng et')}
          >
            <Phone size={22} aria-hidden="true" />
          </a>
        )}
      </div>
      <button
        type="button"
        className="contact-dock-toggle"
        aria-controls="contact-dock-links"
        aria-expanded={open}
        aria-label={t(open ? 'Əlaqə panelini bağla' : 'Əlaqə panelini aç')}
        title={t(open ? 'Əlaqə panelini bağla' : 'Əlaqə panelini aç')}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={22} aria-hidden="true" /> : <MessageCircle size={22} aria-hidden="true" />}
      </button>
    </aside>
  );
}
