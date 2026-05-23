import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppBackground } from '../components/AppBackground';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors } from '../theme';
import { useAppStore } from '../store/AppStore';

export function DiagnosticsScreen() {
  const { state } = useAppStore();
  const parseErrors = state.subscription?.parseErrors ?? [];
  const reachableCount = state.probeResults.filter((probe) => probe.reachable).length;

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Diagnostics" subtitle="Last parser, probe and connection state." />
        <GlassCard style={styles.card}>
          <StatLine label="Servers parsed" value={String(state.subscription?.servers.length ?? 0)} />
          <StatLine label="Reachable" value={String(reachableCount)} />
          <StatLine label="Parser errors" value={String(parseErrors.length)} />
          <StatLine label="Connection" value={state.connection.status} />
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
