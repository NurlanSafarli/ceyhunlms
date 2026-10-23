import { Instagram } from 'lucide-react';
import { useContent } from './content';

type BrandIconProps = { size?: number; 'aria-hidden'?: string | boolean };

function WhatsAppIcon({ size = 22 }: BrandIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.52 3.48A11.87 11.87 0 0 0 12.05 0C5.47 0 .11 5.35.1 11.93c0 2.1.55 4.16 1.6 5.98L0 24l6.25-1.64a11.94 11.94 0 0 0 5.8 1.48h.01c6.58 0 11.94-5.35 11.94-11.93a11.86 11.86 0 0 0-3.48-8.43ZM12.06 21.83h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.71.97.99-3.62-.24-.37a9.9 9.9 0 0 1-1.52-5.29c0-5.47 4.45-9.92 9.93-9.92a9.86 9.86 0 0 1 7.02 2.91 9.86 9.86 0 0 1 2.9 7.02c0 5.47-4.45 9.89-9.95 9.89Zm5.45-7.42c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.11 3.22 5.11 4.52.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

function LinkedInIcon({ size = 22 }: BrandIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124ZM7.119 20.452H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
    </svg>
  );
}

export default function SocialLinks() {
  const { settings } = useContent();
  const links = [
    { name: 'WhatsApp', href: settings.whatsappUrl, Icon: WhatsAppIcon, style: 'whatsapp' },
    { name: 'LinkedIn', href: settings.linkedinUrl, Icon: LinkedInIcon, style: 'linkedin' },
    { name: 'Instagram', href: settings.instagramUrl, Icon: Instagram, style: 'instagram' },
  ].filter(({ href }) => {
    try {
      const url = new URL(href);
      return url.protocol === 'https:' && !url.username && !url.password;
    } catch {
      return false;
    }
  });
  if (!links.length) return null;
  return (
    <div className="social-links" role="group" aria-label="Sosial şəbəkələr">
      {links.map(({ name, href, Icon, style }) => (
        <a
          key={name}
          href={href}
          className={`social-link social-${style}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${name} (yeni pəncərədə)`}
          title={name}
        >
          <Icon size={22} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
