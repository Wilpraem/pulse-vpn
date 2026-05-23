import { requireNativeModule } from 'expo-modules-core';

type PulseVpnBridgeNativeModule = {
  isAvailable(): Promise<boolean>;
  prepare(): Promise<void>;
  start(options: Record<string, unknown>): Promise<void>;
  stop(): Promise<void>;
  getStatus(): Promise<{ status: string; message?: string }>;
  tcpConnect(host: string, port: number, timeoutMs: number): Promise<number>;
};

export default requireNativeModule<PulseVpnBridgeNativeModule>('PulseVpnBridge');
