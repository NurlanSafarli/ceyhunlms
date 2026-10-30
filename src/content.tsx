import { apiUrl, publicAssetUrl, staticOnly } from './api';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePreferences } from './preferences';
import { courses, faqs, settings, type Course, type Faq, type Settings } from './data';

type Content = { courses: Course[]; faqs: Faq[]; settings: Settings };
const fallback: Content = { courses, faqs, settings };
const Context = createContext(fallback);
export function ContentProvider({ children }: { children: ReactNode }) {
  const { t, language } = usePreferences();
  const [content, setContent] = useState(fallback);
  useEffect(() => {
    if (staticOnly) return;
    const controller = new AbortController();
    fetch(apiUrl('/api/public/content'), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data.courses) && Array.isArray(data.faqs) && data.settings)
          setContent({
            ...data,
            settings: {
              ...settings,
              ...data.settings,
              logoUrl: publicAssetUrl(data.settings.logoUrl || ''),
              instructorPhotoUrl: publicAssetUrl(data.settings.instructorPhotoUrl || ''),
              instructorPhotos: (data.settings.instructorPhotos || []).map(
                (photo: { id: string; url: string }) => ({
                  ...photo,
                  url: publicAssetUrl(photo.url),
                }),
              ),
            },
          });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    document.title = `${content.settings.brandName} — ${t('IT karyerana ilk addım')}`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t(content.settings.heroDescription));
  }, [content.settings, language]);
  return <Context.Provider value={content}>{children}</Context.Provider>;
}
export const useContent = () => useContext(Context);
