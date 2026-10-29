import BrandIdentity from '../BrandIdentity';
import ContentExtras, { InstructorPhotoEditor, LogoEditor } from './ContentExtras';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  definitions,
  settingsSections,
  labels,
  formatDate,
  toLocalDate,
  type Collection,
  type Section,
  type Row,
  type Field,
} from './schema';
import './admin.css';

type Session = { username: string; csrfToken: string };

const navigation: { id: Section; label: string; icon: typeof Users }[] = [
  { id: 'dashboard', label: 'İcmal', icon: LayoutDashboard },
  { id: 'registrations', label: 'Müraciətlər', icon: Users },
  { id: 'courses', label: 'Kurslar və sillabus', icon: BookOpen },
  { id: 'groups', label: 'Dərs qrupları', icon: GraduationCap },
  { id: 'materials', label: 'Tədris vəsaitləri', icon: FolderOpen },
  { id: 'exams', label: 'İmtahan təqvimi', icon: CalendarDays },
  { id: 'results', label: 'Nəticələr', icon: ClipboardList },
  { id: 'settings', label: 'Sayt məzmunu', icon: Settings2 },
  { id: 'faqs', label: 'Suallar və cavablar', icon: CircleHelp },
];

const emptyOptions: Row = { courses: [], groups: [], students: [], exams: [] };

// Admin API eyni domendən işləyir: cookie SameSite=Strict, CORS yoxdur, Origin yoxlanılır.
const API_BASE = '';

const TABLE_HEADS: Record<string, string[]> = {
  registrations: ['Tələbə', 'Kurs', 'Əlaqə', 'Status'],
  courses: ['Kurs', 'Müddət', 'Sillabus', 'Yayım'],
  groups: ['Qrup', 'Kurs', 'Tələbələr', 'Status'],
  materials: ['Vəsait', 'Qrup', 'Növ', 'Fayl'],
  exams: ['İmtahan', 'Qrup', 'Tarix / saat', 'Status'],
  results: ['Tələbə', 'İmtahan', 'Bal', 'Nəticə'],
  faqs: ['Sual', 'Sıralama', 'Yayım'],
};

const STATUS_FILTER_SECTIONS = ['registrations', 'groups', 'exams'];

