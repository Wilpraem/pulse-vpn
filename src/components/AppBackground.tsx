import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AppBackground({ children }: PropsWithChildren) {
  return (
    <LinearGradient colors={['#020617', '#080b18', '#0f172a']} style={styles.root}>
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />
      <SafeAreaView style={styles.safeArea}>{children}</SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  orbBottom: {
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    borderRadius: 170,
    bottom: 90,
    height: 250,
    position: 'absolute',
    right: -120,
    width: 250,
  },
  orbTop: {
    backgroundColor: 'rgba(139, 92, 246, 0.24)',
    borderRadius: 190,
    height: 320,
    left: -140,
    position: 'absolute',
    top: -110,
    width: 320,
  },
});
