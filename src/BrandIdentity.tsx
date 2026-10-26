import BrandMark from './BrandMark';

export default function BrandIdentity({
  name = 'Jayhun Tech',
  logoUrl = '',
  href = '#home',
  className = '',
}: {
  name?: string;
  logoUrl?: string;
  href?: string;
  className?: string;
}) {
  return (
    <a className={`brand ${className}`} href={href} aria-label={`${name} — ana səhifə`}>
      {logoUrl ? (
        <img className="brand-image" src={logoUrl} alt="" />
      ) : (
        <span className="brand-symbol">
          <BrandMark />
        </span>
      )}
      <span className="brand-copy">
        <span className="brand-wordmark">
          {/tech$/i.test(name.trim()) ? (
            <>
              {name
                .trim()
                .replace(/\s*tech$/i, '')
                .toLowerCase()}
              <span className="brand-tech">tech</span>
            </>
          ) : (
            name
          )}
          <span className="brand-dot">.</span>
        </span>
        <span className="brand-tagline">INNOVATE | EDUCATE | INTEGRATE</span>
      </span>
    </a>
  );
}
