import type { ServerConfig } from '../types';

type JsonObject = Record<string, unknown>;

export class SingBoxConfigService {
  buildConfig(server: ServerConfig): string {
    const outbound = this.buildOutbound(server);
    const config = compactObject({
      log: {
        level: 'info',
        timestamp: true,
      },
      dns: {
        servers: [
          { tag: 'cloudflare', address: '1.1.1.1' },
          { tag: 'google', address: '8.8.8.8' },
        ],
        final: 'cloudflare',
      },
      inbounds: [
        {
          type: 'tun',
          tag: 'tun-in',
          address: ['172.19.0.1/30', 'fdfe:dcba:9876::1/126'],
          mtu: 9000,
          auto_route: true,
          strict_route: true,
          stack: 'system',
          sniff: true,
        },
      ],
      outbounds: [outbound, { type: 'direct', tag: 'direct' }],
      route: {
        auto_detect_interface: true,
        final: outbound.tag,
      },
      experimental: {
        cache_file: {
          enabled: true,
          path: 'cache.db',
        },
      },
    });

    return JSON.stringify(config);
  }

  private buildOutbound(server: ServerConfig): JsonObject {
    if (server.protocol !== 'vless') {
      throw new Error(`Unsupported sing-box outbound protocol: ${server.protocol}`);
    }

    return compactObject({
      type: 'vless',
      tag: 'selected',
      server: server.host,
      server_port: server.port,
      uuid: server.uuid ?? server.username,
      flow: server.flow,
      packet_encoding: 'xudp',
      tls: this.buildTls(server),
      transport: this.buildTransport(server),
    });
  }

  private buildTls(server: ServerConfig): JsonObject | undefined {
    if (server.security === 'none') {
      return undefined;
    }

    return compactObject({
      enabled: true,
      server_name: server.sni ?? server.host,
      alpn: server.alpn,
      utls: {
        enabled: true,
        fingerprint: server.fingerprint ?? 'chrome',
      },
      reality:
        server.security === 'reality'
          ? compactObject({
              enabled: true,
              public_key: server.publicKey,
              short_id: server.shortId,
            })
          : undefined,
    });
  }

  private buildTransport(server: ServerConfig): JsonObject | undefined {
    switch (server.transport) {
      case 'tcp':
      case 'unknown':
        return undefined;
      case 'ws':
        return compactObject({
          type: 'ws',
          path: server.path ?? '/',
          headers: server.query.host ? { Host: server.query.host } : undefined,
        });
      case 'grpc':
        return compactObject({
          type: 'grpc',
          service_name: server.serviceName ?? server.query.serviceName ?? 'grpc',
        });
      case 'xhttp':
        return compactObject({
          type: 'xhttp',
          path: server.path ?? '/',
          mode: server.query.mode ?? 'auto',
          headers: server.query.host ? { Host: server.query.host } : undefined,
        });
      case 'httpupgrade':
        return compactObject({
          type: 'httpupgrade',
          path: server.path ?? '/',
          headers: server.query.host ? { Host: server.query.host } : undefined,
        });
      case 'http':
        return compactObject({
          type: 'http',
          path: server.path,
          host: server.query.host ? [server.query.host] : undefined,
        });
      case 'quic':
      case 'kcp':
        throw new Error(`Transport ${server.transport} is not enabled for iOS sing-box tunnel yet.`);
    }
  }
}

function compactObject<T extends JsonObject>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null),
  ) as T;
}

export const singBoxConfigService = new SingBoxConfigService();
