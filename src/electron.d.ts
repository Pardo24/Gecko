export {};

declare global {
  interface Window {
    electron: {
      checkDocker:    () => Promise<'running' | 'installed' | 'missing'>;
      startDocker:    () => Promise<void>;
      pickFolder:     () => Promise<string | null>;
      install:        (config: unknown) => Promise<{ failedSteps: Array<{ step: number; error: string }> }>;
      openExternal:   (url: string) => void;
      getConfig:      () => Promise<Record<string, string> & { vpnEnabled: boolean } | null>;
      getStatus:      () => Promise<'running' | 'stopped'>;
      startStack:     () => Promise<void>;
      stopStack:      () => Promise<void>;
      getLocalIp:     () => Promise<string>;
      resetInstall:   () => Promise<void>;
      addVpn:         (cfg: { mullvadKey: string; mullvadAddress: string }) => Promise<void>;
      removeVpn:      () => Promise<void>;
      getVersion:     () => Promise<string>;
      getDiskStats:      (path: string) => Promise<{ freeBytes: number; totalBytes: number } | null>;
      onInstallProgress: (cb: (step: number) => void) => void;
    };
  }
}
