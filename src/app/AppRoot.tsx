import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text } from 'react-native';

import type { RootTabParamList } from '../types';
import { colors } from '../theme';
import { DiagnosticsScreen } from '../screens/DiagnosticsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ServersScreen } from '../screens/ServersScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AppStoreProvider, useAppStore } from '../store/AppStore';
import { serverListService } from '../services/ServerListService';
import { registerBackgroundServerRefreshAsync } from '../services/BackgroundRefreshService';

const Tab = createBottomTabNavigator<RootTabParamList>();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    border: colors.border,
    card: '#070b17',
    primary: colors.blue,
    text: colors.text,
  },
};

export function AppRoot() {
  return (
    <AppStoreProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={navigationTheme}>
        <Bootstrap />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: colors.blue,
            tabBarInactiveTintColor: colors.subtle,
            tabBarStyle: {
              backgroundColor: 'rgba(5, 7, 18, 0.96)',
              borderTopColor: colors.border,
              height: 84,
              paddingBottom: 18,
              paddingTop: 10,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '700',
            },
            tabBarIcon: ({ color }) => <TabGlyph color={color} routeName={route.name} />,
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Servers" component={ServersScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
          <Tab.Screen name="Diagnostics" component={DiagnosticsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </AppStoreProvider>
  );
}

function Bootstrap() {
  const { dispatch } = useAppStore();

  useEffect(() => {
    let mounted = true;
    serverListService.loadCached().then((cached) => {
      if (mounted && cached) {
        dispatch({ type: 'subscriptionLoaded', subscription: cached });
      }
    });
    registerBackgroundServerRefreshAsync().catch((error) => {
      dispatch({
        type: 'logAdded',
        entry: {
          level: 'warn',
          message: error instanceof Error ? error.message : 'Background refresh registration failed',
          createdAt: new Date().toISOString(),
        },
      });
    });
    return () => {
      mounted = false;
    };
  }, [dispatch]);

  return null;
}

function TabGlyph({ color, routeName }: { color: string; routeName: keyof RootTabParamList }) {
  const glyph = routeName === 'Home' ? 'P' : routeName === 'Servers' ? 'S' : routeName === 'Settings' ? 'G' : 'D';
  return <Text style={{ color, fontSize: 17, fontWeight: '900' }}>{glyph}</Text>;
}
