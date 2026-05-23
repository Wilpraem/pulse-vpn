import type { ProbeMethod, ProbeOptions, ProbeResult, ServerConfig } from '../types';
import { mapWithConcurrency } from '../utils/concurrency';
import { jitter, median } from '../utils/latency';
import { isAbortError, withTimeout } from '../utils/timeout';
import { nativeTcpConnect } from '../native/NativeNetworkProbe';

export interface ServerProbeServiceOptions extends Partial<ProbeOptions> {
  signal?: AbortSignal;
}

export class ServerProbeService {
  async probeServers(
    servers: ServerConfig[],
    options: ServerProbeServiceOptions = {},
  ): Promise<ProbeResult[]> {
    const concurrency = options.concurrency ?? 8;
    return mapWithConcurrency(servers, concurrency, (server) => this.probeServer(server, options));
  }

  async probeServer(server: ServerConfig, options: ServerProbeServiceOptions = {}): Promise<ProbeResult> {
    const attempts = Math.max(1, options.attempts ?? 3);
    const timeoutMs = options.timeoutMs ?? 2500;
    const latencies: number[] = [];
    const methods: ProbeMethod[] = [];
    const errors: string[] = [];

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (options.signal?.aborted) {
        break;
      }

      try {
        const result = await this.probeOnce(server, timeoutMs, options.signal);
        latencies.push(result.latencyMs);
        methods.push(result.method);
      } catch (error) {
        if (isAbortError(error)) {
          errors.push('Probe aborted.');
          break;
        }

        errors.push(error instanceof Error ? error.message : 'Unknown probe error.');
      }
    }

    const latencyMs = median(latencies);

    return {
      serverId: server.id,
      host: server.host,
      port: server.port,
      reachable: latencies.length > 0,
      latencyMs,
      jitterMs: jitter(latencies),
      method: resolveProbeMethod(methods),
      attempts,
      successfulAttempts: latencies.length,
      latencies,
      error: latencies.length > 0 ? undefined : compactErrors(errors),
      testedAt: new Date().toISOString(),
    };
  }

  private async probeOnce(
    server: ServerConfig,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<{ latencyMs: number; method: ProbeMethod }> {
    try {
      const latencyMs = await withTimeout(
        () => nativeTcpConnect(server.host, server.port, timeoutMs),
        timeoutMs,
        signal,
      );
      return { latencyMs, method: 'tcp' };
    } catch (nativeError) {
      return this.httpFallbackProbe(server, timeoutMs, signal, nativeError);
    }
  }

  private async httpFallbackProbe(
    server: ServerConfig,
    timeoutMs: number,
    signal: AbortSignal | undefined,
    nativeError: unknown,
  ): Promise<{ latencyMs: number; method: ProbeMethod }> {
    const scheme = server.security === 'none' ? 'http' : 'https';
    const startedAt = Date.now();

    try {
      await withTimeout(
        async (timeoutSignal) => {
          await fetch(`${scheme}://${server.host}:${server.port}/`, {
            method: 'HEAD',
            cache: 'no-store',
            signal: timeoutSignal,
          });
        },
        timeoutMs,
        signal,
      );
      return { latencyMs: Math.max(1, Date.now() - startedAt), method: 'http' };
    } catch (fallbackError) {
      const nativeMessage = nativeError instanceof Error ? nativeError.message : String(nativeError);
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(`TCP probe failed: ${nativeMessage}; HTTP fallback failed: ${fallbackMessage}`);
    }
  }
}

function resolveProbeMethod(methods: ProbeMethod[]): ProbeMethod {
  if (methods.includes('tcp')) {
    return 'tcp';
  }

  return methods[0] ?? 'skipped';
}

function compactErrors(errors: string[]): string | undefined {
  const unique = [...new Set(errors.filter(Boolean))];
  if (unique.length === 0) {
    return undefined;
  }

  return unique.slice(0, 3).join(' | ');
}

export const serverProbeService = new ServerProbeService();
