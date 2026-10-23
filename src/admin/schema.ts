export type Row = Record<string, any>;
export type Collection =
  | 'registrations'
  | 'courses'
  | 'groups'
  | 'materials'
  | 'exams'
  | 'results'
  | 'faqs';
export type Section = Collection | 'dashboard' | 'settings';
export type Field = {
  key: string;
  label: string;
  type?: 'url' | 'text' | 'textarea' | 'select' | 'number' | 'date' | 'datetime-local' | 'checkbox';
  required?: boolean;
  options?: [string, string][];
  source?: 'courses' | 'groups' | 'students' | 'exams';
  max?: number;
  min?: number;
  wide?: boolean;
  help?: string;
};
export const labels: Record<string, string> = {
  new: 'Yeni',
  contacted: 'Əlaqə saxlanılıb',
  enrolled: 'Təhsil alır',
  completed: 'Tamamlanıb',
  cancelled: 'Ləğv edilib',
  planned: 'Planlaşdırılır',
  active: 'Aktiv',
  archived: 'Arxiv',
  scheduled: 'Planlaşdırılıb',
  graded: 'Qiymətləndirilib',
  absent: 'İştirak etməyib',
  passed: 'Keçib',
  failed: 'Keçməyib',
  online: 'Onlayn',
  'in-person': 'Əyani',
  hybrid: 'Hibrid',
  either: 'Fərq etmir',
  beginner: 'Başlanğıc',
  basic: 'Baza bilikləri',
  working: 'IT mütəxəssisi',
  document: 'Sənəd',
  link: 'Link',
  video: 'Video',
  note: 'Qeyd',
  website: 'Saytdan',
  manual: 'Əl ilə',
};
const options = (...ids: string[]): [string, string][] => ids.map((id) => [id, labels[id] || id]);
export const definitions: Record<
  Collection,
  { title: string; singular: string; description: string; fields: Field[]; defaults: Row }
