import { pulseVpnBridge } from './PulseVpnBridge';

export async function nativeTcpConnect(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<number> {
  const result = await pulseVpnBridge.tcpConnect(host, port, timeoutMs);
  return Math.max(1, Math.round(result));
}
