import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Code2,
  Command,
  Headphones,
  Layers3,
  Menu,
  MessageCircle,
  Network,
  Play,
  Plus,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Users,
  X,
} from 'lucide-react';
import { type CourseId } from './data';
import { useContent } from './content';
import SocialLinks from './SocialLinks';

const pagesMode = import.meta.env.MODE === 'pages';
const courseIcons: Record<string, typeof Headphones> = {
  'help-desk': Headphones,
  'system-admin': Server,
  'network-admin': Network,
};

function Brand({ light = false }: { light?: boolean }) {
  const { settings } = useContent();
  return (
    <a
      className={`brand ${light ? 'brand-light' : ''}`}
      href="#home"
      aria-label={`${settings.brandName} — ana səhifə`}
    >
      <span className="brand-symbol">
        <Code2 size={23} strokeWidth={2.5} />
      </span>
      <span>
        {settings.brandName}
        <span className="brand-dot">.</span>
      </span>
    </a>
  );
}

function LabVisual() {
  return (
    <div
      className="lab-visual"
      role="img"
      aria-label="Kompüter, server və şəbəkəni birləşdirən praktiki IT laboratoriyası"
    >
      <div className="lab-topline">
        <span>
          <span className="live-dot" /> JAYHUN LAB
        </span>
        <span>LEARN. BUILD. REPEAT.</span>
      </div>
      <div className="lab-orbit orbit-one" />
      <div className="lab-orbit orbit-two" />
      <div className="lab-label label-top">
        <span className="tiny-square" /> NƏZƏRİYYƏ + PRAKTİKA
      </div>
      <svg className="lab-connectors" viewBox="0 0 550 430" fill="none" aria-hidden="true">
        <path
          d="M155 144 H275 V265 H426"
          stroke="#8ea9d1"
          strokeWidth="1.5"
          strokeDasharray="5 7"
        />
        <path d="M150 321 H275 V265" stroke="#8ea9d1" strokeWidth="1.5" strokeDasharray="5 7" />
        <circle cx="275" cy="265" r="5" fill="#b8ccf4" />
        <circle cx="275" cy="144" r="4" fill="#b8ccf4" />
      </svg>
      <div className="floating-label label-network">
        <Network size={15} />
        <span>192.168.1.1</span>
        <span className="live-dot" />
      </div>
      <div className="lab-monitor">
        <div className="monitor-frame">
          <div className="terminal-bar">
            <div>
              <i />
              <i />
              <i />
            </div>
            <span>your-first-lab.sh</span>
            <Terminal size={12} />
          </div>
          <div className="terminal-content">
            <span className="terminal-comment">// hər şey bir addımla başlayır</span>
            <p>
              <span className="terminal-prompt">➜</span> start your_it_journey
            </p>
            <div className="terminal-line">
              <Check size={13} /> Biliklər yüklənir...
            </div>
            <div className="terminal-line">
              <Check size={13} /> Bacarıqlar inkişaf edir...
            </div>
            <div className="terminal-line">
              <Check size={13} /> Gələcək qurulur...
            </div>
            <p className="terminal-ready">
              Sən hazırsan
              <span className="cursor-block" />
            </p>
          </div>
        </div>
        <div className="monitor-neck" />
        <div className="monitor-foot" />
      </div>
      <div className="lab-server">
        <div className="server-top">
          <Server size={17} />
          <span>SERVER_01</span>
        </div>
        {[0, 1, 2].map((i) => (
          <div className="server-slot" key={i}>
            <span />
            <div className="server-lights">
              <i />
              <i />
            </div>
          </div>
        ))}
        <div className="server-bottom">
          <span className="live-dot" /> SYSTEM ONLINE
        </div>
      </div>
      <div className="lab-switch">
        <div className="switch-icon">
          <Network size={20} />
        </div>
        <span>CONNECTED</span>
        <div className="switch-ports">
          {[0, 1, 2, 3].map((i) => (
            <i key={i} />
          ))}
        </div>
      </div>
      <div className="lab-caption">
        <span className="caption-icon">
          <Command size={18} />
        </span>
        <span>
          Sadəcə öyrənmə.
          <br />
          <strong>Özün qur.</strong>
        </span>
        <ArrowUpRight size={23} />
      </div>
      <span className="lab-coordinates">40.4093° N &nbsp; 49.8671° E</span>
    </div>
  );
}

