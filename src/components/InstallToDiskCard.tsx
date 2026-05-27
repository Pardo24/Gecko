import { useEffect, useState } from 'react';
import { HardDrive, AlertTriangle, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useT } from '../LangContext';
import type { DiskInfo, InstallToDiskState } from '../lib/transport';

/**
 * Dashboard card that lets a user "move Gecko OS to an internal disk".
 * After the USB-booted device has been validated to work, this clones the
 * running rootfs to the user's chosen disk and reboots into the new install,
 * letting them remove the USB. Destructive — guarded by a model-name typing
 * confirmation.
 *
 * Only renders if capabilities.installToDisk === true (Gecko OS only).
 */
export default function InstallToDiskCard() {
  const { t } = useT();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [opened, setOpened] = useState(false);
  const [disks, setDisks] = useState<DiskInfo[]>([]);
  const [source, setSource] = useState('');
  const [selected, setSelected] = useState<DiskInfo | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [state, setState] = useState<InstallToDiskState | null>(null);
  const [error, setError] = useState('');

  // Probe capability on mount
  useEffect(() => {
    window.electron.capabilities()
      .then(c => setAvailable(c.installToDisk))
      .catch(() => setAvailable(false));
  }, []);

  // Open modal → load disks + subscribe to progress
  const openModal = async () => {
    setOpened(true);
    setError('');
    try {
      const r = await window.electron.disksList();
      setDisks(r.candidates);
      setSource(r.source);
      window.electron.onInstallToDiskProgress(setState);
      // Also poll status in case we're resuming a running operation
      window.electron.installToDiskStatus().then(s => { if (s.running) setState(s); });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const start = async () => {
    if (!selected) return;
    setError('');
    const r = await window.electron.installToDisk({
      target: selected.name,
      confirm: selected.model,
    });
    if (!r.ok) setError(r.error ?? 'unknown error');
  };

  if (available === null || available === false) return null;

  const inProgress = !!state && state.running;
  const done = !!state && state.stage === 'rebooting';
  const failed = !!state && state.stage === 'failed';

  return (
    <>
      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="flex items-center gap-3">
          <HardDrive size={20} style={{ color: 'var(--accent)' }} />
          <h3 className="text-sm font-semibold flex-1">{t.move_to_disk_title}</h3>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
          {t.move_to_disk_desc}
        </p>
        <button onClick={openModal} className="btn-secondary" style={{ alignSelf: 'flex-start' }}>
          {t.move_to_disk_btn}
        </button>
      </div>

      {opened && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card" style={{ padding: 24, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* ── Stage: progress / done / failed ─────────────────── */}
            {state && (inProgress || done || failed) && (
              <div className="flex flex-col items-center gap-4 text-center">
                {done ? (
                  <CheckCircle size={56} style={{ color: 'var(--accent)' }} />
                ) : failed ? (
                  <XCircle size={56} style={{ color: '#ef4444' }} />
                ) : (
                  <Loader2 size={48} className="animate-spin" style={{ color: 'var(--accent)' }} />
                )}
                <h3 className="text-lg font-semibold">
                  {done   ? t.move_to_disk_rebooting :
                   failed ? t.move_to_disk_failed :
                   t.move_to_disk_working}
                </h3>
                {!failed && !done && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-teal-500 h-full transition-all"
                           style={{ width: `${state.progress}%`, background: 'var(--accent)' }} />
                    </div>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>
                      {state.stage} — {state.progress}%
                      {state.totalBytes > 0 && (
                        <span> · {(state.bytesCopied / 1e9).toFixed(1)}GB / {(state.totalBytes / 1e9).toFixed(1)}GB</span>
                      )}
                    </p>
                  </>
                )}
                {failed && state.error && (
                  <p className="font-mono text-xs text-red-500 break-all">{state.error}</p>
                )}
                {done && (
                  <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                    {t.move_to_disk_remove_usb}
                  </p>
                )}
              </div>
            )}

            {/* ── Stage: picker (initial) ─────────────────────────── */}
            {!state && (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold">{t.move_to_disk_pick_title}</h3>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {t.move_to_disk_pick_desc.replace('{source}', source)}
                </p>

                {disks.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>{t.move_to_disk_no_disks}</p>
                ) : (
                  <div className="space-y-2">
                    {disks.map(d => (
                      <button
                        key={d.name}
                        onClick={() => { setSelected(d); setConfirmInput(''); }}
                        className="card-sm w-full px-4 py-3 flex items-center justify-between gap-3 transition-all hover:shadow-md text-left"
                        style={{
                          cursor: 'pointer',
                          borderColor: selected?.name === d.name ? 'var(--accent)' : undefined,
                          background:  selected?.name === d.name ? 'rgba(13,148,136,0.05)' : undefined,
                        }}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <span className="font-medium text-sm truncate">{d.model}</span>
                          <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>
                            {d.name} · {d.size} · {d.rotational ? 'HDD' : 'SSD'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selected && (
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle size={16} style={{ color: '#dc2626' }} className="shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
                        {t.move_to_disk_warn.replace('{disk}', selected.model).replace('{size}', selected.size)}
                      </p>
                    </div>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-2)' }}>
                      {t.move_to_disk_confirm_prompt.replace('{model}', selected.model)}
                    </p>
                    <input
                      type="text"
                      value={confirmInput}
                      onChange={e => setConfirmInput(e.target.value)}
                      className="input w-full font-mono text-sm"
                      placeholder={selected.model}
                      autoFocus
                    />
                  </div>
                )}

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <div className="flex justify-end gap-2">
                  <button onClick={() => setOpened(false)} className="btn-ghost">
                    {t.cancel}
                  </button>
                  <button
                    onClick={start}
                    disabled={!selected || confirmInput.trim() !== selected.model}
                    className="btn-primary"
                    style={{ background: '#dc2626', borderColor: '#dc2626' }}
                  >
                    {t.move_to_disk_start}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
