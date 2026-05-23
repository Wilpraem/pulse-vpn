import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Pulse VPN</Text>
      <Text style={styles.subtitle}>iOS-first VPN client foundation</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#050712',
    flex: 1,
    justifyContent: 'center',
  },
  subtitle: {
    color: '#9aa4b2',
    fontSize: 16,
    marginTop: 8,
  },
  title: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
});
