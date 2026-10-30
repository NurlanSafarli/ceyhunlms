import { useState, type Dispatch, type SetStateAction } from 'react';
import type { Row } from './schema';

type Props = {
  settings: Row;
  setSettings: Dispatch<SetStateAction<Row>>;
  request: (path: string, init?: RequestInit) => Promise<any>;
};

export function InstructorPhotoEditor({ settings, setSettings, request }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function upload(files: File[]) {
    setError('');
    setMessage('');
    if (
      files.some(
        (file) =>
          file.size > 5 * 1024 * 1024 ||
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      )
    ) {
      setError('JPG, PNG və ya WebP seçin. Hər şəkil maksimum 5 MB ola bilər.');
      return;
    }
    if ((settings.instructorPhotos?.length || 0) + files.length > 8) {
      setError('Ən çox 8 şəkil əlavə edə bilərsiniz.');
      return;
    }
    setBusy(true);
    let uploaded = 0;
    try {
      for (const file of files) {
        const result = await request('/instructor-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: file,
        });
        setSettings((current) => ({ ...current, ...result }));
        uploaded++;
      }
      setMessage('Şəkil yükləndi və saytda yayımlandı.');
    } catch (e) {
      setError(`${uploaded ? `${uploaded} şəkil yükləndi. ` : ''}${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }
  async function removePhoto(id: string) {
    if (!window.confirm('Bu şəkil silinsin?')) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await request(`/instructor-photos/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setSettings((current) => ({ ...current, ...result }));
      setMessage('Şəkil silindi.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ad-wide ad-instructor-upload">
      <h3>Müəllimin şəkli</h3>
      <p>
        Bir neçə şəkil seçə bilərsiniz: maksimum 8 şəkil, hər biri 5 MB. JPG, PNG və WebP. Şəkillər
        seçilən kimi yüklənir və saytda görünür.
      </p>
      <div className="ad-photo-editor">
        <div className="ad-photo-list">
          {(settings.instructorPhotos || []).map((photo: Row, index: number) => (
            <div key={photo.id}>
              <img src={photo.url} alt={`Müəllimin şəkli ${index + 1} — önbaxış`} />
              <button
                type="button"
                className="ad-btn ad-secondary"
                disabled={busy}
                onClick={() => void removePhoto(photo.id)}
                aria-label={
                  settings.instructorPhotos.length === 1 ? 'Şəkli sil' : `Şəkil ${index + 1} sil`
                }
              >
                Şəkli sil
              </button>
            </div>
          ))}
        </div>
        <label className="ad-field" htmlFor="instructor-photo">
          Şəkillər əlavə et
        </label>
        <input
          id="instructor-photo"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            e.target.value = '';
            if (files.length) void upload(files);
          }}
        />
        {busy && <p role="status">Şəkil işlənir…</p>}
        {message && <p role="status">{message}</p>}
        {error && (
          <p role="alert" className="ad-alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ContentExtras({ settings, setSettings }: Props) {
  function change(index: number, key: string, value: string | boolean) {
    setSettings((current) => ({
      ...current,
      solutions: current.solutions.map((item: Row, i: number) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    }));
  }
  return (
    <section className="ad-panel ad-settings-section">
      <div>
        <h2>IT həllər</h2>
        <p>
          Xidmətləri əlavə edin, dəyişin və ya silin. Dəyişiklikləri aşağıdakı “Məzmunu yadda saxla”
          düyməsi ilə yayımlayın.
        </p>
      </div>
      <div className="ad-solutions-editor">
        <label className="ad-checkbox">
          <input
            type="checkbox"
            checked={!!settings.showSolutions}
            onChange={(e) => setSettings((s) => ({ ...s, showSolutions: e.target.checked }))}
          />
          IT həllər bölməsi görünsün
        </label>
        <label className="ad-field">
          IT həllər başlığı
          <input
            value={settings.solutionsTitle || ''}
            maxLength={200}
            onChange={(e) => setSettings((s) => ({ ...s, solutionsTitle: e.target.value }))}
          />
        </label>
        <label className="ad-field">
          IT həllər izahı
          <textarea
            value={settings.solutionsDescription || ''}
            onChange={(e) => setSettings((s) => ({ ...s, solutionsDescription: e.target.value }))}
          />
        </label>
        {(settings.solutions || []).map((item: Row, index: number) => (
          <fieldset className="ad-module-editor" key={item.id}>
            <legend>IT həlli {index + 1}</legend>
            <label className="ad-field">
              Xidmətin adı
              <input
                required
                maxLength={120}
                value={item.title}
                onChange={(e) => change(index, 'title', e.target.value)}
              />
            </label>
            <label className="ad-field">
              Xidmətin təsviri
              <textarea
                required
                maxLength={1500}
                value={item.description}
                onChange={(e) => change(index, 'description', e.target.value)}
              />
            </label>
            <div className="ad-field">
              <label htmlFor={`solution-visual-${item.id}`}>Animasiya növü</label>
              <select
                id={`solution-visual-${item.id}`}
                value={
                  item.visual ||
                  (
                    { support: 'support', systems: 'systems', networks: 'networks' } as Record<
                      string,
                      string
                    >
                  )[item.id] ||
                  'support'
                }
                onChange={(e) => change(index, 'visual', e.target.value)}
              >
                <option value="support">Texniki dəstək</option>
                <option value="systems">Server və sistem</option>
                <option value="networks">Şəbəkə / Wi-Fi</option>
                <option value="cloud">Bulud</option>
                <option value="security">Təhlükəsizlik</option>
                <option value="surveillance">Kamera / NVR / DVR</option>
                <option value="pos">Satış / POS sistemi</option>
                <option value="custom">Fərdi İT həlləri</option>
              </select>
            </div>
            <label className="ad-checkbox">
              <input
                type="checkbox"
                checked={item.published}
                onChange={(e) => change(index, 'published', e.target.checked)}
              />
              Saytda yayımlansın
            </label>
            <button
              type="button"
              className="ad-btn ad-secondary"
              onClick={() => {
                if (window.confirm('Bu IT həlli silinsin?'))
                  setSettings((s) => ({
                    ...s,
                    solutions: s.solutions.filter((entry: Row) => entry.id !== item.id),
                  }));
              }}
            >
              Xidməti sil
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          className="ad-btn ad-secondary"
          disabled={(settings.solutions || []).length >= 12}
          onClick={() =>
            setSettings((s) => ({
              ...s,
              solutions: [
                ...(s.solutions || []),
                {
                  id: crypto.randomUUID(),
                  title: '',
                  description: '',
                  published: true,
                  visual: 'support',
                },
              ],
            }))
          }
        >
          IT həlli əlavə et
        </button>
      </div>
    </section>
  );
}

export function LogoEditor({ settings, setSettings, request }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function save(file?: File) {
    setError('');
    setMessage('');
    if (
      file &&
      (file.size > 5 * 1024 * 1024 ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    ) {
      setError('PNG, JPG və ya WebP seçin. Maksimum ölçü: 5 MB.');
      return;
    }
    setBusy(true);
    try {
      const result = await request(
        '/logo',
        file
          ? {
              method: 'PUT',
              headers: { 'Content-Type': 'application/octet-stream' },
              body: file,
            }
          : { method: 'DELETE' },
      );
      setSettings((current) => ({ ...current, ...result }));
      setMessage(
        file ? 'Loqo yükləndi və saytda yayımlandı.' : 'Loqo silindi. Standart ikon göstəriləcək.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ad-wide ad-instructor-upload">
      <h3>Saytın loqosu</h3>
      <p>
        PNG, JPG və ya WebP, maksimum 5 MB. Şəffaf fonlu, kənar boşluqları olmayan loqo nişanı
        tövsiyə olunur. Seçilən fayl dərhal saxlanır və header/footer-də kiçik ikonu əvəz edir.
        Brend adı və narıncı şüar saxlanılır.
      </p>
      <div className="ad-photo-editor">
        {settings.logoUrl && (
          <>
            <img className="ad-logo-preview" src={settings.logoUrl} alt="Loqo — önbaxış" />
            <button
              type="button"
              className="ad-btn ad-secondary"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Loqo silinsin? Standart ikon yenidən göstəriləcək.'))
                  void save();
              }}
            >
              Loqonu sil
            </button>
          </>
        )}
        <label className="ad-field" htmlFor="site-logo">
          Loqo əlavə et / dəyiş
        </label>
        <input
          id="site-logo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void save(file);
          }}
        />
        {busy && <p role="status">Loqo yüklənir…</p>}
        {message && <p role="status">{message}</p>}
        {error && (
          <p role="alert" className="ad-alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function PartnersEditor({ settings, setSettings, request }: Props) {
  const partners: Row[] = settings.partners || [];
  function update(index: number, key: string, value: unknown) {
    setSettings((s) => ({
      ...s,
      partners: s.partners.map((item: Row, i: number) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    }));
  }
  function move(index: number, direction: number) {
    setSettings((s) => {
      const items = [...s.partners];
      [items[index], items[index + direction]] = [items[index + direction], items[index]];
      return { ...s, partners: items };
    });
  }
  return (
    <section className="ad-panel ad-settings-section">
      <div>
        <h2>Partnyorlar və müştərilər</h2>
        <p>
          Xidmət göstərdiyiniz şirkətləri əlavə edin və sıralayın. Dəyişiklikləri aşağıdakı “Məzmunu
          yadda saxla” düyməsi ilə yayımlayın.
        </p>
      </div>
      <div className="ad-form-grid">
        <label className="ad-checkbox ad-wide">
          <input
            type="checkbox"
            checked={!!settings.showPartners}
            onChange={(e) => setSettings((s) => ({ ...s, showPartners: e.target.checked }))}
          />
          Bölmə saytda görünsün
        </label>
        {(
          [
            ['partnersTitle', 'Şirkətlər bölməsinin başlığı'],
            ['partnersDescription', 'Şirkətlər bölməsinin izahı'],
            ['partnersProjectCount', 'Fərdi layihələrin sayı'],
            ['partnersProjectLabel', 'Fərdi layihələrin başlığı'],
          ] as const
        ).map(([key, label]) => (
          <label className="ad-field" key={key}>
            {label}
            <input
              value={settings[key] || ''}
              maxLength={key === 'partnersProjectCount' ? 30 : 300}
              onChange={(e) => setSettings((s) => ({ ...s, [key]: e.target.value }))}
            />
          </label>
        ))}
        {partners.map((item, index) => (
          <fieldset className="ad-wide" key={item.id}>
            <legend>Şirkət {index + 1}</legend>
            <label className="ad-field" htmlFor={`partner-${item.id}`}>
              Şirkətin adı
            </label>
            <input
              id={`partner-${item.id}`}
              value={item.name}
              required
              maxLength={160}
              onChange={(e) => update(index, 'name', e.target.value)}
            />
            <label className="ad-checkbox">
              <input
                type="checkbox"
                checked={item.published}
                onChange={(e) => update(index, 'published', e.target.checked)}
              />
              Saytda yayımlansın
            </label>
            <PartnerLogoEditor
              partner={item}
              request={request}
              onChange={(logoUrl) =>
                setSettings((s) => ({
                  ...s,
                  partners: s.partners.map((p: Row) => (p.id === item.id ? { ...p, logoUrl } : p)),
                }))
              }
            />
            <div className="ad-partner-actions">
              <button
                type="button"
                className="ad-btn ad-secondary"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                Yuxarı
              </button>
              <button
                type="button"
                className="ad-btn ad-secondary"
                disabled={index === partners.length - 1}
                onClick={() => move(index, 1)}
              >
                Aşağı
              </button>
              <button
                type="button"
                className="ad-btn ad-secondary"
                onClick={() => {
                  if (window.confirm('Bu şirkət silinsin?'))
                    setSettings((s) => ({
                      ...s,
                      partners: s.partners.filter((p: Row) => p.id !== item.id),
                    }));
                }}
              >
                Şirkəti sil
              </button>
            </div>
          </fieldset>
        ))}
        <button
          type="button"
          className="ad-btn ad-secondary"
          disabled={partners.length >= 100}
          onClick={() =>
            setSettings((s) => ({
              ...s,
              partners: [
                ...(s.partners || []),
                { id: crypto.randomUUID(), name: '', published: true, isNew: true },
              ],
            }))
          }
        >
          Şirkət əlavə et
        </button>
      </div>
    </section>
  );
}

function PartnerLogoEditor({
  partner,
  request,
  onChange,
}: {
  partner: Row;
  request: Props['request'];
  onChange: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function save(file?: File) {
    setError('');
    setMessage('');
    if (
      file &&
      (file.size > 5 * 1024 * 1024 ||
        !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    ) {
      setError('PNG, JPG və ya WebP seçin. Maksimum ölçü: 5 MB.');
      return;
    }
    setBusy(true);
    try {
      const result = await request(
        `/partners/${encodeURIComponent(partner.id)}/logo`,
        file
          ? {
              method: 'PUT',
              headers: { 'Content-Type': 'application/octet-stream' },
              body: file,
            }
          : { method: 'DELETE' },
      );
      onChange(result.logoUrl);
      setMessage(file ? 'Loqo yükləndi.' : 'Loqo silindi.');
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ad-partner-logo-editor">
      {partner.logoUrl && (
        <img
          className="ad-partner-logo-preview"
          src={partner.logoUrl}
          alt={`${partner.name} — loqo önbaxışı`}
        />
      )}
      <label className="ad-field" htmlFor={`partner-logo-${partner.id}`}>
        Şirkətin loqosu
      </label>
      <input
        id={`partner-logo-${partner.id}`}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={busy || partner.isNew}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void save(file);
        }}
      />
      <p>
        {partner.isNew
          ? 'Loqo əlavə etməzdən əvvəl yeni şirkəti “Məzmunu yadda saxla” düyməsi ilə saxlayın.'
          : 'PNG, JPG və ya WebP, maksimum 5 MB. Loqo seçilən kimi saxlanır.'}
      </p>
      {partner.logoUrl && (
        <button
          type="button"
          className="ad-btn ad-secondary"
          disabled={busy}
          onClick={() => {
            if (window.confirm('Bu şirkətin loqosu silinsin?')) void save();
          }}
        >
          Şirkətin loqosunu sil
        </button>
      )}
      {busy && <p role="status">Loqo yüklənir…</p>}
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="ad-alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
