import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { AppBackground } from '../components/AppBackground';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { serverListService } from '../services/ServerListService';
import { diagnosticsService } from '../services/DiagnosticsService';
import { colors } from '../theme';
import { DEFAULT_SETTINGS } from '../utils/constants';
import { useAppStore } from '../store/AppStore';

export function SettingsScreen() {
  const { state, dispatch } = useAppStore();
  const settings = state.settings;

  async function clearCache() {
    await serverListService.clearCache();
    dispatch({ type: 'cacheCleared' });
    dispatch({ type: 'logAdded', entry: diagnosticsService.log('info', 'Local server cache cleared') });
  }

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Settings" subtitle="Tune automatic server selection and diagnostics." />
        <GlassCard style={styles.card}>
          <SettingSwitch
            label="Auto-select best server"
            value={settings.autoSelectBestServer}
            onValueChange={(value) =>
              dispatch({ type: 'settingsChanged', patch: { autoSelectBestServer: value } })
            }
          />
          <SettingSwitch
            label="Prefer foreign country"
            value={settings.preferForeignCountry}
            onValueChange={(value) =>
              dispatch({ type: 'settingsChanged', patch: { preferForeignCountry: value } })
            }
          />
          <SettingSwitch
            label="Debug logs"
            value={settings.debugLogsEnabled}
            onValueChange={(value) =>
              dispatch({ type: 'settingsChanged', patch: { debugLogsEnabled: value } })
            }
          />
          <SettingNumber
            label="Ping timeout, ms"
            value={settings.pingTimeoutMs}
            onChange={(value) => dispatch({ type: 'settingsChanged', patch: { pingTimeoutMs: value } })}
          />
          <SettingNumber
            label="Max ping attempts"
            value={settings.maxPingAttempts}
            onChange={(value) =>
              dispatch({ type: 'settingsChanged', patch: { maxPingAttempts: value } })
            }
          />
          <SettingNumber
            label="Probe concurrency"
            value={settings.probeConcurrency}
            onChange={(value) =>
              dispatch({ type: 'settingsChanged', patch: { probeConcurrency: value } })
            }
          />
        </GlassCard>

        <View style={styles.actions}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => dispatch({ type: 'settingsChanged', patch: DEFAULT_SETTINGS })}
          >
            <Text style={styles.secondaryText}>Reset defaults</Text>
          </Pressable>
          <Pressable style={styles.dangerButton} onPress={clearCache}>
            <Text style={styles.dangerText}>Clear cache</Text>
          </Pressable>
        </View>
      </ScrollView>
    </AppBackground>
  );
}

function SettingSwitch({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.blue }} />
    </View>
  );
}

function SettingNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <TextInput
        keyboardType="number-pad"
        value={String(value)}
        onChangeText={(text) => {
          const parsed = Number(text.replace(/[^0-9]/g, ''));
          if (Number.isFinite(parsed)) {
            onChange(parsed);
          }
        }}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
  },
  card: {
    marginHorizontal: 20,
  },
  content: {
    paddingBottom: 120,
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(251, 113, 133, 0.14)',
    borderColor: 'rgba(251, 113, 133, 0.36)',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  dangerText: {
    color: colors.danger,
    fontWeight: '900',
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.84)',
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontWeight: '900',
    minWidth: 84,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'right',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    borderColor: 'rgba(56, 189, 248, 0.36)',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  secondaryText: {
    color: colors.blue,
    fontWeight: '900',
  },
  settingLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  settingRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
});
