/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import FreeFloatingCanvas from '../app/components/FreeFloatingCanvas';
import { WidgetModal } from './WidgetModal';
import { MockWidget } from './MockWidget';
import { availableWidgets, getWidgetTranslationKey } from '../constants/widgets';
import { DEFAULT_GRID_SIZES, MOCK_SAVED_TEMPLATES } from '../constants/layouts';
import { LayoutType, Widget, ResizeState, SavedTemplate } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { saveWidgetState, loadWidgetState, clearWidgetState, WidgetState } from '../utils/widgetPersistence';
import ThemeToggle from './ui/ThemeToggle';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../hooks/usePreferences';
import { ResizablePair } from './bloomberg-ui/ResizablePair';
import { ResizableGroup } from './bloomberg-ui/ResizableGroup';

// LayoutType now imported from ../../types

// Widget interface now imported from ../../types

// Move the widgetIcons mapping to the top-level scope of the file, above all components, so it is accessible everywhere in the file.
const widgetIcons: Record<string, React.ReactNode> = {
  'tabbed-widget': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="7" width="18" height="14" rx="2" stroke="currentColor" />
      <path d="M3 7h6a2 2 0 0 1 2 2v0" stroke="currentColor" />
      <path d="M11 7h6a2 2 0 0 1 2 2v0" stroke="currentColor" />
    </svg>
  ),
  'rolling-zscore': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="4 17 10 11 14 15 20 9" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="4" cy="17" r="1.5" fill="currentColor" />
      <circle cx="10" cy="11" r="1.5" fill="currentColor" />
      <circle cx="14" cy="15" r="1.5" fill="currentColor" />
      <circle cx="20" cy="9" r="1.5" fill="currentColor" />
    </svg>
  ),
  'deviation-profile': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="4" y="8" width="16" height="8" rx="2" stroke="currentColor" />
      <path d="M8 16V8M16 16V8" stroke="currentColor" />
    </svg>
  ),
  'market-overview': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" />
      <rect x="14" y="3" width="7" height="7" rx="2" stroke="currentColor" />
      <rect x="3" y="14" width="7" height="7" rx="2" stroke="currentColor" />
      <rect x="14" y="14" width="7" height="7" rx="2" stroke="currentColor" />
    </svg>
  ),
  'advanced-chart': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
      <path d="M7 17V13M12 17V7M17 17V10" stroke="currentColor" />
    </svg>
  ),
  'gbpusd-analysis': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <text x="4" y="17" fontSize="10" fill="white">£$</text>
      <circle cx="12" cy="12" r="10" stroke="currentColor" />
    </svg>
  ),
  'seasonality-heatmap': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="4" y="4" width="4" height="4" fill="currentColor" />
      <rect x="10" y="4" width="4" height="4" fill="currentColor" />
      <rect x="16" y="4" width="4" height="4" fill="currentColor" />
      <rect x="4" y="10" width="4" height="4" fill="currentColor" />
      <rect x="10" y="10" width="4" height="4" fill="currentColor" />
      <rect x="16" y="10" width="4" height="4" fill="currentColor" />
      <rect x="4" y="16" width="4" height="4" fill="currentColor" />
      <rect x="10" y="16" width="4" height="4" fill="currentColor" />
      <rect x="16" y="16" width="4" height="4" fill="currentColor" />
    </svg>
  ),
  'economic-calendar': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" />
      <path d="M16 3v4M8 3v4M3 9h18" stroke="currentColor" />
    </svg>
  ),
  'event-calendar': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" />
      <path d="M16 3v4M8 3v4M3 9h18" stroke="currentColor" />
      <circle cx="8" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="16" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
  'correlation-matrix': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="7" cy="7" r="3" stroke="currentColor" />
      <circle cx="17" cy="7" r="3" stroke="currentColor" />
      <circle cx="7" cy="17" r="3" stroke="currentColor" />
      <circle cx="17" cy="17" r="3" stroke="currentColor" />
      <path d="M7 7L17 17M17 7L7 17" stroke="currentColor" />
    </svg>
  ),
  'volatility-surface': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 17c2-2.5 4-7.5 8-7.5s6 5 8 7.5" stroke="currentColor" />
      <circle cx="12" cy="9.5" r="1.5" fill="currentColor" />
    </svg>
  ),
  'order-book': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" />
      <path d="M9 8h6M9 12h6M9 16h6" stroke="currentColor" />
    </svg>
  ),
  'news-feed': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" />
      <path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" />
    </svg>
  ),
  'price-chart': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
      <path d="M7 17V13M12 17V7M17 17V10" stroke="currentColor" />
      <circle cx="7" cy="13" r="1" fill="currentColor" />
      <circle cx="12" cy="7" r="1" fill="currentColor" />
      <circle cx="17" cy="10" r="1" fill="currentColor" />
    </svg>
  ),
  'technical-charts': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
      <path d="M7 17V13M12 17V7M17 17V10" stroke="currentColor" />
      <circle cx="7" cy="13" r="1" fill="currentColor" />
      <circle cx="12" cy="7" r="1" fill="currentColor" />
      <circle cx="17" cy="10" r="1" fill="currentColor" />
    </svg>
  ),
  'information-chart': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
      <path d="M12 8v8M12 4h.01" stroke="currentColor" />
    </svg>
  ),
};

// availableWidgets now imported from ../../constants/widgets

// WidgetModalProps interface now imported from ../../types



// ResizeState interface now imported from ../../types

interface PMTDashboardProps {
  ssrWidgetData?: {
    seasonalityForecast: any;
    seasonalityPerformance: any;
    currencyStrength: any;
    realtimeNews: any;
    riskSentiment: any;
  };
}