> = {
  registrations: {
    title: 'Müraciətlər və tələbələr',
    singular: 'Tələbə',
    description: 'Yeni müraciətlərdən məzuniyyətə qədər bütün tələbələr bir yerdə.',
    defaults: {
      name: '',
      email: '',
      phone: '',
      course: '',
      experience: 'beginner',
      format: 'online',
      status: 'new',
      message: '',
      admin_note: '',
    },
    fields: [
      { key: 'name', label: 'Ad və soyad', required: true },
      { key: 'email', label: 'E-poçt', required: true },
      { key: 'phone', label: 'Telefon', required: true },
      { key: 'course', label: 'Kurs', type: 'select', source: 'courses', required: true },
      {
        key: 'experience',
        label: 'Bilik səviyyəsi',
        type: 'select',
        options: options('beginner', 'basic', 'working'),
      },
      {
        key: 'format',
        label: 'Dərs formatı',
        type: 'select',
        options: options('online', 'in-person', 'either'),
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: options('new', 'contacted', 'enrolled', 'completed', 'cancelled'),
      },
      { key: 'message', label: 'Tələbənin qeydi', type: 'textarea', wide: true, max: 1500 },
      {
        key: 'admin_note',
        label: 'Daxili qeyd',
        type: 'textarea',
        wide: true,
        help: 'Yalnız admin paneldə görünür.',
      },
    ],
  },
  courses: {
    title: 'Kurslar və sillabus',
    singular: 'Kurs',
    description: 'Tədris istiqamətlərini, modulları və saytda görünməsini idarə edin.',
    defaults: {
      id: '',
      name: '',
      shortName: '',
      number: '',
      category: '',
      description: '',
      duration: '',
      level: 'Başlanğıc',
      icon: 'help-desk',
      tags: [],
      prerequisites: '',
      outcome: '',
      modules: [],
      published: true,
      sort_order: 0,
    },
    fields: [
      { key: 'name', label: 'Kursun adı', required: true },
      {
        key: 'id',
        label: 'Kurs kodu',
        required: true,
        help: 'Unikal kod: məsələn, linux-basics. Yaradıldıqdan sonra dəyişmir.',
      },
      { key: 'shortName', label: 'Qısa ad' },
      { key: 'number', label: 'Göstərilən nömrə' },
      { key: 'category', label: 'Üst başlıq', wide: true },
      { key: 'description', label: 'Kurs haqqında', type: 'textarea', wide: true },
      { key: 'duration', label: 'Müddət', required: true },
      { key: 'level', label: 'Səviyyə', required: true },
      {
        key: 'icon',
        label: 'İkon',
        type: 'select',
        options: [
          ['help-desk', 'Help Desk'],
          ['system-admin', 'Server'],
          ['network-admin', 'Şəbəkə'],
        ],
      },
      { key: 'sort_order', label: 'Sıralama', type: 'number', min: 0, max: 9999 },
      { key: 'tags', label: 'Texnologiyalar (hər sətirdə biri)', type: 'textarea', wide: true },
      { key: 'prerequisites', label: 'İlkin biliklər', type: 'textarea', wide: true },
      { key: 'outcome', label: 'Kursun sonunda', type: 'textarea', wide: true },
      { key: 'published', label: 'Saytda yayımlansın', type: 'checkbox', wide: true },
    ],
  },
  groups: {
    title: 'Dərs qrupları',
    singular: 'Qrup',
    description: 'Dərs cədvəli, qrup tutumu və tələbə siyahılarını təşkil edin.',
    defaults: {
      name: '',
      course_id: '',
      start_date: '',
      end_date: '',
      schedule: '',
      format: 'online',
      capacity: 15,
      status: 'planned',
      notes: '',
    },
    fields: [
      { key: 'name', label: 'Qrupun adı', required: true },
      { key: 'course_id', label: 'Kurs', type: 'select', source: 'courses', required: true },
      { key: 'start_date', label: 'Başlama tarixi', type: 'date' },
      { key: 'end_date', label: 'Bitmə tarixi', type: 'date' },
      {
        key: 'schedule',
        label: 'Dərs cədvəli',
        wide: true,
        help: 'Məsələn: bazar ertəsi və cümə axşamı, 19:00–21:00',
      },
      {
        key: 'format',
        label: 'Format',
        type: 'select',
        options: options('online', 'in-person', 'hybrid'),
      },
      {
        key: 'capacity',
        label: 'Maksimum tələbə sayı',
        type: 'number',
        min: 1,
        max: 500,
        required: true,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: options('planned', 'active', 'completed', 'archived'),
      },
      { key: 'notes', label: 'Qeydlər', type: 'textarea', wide: true },
    ],
  },
  materials: {
    title: 'Tədris vəsaitləri',
    singular: 'Vəsait',
    description: 'Qruplar üçün sənədlər, video keçidləri və dərs qeydləri.',
    defaults: { title: '', group_id: '', type: 'document', url: '', content: '' },
    fields: [
      { key: 'title', label: 'Vəsaitin adı', required: true },
      {
        key: 'group_id',
        label: 'Qrup',
        type: 'select',
        source: 'groups',
        help: 'Boş buraxıldıqda ümumi kitabxanada saxlanılır.',
      },
      {
        key: 'type',
        label: 'Vəsaitin növü',
        type: 'select',
        options: options('document', 'link', 'video', 'note'),
      },
      { key: 'url', label: 'Link (http / https)', wide: true },
      { key: 'content', label: 'Məzmun və ya izah', type: 'textarea', wide: true, max: 20000 },
    ],
  },
  exams: {
    title: 'İmtahan təqvimi',
    singular: 'İmtahan',
    description: 'Qruplar üzrə imtahan tarixlərini və qiymətləndirmə qaydalarını planlaşdırın.',
    defaults: {
      title: '',
      group_id: '',
      scheduled_at: '',
      duration: 60,
      max_score: 100,
      pass_score: 60,
      location: '',
      status: 'scheduled',
      notes: '',
    },
    fields: [
      { key: 'title', label: 'İmtahanın adı', required: true },
      { key: 'group_id', label: 'Qrup', type: 'select', source: 'groups', required: true },
      {
        key: 'scheduled_at',
        label: 'Tarix və saat (Bakı, UTC+4)',
        type: 'datetime-local',
        required: true,
      },
      {
        key: 'duration',
        label: 'Müddət (dəqiqə)',
        type: 'number',
        min: 1,
        max: 1440,
        required: true,
      },
      {
        key: 'max_score',
        label: 'Maksimum bal',
        type: 'number',
        min: 1,
        max: 10000,
        required: true,
      },
      {
        key: 'pass_score',
        label: 'Keçid balı',
        type: 'number',
        min: 0,
        max: 10000,
        required: true,
      },
      { key: 'location', label: 'Məkan və ya görüş linki', wide: true },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: options('scheduled', 'completed', 'cancelled'),
      },
      { key: 'notes', label: 'Təlimatlar', type: 'textarea', wide: true },
    ],
  },
  results: {
    title: 'İmtahan nəticələri',
    singular: 'Nəticə',
    description: 'Tələbələrin ballarını və fərdi geribildirimləri qeyd edin.',
    defaults: { exam_id: '', registration_id: '', score: 0, status: 'graded', feedback: '' },
    fields: [
      { key: 'exam_id', label: 'İmtahan', type: 'select', source: 'exams', required: true },
      {
        key: 'registration_id',
        label: 'Tələbə',
        type: 'select',
        source: 'students',
        required: true,
        help: 'Yalnız imtahanın aid olduğu qrupun tələbələri göstərilir.',
      },
      { key: 'status', label: 'İştirak', type: 'select', options: options('graded', 'absent') },
      { key: 'score', label: 'Toplanan bal', type: 'number', min: 0, max: 10000 },
      { key: 'feedback', label: 'Geribildirim', type: 'textarea', wide: true },
    ],
  },
  faqs: {
    title: 'Tez-tez verilən suallar',
    singular: 'Sual',
    description: 'Saytda görünən sualları və cavabları yeniləyin.',
    defaults: { question: '', answer: '', published: true, sort_order: 0 },
    fields: [
      { key: 'question', label: 'Sual', required: true, wide: true, max: 500 },
      { key: 'answer', label: 'Cavab', type: 'textarea', required: true, wide: true, max: 6000 },
      { key: 'sort_order', label: 'Sıralama', type: 'number', min: 0, max: 9999 },
      { key: 'published', label: 'Saytda yayımlansın', type: 'checkbox' },
    ],
  },
};
export const settingsSections: { title: string; description: string; fields: Field[] }[] = [
  {
    title: 'Brend və əlaqə',
    description: 'Saytın əsas məlumatları',
    fields: [
      { key: 'brandName', label: 'Brendin adı', required: true },
      { key: 'phone', label: 'Telefon (beynəlxalq format)', required: true },
      { key: 'phoneDisplay', label: 'Saytda görünən telefon', required: true },
      { key: 'footerDescription', label: 'Alt hissənin mətni', type: 'textarea' },
    ],
  },
  {
    title: 'Sosial şəbəkələr',
    description: 'Tam HTTPS linkini daxil edin. Boş saxlanılan linkin ikonu saytda gizlənir.',
    fields: [
      {
        key: 'whatsappUrl',
        label: 'WhatsApp linki',
        type: 'url',
        help: 'Məsələn: https://wa.me/994513019525',
      },
      {
        key: 'linkedinUrl',
        label: 'LinkedIn linki',
        type: 'url',
        help: 'Şəxsi və ya şirkət profilinizin linki',
      },
      {
        key: 'instagramUrl',
        label: 'Instagram linki',
        type: 'url',
        help: 'Instagram profilinizin linki',
      },
    ],
  },
  {
    title: 'Ana səhifənin giriş hissəsi',
    description: 'İlk təəssüratı yaradan başlıq və təqdimat',
    fields: [
      { key: 'heroBadge', label: 'Kiçik üst başlıq' },
      { key: 'heroLine1', label: 'Başlıq — 1-ci sətir' },
      { key: 'heroLine2', label: 'Başlıq — vurğulu sətir' },
      { key: 'heroLine3', label: 'Başlıq — son sətir' },
      { key: 'heroDescription', label: 'Təqdimat mətni', type: 'textarea', wide: true },
    ],
  },
  {
    title: 'Müəllim haqqında',
    description: 'Şəxsi təqdimat və tədris yanaşması',
    fields: [
      { key: 'instructorName', label: 'Müəllimin adı', required: true },
      { key: 'instructorRole', label: 'Vəzifə və ya təqdimat' },
      { key: 'aboutTitle', label: 'Başlıq' },
      { key: 'aboutSubtitle', label: 'Alt başlıq', type: 'textarea' },
      { key: 'bio1', label: 'Təqdimat — 1-ci abzas', type: 'textarea', wide: true },
      { key: 'bio2', label: 'Təqdimat — 2-ci abzas', type: 'textarea', wide: true },
      { key: 'aboutValues', label: 'Üstünlüklər (hər sətirdə biri)', type: 'textarea', wide: true },
    ],
  },
  {
    title: 'Bölmə mətnləri',
    description: 'Kurslar, sillabus və qeydiyyat',
    fields: [
      { key: 'coursesTitle', label: 'Kurslar başlığı' },
      { key: 'coursesDescription', label: 'Kurslar izahı', type: 'textarea' },
      { key: 'syllabusTitle', label: 'Sillabus başlığı' },
      { key: 'registrationTitle', label: 'Qeydiyyat başlığı' },
      { key: 'registrationDescription', label: 'Qeydiyyat izahı', type: 'textarea', wide: true },
    ],
  },
  {
    title: 'Tədris prosesi',
    description: 'Dörd addımlı öyrənmə yanaşması',
    fields: [
      { key: 'processTitle', label: 'Bölmənin başlığı' },
      { key: 'processDescription', label: 'Bölmənin izahı', type: 'textarea' },
      ...[1, 2, 3, 4].flatMap((i) => [
        { key: `step${i}Title`, label: `Addım ${i} — başlıq` },
        { key: `step${i}Description`, label: `Addım ${i} — izah`, type: 'textarea' as const },
      ]),
    ],
  },
  {
    title: 'Bölmələrin görünməsi',
    description: 'Bölməni gizlətmək onun məlumatlarını silmir',
    fields: [
      { key: 'showAbout', label: 'Haqqımda', type: 'checkbox' },
      { key: 'showCourses', label: 'Kurslar', type: 'checkbox' },
      { key: 'showSyllabus', label: 'Sillabus', type: 'checkbox' },
      { key: 'showProcess', label: 'Tədris prosesi', type: 'checkbox' },
      { key: 'showRegistration', label: 'Qeydiyyat', type: 'checkbox' },
      { key: 'showFaq', label: 'Suallar', type: 'checkbox' },
    ],
  },
];
export const formatDate = (value: string) => {
  if (!value) return '—';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Baku',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(value))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}.${parts.month}.${parts.year}${value.includes('T') ? `, ${parts.hour}:${parts.minute}` : ''}`;
};
export const toLocalDate = (value: string) =>
  value ? new Date(new Date(value).getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16) : '';
