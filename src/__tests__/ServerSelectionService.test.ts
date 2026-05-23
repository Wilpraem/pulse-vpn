import { describe, expect, it } from 'vitest';

import { ServerSelectionService } from '../services/ServerSelectionService';
import type { ProbeResult, ServerConfig } from '../types';

const service = new ServerSelectionService();

describe('ServerSelectionService', () => {
  it('prefers reachable foreign servers before domestic ones', () => {
    const domestic = makeServer('ru', false, 'RU');
    const foreign = makeServer('de', true, 'DE');

    const selected = service.selectBestServer(
      [domestic, foreign],
      [makeProbe(domestic, 25), makeProbe(foreign, 80)],
      { preferForeignCountry: true, localCountryCode: 'RU' },
    );

    expect(selected?.server.id).toBe('de');
  });

  it('selects the lowest latency server when both are foreign', () => {
    const germany = makeServer('de', true, 'DE');
    const finland = makeServer('fi', true, 'FI');

    const selected = service.selectBestServer(
      [germany, finland],
      [makeProbe(germany, 90), makeProbe(finland, 45)],
      { preferForeignCountry: true, localCountryCode: 'RU' },
    );

    expect(selected?.server.id).toBe('fi');
  });

  it('drops unavailable servers', () => {
    const germany = makeServer('de', true, 'DE');
    const finland = makeServer('fi', true, 'FI');

    const ranked = service.rankServers(
      [germany, finland],
      [makeProbe(germany, 80, false), makeProbe(finland, 70, false)],
      { preferForeignCountry: true, localCountryCode: 'RU' },
    );

    expect(ranked).toHaveLength(0);
  });

  it('uses the last successful server as a stable fallback', () => {
    const primary = makeServer('primary', true, 'DE');
    const fallback = makeServer('fallback', true, 'FI');

    const selected = service.selectBestServer(
      [primary, fallback],
      [makeProbe(primary, 60), makeProbe(fallback, 80)],
      { preferForeignCountry: true, localCountryCode: 'RU', lastSuccessfulServerId: 'fallback' },
    );

    expect(selected?.server.id).toBe('fallback');
  });
});

function makeServer(id: string, isForeign: boolean, countryCode: string): ServerConfig {
  return {
    id,
    sourceLine: 1,
    rawUri: `vless://user@example-${id}.com:443`,
    protocol: 'vless',
    displayName: `${countryCode} ${id}`,
    countryCode,
    host: `example-${id}.com`,
    port: 443,
    uuid: '11111111-1111-4111-8111-111111111111',
    transport: 'tcp',
    security: 'reality',
    query: {},
    isForeign,
    tags: ['tcp', 'reality', countryCode.toLowerCase()],
  };
}

function makeProbe(server: ServerConfig, latencyMs: number, reachable = true): ProbeResult {
  return {
    serverId: server.id,
    host: server.host,
    port: server.port,
    reachable,
    latencyMs: reachable ? latencyMs : undefined,
    jitterMs: 5,
    method: reachable ? 'tcp' : 'skipped',
    attempts: 3,
    successfulAttempts: reachable ? 3 : 0,
    latencies: reachable ? [latencyMs, latencyMs + 5, latencyMs - 5] : [],
    error: reachable ? undefined : 'timeout',
    testedAt: new Date(0).toISOString(),
  };
}
