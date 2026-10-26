import {
  createContext,
  useContext,
  useState,
  useEffect,
  cloneElement,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from 'react';
import en from './locales/en.json';
import ru from './locales/ru.json';
export type Language = 'az' | 'en' | 'ru';
type Theme = 'light' | 'dark';
const dictionaries: Record<string, Record<string, string>> = { en, ru };
function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Preferences still work without storage. */
  }
}
const Context = createContext({
  language: 'az' as Language,
  setLanguage: (_language: Language) => {},
  theme: 'light' as Theme,
  toggleTheme: () => {},
  t: (text: string) => text,
});
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const value = stored('jayhun-language');
    return value === 'en' || value === 'ru' ? value : 'az';
  });
  const [theme, setTheme] = useState<Theme>(() =>
    stored('jayhun-theme') === 'dark' ? 'dark' : 'light',
  );
  useEffect(() => {
    document.documentElement.lang = language;
    save('jayhun-language', language);
  }, [language]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    save('jayhun-theme', theme);
  }, [theme]);
  function t(text: string): string {
    if (language === 'az') return text;
    const dict = dictionaries[language];
    const exact = dict[text] || dict[text.trim()] || dict[text.replace(/\s+/g, ' ').trim()];
    if (exact) return text.startsWith(' ') ? ` ${exact}` : exact;
    return text;
  }
  return (
    <Context.Provider
      value={{
        language,
        setLanguage,
        theme,
        toggleTheme: () => setTheme((value) => (value === 'light' ? 'dark' : 'light')),
        t,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const usePreferences = () => useContext(Context);
// Translate rendered text and accessible labels, never IDs, form values, URLs or user input.
export function useLocalizedView() {
  const { t } = usePreferences();
  function localize(node: ReactNode): ReactNode {
    if (typeof node === 'string') return t(node);
    if (Array.isArray(node)) return node.map(localize);
    if (!isValidElement(node)) return node;
    const element = node as ReactElement<Record<string, unknown>>;
    const props: Record<string, unknown> = {};
    if (typeof element.type === 'string') {
      for (const key of ['title', 'placeholder', 'aria-label'])
        if (typeof element.props[key] === 'string') props[key] = t(element.props[key] as string);
    }
    if ('children' in element.props) props.children = localize(element.props.children as ReactNode);
    return cloneElement(element, props);
  }
  return localize;
}
