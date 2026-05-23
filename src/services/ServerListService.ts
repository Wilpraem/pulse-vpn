import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ParsedSubscription } from '../types';
import { SUBSCRIPTION_URL } from '../utils/constants';
import { withTimeout } from '../utils/timeout';
import { serverParserService, type ParseSubscriptionOptions } from './ServerParserService';

const SERVER_CACHE_KEY = 'pulsevpn.server-cache.v1';
const LAST_FETCH_KEY = 'pulsevpn.server-cache.last-fetch.v1';

export interface LoadServerListOptions extends Omit<ParseSubscriptionOptions, 'sourceUrl' | 'fetchedAt'> {
  url?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export class ServerListService {
  async refresh(options: LoadServerListOptions = {}): Promise<ParsedSubscription> {
    const url = options.url ?? SUBSCRIPTION_URL;
    const timeoutMs = options.timeoutMs ?? 10000;
    const fetchedAt = new Date().toISOString();
    const raw = await withTimeout(
      async (signal) => {
        const response = await fetch(url, {
          cache: 'no-store',
          headers: { accept: 'text/plain,*/*' },
          signal,
        });

        if (!response.ok) {
          throw new Error(`Subscription request failed with HTTP ${response.status}.`);
        }

        return response.text();
      },
      timeoutMs,
      options.signal,
    );

    const parsed = serverParserService.parse(raw, {
      sourceUrl: url,
      localCountryCode: options.localCountryCode,
      fetchedAt,
    });

    await this.saveCache(parsed);
    return parsed;
  }

  async loadCached(): Promise<ParsedSubscription | undefined> {
    const raw = await AsyncStorage.getItem(SERVER_CACHE_KEY);
    if (!raw) {
      return undefined;
    }

    try {
      return JSON.parse(raw) as ParsedSubscription;
    } catch {
      await this.clearCache();
      return undefined;
    }
  }

  async clearCache(): Promise<void> {
    await AsyncStorage.multiRemove([SERVER_CACHE_KEY, LAST_FETCH_KEY]);
  }

  private async saveCache(parsed: ParsedSubscription): Promise<void> {
    await AsyncStorage.multiSet([
      [SERVER_CACHE_KEY, JSON.stringify(parsed)],
      [LAST_FETCH_KEY, parsed.fetchedAt],
    ]);
  }
}

export const serverListService = new ServerListService();
