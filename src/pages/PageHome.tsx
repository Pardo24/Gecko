import { useState, useEffect } from 'react';
import { RefreshCw, FolderOpen, Settings, ChevronDown, ChevronUp, Download, Coffee, ShieldCheck, Power, Square } from 'lucide-react';
import { useT } from '../LangContext';
import ServiceIcon from '../components/ServiceIcon';

type Status = 'checking' | 'running' | 'stopped';
type Action  = 'idle' | 'starting' | 'stopping';

const CONFIG_DISMISSED_KEY = 'moss_config_hint_dismissed';

function StatusDot({ status }: { status: Status }) {
  const color = status === 'running' ? '#22c55e' : status === 'stopped' ? '#ef4444' : '#eab308';
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%', background: color,
      display: 'inline-block', flexShrink: 0,
      boxShadow: `0 0 6px ${color}88`,
    }} />
  );
}

const formatGB = (bytes: number) => (bytes / 1024 / 1024 / 1024).toFixed(1);

type Props = {
  config: Record<string, string>;
  onGoToVpn: () => void;
};

export default function PageHome({ config, onGoToVpn }: Props) {
  const { t } = useT();
  const [status, setStatus]   = useState<Status>('checking');
  const [action, setAction]   = useState<Action>('idle');
  const [showConfig, setShowConfig] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(
    () => localStorage.getItem(CONFIG_DISMISSED_KEY) === 'true'
  );
  const [diskStats, setDiskStats] = useState<{ freeBytes: number; totalBytes: number } | null>(null);

  const checkStatus = async () => {
    const s = await window.electron.getStatus();
    setStatus(s === 'running' ? 'running' : 'stopped');
  };

  useEffect(() => { checkStatus(); }, []);

  useEffect(() => {
    if (config.DATA_PATH) {
      window.electron.getDiskStats(config.DATA_PATH).then(setDiskStats).catch(() => {});
    }
  }, [config.DATA_PATH]);

  const handleStart = async () => {
    setAction('starting');
    try { await window.electron.startStack(); await checkStatus(); }
    finally { setAction('idle'); }
  };

  const handleStop = async () => {
    setAction('stopping');
    try { await window.electron.stopStack(); await checkStatus(); }
    finally { setAction('idle'); }
  };

  const open = (port: number) => window.electron.openExternal(`http://localhost:${port}`);

  const dismissHint = () => {
    localStorage.setItem(CONFIG_DISMISSED_KEY, 'true');
    setHintDismissed(true);
  };

  const vpnEnabled = !!config.MULLVAD_PRIVATE_KEY;

  return (
    <div className="flex flex-col gap-3 pt-5 px-5 pb-5">

      {/* Status bar */}
      <div className="card-sm flex items-center gap-3" style={{
        padding: '12px 16px',
        borderLeft: `3px solid ${status === 'running' ? '#22c55e' : status === 'stopped' ? '#ef4444' : '#eab308'}`,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: status === 'running' ? 'rgba(34,197,94,0.1)' : status === 'stopped' ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: status === 'running' ? '#22c55e' : status === 'stopped' ? '#ef4444' : '#eab308',
        }}>
          <Power size={17} strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <p className="font-bold text-sm">Gecko</p>
          <p className="text-xs" style={{
            color: status === 'running' ? '#22c55e' : status === 'stopped' ? '#ef4444' : '#eab308',
            fontWeight: 500,
          }}>
            {status === 'running' ? t.home_running : status === 'stopped' ? t.home_stopped : t.home_checking}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status !== 'running' && (
            <button onClick={handleStart} disabled={action !== 'idle'} className="btn-primary"
              style={{ padding: '7px 16px', minWidth: 'unset', fontSize: '0.82rem', gap: 6, display: 'inline-flex', alignItems: 'center' }}>
              {action === 'starting'
                ? <><RefreshCw size={12} className="spin" />{t.home_starting}</>
                : <><Power size={12} />{t.home_start}</>}
            </button>
          )}
          {status === 'running' && (
            <button onClick={handleStop} disabled={action !== 'idle'} className="btn-secondary"
              style={{ padding: '7px 12px', fontSize: '0.82rem', gap: 6, display: 'inline-flex', alignItems: 'center' }}>
              {action === 'stopping'
                ? <><RefreshCw size={12} className="spin" />{t.home_stopping}</>
                : <><Square size={10} fill="currentColor" />{t.home_stop}</>}
            </button>
          )}
          <button onClick={checkStatus} className="btn-ghost" style={{ padding: '6px 8px' }} title="Refresh">
            <RefreshCw size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { port: 8096, name: 'Jellyfin'   as const, label: t.done_cinema  },
          { port: 5055, name: 'Jellyseerr' as const, label: t.done_request },
        ].map(s => (
          <button key={s.name} onClick={() => open(s.port)} disabled={status !== 'running'}
            className="card flex flex-col items-center disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ padding: '20px 12px 14px', gap: 10, position: 'relative' }}
          >
            <span style={{ position: 'absolute', top: 10, right: 10 }}>
              <StatusDot status={status} />
            </span>
            <ServiceIcon name={s.name} size={40} />
            <div style={{ textAlign: 'center' }}>
              <p className="font-bold text-sm">{s.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-3)', marginTop: 1 }}>{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Downloads + VPN row */}
      <div className="flex gap-3">
        <div className="card-sm flex items-center justify-between" style={{ flex: 2, padding: '10px 14px' }}>
          <div className="flex items-center gap-2">
            <Download size={14} strokeWidth={2} style={{ color: 'var(--text-3)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>{t.home_downloads}</span>
          </div>
          <button onClick={() => open(8090)} disabled={status !== 'running'}
            className="card-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ padding: '5px 10px' }}>
            <ServiceIcon name="qBittorrent" size={16} />
            <span className="text-xs font-semibold">qBittorrent</span>
          </button>
        </div>

        <button onClick={onGoToVpn}
          className="card-sm flex items-center gap-2"
          style={{ flex: 1, padding: '10px 12px', textAlign: 'left' }}
        >
          <ShieldCheck size={13} strokeWidth={2} style={{ color: vpnEnabled ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0 }} />
          <span className="text-xs font-semibold flex-1" style={{ color: 'var(--text-2)' }}>VPN</span>
          <span className={`badge ${vpnEnabled ? 'running' : 'stopped'}`} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
            {vpnEnabled ? t.vpn_d_enabled : t.vpn_d_disabled}
          </span>
        </button>
      </div>

      {/* Configuration section */}
      <div className="card-sm overflow-hidden">
        <button onClick={() => setShowConfig(v => !v)}
          className="w-full flex items-center justify-between" style={{ padding: '10px 16px' }}>
          <div className="flex items-center gap-2">
            <Settings size={14} strokeWidth={2} style={{ color: 'var(--text-3)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>{t.home_tools}</span>
          </div>
          {showConfig
            ? <ChevronUp size={14} style={{ color: 'var(--text-3)' }} />
            : <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />
          }
        </button>

        {showConfig && (
          <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!hintDismissed && (
              <div className="flex items-start justify-between gap-3 rounded-xl"
                style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid rgba(13,148,136,0.2)', padding: '8px 12px' }}>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--accent)' }}>
                  {t.home_tools_hint}
                </p>
                <button onClick={dismissHint} className="text-xs shrink-0" style={{ color: 'var(--text-3)' }}>✕</button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {([
                { name: 'Radarr'   as const, port: 7878, sub: t.done_movies    },
                { name: 'Sonarr'   as const, port: 8989, sub: t.done_series    },
                { name: 'Bazarr'   as const, port: 6767, sub: t.home_subtitles },
                { name: 'Prowlarr' as const, port: 9696, sub: 'Indexers'       },
              ]).map(s => (
                <button key={s.name} onClick={() => open(s.port)} disabled={status !== 'running'}
                  className="card-sm flex flex-col items-center disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ padding: '7px 4px 6px', gap: 3 }}>
                  <ServiceIcon name={s.name} size={18} />
                  <span className="font-semibold" style={{ fontSize: '0.7rem' }}>{s.name}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>{s.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Storage card */}
      {config.DATA_PATH && (
        <div className="card-sm" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="flex items-center gap-2">
            <FolderOpen size={14} strokeWidth={1.75} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span className="text-xs truncate font-medium" style={{ color: 'var(--text-2)' }}>{config.DATA_PATH}</span>
          </div>
          {diskStats ? (
            <>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${((diskStats.totalBytes - diskStats.freeBytes) / diskStats.totalBytes * 100).toFixed(0)}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {formatGB(diskStats.totalBytes - diskStats.freeBytes)} GB used
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
                  {formatGB(diskStats.freeBytes)} GB free
                </span>
              </div>
            </>
          ) : (
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>…</span>
          )}
        </div>
      )}

      {/* Buy Me a Coffee */}
      <button
        onClick={() => window.electron.openExternal('https://buymeacoffee.com/danipardo24')}
        className="flex items-center gap-1.5 px-1 self-start"
        style={{ color: 'var(--text-3)', fontSize: '0.72rem', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s', marginTop: 6 }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
      >
        <Coffee size={11} />
        Buy me a coffee
      </button>
    </div>
  );
}
