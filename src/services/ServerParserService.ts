import type { ParsedSubscription, ParseError, SecurityType, ServerConfig, TransportType } from '../types';
import { decodeBase64Text, looksLikeBase64Subscription } from '../utils/base64';
import { extractCountry, isForeignCountry } from '../utils/countries';
import { stableHash } from '../utils/hash';
import { parseQuery, safeDecodeURIComponent, splitHashFragment } from '../utils/url';

export interface ParseSubscriptionOptions {
  sourceUrl: string;
  localCountryCode?: string;
  fetchedAt?: string;
}

export class ServerParserService {
  parse(rawSubscription: string, options: ParseSubscriptionOptions): ParsedSubscription {
    const fetchedAt = options.fetchedAt ?? new Date().toISOString();
    const localCountryCode = options.localCountryCode ?? 'RU';
    const normalized = this.normalizeSubscription(rawSubscription);
    const lines = normalized
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('//'));

    const servers: ServerConfig[] = [];
    const parseErrors: ParseError[] = [];

    lines.forEach((line, index) => {
      try {
        servers.push(this.parseLine(line, index + 1, localCountryCode));
      } catch (error) {
        parseErrors.push({
          line: index + 1,
          input: line,
          message: error instanceof Error ? error.message : 'Unknown parser error',
        });
      }
    });

    return {
      sourceUrl: options.sourceUrl,
      fetchedAt,
      servers,
      parseErrors,
      rawLineCount: lines.length,
    };
  }

  private normalizeSubscription(rawSubscription: string): string {
    const trimmed = rawSubscription.trim();
    if (!looksLikeBase64Subscription(trimmed)) {
      return trimmed;
    }

    return decodeBase64Text(trimmed);
  }

  private parseLine(line: string, sourceLine: number, localCountryCode: string): ServerConfig {
    const protocol = line.slice(0, line.indexOf('://')).toLowerCase();

    if (protocol === 'vless') {
      return this.parseVless(line, sourceLine, localCountryCode);
    }

    throw new Error(`Unsupported protocol: ${protocol || 'unknown'}`);
  }

  private parseVless(line: string, sourceLine: number, localCountryCode: string): ServerConfig {
    const { withoutHash, fragment } = splitHashFragment(line);
    const uri = new URL(withoutHash);
    const query = parseQuery(uri.search.slice(1));
    const displayName = fragment
      ? safeDecodeURIComponent(fragment)
      : `VLESS ${uri.hostname}:${uri.port}`;
    const port = Number(uri.port);

    if (!uri.username) {
      throw new Error('Missing VLESS user id.');
    }

    if (!uri.hostname) {
      throw new Error('Missing host.');
    }

    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error(`Invalid port: ${uri.port || 'empty'}`);
    }

    const { country, countryCode } = extractCountry(displayName);
    const providerName = extractProviderName(displayName, country);
    const transport = normalizeTransport(query.type);
    const security = normalizeSecurity(query.security);

    return {
      id: stableHash(line),
      sourceLine,
      rawUri: line,
      protocol: 'vless',
      displayName,
      providerName,
      country,
      countryCode,
      host: uri.hostname,
      port,
      username: safeDecodeURIComponent(uri.username),
      uuid: safeDecodeURIComponent(uri.username),
      transport,
      security,
      flow: query.flow,
      sni: query.sni,
      publicKey: query.pbk,
      shortId: query.sid,
      fingerprint: query.fp,
      path: query.path,
      serviceName: query.serviceName,
      alpn: query.alpn?.split(',').map((value) => value.trim()).filter(Boolean),
      query,
      isForeign: isForeignCountry(countryCode, localCountryCode),
      tags: buildTags({ transport, security, countryCode }),
    };
  }
}

function normalizeTransport(value: string | undefined): TransportType {
  switch (value?.toLowerCase()) {
    case 'tcp':
    case undefined:
      return 'tcp';
    case 'ws':
      return 'ws';
    case 'grpc':
      return 'grpc';
    case 'xhttp':
      return 'xhttp';
    case 'httpupgrade':
      return 'httpupgrade';
    case 'http':
      return 'http';
    case 'quic':
      return 'quic';
    case 'kcp':
      return 'kcp';
    default:
      return 'unknown';
  }
}

function normalizeSecurity(value: string | undefined): SecurityType {
  switch (value?.toLowerCase()) {
    case 'none':
    case undefined:
      return 'none';
    case 'tls':
      return 'tls';
    case 'reality':
      return 'reality';
    default:
      return 'unknown';
  }
}

function extractProviderName(displayName: string, country?: string): string | undefined {
  const withoutFlag = displayName.replace(/[\u{1F1E6}-\u{1F1FF}]/gu, '').trim();
  const separator = /\s+(?:-|--|\u2014)\s+/u;
  const parts = withoutFlag.split(separator).map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return parts[1]?.replace(/#\d+$/u, '').trim() || undefined;
  }

  if (country && withoutFlag.toLowerCase().startsWith(country.toLowerCase())) {
    return withoutFlag.slice(country.length).replace(/#\d+$/u, '').trim() || undefined;
  }

  return undefined;
}

function buildTags(input: { transport: TransportType; security: SecurityType; countryCode?: string }): string[] {
  return [input.transport, input.security, input.countryCode?.toLowerCase()].filter(
    (tag): tag is string => Boolean(tag),
  );
}

export const serverParserService = new ServerParserService();
