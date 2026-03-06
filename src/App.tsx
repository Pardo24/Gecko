import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { LangProvider, useT } from './LangContext';
import type { Lang } from './i18n';
import appIcon from '../assets/icons/icons/png/64x64.png';
import StepWelcome from './steps/StepWelcome';
import StepDocker from './steps/StepDocker';
import StepStorage from './steps/StepStorage';
import StepAdmin from './steps/StepAdmin';
import StepVpn from './steps/StepVpn';
import StepInstalling from './steps/StepInstalling';
import StepDone from './steps/StepDone';
import Dashboard from './Dashboard';

export type Config = {
  dataPath: string;
  adminPassword: string;
  subtitleLangs: string[];
  vpnEnabled: boolean;
  mullvadKey: string;
  mullvadAddress: string;
};

const STEPS = ['welcome', 'docker', 'storage', 'admin', 'vpn', 'installing', 'done'] as const;
type Step = typeof STEPS[number];

const SETUP_STEPS = ['docker', 'storage', 'admin', 'vpn'] as const;
type SetupStep = typeof SETUP_STEPS[number];

const LANGS: { code: Lang; label: string }[] = [
  { code: 'ca', label: 'CA' },
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
];

function LangBar() {
  const { lang, setLang } = useT();
  return (
    <div className="flex justify-end items-center px-4 py-2 gap-1 shrink-0">
      {LANGS.map(({ code, label }) => (
        <button key={code} onClick={() => setLang(code)} className={`lang-btn ${lang === code ? 'active' : ''}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Wizard({ onInstalled }: { onInstalled: () => void }) {
  const { t } = useT();
  const [step, setStep] = useState<Step>('welcome');
  const [config, setConfig] = useState<Config>({
    dataPath: '', adminPassword: '', subtitleLangs: [], vpnEnabled: false, mullvadKey: '', mullvadAddress: '',
  });

  const next = () => {
    const idx = STEPS.indexOf(step);
    if (step === 'done') { onInstalled(); return; }
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const updateConfig = (partial: Partial<Config>) => setConfig(prev => ({ ...prev, ...partial }));
  const stepProps = { config, updateConfig, next };

  const sidebarIdx = SETUP_STEPS.indexOf(step as SetupStep);
  const showSidebar = sidebarIdx !== -1;

  const sidebarLabels = [
    t.setup_label_docker,
    t.setup_label_storage,
    t.setup_label_account,
    t.setup_label_vpn,
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left sidebar — only for config steps */}
      {showSidebar && (
        <div className="setup-sidebar">
          <div className="setup-logo">
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent-g)', overflow: 'hidden', flexShrink: 0 }}>
              <img src={appIcon} alt="Gecko" style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'screen' }} />
            </div>
            Gecko
          </div>
          <div>
            <p className="setup-step-counter">{t.setup_step} {sidebarIdx + 1} {t.setup_step_of} 4</p>
            <div className="setup-steps-list">
              {SETUP_STEPS.map((s, i) => (
                <div key={s} className={`setup-step-item ${i < sidebarIdx ? 'done' : i === sidebarIdx ? 'active' : ''}`}>
                  <div className="setup-step-num">{i < sidebarIdx ? <Check size={13} strokeWidth={3} /> : i + 1}</div>
                  <span>{sidebarLabels[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Right content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {step === 'installing' && (
          <div className="progress-track shrink-0" style={{ borderRadius: 0 }}>
            <div className="progress-fill" style={{ width: `${(STEPS.indexOf(step) / (STEPS.length - 2)) * 100}%` }} />
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {step === 'welcome'    && <StepWelcome    {...stepProps} />}
          {step === 'docker'     && <StepDocker     {...stepProps} />}
          {step === 'storage'    && <StepStorage    {...stepProps} />}
          {step === 'admin'      && <StepAdmin      {...stepProps} />}
          {step === 'vpn'        && <StepVpn        {...stepProps} />}
          {step === 'installing' && <StepInstalling {...stepProps} />}
          {step === 'done'       && <StepDone       {...stepProps} />}
        </div>
      </div>
    </div>
  );
}

type Mode = 'loading' | 'wizard' | 'dashboard';

function Root() {
  const [mode, setMode] = useState<Mode>('loading');
  const [installedConfig, setInstalledConfig] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    window.electron.getConfig().then((cfg: Record<string, string> | null) => {
      if (cfg) { setInstalledConfig(cfg); setMode('dashboard'); }
      else setMode('wizard');
    });
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {mode !== 'dashboard' && <LangBar />}

      {mode === 'loading' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-7 h-7 border-2 border-t-transparent rounded-full spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      )}

      {mode === 'wizard' && (
        <Wizard onInstalled={() => {
          window.electron.getConfig().then((cfg: Record<string, string> | null) => {
            setInstalledConfig(cfg);
            setMode('dashboard');
          });
        }} />
      )}

      {mode === 'dashboard' && installedConfig && (
        <Dashboard
          initialConfig={installedConfig}
          onReinstall={() => setMode('wizard')}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <Root />
    </LangProvider>
  );
}
