import { useEffect } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import './admin.css';
import BrandIdentity from '../BrandIdentity';

export default function PagesAdmin() {
  const adminUrl = import.meta.env.VITE_ADMIN_URL || '';
  useEffect(() => {
    document.title = 'Jayhun Tech — Admin panel';
  }, []);
  return (
    <main className="ad-login">
      <a className="ad-back" href={import.meta.env.BASE_URL}>
        <ArrowLeft size={16} /> Sayta qayıt
      </a>
      <div className="ad-login-card">
        <BrandIdentity href={import.meta.env.BASE_URL} className="ad-brand-identity" />
        <span className="ad-eyebrow">JAYHUN TECH / İDARƏETMƏ</span>
        <h1>
          Admin panel<span>.</span>
        </h1>
        <p>Tələbələr, kurslar, dərs qrupları, vəsaitlər və imtahan nəticələri — bir paneldə.</p>
        {adminUrl ? (
          <>
            <p>Hesabınıza daxil olmaq üçün idarəetmə serverinə keçin.</p>
            <a className="ad-btn ad-primary ad-gateway-link" href={adminUrl}>
              Panelə daxil ol <ArrowRight size={18} />
            </a>
          </>
        ) : (
          <>
            <div className="ad-alert" role="status">
              <strong>Server bağlantısı hələ qurulmayıb.</strong>
              <br />
              Admin panelindən istifadə üçün məlumatları saxlayan server aktivləşdirilməlidir.
              Hazırda hesabınıza daxil olmaq və məlumatları idarə etmək mümkün deyil.
            </div>
            <a
              className="ad-btn ad-secondary ad-gateway-link"
              href="https://github.com/NurlanSafarli/ceyhunlms#admin-paneli-server%C9%99-yerl%C9%99%C5%9Fdirm%C9%99k"
            >
              Serveri qoşmaq üçün təlimat <ArrowRight size={18} />
            </a>
          </>
        )}
        <div className="ad-login-note">
          <ShieldCheck size={15} /> Yalnız səlahiyyətli idarəçilər üçün
        </div>
      </div>
      <span className="ad-login-footer">Jayhun Tech · Tədrisin idarə olunması</span>
    </main>
  );
}