function PrivacyDialog({ onClose }: { onClose: () => void }) {
  const { settings } = useContent();
  const contact = { phone: settings.phone, display: settings.phoneDisplay };
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      className="privacy-dialog"
      ref={ref}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button className="dialog-close icon-button" onClick={onClose} aria-label="Pəncərəni bağla">
        <X size={21} />
      </button>
      <span className="eyebrow">ŞƏXSİ MƏLUMATLAR</span>
      <h2 id={titleId}>Məxfilik haqqında</h2>
      <p>
        Adınız, e-poçtunuz, telefon nömrəniz və kurs seçimləriniz yalnız müraciətinizi
        cavablandırmaq və dərslərlə bağlı sizinlə əlaqə saxlamaq üçün toplanır.
      </p>
      <p>
        {pagesMode
          ? 'Forma məlumatlarınızdan WhatsApp mesajı hazırlanır. WhatsApp keçidini açdıqda məlumatlarınız WhatsApp xidmətinə ötürülür; mesajı göndərdikdə müəllimə çatır. Bu versiyada müraciətlər saytın bazasında saxlanılmır. WhatsApp-ın məxfilik qaydaları tətbiq olunur.'
          : 'Məlumatlar saytın serverində saxlanılır və reklam məqsədilə üçüncü şəxslərə ötürülmür.'}{' '}
        Formaya həssas məlumat və ya ödəniş kartı məlumatları daxil etməyin.
      </p>
      <p>
        Məlumatlarınıza düzəliş etmək və ya onların silinməsini istəmək üçün{' '}
        <a href={`tel:${contact.phone}`}>{contact.display}</a> nömrəsi ilə əlaqə saxlaya bilərsiniz.
      </p>
      <button className="button button-dark" onClick={onClose}>
        Aydındır <Check size={16} />
      </button>
    </dialog>
  );
}

