import { NativeModulesProxy } from 'expo-modules-core';

import type { NativeVpnBridge, NativeVpnStartOptions, NativeVpnStatusEvent } from '../types';

type NativePulseVpnBridge = {
  isAvailable?: () => Promise<boolean>;
  prepare?: () => Promise<void>;
  start?: (options: Record<string, unknown>) => Promise<void>;
  stop?: () => Promise<void>;
  getStatus?: () => Promise<NativeVpnStatusEvent>;
  tcpConnect?: (host: string, port: number, timeoutMs: number) => Promise<number>;
};

function getNativeModule(): NativePulseVpnBridge | undefined {
  return NativeModulesProxy.PulseVpnBridge as NativePulseVpnBridge | undefined;
}

export const pulseVpnBridge: NativeVpnBridge = {
  async isAvailable() {
    return Boolean(getNativeModule()?.isAvailable);
  },

  async prepare() {
    const bridge = getNativeModule();
    if (!bridge?.prepare) {
      throw new Error('PulseVpnBridge is unavailable. Build a custom development client.');
    }
    await bridge.prepare();
  },

  async start(options: NativeVpnStartOptions) {
    const bridge = getNativeModule();
    if (!bridge?.start) {
      throw new Error('PulseVpnBridge is unavailable. Build a custom development client.');
    }
    await bridge.start(options as unknown as Record<string, unknown>);
  },

  async stop() {
    const bridge = getNativeModule();
    if (!bridge?.stop) {
      throw new Error('PulseVpnBridge is unavailable. Build a custom development client.');
    }
    await bridge.stop();
  },

  async getStatus() {
    const bridge = getNativeModule();
    if (!bridge?.getStatus) {
      return { status: 'disconnected' };
    }
    return bridge.getStatus();
  },

  async tcpConnect(host: string, port: number, timeoutMs: number) {
    const bridge = getNativeModule();
    if (!bridge?.tcpConnect) {
      throw new Error('Native TCP probe is unavailable.');
    }
    return bridge.tcpConnect(host, port, timeoutMs);
  },
};
