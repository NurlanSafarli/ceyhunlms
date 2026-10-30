import { useState } from 'react';
import { Layers3, ShieldCheck, Network, Server, Camera, Terminal, Pause, Play } from 'lucide-react';
import { usePreferences } from './preferences';
import './technology-strip.css';

const technologies = [
  { name: 'Windows', mark: 'windows' },
  { name: 'Linux', asset: 'linux' },
  { name: 'Cisco', asset: 'cisco' },
  { name: 'Active Directory', icon: Layers3 },
  { name: 'VMware', asset: 'vmware' },
  { name: 'PowerShell', icon: Terminal },
  { name: 'HPE', detail: 'Gen 9 / 10 / 11', asset: 'hpe' },
  { name: 'TP-Link', asset: 'tplink' },
  { name: 'Aruba', asset: 'aruba' },
  { name: 'Omada', asset: 'omada' },
  { name: 'PLANET', detail: 'VR-300', icon: Network },
  { name: 'VPN Tunnel', icon: ShieldCheck },
  { name: 'Pritunl', asset: 'pritunl' },
  { name: 'Hikvision', asset: 'hikvision' },
  { name: 'Windows Server', mark: 'windows' },
  { name: 'Dahua', icon: Camera },
  { name: 'HiWatch', icon: Camera },
];
export default function TechnologyStrip() {
  const { t } = usePreferences();
  const [paused, setPaused] = useState(false);
  return (
    <section className="technology-strip" aria-label={t('Texnologiyalar')}>
      <div className="section-container technology-heading">
        <span>{t('İŞLƏDİYİMİZ TEXNOLOGİYALAR')}</span>
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-label={t(paused ? 'Hərəkəti davam etdir' : 'Hərəkəti dayandır')}
          aria-pressed={paused}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
      </div>
      <div className={`technology-window${paused ? ' is-paused' : ''}`}>
        <div className="technology-track">
          {[0, 1].map((copy) => (
            <ul className="technology-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
              {technologies.map(({ name, detail, mark, asset, icon: Icon }) => (
                <li key={name}>
                  {asset ? (
                    <img
                      src={`${import.meta.env.BASE_URL}brands/${asset}.svg`}
                      width="28"
                      height="28"
                      alt=""
                    />
                  ) : mark === 'windows' ? (
                    <span className="technology-windows" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                  ) : mark === 'hpe' ? (
                    <span className="technology-hpe" aria-hidden="true" />
                  ) : Icon ? (
                    <Icon size={26} aria-hidden="true" />
                  ) : (
                    <Server size={26} aria-hidden="true" />
                  )}
                  <span
                    className={`technology-name brand-${name.toLowerCase().replaceAll(' ', '-')}`}
                  >
                    {name}
                    {detail && <small>{detail}</small>}
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
