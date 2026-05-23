import { createContext, type Dispatch, type PropsWithChildren, useContext, useMemo, useReducer } from 'react';

import type {
  AppSettings,
  DiagnosticLogEntry,
  DiagnosticsSnapshot,
  ParsedSubscription,
  ProbeResult,
  ServerConfig,
  VpnConnectionState,
} from '../types';
import { DEFAULT_SETTINGS } from '../utils/constants';

export interface AppState {
  connection: VpnConnectionState;
  settings: AppSettings;
  subscription?: ParsedSubscription;
  probeResults: ProbeResult[];
  selectedServer?: ServerConfig;
  logs: DiagnosticLogEntry[];
  connectionErrors: string[];
  diagnostics?: DiagnosticsSnapshot;
}

type AppAction =
  | { type: 'connectionChanged'; connection: VpnConnectionState }
  | { type: 'subscriptionLoaded'; subscription: ParsedSubscription }
  | { type: 'probeResultsChanged'; probeResults: ProbeResult[] }
  | { type: 'serverSelected'; server?: ServerConfig }
  | { type: 'settingsChanged'; patch: Partial<AppSettings> }
  | { type: 'logAdded'; entry: DiagnosticLogEntry }
  | { type: 'diagnosticsUpdated'; diagnostics: DiagnosticsSnapshot }
  | { type: 'cacheCleared' };

const initialState: AppState = {
  connection: { status: 'disconnected' },
  settings: DEFAULT_SETTINGS,
  probeResults: [],
  logs: [],
  connectionErrors: [],
};

const AppStoreContext = createContext<
  | {
      state: AppState;
      dispatch: Dispatch<AppAction>;
    }
  | undefined
>(undefined);

export function AppStoreProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useAppStore must be used inside AppStoreProvider.');
  }
  return context;
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'connectionChanged': {
      const connectionErrors = action.connection.error
        ? [action.connection.error, ...state.connectionErrors].slice(0, 20)
        : state.connectionErrors;
      return {
        ...state,
        connection: action.connection,
        selectedServer: action.connection.selectedServer ?? state.selectedServer,
        connectionErrors,
      };
    }
    case 'subscriptionLoaded':
      return { ...state, subscription: action.subscription };
    case 'probeResultsChanged':
      return { ...state, probeResults: action.probeResults };
    case 'serverSelected':
      return { ...state, selectedServer: action.server };
    case 'settingsChanged':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'logAdded':
      return { ...state, logs: [action.entry, ...state.logs].slice(0, 120) };
    case 'diagnosticsUpdated':
      return { ...state, diagnostics: action.diagnostics, logs: action.diagnostics.logs };
    case 'cacheCleared':
      return { ...state, subscription: undefined, probeResults: [], selectedServer: undefined };
  }
}
