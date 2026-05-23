import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import type { VpnConnectionStatus } from '../types';
import { colors } from '../theme';

export function ConnectButton({
  status,
  onPress,
}: {
  status: VpnConnectionStatus;
  onPress: () => void;
}) {
  const progress = useSharedValue(0);
  const active = status === 'testing' || status === 'connecting' || status === 'connected';

  useEffect(() => {
    progress.value = active
      ? withRepeat(withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) }), -1, false)
      : withTiming(0, { duration: 250 });
  }, [active, progress]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.32, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [1, 1.3]) }],
  }));

  const label = status === 'connected' ? 'Disconnect' : 'Connect';
  const subtitle = status === 'testing' ? 'Testing servers' : status === 'connecting' ? 'Securing route' : '';

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.pulse, pulseStyle]} />
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
          onPress();
        }}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      >
        <LinearGradient
          colors={status === 'connected' ? ['#22c55e', '#14b8a6'] : ['#38bdf8', '#8b5cf6']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.button}
        >
          <Text style={styles.power}>I/O</Text>
          <Text style={styles.label}>{label}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 108,
    height: 196,
    justifyContent: 'center',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.45,
    shadowRadius: 40,
    width: 196,
  },
  label: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginTop: 8,
  },
  power: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  pressable: {
    borderRadius: 108,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  pulse: {
    backgroundColor: 'rgba(56, 189, 248, 0.45)',
    borderRadius: 124,
    height: 220,
    position: 'absolute',
    width: 220,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  wrap: {
    alignItems: 'center',
    height: 250,
    justifyContent: 'center',
  },
});
