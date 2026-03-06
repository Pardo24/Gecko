import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import type { Config } from '../App';
import { useT } from '../LangContext';

type Props = { config: Config; updateConfig: (p: Partial<Config>) => void; next: () => void };

const SUBTITLE_LANGS = [
  { code: 'ca', label: 'Català' },
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
];

export default function StepAdmin({ config, updateConfig, next }: Props) {
  const { t, lang } = useT();
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);

  const selectedLangs = config.subtitleLangs.length > 0 ? config.subtitleLangs : [lang];

  const toggleLang = (code: string) => {
    const current = config.subtitleLangs.length > 0 ? config.subtitleLangs : [lang];
    const updated = current.includes(code)
      ? current.filter(l => l !== code)
      : [...current, code];
    if (updated.length === 0) return; // keep at least one
    updateConfig({ subtitleLangs: updated });
  };

  const handleNext = () => {
    if (config.adminPassword.length < 6) { setError(t.admin_err_short); return; }
    if (config.adminPassword !== confirm) { setError(t.admin_err_match); return; }
    if (config.subtitleLangs.length === 0) updateConfig({ subtitleLangs: [lang] });
    next();
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 px-8 text-center py-6">
      <div className="flex flex-col items-center gap-4">
        <div className="step-icon teal"><Lock size={38} strokeWidth={1.5} /></div>
        <div>
          <h2 className="text-3xl font-bold mb-1">{t.admin_title}</h2>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{t.admin_sub}</p>
        </div>
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>
          {t.admin_user_label} <span className="font-mono font-semibold" style={{ color: 'var(--accent)' }}>admin</span>{t.admin_user_suffix}
        </p>
      </div>

      <div style={{ width: 320 }} className="space-y-5">
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            placeholder={t.admin_password}
            value={config.adminPassword}
            onChange={e => { updateConfig({ adminPassword: e.target.value }); setError(''); }}
            className="input-field"
            style={{ paddingRight: 44 }}
          />
          <button
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: 'var(--text-3)' }}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            placeholder={t.admin_confirm}
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setError(''); }}
            className="input-field"
            style={{ paddingRight: 44 }}
          />
          <button
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: 'var(--text-3)' }}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Subtitle language selector */}
      <div style={{ width: 320 }} className="space-y-3 text-left">
        <div>
          <p className="text-sm font-semibold">{t.admin_subtitle_title}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{t.admin_subtitle_desc}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {SUBTITLE_LANGS.map(({ code, label }) => {
            const active = selectedLangs.includes(code);
            return (
              <button
                key={code}
                onClick={() => toggleLang(code)}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
                  border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                  background: active ? 'rgba(var(--accent-rgb,13,148,136),0.08)' : 'var(--surface)',
                  color: active ? 'var(--accent)' : 'var(--text-2)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{t.admin_subtitle_hint}</p>
      </div>

      <button onClick={handleNext} disabled={!config.adminPassword || !confirm} className="btn-primary">
        {t.continue}
      </button>
    </div>
  );
}