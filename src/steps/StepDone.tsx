import { useState } from 'react';
import { Sparkles, Lock, ChevronUp, ChevronDown, HelpCircle, Lightbulb, BookOpen, ExternalLink, CheckCircle2, PlayCircle } from 'lucide-react';
import type { Config } from '../App';
import { useT } from '../LangContext';
import ServiceIcon from '../components/ServiceIcon';

// Screencast on adding more Prowlarr indexers. Replace with a dedicated
// Gecko video when recorded; for now it points at the written guide, which
// covers the same ground with screenshots.
const INDEXER_VIDEO_URL = 'https://gecko.nubul.art/guia.html#serveis';

type Props = { config: Config; updateConfig: (p: Partial<Config>) => void; next: () => void };
type VpnState = 'idle' | 'loading' | 'ok' | 'error';

export default function StepDone({ config, next }: Props) {
  const { t } = useT();
  const open = (url: string) => window.electron.openExternal(url);

  const [showVpn, setShowVpn] = useState(false);
  const [vpnKey, setVpnKey] = useState('');
  const [vpnAddress, setVpnAddress] = useState('');
  const [vpnState, setVpnState] = useState<VpnState>('idle');

  const handleAddVpn = async () => {
    setVpnState('loading');
    try {
      await window.electron.addVpn({ mullvadKey: vpnKey, mullvadAddress: vpnAddress });
      setVpnState('ok');
    } catch {
      setVpnState('error');
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-5 px-8 text-center py-6">
      <div className="flex flex-col items-center gap-3">
        <Sparkles size={48} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
        <h2 className="text-3xl font-bold gradient-title">{t.done_title}</h2>
        <p className="text-sm max-w-md" style={{ color: 'var(--text-2)' }}>{t.done_desc}</p>
      </div>

      {/* Service buttons */}
      <div className="grid grid-cols-2 gap-2.5 w-full max-w-md">
        {([
          { url: 'http://localhost:8096', name: 'Jellyfin',   sub: t.done_cinema  },
          { url: 'http://localhost:5055', name: 'Jellyseerr', sub: t.done_request },
          { url: 'http://localhost:7878', name: 'Radarr',     sub: t.done_movies  },
          { url: 'http://localhost:8989', name: 'Sonarr',     sub: t.done_series  },
        ] as const).map(s => (
          <button
            key={s.name}
            onClick={() => open(s.url)}
            className="card-sm flex flex-col items-center gap-2 px-4 py-4 transition-all hover:shadow-md"
          >
            <ServiceIcon name={s.name} size={32} />
            <span className="font-semibold text-sm">{s.name}</span>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>{s.sub}</span>
          </button>
        ))}
      </div>

      {/* Indexer block — primary CTA */}
      <div className="card w-full max-w-md text-left" style={{ border: '1.5px solid var(--accent)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 16px 12px', background: 'rgba(var(--accent-rgb,13,148,136),0.05)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <ServiceIcon name="Prowlarr" size={18} />
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)' }}>{t.done_indexer_title}</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.55 }}>
            {t.done_indexer_p1}<strong style={{ color: 'var(--text)' }}>{t.done_indexer_bold}</strong>{t.done_indexer_p2}
          </p>
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Already-included: Internet Archive (pre-configured, 100% legal) */}
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: 10, padding: '10px 12px',
          }}>
            <CheckCircle2 size={15} style={{ color: '#16a34a', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{t.done_indexer_preadded_title}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.55 }}>{t.done_indexer_preadded}</p>
            </div>
          </div>

          {/* What is an indexer */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <HelpCircle size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{t.done_indexer_what_title}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.55 }}>{t.done_indexer_what}</p>
            </div>
          </div>

          {/* Main CTA */}
          <button onClick={() => open('http://localhost:9696')} className="btn-primary w-full" style={{ justifyContent: 'center', minWidth: 'unset' }}>
            <ExternalLink size={13} />{t.done_indexer_btn}
          </button>

          {/* Video walkthrough */}
          <button
            onClick={() => open(INDEXER_VIDEO_URL)}
            className="btn-ghost w-full"
            style={{ justifyContent: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--accent)' }}
          >
            <PlayCircle size={14} />{t.done_indexer_video_btn}
          </button>

          {/* Tips */}
          <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Lightbulb size={13} style={{ color: 'var(--accent)' }} />
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)' }}>{t.done_indexer_tips_title}</p>
            </div>
            {([t.done_indexer_tip_1, t.done_indexer_tip_2, t.done_indexer_tip_3] as string[]).map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 7, marginBottom: i < 2 ? 6 : 0, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}>{i + 1}.</span>
                <p style={{ fontSize: '0.73rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{tip}</p>
              </div>
            ))}
            <button
              onClick={() => open('https://wiki.servarr.com/prowlarr/indexers')}
              className="btn-ghost"
              style={{ marginTop: 8, padding: '4px 0', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent)' }}
            >
              <BookOpen size={12} />{t.done_indexer_wiki_btn}
            </button>
          </div>

          <p style={{ fontSize: '0.68rem', color: 'var(--text-3)', lineHeight: 1.5 }}>{t.done_indexer_disclaimer}</p>
        </div>
      </div>

      {/* Add VPN section (shown if not enabled) */}
      {!config.vpnEnabled && (
        <div className="card w-full max-w-md p-4 text-left space-y-3">
          <button
            onClick={() => setShowVpn(v => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Lock size={18} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
              <span className="font-semibold text-sm">{t.done_vpn_title}</span>
            </div>
            {showVpn ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showVpn && (
            <div className="space-y-3 pt-1">
              {vpnState === 'ok' ? (
                <p className="text-green-600 text-sm font-semibold">{t.done_vpn_success}</p>
              ) : (
                <>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                    <button onClick={() => open('https://mullvad.net')} className="font-semibold underline" style={{ color: 'var(--accent)' }}>mullvad.net</button>
                    {' '}{t.vpn_instructions}
                  </p>
                  <input type="text" placeholder={t.done_vpn_key} value={vpnKey} onChange={e => setVpnKey(e.target.value)} className="input-field mono" />
                  <input type="text" placeholder={t.done_vpn_address} value={vpnAddress} onChange={e => setVpnAddress(e.target.value)} className="input-field mono" />
                  {vpnState === 'error' && <p className="text-red-500 text-xs">{t.done_vpn_error}</p>}
                  <button
                    onClick={handleAddVpn}
                    disabled={!vpnKey || !vpnAddress || vpnState === 'loading'}
                    className="btn-primary w-full"
                    style={{ padding: '10px 24px', minWidth: 'unset' }}
                  >
                    {vpnState === 'loading' ? '...' : t.done_vpn_btn}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <button onClick={next} className="btn-primary">{t.continue}</button>

      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{t.done_network}</p>
    </div>
  );
}
