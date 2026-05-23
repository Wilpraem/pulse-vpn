import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

export function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.66)',
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    minWidth: 120,
    padding: 14,
  },
  label: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
});
