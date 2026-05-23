import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { serverListService } from './ServerListService';

export const SERVER_LIST_BACKGROUND_REFRESH_TASK = 'pulsevpn.server-list.refresh.v1';
export const BACKGROUND_REFRESH_INTERVAL_SECONDS = 30 * 60;

const BACKGROUND_REFRESH_META_KEY = 'pulsevpn.background-refresh.meta.v1';

export interface BackgroundRefreshMetadata {
  registered: boolean;
  lastRunAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  lastServerCount?: number;
}

TaskManager.defineTask(SERVER_LIST_BACKGROUND_REFRESH_TASK, async () => {
  const startedAt = new Date().toISOString();
  try {
    const parsed = await serverListService.refresh({ timeoutMs: 15000 });
    await saveBackgroundRefreshMetadata({
      registered: true,
      lastRunAt: startedAt,
      lastSuccessAt: new Date().toISOString(),
      lastServerCount: parsed.servers.length,
    });
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    await saveBackgroundRefreshMetadata({
      registered: true,
      lastRunAt: startedAt,
      lastError: error instanceof Error ? error.message : 'Unknown background refresh error',
    });
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundServerRefreshAsync(): Promise<BackgroundRefreshMetadata> {
  const status = await BackgroundFetch.getStatusAsync();
  const supported =
    status === BackgroundFetch.BackgroundFetchStatus.Available ||
    status === BackgroundFetch.BackgroundFetchStatus.Restricted;

  if (!supported) {
    const metadata: BackgroundRefreshMetadata = {
      registered: false,
      lastError: `Background fetch unavailable: ${String(status)}`,
    };
    await saveBackgroundRefreshMetadata(metadata);
    return metadata;
  }

  const registeredTasks = await TaskManager.getRegisteredTasksAsync();
  const alreadyRegistered = registeredTasks.some(
    (task) => task.taskName === SERVER_LIST_BACKGROUND_REFRESH_TASK,
  );

  if (!alreadyRegistered) {
    await BackgroundFetch.registerTaskAsync(SERVER_LIST_BACKGROUND_REFRESH_TASK, {
      minimumInterval: BACKGROUND_REFRESH_INTERVAL_SECONDS,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }

  const metadata: BackgroundRefreshMetadata = { registered: true };
  await saveBackgroundRefreshMetadata(metadata);
  return metadata;
}

export async function unregisterBackgroundServerRefreshAsync(): Promise<void> {
  const registered = await TaskManager.isTaskRegisteredAsync(SERVER_LIST_BACKGROUND_REFRESH_TASK);
  if (registered) {
    await BackgroundFetch.unregisterTaskAsync(SERVER_LIST_BACKGROUND_REFRESH_TASK);
  }
  await saveBackgroundRefreshMetadata({ registered: false });
}

export async function getBackgroundRefreshMetadata(): Promise<BackgroundRefreshMetadata> {
  const raw = await AsyncStorage.getItem(BACKGROUND_REFRESH_META_KEY);
  if (!raw) {
    return { registered: false };
  }

  try {
    return JSON.parse(raw) as BackgroundRefreshMetadata;
  } catch {
    return { registered: false, lastError: 'Background refresh metadata is corrupted' };
  }
}

async function saveBackgroundRefreshMetadata(patch: BackgroundRefreshMetadata): Promise<void> {
  const previous = await getBackgroundRefreshMetadata();
  await AsyncStorage.setItem(
    BACKGROUND_REFRESH_META_KEY,
    JSON.stringify({ ...previous, ...patch }),
  );
}
