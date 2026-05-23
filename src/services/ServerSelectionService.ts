import type {
  ProbeResult,
  ServerConfig,
  ServerSelectionCandidate,
  ServerSelectionOptions,
} from '../types';

const PROTOCOL_PRIORITY: Record<string, number> = {
  vless: 0,
  trojan: 15,
  shadowsocks: 20,
  vmess: 35,
  wireguard: 40,
  hysteria: 45,
  hysteria2: 45,
  tuic: 50,
  unknown: 1000,
};

export class ServerSelectionService {
  rankServers(
    servers: ServerConfig[],
    probes: ProbeResult[],
    options: ServerSelectionOptions,
  ): ServerSelectionCandidate[] {
    const probeByServerId = new Map(probes.map((probe) => [probe.serverId, probe]));
    const candidates = servers
      .map((server) => {
        const probe = probeByServerId.get(server.id);
        return probe ? this.toCandidate(server, probe, options) : undefined;
      })
      .filter((candidate): candidate is ServerSelectionCandidate => Boolean(candidate));

    const reachable = candidates.filter((candidate) => candidate.probe.reachable);
    const foreign = reachable.filter((candidate) => candidate.server.isForeign);
    const base = options.preferForeignCountry && foreign.length > 0 ? foreign : reachable;

    return base.sort((left, right) => left.score - right.score);
  }

  selectBestServer(
    servers: ServerConfig[],
    probes: ProbeResult[],
    options: ServerSelectionOptions,
  ): ServerSelectionCandidate | undefined {
    return this.rankServers(servers, probes, options)[0];
  }

  private toCandidate(
    server: ServerConfig,
    probe: ProbeResult,
    options: ServerSelectionOptions,
  ): ServerSelectionCandidate {
    const reasons: string[] = [];
    const latency = probe.latencyMs ?? 99999;
    const jitterPenalty = probe.jitterMs ? probe.jitterMs * 0.35 : 0;
    const protocolPenalty = PROTOCOL_PRIORITY[server.protocol] ?? 500;
    const domesticPenalty = options.preferForeignCountry && !server.isForeign ? 800 : 0;
    const failurePenalty = probe.reachable ? 0 : 100000;
    const lastSuccessBonus = server.id === options.lastSuccessfulServerId ? -35 : 0;

    if (server.isForeign) {
      reasons.push('foreign-country');
    }
    if (probe.latencyMs !== undefined) {
      reasons.push(`latency-${probe.latencyMs}ms`);
    }
    if (probe.jitterMs !== undefined) {
      reasons.push(`jitter-${probe.jitterMs}ms`);
    }
    if (lastSuccessBonus < 0) {
      reasons.push('last-successful-server');
    }

    return {
      server,
      probe,
      score: latency + jitterPenalty + protocolPenalty + domesticPenalty + failurePenalty + lastSuccessBonus,
      reasons,
    };
  }
}

export const serverSelectionService = new ServerSelectionService();
