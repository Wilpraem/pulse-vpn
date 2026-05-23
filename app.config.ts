import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Pulse VPN',
  slug: 'pulse-vpn',
  scheme: 'pulsevpn',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  splash: { backgroundColor: '#050712' },
  plugins: [
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '16.0',
        },
        android: {
          minSdkVersion: 26,
        },
      },
    ],
    './plugins/withVpnCapabilities',
  ],
  ios: {
    bundleIdentifier: 'com.pulsevpn.app',
    supportsTablet: false,
    infoPlist: {
      NSLocalNetworkUsageDescription: 'Pulse VPN probes configured servers to select the most stable route.',
      NSVPNUsageDescription: 'Pulse VPN uses a packet tunnel to route traffic through the selected VPN server.',
    },
  },
  android: {
    package: 'com.pulsevpn.app',
  },
  extra: {
    subscriptionUrl: 'https://gitverse.ru/api/repos/zieng2/wl/raw/branch/master/list_universal.txt',
    eas: {
      projectId: '00000000-0000-0000-0000-000000000000',
    },
  },
};

export default config;
