import { StyleSheet, Text, View } from 'react-native';

import type { VpnConnectionStatus } from '../types';
import { colors } from '../theme';

const statusColor: Record<VpnConnectionStatus, string> = {
  connected: colors.success,
  connecting: colors.blue,
  disconnected: colors.subtle,
  disconnecting: colors.warning,
  error: colors.danger,
  testing: colors.purple,
};

export function StatusPill({ status }: { status: VpnConnectionStatus }) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: statusColor[status] }]} />
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  text: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