const rowLabel = (row: Row): string => row.name || row.title || row.question || row.student_name;

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function Badge({ value }: { value: string }) {
  return <span className={`ad-badge ad-badge-${value}`}>{labels[value] || value}</span>;
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="ad-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <div className="ad-dialog-head">
        <div>
          <span className="ad-eyebrow">JAYHUN TECH / İDARƏETMƏ</span>
          <h2>{title}</h2>
        </div>
        <button className="ad-icon" aria-label="Pəncərəni bağla" onClick={onClose}>
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  choices = [],
  disabled = false,
}: {
  field: Field;
  value: any;
  onChange: (value: any) => void;
  choices?: [string, string][];
  disabled?: boolean;
}) {
  const id = `ad-field-${field.key}`;
  const type = field.type || 'text';
  if (type === 'checkbox')
    return (
      <label className="ad-checkbox">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        <span>{field.label}</span>
      </label>
    );
  return (
    <div className={`ad-field ${field.wide ? 'ad-wide' : ''}`}>
      <label htmlFor={id}>
        {field.label}
        {field.required && <span> *</span>}
      </label>
      {type === 'select' ? (
        <div className="ad-select">
          <select
            id={id}
            required={field.required}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">Seçin</option>
            {(field.options || choices).map(([optId, name]) => (
              <option key={optId} value={optId}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </div>
      ) : type === 'textarea' ? (
        <textarea
          id={id}
          rows={field.key === 'content' ? 6 : 3}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.max || 6000}
          required={field.required}
        />
      ) : (
        <input
          id={id}
          type={field.key === 'email' ? 'email' : type}
          value={value ?? ''}
          onChange={(e) =>
            onChange(
              type === 'number'
                ? e.target.value === ''
                  ? ''
                  : Number(e.target.value)
                : e.target.value,
            )
          }
          min={field.min}
          max={field.max}
          step={type === 'number' ? 'any' : undefined}
          maxLength={type === 'text' ? field.max || 500 : undefined}
          required={field.required}
          disabled={disabled}
        />
      )}
      {field.help && <small>{field.help}</small>}
    </div>
  );
}

function ModulesEditor({
  modules,
  onChange,
}: {
  modules: Row[];
  onChange: (modules: Row[]) => void;
}) {
  const patch = (i: number, key: string, value: any) =>
    onChange(modules.map((m, n) => (n === i ? { ...m, [key]: value } : m)));
  const moduleFields: Partial<Field>[] = [
    { key: 'title', label: 'Modulun adı', required: true },
    { key: 'duration', label: 'Həftə / müddət' },
    { key: 'topics', label: 'Mövzular (hər sətirdə biri)', type: 'textarea' },
    { key: 'lab', label: 'Praktiki tapşırıq', type: 'textarea' },
  ];
  return (
    <div className="ad-modules-editor">
      <div className="ad-subheading">
        <h3>Sillabus modulları</h3>
        <button
          className="ad-btn ad-secondary"
          type="button"
          onClick={() => onChange([...modules, { title: '', duration: '', topics: [], lab: '' }])}
        >
          <Plus size={15} />
          Modul əlavə et
        </button>
      </div>
      {modules.map((module, i) => (
        <fieldset className="ad-module-editor" key={i}>
          <legend>Modul {i + 1}</legend>
          <div className="ad-module-tools">
            <button
              className="ad-icon"
              type="button"
              aria-label={`Modul ${i + 1} yuxarı`}
              disabled={i === 0}
              onClick={() => {
                const next = [...modules];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                onChange(next);
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="ad-icon ad-danger-icon"
              type="button"
              aria-label={`Modul ${i + 1} sil`}
              onClick={() => onChange(modules.filter((_, n) => n !== i))}
            >
              <Trash2 size={16} />
            </button>
          </div>
          {moduleFields.map((field) => {
            const key = field.key as string;
            return (
              <FieldInput
                key={key}
                field={{ ...field, key: `module-${i}-${key}` } as Field}
                value={key === 'topics' ? (module.topics || []).join('\n') : module[key]}
                onChange={(v) => patch(i, key, key === 'topics' ? v.split('\n') : v)}
              />
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<Section>(
    () => navigation.find((n) => n.id === location.hash.slice(1))?.id || 'dashboard',
  );
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [epoch, setEpoch] = useState(0);
  const [data, setData] = useState<{ items: Row[]; total: number; pageSize: number }>({
    items: [],
    total: 0,
    pageSize: 20,
  });
  const [dashboard, setDashboard] = useState<Row | null>(null);
  const [options, setOptions] = useState<Row>(emptyOptions);
  const [settings, setSettings] = useState<Row>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<{ type: Collection; id?: string } | null>(null);
  const [draft, setDraft] = useState<Row>({});
  const [file, setFile] = useState<File | null>(null);
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [resultMembers, setResultMembers] = useState<Row[]>([]);
  const [group, setGroup] = useState<Row | null>(null);
  const [members, setMembers] = useState<Row[]>([]);
  const [studentId, setStudentId] = useState('');
  const [memberError, setMemberError] = useState('');

  const pageSize = data.pageSize || 20;

  async function request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${API_BASE}/api/admin${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.body && !(init.body instanceof File)
          ? { 'Content-Type': 'application/json' }
          : {}),
        'X-CSRF-Token': session?.csrfToken || '',
        ...init.headers,
      },
    });
    const result = await readJson(response);
    if (!response.ok) {
      if (response.status === 401) {
        setSession(null);
        setLoginError('Sessiya bitib. Yenidən daxil olun.');
      }
      throw new Error(result.error || 'Əməliyyat tamamlanmadı.');
    }
    return result;
  }

  // Sessiyanı yoxla
  useEffect(() => {
    document.title = 'Jayhun Tech — İdarə paneli';
    fetch(`${API_BASE}/api/admin/session`, { credentials: 'include' })
      .then(async (r) => {
        if (r.ok) setSession(await r.json());
      })
      .catch(() => setLoginError('Serverlə əlaqə qurulmadı.'))
      .finally(() => setChecking(false));
  }, []);

  // Axtarış debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Brauzerin geri/irəli düymələri (hash)
  useEffect(() => {
    const handle = () => {
      const id = navigation.find((n) => n.id === location.hash.slice(1))?.id;
      if (id) {
        setSection(id);
        setPage(1);
        setSearch('');
        setFilter('');
      }
    };
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);

  // Seçim siyahıları (kurslar, qruplar, tələbələr, imtahanlar)
  useEffect(() => {
    if (!session) return;
    let active = true;
    request('/options')
      .then((r) => {
        if (active) setOptions(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [session, epoch]);

  // Bölmənin məlumatları
  useEffect(() => {
    if (!session) return;
    let active = true;
    setLoading(true);
    setError('');
    const path =
      section === 'dashboard'
        ? '/dashboard'
        : section === 'settings'
          ? '/settings'
          : `/${section}?q=${encodeURIComponent(query)}&page=${page}&status=${encodeURIComponent(filter)}`;
    request(path)
      .then((r) => {
        if (!active) return;
        if (section === 'dashboard') setDashboard(r);
        else if (section === 'settings') setSettings(r);
        else setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session, section, query, page, filter, epoch]);

  // Nəticə formu: imtahanın qrupundakı tələbələr
  useEffect(() => {
    if (editor?.type !== 'results' || !draft.exam_id) {
      setResultMembers([]);
      return;
    }
    const exam = options.exams.find((e: Row) => e.id === draft.exam_id);
    if (!exam) return;
    let active = true;
    request(`/groups/${exam.group_id}/members`)
      .then((r) => {
        if (active) setResultMembers(r);
      })
      .catch((e) => {
        if (active) setEditError(e.message);
      });
    return () => {
      active = false;
    };
  }, [editor?.type, draft.exam_id, options]);

  // Bildirişin avtomatik bağlanması
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const refresh = () => setEpoch((e) => e + 1);

  function navigate(id: Section) {
    setSection(id);
    location.hash = id;
    setMenu(false);
    setSearch('');
    setQuery('');
    setFilter('');
    setPage(1);
    setError('');
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLoginError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await readJson(response);
      if (!response.ok) throw new Error(result.error || 'Daxil olmaq mümkün olmadı.');
      setSession(result);
    } catch (e) {
      setLoginError(
        e instanceof TypeError
          ? 'Serverlə əlaqə qurulmadı.'
          : e instanceof Error
            ? e.message
            : 'Daxil olmaq mümkün olmadı.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await request('/logout', { method: 'POST' });
      setSession(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function openEditor(type: Collection, row?: Row) {
    setDraft(
      row
        ? structuredClone({
            ...row,
            ...(type === 'exams' ? { scheduled_at: toLocalDate(row.scheduled_at) } : {}),
          })
        : structuredClone(definitions[type].defaults),
    );
    setEditor({ type, id: row?.id });
    setFile(null);
    setEditError('');
  }

  function update(key: string, value: any) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    setEditError('');
    let savedId = editor.id;
    try {
      const payload = { ...draft };
      if (editor.type === 'exams')
        payload.scheduled_at = new Date(draft.scheduled_at + ':00+04:00').toISOString();
      if (editor.type === 'results' && draft.status === 'absent') payload.score = null;
      const result = await request(`/${editor.type}${editor.id ? '/' + editor.id : ''}`, {
        method: editor.id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      savedId = result.id;
      if (file && editor.type === 'materials') {
        setEditor({ ...editor, id: savedId });
        await request(`/materials/${savedId}/file`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Filename': encodeURIComponent(file.name),
          },
          body: file,
        });
      }
      setEditor(null);
      setNotice('Dəyişikliklər saxlanıldı.');
      refresh();
    } catch (e) {
      setEditError(
        (file && savedId ? 'Vəsait məlumatı saxlanılıb. Faylı yenidən yoxlayın. ' : '') +
          (e instanceof Error ? e.message : 'Xəta baş verdi.'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(type: Collection, row: Row) {
    if (!window.confirm(`“${rowLabel(row)}” silinsin? Bu əməliyyat geri qaytarılmır.`)) return;
    try {
      await request(`/${type}/${row.id}`, { method: 'DELETE' });
      setNotice('Məlumat silindi.');
      if (data.items.length === 1 && page > 1) setPage((p) => p - 1);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function manageMembers(row: Row) {
    setGroup(row);
    setStudentId('');
    setMemberError('');
    setMembers([]);
    try {
      setMembers(await request(`/groups/${row.id}/members`));
    } catch (e) {
      setMemberError((e as Error).message);
    }
  }

  async function addMember(event: FormEvent) {
    event.preventDefault();
    if (!group || !studentId) return;
    setSaving(true);
    setMemberError('');
    try {
      await request(`/groups/${group.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ registration_id: studentId }),
      });
      setMembers(await request(`/groups/${group.id}/members`));
      setStudentId('');
      refresh();
    } catch (e) {
      setMemberError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(id: string) {
    if (!group || !window.confirm('Tələbə bu qrupdan çıxarılsın?')) return;
    try {
      await request(`/groups/${group.id}/members/${id}`, { method: 'DELETE' });
      setMembers(await request(`/groups/${group.id}/members`));
      refresh();
    } catch (e) {
      setMemberError((e as Error).message);
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      setSettings(await request('/settings', { method: 'PUT', body: JSON.stringify(settings) }));
      setNotice('Sayt məzmunu yeniləndi. Dəyişikliklər saytda görünür.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function removeMaterialFile() {
    if (!editor?.id || !window.confirm('Əlavə edilmiş fayl silinsin?')) return;
    try {
      await request(`/materials/${editor.id}/file`, { method: 'DELETE' });
      update('file_name', null);
      refresh();
    } catch (e) {
      setEditError((e as Error).message);
    }
  }

  function fieldChoices(field: Field): [string, string][] {
    if (!field.source) return [];
    const rows: Row[] = field.source === 'students' ? resultMembers : options[field.source] || [];
    const choices: [string, string][] = rows.map((r) => [
      r.id,
      r.name || `${r.title} · ${r.group_name}`,
    ]);
    if (field.key === 'course') choices.push(['undecided', 'Seçimdə kömək lazımdır']);
    return choices;
  }

  function renderCells(collection: Collection, row: Row) {
    switch (collection) {
      case 'registrations':
        return (
          <>
            <td>
              <strong>{row.name}</strong>
              <small>
                {formatDate(row.created_at)} · {labels[row.source]}
              </small>
            </td>
            <td>{row.course_name || 'Seçim gözləyir'}</td>
            <td>
              <a href={`mailto:${row.email}`}>{row.email}</a>
              <small>{row.phone}</small>
            </td>
            <td>
              <Badge value={row.status} />
            </td>
          </>
        );
      case 'courses':
        return (
          <>
            <td>
              <strong>{row.name}</strong>
              <small>{row.level}</small>
            </td>
            <td>{row.duration}</td>
            <td>{(row.modules || []).length} modul</td>
            <td>
              <span className={`ad-badge ${row.published ? 'ad-badge-active' : ''}`}>
                {row.published ? 'Yayımlanır' : 'Gizlidir'}
              </span>
            </td>
          </>
        );
      case 'groups':
        return (
          <>
            <td>
              <strong>{row.name}</strong>
              <small>{row.schedule || 'Cədvəl təyin edilməyib'}</small>
            </td>
            <td>{row.course_name}</td>
            <td>
              <button className="ad-member-link" onClick={() => manageMembers(row)}>
                <Users size={14} />
                {row.member_count} / {row.capacity}
              </button>
            </td>
            <td>
              <Badge value={row.status} />
            </td>
          </>
        );
      case 'materials':
        return (
          <>
            <td>
              <strong>{row.title}</strong>
              {row.url && (
                <a
                  className="ad-material-url"
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Linki aç <ArrowUpRight size={12} />
                </a>
              )}
            </td>
            <td>{row.group_name || 'Ümumi kitabxana'}</td>
            <td>
              <Badge value={row.type} />
            </td>
            <td>
              {row.file_name ? (
                <a className="ad-text-btn" href={`${API_BASE}/api/admin/materials/${row.id}/file`}>
                  <ArrowDownToLine size={14} />
                  {row.file_name}
                </a>
              ) : (
                '—'
              )}
            </td>
          </>
        );
      case 'exams':
        return (
          <>
            <td>
              <strong>{row.title}</strong>
              <small>
                {row.duration} dəqiqə · {row.max_score} bal
              </small>
            </td>
            <td>{row.group_name}</td>
            <td>{formatDate(row.scheduled_at)}</td>
            <td>
              <Badge value={row.status} />
            </td>
          </>
        );
      case 'results':
        return (
          <>
            <td>
              <strong>{row.student_name}</strong>
              <small>{row.group_name}</small>
            </td>
            <td>{row.exam_title}</td>
            <td>
              <strong>
                {row.score ?? '—'} <span className="ad-muted">/ {row.max_score}</span>
              </strong>
            </td>
            <td>
              <Badge value={row.outcome} />
            </td>
          </>
        );
      default:
        return (
          <>
            <td>
              <strong>{row.question}</strong>
              <small className="ad-truncate">{row.answer}</small>
            </td>
            <td>{row.sort_order}</td>
            <td>
              <Badge value={row.published ? 'active' : 'archived'} />
            </td>
          </>
        );
    }
  }

  if (checking)
    return (
      <div className="ad-loading-screen">
        <span className="ad-spinner" /> Panel yüklənir…
      </div>
    );

  if (!session)
    return (
      <div className="ad-login">
        <a className="ad-back" href="/">
          <ArrowLeft size={16} /> Sayta qayıt
        </a>
        <div className="ad-login-card">
          <BrandIdentity href="/" className="ad-brand-identity" />
          <span className="ad-eyebrow">JAYHUN TECH / İDARƏETMƏ</span>
          <h1>
            Xoş gəlmisiniz<span>.</span>
          </h1>
          <p>
            Tədris, tələbələr və saytınız — bir paneldə.
            <br />
            Davam etmək üçün hesabınıza daxil olun.
          </p>
          <form onSubmit={login}>
            <label htmlFor="username">İstifadəçi adı</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              required
              placeholder="İstifadəçi adınız"
            />
            <label htmlFor="password">Parol</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Parolunuz"
              maxLength={256}
            />
            {loginError && (
              <div className="ad-alert" role="alert">
                {loginError}
              </div>
            )}
            <button className="ad-btn ad-primary" disabled={busy}>
              {busy ? 'Daxil olunur…' : 'Panelə daxil ol'}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="ad-login-note">
            <ShieldCheck size={15} /> Yalnız səlahiyyətli idarəçilər üçün
          </div>
        </div>
        <span className="ad-login-footer">Jayhun Tech · Tədrisin idarə olunması</span>
      </div>
    );

  const current = navigation.find((n) => n.id === section)!;
  const Icon = current.icon;
  const collection = section !== 'dashboard' && section !== 'settings' ? section : null;

  const stats = dashboard
    ? [
        {
          label: 'Ümumi müraciət',
          value: dashboard.registrations,
          detail: `${dashboard.newRegistrations} yeni müraciət`,
          icon: Users,
          to: 'registrations',
        },
        {
          label: 'Aktiv dərs qrupu',
          value: dashboard.groups,
          detail: 'Tədrisi davam edən qruplar',
          icon: GraduationCap,
          to: 'groups',
        },
        {
          label: 'Yayımlanan kurs',
          value: dashboard.courses,
          detail: 'Saytda görünən istiqamətlər',
          icon: BookOpen,
          to: 'courses',
        },
        {
          label: 'Qiymətləndirmə',
          value: dashboard.results,
          detail: 'Qeydə alınmış nəticələr',
          icon: ClipboardList,
          to: 'results',
        },
      ]
    : [];

  return (
    <div className="ad-app">
      <aside className={`ad-sidebar ${menu ? 'ad-sidebar-open' : ''}`}>
        <BrandIdentity
          href="/admin"
          name={settings.brandName || 'Jayhun Tech'}
          logoUrl={settings.logoUrl || ''}
          className="ad-brand-identity"
        />
        <div className="ad-workspace">
          <span className="ad-workspace-icon">
            <GraduationCap size={19} />
          </span>
          <div>
            Tədris mərkəzi<small>İdarəçi iş sahəsi</small>
          </div>
          <span className="ad-online-dot" />
        </div>
        <span className="ad-nav-caption">İDARƏETMƏ</span>
        <nav aria-label="Admin naviqasiyası">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={section === item.id ? 'ad-nav-active' : ''}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={18} />
              {item.label}
              {section === item.id && <span />}
            </button>
          ))}
        </nav>
        <div className="ad-sidebar-bottom">
          <div>
            <span className="ad-avatar">{session.username.slice(0, 1).toUpperCase()}</span>
            <span>
              {session.username}
              <small>Administrator</small>
            </span>
            <button className="ad-icon" aria-label="Hesabdan çıx" onClick={logout}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      {menu && (
        <button className="ad-overlay" aria-label="Menyunu bağla" onClick={() => setMenu(false)} />
      )}
      <div className="ad-work">
        <header className="ad-topbar">
          <div>
            <button
              className="ad-icon ad-menu"
              aria-label="Menyunu aç"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={21} />
            </button>
            <span>İdarə paneli</span>
            <ChevronRight size={13} />
            <strong>{current.label}</strong>
          </div>
          <a href="/" target="_blank" rel="noopener noreferrer" className="ad-visit">
            Sayta bax <ArrowUpRight size={16} />
          </a>
        </header>
        <main className="ad-main">
          <div className="ad-page-heading">
            <div>
              <span className="ad-eyebrow">
                <Icon size={13} />{' '}
                {section === 'dashboard'
                  ? 'SİZİN TƏDRİS MƏRKƏZİNİZ'
                  : 'MƏLUMATLARIN İDARƏ OLUNMASI'}
              </span>
              <h1>
                {collection
                  ? definitions[collection].title
                  : section === 'settings'
                    ? 'Sayt məzmunu'
                    : 'Hər şey nəzarətinizdə.'}
              </h1>
              <p>
                {collection
                  ? definitions[collection].description
                  : section === 'settings'
                    ? 'Mətnləri və görünən bölmələri kod yazmadan yeniləyin.'
                    : 'Tələbələrinizi izləyin, dərsləri planlaşdırın, inkişafı görün.'}
              </p>
            </div>
            {collection && (
              <button className="ad-btn ad-primary" onClick={() => openEditor(collection)}>
                <Plus size={17} /> {definitions[collection].singular} əlavə et
              </button>
            )}
            {section === 'dashboard' && (
              <span className="ad-today">
                <CalendarDays size={16} />
                {formatDate(new Date().toISOString()).split(',')[0]}
              </span>
            )}
          </div>
          {notice && (
            <div className="ad-toast" role="status">
              <Check size={18} />
              {notice}
              <button
                className="ad-icon"
                onClick={() => setNotice('')}
                aria-label="Bildirişi bağla"
              >
                <X size={15} />
              </button>
            </div>
          )}
          {error && (
            <div className="ad-alert" role="alert">
              {error}
            </div>
          )}
          {loading ? (
            <div className="ad-loading">
              <span className="ad-spinner" /> Məlumatlar yüklənir…
            </div>
          ) : (
            <>
              {section === 'dashboard' && dashboard && (
                <>
                  <div className="ad-stats">
                    {stats.map((s, i) => (
                      <button
                        key={s.label}
                        className={`ad-stat ${i === 0 ? 'ad-stat-featured' : ''}`}
                        onClick={() => navigate(s.to as Section)}
                      >
                        <div>
                          {s.label}
                          <s.icon size={20} />
                        </div>
                        <strong>{s.value}</strong>
                        <span>
                          {s.detail}
                          <ArrowUpRight size={15} />
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="ad-dashboard-grid">
                    <section className="ad-panel">
                      <div className="ad-panel-heading">
                        <div>
                          <h2>Son müraciətlər</h2>
                          <p>Yeni tanışlıqlar, yeni başlanğıclar.</p>
                        </div>
                        <button className="ad-text-btn" onClick={() => navigate('registrations')}>
                          Hamısına bax <ArrowRight size={14} />
                        </button>
                      </div>
                      {dashboard.recent.length ? (
                        <div className="ad-recent-list">
                          {dashboard.recent.map((r: Row) => (
                            <button key={r.id} onClick={() => navigate('registrations')}>
                              <span className="ad-student-avatar">{r.name.slice(0, 1)}</span>
                              <div>
                                <strong>{r.name}</strong>
                                <small>{r.email}</small>
                              </div>
                              <Badge value={r.status} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="ad-empty">
                          <Users size={30} />
                          <h3>İlk müraciəti gözləyirik</h3>
                          <p>Saytdan daxil olan müraciətlər burada görünəcək.</p>
                          <button
                            className="ad-text-btn"
                            onClick={() => openEditor('registrations')}
                          >
                            Əl ilə tələbə əlavə et <Plus size={15} />
                          </button>
                        </div>
                      )}
                    </section>
                    <section className="ad-panel">
                      <div className="ad-panel-heading">
                        <div>
                          <h2>Yaxınlaşan imtahanlar</h2>
                          <p>Bakı vaxtı ilə planlaşdırılır.</p>
                        </div>
                        <CalendarDays size={21} />
                      </div>
                      {dashboard.upcoming.length ? (
                        <div className="ad-exam-list">
                          {dashboard.upcoming.map((e: Row) => (
                            <button key={e.id} onClick={() => navigate('exams')}>
                              <span className="ad-exam-day">
                                {new Intl.DateTimeFormat('az-AZ', {
                                  day: '2-digit',
                                  timeZone: 'Asia/Baku',
                                }).format(new Date(e.scheduled_at))}
                              </span>
                              <div>
                                <strong>{e.title}</strong>
                                <small>
                                  {e.group_name} · {formatDate(e.scheduled_at)}
                                </small>
                              </div>
                              <ChevronRight size={16} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="ad-empty">
                          <CalendarDays size={30} />
                          <h3>Təqviminiz hələ boşdur</h3>
                          <p>Qruplar üçün ilk imtahanı planlaşdırın.</p>
                          <button className="ad-text-btn" onClick={() => openEditor('exams')}>
                            İmtahan əlavə et <Plus size={15} />
                          </button>
                        </div>
                      )}
                    </section>
                  </div>
                  <div className="ad-banner">
                    <span>
                      <FileText size={25} />
                    </span>
                    <div>
                      <h3>Dərs materiallarını bir yerdə saxlayın.</h3>
                      <p>Sənədlər, fayllar və linkləri qruplarınıza uyğun təşkil edin.</p>
                    </div>
                    <button className="ad-btn" onClick={() => navigate('materials')}>
                      Vəsaitlərə keç <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              )}
              {collection && (
                <section className="ad-panel ad-data-panel">
                  <div className="ad-toolbar">
                    <div className="ad-search">
                      <Search size={17} />
                      <input
                        aria-label="Siyahıda axtar"
                        placeholder="Axtarış…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <div className="ad-toolbar-right">
                      {STATUS_FILTER_SECTIONS.includes(collection) && (
                        <select
                          aria-label="Status filtri"
                          value={filter}
                          onChange={(e) => {
                            setFilter(e.target.value);
                            setPage(1);
                          }}
                        >
                          <option value="">Bütün statuslar</option>
                          {definitions[collection].fields
                            .find((f) => f.key === 'status')
                            ?.options?.map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                        </select>
                      )}
                      {collection === 'registrations' && (
                        <a
                          className="ad-btn ad-secondary"
                          href={`${API_BASE}/api/admin/registrations.csv`}
                        >
                          <ArrowDownToLine size={15} /> CSV ixrac
                        </a>
                      )}
                      <span className="ad-record-count">{data.total} qeyd</span>
                    </div>
                  </div>
                  {data.items.length ? (
                    <div className="ad-table-wrap">
                      <table className="ad-table">
                        <thead>
                          <tr>
                            {TABLE_HEADS[collection].map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                            <th className="ad-actions-heading">Əməliyyatlar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.items.map((row) => (
                            <tr key={row.id}>
                              {renderCells(collection, row)}
                              <td>
                                <div className="ad-row-actions">
                                  {collection === 'groups' && (
                                    <button
                                      className="ad-icon"
                                      aria-label={`${row.name} tələbələri`}
                                      title="Tələbələri idarə et"
                                      onClick={() => manageMembers(row)}
                                    >
                                      <Users size={16} />
                                    </button>
                                  )}
                                  <button
                                    className="ad-icon"
                                    aria-label={`${rowLabel(row)} redaktə et`}
                                    title="Redaktə et"
                                    onClick={() => openEditor(collection, row)}
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    className="ad-icon ad-danger-icon"
                                    aria-label={`${rowLabel(row)} sil`}
                                    title="Sil"
                                    onClick={() => remove(collection, row)}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="ad-empty ad-empty-large">
                      <Icon size={36} />
                      <h3>
                        {query || filter
                          ? 'Uyğun nəticə tapılmadı'
                          : 'Hələ məlumat əlavə edilməyib'}
                      </h3>
                      <p>
                        {query || filter
                          ? 'Axtarış və filtr seçimlərini dəyişin.'
                          : `İlk ${definitions[collection].singular.toLocaleLowerCase('az')} məlumatını əlavə edərək başlayın.`}
                      </p>
                      {!query && !filter && (
                        <button
                          className="ad-btn ad-secondary"
                          onClick={() => openEditor(collection)}
                        >
                          <Plus size={16} />
                          Əlavə et
                        </button>
                      )}
                    </div>
                  )}
                  <div className="ad-pagination">
                    <span>
                      {data.total === 0
                        ? '0'
                        : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, data.total)}`}{' '}
                      / {data.total} qeyd
                    </span>
                    <div>
                      <button
                        className="ad-icon"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        aria-label="Əvvəlki səhifə"
                      >
                        <ChevronLeft size={17} />
                      </button>
                      <span>Səhifə {page}</span>
                      <button
                        className="ad-icon"
                        disabled={page * pageSize >= data.total}
                        onClick={() => setPage((p) => p + 1)}
                        aria-label="Növbəti səhifə"
                      >
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  </div>
                </section>
              )}
              {section === 'settings' && (
                <form className="ad-settings-form" onSubmit={saveSettings}>
                  {settingsSections.map((sectionGroup) => (
                    <section className="ad-panel ad-settings-section" key={sectionGroup.title}>
                      <div>
                        <h2>{sectionGroup.title}</h2>
                        <p>{sectionGroup.description}</p>
                      </div>
                      <div className="ad-form-grid">
                        {sectionGroup.fields.some((field) => field.key === 'brandName') && (
                          <LogoEditor
                            settings={settings}
                            setSettings={setSettings}
                            request={request}
                          />
                        )}
                        {sectionGroup.fields.some((field) => field.key === 'instructorName') && (
                          <InstructorPhotoEditor
                            settings={settings}
                            setSettings={setSettings}
                            request={request}
                          />
                        )}
                        {sectionGroup.fields.map((field) => (
                          <FieldInput
                            key={field.key}
                            field={field}
                            value={settings[field.key]}
                            onChange={(v) => setSettings((s) => ({ ...s, [field.key]: v }))}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                  <ContentExtras settings={settings} setSettings={setSettings} request={request} />
                  <div className="ad-settings-save">
                    <p>Yadda saxlanılan dəyişikliklər serverli saytda görünür.</p>
                    <button className="ad-btn ad-primary" disabled={saving}>
                      <Save size={17} />
                      {saving ? 'Saxlanılır…' : 'Məzmunu yadda saxla'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </main>
        <footer className="ad-footer">
          Jayhun Tech · İdarəetmə paneli
          <span>
            <span className="ad-online-dot" /> Tədrisi birlikdə idarə edək.
          </span>
        </footer>
      </div>
      {editor && (
        <Modal
          title={`${definitions[editor.type].singular} ${editor.id ? 'redaktəsi' : 'əlavə et'}`}
          onClose={() => {
            if (!saving) setEditor(null);
          }}
        >
          <form onSubmit={save}>
            <div className="ad-dialog-body">
              <div className="ad-form-grid">
                {definitions[editor.type].fields.map((field) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    value={field.key === 'tags' ? (draft.tags || []).join('\n') : draft[field.key]}
                    onChange={(v) => update(field.key, field.key === 'tags' ? v.split('\n') : v)}
                    choices={fieldChoices(field)}
                    disabled={
                      (editor.type === 'courses' && field.key === 'id' && !!editor.id) ||
                      (editor.type === 'results' &&
                        field.key === 'score' &&
                        draft.status === 'absent')
                    }
                  />
                ))}
              </div>
              {editor.type === 'courses' && (
                <ModulesEditor
                  modules={draft.modules || []}
                  onChange={(modules) => update('modules', modules)}
                />
              )}
              {editor.type === 'materials' && (
                <div className="ad-file-field">
                  <label htmlFor="material-file">Fayl əlavə et və ya dəyiş (maksimum 10 MB)</label>
                  <input
                    id="material-file"
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.png,.jpg,.jpeg,.mp4"
                    onChange={(e) => {
                      const next = e.target.files?.[0] || null;
                      if (next && next.size > 10 * 1024 * 1024) {
                        setEditError('Fayl 10 MB-dan böyükdür.');
                        e.target.value = '';
                        setFile(null);
                      } else {
                        setFile(next);
                        setEditError('');
                      }
                    }}
                  />
                  {draft.file_name && editor.id && (
                    <div className="ad-current-file">
                      <a href={`${API_BASE}/api/admin/materials/${editor.id}/file`}>
                        {draft.file_name}
                      </a>
                      <button
                        className="ad-text-btn ad-danger-icon"
                        type="button"
                        onClick={removeMaterialFile}
                      >
                        Faylı sil
                      </button>
                    </div>
                  )}
                  <small>Fayllar yalnız admin girişi ilə endirilir.</small>
                </div>
              )}
              {editor.type === 'results' && draft.exam_id && (
                <p className="ad-form-hint">
                  Maksimum: {options.exams.find((e: Row) => e.id === draft.exam_id)?.max_score} bal.
                  Keçid: {options.exams.find((e: Row) => e.id === draft.exam_id)?.pass_score} bal.
                </p>
              )}
              {editError && (
                <div className="ad-alert" role="alert">
                  {editError}
                </div>
              )}
            </div>
            <div className="ad-dialog-footer">
              <button
                type="button"
                className="ad-btn ad-secondary"
                onClick={() => setEditor(null)}
                disabled={saving}
              >
                Ləğv et
              </button>
              <button className="ad-btn ad-primary" disabled={saving}>
                <Save size={16} />
                {saving ? 'Saxlanılır…' : 'Yadda saxla'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {group && (
        <Modal
          title={`${group.name} — tələbələr`}
          onClose={() => {
            if (!saving) setGroup(null);
          }}
        >
          <div className="ad-dialog-body">
            <div className="ad-members-summary">
              <span>
                <Users size={18} />
                {members.length} / {group.capacity} tələbə
              </span>
              <Badge value={group.status} />
            </div>
            <form className="ad-member-form" onSubmit={addMember}>
              <label htmlFor="add-student">Qrupa tələbə əlavə et</label>
              <div>
                <select
                  id="add-student"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                >
                  <option value="">Tələbəni seçin</option>
                  {options.students
                    .filter(
                      (s: Row) =>
                        !members.some((m) => m.id === s.id) &&
                        (s.course === group.course_id || s.course === 'undecided'),
                    )
                    .map((s: Row) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.email}
                      </option>
                    ))}
                </select>
                <button className="ad-btn ad-primary" disabled={saving}>
                  <Plus size={16} />
                  Əlavə et
                </button>
              </div>
            </form>
            {memberError && (
              <div className="ad-alert" role="alert">
                {memberError}
              </div>
            )}
            <div className="ad-member-list">
              {members.length ? (
                members.map((m) => (
                  <div key={m.id}>
                    <span className="ad-student-avatar">{m.name.slice(0, 1)}</span>
                    <div>
                      <strong>{m.name}</strong>
                      <small>{m.email}</small>
                    </div>
                    <button
                      className="ad-icon ad-danger-icon"
                      aria-label={`${m.name} qrupdan çıxar`}
                      onClick={() => removeMember(m.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="ad-form-hint">Bu qrupa hələ tələbə əlavə edilməyib.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
