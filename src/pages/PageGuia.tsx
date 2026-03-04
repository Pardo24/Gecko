import { useState } from 'react';
import { CheckCircle2, ExternalLink, KeyRound } from 'lucide-react';
import { useT } from '../LangContext';
import type { Lang } from '../i18n';
import ServiceIcon, { type ServiceName } from '../components/ServiceIcon';

const DONE_KEY = 'moss_guide_done';

type Step = {
  id: string;
  serviceName: ServiceName;
  port: number;
  title: Record<Lang, string>;
  intro: Record<Lang, string>;
  items: Record<Lang, string[]>;
  cred: Record<Lang, string>;
};

const STEPS: Step[] = [
  {
    id: 'jellyfin',
    serviceName: 'Jellyfin',
    port: 8096,
    title: { ca: 'Configurar Jellyfin', es: 'Configurar Jellyfin', en: 'Set up Jellyfin' },
    intro: {
      ca: 'El teu reproductor de cinema. Inicia sessió i afegeix les biblioteques de contingut.',
      es: 'Tu reproductor de cine. Inicia sesión y añade las bibliotecas de contenido.',
      en: 'Your cinema player. Sign in and add your media libraries.',
    },
    items: {
      ca: [
        "Obre Jellyfin i inicia sessió amb usuari admin i la teva contrasenya.",
        "L'usuari i contrasenya s'han creat automàticament durant la instal·lació.",
        'Dashboard → Libraries → Add Media Library',
        'Afegeix: Pel·lícules → /data/movies  ·  Sèries → /data/series',
      ],
      es: [
        'Abre Jellyfin e inicia sesión con usuario admin y tu contraseña.',
        'El usuario y contraseña se crearon automáticamente durante la instalación.',
        'Dashboard → Libraries → Add Media Library',
        'Añade: Películas → /data/movies  ·  Series → /data/series',
      ],
      en: [
        'Open Jellyfin and sign in with user admin and your password.',
        'The user and password were auto-created during installation.',
        'Dashboard → Libraries → Add Media Library',
        'Add: Movies → /data/movies  ·  TV Shows → /data/series',
      ],
    },
    cred: {
      ca: 'admin  ·  [la teva contrasenya de Gecko]',
      es: 'admin  ·  [tu contraseña de Gecko]',
      en: 'admin  ·  [your Gecko password]',
    },
  },
  {
    id: 'prowlarr',
    serviceName: 'Prowlarr',
    port: 9696,
    title: { ca: 'Afegir indexadors a Prowlarr', es: 'Añadir indexadores a Prowlarr', en: 'Add indexers to Prowlarr' },
    intro: {
      ca: 'Prowlarr és el cercador. Sense indexadors, Radarr i Sonarr no troben res.',
      es: 'Prowlarr es el buscador. Sin indexadores, Radarr y Sonarr no encuentran nada.',
      en: 'Prowlarr is the searcher. Without indexers, Radarr and Sonarr find nothing.',
    },
    items: {
      ca: [
        'Indexers → Add Indexer → tria els que vulguis del catàleg.',
        'Sense contrasenya — accés directe.',
        'Settings → General → API Key → Copia la clau.',
        'Necessitaràs aquesta clau als passos Radarr i Sonarr.',
      ],
      es: [
        'Indexers → Add Indexer → elige los que quieras del catálogo.',
        'Sin contraseña — acceso directo.',
        'Settings → General → API Key → Copia la clave.',
        'Necesitarás esta clave en los pasos Radarr y Sonarr.',
      ],
      en: [
        'Indexers → Add Indexer → pick whichever you want from the catalogue.',
        'No password — direct access.',
        'Settings → General → API Key → Copy the key.',
        "You'll need this key in the Radarr and Sonarr steps.",
      ],
    },
    cred: {
      ca: 'Sense contrasenya · Guarda la API Key per als passos següents',
      es: 'Sin contraseña · Guarda la API Key para los siguientes pasos',
      en: 'No password · Save the API Key for the next steps',
    },
  },
  {
    id: 'radarr',
    serviceName: 'Radarr',
    port: 7878,
    title: { ca: 'Configurar Radarr (pel·lícules)', es: 'Configurar Radarr (películas)', en: 'Configure Radarr (movies)' },
    intro: {
      ca: 'Radarr gestiona les teves pel·lícules automàticament: busca, descarrega i organitza.',
      es: 'Radarr gestiona tus películas automáticamente: busca, descarga y organiza.',
      en: 'Radarr manages your movies automatically: searches, downloads and organises.',
    },
    items: {
      ca: [
        'Settings → Download Clients → Add → qBittorrent',
        'Host: localhost  ·  Port: 8090  ·  User: admin  ·  Pass: adminadmin',
        'Settings → Indexers → Add → Prowlarr',
        'URL: http://localhost:9696  ·  API Key: la del pas 2',
      ],
      es: [
        'Settings → Download Clients → Add → qBittorrent',
        'Host: localhost  ·  Port: 8090  ·  User: admin  ·  Pass: adminadmin',
        'Settings → Indexers → Add → Prowlarr',
        'URL: http://localhost:9696  ·  API Key: la del paso 2',
      ],
      en: [
        'Settings → Download Clients → Add → qBittorrent',
        'Host: localhost  ·  Port: 8090  ·  User: admin  ·  Pass: adminadmin',
        'Settings → Indexers → Add → Prowlarr',
        'URL: http://localhost:9696  ·  API Key: from step 2',
      ],
    },
    cred: {
      ca: 'Radarr: sense contrasenya · qBittorrent: admin / adminadmin',
      es: 'Radarr: sin contraseña · qBittorrent: admin / adminadmin',
      en: 'Radarr: no password · qBittorrent: admin / adminadmin',
    },
  },
  {
    id: 'sonarr',
    serviceName: 'Sonarr',
    port: 8989,
    title: { ca: 'Configurar Sonarr (sèries)', es: 'Configurar Sonarr (series)', en: 'Configure Sonarr (TV shows)' },
    intro: {
      ca: 'Sonarr fa el mateix que Radarr però per a sèries. Mateixa configuració.',
      es: 'Sonarr hace lo mismo que Radarr pero para series. Misma configuración.',
      en: 'Sonarr does the same as Radarr but for TV shows. Same configuration.',
    },
    items: {
      ca: [
        'Settings → Download Clients → Add → qBittorrent',
        'Host: localhost  ·  Port: 8090  ·  User: admin  ·  Pass: adminadmin',
        'Settings → Indexers → Add → Prowlarr',
        'URL: http://localhost:9696  ·  API Key: la del pas 2',
      ],
      es: [
        'Settings → Download Clients → Add → qBittorrent',
        'Host: localhost  ·  Port: 8090  ·  User: admin  ·  Pass: adminadmin',
        'Settings → Indexers → Add → Prowlarr',
        'URL: http://localhost:9696  ·  API Key: la del paso 2',
      ],
      en: [
        'Settings → Download Clients → Add → qBittorrent',
        'Host: localhost  ·  Port: 8090  ·  User: admin  ·  Pass: adminadmin',
        'Settings → Indexers → Add → Prowlarr',
        'URL: http://localhost:9696  ·  API Key: from step 2',
      ],
    },
    cred: {
      ca: 'Sonarr: sense contrasenya · qBittorrent: admin / adminadmin',
      es: 'Sonarr: sin contraseña · qBittorrent: admin / adminadmin',
      en: 'Sonarr: no password · qBittorrent: admin / adminadmin',
    },
  },
  {
    id: 'jellyseerr',
    serviceName: 'Jellyseerr',
    port: 5055,
    title: { ca: 'Connectar Jellyseerr', es: 'Conectar Jellyseerr', en: 'Connect Jellyseerr' },
    intro: {
      ca: 'Jellyseerr és la interfície per demanar contingut. El connectes a Jellyfin i queda tot lligat.',
      es: 'Jellyseerr es la interfaz para pedir contenido. Lo conectas a Jellyfin y queda todo enlazado.',
      en: 'Jellyseerr is the interface for requesting content. Connect it to Jellyfin and everything links up.',
    },
    items: {
      ca: [
        "Obre Jellyseerr i segueix l'assistent inicial.",
        'Segueix les instruccions de la pantalla.',
        'Quan et demani connectar Jellyfin, usa les credencials del pas 1.',
        'admin  ·  [la teva contrasenya de Gecko]',
      ],
      es: [
        'Abre Jellyseerr y sigue el asistente inicial.',
        'Sigue las instrucciones en pantalla.',
        'Cuando te pida conectar Jellyfin, usa las credenciales del paso 1.',
        'admin  ·  [tu contraseña de Gecko]',
      ],
      en: [
        'Open Jellyseerr and follow the initial setup wizard.',
        'Follow the on-screen instructions.',
        'When asked to connect Jellyfin, use the credentials from step 1.',
        'admin  ·  [your Gecko password]',
      ],
    },
    cred: {
      ca: 'admin  ·  [la teva contrasenya de Gecko]  (les mateixes que Jellyfin)',
      es: 'admin  ·  [tu contraseña de Gecko]  (las mismas que Jellyfin)',
      en: 'admin  ·  [your Gecko password]  (same as Jellyfin)',
    },
  },
];

