import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useT } from '../LangContext';
import type { Lang } from '../i18n';
import InstallToDiskCard from '../components/InstallToDiskCard';

const LANGS: { code: Lang; label: string }[] = [
  { code: 'ca', label: 'Català' },
  { code: 'es', label: 'Castellano' },
  { code: 'en', label: 'English' },
];

type Props = { config: Record<string, string>; onReinstall: () => void };

export default function PageSettings({ config, onReinstall }: Props) {
  const { t, lang, setLang } = useT();
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [version, setVersion] = useState('…');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => { window.electron.getVersion().then(setVersion).catch(() => setVersion('—')); }, []);

  const doReinstall = async () => {
    setWorking(true);
    await window.electron.resetInstall();
    onReinstall();
  };

  return (
    <div className="flex flex-col gap-4 pt-6 px-5 pb-5">
      {/* Language */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 className="text-sm font-semibold mb-4">{t.cfg_lang_label}</h3>
        <div className="flex gap-2 flex-wrap">
          {LANGS.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              className={lang === code ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '8px 20px', minWidth: 'unset', fontSize: '0.875rem' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Version */}
      <div className="card-sm flex items-center gap-3" style={{ padding: '12px 16px' }}>
        <span className="text-sm" style={{ color: 'var(--text-2)' }}>{t.cfg_version_label}</span>
        <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text)' }}>{version}</span>
      </div>

      {/* Credentials */}
      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t.cfg_credentials_label}</h3>
          <button onClick={() => setShowPass(v => !v)} className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem', gap: 4 }}>
            {showPass ? <EyeOff size={12} /> : <Eye size={12} />}
            {showPass ? t.cfg_hide : t.cfg_show}
          </button>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{t.cfg_credentials_desc}</p>
        <div className="space-y-2">
          {[
            { service: 'Jellyfin',    user: 'admin', pass: config.JELLYFIN_ADMIN_PASSWORD || '—' },
            { service: 'qBittorrent', user: 'admin', pass: 'adminadmin' },
          ].map(row => (
            <div key={row.service} className="card-sm flex items-center gap-3" style={{ padding: '8px 14px' }}>
              <span className="text-xs font-semibold shrink-0" style={{ width: 82, color: 'var(--text-2)' }}>{row.service}</span>
              <span className="font-mono text-xs" style={{ color: 'var(--text-3)' }}>{row.user}</span>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>/</span>
              <span className="font-mono text-xs flex-1" style={{ color: 'var(--text)' }}>
                {showPass ? row.pass : '••••••••'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Install to internal disk (Gecko OS only — self-hides on others) */}
      <InstallToDiskCard />

      {/* Tutorial */}
      <div className="card-sm flex items-center gap-3" style={{ padding: '12px 16px' }}>
        <div className="flex flex-col gap-0.5 flex-1">
          <span className="text-sm font-semibold">{t.cfg_tutorial_label}</span>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>{t.cfg_tutorial_desc}</span>
        </div>
        <button
          onClick={() => { localStorage.removeItem('moss_onboarded'); window.location.reload(); }}
          className="btn-secondary"
          style={{ padding: '7px 16px', minWidth: 'unset', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
        >
          {t.cfg_tutorial_btn}
        </button>
      </div>

      {/* Reinstall */}
      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 className="text-sm font-semibold">{t.cfg_reinstall_label}</h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{t.cfg_reinstall_desc}</p>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="btn-secondary"
            style={{ borderColor: 'rgba(220,38,38,0.2)', color: '#dc2626' }}
          >
            {t.cfg_reinstall_btn}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-red-500 font-medium">{t.cfg_reinstall_confirm}</p>
            <div className="flex gap-2">
              <button
                onClick={doReinstall}
                disabled={working}
                className="btn-secondary"
                style={{ borderColor: 'rgba(220,38,38,0.4)', color: '#dc2626', background: 'rgba(220,38,38,0.05)' }}
              >
                {t.cfg_reinstall_yes}
              </button>
              <button onClick={() => setConfirming(false)} className="btn-ghost">
                {t.cancel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
