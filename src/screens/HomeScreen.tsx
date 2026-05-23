import { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBackground } from '../components/AppBackground';
import { ConnectButton } from '../components/ConnectButton';
import { GlassCard } from '../components/GlassCard';
import { MetricCard } from '../components/MetricCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusPill } from '../components/StatusPill';
import { vpnConnectionService } from '../services/VpnConnectionService';
import { colors } from '../theme';
import { useAppStore } from '../store/AppStore';

export function HomeScreen() {
  const { state, dispatch } = useAppStore();
  const { connection } = state;

  const handleToggle = useCallback(async () => {
    if (connection.status === 'connected' || connection.status === 'connecting') {
      try {
        await vpnConnectionService.disconnect((next) =>
          dispatch({ type: 'connectionChanged', connection: next }),
        );
      } catch (error) {
        Alert.alert('Disconnect failed', error instanceof Error ? error.message : 'Unknown error');
      }
      return;
    }

    const result = await vpnConnectionService.connect({
      settings: state.settings,
      preferredServer: state.selectedServer,
      onStateChange: (next) => dispatch({ type: 'connectionChanged', connection: next }),
      onProbeResults: (probeResults) => dispatch({ type: 'probeResultsChanged', probeResults }),
    });

    if (!result.success && result.error) {
      Alert.alert('Connection failed', result.error);
    }
  }, [connection.status, dispatch, state.settings]);

  const server = connection.selectedServer ?? state.selectedServer;
  const probe = connection.selectedProbe ?? state.probeResults.find((item) => item.serverId === server?.id);

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Secure route" subtitle="Auto-selects the fastest reachable foreign VLESS route." />
        <StatusPill status={connection.status} />
        <ConnectButton status={connection.status} onPress={handleToggle} />

        <GlassCard style={styles.heroCard}>
          <View style={styles.heroRow}>
            <Text style={styles.heroLabel}>Selected route</Text>
            <Text style={styles.heroStatus}>{server?.countryCode ?? 'AUTO'}</Text>
          </View>
          <Text style={styles.serverName} numberOfLines={2}>
            {server?.displayName ?? 'Best server will be selected on connect'}
          </Text>
          {connection.error ? <Text style={styles.errorText}>{connection.error}</Text> : null}
        </GlassCard>

        <View style={styles.metricsGrid}>
          <MetricCard label="Country" value={server?.country ?? server?.countryCode ?? 'Auto'} />
          <MetricCard label="Ping" value={probe?.latencyMs ? `${probe.latencyMs} ms` : '--'} />
          <MetricCard label="Protocol" value={server?.protocol.toUpperCase() ?? 'VLESS'} />
          <MetricCard label="External IP" value={connection.externalIp ?? '--'} />
        </View>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 120,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 12,
  },
  heroCard: {
    marginHorizontal: 20,
    marginTop: 10,
  },
  heroLabel: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStatus: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '900',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
  },
  serverName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 29,
    marginTop: 12,
  },
});
