import { useContent } from './content';
import { usePreferences } from './preferences';
import './partners.css';

export default function Partners() {
  const { settings } = useContent();
  const { t } = usePreferences();
  const partners = (settings.partners || []).filter((item) => item.published);
  if (!settings.showPartners || (!partners.length && !settings.partnersProjectCount)) return null;
  return (
    <section
      id="partners"
      className="partners-section section-container"
      aria-labelledby="partners-title"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t('BİZƏ ETİBAR EDƏNLƏR')}</span>
          <h2 id="partners-title">{t(settings.partnersTitle)}</h2>
        </div>
        <p>{t(settings.partnersDescription)}</p>
      </div>
      <ul className="partners-grid">
        {partners.map((partner, index) => (
          <li key={partner.id}>
            <span className="partner-number" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <strong>{partner.name}</strong>
          </li>
        ))}
        {settings.partnersProjectCount && (
          <li className="partner-projects">
            <strong>{settings.partnersProjectCount}</strong>
            <span>{t(settings.partnersProjectLabel)}</span>
          </li>
        )}
      </ul>
    </section>
  );
}
