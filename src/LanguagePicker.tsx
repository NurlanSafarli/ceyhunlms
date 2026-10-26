import { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { usePreferences, type Language } from './preferences';

function Flag({ language }: { language: Language }) {
  return (
    <svg viewBox="0 0 60 40" className="language-flag" aria-hidden="true">
      {language === 'az' ? (
        <>
          <path fill="#00b5e2" d="M0 0h60v14H0z" />
          <path fill="#ef3340" d="M0 13h60v14H0z" />
          <path fill="#509e2f" d="M0 27h60v13H0z" />
          <circle cx="28" cy="20" r="7" fill="white" />
          <circle cx="30" cy="20" r="5.8" fill="#ef3340" />
          <path
            fill="white"
            d="m37 15 1 3 3-1-1 3 3 1-3 1 1 3-3-1-1 3-1-3-3 1 1-3-3-1 3-1-1-3 3 1z"
            transform="translate(0 -1) scale(1 .95)"
          />
        </>
      ) : language === 'ru' ? (
        <>
          <path fill="white" d="M0 0h60v14H0z" />
          <path fill="#0039a6" d="M0 13h60v14H0z" />
          <path fill="#d52b1e" d="M0 27h60v13H0z" />
        </>
      ) : (
        <>
          <path fill="#012169" d="M0 0h60v40H0z" />
          <path stroke="white" strokeWidth="8" d="m0 0 60 40M60 0 0 40" />
          <path stroke="#c8102e" strokeWidth="3" d="m0 0 60 40M60 0 0 40" />
          <path stroke="white" strokeWidth="13" d="M30 0v40M0 20h60" />
          <path stroke="#c8102e" strokeWidth="8" d="M30 0v40M0 20h60" />
        </>
      )}
    </svg>
  );
}
const languages = [
  { code: 'az', label: 'AZ', name: 'Azərbaycan dili' },
  { code: 'en', label: 'ENG', name: 'English' },
  { code: 'ru', label: 'RU', name: 'Русский' },
] as const;
export default function LanguagePicker() {
  const { language, setLanguage, t } = usePreferences();
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false;
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  return (
    <details
      className="language-control"
      ref={ref}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.currentTarget.open = false;
          event.currentTarget.querySelector('summary')?.focus();
        }
      }}
    >
      <summary aria-label={t('Saytın dili')}>
        <Flag language={language} />
        {languages.find((item) => item.code === language)?.label}
        <ChevronDown size={12} />
      </summary>
      <div className="language-options" role="group" aria-label={t('Saytın dili')}>
        {languages.map((item) => (
          <button
            type="button"
            key={item.code}
            aria-label={item.name}
            aria-pressed={language === item.code}
            onClick={() => {
              setLanguage(item.code);
              if (ref.current) {
                ref.current.open = false;
                ref.current.querySelector('summary')?.focus();
              }
            }}
          >
            <Flag language={item.code} />
            {item.label}
          </button>
        ))}
      </div>
    </details>
  );
}
