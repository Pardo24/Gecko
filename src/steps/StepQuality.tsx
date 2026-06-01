import { Sparkles, Tv, MonitorPlay, Languages } from 'lucide-react';
import type { Config } from '../App';
import { useT } from '../LangContext';

type Props = { config: Config; updateConfig: (p: Partial<Config>) => void; next: () => void };

// A single selectable option card (radio-style). Mirrors the visual idiom of
// StepInstallTarget: card-sm, teal accent when selected.
function OptionCard({
  icon, title, desc, selected, onClick,
}: {
  icon: React.ReactNode; title: string; desc: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card-sm w-full px-4 py-3 flex items-start gap-3 transition-all hover:shadow-md text-left"
      style={{
        cursor: 'pointer',
        borderColor: selected ? 'var(--accent)' : undefined,
        background:  selected ? 'rgba(13,148,136,0.05)' : undefined,
      }}
    >
      <div style={{ color: selected ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0, marginTop: 2 }}>
        {icon}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="font-medium text-sm">{title}</span>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{desc}</span>
      </div>
    </button>
  );
}

export default function StepQuality({ config, updateConfig, next }: Props) {
  const { t } = useT();

  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-6 px-8 py-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="step-icon teal"><Sparkles size={38} strokeWidth={1.5} /></div>
        <div>
          <h2 className="text-2xl font-bold mb-1">{t.quality_title}</h2>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{t.quality_sub}</p>
        </div>
      </div>

      <div className="w-full max-w-md space-y-5">
        {/* Question 1: viewing device */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
            {t.quality_device_q}
          </p>
          <OptionCard
            icon={<MonitorPlay size={20} strokeWidth={1.75} />}
            title={t.quality_device_modern_title}
            desc={t.quality_device_modern_desc}
            selected={config.qualityDevice === 'modern'}
            onClick={() => updateConfig({ qualityDevice: 'modern' })}
          />
          <OptionCard
            icon={<Tv size={20} strokeWidth={1.75} />}
            title={t.quality_device_old_title}
            desc={t.quality_device_old_desc}
            selected={config.qualityDevice === 'old-tv'}
            onClick={() => updateConfig({ qualityDevice: 'old-tv' })}
          />
        </div>

        {/* Question 2: language preference */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
            <Languages size={13} className="inline mr-1 -mt-0.5" />{t.quality_lang_q}
          </p>
          <OptionCard
            icon={<span className="text-base">🌐</span>}
            title={t.quality_lang_both_title}
            desc={t.quality_lang_both_desc}
            selected={config.qualityLang === 'both'}
            onClick={() => updateConfig({ qualityLang: 'both' })}
          />
          <OptionCard
            icon={<span className="text-base">🎬</span>}
            title={t.quality_lang_original_title}
            desc={t.quality_lang_original_desc}
            selected={config.qualityLang === 'original'}
            onClick={() => updateConfig({ qualityLang: 'original' })}
          />
          <OptionCard
            icon={<span className="text-base">🗣️</span>}
            title={t.quality_lang_dubbed_title}
            desc={t.quality_lang_dubbed_desc}
            selected={config.qualityLang === 'dubbed'}
            onClick={() => updateConfig({ qualityLang: 'dubbed' })}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <button onClick={next} className="btn-primary">{t.quality_continue}</button>
        <button onClick={next} className="text-xs underline" style={{ color: 'var(--text-3)' }}>
          {t.quality_skip}
        </button>
      </div>
    </div>
  );
}
