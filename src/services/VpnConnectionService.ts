import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import type {
  AppSettings,
  ConnectionAttemptResult,
  ProbeResult,
  ServerConfig,
  ServerConnectionAttempt,
  VpnConnectionState,
} from '../types';
import { pulseVpnBridge } from '../native/PulseVpnBridge';
import { APP_GROUP_IDENTIFIER, NO_NETWORK_OR_BLOCKED_MESSAGE } from '../utils/constants';
import { withTimeout } from '../utils/timeout';
import { serverListService } from './ServerListService';
import { serverProbeService } from './ServerProbeService';
import { serverSelectionService } from './ServerSelectionService';
import { singBoxConfigService } from './SingBoxConfigService';

const LAST_SUCCESSFUL_SERVER_KEY = 'pulsevpn.last-successful-server.v1';

export interface ConnectOptions {
  settings: AppSettings;
  signal?: AbortSignal;
  onStateChange?: (state: VpnConnectionState) => void;
  onProbeResults?: (results: ProbeResult[]) => void;
}

export class VpnConnectionService {
  private state: VpnConnectionState = { status: 'disconnected' };
  private controller?: AbortController;

  getState(): VpnConnectionState {
    return this.state;
  }

  cancelActiveOperation(): void {
    this.controller?.abort();
  }

  async connect(options: ConnectOptions): Promise<ConnectionAttemptResult> {
    this.cancelActiveOperation();
    this.controller = new AbortController();
    const signal = mergeAbortSignals(this.controller.signal, options.signal);
    const connectionAttempts: ServerConnectionAttempt[] = [];

    try {
      this.setState({ status: 'testing' }, options.onStateChange);
      await this.ensureInternetReachable();

      const subscription = await serverListService.refresh({
        localCountryCode: options.settings.localCountryCode,
        timeoutMs: 10000,
        signal,
      });

      const probeResults = await serverProbeService.probeServers(subscription.servers, {
        attempts: options.settings.maxPingAttempts,
        timeoutMs: options.settings.pingTimeoutMs,
        concurrency: options.settings.probeConcurrency,
        signal,
      });
      options.onProbeResults?.(probeResults);

      const lastSuccessfulServerId = await AsyncStorage.getItem(LAST_SUCCESSFUL_SERVER_KEY);
      const ranked = serverSelectionService.rankServers(subscription.servers, probeResults, {
        preferForeignCountry: options.settings.preferForeignCountry,
        localCountryCode: options.settings.localCountryCode,
        lastSuccessfulServerId: lastSuccessfulServerId ?? undefined,
      });

      if (ranked.length === 0) {
        throw new Error(NO_NETWORK_OR_BLOCKED_MESSAGE);
      }

      this.setState({ status: 'connecting' }, options.onStateChange);

      for (const candidate of ranked.slice(0, 5)) {
        const attempt = await this.tryConnect(candidate.server, candidate.probe);
        connectionAttempts.push(attempt);

        if (attempt.success) {
          await AsyncStorage.setItem(LAST_SUCCESSFUL_SERVER_KEY, candidate.server.id);
          const external = await this.loadExternalIp();
          this.setState(
            {
              status: 'connected',
              selectedServer: candidate.server,
              selectedProbe: candidate.probe,
              connectedAt: new Date().toISOString(),
              externalIp: external.ip,
              externalCountry: external.country,
            },
            options.onStateChange,
          );

          return {
            success: true,
            server: candidate.server,
            probe: candidate.probe,
            attempts: connectionAttempts,
          };
        }
      }

      throw new Error(
        connectionAttempts.at(-1)?.error ?? 'All candidate servers failed to connect.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown connection error.';
      this.setState({ status: 'error', error: message }, options.onStateChange);
      return { success: false, attempts: connectionAttempts, error: message };
    }
  }

  async disconnect(onStateChange?: (state: VpnConnectionState) => void): Promise<void> {
    this.cancelActiveOperation();
    this.setState({ status: 'disconnecting' }, onStateChange);
    await pulseVpnBridge.stop();
    this.setState({ status: 'disconnected' }, onStateChange);
  }

  private async ensureInternetReachable(): Promise<void> {
    const state = await NetInfo.fetch();
    if (!state.isConnected || state.isInternetReachable === false) {
      throw new Error(NO_NETWORK_OR_BLOCKED_MESSAGE);
    }
  }

  private async tryConnect(server: ServerConfig, probe: ProbeResult): Promise<ServerConnectionAttempt> {
    const startedAt = new Date().toISOString();

    try {
      const singBoxConfig = singBoxConfigService.buildConfig(server);
      await pulseVpnBridge.prepare();
      await pulseVpnBridge.start({ server, singBoxConfig, appGroupIdentifier: APP_GROUP_IDENTIFIER });
      return {
        serverId: server.id,
        displayName: server.displayName,
        startedAt,
        finishedAt: new Date().toISOString(),
        success: true,
      };
    } catch (error) {
      return {
        serverId: server.id,
        displayName: server.displayName,
        startedAt,
        finishedAt: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : `Failed to connect to ${probe.host}`,
      };
    }
  }

  private async loadExternalIp(): Promise<{ ip?: string; country?: string }> {
    try {
      return await withTimeout(async (signal) => {
        const response = await fetch('https://ipapi.co/json/', { signal });
        if (!response.ok) {
          return {};
        }
        const payload = (await response.json()) as { ip?: string; country_name?: string };
        return { ip: payload.ip, country: payload.country_name };
      }, 4000);
    } catch {
      return {};
    }
  }

  private setState(
    patch: Partial<VpnConnectionState>,
    onStateChange?: (state: VpnConnectionState) => void,
  ): void {
    this.state = { ...this.state, ...patch };
    onStateChange?.(this.state);
  }
}

function mergeAbortSignals(primary: AbortSignal, secondary?: AbortSignal): AbortSignal {
  if (!secondary) {
    return primary;
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  primary.addEventListener('abort', abort, { once: true });
  secondary.addEventListener('abort', abort, { once: true });
  return controller.signal;
}

export const vpnConnectionService = new VpnConnectionService();
