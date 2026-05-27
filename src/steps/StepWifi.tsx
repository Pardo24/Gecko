import { useEffect, useState } from 'react';
import { Wifi, Cable, Lock, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { useT } from '../LangContext';
import type { WifiNetwork } from '../lib/transport';

type Props = { next: () => void };

type Status = 'loading' | 'choosing' | 'password' | 'connecting' | 'connected' | 'error';

export default function StepWifi({ next }: Props) {
  const { t } = useT();
  const [status, setStatus] = useState<Status>('loading');
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [selected, setSelected] = useState<WifiNetwork | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [ethernetActive, setEthernetActive] = useState(false);

  const refresh = async () => {
    setStatus('loading');
    setError('');
    const [s, list] = await Promise.all([
      window.electron.wifiStatus(),
      window.electron.wifiScan(),
    ]);
    if (s.ethernet) { setEthernetActive(true); setStatus('connected'); return; }
    if (s.wifi)     { setEthernetActive(false); setStatus('connected'); return; }
    setNetworks(list);
    setStatus('choosing');
  };

  useEffect(() => { void refresh(); }, []);

  const choose = (n: WifiNetwork) => {
    setSelected(n);
    setError('');
    if (n.secured) {
      setPassword('');
      setStatus('password');
    } else {
      void connect(n, '');
    }
  };

  const connect = async (n: WifiNetwork, pw: string) => {
    setStatus('connecting');
    setError('');
    const r = await window.electron.wifiConnect({ ssid: n.ssid, password: pw || undefined });
    if (r.ok) setStatus('connected');
    else      { setError(r.error ?? t.wifi_error_generic); setStatus(selected?.secured ? 'password' : 'choosing'); }
  };

  // ── Connected ──────────────────────────────────────────────
  if (status === 'connected') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-7 px-8 text-center py-6">
        <div className="step-icon teal"><CheckCircle size={38} strokeWidth={1.5} /></div>
        <div>
          <h2 className="text-3xl font-bold mb-1">{t.wifi_connected_title}</h2>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            {ethernetActive ? t.wifi_via_ethernet : `${t.wifi_via_wifi}: ${selected?.ssid ?? ''}`}
          </p>
        </div>
        <button onClick={next} className="btn-primary">{t.continue}</button>
      </div>
    );
  }

  // ── Password ───────────────────────────────────────────────
  if (status === 'password' || status === 'connecting') {
    const busy = status === 'connecting';
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-7 px-8 text-center py-6">
        <div className="step-icon teal"><Lock size={38} strokeWidth={1.5} /></div>
        <div>
          <h2 className="text-3xl font-bold mb-1">{selected?.ssid}</h2>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{t.wifi_password_sub}</p>
        </div>
        <div className="w-full max-w-md space-y-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={busy}
            className="input w-full"
            placeholder={t.wifi_password_placeholder}
            onKeyDown={e => { if (e.key === 'Enter' && selected) void connect(selected, password); }}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setStatus('choosing'); setError(''); }} disabled={busy} className="btn-secondary">
            {t.back}
          </button>
          <button
            onClick={() => selected && connect(selected, password)}
            disabled={busy || !password}
            className="btn-primary"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : t.wifi_connect}
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-4 px-8 text-center py-6">
        <Loader2 size={48} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>{t.wifi_scanning}</p>
      </div>
    );
  }

  // ── Choosing (network list) ────────────────────────────────
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 px-8 py-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="step-icon teal"><Wifi size={38} strokeWidth={1.5} /></div>
        <div>
          <h2 className="text-3xl font-bold mb-1">{t.wifi_title}</h2>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{t.wifi_sub}</p>
        </div>
      </div>

      <div className="w-full max-w-md space-y-2 max-h-[40vh] overflow-y-auto">
        {networks.length === 0 ? (
          <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>{t.wifi_none_found}</p>
        ) : networks.map(n => (
          <button
            key={n.ssid}
            onClick={() => choose(n)}
            className="card w-full px-4 py-3 flex items-center justify-between gap-3 transition-all hover:shadow-lg"
            style={{ cursor: 'pointer' }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Wifi size={20} strokeWidth={1.5} style={{ color: 'var(--accent)', opacity: 0.3 + (n.signal / 100) * 0.7 }} />
              <span className="font-medium truncate text-left">{n.ssid}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {n.secured && <Lock size={14} strokeWidth={1.5} style={{ color: 'var(--text-3)' }} />}
              <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{n.signal}%</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={refresh} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} /> {t.wifi_rescan}
        </button>
        <button onClick={next} className="btn-secondary flex items-center gap-2">
          <Cable size={14} /> {t.wifi_skip_ethernet}
        </button>
      </div>
    </div>
  );
}
