import { Headphones, Server, Wifi, Cloud, ShieldCheck, Monitor } from 'lucide-react';
export type SolutionVisualType = 'support' | 'systems' | 'networks' | 'cloud' | 'security';
export default function SolutionVisual({ kind = 'support' }: { kind?: string }) {
  const Icon =
    { support: Headphones, systems: Server, networks: Wifi, cloud: Cloud, security: ShieldCheck }[
      kind
    ] || Monitor;
  return (
    <div className={`solution-visual solution-visual-${kind}`} aria-hidden="true">
      <span className="solution-orbit" />
      <span className="solution-orbit solution-orbit-two" />
      <span className="solution-main-icon">
        <Icon size={40} strokeWidth={1.6} />
      </span>
      <span className="solution-signal signal-one" />
      <span className="solution-signal signal-two" />
      <span className="solution-signal signal-three" />
    </div>
  );
}
