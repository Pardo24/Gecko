import { useEffect, useState } from 'react';
import { HardDrive, Usb, AlertTriangle, Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { Config } from '../App';
import { useT } from '../LangContext';
import type { DiskInfo, InstallToDiskState } from '../lib/transport';

type Props = { config: Config; updateConfig: (p: Partial<Config>) => void; next: () => void };
type Mode = 'choose' | 'pick' | 'progress';

export default function StepInstallTarget({ next }: Props) {
  const { t } = useT();
  const [mode, setMode] = useState<Mode>('choose');
  const [disks, setDisks] = useState<DiskInfo[] | null>(null);
  const [source, setSource] = useState('');
  const [selected, setSelected] = useState<DiskInfo | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [state, setState] = useState<InstallToDiskState | null>(null);
  const [error, setError] = useState('');

  // When the user picks "install to disk", load the candidate disks.
  const openPicker = async () => {
    setMode('pick');
    setError('');
    try {
      const r = await window.electron.disksList();
      setDisks(r.candidates);
      setSource(r.source);
      window.electron.onInstallToDiskProgress(setState);
      // If the user navigates back and forward, the operation may still be
      // running on the server — resume rendering progress for it.
      const status = await window.electron.installToDiskStatus();
      if (status.running || status.stage === 'rebooting' || status.stage === 'failed') {
        setState(status);
        setMode('progress');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // Subscribe to progress once a job has started.
  useEffect(() => {
    if (state && state.running) setMode('progress');
  }, [state]);

  const start = async () => {
    if (!selected) return;
    setError('');
    setMode('progress');
    const r = await window.electron.installToDisk({
      target: selected.name,
      confirm: selected.model,
    });
    if (!r.ok) {
      setError(r.error ?? 'unknown error');
      setMode('pick');
    }
  };

  const inProgress = !!state && state.running;
  const done = !!state && state.stage === 'rebooting';
  const failed = !!state && state.stage === 'failed';

  // ── Mode: progress (clone running / rebooting / failed) ──────────
  if (mode === 'progress' && state) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-6 px-8 text-center py-6">
        {done ? (
          <CheckCircle size={72} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
        ) : failed ? (
          <XCircle size={72} style={{ color: '#ef4444' }} strokeWidth={1.5} />
        ) : (
          <Loader2 size={56} className="animate-spin" style={{ color: 'var(--accent)' }} />
        )}
        <h2 className="text-2xl font-bold">
          {done ? t.move_to_disk_rebooting
            : failed ? t.move_to_disk_failed
            : t.move_to_disk_working}
        </h2>
        {inProgress && (
          <div className="w-full max-w-sm space-y-2">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${state.progress}%` }} />
            </div>
            <p className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>
              {state.stage} — {state.progress}%
              {state.totalBytes > 0 && (
                <span> · {(state.bytesCopied / 1e9).toFixed(1)}GB / {(state.totalBytes / 1e9).toFixed(1)}GB</span>
              )}
            </p>
          </div>
        )}
        {done && (
          <p className="text-sm max-w-sm" style={{ color: 'var(--text-2)' }}>
            {t.move_to_disk_remove_usb}
          </p>
        )}
        {failed && state.error && (
          <p className="font-mono text-xs max-w-md text-left break-all" style={{ color: '#ef4444' }}>
            {state.error}
          </p>
        )}
        {failed && (
          <button onClick={() => { setState(null); setMode('pick'); }} className="btn-secondary">
            {t.back}
          </button>
        )}
      </div>
    );
  }

  // ── Mode: pick (disk picker + model-name confirm) ────────────────
  if (mode === 'pick') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-5 px-8 text-center py-6">
        <div className="flex flex-col items-center gap-3">
          <div className="step-icon teal"><HardDrive size={38} strokeWidth={1.5} /></div>
          <div>
            <h2 className="text-2xl font-bold mb-1">{t.move_to_disk_pick_title}</h2>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              {t.move_to_disk_pick_desc.replace('{source}', source || '...')}
            </p>
          </div>
        </div>

        <div className="w-full max-w-md space-y-2 text-left">
          {disks === null ? (
            <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>{t.target_loading}</p>
          ) : disks.length === 0 ? (
            <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>{t.move_to_disk_no_disks}</p>
          ) : disks.map(d => (
            <button
              key={d.name}
              onClick={() => { setSelected(d); setConfirmInput(''); }}
              className="card-sm w-full px-4 py-3 flex items-center gap-3 transition-all hover:shadow-md text-left"
              style={{
                cursor: 'pointer',
                borderColor: selected?.name === d.name ? 'var(--accent)' : undefined,
                background:  selected?.name === d.name ? 'rgba(13,148,136,0.05)' : undefined,
              }}
            >
              <HardDrive size={20} strokeWidth={1.5} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="font-medium text-sm truncate">{d.model || d.name}</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>
                  {d.name} · {d.size} · {d.rotational ? 'HDD' : 'SSD'}
                </span>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="w-full max-w-md p-3 rounded-lg text-left"
               style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle size={16} style={{ color: '#dc2626' }} className="shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
                {t.move_to_disk_warn.replace('{disk}', selected.model || selected.name).replace('{size}', selected.size)}
              </p>
            </div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-2)' }}>
              {t.move_to_disk_confirm_prompt.replace('{model}', selected.model)}
            </p>
            <input
              type="text"
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              className="input-field mono"
              placeholder={selected.model}
              autoFocus
            />
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button onClick={() => { setMode('choose'); setSelected(null); setError(''); }} className="btn-secondary">
            {t.back}
          </button>
          <button
            onClick={start}
            disabled={!selected || confirmInput.trim() !== selected.model}
            className="btn-primary"
            style={{ background: '#dc2626', boxShadow: '0 4px 14px rgba(220,38,38,0.35)' }}
          >
            {t.move_to_disk_start}
          </button>
        </div>
      </div>
    );
  }

  // ── Mode: choose (the two-option fork) ───────────────────────────
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 px-8 text-center py-6">
      <div className="flex flex-col items-center gap-3">
        <div className="step-icon teal"><HardDrive size={38} strokeWidth={1.5} /></div>
        <div>
          <h2 className="text-2xl font-bold mb-1">{t.target_title}</h2>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{t.target_sub}</p>
        </div>
      </div>

      <div className="w-full max-w-md space-y-3">
        {/* Recommended: install to disk */}
        <button
          onClick={openPicker}
          className="card-sm w-full px-5 py-4 text-left transition-all hover:shadow-md"
          style={{ borderColor: 'var(--accent)', background: 'rgba(13,148,136,0.04)' }}
        >
          <div className="flex items-start gap-3">
            <HardDrive size={22} strokeWidth={1.75} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
            <div className="flex-1">
              <p className="font-semibold">
                {t.target_disk_title}
                <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(13,148,136,0.12)', color: 'var(--accent)' }}>
                  {t.target_disk_tag}
                </span>
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{t.target_disk_desc}</p>
            </div>
          </div>
        </button>

        {/* Fallback: stay on USB */}
        <button
          onClick={next}
          className="card-sm w-full px-5 py-4 text-left transition-all hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <Usb size={22} strokeWidth={1.75} style={{ color: 'var(--text-2)', flexShrink: 0, marginTop: 2 }} />
            <div className="flex-1">
              <p className="font-semibold">{t.target_usb_title}</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>{t.target_usb_desc}</p>
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 10,
                padding: '7px 10px', borderRadius: 8,
                background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.22)',
              }}>
                <AlertTriangle size={13} style={{ color: '#ca8a04', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: '0.72rem', color: '#92400e', lineHeight: 1.5 }}>{t.target_usb_warn}</p>
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
