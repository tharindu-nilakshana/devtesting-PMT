/**
 * @file footprintStore.ts
 * @description State management for FootprintCharts using React Context + useReducer
 */

import { createContext, useContext, useReducer, useCallback, useMemo, ReactNode } from 'react';
import {
  ChartType,
  Timeframe,
  DrawingTool,
  Drawing,
  Theme,
  ConnectionStatus,
  DEFAULT_THEMES,
  INSTRUMENTS,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// State Shape
// ─────────────────────────────────────────────────────────────────────────────

export interface FootprintState {
  // Instrument and settings
  instrument: string;
  chartType: ChartType;
  timeframe: Timeframe;
  tickMultiplier: number;

  // Display toggles
  showHeatmap: boolean;
  showCandlesticks: boolean;
  showDOM: boolean;
  showPOC: boolean;
  showValueArea: boolean;
  showImbalances: boolean;

  // Value Area settings
  valueAreaPercent: number;

  // Imbalance settings
  imbalanceRatio: number;
  imbalanceMinVolume: number;

  // Themes
  themes: Theme[];
  activeThemeId: string;

  // Drawings
  activeTool: DrawingTool | null;
  drawings: Drawing[];

  // Settings panel
  settingsPanelOpen: boolean;

  // Connection
  connectionStatus: ConnectionStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial State (with localStorage persistence check)
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'footprint-chart-settings';

function loadPersistedState(): Partial<FootprintState> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore errors
  }
  return {};
}

