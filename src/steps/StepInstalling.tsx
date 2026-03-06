import { useEffect, useState } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import type { Config } from '../App';
import { useT } from '../LangContext';
import ServiceIcon from '../components/ServiceIcon';
import type { ServiceName } from '../components/ServiceIcon';

type Props = { config: Config; updateConfig: (p: Partial<Config>) => void; next: () => void };

// Maps step number → service card info
const SERVICE_STEPS: Record<number, { name: ServiceName | null; emoji?: string }> = {
  3:  { name: 'Jellyfin' },
  4:  { name: 'qBittorrent' },
  5:  { name: 'Radarr' },
  6:  { name: 'Sonarr' },
  7:  { name: null, emoji: '🎵' }, // Lidarr — no icon available
  8:  { name: 'Prowlarr' },
  9:  { name: 'Bazarr' },
  10: { name: 'Jellyseerr' },
};

// Maps autoSetup failed step numbers to service names (steps 4-10)
const STEP_SERVICE: Record<number, string> = {
  4: 'qBittorrent',
  5: 'Radarr',
  6: 'Sonarr',
  7: 'Lidarr',
  8: 'Prowlarr',
  9: 'Bazarr',
  10: 'Jellyseerr',
};

const SERVICE_STEP_NUMBERS = [3, 4, 5, 6, 7, 8, 9, 10];

export default function StepInstalling({ config, next }: Props) {
  const { t } = useT();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [failedSteps, setFailedSteps] = useState<Array<{ step: number; error: string }>>([]);
  const total = t.installing_stages.length;

  useEffect(() => {
    window.electron.onInstallProgress((s: number) => setStep(s));

    const run = async () => {
      try {
        const result = await window.electron.install(config);
        setStep(total - 1);
        if (result.failedSteps.length > 0) {
          setFailedSteps(result.failedSteps);
        } else {
          setTimeout(next, 1200);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    };
    run();
  }, []);

  // ── Catastrophic error ────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-6 px-8 text-center py-6">
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'rgba(239,68,68,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <XCircle size={36} style={{ color: '#ef4444' }} />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#ef4444', marginBottom: 8 }}>
            {t.installing_error_title}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{t.installing_error_note}</p>
        </div>
        <div style={{
          width: '100%', maxWidth: 440,
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 12, padding: '12px 16px',
        }}>
          <p className="font-mono text-xs leading-relaxed text-left" style={{ color: 'var(--text-2)', wordBreak: 'break-all' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  // ── Partial success — some steps failed after all retries ─────
  if (failedSteps.length > 0) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-6 px-8 text-center py-6">
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'rgba(234,179,8,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={36} style={{ color: '#ca8a04' }} />
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ marginBottom: 6 }}>
            {t.installing_warn_title}
          </h2>
          <p className="text-sm max-w-sm" style={{ color: 'var(--text-2)' }}>
            {t.installing_warn_desc}
          </p>
        </div>
        <div style={{
          width: '100%', maxWidth: 380,
          background: 'rgba(234,179,8,0.07)',
          border: '1px solid rgba(234,179,8,0.25)',
          borderRadius: 12, padding: '14px 16px',
          textAlign: 'left',
        }}>
          <p className="text-xs font-semibold" style={{ color: '#ca8a04', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t.installing_warn_manual}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {failedSteps.map(({ step: s, error }) => (
              <div key={s}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <AlertTriangle size={13} style={{ color: '#ca8a04', flexShrink: 0 }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {STEP_SERVICE[s] ?? `Step ${s}`}
                  </span>
                </div>
                <p className="font-mono text-xs leading-relaxed" style={{
                  color: 'var(--text-3)', wordBreak: 'break-all',
                  paddingLeft: 21,
                }}>
                  {error}
                </p>
              </div>
            ))}
          </div>
        </div>
        <button className="btn-primary" onClick={next}>
          {t.installing_warn_continue}
        </button>
      </div>
    );
  }

  const isServiceStep = step >= 3;
  const serviceInfo = SERVICE_STEPS[step];
  const stageLabel = t.installing_stages[step] ?? t.installing_stages[t.installing_stages.length - 1];

  // ── Installing ────────────────────────────────────────────────
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 px-8 text-center py-6">

      {/* Header — always visible */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <h2 className="text-2xl font-bold">{t.installing_title}</h2>
        <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
          {t.installing_note}
        </p>
      </div>

      {/* Card — different for prep vs service steps */}
      {!isServiceStep ? (
        /* Prep steps 0–2 */
        <div style={{
          width: '100%', maxWidth: 360,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          boxShadow: 'var(--shadow-md)',
          padding: '32px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          animation: 'slideUp 0.4s ease both',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'var(--accent-g)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem',
            animation: 'spin 3s linear infinite',
            boxShadow: '0 6px 20px rgba(13,148,136,0.35)',
          }}>⚙️</div>
          <div>
            <p className="font-semibold text-base" style={{ color: 'var(--text)' }}>{stageLabel}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
              {t.installing_prep_step} {step + 1} / 3
            </p>
          </div>
        </div>
      ) : (
        /* Service configuration steps 3–10 */
        <div
          key={step}
          style={{
            width: '100%', maxWidth: 360,
            background: 'var(--surface)',
            border: '1.5px solid rgba(13,148,136,0.2)',
            borderRadius: 20,
            boxShadow: '0 4px 20px rgba(13,148,136,0.12)',
            padding: '28px 24px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            animation: 'slideUp 0.35s cubic-bezier(0.22,1,0.36,1) both',
          }}
        >
          {/* Service icon */}
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(13,148,136,0.08)',
            border: '1.5px solid rgba(13,148,136,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {serviceInfo?.name ? (
              <ServiceIcon name={serviceInfo.name} size={48} />
            ) : (
              <span style={{ fontSize: '2.2rem' }}>{serviceInfo?.emoji ?? '⚙️'}</span>
            )}
          </div>

          {/* Label + spinner */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <p className="font-bold text-lg" style={{ color: 'var(--text)' }}>
              {serviceInfo?.name ?? 'Lidarr'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                border: '2px solid var(--accent)', borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite', flexShrink: 0,
              }} />
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>{stageLabel}</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress dots — service steps only */}
      <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
        {SERVICE_STEP_NUMBERS.map(s => (
          <div
            key={s}
            style={{
              width: s === step ? 20 : 7,
              height: 7,
              borderRadius: 99,
              background: s < step
                ? 'var(--accent)'
                : s === step
                  ? 'var(--accent)'
                  : 'rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              opacity: s > step ? 0.4 : 1,
            }}
          />
        ))}
      </div>

    </div>
  );
}
