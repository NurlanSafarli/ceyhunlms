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
  async function photo(file: File | null) {
    setError('');
    setMessage('');
    if (
      file &&
      (file.size > 5 * 1024 * 1024 ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    ) {
      setError('JPG, PNG və ya WebP seçin. Maksimum həcm: 5 MB.');
      return;
    }
    setBusy(true);
    try {
      const result = await request(
        '/instructor-photo',
        file
          ? {
              method: 'PUT',
              headers: { 'Content-Type': 'application/octet-stream' },
              body: file,
            }
          : { method: 'DELETE' },
      );
      setSettings((current) => ({ ...current, instructorPhotoUrl: result.instructorPhotoUrl }));
      setMessage(file ? 'Şəkil yükləndi və saytda yayımlandı.' : 'Şəkil silindi.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ad-wide ad-instructor-upload">
      <h3>Müəllimin şəkli</h3>
      <p>JPG, PNG və ya WebP, maksimum 5 MB. Şəkil seçilən kimi yüklənir və saytda görünür.</p>
      <div className="ad-photo-editor">
        {settings.instructorPhotoUrl && (
          <img src={settings.instructorPhotoUrl} alt="Müəllimin şəkli — önbaxış" />
        )}
        <label className="ad-field" htmlFor="instructor-photo">
          Şəkil əlavə et və ya dəyiş
        </label>
        <input
          id="instructor-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void photo(file);
          }}
        />
        {settings.instructorPhotoUrl && (
          <button
            type="button"
            className="ad-btn ad-secondary"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Müəllimin şəkli silinsin?')) void photo(null);
            }}
          >
            Şəkli sil
          </button>
        )}
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
                { id: crypto.randomUUID(), title: '', description: '', published: true },
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
