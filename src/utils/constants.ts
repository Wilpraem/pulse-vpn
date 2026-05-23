import type { AppSettings } from '../types';

export const SUBSCRIPTION_URL =
  'https://gitverse.ru/api/repos/zieng2/wl/raw/branch/master/list_universal.txt';

export const APP_GROUP_IDENTIFIER = 'group.com.pulsevpn.shared';

export const PACKET_TUNNEL_BUNDLE_IDENTIFIER = 'com.pulsevpn.app.PacketTunnel';

export const DEFAULT_SETTINGS: AppSettings = {
  autoSelectBestServer: true,
  preferForeignCountry: true,
  pingTimeoutMs: 2500,
  maxPingAttempts: 3,
  probeConcurrency: 8,
  debugLogsEnabled: true,
  localCountryCode: 'RU',
};

export const NO_NETWORK_OR_BLOCKED_MESSAGE = 'Нет интернета или соединение сильно блокируется';
