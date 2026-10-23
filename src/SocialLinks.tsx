import { Instagram, Linkedin } from 'lucide-react';
import { useContent } from './content';

function WhatsAppIcon(_props: { size?: number; 'aria-hidden'?: string | boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-4.9A8.5 8.5 0 1 1 20.5 11.5Z" />
      <path
        d="m8 7 1.5 3-1 1c1 2 2.5 3.5 4.5 4.5l1-1 3 1.5c0 1.5-1.5 2-2.5 1.5-4-1.5-7-4.5-8.5-8.5C5.5 8 6.5 7 8 7Z"
        transform="translate(1 -1) scale(.9)"
      />
    </svg>
  );
}

export default function SocialLinks() {
  const { settings } = useContent();
  const links = [
    { name: 'WhatsApp', href: settings.whatsappUrl, Icon: WhatsAppIcon, style: 'whatsapp' },
    { name: 'LinkedIn', href: settings.linkedinUrl, Icon: Linkedin, style: 'linkedin' },
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
          <Icon size={20} aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