function getInitialState(): FootprintState {
  const persisted = loadPersistedState();
  return {
    instrument: persisted.instrument ?? INSTRUMENTS[0],
    chartType: persisted.chartType ?? 'bid_ask',
    timeframe: (persisted.timeframe ?? 1) as Timeframe,
    tickMultiplier: persisted.tickMultiplier ?? 1,
    showHeatmap: persisted.showHeatmap ?? true,
    showCandlesticks: persisted.showCandlesticks ?? true,
    showDOM: persisted.showDOM ?? false,
    showPOC: persisted.showPOC ?? true,
    showValueArea: persisted.showValueArea ?? true,
    showImbalances: persisted.showImbalances ?? true,
    valueAreaPercent: persisted.valueAreaPercent ?? 70,
    imbalanceRatio: persisted.imbalanceRatio ?? 1.5,
    imbalanceMinVolume: persisted.imbalanceMinVolume ?? 10,
    themes: persisted.themes ?? DEFAULT_THEMES,
    activeThemeId: persisted.activeThemeId ?? 'dark',
    activeTool: null,
    drawings: [],
    settingsPanelOpen: false,
    connectionStatus: 'disconnected',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

type FootprintAction =
  | { type: 'SET_INSTRUMENT'; payload: string }
  | { type: 'SET_CHART_TYPE'; payload: ChartType }
  | { type: 'SET_TIMEFRAME'; payload: Timeframe }
  | { type: 'SET_TICK_MULTIPLIER'; payload: number }
  | { type: 'TOGGLE_HEATMAP' }
  | { type: 'TOGGLE_CANDLESTICKS' }
  | { type: 'TOGGLE_DOM' }
  | { type: 'TOGGLE_POC' }
  | { type: 'TOGGLE_VALUE_AREA' }
  | { type: 'TOGGLE_IMBALANCES' }
  | { type: 'SET_VALUE_AREA_PERCENT'; payload: number }
  | { type: 'SET_IMBALANCE_RATIO'; payload: number }
  | { type: 'SET_IMBALANCE_MIN_VOLUME'; payload: number }
  | { type: 'SET_THEME'; payload: string }
  | { type: 'ADD_THEME'; payload: Theme }
  | { type: 'SET_ACTIVE_TOOL'; payload: DrawingTool | null }
  | { type: 'ADD_DRAWING'; payload: Drawing }
  | { type: 'UPDATE_DRAWING'; payload: { id: string; updates: Partial<Drawing> } }
  | { type: 'DELETE_DRAWING'; payload: string }
  | { type: 'SELECT_DRAWING'; payload: string | null }
  | { type: 'CLEAR_ALL_DRAWINGS' }
  | { type: 'SET_SETTINGS_PANEL_OPEN'; payload: boolean }
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'RESTORE_DRAWINGS'; payload: Drawing[] };

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────

function footprintReducer(state: FootprintState, action: FootprintAction): FootprintState {
  let newState: FootprintState;

  switch (action.type) {
    case 'SET_INSTRUMENT':
      newState = { ...state, instrument: action.payload };
      break;
    case 'SET_CHART_TYPE':
      newState = { ...state, chartType: action.payload };
      break;
    case 'SET_TIMEFRAME':
      newState = { ...state, timeframe: action.payload };
      break;
    case 'SET_TICK_MULTIPLIER':
      newState = { ...state, tickMultiplier: action.payload };
      break;
    case 'TOGGLE_HEATMAP':
      newState = { ...state, showHeatmap: !state.showHeatmap };
      break;
    case 'TOGGLE_CANDLESTICKS':
      newState = { ...state, showCandlesticks: !state.showCandlesticks };
      break;
    case 'TOGGLE_DOM':
      newState = { ...state, showDOM: !state.showDOM };
      break;
    case 'TOGGLE_POC':
      newState = { ...state, showPOC: !state.showPOC };
      break;
    case 'TOGGLE_VALUE_AREA':
      newState = { ...state, showValueArea: !state.showValueArea };
      break;
    case 'TOGGLE_IMBALANCES':
      newState = { ...state, showImbalances: !state.showImbalances };
      break;
    case 'SET_VALUE_AREA_PERCENT':
      newState = { ...state, valueAreaPercent: action.payload };
      break;
    case 'SET_IMBALANCE_RATIO':
      newState = { ...state, imbalanceRatio: action.payload };
      break;
    case 'SET_IMBALANCE_MIN_VOLUME':
      newState = { ...state, imbalanceMinVolume: action.payload };
      break;
    case 'SET_THEME':
      newState = { ...state, activeThemeId: action.payload };
      break;
    case 'ADD_THEME':
      newState = { ...state, themes: [...state.themes, action.payload] };
      break;
    case 'SET_ACTIVE_TOOL':
      newState = { ...state, activeTool: action.payload };
      break;
    case 'ADD_DRAWING':
      newState = {
        ...state,
        drawings: [...state.drawings.map((d) => ({ ...d, selected: false })), action.payload],
      };
      break;
    case 'UPDATE_DRAWING':
      newState = {
        ...state,
        drawings: state.drawings.map((d) =>
          d.id === action.payload.id ? { ...d, ...action.payload.updates } : d
        ),
      };
      break;
    case 'DELETE_DRAWING':
      newState = {
        ...state,
        drawings: state.drawings.filter((d) => d.id !== action.payload),
      };
      break;
    case 'SELECT_DRAWING':
      newState = {
        ...state,
        drawings: state.drawings.map((d) => ({
          ...d,
          selected: d.id === action.payload,
        })),
      };
      break;
    case 'CLEAR_ALL_DRAWINGS':
      newState = { ...state, drawings: [] };
      break;
    case 'SET_SETTINGS_PANEL_OPEN':
      newState = { ...state, settingsPanelOpen: action.payload };
      break;
    case 'SET_CONNECTION_STATUS':
      newState = { ...state, connectionStatus: action.payload };
      break;
    case 'RESTORE_DRAWINGS':
      newState = { ...state, drawings: action.payload };
      break;
    default:
      return state;
  }

  // Persist to localStorage (excluding transient state)
  if (typeof window !== 'undefined') {
    try {
      const toPersist = {
        instrument: newState.instrument,
        chartType: newState.chartType,
        timeframe: newState.timeframe,
        tickMultiplier: newState.tickMultiplier,
        showHeatmap: newState.showHeatmap,
        showCandlesticks: newState.showCandlesticks,
        showDOM: newState.showDOM,
        showPOC: newState.showPOC,
        showValueArea: newState.showValueArea,
        showImbalances: newState.showImbalances,
        valueAreaPercent: newState.valueAreaPercent,
        imbalanceRatio: newState.imbalanceRatio,
        imbalanceMinVolume: newState.imbalanceMinVolume,
        themes: newState.themes,
        activeThemeId: newState.activeThemeId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
    } catch {
      // Ignore storage errors
    }
  }

  return newState;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

interface FootprintContextValue {
  state: FootprintState;
  
  // Actions
  setInstrument: (val: string) => void;
  setChartType: (val: ChartType) => void;
  setTimeframe: (val: Timeframe) => void;
  setTickMultiplier: (val: number) => void;
  toggleHeatmap: () => void;
  toggleCandlesticks: () => void;
  toggleDOM: () => void;
  togglePOC: () => void;
  toggleValueArea: () => void;
  toggleImbalances: () => void;
  setValueAreaPercent: (val: number) => void;
  setImbalanceRatio: (val: number) => void;
  setImbalanceMinVolume: (val: number) => void;
  setTheme: (id: string) => void;
  addTheme: (theme: Theme) => void;
  getActiveTheme: () => Theme;
  setActiveTool: (val: DrawingTool | null) => void;
  addDrawing: (d: Drawing) => void;
  updateDrawing: (id: string, updates: Partial<Drawing>) => void;
  deleteDrawing: (id: string) => void;
  selectDrawing: (id: string | null) => void;
  clearAllDrawings: () => void;
  setSettingsPanelOpen: (val: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  restoreDrawings: (drawings: Drawing[]) => void;
}

const FootprintContext = createContext<FootprintContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function FootprintProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(footprintReducer, undefined, getInitialState);

  const setInstrument = useCallback((val: string) => dispatch({ type: 'SET_INSTRUMENT', payload: val }), []);
  const setChartType = useCallback((val: ChartType) => dispatch({ type: 'SET_CHART_TYPE', payload: val }), []);
  const setTimeframe = useCallback((val: Timeframe) => dispatch({ type: 'SET_TIMEFRAME', payload: val }), []);
  const setTickMultiplier = useCallback((val: number) => dispatch({ type: 'SET_TICK_MULTIPLIER', payload: val }), []);
  const toggleHeatmap = useCallback(() => dispatch({ type: 'TOGGLE_HEATMAP' }), []);
  const toggleCandlesticks = useCallback(() => dispatch({ type: 'TOGGLE_CANDLESTICKS' }), []);
  const toggleDOM = useCallback(() => dispatch({ type: 'TOGGLE_DOM' }), []);
  const togglePOC = useCallback(() => dispatch({ type: 'TOGGLE_POC' }), []);
  const toggleValueArea = useCallback(() => dispatch({ type: 'TOGGLE_VALUE_AREA' }), []);
  const toggleImbalances = useCallback(() => dispatch({ type: 'TOGGLE_IMBALANCES' }), []);
  const setValueAreaPercent = useCallback((val: number) => dispatch({ type: 'SET_VALUE_AREA_PERCENT', payload: val }), []);
  const setImbalanceRatio = useCallback((val: number) => dispatch({ type: 'SET_IMBALANCE_RATIO', payload: val }), []);
  const setImbalanceMinVolume = useCallback((val: number) => dispatch({ type: 'SET_IMBALANCE_MIN_VOLUME', payload: val }), []);
  const setTheme = useCallback((id: string) => dispatch({ type: 'SET_THEME', payload: id }), []);
  const addTheme = useCallback((theme: Theme) => dispatch({ type: 'ADD_THEME', payload: theme }), []);
  const setActiveTool = useCallback((val: DrawingTool | null) => dispatch({ type: 'SET_ACTIVE_TOOL', payload: val }), []);
  const addDrawing = useCallback((d: Drawing) => dispatch({ type: 'ADD_DRAWING', payload: d }), []);
  const updateDrawing = useCallback((id: string, updates: Partial<Drawing>) => dispatch({ type: 'UPDATE_DRAWING', payload: { id, updates } }), []);
  const deleteDrawing = useCallback((id: string) => dispatch({ type: 'DELETE_DRAWING', payload: id }), []);
  const selectDrawing = useCallback((id: string | null) => dispatch({ type: 'SELECT_DRAWING', payload: id }), []);
  const clearAllDrawings = useCallback(() => dispatch({ type: 'CLEAR_ALL_DRAWINGS' }), []);
  const setSettingsPanelOpen = useCallback((val: boolean) => dispatch({ type: 'SET_SETTINGS_PANEL_OPEN', payload: val }), []);
  const setConnectionStatus = useCallback((status: ConnectionStatus) => dispatch({ type: 'SET_CONNECTION_STATUS', payload: status }), []);
  const restoreDrawings = useCallback((drawings: Drawing[]) => dispatch({ type: 'RESTORE_DRAWINGS', payload: drawings }), []);

  const getActiveTheme = useCallback(() => {
    return state.themes.find((t) => t.id === state.activeThemeId) || state.themes[0];
  }, [state.themes, state.activeThemeId]);

  const value = useMemo(
    () => ({
      state,
      setInstrument,
      setChartType,
      setTimeframe,
      setTickMultiplier,
      toggleHeatmap,
      toggleCandlesticks,
      toggleDOM,
      togglePOC,
      toggleValueArea,
      toggleImbalances,
      setValueAreaPercent,
      setImbalanceRatio,
      setImbalanceMinVolume,
      setTheme,
      addTheme,
      getActiveTheme,
      setActiveTool,
      addDrawing,
      updateDrawing,
      deleteDrawing,
      selectDrawing,
      clearAllDrawings,
      setSettingsPanelOpen,
      setConnectionStatus,
      restoreDrawings,
    }),
    [
      state,
      setInstrument,
      setChartType,
      setTimeframe,
      setTickMultiplier,
      toggleHeatmap,
      toggleCandlesticks,
      toggleDOM,
      togglePOC,
      toggleValueArea,
      toggleImbalances,
      setValueAreaPercent,
      setImbalanceRatio,
      setImbalanceMinVolume,
      setTheme,
      addTheme,
      getActiveTheme,
      setActiveTool,
      addDrawing,
      updateDrawing,
      deleteDrawing,
      selectDrawing,
      clearAllDrawings,
      setSettingsPanelOpen,
      setConnectionStatus,
      restoreDrawings,
    ]
  );

  return <FootprintContext.Provider value={value}>{children}</FootprintContext.Provider>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useFootprintStore() {
  const context = useContext(FootprintContext);
  if (!context) {
    throw new Error('useFootprintStore must be used within FootprintProvider');
  }
  return context;
}

export default useFootprintStore;
