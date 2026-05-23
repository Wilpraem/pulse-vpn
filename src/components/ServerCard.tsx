import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ProbeResult, ServerConfig } from '../types';
import { colors } from '../theme';

export function ServerCard({
  server,
  probe,
  selected,
  onPress,
}: {
  server: ServerConfig;
  probe?: ProbeResult;
  selected?: boolean;
  onPress?: () => void;
}) {
  const reachable = probe?.reachable;
  const ping = probe?.latencyMs ? `${probe.latencyMs} ms` : 'not tested';

  return (
    <Pressable onPress={onPress} style={[styles.card, selected && styles.selected]}>
      <View style={styles.row}>
        <View style={styles.countryBadge}>
          <Text style={styles.countryCode}>{server.countryCode ?? '--'}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {server.displayName}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {server.protocol.toUpperCase()} / {server.transport} / {server.security}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.ping, reachable && styles.pingOk]}>{ping}</Text>
          <Text style={styles.availability}>{reachable ? 'available' : 'unknown'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  availability: {
    color: colors.subtle,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'right',
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  content: {
    flex: 1,
  },
  countryBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    borderRadius: 17,
    height: 46,
    justifyContent: 'center',
    marginRight: 12,
    width: 46,
  },
  countryCode: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: '900',
  },
  meta: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  ping: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
  pingOk: {
    color: colors.success,
  },
  right: {
    marginLeft: 12,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  selected: {
    borderColor: colors.blue,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
});
