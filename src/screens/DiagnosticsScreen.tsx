import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBackground } from '../components/AppBackground';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { diagnosticsService } from '../services/DiagnosticsService';
import { colors } from '../theme';
import { useAppStore } from '../store/AppStore';

export function DiagnosticsScreen() {
  const { state, dispatch } = useAppStore();
  const parseErrors = state.subscription?.parseErrors ?? [];
  const reachableCount = state.probeResults.filter((probe) => probe.reachable).length;

  async function runDiagnostics() {
    const snapshot = await diagnosticsService.createSnapshot({
      serverCount: state.subscription?.servers.length ?? 0,
      parseErrors,
      probeResults: state.probeResults,
      connectionErrors: state.connectionErrors,
    });
    dispatch({ type: 'diagnosticsUpdated', diagnostics: snapshot });
  }

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Diagnostics" subtitle="Last parser, probe and connection state." />
        <GlassCard style={styles.card}>
          <StatLine label="Servers parsed" value={String(state.subscription?.servers.length ?? 0)} />
          <StatLine label="Reachable" value={String(reachableCount)} />
          <StatLine label="Parser errors" value={String(parseErrors.length)} />
          <StatLine label="Connection" value={state.connection.status} />
          <StatLine
            label="Internet"
            value={state.diagnostics?.internetReachable === false ? 'blocked/offline' : 'unknown/ok'}
          />
          <StatLine
            label="Captive portal"
            value={state.diagnostics?.captivePortalLikely ? 'likely' : 'not detected'}
          />
          <StatLine label="Background refresh" value={state.diagnostics ? 'registered/logged' : 'unknown'} />
          <Pressable style={styles.runButton} onPress={runDiagnostics}>
            <Text style={styles.runText}>Run diagnostics</Text>
          </Pressable>
        </GlassCard>

        <Section title="Last probe results">
          {state.probeResults.slice(0, 12).map((probe) => (
            <Text key={probe.serverId} style={styles.logLine}>
              {probe.host}:{probe.port} - {probe.reachable ? `${probe.latencyMs} ms` : probe.error}
            </Text>
          ))}
        </Section>

        <Section title="Errors">
          {[...state.connectionErrors, ...parseErrors.map((error) => error.message)]
            .slice(0, 12)
            .map((error, index) => (
              <Text key={`${error}-${index}`} style={styles.errorLine}>
                {error}
              </Text>
            ))}
        </Section>

        <Section title="Debug logs">
          {state.logs.slice(0, 24).map((entry) => (
            <Text key={`${entry.createdAt}-${entry.message}`} style={styles.logLine}>
              {entry.createdAt} [{entry.level}] {entry.message}
            </Text>
          ))}
        </Section>
      </ScrollView>
    </AppBackground>
  );
}

function Section({ children, title }: PropsWithChildren<{ title: string }>) {
  return (
    <GlassCard style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </GlassCard>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statLine}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    marginHorizontal: 20,
  },
  content: {
    paddingBottom: 120,
  },
  errorLine: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  logLine: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  runButton: {
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: 18,
    marginTop: 16,
    paddingVertical: 13,
  },
  runText: {
    color: '#00111d',
    fontSize: 14,
    fontWeight: '900',
  },
  sectionContent: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  statLabel: {
    color: colors.subtle,
    fontSize: 13,
    fontWeight: '800',
  },
  statLine: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  statValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
});
