import {
  MonitorCog,
  Server,
  Wifi,
  Cloud,
  ShieldCheck,
  Cctv,
  ScanBarcode,
  Settings2,
  Wrench,
  HardDrive,
  Router,
  Database,
  Video,
  Receipt,
  Puzzle,
} from 'lucide-react';

const visuals = {
  support: { main: MonitorCog, detail: Wrench },
  systems: { main: Server, detail: HardDrive },
  networks: { main: Wifi, detail: Router },
  cloud: { main: Cloud, detail: Database },
  security: { main: ShieldCheck, detail: ShieldCheck },
  surveillance: { main: Cctv, detail: Video },
  pos: { main: ScanBarcode, detail: Receipt },
  custom: { main: Settings2, detail: Puzzle },
};
export type SolutionVisualType = keyof typeof visuals;
export default function SolutionVisual({ kind = 'support' }: { kind?: string }) {
  const safeKind = Object.hasOwn(visuals, kind) ? (kind as SolutionVisualType) : 'support';
  const { main: Icon, detail: Detail } = visuals[safeKind];
  return (
    <div className={`solution-visual solution-visual-${safeKind}`} aria-hidden="true">
      <span className="solution-orbit" />
      <span className="solution-orbit solution-orbit-two" />
      <span className="solution-main-icon">
        <Icon size={40} strokeWidth={1.6} />
      </span>
      <span className="solution-detail-icon">
        <Detail size={22} strokeWidth={1.7} />
      </span>
      <span className="solution-signal signal-one" />
      <span className="solution-signal signal-two" />
      <span className="solution-signal signal-three" />
      {safeKind === 'pos' && <span className="solution-scan-line" />}
      {safeKind === 'surveillance' && <span className="solution-camera-field" />}
    </div>
  );
}
