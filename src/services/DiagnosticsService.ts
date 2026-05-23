import NetInfo from '@react-native-community/netinfo';

import type { DiagnosticLogEntry, DiagnosticsSnapshot, ParseError, ProbeResult } from '../types';
import { withTimeout } from '../utils/timeout';

export interface DiagnosticsInput {
  serverCount: number;
  parseErrors: ParseError[];
  probeResults: ProbeResult[];
  connectionErrors: string[];
}

export class DiagnosticsService {
  private logs: DiagnosticLogEntry[] = [];

  log(
    level: DiagnosticLogEntry['level'],
    message: string,
    context?: Record<string, unknown>,
  ): DiagnosticLogEntry {
    const entry: DiagnosticLogEntry = {
      level,
      message,
      context,
      createdAt: new Date().toISOString(),
    };
    this.logs = [entry, ...this.logs].slice(0, 200);
    return entry;
  }

  getLogs(): DiagnosticLogEntry[] {
    return this.logs;
  }

  clearLogs(): void {
    this.logs = [];
  }

  async createSnapshot(input: DiagnosticsInput): Promise<DiagnosticsSnapshot> {
    const network = await this.checkNetwork();
    return {
      lastUpdatedAt: new Date().toISOString(),
      internetReachable: network.internetReachable,
      captivePortalLikely: network.captivePortalLikely,
      serverCount: input.serverCount,
      reachableCount: input.probeResults.filter((probe) => probe.reachable).length,
      parseErrors: input.parseErrors,
      probeResults: input.probeResults,
      connectionErrors: input.connectionErrors,
      logs: this.logs,
    };
  }

  async checkNetwork(): Promise<{ internetReachable: boolean; captivePortalLikely: boolean }> {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || netInfo.isInternetReachable === false) {
      return { internetReachable: false, captivePortalLikely: false };
    }

    try {
      const captiveResponse = await withTimeout(
        (signal) => fetch('https://www.apple.com/library/test/success.html', { signal }),
        3500,
      );
      const body = await captiveResponse.text();
      return {
        internetReachable: captiveResponse.ok,
        captivePortalLikely: !body.includes('Success'),
      };
    } catch {
      return { internetReachable: Boolean(netInfo.isConnected), captivePortalLikely: true };
    }
  }

  normalizeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Unknown error.';
  }
}

export const diagnosticsService = new DiagnosticsService();
