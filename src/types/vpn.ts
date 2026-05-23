export type VpnProtocol =
  | 'vless'
  | 'vmess'
  | 'trojan'
  | 'shadowsocks'
  | 'hysteria'
  | 'hysteria2'
  | 'tuic'
  | 'wireguard'
  | 'sing-box'
  | 'xray'
  | 'unknown';

export type TransportType =
  | 'tcp'
  | 'ws'
  | 'grpc'
  | 'xhttp'
  | 'httpupgrade'
  | 'http'
  | 'quic'
  | 'kcp'
  | 'unknown';

export type SecurityType = 'none' | 'tls' | 'reality' | 'unknown';

export interface ServerConfig {
  id: string;
  sourceLine: number;
  rawUri: string;
  protocol: VpnProtocol;
  displayName: string;
  providerName?: string;
  country?: string;
  countryCode?: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  uuid?: string;
  method?: string;
  transport: TransportType;
  security: SecurityType;
  flow?: string;
  sni?: string;
  publicKey?: string;
  shortId?: string;
  fingerprint?: string;
  path?: string;
  serviceName?: string;
  alpn?: string[];
  query: Record<string, string>;
  isForeign: boolean;
  tags: string[];
}

export interface ParsedSubscription {
  sourceUrl: string;
  fetchedAt: string;
  servers: ServerConfig[];
  parseErrors: ParseError[];
  rawLineCount: number;
}

export interface ParseError {
  line: number;
  input: string;
  message: string;
}

export type ProbeMethod = 'tcp' | 'http' | 'icmp' | 'skipped';

export interface ProbeResult {
  serverId: string;
  host: string;
  port: number;
  reachable: boolean;
  latencyMs?: number;
  jitterMs?: number;
  method: ProbeMethod;
  attempts: number;
  successfulAttempts: number;
  latencies: number[];
  error?: string;
  testedAt: string;
}

export type VpnConnectionStatus =
  | 'disconnected'
  | 'testing'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error';

export interface VpnConnectionState {
  status: VpnConnectionStatus;
  selectedServer?: ServerConfig;
  selectedProbe?: ProbeResult;
  connectedAt?: string;
  externalIp?: string;
  externalCountry?: string;
  error?: string;
}

export interface ConnectionAttemptResult {
  success: boolean;
  server?: ServerConfig;
  probe?: ProbeResult;
  attempts: ServerConnectionAttempt[];
  error?: string;
}

export interface ServerConnectionAttempt {
  serverId: string;
  displayName: string;
  startedAt: string;
  finishedAt: string;
  success: boolean;
  error?: string;
}

export interface ServerSelectionOptions {
  preferForeignCountry: boolean;
  localCountryCode: string;
  lastSuccessfulServerId?: string;
}

export interface ServerSelectionCandidate {
  server: ServerConfig;
  probe: ProbeResult;
  score: number;
  reasons: string[];
}

export interface ProbeOptions {
  attempts: number;
  timeoutMs: number;
  concurrency: number;
  method: ProbeMethod;
}

export interface AppSettings {
  autoSelectBestServer: boolean;
  preferForeignCountry: boolean;
  pingTimeoutMs: number;
  maxPingAttempts: number;
  probeConcurrency: number;
  debugLogsEnabled: boolean;
  localCountryCode: string;
}

export interface DiagnosticsSnapshot {
  lastUpdatedAt?: string;
  internetReachable?: boolean;
  captivePortalLikely?: boolean;
  serverCount: number;
  reachableCount: number;
  parseErrors: ParseError[];
  probeResults: ProbeResult[];
  connectionErrors: string[];
  logs: DiagnosticLogEntry[];
}

export interface DiagnosticLogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  createdAt: string;
  context?: Record<string, unknown>;
}
