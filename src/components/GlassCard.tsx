import { BlurView } from 'expo-blur';
import type { PropsWithChildren } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';

import { colors } from '../theme';

export function GlassCard({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return (
    <BlurView intensity={28} tint="dark" style={[styles.card, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
  },
});
