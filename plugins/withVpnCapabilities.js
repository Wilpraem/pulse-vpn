const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

const APP_GROUP_IDENTIFIER = 'group.com.pulsevpn.shared';

const withVpnCapabilities = (config) => {
  config = withInfoPlist(config, (pluginConfig) => {
    pluginConfig.modResults.NSVPNUsageDescription =
      'Pulse VPN uses a packet tunnel to route traffic through the selected VPN server.';
    pluginConfig.modResults.NSLocalNetworkUsageDescription =
      'Pulse VPN probes VPN servers to select the most stable route.';
    return pluginConfig;
  });

  config = withEntitlementsPlist(config, (pluginConfig) => {
    pluginConfig.modResults['com.apple.security.application-groups'] = [APP_GROUP_IDENTIFIER];
    pluginConfig.modResults['com.apple.developer.networking.networkextension'] = [
      'packet-tunnel-provider',
    ];
    return pluginConfig;
  });

  return config;
};

module.exports = withVpnCapabilities;