function Registration({
  selectedCourse,
  onCourseChange,
  onPrivacy,
}: {
  selectedCourse: string;
  onCourseChange: (id: string) => void;
  onPrivacy: () => void;
}) {
  const { courses, settings } = useContent();
  const contact = { phone: settings.phone, display: settings.phoneDisplay };
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [submittedName, setSubmittedName] = useState('');
  const [whatsappDraft, setWhatsappDraft] = useState('');
  useEffect(() => setWhatsappDraft(''), [selectedCourse]);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (status === 'success' || status === 'error' || whatsappDraft) feedbackRef.current?.focus();
  }, [status, whatsappDraft]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    if (pagesMode) {
      if (String(data.name).trim().length < 2 || data.website) {
        setError('Ad və soyadınızı düzgün daxil edin.');
        setStatus('error');
        return;
      }
      const labels: Record<string, string> = {
        beginner: 'Sıfırdan başlayıram',
        basic: 'Baza biliklərim var',
        working: 'IT sahəsində çalışıram',
        online: 'Onlayn',
        'in-person': 'Əyani',
        either: 'Fərq etmir',
      };
      const course = courses.find((c) => c.id === data.course)?.name || 'Seçimdə kömək lazımdır';
      const message = [
        `Salam, ${settings.brandName} dərslərinə qoşulmaq istəyirəm.`,
        `Ad və soyad: ${String(data.name).trim()}`,
        `Telefon: ${String(data.phone).trim()}`,
        `E-poçt: ${String(data.email).trim()}`,
        `Kurs: ${course}`,
        `Səviyyə: ${labels[String(data.experience)]}`,
        `Format: ${labels[String(data.format)]}`,
        data.message ? `Qeyd: ${String(data.message).trim()}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      setWhatsappDraft(
        `https://wa.me/${contact.phone.slice(1)}?text=${encodeURIComponent(message)}`,
      );
      setError('');
      setStatus('idle');
      return;
    }
    setStatus('sending');
    setError('');
    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, consent: data.consent === 'on' }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'Müraciət göndərilmədi. Bir az sonra yenidən yoxlayın.');
      setReference(result.reference);
      setSubmittedName(String(data.name).trim().split(/\s+/)[0]);
      setStatus('success');
      form.reset();
      onCourseChange('');
    } catch (err) {
      setError(
        err instanceof Error && err.name !== 'TimeoutError' && err.name !== 'TypeError'
          ? err.message
          : 'Serverlə əlaqə qurulmadı. İnternet bağlantınızı yoxlayıb yenidən cəhd edin.',
      );
      setStatus('error');
    }
  }

  return (
    <section className="registration-section" id="register" hidden={!settings.showRegistration}>
      <div className="section-container registration-layout">
        <div className="registration-copy">
          <span className="eyebrow light-eyebrow">
            <span /> GƏLƏCƏYİNƏ İLK ADDIM
          </span>
          <h2>{settings.registrationTitle}</h2>
          <p className="editable-copy">{settings.registrationDescription}</p>
          <div className="registration-points">
            <div>
              <CheckCircle2 size={20} />
              <span>Səviyyənə uyğun proqram seçimi</span>
            </div>
            <div>
              <CheckCircle2 size={20} />
              <span>Dərs cədvəli haqqında ətraflı məlumat</span>
            </div>
            <div>
              <CheckCircle2 size={20} />
              <span>Ödəniş öhdəliyi olmadan ilkin müraciət</span>
            </div>
          </div>
          <div className="contact-block">
            <span className="contact-icon">
              <MessageCircle size={23} />
            </span>
            <div>
              <span>Birbaşa danışmağa üstünlük verirsən?</span>
              <a href={`tel:${contact.phone}`}>
                {contact.display} <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
          <SocialLinks />
          <div className="registration-decoration" aria-hidden="true">
            <Code2 size={90} strokeWidth={1} />
            <span>hello, future IT pro_</span>
          </div>
        </div>
        <div className="registration-form-panel">
          {status === 'success' ? (
            <div className="success-panel" ref={feedbackRef} tabIndex={-1} role="status">
              <div className="success-icon">
                <CheckCheck size={35} />
              </div>
              <span className="eyebrow">İLK ADDIM ATILDI</span>
              <h3>Təşəkkürlər, {submittedName}!</h3>
              <p>
                Müraciətiniz uğurla qeydə alındı. Kurs və dərs cədvəlini dəqiqləşdirmək üçün təqdim
                etdiyiniz əlaqə vasitəsilə sizinlə əlaqə saxlanılacaq.
              </p>
              <div className="reference-box">
                Müraciət nömrəsi <strong>{reference}</strong>
              </div>
              <button className="button button-dark" onClick={() => setStatus('idle')}>
                Yeni müraciət <ArrowRight size={17} />
              </button>
            </div>
          ) : (
            <>
              <div className="form-heading">
                <h3>Dərslərə qeydiyyat</h3>
                <span>
                  Təxminən 1 dəqiqə <Clock3 size={14} />
                </span>
              </div>
              <form
                onSubmit={submit}
                onChange={() => {
                  if (whatsappDraft) setWhatsappDraft('');
                }}
              >
                <div className="form-field">
                  <label htmlFor="name">
                    Ad və soyad <span>*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    placeholder="Adınızı və soyadınızı yazın"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="phone">
                      Telefon nömrəsi <span>*</span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+994 50 123 45 67"
                      required
                      pattern={String.raw`[+0-9\s\(\)\.\-]{7,25}`}
                      maxLength={25}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="email">
                      E-poçt <span>*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="adiniz@email.com"
                      required
                      maxLength={254}
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="course">
                    Maraqlandığınız istiqamət <span>*</span>
                  </label>
                  <div className="select-wrap">
                    <select
                      id="course"
                      name="course"
                      required
                      value={selectedCourse}
                      onChange={(e) => onCourseChange(e.target.value)}
                    >
                      <option value="" disabled>
                        Kursu seçin
                      </option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                      <option value="undecided">Seçimdə kömək lazımdır</option>
                    </select>
                    <ChevronDown size={16} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="experience">Hazırkı səviyyəniz</label>
                    <div className="select-wrap">
                      <select id="experience" name="experience" defaultValue="beginner">
                        <option value="beginner">Sıfırdan başlayıram</option>
                        <option value="basic">Baza biliklərim var</option>
                        <option value="working">IT sahəsində çalışıram</option>
                      </select>
                      <ChevronDown size={16} />
                    </div>
                  </div>
                  <div className="form-field">
                    <label htmlFor="format">Dərs formatı</label>
                    <div className="select-wrap">
                      <select id="format" name="format" defaultValue="online">
                        <option value="online">Onlayn</option>
                        <option value="in-person">Əyani</option>
                        <option value="either">Fərq etmir</option>
                      </select>
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="message">
                    Qeydiniz <span className="optional">(istəyə bağlı)</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    placeholder="Məqsədiniz və ya sualınız haqqında qısa yazın..."
                    rows={2}
                    maxLength={1500}
                  />
                </div>
                <div className="honeypot" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" tabIndex={-1} autoComplete="off" />
                </div>
                <label className="consent">
                  <input type="checkbox" name="consent" required />
                  <span>
                    <button type="button" onClick={onPrivacy}>
                      Məxfilik şərtləri
                    </button>{' '}
                    {pagesMode
                      ? 'ilə tanış oldum, məlumatlarımı WhatsApp vasitəsilə paylaşmağa və müraciətimlə bağlı əlaqə saxlanılmasına razıyam.'
                      : 'ilə tanış oldum və müraciətimlə bağlı əlaqə saxlanılmasına razıyam.'}
                  </span>
                </label>
                {status === 'error' && (
                  <div className="form-error" role="alert" tabIndex={-1} ref={feedbackRef}>
                    {error}
                  </div>
                )}
                {whatsappDraft ? (
                  <div className="whatsapp-ready" ref={feedbackRef} tabIndex={-1} role="status">
                    <p>
                      Mesajınız hazırdır. Qeydiyyatı tamamlamaq üçün WhatsApp-ı açın və mesajı
                      göndərin.
                    </p>
                    <a
                      className="button button-dark submit-button"
                      href={whatsappDraft}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                    >
                      WhatsApp-da aç və göndər <MessageCircle size={18} />
                    </a>
                  </div>
                ) : (
                  <button
                    className="button button-dark submit-button"
                    type="submit"
                    disabled={status === 'sending'}
                  >
                    {status === 'sending'
                      ? 'Göndərilir...'
                      : pagesMode
                        ? 'WhatsApp mesajını hazırla'
                        : 'Müraciət göndər'}
                    {status === 'sending' ? (
                      <span className="spinner" />
                    ) : (
                      <ArrowUpRight size={19} />
                    )}
                  </button>
                )}
                <p className="form-footnote">
                  <ShieldCheck size={13} />{' '}
                  {pagesMode
                    ? 'Müraciət WhatsApp-da mesajı göndərdikdən sonra müəllimə çatır.'
                    : 'Məlumatlarınız yalnız sizinlə əlaqə üçün istifadə olunur.'}
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const { courses, faqs: storedFaqs, settings } = useContent();
  const contact = { phone: settings.phone, display: settings.phoneDisplay };
  const visibility: Record<string, boolean> = {
    about: settings.showAbout,
    courses: settings.showCourses,
    syllabus: settings.showSyllabus && courses.length > 0,
    faq: settings.showFaq,
    solutions: settings.showSolutions && settings.solutions.some((item) => item.published),
  };
  const faqs = storedFaqs.map((f) =>
    pagesMode && f.id === 'faq-5'
      ? {
          ...f,
          answer:
            'Formanı doldurduqdan sonra WhatsApp mesajını hazırlayın. WhatsApp keçidini açıb mesajı göndərdikdə müraciət müəllimə çatır.',
        }
      : f,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [syllabusId, setSyllabusId] = useState<CourseId>('help-desk');
  const [expandedModule, setExpandedModule] = useState<number | null>(0);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const activeCourse = courses.find((c) => c.id === syllabusId) || courses[0];
  useEffect(() => {
    if (!courses.some((c) => c.id === syllabusId)) setSyllabusId(courses[0]?.id || '');
    if (
      selectedCourse &&
      selectedCourse !== 'undecided' &&
      !courses.some((c) => c.id === selectedCourse)
    )
      setSelectedCourse('');
  }, [courses, syllabusId, selectedCourse]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActiveSection(entry.target.id);
      },
      { rootMargin: '-20% 0px -55% 0px' },
    );
    document.querySelectorAll('main > section[id]').forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  function chooseSyllabus(id: CourseId) {
    setSyllabusId(id);
    setExpandedModule(0);
  }
  function register(id: CourseId) {
    setSelectedCourse(id);
  }
  function downloadSyllabus() {
    if (!activeCourse) return;
    const text =
      `${settings.brandName.toUpperCase()} — ${activeCourse.name}\n${activeCourse.duration} · ${activeCourse.level}\n\nİlkin biliklər: ${activeCourse.prerequisites}\n\n` +
      activeCourse.modules
        .map(
          (m, i) =>
            `${i + 1}. ${m.title} (${m.duration})\n${m.topics.map((t) => `  • ${t}`).join('\n')}\n  Praktika: ${m.lab}`,
        )
        .join('\n\n') +
      `\n\nNəticə: ${activeCourse.outcome}\n\nƏlaqə: ${contact.display}\nQrupun dəqiq cədvəli qeydiyyatdan sonra dəqiqləşdirilir.`;
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `jayhun-tech-${activeCourse.id}-sillabus.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Məzmuna keç
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav
            className={menuOpen ? 'main-nav is-open' : 'main-nav'}
            aria-label="Əsas naviqasiya"
            id="main-navigation"
          >
            {[
              { id: 'about', label: 'Haqqımda' },
              { id: 'courses', label: 'Tədris istiqamətləri' },
              { id: 'syllabus', label: 'Sillabus' },
              { id: 'solutions', label: 'IT həllər' },
              { id: 'faq', label: 'Suallar' },
            ]
              .filter((link) => visibility[link.id])
              .map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className={activeSection === link.id ? 'active' : ''}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
            <a
              className="mobile-register"
              href="#register"
              hidden={!settings.showRegistration}
              onClick={() => setMenuOpen(false)}
            >
              Qeydiyyatdan keç <ArrowUpRight size={16} />
            </a>
          </nav>
          <a
            href="#register"
            hidden={!settings.showRegistration}
            className="button button-dark header-cta"
          >
            <span className="desktop-label">Qeydiyyatdan keç</span>
            <span className="mobile-label">Qeydiyyat</span> <ArrowUpRight size={16} />
          </a>
          <button
            className="menu-toggle icon-button"
            aria-label={menuOpen ? 'Menyunu bağla' : 'Menyunu aç'}
            aria-expanded={menuOpen}
            aria-controls="main-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main">
        <section className="hero section-container" id="home">
          <div className="hero-copy">
            <div className="availability">
              <span className="live-dot" /> {settings.heroBadge}
            </div>
            <h1>
              {settings.heroLine1}
              <br />
              <span className="highlight-word">
                {settings.heroLine2}
                <span className="hand-underline" />
              </span>
              <br />
              {settings.heroLine3}
            </h1>
            <p className="editable-copy">{settings.heroDescription}</p>
            <div className="hero-buttons">
              <a href="#courses" hidden={!settings.showCourses} className="button button-dark">
                Öz istiqamətini seç <ArrowUpRight size={18} />
              </a>
              <a href="#about" hidden={!settings.showAbout} className="button button-text">
                <span className="play-circle">
                  <Play size={13} fill="currentColor" />
                </span>
                Məni tanı
              </a>
            </div>
            <div className="hero-note">
              <div className="mini-icons">
                <span>
                  <Terminal size={15} />
                </span>
                <span>
                  <Network size={15} />
                </span>
                <span>
                  <Server size={15} />
                </span>
              </div>
              <span>
                Sıfırdan başla. <strong>Bacarığınla fərqlən.</strong>
              </span>
            </div>
          </div>
          <div className="hero-art">
            <LabVisual />
            <div className="floating-proof">
              <span>
                <Check size={17} />
              </span>
              <div>
                Real ssenarilər<strong>Praktiki bacarıqlar</strong>
              </div>
              <Sparkles size={17} />
            </div>
            <div className="hero-art-note">
              <span /> SƏNİN GƏLƏCƏK İŞ MASAN.
            </div>
          </div>
        </section>
        <div className="tech-strip">
          <div className="section-container tech-strip-inner">
            <span className="tech-strip-label">
              ÖYRƏNƏCƏYİN
              <br />
              <strong>TEXNOLOGİYALAR</strong>
            </span>
            <span className="tech-logo windows-logo">
              <span className="windows-mark">
                <i />
                <i />
                <i />
                <i />
              </span>
              Windows
            </span>
            <span className="tech-logo">
              <Terminal size={24} /> Linux
            </span>
            <span className="tech-logo cisco-logo">
              <span className="cisco-bars">
                {[9, 16, 23, 13, 23, 16, 9].map((h, i) => (
                  <i style={{ height: h }} key={i} />
                ))}
              </span>
              cisco
            </span>
            <span className="tech-logo active-directory">
              <Layers3 size={25} />
              <span>
                Active
                <br />
                Directory
              </span>
            </span>
            <span className="tech-logo vmware-logo">
              vmware<span>®</span>
            </span>
            <span className="tech-logo powershell-logo">
              <span>❯_</span>PowerShell
            </span>
          </div>
        </div>
        <section
          className="courses-section section-container"
          id="courses"
          hidden={!settings.showCourses}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                <span /> TƏDRİS İSTİQAMƏTLƏRİ
              </span>
              <h2>{settings.coursesTitle}</h2>
            </div>
            <p className="editable-copy">{settings.coursesDescription}</p>
          </div>
          <div className="course-grid">
            {courses.map((course) => {
              const Icon = courseIcons[course.icon] || Headphones;
              return (
                <article
                  key={course.id}
                  className={`course-card ${course.icon === 'system-admin' ? 'course-card-system' : ''}`}
                >
                  <div className="course-card-top">
                    <span className="course-icon">
                      <Icon size={26} strokeWidth={1.6} />
                    </span>
                    <span className="course-number">/ {course.number}</span>
                  </div>
                  <span className="course-category">{course.category}</span>
                  <h3>{course.name}</h3>
                  <p className="course-description">{course.description}</p>
                  <div className="course-meta">
                    <span>
                      <Clock3 size={14} />
                      {course.duration}
                    </span>
                    <span>
                      <Layers3 size={14} />
                      {course.level}
                    </span>
                  </div>
                  <div className="course-tags">
                    {course.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="course-card-bottom">
                    <a
                      href="#syllabus"
                      hidden={!settings.showSyllabus}
                      onClick={() => chooseSyllabus(course.id)}
                    >
                      Sillabusa bax <ArrowUpRight size={17} />
                    </a>
                    <a
                      href="#register"
                      hidden={!settings.showRegistration}
                      className="course-register"
                      aria-label={`${course.name} kursuna qeydiyyat`}
                      onClick={() => register(course.id)}
                    >
                      <Plus size={20} />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="course-help">
            <span>
              <MessageCircle size={17} /> Hansından başlayacağını bilmirsən?
            </span>
            <a
              href="#register"
              hidden={!settings.showRegistration}
              onClick={() => setSelectedCourse('undecided')}
            >
              Birlikdə seçək <ArrowRight size={15} />
            </a>
          </div>
        </section>
        <section className="about-section" id="about" hidden={!settings.showAbout}>
          <div className="section-container about-layout">
            <div className="about-art">
              <div className="about-art-header">
                <span>BEHIND THE SCREENS</span>
                <ArrowUpRight size={18} />
              </div>
              {settings.instructorPhotoUrl ? (
                <img
                  className="instructor-photo"
                  src={settings.instructorPhotoUrl}
                  alt={settings.instructorName}
                  loading="lazy"
                />
              ) : (
                <div className="about-monogram">
                  <span>J</span>
                  <span className="monogram-dot" />
                  <div className="monogram-orbit" />
                  <span className="monogram-code">&lt;/&gt;</span>
                </div>
              )}
              <div className="about-name">
                <div>
                  <h3>{settings.instructorName}</h3>
                  <span>{settings.instructorRole}</span>
                </div>
                <span className="about-signature">J.</span>
              </div>
              <div className="about-art-tag">
                <span className="live-dot" /> Biliyi paylaş, gələcəyi qur.
              </div>
            </div>
            <div className="about-copy">
              <span className="eyebrow">
                <span /> TANIŞ OLAQ
              </span>
              <h2>
                {settings.aboutTitle}
                <br />
                <span className="muted-heading editable-copy">{settings.aboutSubtitle}</span>
              </h2>
              <p>{settings.bio1}</p>
              <p>{settings.bio2}</p>
              <div className="about-values">
                {settings.aboutValues
                  .split('\n')
                  .filter(Boolean)
                  .map((value) => (
                    <span key={value}>
                      <CheckCircle2 size={18} />
                      {value}
                    </span>
                  ))}
              </div>
              <a href="#register" hidden={!settings.showRegistration} className="about-link">
                Gəl, məqsədin haqqında danışaq <ArrowUpRight size={18} />
              </a>
            </div>
          </div>
        </section>
        {activeCourse && (
          <section
            className="syllabus-section section-container"
            id="syllabus"
            hidden={!settings.showSyllabus}
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  <span /> ADDIM-ADDIM İNKİŞAF
                </span>
                <h2>{settings.syllabusTitle}</h2>
              </div>
              <button className="button button-outline download-button" onClick={downloadSyllabus}>
                <ArrowDownToLine size={17} /> Sillabusu yüklə <span>TXT</span>
              </button>
            </div>
            <div className="syllabus-tabs" role="tablist" aria-label="Kurs sillabusları">
              {courses.map((course) => {
                const Icon = courseIcons[course.icon] || Headphones;
                return (
                  <button
                    id={`tab-${course.id}`}
                    key={course.id}
                    role="tab"
                    aria-selected={syllabusId === course.id}
                    aria-controls="syllabus-panel"
                    tabIndex={syllabusId === course.id ? 0 : -1}
                    onClick={() => chooseSyllabus(course.id)}
                    onKeyDown={(event) => {
                      let next: number | null = null;
                      const index = courses.findIndex((c) => c.id === course.id);
                      if (event.key === 'ArrowRight') next = (index + 1) % courses.length;
                      if (event.key === 'ArrowLeft')
                        next = (index + courses.length - 1) % courses.length;
                      if (event.key === 'Home') next = 0;
                      if (event.key === 'End') next = courses.length - 1;
                      if (next !== null) {
                        event.preventDefault();
                        chooseSyllabus(courses[next].id);
                        document.getElementById(`tab-${courses[next].id}`)?.focus();
                      }
                    }}
                  >
                    <Icon size={18} />
                    {course.shortName}
                  </button>
                );
              })}
            </div>
            <div
              className="syllabus-layout"
              id="syllabus-panel"
              role="tabpanel"
              aria-labelledby={`tab-${syllabusId}`}
            >
              <aside className="syllabus-summary">
                <span className="syllabus-summary-icon">
                  <BookOpen size={27} strokeWidth={1.5} />
                </span>
                <h3>{activeCourse.name}</h3>
                <p>{activeCourse.prerequisites}</p>
                <div className="syllabus-stats">
                  <span>
                    <Clock3 size={16} /> {activeCourse.duration}
                  </span>
                  <span>
                    <Layers3 size={16} /> {activeCourse.modules.length} modul
                  </span>
                </div>
                <div className="syllabus-outcome">
                  <span>KURSUN SONUNDA</span>
                  <p>{activeCourse.outcome}</p>
                </div>
                <a
                  href="#register"
                  hidden={!settings.showRegistration}
                  className="button button-dark"
                  onClick={() => register(syllabusId)}
                >
                  Bu kursa qoşul <ArrowUpRight size={17} />
                </a>
              </aside>
              <div className="modules">
                {activeCourse.modules.map((module, index) => (
                  <div
                    className={`module ${expandedModule === index ? 'is-expanded' : ''}`}
                    key={`${syllabusId}-${index}`}
                  >
                    <h3>
                      <button
                        aria-expanded={expandedModule === index}
                        aria-controls={`module-${index}`}
                        onClick={() => setExpandedModule(expandedModule === index ? null : index)}
                      >
                        <span className="module-number">0{index + 1}</span>
                        <span className="module-title">
                          {module.title}
                          <span>{module.duration}</span>
                        </span>
                        <Plus size={20} className="module-toggle" />
                      </button>
                    </h3>
                    <div
                      id={`module-${index}`}
                      className="module-content"
                      hidden={expandedModule !== index}
                    >
                      <ul>
                        {module.topics.map((topic) => (
                          <li key={topic}>
                            <Check size={14} />
                            {topic}
                          </li>
                        ))}
                      </ul>
                      <div className="module-lab">
                        <Terminal size={16} />
                        <span>
                          <strong>Praktiki tapşırıq</strong>
                          {module.lab}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
        <section
          id="solutions"
          className="solutions-section section-container"
          hidden={!visibility.solutions}
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                <span /> IT HƏLLƏR
              </span>
              <h2>{settings.solutionsTitle}</h2>
            </div>
            <p className="editable-copy">{settings.solutionsDescription}</p>
          </div>
          <div className="solutions-grid">
            {settings.solutions
              .filter((item) => item.published)
              .map((item, index) => (
                <article className="solution-card" key={item.id}>
                  <span className="solution-number">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{item.title}</h3>
                  <p className="editable-copy">{item.description}</p>
                  <a href={`tel:${contact.phone}`}>
                    Əlaqə saxla <ArrowUpRight size={17} />
                  </a>
                </article>
              ))}
          </div>
        </section>

        <section className="process-section" hidden={!settings.showProcess}>
          <div className="section-container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  <span /> DƏRSDƏN REAL BACARIĞA
                </span>
                <h2>{settings.processTitle}</h2>
              </div>
              <p className="editable-copy">{settings.processDescription}</p>
            </div>
            <div className="process-grid">
              {[
                { icon: BookOpen, title: settings.step1Title, text: settings.step1Description },
                { icon: Terminal, title: settings.step2Title, text: settings.step2Description },
                { icon: Users, title: settings.step3Title, text: settings.step3Description },
                { icon: Layers3, title: settings.step4Title, text: settings.step4Description },
              ].map((step, i) => (
                <article className="process-step" key={step.title}>
                  <div className="process-step-top">
                    <span>
                      <step.icon size={23} strokeWidth={1.5} />
                    </span>
                    <span>0{i + 1}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <Registration
          selectedCourse={selectedCourse}
          onCourseChange={setSelectedCourse}
          onPrivacy={() => setPrivacyOpen(true)}
        />
        <section className="faq-section section-container" id="faq" hidden={!settings.showFaq}>
          <div className="faq-copy">
            <span className="eyebrow">
              <span /> AĞLINDA SUAL QALMASIN
            </span>
            <h2>
              Tez-tez verilən
              <br />
              suallar<span className="green-dot">.</span>
            </h2>
            <p>
              Başqa sualın var?
              <br />
              Danışmağa hər zaman mövzu var.
            </p>
            <a href={`tel:${contact.phone}`} className="about-link">
              Əlaqə saxla <ArrowUpRight size={17} />
            </a>
          </div>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div key={faq.question} className={`faq-item ${openFaq === index ? 'faq-open' : ''}`}>
                <h3>
                  <button
                    aria-expanded={openFaq === index}
                    aria-controls={`faq-answer-${index}`}
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    {faq.question}
                    <Plus size={19} />
                  </button>
                </h3>
                <div id={`faq-answer-${index}`} hidden={openFaq !== index}>
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="section-container">
          <div className="footer-top">
            <div>
              <Brand light />
              <p className="editable-copy">{settings.footerDescription}</p>
              <SocialLinks />
            </div>
            <div className="footer-nav">
              <span>KƏŞF ET</span>
              <a href="#about" hidden={!settings.showAbout}>
                Haqqımda
              </a>
              <a href="#courses" hidden={!settings.showCourses}>
                Tədris istiqamətləri
              </a>
              <a href="#syllabus" hidden={!settings.showSyllabus}>
                Sillabus
              </a>
            </div>
            <div className="footer-nav">
              <span>İLK ADDIM</span>
              <a href="#register" hidden={!settings.showRegistration}>
                Dərslərə qeydiyyat
              </a>
              <a href="#faq">Tez-tez verilən suallar</a>
              <button onClick={() => setPrivacyOpen(true)}>Məxfilik şərtləri</button>
            </div>
            <div className="footer-contact">
              <span>BİR SALAMLA BAŞLAYAQ.</span>
              <a href={`tel:${contact.phone}`}>
                {contact.display}
                <ArrowUpRight size={17} />
              </a>
              <span className="footer-location">Azərbaycan dilində IT təhsili.</span>
            </div>
          </div>
          <div className="footer-bottom">
            <span>
              © {new Date().getFullYear()} {settings.brandName}. Bütün hüquqlar qorunur.
            </span>
            <a href="#home">
              Yuxarı qayıt <ArrowRight size={14} />
            </a>
            <span className="made-with">
              Maraqla başla. İnamla davam et. <span>✳</span>
            </span>
          </div>
        </div>
      </footer>
      {privacyOpen && <PrivacyDialog onClose={() => setPrivacyOpen(false)} />}
    </>
  );
}
