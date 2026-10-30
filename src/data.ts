import defaults from '../shared/default-content.json';
export type CourseId = string;
export type Course = {
  id: string;
  number: string;
  name: string;
  shortName: string;
  category: string;
  description: string;
  duration: string;
  level: string;
  tags: string[];
  prerequisites: string;
  outcome: string;
  icon: string;
  published: boolean;
  sort_order: number;
  modules: { title: string; duration: string; topics: string[]; lab: string }[];
};
export type Partner = { id: string; name: string; published: boolean; logoUrl?: string };
export type Settings = Omit<typeof defaults.settings, 'partners'> & {
  partners: Partner[];
  instructorPhotos: { id: string; url: string }[];
};
export type Faq = {
  id: string;
  question: string;
  answer: string;
  published: boolean;
  sort_order: number;
};
export const courses: Course[] = defaults.courses;
export const faqs: Faq[] = defaults.faqs;
export const settings: Settings = { ...defaults.settings, instructorPhotos: [] };
