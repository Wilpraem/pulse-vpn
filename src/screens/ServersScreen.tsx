import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBackground } from '../components/AppBackground';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { ServerCard } from '../components/ServerCard';
import { serverListService } from '../services/ServerListService';
import { diagnosticsService } from '../services/DiagnosticsService';
import { colors } from '../theme';
import { useAppStore } from '../store/AppStore';

export function ServersScreen() {
  const { state, dispatch } = useAppStore();
  const [foreignOnly, setForeignOnly] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const probeById = useMemo(
    () => new Map(state.probeResults.map((probe) => [probe.serverId, probe])),
    [state.probeResults],
  );

  const servers = useMemo(() => {
    const base = state.subscription?.servers ?? [];
    return base
      .filter((server) => (foreignOnly ? server.isForeign : true))
      .sort((left, right) => {
        const leftLatency = probeById.get(left.id)?.latencyMs ?? 99999;
        const rightLatency = probeById.get(right.id)?.latencyMs ?? 99999;
        return leftLatency - rightLatency;
      });
  }, [foreignOnly, probeById, state.subscription?.servers]);

  async function refreshList() {
    setRefreshing(true);
    try {
      const subscription = await serverListService.refresh({
        localCountryCode: state.settings.localCountryCode,
      });
      dispatch({ type: 'subscriptionLoaded', subscription });
      dispatch({
        type: 'logAdded',
        entry: diagnosticsService.log('info', 'Server list refreshed', {
          count: subscription.servers.length,
          parseErrors: subscription.parseErrors.length,
        }),
      });
    } catch (error) {
      const message = diagnosticsService.normalizeError(error);
      dispatch({
        type: 'logAdded',
        entry: diagnosticsService.log('error', 'Server list refresh failed', { error: message }),
      });
      Alert.alert('Refresh failed', message);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Servers"
          subtitle="Sorted by last probe latency. Manual selection is used as a fallback preference."
        />
        <GlassCard style={styles.toolbar}>
          <Pressable style={styles.chip} onPress={() => setForeignOnly((value) => !value)}>
            <Text style={styles.chipText}>{foreignOnly ? 'Foreign only' : 'All countries'}</Text>
          </Pressable>
          <Pressable style={styles.refresh} onPress={refreshList} disabled={refreshing}>
            <Text style={styles.refreshText}>{refreshing ? 'Refreshing...' : 'Refresh list'}</Text>
          </Pressable>
        </GlassCard>
        <Text style={styles.count}>{servers.length} servers</Text>
        <View style={styles.list}>
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              probe={probeById.get(server.id)}
              selected={state.selectedServer?.id === server.id}
              onPress={() => dispatch({ type: 'serverSelected', server })}
            />
          ))}
        </View>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.28)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: '900',
  },
  content: {
    paddingBottom: 120,
  },
  count: {
    color: colors.subtle,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    marginHorizontal: 22,
    marginTop: 18,
  },
  list: {
    marginHorizontal: 20,
  },
  refresh: {
    backgroundColor: colors.blue,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  refreshText: {
    color: '#00111d',
    fontSize: 13,
    fontWeight: '900',
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
  },
});