const SUBTITLE: Record<Lang, string> = {
  ca: 'Segueix aquests passos per posar-ho tot a punt.',
  es: 'Sigue estos pasos para configurar todo.',
  en: 'Follow these steps to get everything set up.',
};

const OPEN_LABEL: Record<Lang, string> = { ca: 'Obrir', es: 'Abrir', en: 'Open' };
const MARK_DONE:  Record<Lang, string> = { ca: 'Marcar fet', es: 'Marcar hecho', en: 'Mark done' };
const MARK_UNDO:  Record<Lang, string> = { ca: 'Desmarcar', es: 'Desmarcar', en: 'Undo' };

const DISCLAIMER: Record<Lang, string> = {
  ca: "⚠️ Gecko és una eina de gestió de serveis multimèdia. L'usuari és l'únic responsable del contingut que descarrega i de complir la legislació vigent al seu país.",
  es: '⚠️ Gecko es una herramienta de gestión de servicios multimedia. El usuario es el único responsable del contenido que descarga y de cumplir la legislación vigente en su país.',
  en: '⚠️ Gecko is a media service management tool. The user is solely responsible for the content they download and for complying with applicable law in their country.',
};

function isDetail(i: number) { return i % 2 === 1; }

export default function PageGuia() {
  const { lang } = useT();
  const [done, setDone] = useState<Set<string>>(
    () => new Set(JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]'))
  );

  const toggle = (id: string) => {
    setDone(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem(DONE_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const open = (port: number) => window.electron.openExternal(`http://localhost:${port}`);
  const completedCount = STEPS.filter(s => done.has(s.id)).length;
  const total = STEPS.length;

  return (
    <div className="flex flex-col gap-4 pt-5 px-5 pb-5">

      {/* Progress header */}
      <div className="card-sm" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{SUBTITLE[lang]}</p>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>
            {completedCount}/{total}
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${(completedCount / total) * 100}%` }} />
        </div>
      </div>

      {/* Steps */}
      {STEPS.map((step, i) => {
        const isDone = done.has(step.id);
        return (
          <div
            key={step.id}
            className="card"
            style={{
              overflow: 'hidden',
              opacity: isDone ? 0.6 : 1,
              transition: 'opacity 0.2s',
              border: isDone ? '1px solid rgba(34,197,94,0.25)' : '1px solid var(--border)',
            }}
          >
            {/* Header */}
            <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              {/* Step number */}
              <div style={{
                width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                background: isDone ? 'rgba(34,197,94,0.12)' : 'var(--accent-g)',
                color: isDone ? '#22c55e' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: '1rem',
                boxShadow: isDone ? 'none' : '0 3px 12px rgba(13,148,136,0.28)',
                transition: 'all 0.2s',
              }}>
                {isDone
                  ? <CheckCircle2 size={22} strokeWidth={2.5} />
                  : String(i + 1).padStart(2, '0')}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <ServiceIcon name={step.serviceName} size={17} />
                  <p style={{
                    fontWeight: 700, fontSize: '0.95rem', flex: 1,
                    color: isDone ? 'var(--text-3)' : 'var(--text)',
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}>
                    {step.title[lang]}
                  </p>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.45, marginBottom: 10 }}>
                  {step.intro[lang]}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => open(step.port)}
                    className="btn-secondary"
                    style={{ padding: '5px 14px', fontSize: '0.75rem', gap: 5, display: 'inline-flex', alignItems: 'center' }}
                  >
                    <ExternalLink size={11} />{OPEN_LABEL[lang]}
                  </button>
                  <button
                    onClick={() => toggle(step.id)}
                    className="btn-ghost"
                    style={{ padding: '5px 12px', fontSize: '0.75rem', color: isDone ? '#22c55e' : 'var(--text-3)' }}
                  >
                    {isDone ? `✓ ${MARK_UNDO[lang]}` : MARK_DONE[lang]}
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded content */}
            {!isDone && (
              <>
                <div style={{ height: 1, background: 'var(--border)' }} />
                <div style={{ padding: '14px 18px 16px 78px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {step.items[lang].map((item, j) => (
                      isDetail(j) ? (
                        <div key={j} style={{
                          background: 'rgba(0,0,0,0.04)', borderRadius: 7,
                          padding: '5px 11px', borderLeft: '2px solid rgba(13,148,136,0.25)',
                        }}>
                          <p style={{ fontFamily: 'monospace', fontSize: '0.69rem', color: 'var(--text-2)', lineHeight: 1.5 }}>{item}</p>
                        </div>
                      ) : (
                        <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 6,
                            background: 'rgba(13,148,136,0.1)', color: 'var(--accent)',
                            fontSize: '0.62rem', fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, marginTop: 1,
                          }}>
                            {Math.floor(j / 2) + 1}
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.55 }}>{item}</p>
                        </div>
                      )
                    ))}
                  </div>

                  {/* Credentials */}
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(13,148,136,0.06)', borderRadius: 8, padding: '8px 12px' }}>
                    <KeyRound size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-2)', fontFamily: 'monospace', lineHeight: 1.4 }}>
                      {step.cred[lang]}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Disclaimer */}
      {completedCount < total && (
        <div style={{ padding: '10px 14px', background: 'rgba(13,148,136,0.05)', border: '1px solid rgba(13,148,136,0.15)', borderRadius: 10 }}>
          <p style={{ fontSize: '0.72rem', lineHeight: 1.55, color: 'var(--text-3)' }}>{DISCLAIMER[lang]}</p>
        </div>
      )}

      {/* Celebration */}
      {completedCount === total && (
        <div className="card" style={{
          padding: '28px 24px', textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(13,148,136,0.07) 0%, rgba(20,184,166,0.03) 100%)',
          border: '1px solid rgba(13,148,136,0.22)',
          animation: 'slideUp 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          position: 'relative', overflow: 'hidden',
        }}>
          {(['✨','🎊','✨','🎉','✨','🎊'] as const).map((emoji, idx) => (
            <span key={idx} aria-hidden style={{
              position: 'absolute', fontSize: 16 + (idx % 3) * 4,
              animation: `floatUp ${1.4 + idx * 0.35}s ease-out ${idx * 0.25}s infinite`,
              left: `${8 + idx * 14}%`, bottom: '6%', pointerEvents: 'none', userSelect: 'none',
            }}>{emoji}</span>
          ))}
          <div style={{ fontSize: '2.2rem', marginBottom: 8, position: 'relative' }}>🎉</div>
          <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)', marginBottom: 4 }}>
            {lang === 'ca' ? 'Tot llest!' : lang === 'es' ? '¡Todo listo!' : "You're all set!"}
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.6 }}>
            {lang === 'ca' ? 'Gecko ja està completament configurat i llest per usar.' :
             lang === 'es' ? 'Gecko ya está completamente configurado y listo para usar.' :
             'Gecko is fully configured and ready to use.'}
          </p>
          <button
            onClick={() => window.electron.openExternal('http://localhost:5055')}
            className="btn-primary"
            style={{ animation: 'celebGlow 2s ease-in-out infinite', minWidth: 'unset', padding: '12px 28px', fontSize: '0.95rem', position: 'relative' }}
          >
            {lang === 'ca' ? 'Comença a demanar contingut!' :
             lang === 'es' ? '¡Empieza a pedir contenido!' :
             'Start requesting content!'}
          </button>
        </div>
      )}

    </div>
  );
}