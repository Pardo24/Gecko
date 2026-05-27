import { useEffect, useState } from 'react';
import { Cpu, MemoryStick, HardDrive, Wifi, AlertTriangle, Check } from 'lucide-react';
import type { Config } from '../App';
import { useT } from '../LangContext';
import type { PreflightCheck } from '../lib/transport';
import appIcon from '../../assets/icons/icons/png/64x64.png';

type Props = { config: Config; updateConfig: (p: Partial<Config>) => void; next: () => void };

const ICONS: Record<PreflightCheck['id'], React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  ram: MemoryStick, cpu: Cpu, disk: HardDrive, network: Wifi,
};

export default function StepWelcome({ next }: Props) {
  const { t } = useT();
  const [checks, setChecks] = useState<PreflightCheck[] | null>(null);

  useEffect(() => {
    // Pre-flight is purely informational here — never blocks the user.
    // We still surface warnings so they don't get surprised later.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    window.electron.preflight().then(r => setChecks(r.checks)).catch(() => {});
  }, []);

  const anyWarning = checks?.some(c => !c.ok) ?? false;

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-8 px-8 text-center relative overflow-hidden py-6">
      <div className="hero-glow" />

      <div className="flex flex-col items-center gap-4 relative z-10">
        <div className="logo-circle" style={{ padding: 6 }}>
          <img src={appIcon} alt="Gecko" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10, mixBlendMode: 'screen' }} />
        </div>
        <div>
          <h1 className="text-5xl font-bold tracking-tight gradient-title">Gecko</h1>
          <p className="text-lg mt-2" style={{ color: 'var(--text-2)' }}>{t.welcome_subtitle}</p>
        </div>
      </div>

      <div className="card max-w-sm w-full p-5 text-left space-y-3 relative z-10">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{t.welcome_p1}</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-3)' }}>{t.welcome_p2}</p>
      </div>

      {checks && (
        <div className="card max-w-sm w-full p-3 text-left relative z-10" style={{
          background: anyWarning ? 'rgba(234,179,8,0.06)' : 'transparent',
          borderColor: anyWarning ? 'rgba(234,179,8,0.2)' : undefined,
        }}>
          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: anyWarning ? '#ca8a04' : 'var(--text-3)' }}>
            {anyWarning ? <AlertTriangle size={12} /> : <Check size={12} />}
            {anyWarning ? t.preflight_warn : t.preflight_ok}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {checks.map(c => {
              const Icon = ICONS[c.id];
              return (
                <div key={c.id} className="flex items-center gap-1.5 text-xs">
                  <Icon size={12} strokeWidth={1.5} />
                  <span style={{ color: c.ok ? 'var(--text-2)' : '#ca8a04' }} className="font-medium">{c.detail}</span>
                  {!c.ok && <span className="text-xs" style={{ color: '#ca8a04', opacity: 0.7 }}>({c.threshold})</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 relative z-10">
        <button onClick={next} className="btn-primary">{t.start}</button>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{t.welcome_footer}</p>
      </div>
    </div>
  );
}
