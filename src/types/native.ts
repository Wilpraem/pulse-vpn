import type { ServerConfig, VpnConnectionStatus } from './vpn';

export interface NativeVpnStartOptions {
  server: ServerConfig;
  singBoxConfig: string;
  appGroupIdentifier: string;
}

export interface NativeVpnStatusEvent {
  status: VpnConnectionStatus;
  message?: string;
}

export interface NativeVpnBridge {
  isAvailable(): Promise<boolean>;
  prepare(): Promise<void>;
  start(options: NativeVpnStartOptions): Promise<void>;
  stop(): Promise<void>;
  getStatus(): Promise<NativeVpnStatusEvent>;
}