export default function PMTDashboard({ ssrWidgetData }: PMTDashboardProps = {}) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { preferences, toggleNotifications } = usePreferences(user?.id);
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('single');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWidgetsMenuOpen, setIsWidgetsMenuOpen] = useState(false);
  const [widgets, setWidgets] = useState<{ [key: string]: Widget }>({});
  const [recentWidgets, setRecentWidgets] = useState<Widget[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [templatesDropdownOpen, setTemplatesDropdownOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SavedTemplate | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [activeSidePanel, setActiveSidePanel] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  
  // Mock saved templates data now imported from ../../constants/layouts
  const savedTemplates = MOCK_SAVED_TEMPLATES;

  const isFreeFloatingLayout = selectedLayout === 'no-grid';
  const widgetsForDisplay = useMemo(() => {
    return isFreeFloatingLayout
      ? availableWidgets.filter(widget => widget.id !== 'tabbed-widget')
      : availableWidgets;
  }, [isFreeFloatingLayout]);
  const recentWidgetsForDisplay = useMemo(() => {
    return isFreeFloatingLayout
      ? recentWidgets.filter(widget => widget.id !== 'tabbed-widget')
      : recentWidgets;
  }, [isFreeFloatingLayout, recentWidgets]);
  
  // Resize state and refs
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [gridSizes, setGridSizes] = useState<{ [key: string]: number[] }>(DEFAULT_GRID_SIZES);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag and drop state
  const [draggedWidget, setDraggedWidget] = useState<Widget | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Load saved widget state on component mount
  useEffect(() => {
    const savedState = loadWidgetState();
    if (savedState) {
      setSelectedLayout(savedState.selectedLayout as LayoutType || 'single');
      setWidgets((savedState.widgets as { [key: string]: Widget }) || {});
      setGridSizes(savedState.gridSizes || DEFAULT_GRID_SIZES);
      setRecentWidgets((savedState.recentWidgets as Widget[]) || []);
      // Note: freeFloatingWidgets would be handled by FreeFloatingCanvas component
    }
  }, []);
  
  // Save widget state whenever it changes
  useEffect(() => {
    const stateToSave: WidgetState = {
      widgets,
      selectedLayout,
      gridSizes,
      freeFloatingWidgets: [], // Will be handled by FreeFloatingCanvas
      recentWidgets
    };
    
    // Debounce saves to avoid excessive localStorage writes and prevent rapid re-mounting
    const timeoutId = setTimeout(() => {
      saveWidgetState(stateToSave);
    }, 1000); // Increased debounce time to prevent rapid re-mounting
    
    return () => clearTimeout(timeoutId);
  }, [widgets, selectedLayout, gridSizes, recentWidgets]);
  
  // Widget configuration state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedWidgetForConfig, setSelectedWidgetForConfig] = useState<Widget | null>(null);
  const [targetSectionForWidget, setTargetSectionForWidget] = useState<string>('');
  const [widgetConfig, setWidgetConfig] = useState({
    chartType: 'Technical Charts',
    module: 'Forex',
    symbol: 'Forex - EURUSD',
    interval: 'Daily'
  });

  // Tabbed Widget: layout picker state
  const [isTabbedLayoutPickerOpen, setIsTabbedLayoutPickerOpen] = useState(false);
  const [tabTargetWidgetSection, setTabTargetWidgetSection] = useState<string | null>(null);

  // Grid swap state: holds sectionId of first grid selected for swapping
  const [swappingFromSection, setSwappingFromSection] = useState<string | null>(null);

  // Mouse event handlers for resizing
  const handleMouseDown = useCallback((e: React.MouseEvent, direction: 'horizontal' | 'vertical', layoutKey: string, dividerIndex?: number) => {
    e.preventDefault();
    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const startSizes = [...(gridSizes[layoutKey] || [])];
    
    setResizeState({
      isResizing: true,
      direction,
      startPos,
      startSizes,
      dividerIndex
    });
  }, [gridSizes]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizeState || !containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const currentPos = resizeState.direction === 'horizontal' ? e.clientX : e.clientY;
    const containerSize = resizeState.direction === 'horizontal' ? containerRect.width : containerRect.height;
    const delta = currentPos - resizeState.startPos;
    const deltaPercent = (delta / containerSize) * 100;

    const newSizes = [...resizeState.startSizes];
    
    // Handle different layout types
    if (selectedLayout === 'two-vertical' || selectedLayout === 'two-horizontal') {
      newSizes[0] = Math.max(10, Math.min(90, resizeState.startSizes[0] + deltaPercent));
      newSizes[1] = 100 - newSizes[0];
    } else if (selectedLayout === 'three-vertical' || selectedLayout === 'three-horizontal') {
      // For three-column/row layouts, only adjust the two adjacent sections
      const dividerIndex = resizeState.dividerIndex || 0;
      
      if (dividerIndex === 0) {
        // First divider: adjust sections 0 and 1
        const totalAdjustable = resizeState.startSizes[0] + resizeState.startSizes[1];
        newSizes[0] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[0] + deltaPercent));
        newSizes[1] = totalAdjustable - newSizes[0];
        // Section 2 stays the same
        newSizes[2] = resizeState.startSizes[2];
      } else {
        // Second divider: adjust sections 1 and 2
        const totalAdjustable = resizeState.startSizes[1] + resizeState.startSizes[2];
        newSizes[1] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[1] + deltaPercent));
        newSizes[2] = totalAdjustable - newSizes[1];
        // Section 0 stays the same
        newSizes[0] = resizeState.startSizes[0];
      }
    } else if (selectedLayout === 'three-left-right') {
      if (resizeState.direction === 'horizontal') {
        // Adjusting left panel
        newSizes[0] = Math.max(10, Math.min(80, resizeState.startSizes[0] + deltaPercent));
        const remaining = 100 - newSizes[0];
        const ratio = resizeState.startSizes[1] / (resizeState.startSizes[1] + resizeState.startSizes[2]);
        newSizes[1] = remaining * ratio;
        newSizes[2] = remaining * (1 - ratio);
      } else {
        // Adjusting right panels
        newSizes[1] = Math.max(10, Math.min(80, resizeState.startSizes[1] + deltaPercent));
        newSizes[2] = (100 - newSizes[0]) - newSizes[1];
        newSizes[2] = Math.max(10, newSizes[2]);
      }
    } else if (selectedLayout === 'three-top-bottom') {
      if (resizeState.direction === 'horizontal') {
        // Adjusting top panels
        newSizes[0] = Math.max(10, Math.min(80, resizeState.startSizes[0] + deltaPercent));
        newSizes[1] = (100 - newSizes[2]) - newSizes[0];
        newSizes[1] = Math.max(10, newSizes[1]);
      } else {
        // Adjusting bottom panel
        newSizes[2] = Math.max(10, Math.min(80, resizeState.startSizes[2] + deltaPercent));
        const remaining = 100 - newSizes[2];
        const ratio = resizeState.startSizes[0] / (resizeState.startSizes[0] + resizeState.startSizes[1]);
        newSizes[0] = remaining * ratio;
        newSizes[1] = remaining * (1 - ratio);
      }
    } else if (selectedLayout === 'three-left-stack') {
      if (resizeState.direction === 'vertical') {
        // Adjusting left panels
        newSizes[0] = Math.max(10, Math.min(80, resizeState.startSizes[0] + deltaPercent));
        newSizes[1] = (100 - newSizes[2]) - newSizes[0];
        newSizes[1] = Math.max(10, newSizes[1]);
      } else {
        // Adjusting right panel
        newSizes[2] = Math.max(10, Math.min(80, resizeState.startSizes[2] + deltaPercent));
        const remaining = 100 - newSizes[2];
        const ratio = resizeState.startSizes[0] / (resizeState.startSizes[0] + resizeState.startSizes[1]);
        newSizes[0] = remaining * ratio;
        newSizes[1] = remaining * (1 - ratio);
      }
    } else if (selectedLayout === 'three-right-stack') {
      if (resizeState.direction === 'horizontal') {
        // Adjusting left panel
        newSizes[0] = Math.max(10, Math.min(80, resizeState.startSizes[0] + deltaPercent));
        const remaining = 100 - newSizes[0];
        const ratio = resizeState.startSizes[1] / (resizeState.startSizes[1] + resizeState.startSizes[2]);
        newSizes[1] = remaining * ratio;
        newSizes[2] = remaining * (1 - ratio);
      } else {
        // Adjusting right panels
        newSizes[1] = Math.max(10, Math.min(80, resizeState.startSizes[1] + deltaPercent));
        newSizes[2] = (100 - newSizes[0]) - newSizes[1];
        newSizes[2] = Math.max(10, newSizes[2]);
      }
    } else if (selectedLayout === 'four-grid') {
      const dividerIndex = resizeState.dividerIndex || 0;
      if (resizeState.direction === 'horizontal') {
        if (dividerIndex === 0) {
          // First row divider: adjust top-left and top-right
          const totalAdjustable = resizeState.startSizes[0] + resizeState.startSizes[1];
          newSizes[0] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[0] + deltaPercent));
          newSizes[1] = totalAdjustable - newSizes[0];
          newSizes[2] = resizeState.startSizes[2];
          newSizes[3] = resizeState.startSizes[3];
        } else {
          // Second row divider: adjust bottom-left and bottom-right
          const totalAdjustable = resizeState.startSizes[2] + resizeState.startSizes[3];
          newSizes[2] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[2] + deltaPercent));
          newSizes[3] = totalAdjustable - newSizes[2];
          newSizes[0] = resizeState.startSizes[0];
          newSizes[1] = resizeState.startSizes[1];
        }
      } else {
        // Vertical divider: adjust top and bottom rows
        const totalTop = resizeState.startSizes[0] + resizeState.startSizes[1];
        const totalBottom = resizeState.startSizes[2] + resizeState.startSizes[3];
        const newTopTotal = Math.max(20, Math.min(80, totalTop + deltaPercent));
        const newBottomTotal = 100 - newTopTotal;
        
        const topRatio = resizeState.startSizes[0] / totalTop;
        const bottomRatio = resizeState.startSizes[2] / totalBottom;
        
        newSizes[0] = newTopTotal * topRatio;
        newSizes[1] = newTopTotal * (1 - topRatio);
        newSizes[2] = newBottomTotal * bottomRatio;
        newSizes[3] = newBottomTotal * (1 - bottomRatio);
      }
    } else if (selectedLayout === 'four-vertical' || selectedLayout === 'four-horizontal') {
      // For four-column/row layouts, only adjust the two adjacent sections
      const dividerIndex = resizeState.dividerIndex || 0;
      
      if (dividerIndex === 0) {
        // First divider: adjust sections 0 and 1
        const totalAdjustable = resizeState.startSizes[0] + resizeState.startSizes[1];
        newSizes[0] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[0] + deltaPercent));
        newSizes[1] = totalAdjustable - newSizes[0];
        newSizes[2] = resizeState.startSizes[2];
        newSizes[3] = resizeState.startSizes[3];
      } else if (dividerIndex === 1) {
        // Second divider: adjust sections 1 and 2
        const totalAdjustable = resizeState.startSizes[1] + resizeState.startSizes[2];
        newSizes[1] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[1] + deltaPercent));
        newSizes[2] = totalAdjustable - newSizes[1];
        newSizes[0] = resizeState.startSizes[0];
        newSizes[3] = resizeState.startSizes[3];
      } else {
        // Third divider: adjust sections 2 and 3
        const totalAdjustable = resizeState.startSizes[2] + resizeState.startSizes[3];
        newSizes[2] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[2] + deltaPercent));
        newSizes[3] = totalAdjustable - newSizes[2];
        newSizes[0] = resizeState.startSizes[0];
        newSizes[1] = resizeState.startSizes[1];
      }
    } else if (selectedLayout === 'five-grid') {
      const dividerIndex = resizeState.dividerIndex || 0;
      if (resizeState.direction === 'horizontal') {
        if (dividerIndex === 0) {
          // Top row divider: adjust first two sections
          const totalAdjustable = resizeState.startSizes[0] + resizeState.startSizes[1];
          newSizes[0] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[0] + deltaPercent));
          newSizes[1] = totalAdjustable - newSizes[0];
          newSizes[2] = resizeState.startSizes[2];
          newSizes[3] = resizeState.startSizes[3];
          newSizes[4] = resizeState.startSizes[4];
        } else if (dividerIndex === 1) {
          // Bottom row first divider: adjust sections 2 and 3
          const totalAdjustable = resizeState.startSizes[2] + resizeState.startSizes[3];
          newSizes[2] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[2] + deltaPercent));
          newSizes[3] = totalAdjustable - newSizes[2];
          newSizes[0] = resizeState.startSizes[0];
          newSizes[1] = resizeState.startSizes[1];
          newSizes[4] = resizeState.startSizes[4];
        } else {
          // Bottom row second divider: adjust sections 3 and 4
          const totalAdjustable = resizeState.startSizes[3] + resizeState.startSizes[4];
          newSizes[3] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[3] + deltaPercent));
          newSizes[4] = totalAdjustable - newSizes[3];
          newSizes[0] = resizeState.startSizes[0];
          newSizes[1] = resizeState.startSizes[1];
          newSizes[2] = resizeState.startSizes[2];
        }
      } else {
        // Vertical divider: adjust top and bottom rows
        const totalTop = resizeState.startSizes[0] + resizeState.startSizes[1];
        const totalBottom = resizeState.startSizes[2] + resizeState.startSizes[3] + resizeState.startSizes[4];
        const newTopTotal = Math.max(20, Math.min(80, totalTop + deltaPercent));
        const newBottomTotal = 100 - newTopTotal;
        
        const topRatio0 = resizeState.startSizes[0] / totalTop;
        const bottomRatio2 = resizeState.startSizes[2] / totalBottom;
        const bottomRatio3 = resizeState.startSizes[3] / totalBottom;
        
        newSizes[0] = newTopTotal * topRatio0;
        newSizes[1] = newTopTotal * (1 - topRatio0);
        newSizes[2] = newBottomTotal * bottomRatio2;
        newSizes[3] = newBottomTotal * bottomRatio3;
        newSizes[4] = newBottomTotal * (1 - bottomRatio2 - bottomRatio3);
      }
    } else if (selectedLayout === 'five-vertical' || selectedLayout === 'five-horizontal') {
      // For five-column/row layouts, only adjust the two adjacent sections
      const dividerIndex = resizeState.dividerIndex || 0;
      
      if (dividerIndex === 0) {
        // First divider: adjust sections 0 and 1
        const totalAdjustable = resizeState.startSizes[0] + resizeState.startSizes[1];
        newSizes[0] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[0] + deltaPercent));
        newSizes[1] = totalAdjustable - newSizes[0];
        newSizes[2] = resizeState.startSizes[2];
        newSizes[3] = resizeState.startSizes[3];
        newSizes[4] = resizeState.startSizes[4];
      } else if (dividerIndex === 1) {
        // Second divider: adjust sections 1 and 2
        const totalAdjustable = resizeState.startSizes[1] + resizeState.startSizes[2];
        newSizes[1] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[1] + deltaPercent));
        newSizes[2] = totalAdjustable - newSizes[1];
        newSizes[0] = resizeState.startSizes[0];
        newSizes[3] = resizeState.startSizes[3];
        newSizes[4] = resizeState.startSizes[4];
      } else if (dividerIndex === 2) {
        // Third divider: adjust sections 2 and 3
        const totalAdjustable = resizeState.startSizes[2] + resizeState.startSizes[3];
        newSizes[2] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[2] + deltaPercent));
        newSizes[3] = totalAdjustable - newSizes[2];
        newSizes[0] = resizeState.startSizes[0];
        newSizes[1] = resizeState.startSizes[1];
        newSizes[4] = resizeState.startSizes[4];
      } else {
        // Fourth divider: adjust sections 3 and 4
        const totalAdjustable = resizeState.startSizes[3] + resizeState.startSizes[4];
        newSizes[3] = Math.max(10, Math.min(totalAdjustable - 10, resizeState.startSizes[3] + deltaPercent));
        newSizes[4] = totalAdjustable - newSizes[3];
        newSizes[0] = resizeState.startSizes[0];
        newSizes[1] = resizeState.startSizes[1];
        newSizes[2] = resizeState.startSizes[2];
      }
    }

    setGridSizes(prev => ({ ...prev, [selectedLayout]: newSizes }));
  }, [resizeState, selectedLayout]);

  const handleMouseUp = useCallback(() => {
    setResizeState(null);
  }, []);

  useEffect(() => {
    if (resizeState?.isResizing) {
      const handleMouseMoveWithPrevent = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleMouseMove(e);
      };

      const handleMouseUpWithPrevent = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleMouseUp();
      };

      document.addEventListener('mousemove', handleMouseMoveWithPrevent, { passive: false });
      document.addEventListener('mouseup', handleMouseUpWithPrevent, { passive: false });
      document.addEventListener('scroll', (e) => e.preventDefault(), { passive: false });
      document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
      
      document.body.style.cursor = resizeState.direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
      document.body.style.overflow = 'hidden'; // Prevent scrolling during resize
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMoveWithPrevent);
        document.removeEventListener('mouseup', handleMouseUpWithPrevent);
        document.removeEventListener('scroll', (e) => e.preventDefault());
        document.removeEventListener('touchmove', (e) => e.preventDefault());
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.body.style.overflow = '';
      };
    }
  }, [resizeState, handleMouseMove, handleMouseUp]);

  // Click outside handler to close menus and modals
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close during drag operations
      if (isDragging) return;
      
      // Check if click is outside of any open menus/modals
      const isClickInsideMenu = target.closest('[data-menu]') || 
                               target.closest('[data-modal]') ||
                               target.closest('[data-sidebar]');
      
      if (!isClickInsideMenu) {
        // Close all menus and modals
        closeAllMenus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDragging, isMenuOpen, isWidgetsMenuOpen, isSaveModalOpen, templatesModalOpen, templatesDropdownOpen, modalOpen, isConfigModalOpen, isConfirmModalOpen, activeSidePanel, notifOpen]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Dispatch events when widget selector state changes
  useEffect(() => {
    // CRITICAL: Only dispatch events on client-side to avoid SSR issues
    if (typeof window === 'undefined') {
      return;
    }

    const event = new CustomEvent('widget-selector-state-change', { 
      detail: { isOpen: isWidgetsMenuOpen } 
    });
    window.dispatchEvent(event);
  }, [isWidgetsMenuOpen]);

  // Listen for Tabbed Widget + button requests
  useEffect(() => {
    const handleOpenTabbedPicker = (e: Event) => {
      const custom = e as CustomEvent<{ widget: Widget }>;
      // Find the sectionId that contains this widget reference
      const entries = Object.entries(widgets);
      const matched = entries.find(([, w]) => w && w.id === 'tabbed-widget' && w === custom.detail.widget);
      const sectionId = matched ? matched[0] : null;
      setTabTargetWidgetSection(sectionId);
      setIsTabbedLayoutPickerOpen(true);
      setIsMenuOpen(false);
      setIsWidgetsMenuOpen(false);
    };
    window.addEventListener('open-tabbed-widget-layout-picker', handleOpenTabbedPicker as EventListener);
    return () => window.removeEventListener('open-tabbed-widget-layout-picker', handleOpenTabbedPicker as EventListener);
  }, [widgets]);

  const layouts = [
    {
      id: 'single' as LayoutType,
      name: 'Single',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        </svg>
      )
    },
    // Two Grid Layouts
    {
      id: 'two-vertical' as LayoutType,
      name: 'Two Vertical',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="3" y="3" width="8" height="18" rx="1" ry="1"/>
          <rect x="13" y="3" width="8" height="18" rx="1" ry="1"/>
        </svg>
      )
    },
    {
      id: 'two-horizontal' as LayoutType,
      name: 'Two Horizontal',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="3" y="3" width="18" height="8" rx="1" ry="1"/>
          <rect x="3" y="13" width="18" height="8" rx="1" ry="1"/>
        </svg>
      )
    },
    // Three Grid Layouts
    {
      id: 'three-vertical' as LayoutType,
      name: 'Three Vertical',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="2" y="3" width="5" height="18" rx="1" ry="1"/>
          <rect x="9" y="3" width="5" height="18" rx="1" ry="1"/>
          <rect x="16" y="3" width="5" height="18" rx="1" ry="1"/>
        </svg>
      )
    },
    {
      id: 'three-horizontal' as LayoutType,
      name: 'Three Horizontal',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="3" y="2" width="18" height="5" rx="1" ry="1"/>
          <rect x="3" y="9" width="18" height="5" rx="1" ry="1"/>
          <rect x="3" y="16" width="18" height="5" rx="1" ry="1"/>
        </svg>
      )
    },
    {
      id: 'three-left-right' as LayoutType,
      name: 'Top + Bottom Split',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="3" y="3" width="18" height="8" rx="1" ry="1"/>
          <rect x="3" y="13" width="8" height="8" rx="1" ry="1"/>
          <rect x="13" y="13" width="8" height="8" rx="1" ry="1"/>
        </svg>
      )
    },
    {
      id: 'three-top-bottom' as LayoutType,
      name: 'Top Split + Bottom',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="3" y="3" width="8" height="8" rx="1" ry="1"/>
          <rect x="13" y="3" width="8" height="8" rx="1" ry="1"/>
          <rect x="3" y="13" width="18" height="8" rx="1" ry="1"/>
        </svg>
      )
    },
    {
      id: 'three-left-stack' as LayoutType,
      name: 'Left Stack',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="3" y="3" width="8" height="8" rx="1" ry="1"/>
          <rect x="3" y="13" width="8" height="8" rx="1" ry="1"/>
          <rect x="13" y="3" width="8" height="18" rx="1" ry="1"/>
        </svg>
      )
    },
    {
      id: 'three-right-stack' as LayoutType,
      name: 'Right Stack',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="3" y="3" width="8" height="18" rx="1" ry="1"/>
          <rect x="13" y="3" width="8" height="8" rx="1" ry="1"/>
          <rect x="13" y="13" width="8" height="8" rx="1" ry="1"/>
        </svg>
      )
    },
    // Four Grid Layouts
    {
      id: 'four-grid' as LayoutType,
      name: 'Four Grid',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="3" y="3" width="8" height="8" rx="1" ry="1"/>
          <rect x="13" y="3" width="8" height="8" rx="1" ry="1"/>
          <rect x="3" y="13" width="8" height="8" rx="1" ry="1"/>
          <rect x="13" y="13" width="8" height="8" rx="1" ry="1"/>
        </svg>
      )
    },
    {
      id: 'four-vertical' as LayoutType,
      name: 'Four Vertical',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="2" y="3" width="4" height="18" rx="1" ry="1"/>
          <rect x="7" y="3" width="4" height="18" rx="1" ry="1"/>
          <rect x="12" y="3" width="4" height="18" rx="1" ry="1"/>
          <rect x="17" y="3" width="4" height="18" rx="1" ry="1"/>
        </svg>
      )
    },
    {
      id: 'four-horizontal' as LayoutType,
      name: 'Four Horizontal',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="3" y="2" width="18" height="4" rx="1" ry="1"/>
          <rect x="3" y="7" width="18" height="4" rx="1" ry="1"/>
          <rect x="3" y="12" width="18" height="4" rx="1" ry="1"/>
          <rect x="3" y="17" width="18" height="4" rx="1" ry="1"/>
        </svg>
      )
    },
    // Five Grid Layouts
    {
      id: 'five-grid' as LayoutType,
      name: 'Five Grid',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="3" y="3" width="7" height="7" rx="1" ry="1"/>
          <rect x="12" y="3" width="9" height="7" rx="1" ry="1"/>
          <rect x="3" y="12" width="5" height="9" rx="1" ry="1"/>
          <rect x="10" y="12" width="5" height="9" rx="1" ry="1"/>
          <rect x="17" y="12" width="4" height="9" rx="1" ry="1"/>
        </svg>
      )
    },
    {
      id: 'five-vertical' as LayoutType,
      name: 'Five Vertical',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="2" y="3" width="3" height="18" rx="1" ry="1"/>
          <rect x="6" y="3" width="3" height="18" rx="1" ry="1"/>
          <rect x="10" y="3" width="3" height="18" rx="1" ry="1"/>
          <rect x="14" y="3" width="3" height="18" rx="1" ry="1"/>
          <rect x="18" y="3" width="3" height="18" rx="1" ry="1"/>
        </svg>
      )
    },
    {
      id: 'five-horizontal' as LayoutType,
      name: 'Five Horizontal',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="3" y="2" width="18" height="3" rx="1" ry="1"/>
          <rect x="3" y="6" width="18" height="3" rx="1" ry="1"/>
          <rect x="3" y="10" width="18" height="3" rx="1" ry="1"/>
          <rect x="3" y="14" width="18" height="3" rx="1" ry="1"/>
          <rect x="3" y="18" width="18" height="3" rx="1" ry="1"/>
        </svg>
      )
    }
  ];

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, widget: Widget) => {
    setDraggedWidget(widget);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', widget.id);
    // Delay closing the menu slightly to allow drag to start
    setTimeout(() => {
      setIsWidgetsMenuOpen(false);
    }, 50);
  };

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverSection(sectionId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're actually leaving the section
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverSection(null);
    }
  };

  const handleDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    if (draggedWidget) {
      // Show configuration modal instead of immediately adding
      setSelectedWidgetForConfig(draggedWidget);
      setTargetSectionForWidget(sectionId);
      setIsConfigModalOpen(true);
    }
    setDraggedWidget(null);
    setDragOverSection(null);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
    setDragOverSection(null);
    setIsDragging(false);
  };

  const closeAllMenus = () => {
    setIsMenuOpen(false);
    setIsWidgetsMenuOpen(false);
    setIsSaveModalOpen(false);
    setActiveSidePanel(null);
    setTemplatesModalOpen(false);
    setTemplatesDropdownOpen(false);
    setModalOpen(false);
    setIsConfigModalOpen(false);
    setIsConfirmModalOpen(false);
    setSaveTemplateName('');
    setSelectedWidgetForConfig(null);
    setTargetSectionForWidget('');
    setSelectedTemplate(null);
    setNotifOpen(false);
  };

  const handleAddWidget = (sectionId: string) => {
    setSelectedSection(sectionId);
    setModalOpen(true);
  };

  const handleSelectWidget = (widget: Widget) => {
    // Check if we're in no-grid mode
    if (isFreeFloatingLayout) {
      // Add directly to the free-floating canvas
      if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).addWidgetToCanvas) {
        ((window as unknown as Record<string, unknown>).addWidgetToCanvas as (widget: Widget) => void)(widget);
      }
      // Add to recent widgets
      if (widget.id !== 'tabbed-widget') {
        setRecentWidgets(prev => {
          const filtered = prev.filter(w => w.id !== widget.id);
          return [widget, ...filtered].slice(0, 6);
        });
      }
      setModalOpen(false);
      setIsWidgetsMenuOpen(false);
    } else {
      // Show configuration modal for grid layouts
      setSelectedWidgetForConfig(widget);
      setTargetSectionForWidget(selectedSection);
      setIsConfigModalOpen(true);
      setModalOpen(false); // Close the widget selection modal
    }
  };

  const handleSaveTemplate = () => {
    if (saveTemplateName.trim()) {
      // Here you would typically save to backend/localStorage
      // Reset and close modal
      setSaveTemplateName('');
      setIsSaveModalOpen(false);
      // Could show success message here
    }
  };

  const handleWidgetSettings = (sectionId: string) => {
    const widget = widgets[sectionId];
    if (widget) {
      // Open configuration modal directly for existing widget
      setSelectedWidgetForConfig(widget);
      setTargetSectionForWidget(sectionId);
      setIsConfigModalOpen(true);
    }
  };

  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModalData({ title, message, onConfirm });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmClose = () => {
    setIsConfirmModalOpen(false);
    setConfirmModalData(null);
  };

  const handleConfirmAction = () => {
    if (confirmModalData?.onConfirm) {
      confirmModalData.onConfirm();
    }
    handleConfirmClose();
  };

  // Helper function to check if a section is inside a tabbed widget
  const isSectionInsideTabbedWidget = (sectionId: string): boolean => {
    // Check if the section ID contains the tabbed widget separator
    if (sectionId.includes('::')) {
      return true;
    }
    return false;
  };

  const WidgetSection = ({ sectionId, edges }: { sectionId: string; edges?: { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean } }) => {
    const widget = widgets[sectionId];
    const isDragOver = dragOverSection === sectionId;
    
    // Build hover border classes based on which edges are outer edges
    const getHoverBorderClasses = () => {
      if (!edges) return 'hover:border-primary/50';
      
      const classes = [];
      if (edges.top) classes.push('hover:border-t-primary');
      if (edges.right) classes.push('hover:border-r-primary');
      if (edges.bottom) classes.push('hover:border-b-primary');
      if (edges.left) classes.push('hover:border-l-primary');
      
      return classes.join(' ');
    };
    
    const handleSectionClick = (e: React.MouseEvent) => {
      // Close menus when clicking on non-interactive elements
      const target = e.target as HTMLElement;
      
      // Don't close if clicking on buttons, inputs, or interactive elements
      if (target.closest('button') || 
          target.closest('input') || 
          target.closest('select') || 
          target.closest('textarea') ||
          target.closest('[data-menu]') ||
          target.closest('[data-modal]') ||
          target.closest('[data-sidebar]')) {
        return;
      }
      
      // Close all menus when clicking on widget content or empty space
      closeAllMenus();
    };
    
    return (
      <div 
        className={`relative w-full h-full bg-neutral-900 border-2 transition-all duration-200 flex flex-col overflow-hidden ${
          isDragOver 
            ? 'border-white bg-neutral-800 border-dashed' 
            : swappingFromSection && swappingFromSection !== sectionId 
              ? 'border-yellow-500' 
              : `border-neutral-700 ${getHoverBorderClasses()}`
        }`}
        onDragOver={(e) => handleDragOver(e, sectionId)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, sectionId)}
        onClick={handleSectionClick}
      >
        {widget && (
          <div className="flex justify-between items-center p-2 bg-neutral-800 border-b border-neutral-700 flex-shrink-0">
            <span className="text-neutral-300 text-xs font-medium truncate">{widget.name}</span>
            <div className="flex items-center gap-1">
              {/* Swap button (only for grid layouts, ignored in no-grid) */}
              {selectedLayout !== 'no-grid' && widget && (
                <button
                  onClick={() => {
                    if (!swappingFromSection) {
                      // Start swap from this section
                      setSwappingFromSection(sectionId);
                    } else if (swappingFromSection === sectionId) {
                      // Cancel swap
                      setSwappingFromSection(null);
                    } else {
                      // Perform swap
                      const secondSection = sectionId;
                      setWidgets(prev => {
                        const newWidgets = { ...prev };
                        const temp = newWidgets[swappingFromSection!];
                        newWidgets[swappingFromSection!] = newWidgets[secondSection];
                        newWidgets[secondSection] = temp;
                        return newWidgets;
                      });
                      setSwappingFromSection(null);
                    }
                  }}
                  className={`text-neutral-400 hover:text-neutral-200 transition-colors ${swappingFromSection === sectionId ? 'text-yellow-400' : ''}`}
                  title={swappingFromSection ? (swappingFromSection === sectionId ? 'Cancel swap' : 'Swap with this grid') : 'Swap grid'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h6v6H4V4zm0 10h6v6H4v-6zm10-10h6v6h-6V4zm0 10h6v6h-6v-6z" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => handleWidgetSettings(sectionId)}
                className="text-neutral-400 hover:text-neutral-200 transition-colors"
                title="Widget settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={() => handleAddWidget(sectionId)}
                className="text-neutral-400 hover:text-neutral-200 transition-colors"
                title="Replace widget"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button
                onClick={() => {
                  showConfirmation(
                    'Remove Widget',
                    'Are you sure you want to remove this widget?',
                    () => {
                      // Optimize widget removal to prevent unnecessary re-renders
                      setWidgets(prev => {
                        const newWidgets = { ...prev };
                        delete newWidgets[sectionId];
                        return newWidgets;
                      });
                      
                      // Clear any cached data for this widget to prevent memory leaks
                      if (sectionId && typeof window !== 'undefined') {
                        // Dispatch cleanup event for widgets to handle their own cleanup
                        window.dispatchEvent(new CustomEvent('widget-cleanup', { 
                          detail: { sectionId, widgetId: sectionId } 
                        }));
                      }
                    }
                  );
                }}
                className="text-neutral-400 hover:text-red-400 transition-colors"
                title="Remove widget"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-hidden">
          {widget ? (
            <div className="h-full min-h-0 overflow-hidden">
              <MockWidget 
                key={sectionId}
                widget={widget} 
                sectionId={sectionId}
                onUpdateWidgetConfig={(sid, updater) => {
                  setWidgets(prev => {
                    const current = prev[sid];
                    if (!current) return prev;
                    const newConfig = updater(current.config || {});
                    const updated: Widget = { ...current, config: newConfig };
                    return { ...prev, [sid]: updated };
                  });
                }}
                renderNestedLayout={renderNestedLayout}
                onRemoveNestedSections={(prefix) => {
                  setWidgets(prev => {
                    const next = { ...prev };
                    for (const key of Object.keys(next)) {
                      if (key.startsWith(prefix)) {
                        delete next[key];
                      }
                    }
                    return next;
                  });
                }}
                ssrWidgetData={ssrWidgetData}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2">
              {isDragOver ? (
                <div className="text-white text-sm font-medium animate-pulse">
                  Drop widget here
                </div>
              ) : (
                <button 
                  onClick={() => handleAddWidget(sectionId)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-300 hover:text-neutral-200 transition-colors text-xs font-medium"
                >
                  {t('Dashboard.AddWidget')}
                </button>
              )}
            </div>
          )}
        </div>
        {/* Swap overlay button */}
        {swappingFromSection && swappingFromSection !== sectionId && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button
              className="pointer-events-auto px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-semibold rounded"
              onClick={(e) => {
                e.stopPropagation();
                // Perform swap
                setWidgets(prev => {
                  const newWidgets = { ...prev };
                  const temp = newWidgets[swappingFromSection!];
                  newWidgets[swappingFromSection!] = newWidgets[sectionId];
                  newWidgets[sectionId] = temp;
                  return newWidgets;
                });
                setSwappingFromSection(null);
              }}
            >
              Move Here
            </button>
          </div>
        )}
      </div>
    );
  };

  // Memoize currentSizes to prevent unnecessary recalculation in useMemo hooks
  const currentSizes = useMemo(() => {
    return gridSizes[selectedLayout] || [];
  }, [gridSizes, selectedLayout]);

  // Memoize row sizes for four-grid layout to prevent recalculation on every render
  const memoizedRowSizes = useMemo(() => {
    if (selectedLayout !== 'four-grid' && selectedLayout !== '4-grid') {
      return {};
    }
    const numRows = 2;
    const numCols = 2;
    const defaultColWidth = 100 / numCols;
    const rowSizesMap: { [rowIndex: number]: string[] } = {};
    for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
      const rowStart = rowIndex * numCols;
      rowSizesMap[rowIndex] = Array.from({ length: numCols }, (_, colIndex) => {
        const storedSize = currentSizes[rowStart + colIndex];
        return storedSize ? `${storedSize}%` : `${defaultColWidth}%`;
      });
    }
    return rowSizesMap;
  }, [currentSizes, selectedLayout]);

  const renderLayout = () => {
    switch (selectedLayout) {
      case 'single':
        return <WidgetSection sectionId="single" edges={{ top: true, right: true, bottom: true, left: true }} />;
      
      case 'two-vertical':
      case '2-grid-vertical':
        // Use ResizablePair for two-column layouts
        {
          const sizes: [string, string] = [
            `${currentSizes[0] || 50}%`,
            `${currentSizes[1] || 50}%`
          ];
        return (
            <ResizablePair
              direction="horizontal"
              minSize={60}
              initialSizes={sizes}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: [parseFloat(newSizes[0]), parseFloat(newSizes[1])]
                }));
              }}
            >
              <div className="w-full h-full"><WidgetSection sectionId="two-vertical-0" edges={{ top: true, left: true, bottom: true }} /></div>
              <div className="w-full h-full"><WidgetSection sectionId="two-vertical-1" edges={{ top: true, right: true, bottom: true }} /></div>
            </ResizablePair>
          );
        }
      
      case 'two-horizontal':
      case '2-grid-horizontal':
        // Use ResizablePair for two-row layouts
        {
          const sizes: [string, string] = [
            `${currentSizes[0] || 50}%`,
            `${currentSizes[1] || 50}%`
          ];
        return (
            <ResizablePair
              direction="vertical"
              minSize={60}
              initialSizes={sizes}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: [parseFloat(newSizes[0]), parseFloat(newSizes[1])]
                }));
              }}
            >
              <div className="w-full h-full"><WidgetSection sectionId="two-horizontal-0" edges={{ top: true, left: true, right: true }} /></div>
              <div className="w-full h-full"><WidgetSection sectionId="two-horizontal-1" edges={{ bottom: true, left: true, right: true }} /></div>
            </ResizablePair>
          );
        }
      
      case 'three-vertical':
      case '3-grid-columns':
        // Use ResizableGroup for three-column layouts
        {
          const sizes = [
            `${currentSizes[0] || 33.33}%`,
            `${currentSizes[1] || 33.33}%`,
            `${currentSizes[2] || 33.34}%`
          ];
        return (
            <ResizableGroup
              direction="horizontal"
              minSize={60}
              cells={[
                { content: <div className="w-full h-full"><WidgetSection sectionId="three-vertical-0" edges={{ top: true, bottom: true, left: true }} /></div>, position: "three-vertical-0", initialSize: sizes[0] },
                { content: <div className="w-full h-full"><WidgetSection sectionId="three-vertical-1" edges={{ top: true, bottom: true }} /></div>, position: "three-vertical-1", initialSize: sizes[1] },
                { content: <div className="w-full h-full"><WidgetSection sectionId="three-vertical-2" edges={{ top: true, bottom: true, right: true }} /></div>, position: "three-vertical-2", initialSize: sizes[2] }
              ]}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: newSizes.map(s => parseFloat(s))
                }));
              }}
            />
          );
        }

      case 'three-horizontal':
      case '3-grid-rows':
        // Use ResizableGroup for three-row layouts
        {
          const sizes = [
            `${currentSizes[0] || 33.33}%`,
            `${currentSizes[1] || 33.33}%`,
            `${currentSizes[2] || 33.34}%`
          ];
        return (
            <ResizableGroup
              direction="vertical"
              minSize={60}
              cells={[
                { content: <div className="w-full h-full"><WidgetSection sectionId="three-horizontal-0" edges={{ top: true, left: true, right: true }} /></div>, position: "three-horizontal-0", initialSize: sizes[0] },
                { content: <div className="w-full h-full"><WidgetSection sectionId="three-horizontal-1" edges={{ left: true, right: true }} /></div>, position: "three-horizontal-1", initialSize: sizes[1] },
                { content: <div className="w-full h-full"><WidgetSection sectionId="three-horizontal-2" edges={{ bottom: true, left: true, right: true }} /></div>, position: "three-horizontal-2", initialSize: sizes[2] }
              ]}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: newSizes.map(s => parseFloat(s))
                }));
              }}
            />
          );
        }

      case 'three-left-right':
        // Re-purpose to Top + Bottom Split (full-width top, split bottom)
        return (
          <div className="flex flex-col w-full h-full" ref={containerRef}>
            {/* Full-width top row */}
            <div style={{ height: `${currentSizes[0]}%` }}>
              <WidgetSection sectionId="three-left-right-0" edges={{ top: true, left: true, right: true }} />
            </div>
            {/* Divider between top and bottom */}
            <div 
              className="h-1 bg-neutral-700 hover:bg-neutral-500 cursor-row-resize transition-colors flex items-center justify-center"
              onMouseDown={(e) => handleMouseDown(e, 'vertical', 'three-left-right')}
            >
              <div className="h-0.5 w-8 bg-neutral-500"></div>
            </div>
            {/* Bottom row split into two columns using the remaining two sizes */}
            <div className="flex" style={{ height: `${currentSizes[1] + currentSizes[2]}%` }}>
              <div style={{ width: `${(currentSizes[1] / (currentSizes[1] + currentSizes[2])) * 100}%` }}>
                <WidgetSection sectionId="three-left-right-1" edges={{ bottom: true, left: true }} />
              </div>
              <div className="w-1 bg-neutral-700" />
              <div style={{ width: `${(currentSizes[2] / (currentSizes[1] + currentSizes[2])) * 100}%` }}>
                <WidgetSection sectionId="three-left-right-2" edges={{ bottom: true, right: true }} />
              </div>
            </div>
          </div>
        );

      case 'three-top-bottom':
        return (
          <div className="flex flex-col w-full h-full" ref={containerRef}>
            <div className="flex" style={{ height: `${(currentSizes[0] + currentSizes[1]) / (currentSizes[0] + currentSizes[1] + currentSizes[2]) * 100}%` }}>
              <div style={{ width: `${(currentSizes[0] / (currentSizes[0] + currentSizes[1])) * 100}%` }}>
                <WidgetSection sectionId="three-top-bottom-0" edges={{ top: true, left: true }} />
              </div>
              <div 
                className="w-1 bg-neutral-700 hover:bg-neutral-500 cursor-col-resize transition-colors flex items-center justify-center"
                onMouseDown={(e) => handleMouseDown(e, 'horizontal', 'three-top-bottom')}
              >
                <div className="w-0.5 h-8 bg-neutral-500"></div>
              </div>
              <div style={{ width: `${(currentSizes[1] / (currentSizes[0] + currentSizes[1])) * 100}%` }}>
                <WidgetSection sectionId="three-top-bottom-1" edges={{ top: true, right: true }} />
              </div>
            </div>
            <div 
              className="h-1 bg-neutral-700 hover:bg-neutral-500 cursor-row-resize transition-colors flex items-center justify-center"
              onMouseDown={(e) => handleMouseDown(e, 'vertical', 'three-top-bottom')}
            >
              <div className="h-0.5 w-8 bg-neutral-500"></div>
            </div>
            <div style={{ height: `${(currentSizes[2] / (currentSizes[0] + currentSizes[1] + currentSizes[2])) * 100}%` }}>
              <WidgetSection sectionId="three-top-bottom-2" edges={{ bottom: true, left: true, right: true }} />
            </div>
          </div>
        );

      case 'three-left-stack':
        return (
          <div className="flex w-full h-full" ref={containerRef}>
            <div className="flex flex-col" style={{ width: `${(currentSizes[0] + currentSizes[1]) / (currentSizes[0] + currentSizes[1] + currentSizes[2]) * 100}%` }}>
              <div style={{ height: `${(currentSizes[0] / (currentSizes[0] + currentSizes[1])) * 100}%` }}>
                <WidgetSection sectionId="three-left-stack-0" edges={{ top: true, left: true }} />
              </div>
              <div 
                className="h-1 bg-neutral-700 hover:bg-neutral-500 cursor-row-resize transition-colors flex items-center justify-center"
                onMouseDown={(e) => handleMouseDown(e, 'vertical', 'three-left-stack')}
              >
                <div className="h-0.5 w-8 bg-neutral-500"></div>
              </div>
              <div style={{ height: `${(currentSizes[1] / (currentSizes[0] + currentSizes[1])) * 100}%` }}>
                <WidgetSection sectionId="three-left-stack-1" edges={{ bottom: true, left: true }} />
              </div>
            </div>
            <div 
              className="w-1 bg-neutral-700 hover:bg-neutral-500 cursor-col-resize transition-colors flex items-center justify-center"
              onMouseDown={(e) => handleMouseDown(e, 'horizontal', 'three-left-stack')}
            >
              <div className="w-0.5 h-8 bg-neutral-500"></div>
            </div>
            <div style={{ width: `${(currentSizes[2] / (currentSizes[0] + currentSizes[1] + currentSizes[2])) * 100}%` }}>
              <WidgetSection sectionId="three-left-stack-2" edges={{ top: true, bottom: true, right: true }} />
            </div>
          </div>
        );

      case 'three-right-stack':
        return (
          <div className="flex w-full h-full" ref={containerRef}>
            <div style={{ width: `${(currentSizes[0] / (currentSizes[0] + currentSizes[1] + currentSizes[2])) * 100}%` }}>
              <WidgetSection sectionId="three-right-stack-0" edges={{ top: true, bottom: true, left: true }} />
            </div>
            <div 
              className="w-1 bg-neutral-700 hover:bg-neutral-500 cursor-col-resize transition-colors flex items-center justify-center"
              onMouseDown={(e) => handleMouseDown(e, 'horizontal', 'three-right-stack')}
            >
              <div className="w-0.5 h-8 bg-neutral-500"></div>
            </div>
            <div className="flex flex-col" style={{ width: `${(currentSizes[1] + currentSizes[2]) / (currentSizes[0] + currentSizes[1] + currentSizes[2]) * 100}%` }}>
              <div style={{ height: `${(currentSizes[1] / (currentSizes[1] + currentSizes[2])) * 100}%` }}>
                <WidgetSection sectionId="three-right-stack-1" edges={{ top: true, right: true }} />
              </div>
              <div 
                className="h-1 bg-neutral-700 hover:bg-neutral-500 cursor-row-resize transition-colors flex items-center justify-center"
                onMouseDown={(e) => handleMouseDown(e, 'vertical', 'three-right-stack')}
              >
                <div className="h-0.5 w-8 bg-neutral-500"></div>
              </div>
              <div style={{ height: `${(currentSizes[2] / (currentSizes[1] + currentSizes[2])) * 100}%` }}>
                <WidgetSection sectionId="three-right-stack-2" edges={{ bottom: true, right: true }} />
              </div>
            </div>
          </div>
        );

      case 'four-grid':
      case '4-grid':
        {
          // 2 rows x 2 columns
          const numRows = 2;
          const numCols = 2;
          const defaultRowHeight = 100 / numRows;
          
          // Use memoized row sizes from component level to prevent recalculation on every render
          // This ensures inner groups don't reset when outer group resizes
          
          return (
            <ResizableGroup
              direction="vertical"
              minSize={50}
              cells={Array.from({ length: numRows }, (_, rowIndex) => {
                const rowStart = rowIndex * numCols;
                // Use memoized row sizes to prevent recalculation
                const rowSizes = memoizedRowSizes[rowIndex];
                return {
                  content: (
                    <ResizableGroup
                      direction="horizontal"
                      minSize={50}
                      cells={Array.from({ length: numCols }, (_, colIndex) => ({
                        content: <div className="w-full h-full"><WidgetSection 
                          sectionId={`four-grid-${rowStart + colIndex}`} 
                          edges={{ 
                            top: rowIndex === 0, 
                            bottom: rowIndex === numRows - 1, 
                            left: colIndex === 0, 
                            right: colIndex === numCols - 1 
                          }} 
                        /></div>,
                        position: `four-grid-${rowStart + colIndex}`,
                        initialSize: rowSizes[colIndex]
                      }))}
                      templateId={undefined}
                      layout={undefined}
                      onSizeChange={(newSizes) => {
                        const allSizes = [...(currentSizes || [])];
                        newSizes.forEach((size, colIndex) => {
                          allSizes[rowStart + colIndex] = parseFloat(size);
                        });
                        setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
                      }}
                      onSaveRequired={async () => {
                        // Custom save handler for nested groups
                        // Get latest sizes from state using functional update
                        let latestSizes: number[] = [];
                        setGridSizes(prev => {
                          latestSizes = prev[selectedLayout] || [];
                          return prev; // Don't actually update, just read
                        });
                        
                        // Save to localStorage and database via parent templateId/layout
                        if (selectedTemplate?.id && latestSizes.length > 0) {
                          try {
                            const { templateGridSizesStorage } = await import('@/lib/templateGridSizes');
                            templateGridSizesStorage.saveTemplateGridSizes(
                              selectedTemplate.id.toString(),
                              selectedLayout,
                              latestSizes
                            );
                            
                            const { insertMainGridPosition } = await import('@/lib/gridPositionApi');
                            const { calculateGridPositions, mapLayoutToApiCode } = await import('@/utils/gridPositionCalculator');
                            const apiLayoutCode = mapLayoutToApiCode(selectedLayout);
                            const positions = calculateGridPositions(
                              selectedLayout as LayoutType,
                              latestSizes,
                              apiLayoutCode
                            );
                            await insertMainGridPosition(
                              parseInt(selectedTemplate.id.toString()),
                              positions.Top,
                              positions.Left,
                              positions.Height,
                              positions.Width
                            );
                          } catch (error) {
                            console.error('Error saving nested grid sizes:', error);
                          }
                        }
                      }}
                    />
                  ),
                  position: `row-${rowIndex}`,
                  // Row height should be independent of column widths - use default or calculate from stored row heights
                  // For now, use default row height since we're storing column widths, not row heights
                  initialSize: `${defaultRowHeight}%`
                };
              })}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={() => {
                // When outer vertical group resizes (row heights change),
                // we should NOT modify the column widths - they should remain unchanged
                // The inner horizontal groups manage their own column widths independently
                // Use functional update to get the latest state and avoid stale closures
                setGridSizes(prev => {
                  const latestSizes = prev[selectedLayout] || [];
                  const allSizes = [...latestSizes];
                  
                  // If allSizes is empty or incomplete, initialize with defaults
                  if (allSizes.length === 0 || allSizes.some(s => s === undefined || s === null)) {
                    const defaultColWidth = 100 / numCols;
                    for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
                      for (let colIndex = 0; colIndex < numCols; colIndex++) {
                        const index = rowIndex * numCols + colIndex;
                        if (!allSizes[index]) {
                          allSizes[index] = defaultColWidth;
                        }
                      }
                    }
                  }
                  
                  // Don't modify column widths - just preserve them and save
                  // The inner groups maintain their own column width percentages
                  // Row heights are managed by the outer group and don't need to be stored in allSizes
                  return { ...prev, [selectedLayout]: allSizes };
                });
              }}
            />
          );
        }

      case 'four-vertical':
      case '4-grid-columns':
        {
          const sizes = [
            `${currentSizes[0] || 25}%`,
            `${currentSizes[1] || 25}%`,
            `${currentSizes[2] || 25}%`,
            `${currentSizes[3] || 25}%`
          ];
          return (
            <ResizableGroup
              direction="horizontal"
              minSize={60}
              cells={[
                { content: <div className="w-full h-full"><WidgetSection sectionId="four-vertical-0" edges={{ top: true, bottom: true, left: true }} /></div>, position: "four-vertical-0", initialSize: sizes[0] },
                { content: <div className="w-full h-full"><WidgetSection sectionId="four-vertical-1" edges={{ top: true, bottom: true }} /></div>, position: "four-vertical-1", initialSize: sizes[1] },
                { content: <div className="w-full h-full"><WidgetSection sectionId="four-vertical-2" edges={{ top: true, bottom: true }} /></div>, position: "four-vertical-2", initialSize: sizes[2] },
                { content: <div className="w-full h-full"><WidgetSection sectionId="four-vertical-3" edges={{ top: true, bottom: true, right: true }} /></div>, position: "four-vertical-3", initialSize: sizes[3] }
              ]}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: newSizes.map(s => parseFloat(s))
                }));
              }}
            />
          );
        }

      case 'four-horizontal':
      case '4-grid-rows':
        {
          const sizes = [
            `${currentSizes[0] || 25}%`,
            `${currentSizes[1] || 25}%`,
            `${currentSizes[2] || 25}%`,
            `${currentSizes[3] || 25}%`
          ];
          return (
            <ResizableGroup
              direction="vertical"
              minSize={60}
              cells={[
                { content: <div className="w-full h-full"><WidgetSection sectionId="four-horizontal-0" edges={{ top: true, left: true, right: true }} /></div>, position: "four-horizontal-0", initialSize: sizes[0] },
                { content: <div className="w-full h-full"><WidgetSection sectionId="four-horizontal-1" edges={{ left: true, right: true }} /></div>, position: "four-horizontal-1", initialSize: sizes[1] },
                { content: <div className="w-full h-full"><WidgetSection sectionId="four-horizontal-2" edges={{ left: true, right: true }} /></div>, position: "four-horizontal-2", initialSize: sizes[2] },
                { content: <div className="w-full h-full"><WidgetSection sectionId="four-horizontal-3" edges={{ bottom: true, left: true, right: true }} /></div>, position: "four-horizontal-3", initialSize: sizes[3] }
              ]}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: newSizes.map(s => parseFloat(s))
                }));
              }}
            />
          );
        }

      case 'five-grid':
        return (
          <div className="flex flex-col w-full h-full" ref={containerRef}>
            <div className="flex" style={{ height: `${currentSizes[0] + currentSizes[1]}%` }}>
              <div style={{ width: `${(currentSizes[0] / (currentSizes[0] + currentSizes[1])) * 100}%` }}>
                <WidgetSection sectionId="five-grid-0" edges={{ top: true, left: true }} />
              </div>
              <div 
                className="w-1 bg-neutral-700 hover:bg-neutral-500 cursor-col-resize transition-colors flex items-center justify-center"
                onMouseDown={(e) => handleMouseDown(e, 'horizontal', 'five-grid', 0)}
              >
                <div className="w-0.5 h-8 bg-neutral-500"></div>
              </div>
              <div style={{ width: `${(currentSizes[1] / (currentSizes[0] + currentSizes[1])) * 100}%` }}>
                <WidgetSection sectionId="five-grid-1" edges={{ top: true, right: true }} />
              </div>
            </div>
            <div 
              className="h-1 bg-neutral-700 hover:bg-neutral-500 cursor-row-resize transition-colors flex items-center justify-center"
              onMouseDown={(e) => handleMouseDown(e, 'vertical', 'five-grid', 0)}
            >
              <div className="h-0.5 w-8 bg-neutral-500"></div>
            </div>
            <div className="flex" style={{ height: `${currentSizes[2] + currentSizes[3] + currentSizes[4]}%` }}>
              <div style={{ width: `${(currentSizes[2] / (currentSizes[2] + currentSizes[3] + currentSizes[4])) * 100}%` }}>
                <WidgetSection sectionId="five-grid-2" edges={{ bottom: true, left: true }} />
              </div>
              <div 
                className="w-1 bg-neutral-700 hover:bg-neutral-500 cursor-col-resize transition-colors flex items-center justify-center"
                onMouseDown={(e) => handleMouseDown(e, 'horizontal', 'five-grid', 1)}
              >
                <div className="w-0.5 h-8 bg-neutral-500"></div>
              </div>
              <div style={{ width: `${(currentSizes[3] / (currentSizes[2] + currentSizes[3] + currentSizes[4])) * 100}%` }}>
                <WidgetSection sectionId="five-grid-3" edges={{ bottom: true }} />
              </div>
              <div 
                className="w-1 bg-neutral-700 hover:bg-neutral-500 cursor-col-resize transition-colors flex items-center justify-center"
                onMouseDown={(e) => handleMouseDown(e, 'horizontal', 'five-grid', 2)}
              >
                <div className="w-0.5 h-8 bg-neutral-500"></div>
              </div>
              <div style={{ width: `${(currentSizes[4] / (currentSizes[2] + currentSizes[3] + currentSizes[4])) * 100}%` }}>
                <WidgetSection sectionId="five-grid-4" edges={{ bottom: true, right: true }} />
              </div>
            </div>
          </div>
        );

      case 'five-vertical':
      case '5-grid-columns':
        return (
          <div className="flex w-full h-full" ref={containerRef}>
            <div style={{ width: `${currentSizes[0]}%` }}>
              <WidgetSection sectionId="five-vertical-0" edges={{ top: true, bottom: true, left: true }} />
            </div>
            <div 
              className="w-1 bg-neutral-700 hover:bg-neutral-500 cursor-col-resize transition-colors flex items-center justify-center"
              onMouseDown={(e) => handleMouseDown(e, 'horizontal', 'five-vertical', 0)}
            >
              <div className="w-0.5 h-8 bg-neutral-500"></div>
            </div>
            <div style={{ width: `${currentSizes[1]}%` }}>
              <WidgetSection sectionId="five-vertical-1" edges={{ top: true, bottom: true }} />
            </div>
            <div 
              className="w-1 bg-neutral-700 hover:bg-neutral-500 cursor-col-resize transition-colors flex items-center justify-center"
              onMouseDown={(e) => handleMouseDown(e, 'horizontal', 'five-vertical', 1)}
            >
              <div className="w-0.5 h-8 bg-neutral-500"></div>
            </div>
            <div style={{ width: `${currentSizes[2]}%` }}>
              <WidgetSection sectionId="five-vertical-2" edges={{ top: true, bottom: true }} />
            </div>
            <div 
              className="w-1 bg-neutral-700 hover:bg-neutral-500 cursor-col-resize transition-colors flex items-center justify-center"
              onMouseDown={(e) => handleMouseDown(e, 'horizontal', 'five-vertical', 2)}
            >
              <div className="w-0.5 h-8 bg-neutral-500"></div>
            </div>
            <div style={{ width: `${currentSizes[3]}%` }}>
              <WidgetSection sectionId="five-vertical-3" edges={{ top: true, bottom: true }} />
            </div>
            <div 
              className="w-1 bg-neutral-700 hover:bg-neutral-500 cursor-col-resize transition-colors flex items-center justify-center"
              onMouseDown={(e) => handleMouseDown(e, 'horizontal', 'five-vertical', 3)}
            >
              <div className="w-0.5 h-8 bg-neutral-500"></div>
            </div>
            <div style={{ width: `${currentSizes[4]}%` }}>
              <WidgetSection sectionId="five-vertical-4" edges={{ top: true, bottom: true, right: true }} />
            </div>
          </div>
        );

      case 'five-horizontal':
      case '5-grid-rows':
        return (
          <div className="flex flex-col w-full h-full" ref={containerRef}>
            <div style={{ height: `${currentSizes[0]}%` }}>
              <WidgetSection sectionId="five-horizontal-0" edges={{ top: true, left: true, right: true }} />
            </div>
            <div 
              className="h-1 bg-neutral-700 hover:bg-neutral-500 cursor-row-resize transition-colors flex items-center justify-center"
              onMouseDown={(e) => handleMouseDown(e, 'vertical', 'five-horizontal', 0)}
            >
              <div className="h-0.5 w-8 bg-neutral-500"></div>
            </div>
            <div style={{ height: `${currentSizes[1]}%` }}>
              <WidgetSection sectionId="five-horizontal-1" edges={{ left: true, right: true }} />
            </div>
            <div 
              className="h-1 bg-neutral-700 hover:bg-neutral-500 cursor-row-resize transition-colors flex items-center justify-center"
              onMouseDown={(e) => handleMouseDown(e, 'vertical', 'five-horizontal', 1)}
            >
              <div className="h-0.5 w-8 bg-neutral-500"></div>
            </div>
            <div style={{ height: `${currentSizes[2]}%` }}>
              <WidgetSection sectionId="five-horizontal-2" edges={{ left: true, right: true }} />
            </div>
            <div 
              className="h-1 bg-neutral-700 hover:bg-neutral-500 cursor-row-resize transition-colors flex items-center justify-center"
              onMouseDown={(e) => handleMouseDown(e, 'vertical', 'five-horizontal', 2)}
            >
              <div className="h-0.5 w-8 bg-neutral-500"></div>
            </div>
            <div style={{ height: `${currentSizes[3]}%` }}>
              <WidgetSection sectionId="five-horizontal-3" edges={{ left: true, right: true }} />
            </div>
            <div 
              className="h-1 bg-neutral-700 hover:bg-neutral-500 cursor-row-resize transition-colors flex items-center justify-center"
              onMouseDown={(e) => handleMouseDown(e, 'vertical', 'five-horizontal', 3)}
            >
              <div className="h-0.5 w-8 bg-neutral-500"></div>
            </div>
            <div style={{ height: `${currentSizes[4]}%` }}>
              <WidgetSection sectionId="five-horizontal-4" edges={{ bottom: true, left: true, right: true }} />
            </div>
          </div>
        );
      
      // 8-cell layouts
      case '8-grid-columns':
        {
          const sizes = Array.from({ length: 8 }, (_, i) => `${currentSizes[i] || 12.5}%`);
          return (
            <ResizableGroup
              direction="horizontal"
              minSize={40}
              cells={Array.from({ length: 8 }, (_, i) => ({
                content: <div className="w-full h-full"><WidgetSection sectionId={`8-grid-columns-${i}`} edges={{ top: true, bottom: true, left: i === 0, right: i === 7 }} /></div>,
                position: `8-grid-columns-${i}`,
                initialSize: sizes[i]
              }))}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: newSizes.map(s => parseFloat(s))
                }));
              }}
            />
          );
        }

      case '8-grid-rows':
        {
          const sizes = Array.from({ length: 8 }, (_, i) => `${currentSizes[i] || 12.5}%`);
          return (
            <ResizableGroup
              direction="vertical"
              minSize={40}
              cells={Array.from({ length: 8 }, (_, i) => ({
                content: <div className="w-full h-full"><WidgetSection sectionId={`8-grid-rows-${i}`} edges={{ left: true, right: true, top: i === 0, bottom: i === 7 }} /></div>,
                position: `8-grid-rows-${i}`,
                initialSize: sizes[i]
              }))}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: newSizes.map(s => parseFloat(s))
                }));
              }}
            />
          );
        }

      // 24-cell layouts
      case '24-grid-rows':
        {
          const sizes = Array.from({ length: 24 }, (_, i) => `${currentSizes[i] || (100 / 24)}%`);
          return (
            <ResizableGroup
              direction="vertical"
              minSize={40}
              cells={Array.from({ length: 24 }, (_, i) => ({
                content: <div className="w-full h-full"><WidgetSection sectionId={`24-grid-rows-${i}`} edges={{ left: true, right: true, top: i === 0, bottom: i === 23 }} /></div>,
                position: `24-grid-rows-${i}`,
                initialSize: sizes[i]
              }))}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: newSizes.map(s => parseFloat(s))
                }));
              }}
            />
          );
        }

      case '24-grid-columns':
        {
          const sizes = Array.from({ length: 24 }, (_, i) => `${currentSizes[i] || (100 / 24)}%`);
          return (
            <ResizableGroup
              direction="horizontal"
              minSize={40}
              cells={Array.from({ length: 24 }, (_, i) => ({
                content: <div className="w-full h-full"><WidgetSection sectionId={`24-grid-columns-${i}`} edges={{ top: true, bottom: true, left: i === 0, right: i === 23 }} /></div>,
                position: `24-grid-columns-${i}`,
                initialSize: sizes[i]
              }))}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: newSizes.map(s => parseFloat(s))
                }));
              }}
            />
          );
        }

      // 3-grid variants
      case '3-grid-left-large':
        {
          const leftPercent = currentSizes[0] || 66.67;
          const rightTopPercent = currentSizes[1] || 16.67;
          const rightBottomPercent = currentSizes[2] || 16.66;
          return (
            <ResizablePair
              direction="horizontal"
              minSize={60}
              initialSizes={[`${leftPercent}%`, `${100 - leftPercent}%`]}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const newLeft = parseFloat(newSizes[0]);
                const newRight = parseFloat(newSizes[1]);
                const ratio = rightTopPercent / (rightTopPercent + rightBottomPercent);
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: [newLeft, newRight * ratio, newRight * (1 - ratio)]
                }));
              }}
            >
              <div className="w-full h-full"><WidgetSection sectionId="3-grid-left-large-0" edges={{ top: true, bottom: true, left: true }} /></div>
              <ResizablePair
                direction="vertical"
                minSize={60}
                initialSizes={[`${(rightTopPercent / (rightTopPercent + rightBottomPercent)) * 100}%`, `${(rightBottomPercent / (rightTopPercent + rightBottomPercent)) * 100}%`]}
                templateId={selectedTemplate?.id?.toString()}
                layout={selectedLayout}
                onSizeChange={(newSizes) => {
                  const left = currentSizes[0] || leftPercent;
                  const rightTotal = 100 - left;
                  const rightTop = parseFloat(newSizes[0]);
                  const rightBottom = parseFloat(newSizes[1]);
                  setGridSizes(prev => ({
                    ...prev,
                    [selectedLayout]: [left, (rightTop / 100) * rightTotal, (rightBottom / 100) * rightTotal]
                  }));
                }}
              >
                <div className="w-full h-full"><WidgetSection sectionId="3-grid-left-large-1" edges={{ top: true, right: true }} /></div>
                <div className="w-full h-full"><WidgetSection sectionId="3-grid-left-large-2" edges={{ bottom: true, right: true }} /></div>
              </ResizablePair>
            </ResizablePair>
          );
        }

      case '3-grid-right-large':
        {
          const leftTopPercent = currentSizes[0] || 16.67;
          const leftBottomPercent = currentSizes[1] || 16.67;
          const rightPercent = currentSizes[2] || 66.66;
          return (
            <ResizablePair
              direction="horizontal"
              minSize={60}
              initialSizes={[`${100 - rightPercent}%`, `${rightPercent}%`]}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const newLeft = parseFloat(newSizes[0]);
                const newRight = parseFloat(newSizes[1]);
                const ratio = leftTopPercent / (leftTopPercent + leftBottomPercent);
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: [newLeft * ratio, newLeft * (1 - ratio), newRight]
                }));
              }}
            >
              <ResizablePair
                direction="vertical"
                minSize={60}
                initialSizes={[`${(leftTopPercent / (leftTopPercent + leftBottomPercent)) * 100}%`, `${(leftBottomPercent / (leftTopPercent + leftBottomPercent)) * 100}%`]}
                templateId={selectedTemplate?.id?.toString()}
                layout={selectedLayout}
                onSizeChange={(newSizes) => {
                  const right = currentSizes[2] || rightPercent;
                  const leftTotal = 100 - right;
                  const leftTop = parseFloat(newSizes[0]);
                  const leftBottom = parseFloat(newSizes[1]);
                  setGridSizes(prev => ({
                    ...prev,
                    [selectedLayout]: [(leftTop / 100) * leftTotal, (leftBottom / 100) * leftTotal, right]
                  }));
                }}
              >
                <div className="w-full h-full"><WidgetSection sectionId="3-grid-right-large-0" edges={{ top: true, left: true }} /></div>
                <div className="w-full h-full"><WidgetSection sectionId="3-grid-right-large-1" edges={{ bottom: true, left: true }} /></div>
              </ResizablePair>
              <div className="w-full h-full"><WidgetSection sectionId="3-grid-right-large-2" edges={{ top: true, bottom: true, right: true }} /></div>
            </ResizablePair>
          );
        }

      case '3-grid-top-large':
        {
          const topPercent = currentSizes[0] || 66.67;
          const bottomLeftPercent = currentSizes[1] || 16.67;
          const bottomRightPercent = currentSizes[2] || 16.66;
        return (
            <ResizablePair
              direction="vertical"
              minSize={60}
              initialSizes={[`${topPercent}%`, `${100 - topPercent}%`]}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const newTop = parseFloat(newSizes[0]);
                const newBottom = parseFloat(newSizes[1]);
                const ratio = bottomLeftPercent / (bottomLeftPercent + bottomRightPercent);
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: [newTop, newBottom * ratio, newBottom * (1 - ratio)]
                }));
              }}
            >
              <div className="w-full h-full"><WidgetSection sectionId="3-grid-top-large-0" edges={{ top: true, left: true, right: true }} /></div>
              <ResizablePair
                direction="horizontal"
                minSize={60}
                initialSizes={[`${(bottomLeftPercent / (bottomLeftPercent + bottomRightPercent)) * 100}%`, `${(bottomRightPercent / (bottomLeftPercent + bottomRightPercent)) * 100}%`]}
                templateId={selectedTemplate?.id?.toString()}
                layout={selectedLayout}
                onSizeChange={(newSizes) => {
                  const top = currentSizes[0] || topPercent;
                  const bottomTotal = 100 - top;
                  const bottomLeft = parseFloat(newSizes[0]);
                  const bottomRight = parseFloat(newSizes[1]);
                  setGridSizes(prev => ({
                    ...prev,
                    [selectedLayout]: [top, (bottomLeft / 100) * bottomTotal, (bottomRight / 100) * bottomTotal]
                  }));
                }}
              >
                <div className="w-full h-full"><WidgetSection sectionId="3-grid-top-large-1" edges={{ bottom: true, left: true }} /></div>
                <div className="w-full h-full"><WidgetSection sectionId="3-grid-top-large-2" edges={{ bottom: true, right: true }} /></div>
              </ResizablePair>
            </ResizablePair>
          );
        }

      case '3-grid-bottom-large':
        {
          const topLeftPercent = currentSizes[0] || 16.67;
          const topRightPercent = currentSizes[1] || 16.67;
          const bottomPercent = currentSizes[2] || 66.66;
          return (
            <ResizablePair
              direction="vertical"
              minSize={60}
              initialSizes={[`${100 - bottomPercent}%`, `${bottomPercent}%`]}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const newTop = parseFloat(newSizes[0]);
                const newBottom = parseFloat(newSizes[1]);
                const ratio = topLeftPercent / (topLeftPercent + topRightPercent);
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: [newTop * ratio, newTop * (1 - ratio), newBottom]
                }));
              }}
            >
              <ResizablePair
                direction="horizontal"
                minSize={60}
                initialSizes={[`${(topLeftPercent / (topLeftPercent + topRightPercent)) * 100}%`, `${(topRightPercent / (topLeftPercent + topRightPercent)) * 100}%`]}
                templateId={selectedTemplate?.id?.toString()}
                layout={selectedLayout}
                onSizeChange={(newSizes) => {
                  const bottom = currentSizes[2] || bottomPercent;
                  const topTotal = 100 - bottom;
                  const topLeft = parseFloat(newSizes[0]);
                  const topRight = parseFloat(newSizes[1]);
                  setGridSizes(prev => ({
                    ...prev,
                    [selectedLayout]: [(topLeft / 100) * topTotal, (topRight / 100) * topTotal, bottom]
                  }));
                }}
              >
                <div className="w-full h-full"><WidgetSection sectionId="3-grid-bottom-large-0" edges={{ top: true, left: true }} /></div>
                <div className="w-full h-full"><WidgetSection sectionId="3-grid-bottom-large-1" edges={{ top: true, right: true }} /></div>
              </ResizablePair>
              <div className="w-full h-full"><WidgetSection sectionId="3-grid-bottom-large-2" edges={{ bottom: true, left: true, right: true }} /></div>
            </ResizablePair>
          );
        }

      // 4-grid variants
      case '4-grid-left-large':
        {
          const leftPercent = currentSizes[0] || 50;
          const rightPercent = 100 - leftPercent;
          const rightTopPercent = currentSizes[1] || 33.33;
          const rightMiddlePercent = currentSizes[2] || 33.33;
          const rightBottomPercent = currentSizes[3] || 33.34;
          return (
            <ResizablePair
              direction="horizontal"
              minSize={60}
              initialSizes={[`${leftPercent}%`, `${rightPercent}%`]}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const newLeft = parseFloat(newSizes[0]);
                const newRight = parseFloat(newSizes[1]);
                const ratio1 = rightTopPercent / (rightTopPercent + rightMiddlePercent + rightBottomPercent);
                const ratio2 = rightMiddlePercent / (rightTopPercent + rightMiddlePercent + rightBottomPercent);
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: [newLeft, newRight * ratio1, newRight * ratio2, newRight * (1 - ratio1 - ratio2)]
                }));
              }}
            >
              <div className="w-full h-full"><WidgetSection sectionId="4-grid-left-large-0" /></div>
              <ResizableGroup
                direction="vertical"
                minSize={60}
                cells={[
                  { content: <div className="w-full h-full"><WidgetSection sectionId="4-grid-left-large-1" /></div>, position: "4-grid-left-large-1", initialSize: `${(rightTopPercent / (rightTopPercent + rightMiddlePercent + rightBottomPercent)) * 100}%` },
                  { content: <div className="w-full h-full"><WidgetSection sectionId="4-grid-left-large-2" /></div>, position: "4-grid-left-large-2", initialSize: `${(rightMiddlePercent / (rightTopPercent + rightMiddlePercent + rightBottomPercent)) * 100}%` },
                  { content: <div className="w-full h-full"><WidgetSection sectionId="4-grid-left-large-3" /></div>, position: "4-grid-left-large-3", initialSize: `${(rightBottomPercent / (rightTopPercent + rightMiddlePercent + rightBottomPercent)) * 100}%` }
                ]}
                templateId={selectedTemplate?.id?.toString()}
                layout={selectedLayout}
                onSizeChange={(newSizes) => {
                  const left = currentSizes[0] || leftPercent;
                  const rightTotal = 100 - left;
                  const rightTop = parseFloat(newSizes[0]);
                  const rightMiddle = parseFloat(newSizes[1]);
                  const rightBottom = parseFloat(newSizes[2]);
                  setGridSizes(prev => ({
                    ...prev,
                    [selectedLayout]: [left, (rightTop / 100) * rightTotal, (rightMiddle / 100) * rightTotal, (rightBottom / 100) * rightTotal]
                  }));
                }}
              />
            </ResizablePair>
          );
        }

      case '4-grid-right-large':
        {
          const leftTopPercent = currentSizes[0] || 33.33;
          const leftMiddlePercent = currentSizes[1] || 33.33;
          const leftBottomPercent = currentSizes[2] || 33.34;
          const rightPercent = currentSizes[3] || 50;
          return (
            <ResizablePair
              direction="horizontal"
              minSize={60}
              initialSizes={[`${100 - rightPercent}%`, `${rightPercent}%`]}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const newLeft = parseFloat(newSizes[0]);
                const newRight = parseFloat(newSizes[1]);
                const ratio1 = leftTopPercent / (leftTopPercent + leftMiddlePercent + leftBottomPercent);
                const ratio2 = leftMiddlePercent / (leftTopPercent + leftMiddlePercent + leftBottomPercent);
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: [newLeft * ratio1, newLeft * ratio2, newLeft * (1 - ratio1 - ratio2), newRight]
                }));
              }}
            >
              <ResizableGroup
                direction="vertical"
                minSize={60}
                cells={[
                  { content: <div className="w-full h-full"><WidgetSection sectionId="4-grid-right-large-0" /></div>, position: "4-grid-right-large-0", initialSize: `${(leftTopPercent / (leftTopPercent + leftMiddlePercent + leftBottomPercent)) * 100}%` },
                  { content: <div className="w-full h-full"><WidgetSection sectionId="4-grid-right-large-1" /></div>, position: "4-grid-right-large-1", initialSize: `${(leftMiddlePercent / (leftTopPercent + leftMiddlePercent + leftBottomPercent)) * 100}%` },
                  { content: <div className="w-full h-full"><WidgetSection sectionId="4-grid-right-large-2" /></div>, position: "4-grid-right-large-2", initialSize: `${(leftBottomPercent / (leftTopPercent + leftMiddlePercent + leftBottomPercent)) * 100}%` }
                ]}
                templateId={selectedTemplate?.id?.toString()}
                layout={selectedLayout}
                onSizeChange={(newSizes) => {
                  const right = currentSizes[3] || rightPercent;
                  const leftTotal = 100 - right;
                  const leftTop = parseFloat(newSizes[0]);
                  const leftMiddle = parseFloat(newSizes[1]);
                  const leftBottom = parseFloat(newSizes[2]);
                  setGridSizes(prev => ({
                    ...prev,
                    [selectedLayout]: [(leftTop / 100) * leftTotal, (leftMiddle / 100) * leftTotal, (leftBottom / 100) * leftTotal, right]
                  }));
                }}
              />
              <div className="w-full h-full"><WidgetSection sectionId="4-grid-right-large-3" /></div>
            </ResizablePair>
          );
        }

      case '4-grid-top-large':
        {
          const topPercent = currentSizes[0] || 50;
          const bottomPercent = 100 - topPercent;
          const bottomLeftPercent = currentSizes[1] || 33.33;
          const bottomMiddlePercent = currentSizes[2] || 33.33;
          const bottomRightPercent = currentSizes[3] || 33.34;
          return (
            <ResizablePair
              direction="vertical"
              minSize={60}
              initialSizes={[`${topPercent}%`, `${bottomPercent}%`]}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const newTop = parseFloat(newSizes[0]);
                const newBottom = parseFloat(newSizes[1]);
                const ratio1 = bottomLeftPercent / (bottomLeftPercent + bottomMiddlePercent + bottomRightPercent);
                const ratio2 = bottomMiddlePercent / (bottomLeftPercent + bottomMiddlePercent + bottomRightPercent);
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: [newTop, newBottom * ratio1, newBottom * ratio2, newBottom * (1 - ratio1 - ratio2)]
                }));
              }}
            >
              <div className="w-full h-full"><WidgetSection sectionId="4-grid-top-large-0" /></div>
              <ResizableGroup
                direction="horizontal"
                minSize={60}
                cells={[
                  { content: <div className="w-full h-full"><WidgetSection sectionId="4-grid-top-large-1" /></div>, position: "4-grid-top-large-1", initialSize: `${(bottomLeftPercent / (bottomLeftPercent + bottomMiddlePercent + bottomRightPercent)) * 100}%` },
                  { content: <div className="w-full h-full"><WidgetSection sectionId="4-grid-top-large-2" /></div>, position: "4-grid-top-large-2", initialSize: `${(bottomMiddlePercent / (bottomLeftPercent + bottomMiddlePercent + bottomRightPercent)) * 100}%` },
                  { content: <div className="w-full h-full"><WidgetSection sectionId="4-grid-top-large-3" /></div>, position: "4-grid-top-large-3", initialSize: `${(bottomRightPercent / (bottomLeftPercent + bottomMiddlePercent + bottomRightPercent)) * 100}%` }
                ]}
                templateId={selectedTemplate?.id?.toString()}
                layout={selectedLayout}
                onSizeChange={(newSizes) => {
                  const top = currentSizes[0] || topPercent;
                  const bottomTotal = 100 - top;
                  const bottomLeft = parseFloat(newSizes[0]);
                  const bottomMiddle = parseFloat(newSizes[1]);
                  const bottomRight = parseFloat(newSizes[2]);
                  setGridSizes(prev => ({
                    ...prev,
                    [selectedLayout]: [top, (bottomLeft / 100) * bottomTotal, (bottomMiddle / 100) * bottomTotal, (bottomRight / 100) * bottomTotal]
                  }));
                }}
              />
            </ResizablePair>
          );
        }

      // 5-grid-complex
      case '5-grid-complex':
        {
          const topTotal = (currentSizes[0] || 40) + (currentSizes[1] || 40);
          const bottomTotal = 100 - topTotal;
          const topLeftPercent = ((currentSizes[0] || 40) / topTotal) * 100;
          const topRightPercent = 100 - topLeftPercent;
          const bottomLeftPercent = ((currentSizes[2] || 20) / bottomTotal) * 100;
          const bottomMiddlePercent = ((currentSizes[3] || 20) / bottomTotal) * 100;
          const bottomRightPercent = 100 - bottomLeftPercent - bottomMiddlePercent;
          return (
            <ResizablePair
              direction="vertical"
              minSize={60}
              initialSizes={[`${topTotal}%`, `${bottomTotal}%`]}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const newTop = parseFloat(newSizes[0]);
                const newBottom = parseFloat(newSizes[1]);
                const topLeft = (topLeftPercent / 100) * newTop;
                const topRight = newTop - topLeft;
                const bottomLeft = (bottomLeftPercent / 100) * newBottom;
                const bottomMiddle = (bottomMiddlePercent / 100) * newBottom;
                const bottomRight = newBottom - bottomLeft - bottomMiddle;
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: [topLeft, topRight, bottomLeft, bottomMiddle, bottomRight]
                }));
              }}
            >
              <ResizablePair
                direction="horizontal"
                minSize={60}
                initialSizes={[`${topLeftPercent}%`, `${topRightPercent}%`]}
                templateId={selectedTemplate?.id?.toString()}
                layout={selectedLayout}
                onSizeChange={(newSizes) => {
                  const bottom = (currentSizes[2] || 20) + (currentSizes[3] || 20) + (currentSizes[4] || 20);
                  const topLeft = parseFloat(newSizes[0]);
                  const topRight = parseFloat(newSizes[1]);
                  const ratio1 = bottomLeftPercent / 100;
                  const ratio2 = bottomMiddlePercent / 100;
                  setGridSizes(prev => ({
                    ...prev,
                    [selectedLayout]: [topLeft, topRight, bottom * ratio1, bottom * ratio2, bottom * (1 - ratio1 - ratio2)]
                  }));
                }}
              >
                <div className="w-full h-full"><WidgetSection sectionId="5-grid-complex-0" /></div>
                <div className="w-full h-full"><WidgetSection sectionId="5-grid-complex-1" /></div>
              </ResizablePair>
              <ResizableGroup
                direction="horizontal"
                minSize={60}
                cells={[
                  { content: <div className="w-full h-full"><WidgetSection sectionId="5-grid-complex-2" /></div>, position: "5-grid-complex-2", initialSize: `${bottomLeftPercent}%` },
                  { content: <div className="w-full h-full"><WidgetSection sectionId="5-grid-complex-3" /></div>, position: "5-grid-complex-3", initialSize: `${bottomMiddlePercent}%` },
                  { content: <div className="w-full h-full"><WidgetSection sectionId="5-grid-complex-4" /></div>, position: "5-grid-complex-4", initialSize: `${bottomRightPercent}%` }
                ]}
                templateId={selectedTemplate?.id?.toString()}
                layout={selectedLayout}
                onSizeChange={(newSizes) => {
                  const top = (currentSizes[0] || 40) + (currentSizes[1] || 40);
                  const bottomLeft = parseFloat(newSizes[0]);
                  const bottomMiddle = parseFloat(newSizes[1]);
                  const bottomRight = parseFloat(newSizes[2]);
                  const ratio = topLeftPercent / 100;
                  setGridSizes(prev => ({
                    ...prev,
                    [selectedLayout]: [top * ratio, top * (1 - ratio), bottomLeft, bottomMiddle, bottomRight]
                  }));
                }}
              />
            </ResizablePair>
          );
        }

      // 6-cell layouts
      case '6-grid-2x3':
        {
          // 2 rows x 3 columns
          const numRows = 2;
          const numCols = 3;
          const defaultRowHeight = 100 / numRows;
          const defaultColWidth = 100 / numCols;
          return (
            <ResizableGroup
              direction="vertical"
              minSize={50}
              cells={Array.from({ length: numRows }, (_, rowIndex) => {
                const rowStart = rowIndex * numCols;
                return {
                  content: (
                    <ResizableGroup
                      direction="horizontal"
                      minSize={50}
                      cells={Array.from({ length: numCols }, (_, colIndex) => ({
                        content: <div className="w-full h-full"><WidgetSection sectionId={`6-grid-2x3-${rowStart + colIndex}`} /></div>,
                        position: `6-grid-2x3-${rowStart + colIndex}`,
                        initialSize: currentSizes[rowStart + colIndex] ? `${currentSizes[rowStart + colIndex]}%` : `${defaultColWidth}%`
                      }))}
                      templateId={selectedTemplate?.id?.toString()}
                      layout={selectedLayout}
                      onSizeChange={(newSizes) => {
                        const allSizes = [...(currentSizes || [])];
                        newSizes.forEach((size, colIndex) => {
                          allSizes[rowStart + colIndex] = parseFloat(size);
                        });
                        setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
                      }}
                    />
                  ),
                  position: `row-${rowIndex}`,
                  initialSize: currentSizes[rowIndex * numCols] ? `${currentSizes[rowIndex * numCols]}%` : `${defaultRowHeight}%`
                };
              })}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const allSizes = [...(currentSizes || [])];
                newSizes.forEach((rowSize, rowIndex) => {
                  const rowStart = rowIndex * numCols;
                  const defaultColWidth = 100 / numCols;
                  const rowTotal = allSizes.slice(rowStart, rowStart + numCols).reduce((sum, s) => sum + (s || 0), 0) || 100;
                  const scale = parseFloat(rowSize) / rowTotal;
                  for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    allSizes[rowStart + colIndex] = (allSizes[rowStart + colIndex] || defaultColWidth) * scale;
                  }
                });
                setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
              }}
            />
          );
        }

      case '6-grid-3x2':
        {
          // 3 rows x 2 columns
          const numRows = 3;
          const numCols = 2;
          const defaultRowHeight = 100 / numRows;
          const defaultColWidth = 100 / numCols;
          return (
            <ResizableGroup
              direction="vertical"
              minSize={50}
              cells={Array.from({ length: numRows }, (_, rowIndex) => {
                const rowStart = rowIndex * numCols;
                return {
                  content: (
                    <ResizableGroup
                      direction="horizontal"
                      minSize={50}
                      cells={Array.from({ length: numCols }, (_, colIndex) => ({
                        content: <div className="w-full h-full"><WidgetSection sectionId={`6-grid-3x2-${rowStart + colIndex}`} /></div>,
                        position: `6-grid-3x2-${rowStart + colIndex}`,
                        initialSize: currentSizes[rowStart + colIndex] ? `${currentSizes[rowStart + colIndex]}%` : `${defaultColWidth}%`
                      }))}
                      templateId={selectedTemplate?.id?.toString()}
                      layout={selectedLayout}
                      onSizeChange={(newSizes) => {
                        const allSizes = [...(currentSizes || [])];
                        newSizes.forEach((size, colIndex) => {
                          allSizes[rowStart + colIndex] = parseFloat(size);
                        });
                        setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
                      }}
                    />
                  ),
                  position: `row-${rowIndex}`,
                  initialSize: currentSizes[rowIndex * numCols] ? `${currentSizes[rowIndex * numCols]}%` : `${defaultRowHeight}%`
                };
              })}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const allSizes = [...(currentSizes || [])];
                newSizes.forEach((rowSize, rowIndex) => {
                  const rowStart = rowIndex * numCols;
                  const defaultColWidth = 100 / numCols;
                  const rowTotal = allSizes.slice(rowStart, rowStart + numCols).reduce((sum, s) => sum + (s || 0), 0) || 100;
                  const scale = parseFloat(rowSize) / rowTotal;
                  for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    allSizes[rowStart + colIndex] = (allSizes[rowStart + colIndex] || defaultColWidth) * scale;
                  }
                });
                setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
              }}
            />
          );
        }

      case '6-grid-left-large':
        {
          const leftPercent = currentSizes[0] || 50;
          const rightPercent = 100 - leftPercent;
          const rightCellPercent = 100 / 5; // 5 cells, each 20%
          return (
            <ResizablePair
              direction="horizontal"
              minSize={60}
              initialSizes={[`${leftPercent}%`, `${rightPercent}%`]}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const newLeft = parseFloat(newSizes[0]);
                const newRight = parseFloat(newSizes[1]);
                const rightCellSize = newRight / 5;
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: [newLeft, rightCellSize, rightCellSize, rightCellSize, rightCellSize, rightCellSize]
                }));
              }}
            >
              <div className="w-full h-full"><WidgetSection sectionId="6-grid-left-large-0" /></div>
              <ResizableGroup
                direction="vertical"
                minSize={60}
                cells={Array.from({ length: 5 }, (_, i) => ({
                  content: <div className="w-full h-full"><WidgetSection sectionId={`6-grid-left-large-${i + 1}`} /></div>,
                  position: `6-grid-left-large-${i + 1}`,
                  initialSize: `${rightCellPercent}%`
                }))}
                templateId={selectedTemplate?.id?.toString()}
                layout={selectedLayout}
                onSizeChange={(newSizes) => {
                  const left = currentSizes[0] || leftPercent;
                  const cellSizes = newSizes.map(s => parseFloat(s));
                  setGridSizes(prev => ({
                    ...prev,
                    [selectedLayout]: [left, ...cellSizes]
                  }));
                }}
              />
            </ResizablePair>
          );
        }

      // 7-cell layouts
      case '7-grid-left':
        {
          const leftPercent = (currentSizes[0] || 12.5) + (currentSizes[1] || 12.5) + (currentSizes[2] || 12.5) + (currentSizes[3] || 12.5);
          const rightPercent = 100 - leftPercent;
          const leftCellPercent = 25; // 4 cells, each 25%
          const rightCellPercent = 33.33; // 3 cells, each 33.33%
          return (
            <ResizablePair
              direction="horizontal"
              minSize={60}
              initialSizes={[`${leftPercent}%`, `${rightPercent}%`]}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const newLeft = parseFloat(newSizes[0]);
                const newRight = parseFloat(newSizes[1]);
                const leftCellSize = newLeft / 4;
                const rightCellSize = newRight / 3;
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: [leftCellSize, leftCellSize, leftCellSize, leftCellSize, rightCellSize, rightCellSize, rightCellSize]
                }));
              }}
            >
              <ResizableGroup
                direction="vertical"
                minSize={60}
                cells={Array.from({ length: 4 }, (_, i) => ({
                  content: <div className="w-full h-full"><WidgetSection sectionId={`7-grid-left-${i}`} /></div>,
                  position: `7-grid-left-${i}`,
                  initialSize: `${leftCellPercent}%`
                }))}
                templateId={selectedTemplate?.id?.toString()}
                layout={selectedLayout}
                onSizeChange={(newSizes) => {
                  const right = (currentSizes[4] || 16.67) + (currentSizes[5] || 16.67) + (currentSizes[6] || 16.66);
                  const cellSizes = newSizes.map(s => parseFloat(s));
                  const rightCellSize = right / 3;
                  setGridSizes(prev => ({
                    ...prev,
                    [selectedLayout]: [...cellSizes, rightCellSize, rightCellSize, rightCellSize]
                  }));
                }}
              />
              <ResizableGroup
                direction="vertical"
                minSize={60}
                cells={Array.from({ length: 3 }, (_, i) => ({
                  content: <div className="w-full h-full"><WidgetSection sectionId={`7-grid-left-${i + 4}`} /></div>,
                  position: `7-grid-left-${i + 4}`,
                  initialSize: `${rightCellPercent}%`
                }))}
                templateId={selectedTemplate?.id?.toString()}
                layout={selectedLayout}
                onSizeChange={(newSizes) => {
                  const left = (currentSizes[0] || 12.5) + (currentSizes[1] || 12.5) + (currentSizes[2] || 12.5) + (currentSizes[3] || 12.5);
                  const cellSizes = newSizes.map(s => parseFloat(s));
                  const leftCellSize = left / 4;
                  setGridSizes(prev => ({
                    ...prev,
                    [selectedLayout]: [leftCellSize, leftCellSize, leftCellSize, leftCellSize, ...cellSizes]
                  }));
                }}
              />
            </ResizablePair>
          );
        }

      case '7-grid-large':
        {
          const leftPercent = currentSizes[0] || 50;
          const rightPercent = 100 - leftPercent;
          const rightCellPercent = 100 / 6; // 6 cells, each ~16.67%
          return (
            <ResizablePair
              direction="horizontal"
              minSize={60}
              initialSizes={[`${leftPercent}%`, `${rightPercent}%`]}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const newLeft = parseFloat(newSizes[0]);
                const newRight = parseFloat(newSizes[1]);
                const rightCellSize = newRight / 6;
                setGridSizes(prev => ({
                  ...prev,
                  [selectedLayout]: [newLeft, rightCellSize, rightCellSize, rightCellSize, rightCellSize, rightCellSize, rightCellSize]
                }));
              }}
            >
              <div className="w-full h-full"><WidgetSection sectionId="7-grid-large-0" /></div>
              <ResizableGroup
                direction="vertical"
                minSize={60}
                cells={Array.from({ length: 6 }, (_, i) => ({
                  content: <div className="w-full h-full"><WidgetSection sectionId={`7-grid-large-${i + 1}`} /></div>,
                  position: `7-grid-large-${i + 1}`,
                  initialSize: `${rightCellPercent}%`
                }))}
                templateId={selectedTemplate?.id?.toString()}
                layout={selectedLayout}
                onSizeChange={(newSizes) => {
                  const left = currentSizes[0] || leftPercent;
                  const cellSizes = newSizes.map(s => parseFloat(s));
                  setGridSizes(prev => ({
                    ...prev,
                    [selectedLayout]: [left, ...cellSizes]
                  }));
                }}
              />
            </ResizablePair>
          );
        }

      // 8-cell layouts
      case '8-grid-2x4':
        {
          // 2 rows x 4 columns
          const numRows = 2;
          const numCols = 4;
          const defaultRowHeight = 100 / numRows;
          const defaultColWidth = 100 / numCols;
          return (
            <ResizableGroup
              direction="vertical"
              minSize={50}
              cells={Array.from({ length: numRows }, (_, rowIndex) => {
                const rowStart = rowIndex * numCols;
                return {
                  content: (
                    <ResizableGroup
                      direction="horizontal"
                      minSize={40}
                      cells={Array.from({ length: numCols }, (_, colIndex) => ({
                        content: <div className="w-full h-full"><WidgetSection sectionId={`8-grid-2x4-${rowStart + colIndex}`} /></div>,
                        position: `8-grid-2x4-${rowStart + colIndex}`,
                        initialSize: currentSizes[rowStart + colIndex] ? `${currentSizes[rowStart + colIndex]}%` : `${defaultColWidth}%`
                      }))}
                      templateId={selectedTemplate?.id?.toString()}
                      layout={selectedLayout}
                      onSizeChange={(newSizes) => {
                        const allSizes = [...(currentSizes || [])];
                        newSizes.forEach((size, colIndex) => {
                          allSizes[rowStart + colIndex] = parseFloat(size);
                        });
                        setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
                      }}
                    />
                  ),
                  position: `row-${rowIndex}`,
                  initialSize: currentSizes[rowIndex * numCols] ? `${currentSizes[rowIndex * numCols]}%` : `${defaultRowHeight}%`
                };
              })}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const allSizes = [...(currentSizes || [])];
                newSizes.forEach((rowSize, rowIndex) => {
                  const rowStart = rowIndex * numCols;
                  const defaultColWidth = 100 / numCols;
                  const rowTotal = allSizes.slice(rowStart, rowStart + numCols).reduce((sum, s) => sum + (s || 0), 0) || 100;
                  const scale = parseFloat(rowSize) / rowTotal;
                  for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    allSizes[rowStart + colIndex] = (allSizes[rowStart + colIndex] || defaultColWidth) * scale;
                  }
                });
                setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
              }}
            />
          );
        }

      case '8-grid-4x2':
        {
          // 4 rows x 2 columns
          const numRows = 4;
          const numCols = 2;
          const defaultRowHeight = 100 / numRows;
          const defaultColWidth = 100 / numCols;
          return (
            <ResizableGroup
              direction="vertical"
              minSize={50}
              cells={Array.from({ length: numRows }, (_, rowIndex) => {
                const rowStart = rowIndex * numCols;
                return {
                  content: (
                    <ResizableGroup
                      direction="horizontal"
                      minSize={50}
                      cells={Array.from({ length: numCols }, (_, colIndex) => ({
                        content: <div className="w-full h-full"><WidgetSection sectionId={`8-grid-4x2-${rowStart + colIndex}`} /></div>,
                        position: `8-grid-4x2-${rowStart + colIndex}`,
                        initialSize: currentSizes[rowStart + colIndex] ? `${currentSizes[rowStart + colIndex]}%` : `${defaultColWidth}%`
                      }))}
                      templateId={selectedTemplate?.id?.toString()}
                      layout={selectedLayout}
                      onSizeChange={(newSizes) => {
                        const allSizes = [...(currentSizes || [])];
                        newSizes.forEach((size, colIndex) => {
                          allSizes[rowStart + colIndex] = parseFloat(size);
                        });
                        setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
                      }}
                    />
                  ),
                  position: `row-${rowIndex}`,
                  initialSize: currentSizes[rowIndex * numCols] ? `${currentSizes[rowIndex * numCols]}%` : `${defaultRowHeight}%`
                };
              })}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const allSizes = [...(currentSizes || [])];
                newSizes.forEach((rowSize, rowIndex) => {
                  const rowStart = rowIndex * numCols;
                  const defaultColWidth = 100 / numCols;
                  const rowTotal = allSizes.slice(rowStart, rowStart + numCols).reduce((sum, s) => sum + (s || 0), 0) || 100;
                  const scale = parseFloat(rowSize) / rowTotal;
                  for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    allSizes[rowStart + colIndex] = (allSizes[rowStart + colIndex] || defaultColWidth) * scale;
                  }
                });
                setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
              }}
            />
          );
        }

      // 9-cell layout (3x3 grid)
      case '9-grid':
        {
          const numRows = 3;
          const numCols = 3;
          const defaultRowHeight = 100 / numRows;
          const defaultColWidth = 100 / numCols;
          return (
            <ResizableGroup
              direction="vertical"
              minSize={50}
              cells={Array.from({ length: numRows }, (_, rowIndex) => {
                const rowStart = rowIndex * numCols;
                return {
                  content: (
                    <ResizableGroup
                      direction="horizontal"
                      minSize={50}
                      cells={Array.from({ length: numCols }, (_, colIndex) => ({
                        content: <div className="w-full h-full"><WidgetSection 
                          sectionId={`9-grid-${rowStart + colIndex}`} 
                          edges={{ 
                            top: rowIndex === 0, 
                            bottom: rowIndex === numRows - 1, 
                            left: colIndex === 0, 
                            right: colIndex === numCols - 1 
                          }} 
                        /></div>,
                        position: `9-grid-${rowStart + colIndex}`,
                        initialSize: currentSizes[rowStart + colIndex] ? `${currentSizes[rowStart + colIndex]}%` : `${defaultColWidth}%`
                      }))}
                      templateId={selectedTemplate?.id?.toString()}
                      layout={selectedLayout}
                      onSizeChange={(newSizes) => {
                        const allSizes = [...(currentSizes || [])];
                        newSizes.forEach((size, colIndex) => {
                          allSizes[rowStart + colIndex] = parseFloat(size);
                        });
                        setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
                      }}
                    />
                  ),
                  position: `row-${rowIndex}`,
                  initialSize: currentSizes[rowIndex * numCols] ? `${currentSizes[rowIndex * numCols]}%` : `${defaultRowHeight}%`
                };
              })}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const allSizes = [...(currentSizes || [])];
                newSizes.forEach((rowSize, rowIndex) => {
                  const rowStart = rowIndex * numCols;
                  const defaultColWidth = 100 / numCols;
                  const rowTotal = allSizes.slice(rowStart, rowStart + numCols).reduce((sum, s) => sum + (s || 0), 0) || 100;
                  const scale = parseFloat(rowSize) / rowTotal;
                  for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    allSizes[rowStart + colIndex] = (allSizes[rowStart + colIndex] || defaultColWidth) * scale;
                  }
                });
                setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
              }}
            />
          );
        }

      // 12-cell layouts
      case '12-grid-3x4':
        {
          // 3 rows x 4 columns
          const numRows = 3;
          const numCols = 4;
          const defaultRowHeight = 100 / numRows;
          const defaultColWidth = 100 / numCols;
          return (
            <ResizableGroup
              direction="vertical"
              minSize={50}
              cells={Array.from({ length: numRows }, (_, rowIndex) => {
                const rowStart = rowIndex * numCols;
                return {
                  content: (
                    <ResizableGroup
                      direction="horizontal"
                      minSize={40}
                      cells={Array.from({ length: numCols }, (_, colIndex) => ({
                        content: <div className="w-full h-full"><WidgetSection 
                          sectionId={`12-grid-3x4-${rowStart + colIndex}`} 
                          edges={{ 
                            top: rowIndex === 0, 
                            bottom: rowIndex === numRows - 1, 
                            left: colIndex === 0, 
                            right: colIndex === numCols - 1 
                          }} 
                        /></div>,
                        position: `12-grid-3x4-${rowStart + colIndex}`,
                        initialSize: currentSizes[rowStart + colIndex] ? `${currentSizes[rowStart + colIndex]}%` : `${defaultColWidth}%`
                      }))}
                      templateId={selectedTemplate?.id?.toString()}
                      layout={selectedLayout}
                      onSizeChange={(newSizes) => {
                        const allSizes = [...(currentSizes || [])];
                        newSizes.forEach((size, colIndex) => {
                          allSizes[rowStart + colIndex] = parseFloat(size);
                        });
                        setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
                      }}
                    />
                  ),
                  position: `row-${rowIndex}`,
                  initialSize: currentSizes[rowIndex * numCols] ? `${currentSizes[rowIndex * numCols]}%` : `${defaultRowHeight}%`
                };
              })}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const allSizes = [...(currentSizes || [])];
                newSizes.forEach((rowSize, rowIndex) => {
                  const rowStart = rowIndex * numCols;
                  const defaultColWidth = 100 / numCols;
                  const rowTotal = allSizes.slice(rowStart, rowStart + numCols).reduce((sum, s) => sum + (s || 0), 0) || 100;
                  const scale = parseFloat(rowSize) / rowTotal;
                  for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    allSizes[rowStart + colIndex] = (allSizes[rowStart + colIndex] || defaultColWidth) * scale;
                  }
                });
                setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
              }}
            />
          );
        }

      case '12-grid-4x3':
        {
          // 4 rows x 3 columns
          const numRows = 4;
          const numCols = 3;
          const defaultRowHeight = 100 / numRows;
          const defaultColWidth = 100 / numCols;
          return (
            <ResizableGroup
              direction="vertical"
              minSize={50}
              cells={Array.from({ length: numRows }, (_, rowIndex) => {
                const rowStart = rowIndex * numCols;
                return {
                  content: (
                    <ResizableGroup
                      direction="horizontal"
                      minSize={50}
                      cells={Array.from({ length: numCols }, (_, colIndex) => ({
                        content: <div className="w-full h-full"><WidgetSection 
                          sectionId={`12-grid-4x3-${rowStart + colIndex}`} 
                          edges={{ 
                            top: rowIndex === 0, 
                            bottom: rowIndex === numRows - 1, 
                            left: colIndex === 0, 
                            right: colIndex === numCols - 1 
                          }} 
                        /></div>,
                        position: `12-grid-4x3-${rowStart + colIndex}`,
                        initialSize: currentSizes[rowStart + colIndex] ? `${currentSizes[rowStart + colIndex]}%` : `${defaultColWidth}%`
                      }))}
                      templateId={selectedTemplate?.id?.toString()}
                      layout={selectedLayout}
                      onSizeChange={(newSizes) => {
                        const allSizes = [...(currentSizes || [])];
                        newSizes.forEach((size, colIndex) => {
                          allSizes[rowStart + colIndex] = parseFloat(size);
                        });
                        setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
                      }}
                    />
                  ),
                  position: `row-${rowIndex}`,
                  initialSize: currentSizes[rowIndex * numCols] ? `${currentSizes[rowIndex * numCols]}%` : `${defaultRowHeight}%`
                };
              })}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const allSizes = [...(currentSizes || [])];
                newSizes.forEach((rowSize, rowIndex) => {
                  const rowStart = rowIndex * numCols;
                  const defaultColWidth = 100 / numCols;
                  const rowTotal = allSizes.slice(rowStart, rowStart + numCols).reduce((sum, s) => sum + (s || 0), 0) || 100;
                  const scale = parseFloat(rowSize) / rowTotal;
                  for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    allSizes[rowStart + colIndex] = (allSizes[rowStart + colIndex] || defaultColWidth) * scale;
                  }
                });
                setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
              }}
            />
          );
        }

      // 16-cell layout (4x4 grid)
      case '16-grid':
        {
          const numRows = 4;
          const numCols = 4;
          const defaultRowHeight = 100 / numRows;
          const defaultColWidth = 100 / numCols;
          return (
            <ResizableGroup
              direction="vertical"
              minSize={50}
              cells={Array.from({ length: numRows }, (_, rowIndex) => {
                const rowStart = rowIndex * numCols;
                return {
                  content: (
                    <ResizableGroup
                      direction="horizontal"
                      minSize={40}
                      cells={Array.from({ length: numCols }, (_, colIndex) => ({
                        content: <div className="w-full h-full"><WidgetSection sectionId={`16-grid-${rowStart + colIndex}`} /></div>,
                        position: `16-grid-${rowStart + colIndex}`,
                        initialSize: currentSizes[rowStart + colIndex] ? `${currentSizes[rowStart + colIndex]}%` : `${defaultColWidth}%`
                      }))}
                      templateId={selectedTemplate?.id?.toString()}
                      layout={selectedLayout}
                      onSizeChange={(newSizes) => {
                        const allSizes = [...(currentSizes || [])];
                        newSizes.forEach((size, colIndex) => {
                          allSizes[rowStart + colIndex] = parseFloat(size);
                        });
                        setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
                      }}
                    />
                  ),
                  position: `row-${rowIndex}`,
                  initialSize: currentSizes[rowIndex * numCols] ? `${currentSizes[rowIndex * numCols]}%` : `${defaultRowHeight}%`
                };
              })}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const allSizes = [...(currentSizes || [])];
                newSizes.forEach((rowSize, rowIndex) => {
                  const rowStart = rowIndex * numCols;
                  const defaultColWidth = 100 / numCols;
                  const rowTotal = allSizes.slice(rowStart, rowStart + numCols).reduce((sum, s) => sum + (s || 0), 0) || 100;
                  const scale = parseFloat(rowSize) / rowTotal;
                  for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    allSizes[rowStart + colIndex] = (allSizes[rowStart + colIndex] || defaultColWidth) * scale;
                  }
                });
                setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
              }}
            />
          );
        }

      // 24-cell layouts
      case '24-grid-4x6':
        {
          // 4 rows x 6 columns
          const numRows = 4;
          const numCols = 6;
          const defaultRowHeight = 100 / numRows;
          const defaultColWidth = 100 / numCols;
          return (
            <ResizableGroup
              direction="vertical"
              minSize={50}
              cells={Array.from({ length: numRows }, (_, rowIndex) => {
                const rowStart = rowIndex * numCols;
                return {
                  content: (
                    <ResizableGroup
                      direction="horizontal"
                      minSize={40}
                      cells={Array.from({ length: numCols }, (_, colIndex) => ({
                        content: <div className="w-full h-full"><WidgetSection 
                          sectionId={`24-grid-4x6-${rowStart + colIndex}`} 
                          edges={{ 
                            top: rowIndex === 0, 
                            bottom: rowIndex === numRows - 1, 
                            left: colIndex === 0, 
                            right: colIndex === numCols - 1 
                          }} 
                        /></div>,
                        position: `24-grid-4x6-${rowStart + colIndex}`,
                        initialSize: currentSizes[rowStart + colIndex] ? `${currentSizes[rowStart + colIndex]}%` : `${defaultColWidth}%`
                      }))}
                      templateId={selectedTemplate?.id?.toString()}
                      layout={selectedLayout}
                      onSizeChange={(newSizes) => {
                        const allSizes = [...(currentSizes || [])];
                        newSizes.forEach((size, colIndex) => {
                          allSizes[rowStart + colIndex] = parseFloat(size);
                        });
                        setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
                      }}
                    />
                  ),
                  position: `row-${rowIndex}`,
                  initialSize: currentSizes[rowIndex * numCols] ? `${currentSizes[rowIndex * numCols]}%` : `${defaultRowHeight}%`
                };
              })}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const allSizes = [...(currentSizes || [])];
                newSizes.forEach((rowSize, rowIndex) => {
                  const rowStart = rowIndex * numCols;
                  const defaultColWidth = 100 / numCols;
                  const rowTotal = allSizes.slice(rowStart, rowStart + numCols).reduce((sum, s) => sum + (s || 0), 0) || 100;
                  const scale = parseFloat(rowSize) / rowTotal;
                  for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    allSizes[rowStart + colIndex] = (allSizes[rowStart + colIndex] || defaultColWidth) * scale;
                  }
                });
                setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
              }}
            />
          );
        }

      case '24-grid-6x4':
        {
          // 6 rows x 4 columns
          const numRows = 6;
          const numCols = 4;
          const defaultRowHeight = 100 / numRows;
          const defaultColWidth = 100 / numCols;
          return (
            <ResizableGroup
              direction="vertical"
              minSize={50}
              cells={Array.from({ length: numRows }, (_, rowIndex) => {
                const rowStart = rowIndex * numCols;
                return {
                  content: (
                    <ResizableGroup
                      direction="horizontal"
                      minSize={40}
                      cells={Array.from({ length: numCols }, (_, colIndex) => ({
                        content: <div className="w-full h-full"><WidgetSection 
                          sectionId={`24-grid-6x4-${rowStart + colIndex}`} 
                          edges={{ 
                            top: rowIndex === 0, 
                            bottom: rowIndex === numRows - 1, 
                            left: colIndex === 0, 
                            right: colIndex === numCols - 1 
                          }} 
                        /></div>,
                        position: `24-grid-6x4-${rowStart + colIndex}`,
                        initialSize: currentSizes[rowStart + colIndex] ? `${currentSizes[rowStart + colIndex]}%` : `${defaultColWidth}%`
                      }))}
                      templateId={selectedTemplate?.id?.toString()}
                      layout={selectedLayout}
                      onSizeChange={(newSizes) => {
                        const allSizes = [...(currentSizes || [])];
                        newSizes.forEach((size, colIndex) => {
                          allSizes[rowStart + colIndex] = parseFloat(size);
                        });
                        setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
                      }}
                    />
                  ),
                  position: `row-${rowIndex}`,
                  initialSize: currentSizes[rowIndex * numCols] ? `${currentSizes[rowIndex * numCols]}%` : `${defaultRowHeight}%`
                };
              })}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const allSizes = [...(currentSizes || [])];
                newSizes.forEach((rowSize, rowIndex) => {
                  const rowStart = rowIndex * numCols;
                  const defaultColWidth = 100 / numCols;
                  const rowTotal = allSizes.slice(rowStart, rowStart + numCols).reduce((sum, s) => sum + (s || 0), 0) || 100;
                  const scale = parseFloat(rowSize) / rowTotal;
                  for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    allSizes[rowStart + colIndex] = (allSizes[rowStart + colIndex] || defaultColWidth) * scale;
                  }
                });
                setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
              }}
            />
          );
        }

      // 28-cell layouts
      case '28-grid-4x7':
        {
          // 4 rows x 7 columns
          const numRows = 4;
          const numCols = 7;
          const defaultRowHeight = 100 / numRows;
          const defaultColWidth = 100 / numCols;
          return (
            <ResizableGroup
              direction="vertical"
              minSize={50}
              cells={Array.from({ length: numRows }, (_, rowIndex) => {
                const rowStart = rowIndex * numCols;
                return {
                  content: (
                    <ResizableGroup
                      direction="horizontal"
                      minSize={40}
                      cells={Array.from({ length: numCols }, (_, colIndex) => ({
                        content: <div className="w-full h-full"><WidgetSection sectionId={`28-grid-4x7-${rowStart + colIndex}`} /></div>,
                        position: `28-grid-4x7-${rowStart + colIndex}`,
                        initialSize: currentSizes[rowStart + colIndex] ? `${currentSizes[rowStart + colIndex]}%` : `${defaultColWidth}%`
                      }))}
                      templateId={selectedTemplate?.id?.toString()}
                      layout={selectedLayout}
                      onSizeChange={(newSizes) => {
                        const allSizes = [...(currentSizes || [])];
                        newSizes.forEach((size, colIndex) => {
                          allSizes[rowStart + colIndex] = parseFloat(size);
                        });
                        setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
                      }}
                    />
                  ),
                  position: `row-${rowIndex}`,
                  initialSize: currentSizes[rowIndex * numCols] ? `${currentSizes[rowIndex * numCols]}%` : `${defaultRowHeight}%`
                };
              })}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const allSizes = [...(currentSizes || [])];
                newSizes.forEach((rowSize, rowIndex) => {
                  const rowStart = rowIndex * numCols;
                  const defaultColWidth = 100 / numCols;
                  const rowTotal = allSizes.slice(rowStart, rowStart + numCols).reduce((sum, s) => sum + (s || 0), 0) || 100;
                  const scale = parseFloat(rowSize) / rowTotal;
                  for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    allSizes[rowStart + colIndex] = (allSizes[rowStart + colIndex] || defaultColWidth) * scale;
                  }
                });
                setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
              }}
            />
          );
        }

      case '28-grid-7x4':
        {
          // 7 rows x 4 columns
          const numRows = 7;
          const numCols = 4;
          const defaultRowHeight = 100 / numRows;
          const defaultColWidth = 100 / numCols;
          return (
            <ResizableGroup
              direction="vertical"
              minSize={50}
              cells={Array.from({ length: numRows }, (_, rowIndex) => {
                const rowStart = rowIndex * numCols;
                return {
                  content: (
                    <ResizableGroup
                      direction="horizontal"
                      minSize={40}
                      cells={Array.from({ length: numCols }, (_, colIndex) => ({
                        content: <div className="w-full h-full"><WidgetSection sectionId={`28-grid-7x4-${rowStart + colIndex}`} /></div>,
                        position: `28-grid-7x4-${rowStart + colIndex}`,
                        initialSize: currentSizes[rowStart + colIndex] ? `${currentSizes[rowStart + colIndex]}%` : `${defaultColWidth}%`
                      }))}
                      templateId={selectedTemplate?.id?.toString()}
                      layout={selectedLayout}
                      onSizeChange={(newSizes) => {
                        const allSizes = [...(currentSizes || [])];
                        newSizes.forEach((size, colIndex) => {
                          allSizes[rowStart + colIndex] = parseFloat(size);
                        });
                        setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
                      }}
                    />
                  ),
                  position: `row-${rowIndex}`,
                  initialSize: currentSizes[rowIndex * numCols] ? `${currentSizes[rowIndex * numCols]}%` : `${defaultRowHeight}%`
                };
              })}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const allSizes = [...(currentSizes || [])];
                newSizes.forEach((rowSize, rowIndex) => {
                  const rowStart = rowIndex * numCols;
                  const defaultColWidth = 100 / numCols;
                  const rowTotal = allSizes.slice(rowStart, rowStart + numCols).reduce((sum, s) => sum + (s || 0), 0) || 100;
                  const scale = parseFloat(rowSize) / rowTotal;
                  for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    allSizes[rowStart + colIndex] = (allSizes[rowStart + colIndex] || defaultColWidth) * scale;
                  }
                });
                setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
              }}
            />
          );
        }

      // 32-cell layouts
      case '32-grid-4x8':
        {
          // 4 rows x 8 columns
          const numRows = 4;
          const numCols = 8;
          const defaultRowHeight = 100 / numRows;
          const defaultColWidth = 100 / numCols;
          return (
            <ResizableGroup
              direction="vertical"
              minSize={50}
              cells={Array.from({ length: numRows }, (_, rowIndex) => {
                const rowStart = rowIndex * numCols;
                return {
                  content: (
                    <ResizableGroup
                      direction="horizontal"
                      minSize={40}
                      cells={Array.from({ length: numCols }, (_, colIndex) => ({
                        content: <div className="w-full h-full"><WidgetSection sectionId={`32-grid-4x8-${rowStart + colIndex}`} /></div>,
                        position: `32-grid-4x8-${rowStart + colIndex}`,
                        initialSize: currentSizes[rowStart + colIndex] ? `${currentSizes[rowStart + colIndex]}%` : `${defaultColWidth}%`
                      }))}
                      templateId={selectedTemplate?.id?.toString()}
                      layout={selectedLayout}
                      onSizeChange={(newSizes) => {
                        const allSizes = [...(currentSizes || [])];
                        newSizes.forEach((size, colIndex) => {
                          allSizes[rowStart + colIndex] = parseFloat(size);
                        });
                        setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
                      }}
                    />
                  ),
                  position: `row-${rowIndex}`,
                  initialSize: currentSizes[rowIndex * numCols] ? `${currentSizes[rowIndex * numCols]}%` : `${defaultRowHeight}%`
                };
              })}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const allSizes = [...(currentSizes || [])];
                newSizes.forEach((rowSize, rowIndex) => {
                  const rowStart = rowIndex * numCols;
                  const defaultColWidth = 100 / numCols;
                  const rowTotal = allSizes.slice(rowStart, rowStart + numCols).reduce((sum, s) => sum + (s || 0), 0) || 100;
                  const scale = parseFloat(rowSize) / rowTotal;
                  for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    allSizes[rowStart + colIndex] = (allSizes[rowStart + colIndex] || defaultColWidth) * scale;
                  }
                });
                setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
              }}
            />
          );
        }

      case '32-grid-8x4':
        {
          // 8 rows x 4 columns
          const numRows = 8;
          const numCols = 4;
          const defaultRowHeight = 100 / numRows;
          const defaultColWidth = 100 / numCols;
          return (
            <ResizableGroup
              direction="vertical"
              minSize={50}
              cells={Array.from({ length: numRows }, (_, rowIndex) => {
                const rowStart = rowIndex * numCols;
                return {
                  content: (
                    <ResizableGroup
                      direction="horizontal"
                      minSize={40}
                      cells={Array.from({ length: numCols }, (_, colIndex) => ({
                        content: <div className="w-full h-full"><WidgetSection sectionId={`32-grid-8x4-${rowStart + colIndex}`} /></div>,
                        position: `32-grid-8x4-${rowStart + colIndex}`,
                        initialSize: currentSizes[rowStart + colIndex] ? `${currentSizes[rowStart + colIndex]}%` : `${defaultColWidth}%`
                      }))}
                      templateId={selectedTemplate?.id?.toString()}
                      layout={selectedLayout}
                      onSizeChange={(newSizes) => {
                        const allSizes = [...(currentSizes || [])];
                        newSizes.forEach((size, colIndex) => {
                          allSizes[rowStart + colIndex] = parseFloat(size);
                        });
                        setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
                      }}
                    />
                  ),
                  position: `row-${rowIndex}`,
                  initialSize: currentSizes[rowIndex * numCols] ? `${currentSizes[rowIndex * numCols]}%` : `${defaultRowHeight}%`
                };
              })}
              templateId={selectedTemplate?.id?.toString()}
              layout={selectedLayout}
              onSizeChange={(newSizes) => {
                const allSizes = [...(currentSizes || [])];
                newSizes.forEach((rowSize, rowIndex) => {
                  const rowStart = rowIndex * numCols;
                  const defaultColWidth = 100 / numCols;
                  const rowTotal = allSizes.slice(rowStart, rowStart + numCols).reduce((sum, s) => sum + (s || 0), 0) || 100;
                  const scale = parseFloat(rowSize) / rowTotal;
                  for (let colIndex = 0; colIndex < numCols; colIndex++) {
                    allSizes[rowStart + colIndex] = (allSizes[rowStart + colIndex] || defaultColWidth) * scale;
                  }
                });
                setGridSizes(prev => ({ ...prev, [selectedLayout]: allSizes }));
              }}
            />
          );
        }
      
      case 'no-grid':
        return <FreeFloatingCanvas onAddWidget={() => setIsWidgetsMenuOpen(true)} widgetCatalog={availableWidgets} />;
      
      default:
        return <WidgetSection sectionId="single" />;
    }
  };

  // Render a layout inside a tabbed widget using existing building blocks
  const renderNestedLayout = (layout: LayoutType, parentKey: string) => {
    const currentSizes = gridSizes[layout] || [];
    const localSection = (suffix: string) => `${parentKey}__${suffix}`;
    switch (layout) {
      case 'single':
        return <WidgetSection sectionId={localSection('single')} />;
      case 'two-vertical':
        return (
          <div className="flex w-full h-full min-h-0">
            <div style={{ width: `${currentSizes[0]}%` }}>
              <WidgetSection sectionId={localSection('two-vertical-0')} />
            </div>
            <div className="w-1 bg-neutral-700" />
            <div style={{ width: `${currentSizes[1]}%` }}>
              <WidgetSection sectionId={localSection('two-vertical-1')} />
            </div>
          </div>
        );
      case 'two-horizontal':
        return (
          <div className="flex flex-col w-full h-full">
            <div style={{ height: `${currentSizes[0]}%` }}>
              <WidgetSection sectionId={localSection('two-horizontal-0')} />
            </div>
            <div className="h-1 bg-neutral-700" />
            <div style={{ height: `${currentSizes[1]}%` }}>
              <WidgetSection sectionId={localSection('two-horizontal-1')} />
            </div>
          </div>
        );
      case 'three-vertical':
        return (
          <div className="flex w-full h-full min-h-0">
            <div style={{ width: `${currentSizes[0]}%` }}>
              <WidgetSection sectionId={localSection('three-vertical-0')} />
            </div>
            <div className="w-1 bg-neutral-700" />
            <div style={{ width: `${currentSizes[1]}%` }}>
              <WidgetSection sectionId={localSection('three-vertical-1')} />
            </div>
            <div className="w-1 bg-neutral-700" />
            <div style={{ width: `${currentSizes[2]}%` }}>
              <WidgetSection sectionId={localSection('three-vertical-2')} />
            </div>
          </div>
        );
      case 'three-horizontal':
        return (
          <div className="flex flex-col w-full h-full">
            <div style={{ height: `${currentSizes[0]}%` }}>
              <WidgetSection sectionId={localSection('three-horizontal-0')} />
            </div>
            <div className="h-1 bg-neutral-700" />
            <div style={{ height: `${currentSizes[1]}%` }}>
              <WidgetSection sectionId={localSection('three-horizontal-1')} />
            </div>
            <div className="h-1 bg-neutral-700" />
            <div style={{ height: `${currentSizes[2]}%` }}>
              <WidgetSection sectionId={localSection('three-horizontal-2')} />
            </div>
          </div>
        );
      case 'three-left-right': {
        // Now Top + Bottom Split for nested rendering
        const totalBottom = (currentSizes[1] || 0) + (currentSizes[2] || 0);
        const bottomLeftPct = totalBottom ? (currentSizes[1] / totalBottom) * 100 : 50;
        const bottomRightPct = 100 - bottomLeftPct;
        return (
          <div className="flex flex-col w-full h-full min-h-0">
            <div style={{ height: `${currentSizes[0]}%` }}>
              <WidgetSection sectionId={localSection('three-left-right-0')} />
            </div>
            <div className="h-1 bg-neutral-700" />
            <div className="flex min-h-0" style={{ height: `${totalBottom}%` }}>
              <div style={{ width: `${bottomLeftPct}%` }}>
                <WidgetSection sectionId={localSection('three-left-right-1')} />
              </div>
              <div className="w-1 bg-neutral-700" />
              <div style={{ width: `${bottomRightPct}%` }}>
                <WidgetSection sectionId={localSection('three-left-right-2')} />
              </div>
            </div>
          </div>
        );
      }
      case 'three-top-bottom': {
        const totalTop = (currentSizes[0] || 0) + (currentSizes[1] || 0);
        const topLeftPct = totalTop ? (currentSizes[0] / totalTop) * 100 : 50;
        const topRightPct = 100 - topLeftPct;
        return (
          <div className="flex flex-col w-full h-full min-h-0">
            <div className="flex min-h-0" style={{ height: `${totalTop}%` }}>
              <div style={{ width: `${topLeftPct}%` }}>
                <WidgetSection sectionId={localSection('three-top-bottom-0')} />
              </div>
              <div className="w-1 bg-neutral-700" />
              <div style={{ width: `${topRightPct}%` }}>
                <WidgetSection sectionId={localSection('three-top-bottom-1')} />
              </div>
            </div>
            <div className="h-1 bg-neutral-700" />
            <div style={{ height: `${currentSizes[2]}%` }}>
              <WidgetSection sectionId={localSection('three-top-bottom-2')} />
            </div>
          </div>
        );
      }
      case 'three-left-stack': {
        const totalLeft = (currentSizes[0] || 0) + (currentSizes[1] || 0);
        const leftTopPct = totalLeft ? (currentSizes[0] / totalLeft) * 100 : 50;
        const leftBottomPct = 100 - leftTopPct;
        return (
          <div className="flex w-full h-full min-h-0">
            <div className="flex flex-col" style={{ width: `${totalLeft}%` }}>
              <div style={{ height: `${leftTopPct}%` }}>
                <WidgetSection sectionId={localSection('three-left-stack-0')} />
              </div>
              <div className="h-1 bg-neutral-700" />
              <div style={{ height: `${leftBottomPct}%` }}>
                <WidgetSection sectionId={localSection('three-left-stack-1')} />
              </div>
            </div>
            <div className="w-1 bg-neutral-700" />
            <div style={{ width: `${currentSizes[2]}%` }}>
              <WidgetSection sectionId={localSection('three-left-stack-2')} />
            </div>
          </div>
        );
      }
      case 'three-right-stack': {
        const totalRight = (currentSizes[1] || 0) + (currentSizes[2] || 0);
        const rightTopPct = totalRight ? (currentSizes[1] / totalRight) * 100 : 50;
        const rightBottomPct = 100 - rightTopPct;
        return (
          <div className="flex w-full h-full min-h-0">
            <div style={{ width: `${currentSizes[0]}%` }}>
              <WidgetSection sectionId={localSection('three-right-stack-0')} />
            </div>
            <div className="w-1 bg-neutral-700" />
            <div className="flex flex-col" style={{ width: `${totalRight}%` }}>
              <div style={{ height: `${rightTopPct}%` }}>
                <WidgetSection sectionId={localSection('three-right-stack-1')} />
              </div>
              <div className="h-1 bg-neutral-700" />
              <div style={{ height: `${rightBottomPct}%` }}>
                <WidgetSection sectionId={localSection('three-right-stack-2')} />
              </div>
            </div>
          </div>
        );
      }
      case 'four-grid':
        return (
          <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-px min-h-0">
            <div className="min-h-0"><WidgetSection sectionId={localSection('four-grid-0')} /></div>
            <div className="min-h-0"><WidgetSection sectionId={localSection('four-grid-1')} /></div>
            <div className="min-h-0"><WidgetSection sectionId={localSection('four-grid-2')} /></div>
            <div className="min-h-0"><WidgetSection sectionId={localSection('four-grid-3')} /></div>
          </div>
        );
      case 'four-vertical':
        return (
          <div className="flex w-full h-full">
            <div style={{ width: `${currentSizes[0]}%` }}><WidgetSection sectionId={localSection('four-vertical-0')} /></div>
            <div className="w-1 bg-neutral-700" />
            <div style={{ width: `${currentSizes[1]}%` }}><WidgetSection sectionId={localSection('four-vertical-1')} /></div>
            <div className="w-1 bg-neutral-700" />
            <div style={{ width: `${currentSizes[2]}%` }}><WidgetSection sectionId={localSection('four-vertical-2')} /></div>
            <div className="w-1 bg-neutral-700" />
            <div style={{ width: `${currentSizes[3]}%` }}><WidgetSection sectionId={localSection('four-vertical-3')} /></div>
          </div>
        );
      case 'four-horizontal':
        return (
          <div className="flex flex-col w-full h-full min-h-0">
            <div className="min-h-0" style={{ height: `${currentSizes[0]}%` }}><WidgetSection sectionId={localSection('four-horizontal-0')} /></div>
            <div className="h-1 bg-neutral-700" />
            <div className="min-h-0" style={{ height: `${currentSizes[1]}%` }}><WidgetSection sectionId={localSection('four-horizontal-1')} /></div>
            <div className="h-1 bg-neutral-700" />
            <div className="min-h-0" style={{ height: `${currentSizes[2]}%` }}><WidgetSection sectionId={localSection('four-horizontal-2')} /></div>
            <div className="h-1 bg-neutral-700" />
            <div className="min-h-0" style={{ height: `${currentSizes[3]}%` }}><WidgetSection sectionId={localSection('four-horizontal-3')} /></div>
          </div>
        );
      case 'five-grid': {
        const topTotal = (currentSizes[0] || 0) + (currentSizes[1] || 0);
        const bottomTotal = (currentSizes[2] || 0) + (currentSizes[3] || 0) + (currentSizes[4] || 0);
        const topLeftPct = topTotal ? (currentSizes[0] / topTotal) * 100 : 50;
        const topRightPct = 100 - topLeftPct;
        const b0Pct = bottomTotal ? (currentSizes[2] / bottomTotal) * 100 : 33.33;
        const b1Pct = bottomTotal ? (currentSizes[3] / bottomTotal) * 100 : 33.33;
        const b2Pct = 100 - b0Pct - b1Pct;
        return (
          <div className="flex flex-col w-full h-full min-h-0">
            <div className="flex min-h-0" style={{ height: `${topTotal}%` }}>
              <div style={{ width: `${topLeftPct}%` }}><WidgetSection sectionId={localSection('five-grid-0')} /></div>
              <div className="w-1 bg-neutral-700" />
              <div style={{ width: `${topRightPct}%` }}><WidgetSection sectionId={localSection('five-grid-1')} /></div>
            </div>
            <div className="h-1 bg-neutral-700" />
            <div className="flex min-h-0" style={{ height: `${bottomTotal}%` }}>
              <div style={{ width: `${b0Pct}%` }}><WidgetSection sectionId={localSection('five-grid-2')} /></div>
              <div className="w-1 bg-neutral-700" />
              <div style={{ width: `${b1Pct}%` }}><WidgetSection sectionId={localSection('five-grid-3')} /></div>
              <div className="w-1 bg-neutral-700" />
              <div style={{ width: `${b2Pct}%` }}><WidgetSection sectionId={localSection('five-grid-4')} /></div>
            </div>
          </div>
        );
      }
      case 'five-vertical':
        return (
          <div className="flex w-full h-full">
            <div style={{ width: `${currentSizes[0]}%` }}><WidgetSection sectionId={localSection('five-vertical-0')} /></div>
            <div className="w-1 bg-neutral-700" />
            <div style={{ width: `${currentSizes[1]}%` }}><WidgetSection sectionId={localSection('five-vertical-1')} /></div>
            <div className="w-1 bg-neutral-700" />
            <div style={{ width: `${currentSizes[2]}%` }}><WidgetSection sectionId={localSection('five-vertical-2')} /></div>
            <div className="w-1 bg-neutral-700" />
            <div style={{ width: `${currentSizes[3]}%` }}><WidgetSection sectionId={localSection('five-vertical-3')} /></div>
            <div className="w-1 bg-neutral-700" />
            <div style={{ width: `${currentSizes[4]}%` }}><WidgetSection sectionId={localSection('five-vertical-4')} /></div>
          </div>
        );
      case 'five-horizontal':
        return (
          <div className="flex flex-col w-full h-full min-h-0">
            <div className="min-h-0" style={{ height: `${currentSizes[0]}%` }}><WidgetSection sectionId={localSection('five-horizontal-0')} /></div>
            <div className="h-1 bg-neutral-700" />
            <div className="min-h-0" style={{ height: `${currentSizes[1]}%` }}><WidgetSection sectionId={localSection('five-horizontal-1')} /></div>
            <div className="h-1 bg-neutral-700" />
            <div className="min-h-0" style={{ height: `${currentSizes[2]}%` }}><WidgetSection sectionId={localSection('five-horizontal-2')} /></div>
            <div className="h-1 bg-neutral-700" />
            <div className="min-h-0" style={{ height: `${currentSizes[3]}%` }}><WidgetSection sectionId={localSection('five-horizontal-3')} /></div>
            <div className="h-1 bg-neutral-700" />
            <div className="min-h-0" style={{ height: `${currentSizes[4]}%` }}><WidgetSection sectionId={localSection('five-horizontal-4')} /></div>
          </div>
        );
      default:
        return <WidgetSection sectionId={localSection('single')} />;
    }
  };

  // Tabbed Widget Layout Picker Modal
  const TabbedLayoutPicker = () => {
    if (!isTabbedLayoutPickerOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
        <div className="bg-background border border-border rounded-lg p-5 w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"/>
              </svg>
              <h2 className="text-xl font-semibold">Select a layout for the new tab</h2>
            </div>
            <button
              onClick={() => setIsTabbedLayoutPickerOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Layout Grid */}
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
              {layouts.map((layout) => (
                <button
                  key={`tabbed-layout-${layout.id}`}
                  className="p-3 bg-popover hover:bg-muted border border-border hover:border-primary rounded flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground text-xs transition-colors"
                  onClick={() => {
                    if (!tabTargetWidgetSection) return;
                    setWidgets(prev => {
                      const w = prev[tabTargetWidgetSection!];
                      if (!w) return prev;
                      const currentTabs = ((w.config?.tabs) ?? []) as Array<{ id: string; name: string; layout: LayoutType }>;
                      const newTab = { id: `tab-${Date.now()}`, name: `Tab ${currentTabs.length + 1}`, layout: layout.id } as { id: string; name: string; layout: LayoutType };
                      const updated: Widget = { ...w, config: { ...(w.config || {}), tabs: [...currentTabs, newTab], activeTabId: newTab.id } };
                      return { ...prev, [tabTargetWidgetSection!]: updated };
                    });
                    setIsTabbedLayoutPickerOpen(false);
                  }}
                  title={layout.name}
                >
                  <div>{layout.icon}</div>
                  <div className="truncate w-full text-center">{layout.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden flex">
              {/* Thin Left Column */}
        <div className="w-12 bg-neutral-900 border-r border-neutral-800 flex flex-col items-center py-2 gap-2 justify-between">
        <div className="flex flex-col items-center gap-2">
          <Image src="/logo.png" alt="Logo" width={24} height={24} className="h-6 w-6 object-contain" />
          <button 
            data-menu
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-8 h-8 bg-neutral-800 hover:bg-neutral-600 text-neutral-300 hover:text-white transition-all duration-200 flex items-center justify-center rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button 
            data-menu
            onClick={() => setIsWidgetsMenuOpen(!isWidgetsMenuOpen)}
            className="w-8 h-8 bg-neutral-800 hover:bg-neutral-600 text-neutral-300 hover:text-white transition-all duration-200 flex items-center justify-center rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button 
            data-modal
            onClick={() => setIsSaveModalOpen(true)}
            className="w-8 h-8 bg-neutral-800 hover:bg-neutral-600 text-neutral-300 hover:text-white transition-all duration-200 flex items-center justify-center rounded"
            title="Save Layout"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-8H7v8"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3v5h8"/>
            </svg>
          </button>
        </div>
        
        {/* Bottom Navigation Icons */}
        <div className="flex flex-col items-center gap-1">
            <button 
              data-sidebar
              onClick={() => setActiveSidePanel(activeSidePanel === 'watchlist' ? null : 'watchlist')}
              className={`w-8 h-8 p-1.5 transition-all duration-200 flex items-center justify-center rounded ${
                activeSidePanel === 'watchlist' 
                  ? 'bg-neutral-600 text-white' 
                  : 'bg-neutral-800 hover:bg-neutral-600 text-neutral-300 hover:text-white'
              }`} 
              title="Watch List"
            >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </button>
          
          <button 
            data-sidebar
            onClick={() => setActiveSidePanel(activeSidePanel === 'notes' ? null : 'notes')}
            className={`w-8 h-8 p-1.5 transition-all duration-200 flex items-center justify-center rounded ${
              activeSidePanel === 'notes' 
                ? 'bg-neutral-600 text-white' 
                : 'bg-neutral-800 hover:bg-neutral-600 text-neutral-300 hover:text-white'
            }`} 
            title="Notes"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          
          <button 
            data-sidebar
            onClick={() => setActiveSidePanel(activeSidePanel === 'alerts' ? null : 'alerts')}
            className={`w-8 h-8 p-1.5 transition-all duration-200 flex items-center justify-center rounded ${
              activeSidePanel === 'alerts' 
                ? 'bg-neutral-600 text-white' 
                : 'bg-neutral-800 hover:bg-neutral-600 text-neutral-300 hover:text-white'
            }`} 
            title="Alerts"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 3h6a2 2 0 012 2v6M6 14a2 2 0 01-2-2V6a2 2 0 012-2h6"/>
            </svg>
          </button>
          
          <button 
            data-sidebar
            onClick={() => setActiveSidePanel(activeSidePanel === 'sound' ? null : 'sound')}
            className={`w-8 h-8 p-1.5 transition-all duration-200 flex items-center justify-center rounded ${
              activeSidePanel === 'sound' 
                ? 'bg-neutral-600 text-white' 
                : 'bg-neutral-800 hover:bg-neutral-600 text-neutral-300 hover:text-white'
            }`} 
            title="Sound"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
            </svg>
          </button>
          
          <button 
            data-sidebar
            onClick={() => setActiveSidePanel(activeSidePanel === 'notifications' ? null : 'notifications')}
            className={`w-8 h-8 p-1.5 transition-all duration-200 flex items-center justify-center rounded ${
              activeSidePanel === 'notifications' 
                ? 'bg-neutral-600 text-white' 
                : 'bg-neutral-800 hover:bg-neutral-600 text-neutral-300 hover:text-white'
            }`} 
            title="Notifications"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.257 4.257l1.414 1.414-1.414-1.414zM8.464 10.464l1.414 1.414-1.414-1.414zm9.193-9.193l1.414 1.414-1.414-1.414zm-9.193 0l1.414 1.414L8.464 1.27zM19.071 19.071l-1.414-1.414 1.414 1.414zM4.929 19.071l1.414-1.414-1.414 1.414zM12 3v1m0 16v1M3 12h1m16 0h1"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Side Panels */}
      {activeSidePanel && (
        <div data-sidebar className="fixed left-8 top-0 h-full w-[400px] bg-black border-r border-neutral-800 z-40 transform transition-transform duration-300 ease-in-out">
          <div className="flex flex-col h-full">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-3 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-300">
                {activeSidePanel === 'watchlist' && 'Watch List'}
                {activeSidePanel === 'notes' && 'Notes'}
                {activeSidePanel === 'alerts' && 'Alerts'}
                {activeSidePanel === 'sound' && 'Sound'}
                {activeSidePanel === 'notifications' && 'Notifications'}
              </h3>
              <button
                onClick={() => setActiveSidePanel(null)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 p-3 overflow-y-auto">
              {activeSidePanel === 'watchlist' && (
                <div className="space-y-2">
                  <div className="text-xs text-neutral-500 mb-3">Your watched securities</div>
                  <div className="space-y-1">
                    <div className="p-2 bg-neutral-900 text-xs">
                      <div className="text-white font-medium">AAPL</div>
                      <div className="text-green-400">+2.3%</div>
                    </div>
                    <div className="p-2 bg-neutral-900 text-xs">
                      <div className="text-white font-medium">TSLA</div>
                      <div className="text-red-400">-1.2%</div>
                    </div>
                    <div className="p-2 bg-neutral-900 text-xs">
                      <div className="text-white font-medium">MSFT</div>
                      <div className="text-green-400">+0.8%</div>
                    </div>
                  </div>
                </div>
              )}

              {activeSidePanel === 'notes' && (
                <div className="space-y-2">
                  <div className="text-xs text-neutral-500 mb-3">Quick notes</div>
                  <textarea
                    className="w-full h-32 p-2 bg-neutral-900 border border-neutral-700 text-white text-xs resize-none focus:outline-none focus:border-neutral-500"
                    placeholder="Add your notes here..."
                  />
                  <div className="space-y-1">
                    <div className="p-2 bg-neutral-900 text-xs">
                      <div className="text-neutral-400 text-xs">Today 2:30 PM</div>
                      <div className="text-white">Market volatility expected this week</div>
                    </div>
                  </div>
                </div>
              )}

              {activeSidePanel === 'alerts' && (
                <div className="space-y-2">
                  <div className="text-xs text-neutral-500 mb-3">Active alerts</div>
                  <div className="space-y-1">
                    <div className="p-2 bg-red-900/20 border border-red-700 text-xs">
                      <div className="text-red-400 font-medium">Price Alert</div>
                      <div className="text-white">AAPL &gt; $150</div>
                    </div>
                    <div className="p-2 bg-yellow-900/20 border border-yellow-700 text-xs">
                      <div className="text-yellow-400 font-medium">Volume Alert</div>
                      <div className="text-white">TSLA volume spike</div>
                    </div>
                  </div>
                </div>
              )}

              {activeSidePanel === 'sound' && (
                <div className="space-y-3">
                  <div className="text-xs text-neutral-500 mb-3">Audio settings</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white">Master Volume</span>
                      <input type="range" className="w-20 h-1 bg-neutral-700 appearance-none cursor-pointer" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white">Alert Sounds</span>
                      <input type="checkbox" className="w-3 h-3" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white">Trade Confirmations</span>
                      <input type="checkbox" className="w-3 h-3" defaultChecked />
                    </div>
                  </div>
                </div>
              )}

              {activeSidePanel === 'notifications' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {/* Simple Bell Icon */}
                      {preferences.notificationsOn ? (
                        <svg className="w-4 h-4 text-orange-400 fill-current" viewBox="0 0 24 24">
                          <path d="M18 16v-5c0-3.07-2.13-5.64-6-5.96V4a2 2 0 1 0-4 0v1.04C4.13 5.36 2 7.93 2 11v5l-1 1v1h20v-1l-1-1zm-6 6a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-neutral-500" viewBox="0 0 24 24">
                          <path d="M18 16v-5c0-3.07-2.13-5.64-6-5.96V4a2 2 0 1 0-4 0v1.04C4.13 5.36 2 7.93 2 11v5l-1 1v1h20v-1l-1-1zm-6 6a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z" />
                        </svg>
                      )}
                      <div className="text-xs text-neutral-500">Recent notifications</div>
                    </div>
                    
                    {/* Bell Toggle */}
                    <button
                      onClick={toggleNotifications}
                      className={`p-1.5 rounded-lg transition-colors focus:outline-none ${
                        preferences.notificationsOn 
                          ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400' 
                          : 'bg-neutral-700/50 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-300'
                      }`}
                    >
                      {preferences.notificationsOn ? (
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M18 16v-5c0-3.07-2.13-5.64-6-5.96V4a2 2 0 1 0-4 0v1.04C4.13 5.36 2 7.93 2 11v5l-1 1v1h20v-1l-1-1zm-6 6a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path d="M18 16v-5c0-3.07-2.13-5.64-6-5.96V4a2 2 0 1 0-4 0v1.04C4.13 5.36 2 7.93 2 11v5l-1 1v1h20v-1l-1-1zm-6 6a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  {!preferences.notificationsOn ? (
                    <div className="p-2 bg-neutral-900 text-xs text-center text-neutral-500">
                      Notifications are disabled
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="p-2 bg-neutral-900 text-xs">
                        <div className="text-neutral-400">2 mins ago</div>
                        <div className="text-white">Market opened</div>
                      </div>
                      <div className="p-2 bg-neutral-900 text-xs">
                        <div className="text-neutral-400">5 mins ago</div>
                        <div className="text-white">Portfolio update available</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header with Menu */}
        <div className="bg-neutral-900 border-b border-neutral-800 py-1 px-2">
                    <div className="relative flex items-center gap-2">
            {/* Left Section: Templates and Navigation Icons */}
            <div className="flex items-center gap-2">
              <div className="bg-neutral-800/20 px-1">
                <button 
                  data-menu
                  onClick={() => setTemplatesDropdownOpen(!templatesDropdownOpen)}
                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 hover:border-blue-400 text-white transition-all duration-200 font-medium flex items-center justify-center w-36 gap-1" 
                  style={{ fontSize: '10px' }}
                >
                  <span>Research Templates</span>
                  <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-neutral-800/20 px-1">
                <div className="flex gap-1">
                  <button className="w-8 h-8 p-1.5 bg-neutral-700 text-white transition-all duration-200 flex items-center justify-center rounded" title="Dashboard">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                    </svg>
                  </button>
                  
                  <button className="w-8 h-8 p-1.5 bg-neutral-800 hover:bg-neutral-600 text-neutral-300 hover:text-white transition-all duration-200 flex items-center justify-center rounded" title="Analytics">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                  </button>
                  
                  <button className="w-8 h-8 p-1.5 bg-neutral-800 hover:bg-neutral-600 text-neutral-300 hover:text-white transition-all duration-200 flex items-center justify-center rounded" title="Trading">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                  </button>
                  
                  <button className="w-8 h-8 p-1.5 bg-neutral-800 hover:bg-neutral-600 text-neutral-300 hover:text-white transition-all duration-200 flex items-center justify-center rounded" title="Portfolio">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </button>
                  
                  <button className="w-8 h-8 p-1.5 bg-neutral-800 hover:bg-neutral-600 text-neutral-300 hover:text-white transition-all duration-200 flex items-center justify-center rounded" title="News">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Center Section: Search Bar - Absolutely positioned for true centering */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="bg-neutral-800/20 px-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-64 px-2 py-0.5 bg-neutral-800 border border-neutral-700 text-neutral-300 placeholder-neutral-500 text-xs focus:outline-none focus:border-neutral-500 focus:bg-neutral-700 transition-colors rounded-[3px]"
                  />
                  <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Right Section: Profile Image */}
            <div className="ml-auto flex items-center gap-3">
              {/* Simple Notification Icon */}
              <div className="relative mt-1.5">
                <button
                  className="w-8 h-8 flex items-center justify-center text-orange-400 hover:text-orange-300 transition-colors"
                  onClick={() => setNotifOpen((v) => !v)}
                >
                  {preferences.notificationsOn ? (
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M18 16v-5c0-3.07-2.13-5.64-6-5.96V4a2 2 0 1 0-4 0v1.04C4.13 5.36 2 7.93 2 11v5l-1 1v1h20v-1l-1-1zm-6 6a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path d="M18 16v-5c0-3.07-2.13-5.64-6-5.96V4a2 2 0 1 0-4 0v1.04C4.13 5.36 2 7.93 2 11v5l-1 1v1h20v-1l-1-1zm-6 6a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z" />
                    </svg>
                  )}
                </button>
                
                {/* Simple Notification Counter */}
                {preferences.notificationsOn && (
                  <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-neutral-900 shadow-lg select-none">
                    99+
                  </div>
                )}
                {/* Notification Dropdown */}
                {notifOpen && (
                  <div className="absolute right-[-30px] mt-2 w-[420px] bg-neutral-900 border border-neutral-700 shadow-xl rounded-lg z-50 animate-fade-in">
                    <div className="p-5 border-b border-neutral-800 text-orange-400 font-semibold text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {preferences.notificationsOn ? (
                          <svg className="w-5 h-5 text-orange-400 fill-current" viewBox="0 0 24 24">
                            <path d="M18 16v-5c0-3.07-2.13-5.64-6-5.96V4a2 2 0 1 0-4 0v1.04C4.13 5.36 2 7.93 2 11v5l-1 1v1h20v-1l-1-1zm-6 6a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-neutral-500" viewBox="0 0 24 24">
                            <path d="M18 16v-5c0-3.07-2.13-5.64-6-5.96V4a2 2 0 1 0-4 0v1.04C4.13 5.36 2 7.93 2 11v5l-1 1v1h20v-1l-1-1zm-6 6a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z" />
                          </svg>
                        )}
                        <span>Notifications</span>
                      </div>
                      
                      {/* Bell Toggle */}
                      <button
                        onClick={toggleNotifications}
                        className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-neutral-900 ${
                          preferences.notificationsOn 
                            ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400' 
                            : 'bg-neutral-700/50 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-300'
                        }`}
                      >
                        {preferences.notificationsOn ? (
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M18 16v-5c0-3.07-2.13-5.64-6-5.96V4a2 2 0 1 0-4 0v1.04C4.13 5.36 2 7.93 2 11v5l-1 1v1h20v-1l-1-1zm-6 6a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M18 16v-5c0-3.07-2.13-5.64-6-5.96V4a2 2 0 1 0-4 0v1.04C4.13 5.36 2 7.93 2 11v5l-1 1v1h20v-1l-1-1zm-6 6a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    {!preferences.notificationsOn ? (
                      <div className="p-5 text-center text-neutral-500">
                        <div className="text-sm">Notifications are disabled</div>
                        <div className="text-xs mt-1">Toggle the switch above to enable notifications</div>
                      </div>
                    ) : (
                      <ul className="max-h-96 overflow-y-auto divide-y divide-neutral-800">
                      <li className="flex items-start gap-3 p-5 text-neutral-200 text-base">
                        <div className="flex-1">
                          <div className="font-semibold">Order Filled</div>
                          <div className="text-sm text-neutral-400">Order #1234 has been filled at $150.25</div>
                          <div className="text-xs text-neutral-500 mt-1">2 min ago</div>
                        </div>
                        <button className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-sm text-white rounded transition-colors">Read</button>
                      </li>
                      <li className="flex items-start gap-3 p-5 text-neutral-200 text-base">
                        <div className="flex-1">
                          <div className="font-semibold">Price Alert</div>
                          <div className="text-sm text-neutral-400">AAPL price reached $200.00</div>
                          <div className="text-xs text-neutral-500 mt-1">5 min ago</div>
                        </div>
                        <button className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-sm text-white rounded transition-colors">Read</button>
                      </li>
                      <li className="flex items-start gap-3 p-5 text-neutral-200 text-base">
                        <div className="flex-1">
                          <div className="font-semibold">Research Report</div>
                          <div className="text-sm text-neutral-400">New research report on TSLA is available</div>
                          <div className="text-xs text-neutral-500 mt-1">10 min ago</div>
                        </div>
                        <button className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-sm text-white rounded transition-colors">Read</button>
                      </li>
                      <li className="flex items-start gap-3 p-5 text-neutral-200 text-base">
                        <div className="flex-1">
                          <div className="font-semibold">Portfolio Rebalanced</div>
                          <div className="text-sm text-neutral-400">Your portfolio was rebalanced successfully</div>
                          <div className="text-xs text-neutral-500 mt-1">30 min ago</div>
                        </div>
                        <button className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-sm text-white rounded transition-colors">Read</button>
                      </li>
                      <li className="flex items-start gap-3 p-5 text-neutral-200 text-base">
                        <div className="flex-1">
                          <div className="font-semibold">System Maintenance</div>
                          <div className="text-sm text-neutral-400">Scheduled for 2am - 4am UTC tonight</div>
                          <div className="text-xs text-neutral-500 mt-1">1 hr ago</div>
                        </div>
                        <button className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-sm text-white rounded transition-colors">Read</button>
                      </li>
                      <li className="flex items-start gap-3 p-5 text-neutral-200 text-base">
                        <div className="flex-1">
                          <div className="font-semibold">Margin Call</div>
                          <div className="text-sm text-neutral-400">Your account margin is below the required level</div>
                          <div className="text-xs text-neutral-500 mt-1">2 hr ago</div>
                        </div>
                        <button className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-sm text-white rounded transition-colors">Read</button>
                      </li>
                      <li className="flex items-start gap-3 p-5 text-neutral-200 text-base">
                        <div className="flex-1">
                          <div className="font-semibold">Dividend Received</div>
                          <div className="text-sm text-neutral-400">You received a dividend from MSFT</div>
                          <div className="text-xs text-neutral-500 mt-1">3 hr ago</div>
                        </div>
                        <button className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-sm text-white rounded transition-colors">Read</button>
                      </li>
                    </ul>
                    )}
                  </div>
                )}
              </div>
              
              {/* Theme Toggle */}
              <div className="mt-1.5">
                <ThemeToggle />
              </div>
              
              {/* Profile Image with Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="w-8 h-8 rounded-full overflow-hidden border-2 border-neutral-700 hover:border-neutral-500 transition-colors focus:outline-none focus:border-white"
                >
                  <Image 
                    src={user?.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"}
                    alt="Profile" 
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </button>

                {/* Profile Dropdown */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-neutral-800 rounded-lg shadow-xl border border-neutral-600 py-2 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-neutral-600">
                      <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                      <p className="text-xs text-neutral-400 truncate">{user?.email}</p>
                      <p className="text-xs text-neutral-400">{user?.role || 'Platform User'}</p>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center w-full px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors duration-200"
                      >
                        <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile Settings
                      </button>
                      
                      <button
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center w-full px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors duration-200"
                      >
                        <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Preferences
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-neutral-600 py-1">
                      <button
                        onClick={logout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors duration-200"
                      >
                        <svg className="h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

        </div>
      </div>

        {/* Templates Dropdown Menu */}
        {templatesDropdownOpen && (
          <div data-menu className="absolute top-11 left-15 mt-1 w-80 bg-neutral-900 border border-neutral-700 shadow-lg z-50">
            <div className="p-3">
              <div className="text-xs text-neutral-500 mb-3">Select Template</div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {savedTemplates.map((template) => (
                  <button
                    key={template.id}
                    data-templateid={template.id}
                    onClick={() => {
                      setSelectedLayout(template.layout as LayoutType);
                      setTemplatesDropdownOpen(false);
                    }}
                    className="w-full text-left p-2 border border-neutral-600 hover:border-neutral-500 hover:bg-neutral-800/50 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-neutral-300 font-medium text-xs">{template.name}</h3>
                        <p className="text-neutral-400 text-xs mt-1">{template.description}</p>
                        <span className="inline-block mt-2 px-2 py-0.5 bg-neutral-700 text-neutral-300 text-xs">
                          {template.layout}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

                {/* Layouts Dropdown Menu */}
        {isMenuOpen && (
          <div data-menu className="absolute top-16 left-8 mt-1 w-[500px] bg-neutral-900 border border-neutral-700 shadow-lg z-50">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-neutral-500">Select Layout</div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="text-neutral-400 hover:text-white transition-colors p-1 hover:bg-neutral-700"
                  title="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
                              {/* All Layouts in Rows */}
                <div className="space-y-2">
                  {/* Row 1: Single */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-xs text-neutral-400 w-12 font-medium">No Grid</div>
                    <button
                      onClick={() => {
                        setSelectedLayout('no-grid');
                        setIsMenuOpen(false);
                      }}
                      className={`flex items-center gap-2 p-3 border-2 transition-all hover:scale-105 ${
                        selectedLayout === 'no-grid'
                          ? 'border-neutral-400 bg-neutral-800'
                          : 'border-neutral-600 hover:border-neutral-400'
                      }`}
                      title="No Grid (free floating space)"
                    >
                      <svg width="48" height="28" viewBox="0 0 48 28" fill="none">
                        <rect x="2" y="6" width="44" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      <span className="text-xs text-neutral-500 ml-2">(free floating space)</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-neutral-400 w-12 font-medium">1 Grid</div>
                  <div className="flex gap-2">
                    <button
                      key={layouts[0].id}
                      onClick={() => {
                        setSelectedLayout(layouts[0].id);
                        setIsMenuOpen(false);
                      }}
                      className={`p-3 border-2 transition-all hover:scale-105 ${
                        selectedLayout === layouts[0].id
                          ? 'border-neutral-400 bg-neutral-800'
                          : 'border-neutral-600 hover:border-neutral-400'
                      }`}
                      title={layouts[0].name}
                    >
                      <div className="text-neutral-300">
                        {layouts[0].icon}
                      </div>
                    </button>
                  </div>
                </div>
                
                {/* Row 2: Two Grid */}
                <div className="flex items-center gap-3">
                  <div className="text-xs text-neutral-400 w-12 font-medium">2 Grid</div>
                  <div className="flex gap-2">
                    {layouts.slice(1, 3).map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => {
                          setSelectedLayout(layout.id);
                          setIsMenuOpen(false);
                        }}
                        className={`p-3 border-2 transition-all hover:scale-105 ${
                          selectedLayout === layout.id
                            ? 'border-neutral-400 bg-neutral-800'
                            : 'border-neutral-600 hover:border-neutral-400'
                        }`}
                        title={layout.name}
                      >
                        <div className="text-neutral-300">
                          {layout.icon}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 3: Three Grid (all 6 layouts) */}
                <div className="flex items-center gap-3">
                  <div className="text-xs text-neutral-400 w-12 font-medium">3 Grid</div>
                  <div className="flex gap-2">
                    {layouts.slice(3, 9).map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => {
                          setSelectedLayout(layout.id);
                          setIsMenuOpen(false);
                        }}
                        className={`p-3 border-2 transition-all hover:scale-105 ${
                          selectedLayout === layout.id
                            ? 'border-neutral-400 bg-neutral-800'
                            : 'border-neutral-600 hover:border-neutral-400'
                        }`}
                        title={layout.name}
                      >
                        <div className="text-neutral-300">
                          {layout.icon}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 4: Four Grid (all 3 layouts) */}
                <div className="flex items-center gap-3">
                  <div className="text-xs text-neutral-400 w-12 font-medium">4 Grid</div>
                  <div className="flex gap-2">
                    {layouts.slice(9, 12).map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => {
                          setSelectedLayout(layout.id);
                          setIsMenuOpen(false);
                        }}
                        className={`p-3 border-2 transition-all hover:scale-105 ${
                          selectedLayout === layout.id
                            ? 'border-neutral-500 bg-neutral-800'
                            : 'border-neutral-600 hover:border-neutral-400'
                        }`}
                        title={layout.name}
                      >
                        <div className="text-neutral-400">
                          {layout.icon}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 5: Five Grid (all 3 layouts) */}
                <div className="flex items-center gap-3">
                  <div className="text-xs text-neutral-400 w-12 font-medium">5 Grid</div>
                  <div className="flex gap-2">
                    {layouts.slice(12).map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => {
                          setSelectedLayout(layout.id);
                          setIsMenuOpen(false);
                        }}
                        className={`p-3 border-2 transition-all hover:scale-105 ${
                          selectedLayout === layout.id
                            ? 'border-neutral-500 bg-neutral-800'
                            : 'border-neutral-600 hover:border-neutral-400'
                        }`}
                        title={layout.name}
                      >
                        <div className="text-neutral-400">
                          {layout.icon}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Save Layout Button */}
              <div className="border-t border-neutral-700 pt-3 mt-3">
                <button className="w-full px-3 py-2 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 text-white transition-all duration-200 font-medium text-sm">
                  Save current layout to templates
                </button>
              </div>
              
              {/* Clear All Widgets Button */}
              <div className="border-t border-neutral-700 pt-3 mt-3">
                <button 
                  onClick={() => {
                    showConfirmation(
                      'Clear All Widgets',
                      'Are you sure you want to clear all widgets? This action cannot be undone.',
                      () => {
                        setWidgets({});
                        setRecentWidgets([]);
                        clearWidgetState();
                        localStorage.removeItem('pmt_floating_widgets');
                      }
                    );
                  }}
                  className="w-full px-3 py-2 bg-red-700 hover:bg-red-600 border border-red-600 text-white transition-all duration-200 font-medium text-sm"
                >
                  Clear All Widgets
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Widgets Dropdown Menu */}
        {isWidgetsMenuOpen && (
          <div data-menu className="absolute top-20 left-8 mt-1 w-[500px] max-h-[calc(100vh-120px)] bg-black border border-neutral-700 shadow-lg z-50 flex flex-col">
            <div className="p-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-neutral-300 font-semibold">Widgets</div>
                <button
                  onClick={() => setIsWidgetsMenuOpen(false)}
                  className="text-neutral-400 hover:text-white transition-colors p-1 hover:bg-neutral-700 rounded"
                  title="Close"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Quick add: Tabbed Widget */}
              {!isSectionInsideTabbedWidget(selectedSection || '') && !isFreeFloatingLayout && (
                <div className="mb-4">
                  <button
                    onClick={() => {
                      const widget = { id: 'tabbed-widget', name: 'Tabbed Widget', description: 'Tabbed container' } as Widget;
                      if (isFreeFloatingLayout) {
                        if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).addWidgetToCanvas) {
                          ((window as unknown as Record<string, unknown>).addWidgetToCanvas as (widget: Widget) => void)(widget);
                        }
                        setRecentWidgets(prev => {
                          const filtered = prev.filter(w => w.id !== widget.id);
                          return [widget, ...filtered].slice(0, 6);
                        });
                        setIsWidgetsMenuOpen(false);
                      } else {
                        setSelectedWidgetForConfig(widget);
                        setTargetSectionForWidget('');
                        setIsConfigModalOpen(true);
                        setIsWidgetsMenuOpen(false);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-medium rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    {t('Dashboard.AddTabbedWidget')}
                  </button>
                </div>
              )}
              
              {/* Widget Categories */}
              <div className="border-b border-neutral-700 pb-4 mb-6">
                <div className="text-sm text-neutral-300 font-bold mb-3">{t('Categories.Categories')}</div>
                <div className="flex gap-2 flex-wrap">
                  <button className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-white text-xs transition-colors rounded">
                    {t('Categories.Charts')}
                  </button>
                  <button className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-white text-xs transition-colors rounded">
                    {t('Categories.Data')}
                  </button>
                  <button className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-white text-xs transition-colors rounded">
                    {t('Categories.Analytics')}
                  </button>
                  <button className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-white text-xs transition-colors rounded">
                    {t('Categories.News')}
                  </button>
                </div>
              </div>
              
              {/* Analytics Category */}
              <div className="mb-6">
                <div className="text-sm text-neutral-300 font-bold mb-3">{t('Categories.Analytics')}</div>
                <div className="grid grid-cols-4 gap-3">
                  {widgetsForDisplay.slice(0, 5).map((widget) => (
                    <button
                      key={widget.id}
                      draggable
                      onMouseDown={(e) => {
                        // Prevent click-outside from triggering when starting drag
                        e.stopPropagation();
                      }}
                      onDragStart={(e) => {
                        handleDragStart(e, widget);
                      }}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (isFreeFloatingLayout) {
                          // Add directly to the free-floating canvas
                          if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).addWidgetToCanvas) {
                            ((window as unknown as Record<string, unknown>).addWidgetToCanvas as (widget: Widget) => void)(widget);
                          }
                          // Add to recent widgets
                          if (widget.id !== 'tabbed-widget') {
                            setRecentWidgets(prev => {
                              const filtered = prev.filter(w => w.id !== widget.id);
                              return [widget, ...filtered].slice(0, 6);
                            });
                          }
                          setIsWidgetsMenuOpen(false);
                        } else {
                          setSelectedWidgetForConfig(widget);
                          setTargetSectionForWidget(''); // No specific target, user will need to select
                          setIsConfigModalOpen(true);
                          setIsWidgetsMenuOpen(false);
                        }
                      }}
                      className="flex flex-col items-center p-3 hover:bg-neutral-700/60 rounded-lg transition-all focus:outline-none cursor-grab active:cursor-grabbing"
                      title={`${widget.description} - Drag to add to grid or click to select`}
                    >
                      {widgetIcons[widget.id]}
                      <span className="text-xs text-neutral-400 text-center mt-1">{t(getWidgetTranslationKey(widget.id))}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Market Data Category */}
              <div className={recentWidgetsForDisplay.length > 0 ? "mb-6" : ""}>
                <div className="text-sm text-neutral-300 font-bold mb-3">{t('Categories.MarketData')}</div>
                <div className="grid grid-cols-4 gap-3">
                  {widgetsForDisplay.slice(5).map((widget) => (
                    <button
                      key={widget.id}
                      draggable
                      onMouseDown={(e) => {
                        // Prevent click-outside from triggering when starting drag
                        e.stopPropagation();
                      }}
                      onDragStart={(e) => {
                        handleDragStart(e, widget);
                      }}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (isFreeFloatingLayout) {
                          // Add directly to the free-floating canvas
                          if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).addWidgetToCanvas) {
                            ((window as unknown as Record<string, unknown>).addWidgetToCanvas as (widget: Widget) => void)(widget);
                          }
                          // Add to recent widgets
                          if (widget.id !== 'tabbed-widget') {
                            setRecentWidgets(prev => {
                              const filtered = prev.filter(w => w.id !== widget.id);
                              return [widget, ...filtered].slice(0, 6);
                            });
                          }
                          setIsWidgetsMenuOpen(false);
                        } else {
                          setSelectedWidgetForConfig(widget);
                          setTargetSectionForWidget(''); // No specific target, user will need to select
                          setIsConfigModalOpen(true);
                          setIsWidgetsMenuOpen(false);
                        }
                      }}
                      className="flex flex-col items-center p-3 hover:bg-neutral-700/60 rounded-lg transition-all focus:outline-none cursor-grab active:cursor-grabbing"
                      title={`${widget.description} - Drag to add to grid or click to select`}
                    >
                      {widgetIcons[widget.id]}
                      <span className="text-xs text-neutral-400 text-center mt-1">{t(getWidgetTranslationKey(widget.id))}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Recent Widgets */}
              {recentWidgetsForDisplay.length > 0 && (
                <div className="border-t border-neutral-700 pt-4">
                  <div className="text-sm text-neutral-300 font-bold mb-3">Recent Widgets</div>
                  <div className="grid grid-cols-4 gap-3">
                    {recentWidgetsForDisplay.map((widget) => (
                      <button
                        key={`recent-${widget.id}`}
                        draggable
                        onMouseDown={(e) => {
                          // Prevent click-outside from triggering when starting drag
                          e.stopPropagation();
                        }}
                        onDragStart={(e) => {
                          handleDragStart(e, widget);
                        }}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          if (selectedLayout === 'no-grid') {
                            // Add directly to the free-floating canvas
                            if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).addWidgetToCanvas) {
                              ((window as unknown as Record<string, unknown>).addWidgetToCanvas as (widget: Widget) => void)(widget);
                            }
                            // Add to recent widgets
                            setRecentWidgets(prev => {
                              const filtered = prev.filter(w => w.id !== widget.id);
                              return [widget, ...filtered].slice(0, 6);
                            });
                            setIsWidgetsMenuOpen(false);
                          } else {
                            setSelectedWidgetForConfig(widget);
                            setTargetSectionForWidget(''); // No specific target, user will need to select
                            setIsConfigModalOpen(true);
                            setIsWidgetsMenuOpen(false);
                          }
                        }}
                        className="flex flex-col items-center p-3 hover:bg-neutral-700/60 rounded-lg transition-all focus:outline-none cursor-grab active:cursor-grabbing"
                        title={`${widget.description} - Recently used - Drag to add to grid or click to select`}
                      >
                        {widgetIcons[widget.id]}
                        <span className="text-xs text-neutral-400 text-center mt-1">{widget.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div 
          className="h-[calc(100vh-60px)] overflow-hidden"
          onClick={(e) => {
            // Close menus when clicking on any empty space in the content area
            const target = e.target as HTMLElement;
            
            // Don't close if clicking on interactive elements
            if (target.closest('button') || 
                target.closest('input') || 
                target.closest('select') || 
                target.closest('textarea') ||
                target.closest('[data-menu]') ||
                target.closest('[data-modal]') ||
                target.closest('[data-sidebar]')) {
              return;
            }
            
            closeAllMenus();
          }}
        >
          {renderLayout()}
        </div>
      </div>

      {/* Click outside to close all menus and modals */}
      {(isMenuOpen || isWidgetsMenuOpen || isSaveModalOpen || templatesDropdownOpen || isConfigModalOpen || isConfirmModalOpen || activeSidePanel || notifOpen) && !isDragging && (
        <div
          className="fixed inset-0 z-30"
          onClick={closeAllMenus}
        />
      )}

            {/* Widget Selection Modal */}
      <WidgetModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSelectWidget={handleSelectWidget} 
        onAddWidgetDirectly={(widget) => {
          if (selectedSection) {
            setWidgets(prev => ({
              ...prev,
              [selectedSection]: widget
            }));
            setModalOpen(false);
            setIsWidgetsMenuOpen(false);
          }
        }}
        recentWidgets={recentWidgetsForDisplay}
        isFreeFloatingLayout={isFreeFloatingLayout}
        isInsideTabbedWidget={selectedSection ? isSectionInsideTabbedWidget(selectedSection) : false}
      />

      {/* Tabbed Widget: Layout Picker */}
      <TabbedLayoutPicker />

      {/* Templates Modal */}
      {templatesModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setTemplatesModalOpen(false);
            setSelectedTemplate(null);
          }}
        >
          <div 
            data-modal
            className="bg-neutral-900 border border-neutral-700 w-[500px] max-h-[600px] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-700">
              <h2 className="text-lg font-semibold text-neutral-300">Templates</h2>
              <button
                onClick={() => {
                  setTemplatesModalOpen(false);
                  setSelectedTemplate(null);
                }}
                className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-neutral-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Templates List */}
            <div className="flex-1 overflow-y-auto p-4 max-h-[400px]">
              <div className="space-y-2">
                {savedTemplates.map((template) => (
                  <button
                    key={template.id}
                    data-templateid={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left p-3 border transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-neutral-400 bg-neutral-800'
                        : 'border-neutral-600 hover:border-neutral-500 hover:bg-neutral-800/50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-neutral-300 font-medium text-base">{template.name}</h3>
                        <p className="text-neutral-400 text-sm mt-2">{template.description}</p>
                        <span className="inline-block mt-3 px-3 py-1 bg-neutral-700 text-neutral-300 text-xs">
                          {template.layout}
                        </span>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <div className="text-neutral-300 ml-3">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 p-4 border-t border-neutral-700">
              <button
                onClick={() => {
                  setTemplatesModalOpen(false);
                  setSelectedTemplate(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedTemplate) {
                    // Here you would apply the selected template
                    setSelectedLayout(selectedTemplate.layout as LayoutType);
                    setTemplatesModalOpen(false);
                    setSelectedTemplate(null);
                  }
                }}
                disabled={!selectedTemplate}
                className={`flex-1 px-4 py-2 transition-colors font-medium ${
                  selectedTemplate
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
                }`}
              >
                Select
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Widget Configuration Modal */}
      {isConfigModalOpen && selectedWidgetForConfig && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => {
            setIsConfigModalOpen(false);
            setSelectedWidgetForConfig(null);
            setTargetSectionForWidget('');
          }}
        >
          <div 
            data-modal
            className="bg-neutral-800 border border-neutral-700 rounded-xl w-[336px] max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-700/70">
              <h2 className="text-[14px] font-medium text-neutral-100">{t('Dashboard.AddWidget')}</h2>
              <button
                onClick={() => {
                  setIsConfigModalOpen(false);
                  setSelectedWidgetForConfig(null);
                  setTargetSectionForWidget('');
                }}
                className="text-neutral-500 hover:text-neutral-300 transition-colors p-1 rounded-md hover:bg-neutral-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 px-5 py-4 overflow-y-auto bg-neutral-900/50">
              {/* Search */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[12px] font-medium text-neutral-400">Search Widgets</label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for a widget..."
                    className="w-full h-8 px-3 pr-8 bg-neutral-800/60 border border-neutral-600/60 rounded-lg text-[12px] text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-all"
                  />
                  <svg className="absolute right-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Chart Type Selection */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  <label className="text-[12px] font-medium text-neutral-400">Chart Type</label>
                </div>
                
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    onClick={() => setWidgetConfig(prev => ({ ...prev, chartType: 'Technical Charts' }))}
                    className={`group p-2.5 rounded-lg border transition-all ${
                      widgetConfig.chartType === 'Technical Charts'
                        ? 'border-neutral-500/70 bg-neutral-500/15'
                        : 'border-neutral-600/50 hover:border-neutral-500/70 hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="w-full h-10 flex items-center justify-center mb-1.5">
                      <svg className={`w-5 h-5 ${widgetConfig.chartType === 'Technical Charts' ? 'text-neutral-300' : 'text-green-400/80'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className={`text-[11px] font-medium ${
                      widgetConfig.chartType === 'Technical Charts' ? 'text-neutral-300' : 'text-neutral-400'
                    }`}>Technical</span>
                  </button>
                  
                  <button
                    onClick={() => setWidgetConfig(prev => ({ ...prev, chartType: 'Overview Charts' }))}
                    className={`group p-2.5 rounded-lg border transition-all ${
                      widgetConfig.chartType === 'Overview Charts'
                        ? 'border-neutral-500/70 bg-neutral-500/15'
                        : 'border-neutral-600/50 hover:border-neutral-500/70 hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="w-full h-10 flex items-center justify-center mb-1.5">
                      <svg className={`w-5 h-5 ${widgetConfig.chartType === 'Overview Charts' ? 'text-neutral-300' : 'text-yellow-400/80'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className={`text-[11px] font-medium ${
                      widgetConfig.chartType === 'Overview Charts' ? 'text-neutral-300' : 'text-neutral-400'
                    }`}>Overview</span>
                  </button>
                  
                  <button
                    onClick={() => setWidgetConfig(prev => ({ ...prev, chartType: 'Mini Charts' }))}
                    className={`group p-2.5 rounded-lg border transition-all ${
                      widgetConfig.chartType === 'Mini Charts'
                        ? 'border-neutral-500/70 bg-neutral-500/15'
                        : 'border-neutral-600/50 hover:border-neutral-500/70 hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="w-full h-10 flex items-center justify-center mb-1.5">
                      <svg className={`w-5 h-5 ${widgetConfig.chartType === 'Mini Charts' ? 'text-neutral-300' : 'text-neutral-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <span className={`text-[11px] font-medium ${
                      widgetConfig.chartType === 'Mini Charts' ? 'text-neutral-300' : 'text-neutral-400'
                    }`}>Mini</span>
                  </button>
                </div>
              </div>

              {/* Configuration Section */}
              <div className="border-t border-neutral-700/50 pt-4">
                <h4 className="text-[12px] font-medium text-neutral-400 mb-4">Configuration</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-neutral-500 min-w-[60px]">Market</label>
                    <div className="relative flex-1 ml-4">
                      <select
                        value={widgetConfig.module}
                        onChange={(e) => setWidgetConfig(prev => ({ ...prev, module: e.target.value }))}
                        className="w-full h-7 px-2.5 pr-6 bg-neutral-800/60 border border-neutral-600/60 rounded-md text-[11px] text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-all appearance-none"
                      >
                        <option value="Forex">Forex</option>
                        <option value="Stocks">Stocks</option>
                        <option value="Crypto">Crypto</option>
                        <option value="Commodities">Commodities</option>
                      </select>
                      <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-neutral-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-neutral-500 min-w-[60px]">Symbol</label>
                    <div className="relative flex-1 ml-4">
                      <select
                        value={widgetConfig.symbol}
                        onChange={(e) => setWidgetConfig(prev => ({ ...prev, symbol: e.target.value }))}
                        className="w-full h-7 px-2.5 pr-6 bg-neutral-800/60 border border-neutral-600/60 rounded-md text-[11px] text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-all appearance-none"
                      >
                        <option value="Forex - EURUSD">EUR/USD</option>
                        <option value="Forex - GBPUSD">GBP/USD</option>
                        <option value="Forex - USDJPY">USD/JPY</option>
                        <option value="Stocks - AAPL">Apple Inc. (AAPL)</option>
                        <option value="Stocks - TSLA">Tesla Inc. (TSLA)</option>
                        <option value="Crypto - BTCUSD">Bitcoin (BTC/USD)</option>
                      </select>
                      <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-neutral-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-neutral-500 min-w-[60px]">Timeframe</label>
                    <div className="relative flex-1 ml-4">
                      <select
                        value={widgetConfig.interval}
                        onChange={(e) => setWidgetConfig(prev => ({ ...prev, interval: e.target.value }))}
                        className="w-full h-7 px-2.5 pr-6 bg-neutral-800/60 border border-neutral-600/60 rounded-md text-[11px] text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-all appearance-none"
                      >
                        <option value="1 Minute">1m</option>
                        <option value="5 Minutes">5m</option>
                        <option value="15 Minutes">15m</option>
                        <option value="1 Hour">1h</option>
                        <option value="Daily">1D</option>
                      </select>
                      <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-neutral-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-neutral-700/70">
              <button
                onClick={() => {
                  setIsConfigModalOpen(false);
                  setSelectedWidgetForConfig(null);
                  setTargetSectionForWidget('');
                }}
                className="px-3 py-1.5 h-7 text-[11px] font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedWidgetForConfig) {
                    let finalTargetSection = targetSectionForWidget;
                    
                    // If no specific target section, need to prompt user or use default logic
                    if (!finalTargetSection) {
                      // Find first empty section or use single as fallback
                      const layouts = ['single', 'two-vertical-0', 'two-vertical-1', 'three-vertical-0', 'three-vertical-1', 'three-vertical-2'];
                      finalTargetSection = layouts.find(section => !widgets[section]) || 'single';
                    }
                    
                    // Add widget to grid
                    setWidgets(prev => ({ ...prev, [finalTargetSection]: selectedWidgetForConfig }));
                    
                    // Add to recent widgets
                    setRecentWidgets(prev => {
                      const filtered = prev.filter(w => w.id !== selectedWidgetForConfig.id);
                      return [selectedWidgetForConfig, ...filtered].slice(0, 6);
                    });
                    
                    // Close modal and reset state
                    setIsConfigModalOpen(false);
                    setSelectedWidgetForConfig(null);
                    setTargetSectionForWidget('');
                  }
                }}
                className="px-3 py-1.5 h-7 text-[11px] font-medium text-white bg-neutral-600 hover:bg-neutral-700 rounded-md transition-colors"
              >
                Add Widget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {isSaveModalOpen && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div data-modal className="bg-black border border-neutral-700 w-[350px] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3 border-b border-neutral-700">
              <h3 className="text-sm font-semibold text-neutral-300">Save current template as?</h3>
              <button
                onClick={() => {
                  setIsSaveModalOpen(false);
                  setSaveTemplateName('');
                }}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-3">
              <input
                type="text"
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
                placeholder="Enter template name..."
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 text-sm"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveTemplate();
                  }
                }}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 p-3 border-t border-neutral-700">
              <button
                onClick={() => {
                  setIsSaveModalOpen(false);
                  setSaveTemplateName('');
                }}
                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!saveTemplateName.trim()}
                className={`flex-1 px-3 py-2 transition-colors text-sm ${
                  saveTemplateName.trim()
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {isConfirmModalOpen && confirmModalData && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div data-modal className="bg-black border border-neutral-700 w-[400px] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-700">
              <h3 className="text-lg font-semibold text-white">{confirmModalData.title}</h3>
              <button
                onClick={handleConfirmClose}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              <p className="text-neutral-300 text-sm leading-relaxed">
                {confirmModalData.message}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 p-4 border-t border-neutral-700">
              <button
                onClick={handleConfirmClose}
                className="flex-1 px-4 py-2 bg-neutral-600 hover:bg-neutral-700 text-white transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white transition-colors font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 