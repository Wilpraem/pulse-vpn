import { NativeModulesProxy } from 'expo-modules-core';

interface PulseVpnBridgeModule {
  tcpConnect?: (host: string, port: number, timeoutMs: number) => Promise<number | { latencyMs: number }>;
}

function getBridge(): PulseVpnBridgeModule | undefined {
  return NativeModulesProxy.PulseVpnBridge as PulseVpnBridgeModule | undefined;
}

export async function nativeTcpConnect(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<number> {
  const bridge = getBridge();
  if (!bridge?.tcpConnect) {
    throw new Error('Native TCP probe is unavailable. Use a custom dev client or iOS build.');
  }

  const startedAt = Date.now();
  const result = await bridge.tcpConnect(host, port, timeoutMs);
  if (typeof result === 'number') {
    return Math.max(1, Math.round(result));
  }

  return Math.max(1, Math.round(result.latencyMs || Date.now() - startedAt));
}
