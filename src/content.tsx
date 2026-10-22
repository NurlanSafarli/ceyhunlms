import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { courses, faqs, settings, type Course, type Faq, type Settings } from './data';

type Content = { courses: Course[]; faqs: Faq[]; settings: Settings };
const fallback: Content = { courses, faqs, settings };
const Context = createContext(fallback);
export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState(fallback);
  useEffect(() => {
    if (import.meta.env.MODE === 'pages') return;
    const controller = new AbortController();
    fetch('/api/public/content', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data.courses) && Array.isArray(data.faqs) && data.settings)
          setContent(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    document.title = `${content.settings.brandName} — IT karyerana ilk addım`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', content.settings.heroDescription);
  }, [content.settings]);
  return <Context.Provider value={content}>{children}</Context.Provider>;
}
export const useContent = () => useContext(Context);
