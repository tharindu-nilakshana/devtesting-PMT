/* eslint-disable @next/next/no-assign-module-variable */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef } from "react";
import { TopNav } from "./TopNav";
import { TemplateTabs } from "./TemplateTabs";
import { WidgetPanel } from "./WidgetPanel";
import { WatchlistPanel } from "./WatchlistPanel";
import { AlertsPanel } from "./AlertsPanel";
import { NotificationsPanel } from "./NotificationsPanel";
import { EmptyGridCell } from "./EmptyGridCell";
import { ResizableGrid } from "./ResizableGrid";
import { LayoutSelector, GridLayout } from "./LayoutSelector";
import { availableWidgets } from "@/constants/widgets";
import { WidgetComponents } from "@/components/widgets";
import { LockedWidgetOverlay } from "@/components/widgets/LockedWidgetOverlay";
import { WidgetHeader } from "./WidgetHeader";
import { WidgetSettingsSlideIn, WidgetSettings, REALTIME_NEWS_DEFAULT_SECTIONS, REALTIME_NEWS_DEFAULT_PRIORITIES } from "./WidgetSettingsSlideIn";
import { SaveTemplateDialog } from "./SaveTemplateDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import FreeFloatingCanvas from "../../app/components/FreeFloatingCanvas";
import { ProfilePanel } from "../auth/ProfilePanel";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/hooks/usePreferences";
import { useTemplates } from "@/hooks/useTemplates";
import { templateApi, CreateTemplateRequest, UserTemplate } from "@/lib/templateApi";
import { captureWidgetCoordinates, getLayoutType, getDisplayOrder, type CapturedWidget } from "@/utils/coordinateCapture";
import { setTheme as setHtmlTheme } from "@/utils/themeStyles";
import { DynamicGridRenderer } from "@/components/dynamic/DynamicGridRenderer";
import { calculateDynamicGridSizes, shouldUseDynamicLayout } from '@/utils/dynamicCoordinateCalculator';
import { getLayoutConfigByName } from "@/config/layouts";
import { convertCoordinatesToAreas, convertAreasToCoordinates } from "@/utils/dynamicLayout";
import { mapLayoutToApiCode, calculateGridPositions } from '@/utils/gridPositionCalculator';
import { insertMainGridPosition, getMainGridPositionByTemplate } from '@/lib/gridPositionApi';
import { convertGridPositionToCoordinates } from '@/utils/gridPositionParser';
import { templateGridSizesStorage } from '@/lib/templateGridSizes';
import { toast as sonnerToast } from "sonner";
import React from "react";
import { OnboardingTour } from "@/components/ui/OnboardingTour";
import { onboardingSteps } from "@/constants/onboardingSteps";
import { isDetailsTemplate } from "@/utils/templateImage";
import { shouldShowSettingsIcon } from "@/utils/widgetSettings";

// GridLayout is now imported from LayoutSelector

interface Tab {
  id: string;
  name: string;
  layout: GridLayout;
  saved?: boolean;
  icon?: string;
}

interface WidgetSlot {
  position: string;
  widget: string;
  settings?: Record<string, unknown>;
}

interface BloombergDashboardProps {
  ssrWidgetData?: Record<string, unknown>;
}

export default function BloombergDashboard({ ssrWidgetData }: BloombergDashboardProps) {
  const { logout, isAuthenticated, user } = useAuth();
  const { preferences, updatePreference } = usePreferences(user?.id);
  const [theme, setTheme] = useState<"dark" | "light">(preferences.darkMode ? "dark" : "light");
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);

  // Sync theme state with preferences
  useEffect(() => {
    setTheme(preferences.darkMode ? "dark" : "light");
  }, [preferences.darkMode]);

  // Use the new template management hook
  const {
    templates,
    activeTemplateId,
    isLoading: templatesLoading,
    error: templatesError,
    setActiveTemplateId,
    createTemplate,
    saveTemplateToApi,
    renameTemplate,
    updateTemplate,
    hideTemplate,
    deleteTemplate,
    addWidgetToTemplate,
    updateWidgetFields,
    removeWidgetFromTemplate,
    removeWidgetByID,
    reorderTemplates,
    clearError,
    refreshTemplates,
    refreshTemplateWidgets,
  } = useTemplates();

  // Keep browser/tab title in sync with active template
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const activeTemplateName = templates.find(t => t.id === activeTemplateId)?.name;
    document.title = activeTemplateName ? `PMT | ${activeTemplateName}` : 'PMT';
  }, [activeTemplateId, templates]);
  const [isWidgetPanelOpen, setIsWidgetPanelOpen] = useState(false);
  const [isWatchlistPanelOpen, setIsWatchlistPanelOpen] = useState(false);
  const [isAlertsPanelOpen, setIsAlertsPanelOpen] = useState(false);
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const [isLayoutSelectorOpen, setIsLayoutSelectorOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isCreateTemplateDialogOpen, setIsCreateTemplateDialogOpen] = useState(false);
  const [pendingLayout, setPendingLayout] = useState<GridLayout | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [tabToDelete, setTabToDelete] = useState<string | null>(null);
  const [targetPosition, setTargetPosition] = useState<string | null>(null);
  const [recentWidgets, setRecentWidgets] = useState<typeof availableWidgets>([]);
  const [tabCounter, setTabCounter] = useState(13);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsWidgetPosition, setSettingsWidgetPosition] = useState<string>("");
  const [settingsWidgetType, setSettingsWidgetType] = useState<string>("");
  const [settingsWidgetInstanceId, setSettingsWidgetInstanceId] = useState<string>("");
  const [widgetSettings, setWidgetSettings] = useState<Record<string, WidgetSettings>>({});
  const [selectedWidgetForFloating, setSelectedWidgetForFloating] = useState<string | null>(null);

  // Drag and drop state
  const [draggedWidget, setDraggedWidget] = useState<typeof availableWidgets[0] | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Fullscreen widget state
  const [fullscreenWidget, setFullscreenWidget] = useState<{
    widgetId: string;
    position: string;
    tabId: string;
  } | null>(null);

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    isVisible: boolean;
  }>({
    message: '',
    isVisible: false
  });

  // Prevent duplicate saves - track if save is in progress
  const isSavingGridPositionsRef = useRef(false);
  const saveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedGridSizesRef = useRef<string | null>(null);


  // Apply theme to document (set html[data-theme])
  useEffect(() => {
    setHtmlTheme(theme);
  }, [theme]);

  // Clear selected widget for floating after it's been processed
  useEffect(() => {
    if (selectedWidgetForFloating) {
      // Clear it after a short delay to ensure the FreeFloatingCanvas has processed it
      const timer = setTimeout(() => {
        setSelectedWidgetForFloating(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedWidgetForFloating]);

  // Log template ID when it loads or changes
  useEffect(() => {
    if (activeTemplateId && !templatesLoading) {
      const templateIdNum = parseInt(activeTemplateId, 10);
      const displayId = !isNaN(templateIdNum) ? templateIdNum : activeTemplateId;
      // console.log(`[[[TEMPLATE ID: ${displayId}]]]`);
    }
  }, [activeTemplateId, templatesLoading]);

  // Track which templates we've already loaded grid positions for to prevent infinite loops
  const loadedGridPositionsRef = useRef<Set<string>>(new Set());
  const previousTemplateIdRef = useRef<string | null>(null);

  // Track template ID changes to migrate grid sizes when template is saved
  // Initialize as null - will be set when template is saved
  const previousTemplateIdForMigrationRef = useRef<string | null>(null);

  // Load grid positions from API when template changes or page reloads
  useEffect(() => {
    const loadGridPositions = async () => {
      // Only load if templates are loaded and we have an active template
      if (templatesLoading || !activeTemplateId) {
        return;
      }

      // When switching to a different template, don't clear the loaded set
      // The getMainGridPositionByTemplate function will check localStorage first
      // and only call API if needed
      previousTemplateIdRef.current = activeTemplateId;

      // Check if we've already loaded grid positions for this template in this session
      // This prevents redundant checks even to localStorage
      if (loadedGridPositionsRef.current.has(activeTemplateId)) {
        return;
      }

      // We intentionally don't include templates in dependencies to prevent infinite loops
      // Templates are accessed via closure and should be stable from useTemplates hook
      const activeTemplate = templates.find(t => t.id === activeTemplateId);

      if (!activeTemplate || !activeTemplate.saved) {
        return; // Only load for saved templates
      }

      // Check if template ID is numeric (saved template)
      const templateIdNum = parseInt(activeTemplateId, 10);
      if (isNaN(templateIdNum)) {
        return;
      }

      // Skip API call for newly created templates (no widgets = no grid positions)
      // If template has no widgets, it won't have grid positions either


      // Mark this template as being loaded to prevent duplicate calls
      loadedGridPositionsRef.current.add(activeTemplateId);

      try {

        const response = await getMainGridPositionByTemplate(templateIdNum);

        // console.log('📥 [GridPosition] Response:', {
        //   Status: response.Status,
        //   hasGridPosition: !!response.GridPosition,
        //   GridPosition: response.GridPosition ? {
        //     TemplateID: response.GridPosition.TemplateID,
        //     Top: response.GridPosition.Top?.substring(0, 50) + '...',
        //     Left: response.GridPosition.Left?.substring(0, 50) + '...',
        //     Width: response.GridPosition.Width?.substring(0, 50) + '...',
        //     Height: response.GridPosition.Height?.substring(0, 50) + '...'
        //   } : null
        // });

        if (response.Status === 'Success' && response.GridPosition) {
          // Validate that we have Width and Height strings
          if (!response.GridPosition.Width || !response.GridPosition.Height) {
            console.warn('⚠️ [GridPosition] Missing Width or Height in grid position:', response.GridPosition);
            return;
          }

          // console.log('🔍 [GridPosition] RAW API DATA for layout:', activeTemplate.layout, {
          //   templateId: activeTemplateId,
          //   Width: response.GridPosition.Width,
          //   Height: response.GridPosition.Height
          // });

          // Parse width percentages directly from API response
          const { parseWidthPercentages, parseHeightPercentages } = await import('@/utils/gridPositionParser');
          const widthPercentages = parseWidthPercentages(response.GridPosition.Width);
          const heightPercentages = parseHeightPercentages(response.GridPosition.Height);

          // console.log('📊 [GridPosition] Parsed percentages for layout:', activeTemplate.layout, {
          //   templateId: activeTemplateId,
          //   widthPercentages,
          //   heightPercentages,
          //   widthCount: widthPercentages.length,
          //   heightCount: heightPercentages.length
          // });

          // Get layout config to know all grid areas
          const layoutConfig = getLayoutConfigByName(activeTemplate.layout);
          if (!layoutConfig) {
            console.warn('⚠️ Could not find layout config for:', activeTemplate.layout);
            return;
          }

          const allGridAreas = layoutConfig.structure.areas.map(area => area.id);
          const expectedCellCount = layoutConfig.structure.areas.length;

          // Get container dimensions for coordinate calculation
          const containerWidth = window.innerWidth;
          const containerHeight = window.innerHeight - 50;

          // Convert grid position to coordinates for ALL grid areas
          const coordinates = convertGridPositionToCoordinates(
            response.GridPosition,
            activeTemplate.layout,
            containerWidth,
            containerHeight
          );

          // console.log('📍 [GridPosition] Calculated coordinates:', {
          //   coordinatesCount: coordinates.length,
          //   expectedCellCount,
          //   coordinates: coordinates.map((c, i) => ({ index: i, ...c }))
          // });

          // Update widget coordinates - ensure ALL widgets have coordinates even if they don't match
          const updatedWidgets = activeTemplate.widgets.map((widget) => {
            const areaIndex = allGridAreas.indexOf(widget.position);
            if (areaIndex >= 0 && coordinates[areaIndex]) {
              return {
                ...widget,
                settings: {
                  ...widget.settings,
                  coordinates: coordinates[areaIndex]
                }
              };
            }
            return widget;
          });

          // Store grid sizes in templateGridSizesStorage for immediate use
          const { templateGridSizesStorage } = await import('@/lib/templateGridSizes');

          // IMPORTANT: Check if localStorage already has more recent data for this template
          // If user has resized locally, don't overwrite with potentially stale database data
          const existingLocalData = templateGridSizesStorage.getTemplateGridSizes(activeTemplateId);
          if (existingLocalData && existingLocalData.updatedAt) {
            // console.log('⚠️ [GridPosition] localStorage has existing data, skipping database overwrite:', {
            //   localUpdatedAt: existingLocalData.updatedAt,
            //   localLayout: existingLocalData.layoutType,
            //   currentLayout: activeTemplate.layout
            // });
            // Don't overwrite - localStorage data is the source of truth for user resizing
            // Database data might be stale or in old format
            //console.log('⏭️ [GridPosition] Skipping database data to preserve user resized state');
            return;
          }

          // Determine which percentages to use based on layout orientation
          // Column-based layouts (split left/right): use Width percentages
          // Row-based layouts (split top/bottom): use Height percentages
          const isColumnLayout = activeTemplate.layout.includes('column') ||
            activeTemplate.layout.includes('vertical') ||
            activeTemplate.layout === '2-grid-vertical' ||
            activeTemplate.layout === 'two-vertical' ||
            activeTemplate.layout === '3-grid-columns' ||
            activeTemplate.layout === 'three-vertical' ||
            activeTemplate.layout === '4-grid-columns' ||
            activeTemplate.layout === 'four-vertical' ||
            activeTemplate.layout === '5-grid-columns' ||
            activeTemplate.layout === 'five-vertical' ||
            // Note: 6-grid-2x3, 6-grid-3x2, 6-grid-left-large have special handling above
            activeTemplate.layout === '7-grid-left' ||
            activeTemplate.layout === '7-grid-complex1' ||
            activeTemplate.layout === '7-grid-complex2' ||
            // Note: 7-grid-large has special handling above
            activeTemplate.layout === '8-grid-columns' ||
            activeTemplate.layout === '9-grid' ||
            activeTemplate.layout === '12-grid-3x4' ||
            activeTemplate.layout === '12-grid-4x3' ||
            activeTemplate.layout === '16-grid' ||
            activeTemplate.layout === '24-grid-columns' ||
            activeTemplate.layout === '24-grid-6x4' ||
            activeTemplate.layout === '28-grid-7x4' ||
            activeTemplate.layout === '32-grid-8x4';

          const isRowLayout = activeTemplate.layout.includes('row') ||
            activeTemplate.layout.includes('horizontal') ||
            activeTemplate.layout === '2-grid-horizontal' ||
            activeTemplate.layout === 'two-horizontal' ||
            activeTemplate.layout === '3-grid-rows' ||
            activeTemplate.layout === 'three-horizontal' ||
            activeTemplate.layout === '4-grid-rows' ||
            activeTemplate.layout === 'four-horizontal' ||
            activeTemplate.layout === '5-grid-rows' ||
            activeTemplate.layout === 'five-horizontal' ||
            activeTemplate.layout === '6-grid-rows' ||
            activeTemplate.layout === '8-grid-rows' ||
            activeTemplate.layout === '24-grid-rows' ||
            activeTemplate.layout === '24-grid-4x6' ||
            activeTemplate.layout === '28-grid-4x7' ||
            activeTemplate.layout === '32-grid-4x8';

          // Use width percentages for column layouts, height percentages for row layouts
          // Default to width percentages if layout type is unclear
          let percentagesToUse: number[];

          // Special handling for 4-grid (four quadrants) so we preserve both row heights and column widths.
          // The API returns Width for each quadrant (4 values) and Height for each quadrant (also 4 values).
          // Our internal representation expects: [top height, topLeft width, topRight width, bottomLeft width, bottomRight width, bottom height].
          if (activeTemplate.layout === '4-grid' || activeTemplate.layout === 'four-grid') {
            if (widthPercentages.length >= 4 && heightPercentages.length >= 4) {
              const topHeight = heightPercentages[0] || 50;
              // Prefer explicit bottom height from API if available, otherwise derive from top
              const bottomHeight = heightPercentages[2] || (100 - topHeight);

              percentagesToUse = [
                topHeight,
                widthPercentages[0],
                widthPercentages[1],
                widthPercentages[2],
                widthPercentages[3],
                bottomHeight
              ];
            } else {
              // Fallback to previous behaviour if we don't have enough data
              percentagesToUse = widthPercentages.length > 0 ? widthPercentages : heightPercentages;
            }
          } else if (activeTemplate.layout === '7-grid-large') {
            // 7-grid-large: Special handling for nested layout
            // Data format: [leftWidth, rightCell1Height, rightCell2Height, rightCell3Height, rightCell4Height, rightCell5Height, rightCell6Height]
            // The API returns:
            // - Width: [leftWidth, rightWidth, rightWidth, rightWidth, rightWidth, rightWidth, rightWidth] (7 values)
            // - Height: [leftHeight (full), rightCell1Height, rightCell2Height, rightCell3Height, rightCell4Height, rightCell5Height, rightCell6Height] (7 values)
            // We need to combine left width (from Width[0]) with right cell heights (from Height[1-6])
            if (widthPercentages.length >= 7 && heightPercentages.length >= 7) {
              const leftWidth = widthPercentages[0];
              // Use height percentages for right cells (indices 1-6) - these are the actual resized heights
              const rightCellHeights = heightPercentages.slice(1, 7);
              percentagesToUse = [leftWidth, ...rightCellHeights];
              console.log('📐 [7-grid-large] Loaded from API:', {
                leftWidth,
                rightCellHeights,
                fullPercentages: percentagesToUse
              });
            } else if (widthPercentages.length >= 7) {
              // Only width percentages available - use left width and default heights for right cells
              const leftWidth = widthPercentages[0];
              percentagesToUse = [leftWidth, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67];
              console.warn('⚠️ [7-grid-large] Only width percentages available, using defaults for right cell heights');
            } else {
              // Fallback to width percentages
              percentagesToUse = widthPercentages.length > 0 ? widthPercentages : heightPercentages;
            }
          } else if (activeTemplate.layout === '6-grid-2x3') {
            // 6-grid-2x3: 2 rows x 3 columns (3 top cells, 3 bottom cells)
            // Data format: [top height, topLeft width, topMiddle width, topRight width, bottomLeft width, bottomMiddle width, bottomRight width]
            // The API returns:
            // - Width: [topLeft width, topMiddle width, topRight width, bottomLeft width, bottomMiddle width, bottomRight width] (6 values)
            // - Height: [topHeight (for all 3 top cells), bottomHeight (for all 3 bottom cells)] but actually each cell has its own height
            // We need: [top height, col1 width (from topLeft), col2 width (from topMiddle), col3 width (from topRight), bottomLeft width, bottomMiddle width, bottomRight width]
            // Actually simpler: [top height (from height[0]), col1 width (from width[0]), col2 width (from width[1]), col3 width (from width[2]), col1 width bottom (from width[3]), col2 width bottom (from width[4]), col3 width bottom (from width[5])]
            if (widthPercentages.length >= 6 && heightPercentages.length >= 6) {
              // Extract top height from first cell's height (all 3 top cells have same height)
              const topHeight = heightPercentages[0] || 50;
              const bottomHeight = 100 - topHeight;
              // Extract column widths from width percentages
              // For simplicity, use top row widths for all (or average top and bottom)
              const topLeftWidth = widthPercentages[0] || 33.33;
              const topMiddleWidth = widthPercentages[1] || 33.33;
              const topRightWidth = widthPercentages[2] || 33.34;
              const bottomLeftWidth = widthPercentages[3] || 33.33;
              const bottomMiddleWidth = widthPercentages[4] || 33.33;
              const bottomRightWidth = widthPercentages[5] || 33.34;

              percentagesToUse = [
                topHeight,
                topLeftWidth,
                topMiddleWidth,
                topRightWidth,
                bottomLeftWidth,
                bottomMiddleWidth,
                bottomRightWidth
              ];
              console.log('📐 [6-grid-2x3] Loaded from API:', {
                topHeight,
                bottomHeight,
                topRowWidths: [topLeftWidth, topMiddleWidth, topRightWidth],
                bottomRowWidths: [bottomLeftWidth, bottomMiddleWidth, bottomRightWidth],
                fullPercentages: percentagesToUse
              });
            } else if (widthPercentages.length >= 6) {
              // Only width percentages available - use defaults for heights
              const topHeight = 50;
              const topLeftWidth = widthPercentages[0] || 33.33;
              const topMiddleWidth = widthPercentages[1] || 33.33;
              const topRightWidth = widthPercentages[2] || 33.34;
              const bottomLeftWidth = widthPercentages[3] || 33.33;
              const bottomMiddleWidth = widthPercentages[4] || 33.33;
              const bottomRightWidth = widthPercentages[5] || 33.34;
              percentagesToUse = [
                topHeight,
                topLeftWidth,
                topMiddleWidth,
                topRightWidth,
                bottomLeftWidth,
                bottomMiddleWidth,
                bottomRightWidth
              ];
              console.warn('⚠️ [6-grid-2x3] Only width percentages available, using default top height');
            } else {
              // Fallback
              percentagesToUse = widthPercentages.length > 0 ? widthPercentages : heightPercentages;
            }
          } else if (activeTemplate.layout === '6-grid-3x2') {
            // 6-grid-3x2: 3 columns x 2 rows (each column has 2 cells stacked)
            // Data format: [left width, leftTop height, leftBottom height, middle width, middleTop height, middleBottom height, rightTop height, rightBottom height]
            // The API returns:
            // - Width: [leftWidth (for both left cells), middleWidth (for both middle cells), rightWidth (for both right cells), ...] (6 values, but should be grouped)
            // - Height: [leftTop height, leftBottom height, middleTop height, middleBottom height, rightTop height, rightBottom height] (6 values)
            // We need to combine column widths with cell heights
            if (widthPercentages.length >= 6 && heightPercentages.length >= 6) {
              // Extract column widths (first occurrence of each column)
              const leftWidth = widthPercentages[0] || 33.33;
              const middleWidth = widthPercentages[2] || 33.33;
              const rightWidth = 100 - leftWidth - middleWidth;
              // Extract heights for each cell
              const leftTopHeight = heightPercentages[0] || 50;
              const leftBottomHeight = heightPercentages[1] || 50;
              const middleTopHeight = heightPercentages[2] || 50;
              const middleBottomHeight = heightPercentages[3] || 50;
              const rightTopHeight = heightPercentages[4] || 50;
              const rightBottomHeight = heightPercentages[5] || 50;

              percentagesToUse = [
                leftWidth,
                leftTopHeight,
                leftBottomHeight,
                middleWidth,
                middleTopHeight,
                middleBottomHeight,
                rightTopHeight,
                rightBottomHeight
              ];
              console.log('📐 [6-grid-3x2] Loaded from API:', {
                columnWidths: { left: leftWidth, middle: middleWidth, right: rightWidth },
                heights: {
                  left: [leftTopHeight, leftBottomHeight],
                  middle: [middleTopHeight, middleBottomHeight],
                  right: [rightTopHeight, rightBottomHeight]
                },
                fullPercentages: percentagesToUse
              });
            } else if (widthPercentages.length >= 3 && heightPercentages.length >= 6) {
              // Partial data - extract what we can
              const leftWidth = widthPercentages[0] || 33.33;
              const middleWidth = widthPercentages.length > 1 ? widthPercentages[1] : 33.33;
              const leftTopHeight = heightPercentages[0] || 50;
              const leftBottomHeight = heightPercentages[1] || 50;
              const middleTopHeight = heightPercentages[2] || 50;
              const middleBottomHeight = heightPercentages[3] || 50;
              const rightTopHeight = heightPercentages[4] || 50;
              const rightBottomHeight = heightPercentages[5] || 50;
              percentagesToUse = [
                leftWidth,
                leftTopHeight,
                leftBottomHeight,
                middleWidth,
                middleTopHeight,
                middleBottomHeight,
                rightTopHeight,
                rightBottomHeight
              ];
              console.warn('⚠️ [6-grid-3x2] Partial data available, using what we have');
            } else {
              // Fallback
              percentagesToUse = widthPercentages.length > 0 ? widthPercentages : heightPercentages;
            }
          } else if (activeTemplate.layout === '6-grid-left-large') {
            // 6-grid-left-large: 1 large left panel + 5 right panels stacked vertically
            // Data format: [left width, rightTop height, rightMiddle height, rightMiddle2 height, rightMiddle3 height, rightBottom height]
            // The API returns:
            // - Width: [leftWidth, rightWidth (repeated 5 times)] (6 values)
            // - Height: [leftHeight (full), rightTop height, rightMiddle height, rightMiddle2 height, rightMiddle3 height, rightBottom height] (6 values)
            // We need to combine left width (from Width[0]) with right cell heights (from Height[1-5])
            if (widthPercentages.length >= 6 && heightPercentages.length >= 6) {
              const leftWidth = widthPercentages[0];
              // Use height percentages for right cells (indices 1-5) - these are the actual resized heights
              const rightCellHeights = heightPercentages.slice(1, 6);
              percentagesToUse = [leftWidth, ...rightCellHeights];
              console.log('📐 [6-grid-left-large] Loaded from API:', {
                leftWidth,
                rightCellHeights,
                fullPercentages: percentagesToUse
              });
            } else if (widthPercentages.length >= 6) {
              // Only width percentages available - use left width and default heights for right cells
              const leftWidth = widthPercentages[0];
              percentagesToUse = [leftWidth, 20, 20, 20, 20, 20];
              console.warn('⚠️ [6-grid-left-large] Only width percentages available, using defaults for right cell heights');
            } else {
              // Fallback to width percentages
              percentagesToUse = widthPercentages.length > 0 ? widthPercentages : heightPercentages;
            }
          } else if (activeTemplate.layout === '8-grid-2x4') {
            // 8-grid-2x4: 2 columns x 4 rows (left column: area-1,3,5,7 / right column: area-2,4,6,8)
            // Data format: [left width, leftRow1 height, leftRow2 height, leftRow3 height, leftRow4 height, rightRow1 height, rightRow2 height, rightRow3 height, rightRow4 height]
            // The API returns:
            // - Width: [leftWidth (for all 4 left cells), rightWidth (for all 4 right cells), ...] (8 values)
            // - Height: [leftRow1, leftRow2, leftRow3, leftRow4, rightRow1, rightRow2, rightRow3, rightRow4] (8 values)
            // We need to combine left width with row heights for both columns
            if (widthPercentages.length >= 8 && heightPercentages.length >= 8) {
              const leftWidth = widthPercentages[0];
              // Extract row heights for left column (indices 0-3) and right column (indices 4-7)
              const leftRow1 = heightPercentages[0] || 25;
              const leftRow2 = heightPercentages[1] || 25;
              const leftRow3 = heightPercentages[2] || 25;
              const leftRow4 = heightPercentages[3] || 25;
              const rightRow1 = heightPercentages[4] || 25;
              const rightRow2 = heightPercentages[5] || 25;
              const rightRow3 = heightPercentages[6] || 25;
              const rightRow4 = heightPercentages[7] || 25;

              percentagesToUse = [
                leftWidth,
                leftRow1,
                leftRow2,
                leftRow3,
                leftRow4,
                rightRow1,
                rightRow2,
                rightRow3,
                rightRow4
              ];
              console.log('📐 [8-grid-2x4] Loaded from API:', {
                templateId: activeTemplateId,
                layout: activeTemplate.layout,
                leftWidth,
                leftRowHeights: [leftRow1, leftRow2, leftRow3, leftRow4],
                rightRowHeights: [rightRow1, rightRow2, rightRow3, rightRow4],
                fullPercentages: percentagesToUse,
                IMPORTANT: '🔴 THESE ARE THE PERCENTAGES THAT SHOULD BE APPLIED'
              });
            } else {
              // Fallback
              percentagesToUse = widthPercentages.length > 0 ? widthPercentages : heightPercentages;
              console.warn('⚠️ [8-grid-2x4] Insufficient data, using fallback');
            }
          } else if (activeTemplate.layout === '8-grid-4x2') {
            // 8-grid-4x2: 4 columns x 2 rows (4 top cells, 4 bottom cells)
            // Data format: [top height, topCol1 width, topCol2 width, topCol3 width, topCol4 width, bottomCol1 width, bottomCol2 width, bottomCol3 width, bottomCol4 width]
            // The API returns:
            // - Width: [topCol1, topCol2, topCol3, topCol4, bottomCol1, bottomCol2, bottomCol3, bottomCol4] (8 values)
            // - Height: [topHeight (for all 4 top cells), bottomHeight (for all 4 bottom cells), ...] (8 values)
            // We need to combine top height with column widths for both rows
            if (widthPercentages.length >= 8 && heightPercentages.length >= 8) {
              const topHeight = heightPercentages[0] || 50;
              // Extract column widths for top row (indices 0-3) and bottom row (indices 4-7)
              const topCol1 = widthPercentages[0] || 25;
              const topCol2 = widthPercentages[1] || 25;
              const topCol3 = widthPercentages[2] || 25;
              const topCol4 = widthPercentages[3] || 25;
              const bottomCol1 = widthPercentages[4] || 25;
              const bottomCol2 = widthPercentages[5] || 25;
              const bottomCol3 = widthPercentages[6] || 25;
              const bottomCol4 = widthPercentages[7] || 25;

              percentagesToUse = [
                topHeight,
                topCol1,
                topCol2,
                topCol3,
                topCol4,
                bottomCol1,
                bottomCol2,
                bottomCol3,
                bottomCol4
              ];
              console.log('📐 [8-grid-4x2] Loaded from API:', {
                templateId: activeTemplateId,
                layout: activeTemplate.layout,
                topHeight,
                topColWidths: [topCol1, topCol2, topCol3, topCol4],
                bottomColWidths: [bottomCol1, bottomCol2, bottomCol3, bottomCol4],
                fullPercentages: percentagesToUse,
                IMPORTANT: '🔴 THESE ARE THE PERCENTAGES THAT SHOULD BE APPLIED'
              });
            } else {
              // Fallback
              percentagesToUse = widthPercentages.length > 0 ? widthPercentages : heightPercentages;
              console.warn('⚠️ [8-grid-4x2] Insufficient data, using fallback');
            }
          } else if (activeTemplate.layout === '8-grid-columns') {
            // 8-grid-columns: 8 vertical columns - use width percentages directly
            if (widthPercentages.length >= 8) {
              percentagesToUse = widthPercentages.slice(0, 8);
              console.log('📐 [8-grid-columns] Loaded from API:', {
                templateId: activeTemplateId,
                layout: activeTemplate.layout,
                percentages: percentagesToUse
              });
            } else {
              percentagesToUse = widthPercentages.length > 0 ? widthPercentages : heightPercentages;
              console.warn('⚠️ [8-grid-columns] Insufficient data, using fallback');
            }
          } else if (activeTemplate.layout === '8-grid-rows') {
            // 8-grid-rows: 8 horizontal rows - use height percentages directly
            if (heightPercentages.length >= 8) {
              percentagesToUse = heightPercentages.slice(0, 8);
              console.log('📐 [8-grid-rows] Loaded from API:', {
                templateId: activeTemplateId,
                layout: activeTemplate.layout,
                percentages: percentagesToUse
              });
            } else {
              percentagesToUse = widthPercentages.length > 0 ? widthPercentages : heightPercentages;
              console.warn('⚠️ [8-grid-rows] Insufficient data, using fallback');
            }
          } else if (activeTemplate.layout === '9-grid') {
            // 9-grid: 3x3 grid
            // Format: [top height, topLeft width, topMiddle width, topRight width, middle height, middleLeft width, middleCenter width, middleRight width, bottomLeft width, bottomMiddle width, bottomRight width]
            // The API returns width/height for each cell, but we need to combine them
            // For a 3x3 grid, we need: 3 row heights + 3*3 column widths (but only save unique widths per row)
            // Actually, the format is: 2 row heights (top/middle, bottom is calculated), 3 widths for each of 3 rows
            if (widthPercentages.length >= 9 && heightPercentages.length >= 9) {
              const topHeight = heightPercentages[0] || 33.33;
              const middleHeight = heightPercentages[3] || 33.33;
              const topLeft = widthPercentages[0] || 33.33;
              const topMiddle = widthPercentages[1] || 33.33;
              const topRight = widthPercentages[2] || 33.34;
              const middleLeft = widthPercentages[3] || 33.33;
              const middleCenter = widthPercentages[4] || 33.33;
              const middleRight = widthPercentages[5] || 33.34;
              const bottomLeft = widthPercentages[6] || 33.33;
              const bottomMiddle = widthPercentages[7] || 33.33;
              const bottomRight = widthPercentages[8] || 33.34;

              percentagesToUse = [
                topHeight, topLeft, topMiddle, topRight,
                middleHeight, middleLeft, middleCenter, middleRight,
                bottomLeft, bottomMiddle, bottomRight
              ];
              console.log('📐 [9-grid] Loaded from API:', {
                templateId: activeTemplateId,
                layout: activeTemplate.layout,
                percentages: percentagesToUse
              });
            } else {
              percentagesToUse = widthPercentages.length > 0 ? widthPercentages : heightPercentages;
              console.warn('⚠️ [9-grid] Insufficient data, using fallback');
            }
          } else if (isColumnLayout) {
            percentagesToUse = widthPercentages;
          } else if (isRowLayout) {
            percentagesToUse = heightPercentages;
          } else {
            // For complex layouts, prefer width percentages but fallback to height if width is empty
            percentagesToUse = widthPercentages.length > 0 ? widthPercentages : heightPercentages;
          }

          console.log('📐 [GridPosition] Layout orientation:', {
            layout: activeTemplate.layout,
            isColumnLayout,
            isRowLayout,
            widthPercentages,
            heightPercentages,
            widthCount: widthPercentages.length,
            heightCount: heightPercentages.length,
            usingPercentages: percentagesToUse,
            usingCount: percentagesToUse.length
          });

          // Check if we have the correct number of percentages
          // Note: The API should return percentages for all cells, but some might be in calc() expressions
          const completePercentages = [...percentagesToUse];

          // Only "complete" if we truly have fewer percentages than expected cells
          // AND if the percentages don't already add up to ~100%
          const sumOfPercentages = completePercentages.reduce((sum, p) => sum + p, 0);
          const isComplete = Math.abs(sumOfPercentages - 100) < 0.1; // Allow 0.1% tolerance

          if (completePercentages.length < expectedCellCount && !isComplete) {
            const remainingPercent = 100 - sumOfPercentages;

            // Distribute remaining percentage among missing cells
            const missingCount = expectedCellCount - completePercentages.length;
            const perMissingCell = remainingPercent / missingCount;

            for (let i = 0; i < missingCount; i++) {
              completePercentages.push(perMissingCell);
            }
          }

          if (completePercentages.length > 0) {


            // Store the percentages for the grid renderer to use
            templateGridSizesStorage.saveTemplateGridSizes(
              activeTemplateId,
              activeTemplate.layout,
              completePercentages
            );

            // Verify the data was saved correctly
            const verifySaved = templateGridSizesStorage.getTemplateGridSizes(activeTemplateId);


            // Use requestAnimationFrame to ensure the storage write is complete and the DOM is ready
            // This ensures the state update and re-render happen in the next frame
            requestAnimationFrame(() => {


              // Dispatch custom event to notify DynamicGridRenderer to reload
              // The event detail includes the templateId so only the correct component updates
              const event = new CustomEvent('gridSizesUpdated', {
                detail: { templateId: activeTemplateId },
                bubbles: true,
                cancelable: false
              });

              window.dispatchEvent(event);


            });
          } else {
            console.warn('⚠️ [GridPosition] No width percentages to save for template:', activeTemplateId);
          }

          // Update widgets with coordinates
          // Note: This updateTemplate call won't trigger the effect again because:
          // 1. We've already marked this template as loaded in the ref
          // 2. We intentionally removed templates and updateTemplate from dependencies to prevent infinite loops
          if (updatedWidgets.length > 0) {

            // updateTemplate is accessed via closure and is stable from useTemplates hook
            await updateTemplate(activeTemplateId, {
              widgets: updatedWidgets
            });
          }


        } else {
          console.warn('⚠️ [GridPosition] No grid position data found for template:', templateIdNum, {
            Status: response.Status,
            hasGridPosition: !!response.GridPosition
          });
        }
      } catch (error) {
        console.error('❌ Error loading grid positions:', error);
        // Remove from loaded set on error so we can retry if needed
        loadedGridPositionsRef.current.delete(activeTemplateId);
      }
    };

    loadGridPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplateId, templatesLoading]);

  // Initialize previousTemplateIdForMigrationRef on mount
  useEffect(() => {
    if (activeTemplateId && !previousTemplateIdForMigrationRef.current) {
      previousTemplateIdForMigrationRef.current = activeTemplateId;
    }
  }, [activeTemplateId]);

  // Migrate grid sizes when template ID changes from local to numeric (template saved)
  useEffect(() => {
    const migrateGridSizes = async () => {
      // Only migrate if we have templates loaded and an active template
      if (templatesLoading || !activeTemplateId) {
        return;
      }

      const activeTemplate = templates.find(t => t.id === activeTemplateId);
      const previousId = previousTemplateIdForMigrationRef.current;

      // Check if template ID changed and we need to migrate
      if (previousId && previousId !== activeTemplateId) {
        // Check if previous ID was a local ID (starts with "local-")
        // and new ID is numeric (saved template)
        const isPreviousLocal = previousId.startsWith('local-');
        const templateIdNum = parseInt(activeTemplateId, 10);
        const isNewNumeric = !isNaN(templateIdNum);

        // Check if template is saved
        const isTemplateSaved = activeTemplate?.saved || false;

        console.log('🔄 [GridPosition] Checking migration:', {
          previousId,
          activeTemplateId,
          isPreviousLocal,
          isNewNumeric,
          isTemplateSaved,
          hasActiveTemplate: !!activeTemplate
        });

        // Only migrate if: previous was local, new is numeric, and template is saved
        if (isPreviousLocal && isNewNumeric && isTemplateSaved && activeTemplate) {
          const { templateGridSizesStorage } = await import('@/lib/templateGridSizes');
          const oldGridSizes = templateGridSizesStorage.getTemplateGridSizes(previousId);

          if (oldGridSizes && oldGridSizes.cellSizes.length > 0) {
            console.log('🔄 [GridPosition] Migrating grid sizes from', previousId, 'to', activeTemplateId, oldGridSizes);

            // Migrate grid sizes from old local ID to new numeric ID
            templateGridSizesStorage.saveTemplateGridSizes(
              activeTemplateId,
              oldGridSizes.layoutType,
              oldGridSizes.cellSizes.map(cell => cell.width)
            );

            // Also delete the old grid sizes
            templateGridSizesStorage.deleteTemplateGridSizes(previousId);

            // Save grid positions to database
            try {
              const gridSizesArray = oldGridSizes.cellSizes.map(cell => cell.width);

              if (gridSizesArray.length > 0) {
                const apiLayoutCode = mapLayoutToApiCode(activeTemplate.layout as any);

                const positions = calculateGridPositions(
                  activeTemplate.layout as any,
                  gridSizesArray,
                  apiLayoutCode
                );

                console.log('💾 [GridPosition] Saving grid positions to database for migrated template:', templateIdNum, positions);
                const saveResult = await insertMainGridPosition(
                  templateIdNum,
                  positions.Top,
                  positions.Left,
                  positions.Height,
                  positions.Width
                );

                if (saveResult.success) {
                  console.log('✅ [GridPosition] Successfully saved grid positions to database for migrated template');

                  // Dispatch event to update the grid renderer
                  window.dispatchEvent(new CustomEvent('gridSizesUpdated', {
                    detail: { templateId: activeTemplateId }
                  }));
                } else {
                  console.error('❌ [GridPosition] Failed to save grid positions to database:', saveResult);
                }
              }
            } catch (error) {
              console.error('❌ Error saving grid positions for migrated template:', error);
            }
          } else {
            console.log('ℹ️ [GridPosition] No grid sizes found for previous template ID:', previousId);
          }
        }
      }

      // Always update the ref to current ID (after migration check)
      // This ensures we track the current template ID for next change
      if (previousTemplateIdForMigrationRef.current !== activeTemplateId) {
        previousTemplateIdForMigrationRef.current = activeTemplateId;
      }
    };

    migrateGridSizes();

  }, [activeTemplateId, templatesLoading, templates]);

  // Handle symbol selection from search bar - creates a details template
  const handleSymbolSelect = async (symbol: string): Promise<void> => {
    try {
      console.log('🔍 Handling symbol selection for:', symbol);

      // Helper function to normalize symbol for comparison
      // For US Stocks, strips exchange prefix (e.g., "NASDAQ:AAPL" -> "AAPL")
      const normalizeSymbol = (sym: string): string => {
        const parts = sym.split(':');
        return (parts.length > 1 ? parts[1] : sym).toLowerCase().trim();
      };

      const normalizedSymbol = normalizeSymbol(symbol);

      // Check if a template with this symbol name already exists
      // Compare both the original symbol and normalized version (without exchange prefix)
      const existingTemplate = templates.find(t => {
        const templateNameLower = t.name.toLowerCase().trim();
        const normalizedTemplateName = normalizeSymbol(t.name);
        
        return templateNameLower === symbol.toLowerCase() || 
               normalizedTemplateName === normalizedSymbol;
      });

      if (existingTemplate) {
        console.log('📋 Template already exists for symbol, switching to it:', existingTemplate.id);
        
        // Update displayOrder to be the last one (since it's being accessed most recently)
        // This ensures the template appears at the end of the list
        const maxDisplayOrder = Math.max(
          0,
          ...templates
            .filter(t => t.displayOrder !== undefined && t.displayOrder !== -1)
            .map(t => t.displayOrder as number)
        );
        
        const newDisplayOrder = maxDisplayOrder + 1;
        console.log('🔄 Updating existing template displayOrder to latest position:', {
          currentOrder: existingTemplate.displayOrder,
          newOrder: newDisplayOrder
        });
        
        // Create reordered list with only visible templates, moving the selected one to the end
        const visibleTemplates = templates.filter(t => 
          t.displayOrder !== -1 && t.id !== existingTemplate.id
        );
        
        // Add the existing template with new displayOrder at the end
        const reorderedVisibleTemplates = [
          ...visibleTemplates,
          { ...existingTemplate, displayOrder: newDisplayOrder }
        ];
        
        // Use reorderTemplates with only visible templates to update their positions
        // This updates local state immediately and calls the API in the background
        await reorderTemplates(reorderedVisibleTemplates);
        
        // Switch to the template
        setActiveTemplateId(existingTemplate.id);
        
        return;
      }

      console.log('🔍 Creating new details template for symbol:', symbol);

      // Calculate displayOrder based on current number of templates
      const displayOrder = templates.length + 1;

      // Call the API to create the details template
      const result = await templateApi.createDetailsTemplate(symbol, displayOrder);

      if (!result.success) {
        console.error('Failed to create details template:', result.message);
        sonnerToast.error('Failed to create template', {
          description: result.message
        });
        return;
      }

      console.log('✅ Details template created successfully:', {
        templateId: result.templateId,
        widgets: result.widgets?.length
      });

      // Refresh templates and switch to the new one
      if (result.templateId) {
        // Clear the grid positions cache for the new template
        loadedGridPositionsRef.current.delete(result.templateId.toString());

        // Refresh templates from API and select the new template
        await refreshTemplates(undefined, true, result.templateId.toString());
      } else {
        // Just refresh templates if we don't have the ID
        await refreshTemplates(undefined, true);
      }
    } catch (error) {
      console.error('Error creating details template:', error);
      sonnerToast.error('Failed to create template', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // Onboarding tour handlers
  const handleStartOnboarding = () => {
    setIsOnboardingActive(true);
  };

  const handleCompleteOnboarding = () => {
    setIsOnboardingActive(false);
    sonnerToast.success('Tour completed!', {
      description: 'You can restart the tour anytime from Settings > Onboarding.'
    });
  };

  const handleSkipOnboarding = () => {
    setIsOnboardingActive(false);
  };

  const handleTemplateSwitch = (templateName: string) => {
    const template = templates.find(t => t.name === templateName);
    if (template) {
      setActiveTemplateId(template.id);
    }
  };

  // Expose onboarding trigger to window for ProfilePanel
  useEffect(() => {
    (window as any).startOnboardingNow = handleStartOnboarding;
    return () => {
      delete (window as any).startOnboardingNow;
    };
  }, []);

  const handleNewTab = () => {
    setIsLayoutSelectorOpen(true);
  };

  const handleSave = () => {
    setIsSaveDialogOpen(true);
  };

  const handleSaveTemplate = async (templateName: string, icon: string): Promise<{ success: boolean; message: string }> => {
    try {
      const activeTemplate = templates.find(t => t.id === activeTemplateId);
      if (!activeTemplate) {
        return { success: false, message: 'No active template found' };
      }

      console.log('Save template:', {
        templateName,
        activeTemplateName: activeTemplate.name,
        activeTemplateSaved: activeTemplate.saved,
        activeTemplateId: activeTemplate.id,
        layout: activeTemplate.layout,
        widgetCount: activeTemplate.widgets.length
      });

      // Check authentication using AuthContext
      if (!isAuthenticated) {
        return { success: false, message: 'User not authenticated. Please log in again.' };
      }

      // Update template name and icon locally first
      await updateTemplate(activeTemplateId, {
        name: templateName,
        icon: icon
      });

      // Check if template is already saved
      if (activeTemplate.saved) {
        // Template is saved - rename it
        console.log('Template is saved, renaming:', { templateName, activeTemplateName: activeTemplate.name });
        const result = await renameTemplate(activeTemplateId, templateName);

        if (result.success) {
          console.log('✅ Template renamed successfully:', result.message);
          return { success: true, message: 'Template renamed successfully' };
        } else {
          return { success: false, message: result.message || 'Failed to rename template' };
        }
      } else {
        // Template is not saved - save it to API
        console.log('Template is not saved, saving to API:', { templateName });

        // Save grid sizes from localStorage before template is saved (if they exist)
        const oldTemplateId = activeTemplateId;
        const { templateGridSizesStorage } = await import('@/lib/templateGridSizes');
        const oldGridSizes = templateGridSizesStorage.getTemplateGridSizes(oldTemplateId);

        const result = await saveTemplateToApi(activeTemplateId, templateName, icon);

        if (result.success) {
          console.log('✅ Template saved successfully:', result.message);

          // Store the old template ID in the ref so the migration useEffect can detect it
          // The migration will happen automatically when activeTemplateId changes
          previousTemplateIdForMigrationRef.current = oldTemplateId;

          // Refresh templates to get the updated list with server IDs
          // This will update activeTemplateId to the new numeric ID
          // The migration useEffect will then detect the change and migrate grid sizes
          await refreshTemplates(templateName);

          return { success: true, message: 'Template saved successfully' };
        } else {
          // Return the error result instead of throwing
          return { success: false, message: result.message || 'Failed to save template' };
        }
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      // Clear any global error state since the dialog will handle it
      clearError();
      const errorMessage = error instanceof Error ? error.message : 'Failed to save template';
      return { success: false, message: errorMessage };
    }
  };

  const handleReplaceTemplate = async (templateName: string, icon: string) => {
    try {
      const activeTemplate = templates.find(t => t.id === activeTemplateId);
      if (!activeTemplate) {
        throw new Error('No active template found');
      }

      console.log('Replace template:', {
        templateName,
        activeTemplateName: activeTemplate.name,
        layout: activeTemplate.layout,
        widgetCount: activeTemplate.widgets.length
      });

      // Use saved widget coordinates from template instead of capturing from DOM
      // This ensures we save the resized version, not the initial layout sizes
      // Widget mapping for API format
      const WIDGET_MAPPING: Record<string, { title: string; module: string; settings: string }> = {
        'realtime-news-ticker': {
          title: 'Realtime News Ticker',
          module: 'News',
          settings: 'DAX,CAC,SMI,US Equities,Asian Equities,FTSE 100,European Equities,Global Equities,UK Equities,EUROSTOXX,US Equity Plus,US Data,Swiss Data,EU Data,Canadian Data,Other Data,UK Data,Other Central Banks,BoC,RBNZ,RBA,SNB,BoJ,BoE,ECB,PBoC,Fed,Bank Research,Fixed Income,Geopolitical,Rating Agency comments,Global News,Market Analysis,FX Flows,Asian News,Economic Commentary,Brexit,Energy & Power,Metals,Ags & Softs,Crypto,Emerging Markets,US Election,Trade,Newsquawk Update|Important,Rumour,Highlighted,Normal|selectAll'
        },
        'trading-chart': {
          title: 'Trading Chart',
          module: 'Forex',
          settings: '1D|NEWLAYOUT,Sample'
        },
        'currency-strength': {
          title: 'Currency Strength',
          module: 'Currency',
          settings: '{"currencies":["AUD","CAD","CHF","EUR","GBP","JPY","NZD","USD"],"timeframe":"TD","showVolume":1}'
        },
        'smart-money-report': {
          title: 'Smart Money Report',
          module: 'COT',
          settings: 'USD|Dealer Intermediary'
        },
        'seasonality-forecast': {
          title: 'Seasonality Forecast',
          module: 'Seasonality',
          settings: 'EURUSD|15Y'
        },
        'economic-calendar': {
          title: 'Economic Calendar',
          module: 'Calendar',
          settings: 'USD,EUR,GBP,JPY|today|1'
        },
        'market-overview': {
          title: 'Market Overview',
          module: 'Overview',
          settings: 'USD,EUR,GBP,JPY|today|1'
        }
      };

      const coordinates = activeTemplate.widgets
        .map((widget, index) => {
          // Get widget coordinates from saved settings, or fallback to DOM capture
          const savedCoords = widget.settings?.coordinates as { top: number; left: number; width: number; height: number } | undefined;

          if (savedCoords) {
            // Use saved coordinates (from resize operations)
            const widgetMapping = WIDGET_MAPPING[widget.name] || {
              title: widget.name.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
              module: 'General',
              settings: ''
            };

            return {
              WidgetTitle: widgetMapping.title,
              Module: widgetMapping.module,
              Symbols: '',
              AdditionalSettings: widgetMapping.settings,
              TopPos: Math.round(savedCoords.top),
              LeftPos: Math.round(savedCoords.left),
              Height: Math.round(savedCoords.height),
              Width: Math.round(savedCoords.width),
              position: widget.position,
              zIndex: 10 + index
            } as CapturedWidget;
          } else {
            // Fallback: capture from DOM if no saved coordinates
            console.warn(`No saved coordinates for widget ${widget.name}, falling back to DOM capture`);
            return null;
          }
        })
        .filter((coord): coord is CapturedWidget => coord !== null);

      // If no saved coordinates found, fallback to DOM capture
      let finalCoordinates = coordinates;
      let filledAreas: string;

      if (coordinates.length === 0 || coordinates.length < activeTemplate.widgets.length) {
        console.log('Not all widgets have saved coordinates, using DOM capture as fallback');
        const captured = captureWidgetCoordinates(
          activeTemplate.widgets.map(widget => ({
            name: widget.name,
            position: widget.position
          })),
          activeTemplate.layout
        );
        finalCoordinates = captured.coordinates;
        filledAreas = captured.filledAreas;
      } else {
        filledAreas = activeTemplate.widgets.map(w => w.position).join(',');
      }

      console.log('Using coordinates for replacement:', {
        coordinates: finalCoordinates,
        filledAreas,
        source: coordinates.length === activeTemplate.widgets.length ? 'saved' : 'DOM fallback'
      });

      // Prepare the template data for the API
      const templateRequest: CreateTemplateRequest = {
        TemplateName: templateName,
        Widgets: finalCoordinates,
        templateType: activeTemplate.layout, // Use layout as templateType
        layoutType: getLayoutType(activeTemplate.layout),
        filledAreas,
        isFavorite: activeTemplate.isFavorite || false,
        displayOrder: getDisplayOrder(templates.length),
        isFreeFloating: activeTemplate.layout === "free-floating",
        icon,
        isActiveTab: false
      };

      console.log('Sending replace template request:', templateRequest);

      // Save template using API (replace existing)
      const result = await templateApi.createTemplateWithWidgets(templateRequest);

      if (result.success) {
        console.log('Template replaced successfully:', result.message);

        // Also save grid positions if template is saved and we have coordinates
        if (activeTemplate.saved && finalCoordinates.length > 0) {
          const templateIdNum = parseInt(activeTemplateId, 10);
          if (!isNaN(templateIdNum)) {
            try {
              // Calculate grid sizes from saved coordinates
              const widgetCoordinates = finalCoordinates.map(coord => ({
                top: coord.TopPos,
                left: coord.LeftPos,
                width: coord.Width,
                height: coord.Height
              }));

              // Try to get grid sizes from templateGridSizesStorage first (most accurate, includes all cells)
              const { templateGridSizesStorage } = await import('@/lib/templateGridSizes');
              const savedGridSizes = templateGridSizesStorage.getTemplateGridSizes(activeTemplateId);

              let gridSizesArray: number[] = [];

              if (savedGridSizes && savedGridSizes.cellSizes.length > 0) {
                // Use stored cell sizes (most accurate, includes ALL cells)
                gridSizesArray = savedGridSizes.cellSizes.map(cell => cell.width);
                console.log('💾 [GridPosition] Using stored cell sizes:', gridSizesArray.length, 'cells');
              } else if (widgetCoordinates.length > 0) {
                // Calculate from coordinates - extract ALL cell sizes based on layout type
                const layout = activeTemplate.layout;

                // For column-based layouts, calculate widths directly from coordinates
                const isColumnLayout = layout === '2-grid-vertical' || layout === 'two-vertical' ||
                  layout === '3-grid-columns' || layout === 'three-vertical' ||
                  layout === '4-grid-columns' || layout === 'four-vertical' ||
                  layout === '5-grid-columns' || layout === 'five-vertical' ||
                  layout === '6-grid-2x3' ||
                  layout === '6-grid-3x2' ||
                  layout === '6-grid-left-large' ||
                  layout === '7-grid-left' ||
                  layout === '7-grid-complex1' ||
                  layout === '7-grid-complex2' ||
                  layout === '8-grid-columns' ||
                  layout === '9-grid' ||
                  layout === '12-grid-3x4' ||
                  layout === '12-grid-4x3' ||
                  layout === '16-grid' ||
                  layout === '24-grid-columns' ||
                  layout === '24-grid-6x4' ||
                  layout === '28-grid-7x4' ||
                  layout === '32-grid-8x4';

                // For row-based layouts, calculate heights directly from coordinates
                const isRowLayout = layout === '2-grid-horizontal' || layout === 'two-horizontal' ||
                  layout === '3-grid-rows' || layout === 'three-horizontal' ||
                  layout === '4-grid-rows' || layout === 'four-horizontal' ||
                  layout === '5-grid-rows' || layout === 'five-horizontal' ||
                  layout === '6-grid-rows' ||
                  layout === '7-grid-large' ||
                  layout === '8-grid-rows' ||
                  layout === '24-grid-rows' ||
                  layout === '24-grid-4x6' ||
                  layout === '28-grid-4x7' ||
                  layout === '32-grid-4x8';

                if (isColumnLayout) {
                  // Sort coordinates by left position (horizontal order)
                  const sortedCoords = [...widgetCoordinates].sort((a, b) => a.left - b.left);
                  const totalWidth = sortedCoords.reduce((sum, coord) => sum + coord.width, 0);

                  if (totalWidth > 0) {
                    // Calculate width percentages for each column
                    gridSizesArray = sortedCoords.map(coord =>
                      parseFloat(((coord.width / totalWidth) * 100).toFixed(4))
                    );

                    // Ensure they sum to 100% (adjust last one if needed due to rounding)
                    const total = gridSizesArray.reduce((sum, val) => sum + val, 0);
                    if (Math.abs(total - 100) > 0.01) {
                      gridSizesArray[gridSizesArray.length - 1] = parseFloat(
                        (gridSizesArray[gridSizesArray.length - 1] + (100 - total)).toFixed(4)
                      );
                    }
                  }
                } else if (isRowLayout) {
                  // Sort coordinates by top position (vertical order)
                  const sortedCoords = [...widgetCoordinates].sort((a, b) => a.top - b.top);
                  const totalHeight = sortedCoords.reduce((sum, coord) => sum + coord.height, 0);

                  if (totalHeight > 0) {
                    // Calculate height percentages for each row
                    gridSizesArray = sortedCoords.map(coord =>
                      parseFloat(((coord.height / totalHeight) * 100).toFixed(4))
                    );

                    // Ensure they sum to 100% (adjust last one if needed due to rounding)
                    const total = gridSizesArray.reduce((sum, val) => sum + val, 0);
                    if (Math.abs(total - 100) > 0.01) {
                      gridSizesArray[gridSizesArray.length - 1] = parseFloat(
                        (gridSizesArray[gridSizesArray.length - 1] + (100 - total)).toFixed(4)
                      );
                    }
                  }
                } else {
                  // For complex layouts, calculate from all coordinates
                  // Sort by position (top first, then left) to get all cells in order
                  const sortedCoords = [...widgetCoordinates].sort((a, b) => {
                    if (Math.abs(a.top - b.top) > 5) return a.top - b.top; // Different row
                    return a.left - b.left; // Same row, sort by left
                  });

                  // For complex layouts, we need to determine if it's width-based or height-based
                  // Check if coordinates are arranged horizontally (columns) or vertically (rows)
                  const firstRow = sortedCoords.filter(coord =>
                    Math.abs(coord.top - sortedCoords[0].top) < 5
                  );

                  if (firstRow.length > 1) {
                    // Multiple cells in first row = column-based layout
                    const totalWidth = sortedCoords.reduce((sum, coord) => sum + coord.width, 0);
                    if (totalWidth > 0) {
                      gridSizesArray = sortedCoords.map(coord =>
                        parseFloat(((coord.width / totalWidth) * 100).toFixed(4))
                      );
                    }
                  } else {
                    // Single cell per row = row-based layout
                    const totalHeight = sortedCoords.reduce((sum, coord) => sum + coord.height, 0);
                    if (totalHeight > 0) {
                      gridSizesArray = sortedCoords.map(coord =>
                        parseFloat(((coord.height / totalHeight) * 100).toFixed(4))
                      );
                    }
                  }

                  // Ensure they sum to 100%
                  if (gridSizesArray.length > 0) {
                    const total = gridSizesArray.reduce((sum, val) => sum + val, 0);
                    if (Math.abs(total - 100) > 0.01) {
                      gridSizesArray[gridSizesArray.length - 1] = parseFloat(
                        (gridSizesArray[gridSizesArray.length - 1] + (100 - total)).toFixed(4)
                      );
                    }
                  }
                }

                console.log('💾 [GridPosition] Calculated grid sizes from coordinates:', gridSizesArray.length, 'cells');
              }

              if (gridSizesArray.length > 0) {
                const apiLayoutCode = mapLayoutToApiCode(activeTemplate.layout as any);
                const positions = calculateGridPositions(
                  activeTemplate.layout as any,
                  gridSizesArray,
                  apiLayoutCode
                );

                await insertMainGridPosition(
                  templateIdNum,
                  positions.Top,
                  positions.Left,
                  positions.Height,
                  positions.Width
                );
              }
            } catch (error) {
              console.error('❌ Error saving grid positions after template save:', error);
              // Don't throw - template save was successful, grid positions are secondary
            }
          }
        }

        // Refresh templates to include the updated template
        await refreshTemplates();
      } else {
        throw new Error(result.message || 'Failed to replace template');
      }
    } catch (error) {
      console.error('Failed to replace template:', error);
      throw error; // Re-throw to be handled by the dialog
    }
  };

  const handleLayoutSelect = (layout: GridLayout) => {
    // Store the selected layout and open the create template dialog
    setPendingLayout(layout);
    setIsLayoutSelectorOpen(false);
    setIsCreateTemplateDialogOpen(true);
  };

  const handleCreateTemplate = async (templateName: string, icon: string): Promise<{ success: boolean; message: string }> => {
    if (!pendingLayout) {
      return { success: false, message: 'No layout selected' };
    }

    try {
      await createTemplate(templateName, pendingLayout as string, [], icon);
      setPendingLayout(null);

      // Clear any lingering errors
      clearError();

      return { success: true, message: 'Template created successfully' };
    } catch (error) {
      console.error('Failed to create new template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create template';

      // Clear any global error state to prevent full-page error UI
      clearError();

      return { success: false, message: errorMessage };
    }
  };

  const handleCloseCreateTemplateDialog = () => {
    setIsCreateTemplateDialogOpen(false);
    setPendingLayout(null);
  };

  const handleTabClose = async (tabId: string) => {
    const templateToHide = templates.find(t => t.id === tabId);
    if (templateToHide) {
      try {
        // Hide the template directly without confirmation dialog
        await hideTemplate(tabId);
      } catch (error) {
        console.error('Failed to hide template:', error);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!tabToDelete) return;

    try {
      // Hide the template by setting displayOrder to -1 instead of deleting
      await hideTemplate(tabToDelete);
      setIsDeleteConfirmOpen(false);
      setTabToDelete(null);
    } catch (error) {
      console.error('Failed to hide template:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteConfirmOpen(false);
    setTabToDelete(null);
  };

  const handleTabsReorder = async (newTabs: { id: string; name: string; icon?: string }[]) => {
    try {
      // Map the reordered tabs back to our full Template format
      const reorderedTemplates = newTabs.map(tab => {
        const originalTemplate = templates.find(t => t.id === tab.id);
        return originalTemplate || {
          id: tab.id,
          name: tab.name,
          layout: "3-grid-left-large" as GridLayout,
          saved: false,
          icon: tab.icon || 'Star',
          widgets: []
        };
      });

      await reorderTemplates(reorderedTemplates);
      console.log('Tab reorder completed:', newTabs);
    } catch (error) {
      console.error('Failed to reorder tabs:', error);
    }
  };

  const handleTabIconChange = async (tabId: string, icon: string) => {
    try {
      await updateTemplate(tabId, { icon });
    } catch (error) {
      console.error('Failed to update template icon:', error);
    }
  };

  const handleWidgetSettings = (position: string, widgetType: string) => {
    setSettingsWidgetPosition(position);
    setSettingsWidgetType(widgetType);
    const instanceId = activeTemplateId ? `${activeTemplateId}-${position}` : position;
    setSettingsWidgetInstanceId(instanceId);
    setSettingsDialogOpen(true);
  };

  const handleCloseWidgetSettings = () => {
    setSettingsDialogOpen(false);
    setSettingsWidgetInstanceId("");
  };

  const handleFullscreenWidget = (position: string, widgetId: string) => {
    setFullscreenWidget({
      widgetId,
      position,
      tabId: activeTemplateId
    });
  };

  const handleCloseFullscreenWidget = () => {
    setFullscreenWidget(null);
  };

  const handleSaveWidgetSettings = async (settings: WidgetSettings, position?: string, widgetType?: string) => {
    // Use provided parameters or fall back to state variables
    const targetPosition = position || settingsWidgetPosition;
    const targetWidgetType = widgetType || settingsWidgetType;

    console.log('💾 [BloombergDashboard] handleSaveWidgetSettings called:', {
      targetPosition,
      targetWidgetType,
      settings,
      hasPosition: !!position,
      hasWidgetType: !!widgetType
    });

    // Update local state immediately
    setWidgetSettings(prev => ({
      ...prev,
      [targetPosition]: settings
    }));

    // Also save to database if template is saved and widget exists
    const activeTemplate = templates.find(t => t.id === activeTemplateId);
    console.log('🔍 [BloombergDashboard] Checking if should save to database:', {
      activeTemplateFound: !!activeTemplate,
      templateSaved: activeTemplate?.saved,
      activeTemplateId,
      targetPosition
    });

    if (activeTemplate?.saved && activeTemplateId) {
      const templateWidget = activeTemplate.widgets.find(w => w.position === targetPosition);
      const customDashboardWidgetID = templateWidget?.settings?.customDashboardWidgetID as number | undefined;

      console.log('🔍 [BloombergDashboard] Template widget found:', {
        templateWidgetFound: !!templateWidget,
        customDashboardWidgetID
      });

      if (customDashboardWidgetID) {
        console.log('📡 [BloombergDashboard] About to call updateWidgetFields API...');
        try {
          let additionalSettings: string;
          let module: string | undefined;
          let symbols: string | undefined;

          if (targetWidgetType === 'tabbed-widget' && settings.tabBarPosition) {
            // For tabbed-widget, save as JSON
            additionalSettings = JSON.stringify({ tabBarPosition: settings.tabBarPosition });
          } else if (targetWidgetType === 'price-chart') {
            // For price-chart, save as JSON with chartType, showVolume, timeframe
            additionalSettings = JSON.stringify({
              chartType: settings.chartType || "candlestick",
              showVolume: settings.showVolume ?? false,
              timeframe: settings.timeframe || "1h"
            });
            module = settings.module || "Forex";
            symbols = settings.symbol || "EURUSD";
          } else if (targetWidgetType === 'cot-positioning') {
            // For cot-positioning, save as JSON with symbol and owner
            additionalSettings = JSON.stringify({
              symbol: settings.symbol || "EUR",
              owner: settings.owner || "leveraged funds"
            });
          } else if (targetWidgetType === 'cot-chart-view') {
            // For cot-chart-view, save as JSON with essential settings
            additionalSettings = JSON.stringify({
              symbol: settings.symbol || settings.cotCurrency || "USD",
              chartType: settings.chartType || "bar chart",
              cotDataType: settings.cotDataType || "NetPercent",
              cotOwner: settings.cotOwner || "Dealer Intermediary",
              cotDuration: settings.cotDuration || "1825"
            });
          } else if (targetWidgetType === 'exponential-moving-average') {
            // For exponential-moving-average, save as JSON with dataType, timeframe
            additionalSettings = JSON.stringify({
              dataType: settings.dataType || "Institutional",
              timeframe: settings.timeframe || "4h"
            });
            module = settings.module || "Forex";
            symbols = settings.symbol || "EURUSD";
          } else if (targetWidgetType === 'supertrend') {
            // For supertrend, save as JSON with timeframe
            additionalSettings = JSON.stringify({
              timeframe: settings.timeframe || "4h"
            });
            module = settings.module || "Forex";
            symbols = settings.symbol || "EURUSD";
          } else if (targetWidgetType === 'supply-and-demand-areas') {
            // For supply-and-demand-areas, save as JSON with timeframe
            additionalSettings = JSON.stringify({
              timeframe: settings.timeframe || "1d"
            });
            module = settings.module || "Forex";
            symbols = settings.symbol || "AUDCAD";
          } else if (targetWidgetType === 'high-and-low-points') {
            // For high-and-low-points, save as JSON with timeframe
            additionalSettings = JSON.stringify({
              timeframe: settings.timeframe || "1d"
            });
            module = settings.module || "Forex";
            symbols = settings.symbol || "AUDCAD";
          } else if (targetWidgetType === 'session-ranges') {
            // For session-ranges, save as JSON
            additionalSettings = JSON.stringify({
              symbol: settings.symbol || "EURUSD"
            });
            module = settings.module || "Forex";
            symbols = settings.symbol || "EURUSD";
          } else if (targetWidgetType === 'percent-monthly-targets') {
            // For percent-monthly-targets, save as JSON
            additionalSettings = JSON.stringify({
              symbol: settings.symbol || "EURUSD"
            });
            module = settings.module || "Forex";
            symbols = settings.symbol || "EURUSD";
          } else if (targetWidgetType === 'smart-bias') {
            // For smart-bias, save as JSON with view and week
            additionalSettings = JSON.stringify({
              view: settings.view || "Scanner",
              week: settings.week || "Current Week"
            });
          } else if (targetWidgetType === 'smart-bias-chart') {
            // For smart-bias-chart, save as JSON with symbol and weeksBack
            additionalSettings = JSON.stringify({
              symbol: settings.symbol || "all",
              weeksBack: settings.weeksBack || "4"
            });
          } else if (targetWidgetType === 'average-daily-range') {
            // For average-daily-range, save as JSON with symbol and rangeType
            additionalSettings = JSON.stringify({
              symbol: settings.symbol || "EURUSD",
              rangeType: settings.rangeType || "D"
            });
            module = settings.module || "Forex";
            symbols = settings.symbol || "EURUSD";
          } else if (targetWidgetType === 'average-range-histogram') {
            // For average-range-histogram, save as JSON with symbol and rangeType
            additionalSettings = JSON.stringify({
              symbol: settings.symbol || "EURUSD",
              rangeType: settings.rangeType || "D"
            });
            module = settings.module || "Forex";
            symbols = settings.symbol || "EURUSD";
          } else if (targetWidgetType === 'dmx-overview') {
            // For dmx-overview, save as JSON with sortBy
            additionalSettings = JSON.stringify({
              sortBy: settings.sortBy || "default"
            });
          } else if (targetWidgetType === 'seasonality-performance-chart') {
            // For seasonality-performance-chart, save as JSON with timeframe and year toggles
            additionalSettings = JSON.stringify({
              timeframe: settings.timeframe || "5d",
              show5Y: settings.show5Y ?? true,
              show10Y: settings.show10Y ?? true,
              show15Y: settings.show15Y ?? true
            });
          } else if (targetWidgetType === 'seasonality-forecast-chart') {
            // For seasonality-forecast-chart, save as JSON with timeframe
            additionalSettings = JSON.stringify({
              timeframe: settings.timeframe || "5d"
            });
          } else if (targetWidgetType === 'realtime-headline-ticker') {
            // For realtime-headline-ticker, save sections and priorities as JSON
            additionalSettings = JSON.stringify({
              newsSections: Array.isArray(settings.newsSections) && settings.newsSections.length > 0
                ? settings.newsSections
                : ['DAX', 'CAC', 'SMI', 'US Equities', 'Asian Equities', 'FTSE 100', 'European Equities', 'Global Equities', 'UK Equities', 'EUROSTOXX', 'US Equity Plus', 'US Data', 'Swiss Data', 'EU Data', 'Canadian Data', 'Other Data', 'UK Data', 'Other Central Banks', 'BoC', 'RBNZ', 'RBA', 'SNB', 'BoJ', 'BoE', 'ECB', 'PBoC', 'Fed', 'Bank Research', 'Fixed Income', 'Geopolitical', 'Rating Agency comments', 'Global News', 'Market Analysis', 'FX Flows', 'Asian News', 'Economic Commentary', 'Brexit', 'Energy & Power', 'Metals', 'Ags & Softs', 'Crypto', 'Emerging Markets', 'US Election', 'Trade', 'Newsquawk Update'],
              newsPriorities: Array.isArray(settings.newsPriorities) && settings.newsPriorities.length > 0
                ? settings.newsPriorities
                : ['Important', 'Rumour', 'Highlighted', 'Normal']
            });
          } else {
            // For other widgets, save as JSON string
            additionalSettings = JSON.stringify(settings);
          }

          // Update widget fields in database
          const updateFields: any = { additionalSettings };
          if (module !== undefined) {
            updateFields.module = module;
          }
          if (symbols !== undefined) {
            updateFields.symbols = symbols;
          }

          const result = await updateWidgetFields(
            String(customDashboardWidgetID),
            activeTemplateId,
            updateFields
          );

          if (result.success) {
            console.log('✅ Widget settings saved to database:', {
              widgetId: customDashboardWidgetID,
              templateId: activeTemplateId,
              position: targetPosition,
              additionalSettings,
              module,
              symbols
            });
          } else {
            console.warn('⚠️ Failed to save widget settings to database:', result.message);
          }
        } catch (error) {
          console.error('❌ Error saving widget settings to database:', error);
          // Don't throw - we still want to update local state even if DB save fails
        }
      }
    }
  };

  // Create a callback for price-chart widget to save settings
  const createSaveSettingsCallback = (widgetPos: string, widgetType: string) => {
    return async (settings: WidgetSettings) => {
      console.log('📥 [BloombergDashboard] Received settings save request:', {
        position: widgetPos,
        widgetType: widgetType,
        settings: settings
      });
      // Call the save handler with explicit position and widgetType
      await handleSaveWidgetSettings(settings, widgetPos, widgetType);
    };
  };

  const handleTemplateRename = async (templateId: string, newName: string) => {
    try {
      await updateTemplate(templateId, { name: newName });
      // Note: Don't call refreshTemplates() as it would close the dialog
      // The updateTemplate already updates the local state
    } catch (error) {
      console.error('Failed to rename template:', error);
    }
  };

  const handleTemplateStar = async (templateId: string, isFavorite: boolean) => {
    const result = await updateTemplate(templateId, { isFavorite });

    if (!result.success) {
      sonnerToast.error(result.message || 'Failed to update favorite status');
    }
  };

  const handleTemplateDisplayOrder = async (templateId: string, displayOrder: number) => {
    const result = await updateTemplate(templateId, { displayOrder });

    if (!result.success) {
      sonnerToast.error(result.message || 'Failed to update template visibility');
    }
  };

  const handleTemplateIconChange = async (templateId: string, icon: string) => {
    try {
      const result = await updateTemplate(templateId, { icon });
      
      if (!result.success) {
        sonnerToast.error(result.message || 'Failed to update template icon');
      }
    } catch (error) {
      console.error('Failed to update template icon:', error);
      sonnerToast.error('Failed to update template icon');
    }
  };

  const handleReorderTemplates = async (reorderedTemplates: UserTemplate[]) => {
    try {
      await reorderTemplates(reorderedTemplates);
    } catch (err) {
      console.error('Failed to reorder templates:', err);
      sonnerToast.error('Failed to update template order');
    }
  };

  const getWidgetSettings = (position: string): WidgetSettings => {
    // First check if we have it in state (for recently saved settings)
    if (widgetSettings[position]) {
      return widgetSettings[position];
    }

    // Read directly from template widget's settings (from API)
    const activeTemplate = templates.find(t => t.id === activeTemplateId);
    if (activeTemplate) {
      const widget = activeTemplate.widgets.find(w => w.position === position);
      if (widget?.settings) {
        const normalizedName = widget.name.toLowerCase().replace(/\s+/g, '-');
        const isTabbedWidget = normalizedName === 'tabbed-widget' || widget.name === 'tabbed-widget' || widget.name.toLowerCase().includes('tabbed');
        const isPriceChart = normalizedName === 'price-chart';
        const additionalSettings = typeof widget.settings.additionalSettings === 'string'
          ? widget.settings.additionalSettings
          : '';

        // All widgets now use JSON format for additionalSettings
        // Try to parse as JSON first
        let parsedSettings: WidgetSettings = {};

        if (additionalSettings) {
          try {
            const parsed = JSON.parse(additionalSettings);
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              parsedSettings = parsed as WidgetSettings;
            }
          } catch {
            // Backward compatibility: handle old pipe-separated formats
            if (isTabbedWidget) {
              if (additionalSettings === 'bottom' || additionalSettings === 'top') {
                parsedSettings = { tabBarPosition: additionalSettings as "top" | "bottom" };
              }
            } else if (isPriceChart) {
              // Old format: "chartStyle|showVolume|timeframe" (e.g., "1|1|1h")
              const parts = additionalSettings.split("|");
              if (parts.length >= 2) {
                const chartStyleMap: Record<string, string> = { "1": "candlestick", "2": "area", "3": "line" };
                parsedSettings.chartType = chartStyleMap[parts[0]] || "candlestick";
                parsedSettings.showVolume = parts[1] === "1";
                parsedSettings.timeframe = parts[2] || "1h";
              }
            } else if (normalizedName === 'exponential-moving-average') {
              // Old format: "dataType|timeframe"
              const parts = additionalSettings.split("|");
              if (parts.length >= 2) {
                parsedSettings.dataType = parts[0] || "Institutional";
                parsedSettings.timeframe = parts[1] || "4h";
              }
            } else if (normalizedName === 'supertrend' || normalizedName === 'supply-and-demand-areas' || normalizedName === 'high-and-low-points') {
              // Old format: just timeframe
              parsedSettings.timeframe = additionalSettings;
            } else if (normalizedName === 'realtime-headline-ticker') {
              // Try JSON format first, fall back to old pipe-separated format for backward compatibility
              try {
                const jsonParsed = JSON.parse(additionalSettings);
                if (jsonParsed.newsSections) {
                  parsedSettings.newsSections = jsonParsed.newsSections;
                }
                if (jsonParsed.newsPriorities) {
                  parsedSettings.newsPriorities = jsonParsed.newsPriorities;
                }
              } catch {
                // Handle 'selectAll' or invalid formats - default to all sections and priorities selected
                if (additionalSettings === 'selectAll' || additionalSettings.trim() === '') {
                  // Set all sections and priorities as selected using shared constants
                  parsedSettings.newsSections = [...REALTIME_NEWS_DEFAULT_SECTIONS];
                  parsedSettings.newsPriorities = [...REALTIME_NEWS_DEFAULT_PRIORITIES];
                } else {
                  // Backward compatibility: old pipe-separated format "sections|priorities"
                  const parts = additionalSettings.split("|");
                  if (parts.length >= 2) {
                    parsedSettings.newsSections = parts[0].split(',').filter(s => s.trim());
                    parsedSettings.newsPriorities = parts[1].split(',').filter(s => s.trim());
                  } else if (parts.length === 1 && parts[0]) {
                    parsedSettings.newsSections = parts[0].split(',').filter(s => s.trim());
                  }
                }
              }
            }
            // For session-ranges and percent-monthly-targets, old format was "selectAll" - ignore
          }
        }

        // Add module and symbols from widget.settings
        // Skip this for DMX widgets as they store everything in additionalSettings JSON
        const isDMXWidget = normalizedName === 'dmx-positioning' || normalizedName === 'dmx-open-interest';

        if (!isDMXWidget) {
          if (widget.settings.module) {
            parsedSettings.module = widget.settings.module as string;
          }
          if (widget.settings.symbols) {
            parsedSettings.symbol = widget.settings.symbols as string;
          }
        }

        return parsedSettings;
      }
    }

    return {};
  };

  // Note: We don't need to preload settings into state anymore
  // getWidgetSettings() reads directly from widget.settings.additionalSettings (from API)
  // This ensures we always have the latest data from the database

  const showToast = (message: string) => {
    setToast({ message, isVisible: true });
    // Auto-hide toast after 3 seconds
    setTimeout(() => {
      setToast({ message: '', isVisible: false });
    }, 3000);
  };

  const handleAddWidget = async (widgetId: string) => {
    // Check if we're in free-floating mode
    if (currentLayout === "free-floating") {
      // For free-floating mode, we need to add the widget directly to the canvas
      // Set the selected widget ID so the FreeFloatingCanvas can pick it up
      setSelectedWidgetForFloating(widgetId);
      setIsWidgetPanelOpen(false);
      setTargetPosition(null);

      // Update recently used widgets
      const widget = availableWidgets.find(w => w.id === widgetId);
      if (widget) {
        setRecentWidgets(prev => {
          const filtered = prev.filter(w => w.id !== widgetId);
          return [widget, ...filtered].slice(0, 4);
        });
      }
      return;
    }

    if (!targetPosition) return;

    try {
      // Check if we have a valid active template ID
      if (!activeTemplateId) {
        console.error('No active template ID available');
        return;
      }

      // Close panel and clear target immediately for instant feedback
      setIsWidgetPanelOpen(false);
      setTargetPosition(null);

      // Update recently used widgets immediately
      const widget = availableWidgets.find(w => w.id === widgetId);
      if (widget) {
        setRecentWidgets(prev => {
          const filtered = prev.filter(w => w.id !== widgetId);
          return [widget, ...filtered].slice(0, 4);
        });
      }

      // Add widget to template (updates local state immediately, then calls API)
      const widgetTitle = widget?.name ?? widgetId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      await addWidgetToTemplate(activeTemplateId, widgetId, widgetTitle, targetPosition);

      // Background operations for saved templates
      const activeTemplate = templates.find(t => t.id === activeTemplateId);
      if (activeTemplate?.saved) {
        console.log('✅ Widget Added to Template:', {
          widgetName: widgetId,
          position: targetPosition,
          templateId: activeTemplateId,
          templateName: activeTemplate.name,
          message: 'Widget added via API - customDashboardWidgetID will be assigned by server',
          timestamp: new Date().toISOString()
        });

        // Refresh only the widgets for this template, not all templates
        // This avoids unnecessary calls to getTemplatesByUserWeb and getWidgetsByTemplateWeb for other templates
        await refreshTemplateWidgets(activeTemplateId);

        // showToast('Widget added to template');
      } else {
        console.log('✅ Widget Added to Local Template:', {
          widgetName: widgetId,
          position: targetPosition,
          templateId: activeTemplateId,
          timestamp: new Date().toISOString()
        });
        // No toast for local-only changes
      }
    } catch (error) {
      console.error('Failed to add widget:', error);
      showToast('Failed to add widget to template');
    }
  };

  const handleRemoveWidget = async (position: string) => {
    const activeTemplate = templates.find(t => t.id === activeTemplateId);

    try {
      // Find widget info before removing
      const widgetToRemoveData = activeTemplate?.widgets.find(w => w.position === position);
      const customDashboardWidgetID = widgetToRemoveData?.settings?.customDashboardWidgetID as number | undefined;

      await removeWidgetFromTemplate(activeTemplateId, position);

      // Clear cached widget settings for this position so new widgets get fresh defaults
      setWidgetSettings(prev => {
        const newSettings = { ...prev };
        delete newSettings[position];
        return newSettings;
      });

      // Show success toast only for saved templates
      if (activeTemplate?.saved) {
        console.log('🗑️ Widget Removed from Template:', {
          widgetId: customDashboardWidgetID,
          'data-wgid': customDashboardWidgetID,
          widgetName: widgetToRemoveData?.name,
          position: position,
          templateId: activeTemplateId,
          timestamp: new Date().toISOString()
        });
        // showToast('Widget removed from template');
      } else {
        console.log('🗑️ Widget Removed from Local Template:', {
          widgetName: widgetToRemoveData?.name,
          position: position,
          timestamp: new Date().toISOString()
        });
        // No toast for local-only changes
      }
    } catch (error) {
      console.error('Failed to remove widget from template:', error);
      showToast('Failed to remove widget from template');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (widget: typeof availableWidgets[0], e: React.DragEvent) => {
    console.log("BloombergDashboard: Drag started for widget:", widget.id);
    setDraggedWidget(widget);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", widget.id);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
    setDragOverPosition(null);
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent, position: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverPosition(position);
    console.log("Drag over position:", position);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're actually leaving the element
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverPosition(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, position: string) => {
    e.preventDefault();

    console.log("Drop event on position:", position);

    // Try to get widget ID from drag data (same approach as FreeFloatingCanvas)
    const widgetId = e.dataTransfer.getData('text/plain');
    console.log("Widget ID from drag data:", widgetId);

    if (widgetId) {
      const widget = availableWidgets.find(w => w.id === widgetId);
      console.log("Found widget:", widget);

      if (widget) {
        try {
          // Check if we have a valid active template ID
          if (!activeTemplateId) {
            console.error('No active template ID available');
            return;
          }

          // Update recently used widgets immediately for instant feedback
          setRecentWidgets(prev => {
            const filtered = prev.filter(w => w.id !== widget.id);
            return [widget, ...filtered].slice(0, 4);
          });

          // Add widget to the template (updates local state immediately, then calls API)
          await addWidgetToTemplate(activeTemplateId, widget.id, widget.name, position);

          // Background operations for saved templates
          const activeTemplate = templates.find(t => t.id === activeTemplateId);
          if (activeTemplate?.saved) {
            console.log('✅ Widget dropped and added to template via API');

            // Refresh only the widgets for this template, not all templates
            // This avoids unnecessary calls to getTemplatesByUserWeb and getWidgetsByTemplateWeb for other templates
            await refreshTemplateWidgets(activeTemplateId);

            // showToast('Widget added to template');
          } else {
            console.log('✅ Widget dropped and added to local template');
            // No toast for local-only changes
          }
        } catch (error) {
          console.error('Failed to add widget to template:', error);
          showToast('Failed to add widget to template');
        }
      }
    }

    setDragOverPosition(null);
    setDraggedWidget(null);
  };

  const getTemplateWidgetSettings = (position: string): Record<string, unknown> | null => {
    const template = templates.find(t => t.id === activeTemplateId);

    // Convert grid position format (g22_1) to area format (area-1) if needed
    // Pattern: g{layout}_{cellIndex} -> area-{cellIndex}
    let normalizedPosition = position;
    if (position.match(/^g\d+_\d+$/)) {
      // Extract the cell index from format like "g22_1" -> "area-1"
      const cellIndex = position.split('_')[1];
      normalizedPosition = `area-${cellIndex}`;
    }

    // Try to find widget by normalized position first, then fallback to original position
    let widgetFromTemplate = template?.widgets.find(w => w.position === normalizedPosition);
    if (!widgetFromTemplate && position !== normalizedPosition) {
      // Fallback to original position if normalized didn't match
      widgetFromTemplate = template?.widgets.find(w => w.position === position);
    }

    return (widgetFromTemplate?.settings as Record<string, unknown> | undefined) ?? null;
  };

  // Enforce premium locking UX for widgets marked as inaccessible by the API.
  const shouldEnforcePremiumLocks = true;

  // Exclude specific user from premium locks
  const EXCLUDED_USER_EMAIL = 'dee@pmt.com';
  const isExcludedUser = user?.email?.toLowerCase() === EXCLUDED_USER_EMAIL.toLowerCase();

  // Get user's plan name from user.role (which contains LoggedInPlanName)
  // Check if user has premium access (Pro or Enterprise plan)
  const hasPremiumAccess = user?.role
    ? user.role.toLowerCase().includes('pro') || user.role.toLowerCase().includes('enterprise')
    : false;

  const isWidgetAccessRestricted = (position: string): boolean => {
    // If user is excluded, never show the overlay
    if (isExcludedUser) {
      return false;
    }

    // If user has premium access (Pro/Enterprise), they should have access regardless of accessStatus
    if (hasPremiumAccess) {
      return false;
    }

    const templateSettings = getTemplateWidgetSettings(position);
    if (!templateSettings) {
      return false;
    }

    const accessStatus = (templateSettings as { accessStatus?: unknown }).accessStatus;
    const widget = getWidget(position);
    const templateWidget = activeTemplate?.widgets.find(w => w.position === position);

    // Enhanced debug logging for FX Cross Rates and Currency Strength widgets
    if (widget === 'fx-cross-rates' || widget === 'currency-strength' ||
      templateWidget?.id === 'fx-cross-rates' || templateWidget?.id === 'currency-strength') {
      // console.log('🔍 [Access Control Debug] Checking widget:', {
      //   position,
      //   widgetName: widget,
      //   widgetNameFromTemplate: templateWidget?.name,
      //   widgetIdFromTemplate: templateWidget?.id,
      //   accessStatus,
      //   accessStatusType: typeof accessStatus,
      //   hasPremiumAccess,
      //   userRole: user?.role,
      //   templateSettings: templateSettings,
      //   allWidgetsInTemplate: activeTemplate?.widgets.map(w => ({
      //     position: w.position,
      //     name: w.name,
      //     id: w.id,
      //     accessStatus: (w.settings as { accessStatus?: unknown })?.accessStatus
      //   }))
      // });
    }

    // Only check accessStatus if it's a string and not empty
    // If accessStatus is undefined, null, or empty string, allow access (default behavior)
    if (typeof accessStatus === 'string') {
      const normalizedStatus = accessStatus.trim().toLowerCase();
      // Only restrict if explicitly set to "no access"
      // Empty string, undefined, or any other value should allow access
      if (normalizedStatus === 'no access') {
        // Debug logging to help identify access control issues
        console.log('🔒 [Access Control] Widget restricted:', {
          position,
          widgetName: widget,
          widgetNameFromTemplate: templateWidget?.name,
          widgetIdFromTemplate: templateWidget?.id,
          accessStatus,
          normalizedStatus,
          hasPremiumAccess,
          userRole: user?.role,
          templateSettings: templateSettings,
          allWidgetsInTemplate: activeTemplate?.widgets.map(w => ({
            position: w.position,
            name: w.name,
            id: w.id,
            accessStatus: (w.settings as { accessStatus?: unknown })?.accessStatus
          }))
        });
        return true;
      }
    }

    // Default: allow access if accessStatus is not explicitly "no access"
    return false;
  };

  const getWidget = (position: string) => {
    const activeTemplate = templates.find(t => t.id === activeTemplateId);
    if (!activeTemplate) return null;

    const widget = activeTemplate.widgets.find(w => w.position === position);
    const widgetName = widget?.name || null;

    return widgetName;
  };

  const renderWidget = (widgetId: string, position: string) => {
    // Normalize widget name to ID if needed (e.g., "FX Options Risk Reversals" -> "risk-reversals")
    let normalizedWidgetId = widgetId;

    // Special cases FIRST: Handle template-saved names that don't match actual IDs
    if (widgetId === 'fx-options-risk-reversals') {
      normalizedWidgetId = 'risk-reversals';
    } else if (widgetId === 'fx-options-volatility-levels') {
      normalizedWidgetId = 'fx-volatility-levels';
    } else if (widgetId === 'dmx-statistic-table' || widgetId === 'dmx-statistics-table') {
      // Handle both singular and plural forms
      normalizedWidgetId = 'dmx-statistics-table';
    } else if (widgetId === 'tab-menu-widget' || widgetId === 'Tab Menu Widget') {
      // Handle Tab Menu Widget alias
      normalizedWidgetId = 'tabbed-widget';
    } else if (widgetId === 'smart-bias-history') {
      // Handle Smart Bias History (renamed from Smart Bias Chart)
      normalizedWidgetId = 'smart-bias-chart';
    }
    // If widgetId looks like a name (has spaces or capital letters), try to find by name first
    else if (widgetId && (widgetId.includes(' ') || /[A-Z]/.test(widgetId))) {
      const normalizedName = widgetId.toLowerCase().replace(/\s+/g, '-');

      // Try to find widget by normalized name
      let foundWidget = availableWidgets.find(w => {
        const widgetNameNormalized = w.name.toLowerCase().replace(/\s+/g, '-');
        return widgetNameNormalized === normalizedName || w.id === normalizedName;
      });

      // Special cases: Handle template-saved names that don't match normalized names
      if (!foundWidget && normalizedName === 'fx-options-risk-reversals') {
        foundWidget = availableWidgets.find(w => w.id === 'risk-reversals');
        if (foundWidget) {
          normalizedWidgetId = 'risk-reversals';
        }
      } else if (!foundWidget && normalizedName === 'fx-options-volatility-levels') {
        foundWidget = availableWidgets.find(w => w.id === 'fx-volatility-levels');
        if (foundWidget) {
          normalizedWidgetId = 'fx-volatility-levels';
        }
      } else if (!foundWidget && (normalizedName === 'dmx-statistic-table' || normalizedName === 'dmx-statistics-table')) {
        // Handle both singular and plural forms of DMX Statistic(s) Table
        foundWidget = availableWidgets.find(w => w.id === 'dmx-statistics-table');
        if (foundWidget) {
          normalizedWidgetId = 'dmx-statistics-table';
        }
      } else if (!foundWidget && normalizedName === 'tab-menu-widget') {
        // Handle Tab Menu Widget -> Tabbed Widget
        foundWidget = availableWidgets.find(w => w.id === 'tabbed-widget');
        if (foundWidget) {
          normalizedWidgetId = 'tabbed-widget';
        }
      } else if (!foundWidget && normalizedName === 'smart-bias-history') {
        // Handle Smart Bias History (renamed from Smart Bias Chart) -> smart-bias-chart
        foundWidget = availableWidgets.find(w => w.id === 'smart-bias-chart');
        if (foundWidget) {
          normalizedWidgetId = 'smart-bias-chart';
        }
      }

      // If found by name, use its ID
      if (foundWidget) {
        normalizedWidgetId = foundWidget.id;
      }
    }

    const widget = availableWidgets.find(w => w.id === normalizedWidgetId);
    if (!widget) {
      console.warn('🔍 [BloombergDashboard] Widget not found:', {
        originalWidgetId: widgetId,
        normalizedWidgetId,
        availableWidgetIds: availableWidgets.map(w => w.id),
        position
      });
      return null;
    }

    const WidgetComponent = WidgetComponents[normalizedWidgetId];
    if (!WidgetComponent) {
      console.warn('🔍 [BloombergDashboard] Widget component not found:', {
        originalWidgetId: widgetId,
        normalizedWidgetId,
        widgetName: widget.name,
        availableComponents: Object.keys(WidgetComponents),
        position
      });
    }

    // Debug logging for supply-demand-areas and high-low-points widgets (including aliases)


    const isRestricted = shouldEnforcePremiumLocks && isWidgetAccessRestricted(position);

    if (isRestricted) {
      return (
        <div className="relative h-full w-full overflow-hidden">
          <LockedWidgetOverlay
            onRemove={() => handleRemoveWidget(position)}
            widgetName={widget.name}
          />
        </div>
      );
    }

    if (!WidgetComponent) {
      return (
        <div className="w-full h-full bg-widget-body border border-border rounded-none flex flex-col">
          <WidgetHeader
            title={widget.name}
            onRemove={() => handleRemoveWidget(position)}
          />
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>{widget.description}</p>
              <p className="text-xs mt-2">Coming soon</p>
            </div>
          </div>
        </div>
      );
    }

    const isActiveWidget = settingsWidgetPosition === position && settingsDialogOpen;

    // Get the actual customDashboardWidgetID for this widget from the template
    const templateWidget = activeTemplate?.widgets.find(w => w.position === position);
    const customDashboardWidgetID = templateWidget?.settings?.customDashboardWidgetID as number | undefined;
    // Use customDashboardWidgetID if available, otherwise fall back to templateId-position format
    const wgidProp = customDashboardWidgetID ? String(customDashboardWidgetID) : `${activeTemplateId}-${position}`;

    // Helper function to generate additionalSettings for price-chart widget from current settings
    const getAdditionalSettingsForPriceChart = (): string | undefined => {
      const currentSettings = getWidgetSettings(position);
      if (normalizedWidgetId === 'price-chart' && currentSettings) {
        // Convert chart style to number
        const chartStyleTypeToNumber = (style: string | undefined): string => {
          const map: Record<string, string> = {
            "candlestick": "1",
            "area": "2",
            "line": "3",
          };
          return map[style || "candlestick"] || "1";
        };

        // Convert boolean to show volume number
        const showVolumeBooleanToNumber = (show: boolean | undefined): string => {
          return show ? "1" : "2";
        };

        const chartStyleNum = chartStyleTypeToNumber(currentSettings.chartType);
        const showVolumeNum = showVolumeBooleanToNumber(currentSettings.showVolume);
        const timeframe = currentSettings.timeframe || "1h";
        return `${chartStyleNum}|${showVolumeNum}|${timeframe}`;
      }
      // For other widgets or if no settings, use the value from template
      return templateWidget?.settings?.additionalSettings as string | undefined;
    };

    // Console log the wgid being passed to widget
    // if (customDashboardWidgetID) {
    //   console.log('✅ Passing Widget ID (wgid) to component:', {
    //     widgetId: customDashboardWidgetID,
    //     wgid: wgidProp,
    //     widgetName: widgetId,
    //     position: position,
    //     templateId: activeTemplateId
    //   });
    // }

    return (
      <div
        className="relative h-full w-full overflow-hidden"
        data-wgid={customDashboardWidgetID ? customDashboardWidgetID.toString() : undefined}
        data-tour={normalizedWidgetId === 'price-chart' ? 'main-chart' : normalizedWidgetId === 'watchlist' ? 'watchlist' : normalizedWidgetId === 'news' ? 'news-widget' : undefined}
      >
        {/* Widget with Blur Effect */}
        <div className={`h-full w-full transition-all duration-300 ${isActiveWidget ? "blur-sm" : "blur-0"}`}>
          <div className="w-full h-full bg-widget-body border border-border rounded-none overflow-hidden" data-tour={normalizedWidgetId === 'price-chart' || normalizedWidgetId === 'watchlist' || normalizedWidgetId === 'news' ? 'widget-header' : undefined}>
            <WidgetComponent
              wgid={wgidProp}
              onRemove={() => handleRemoveWidget(position)}
              {...(shouldShowSettingsIcon(normalizedWidgetId, isActiveTemplateDetailsTemplate) ? {
                onSettings: () => handleWidgetSettings(position, normalizedWidgetId)
              } : {})}
              onFullscreen={() => handleFullscreenWidget(position, normalizedWidgetId)}
              isSymbolLocked={isActiveTemplateDetailsTemplate}
              settings={(() => {
                const mergedSettings = {
                  ...getWidgetSettings(position),
                  // Always include customDashboardWidgetID so TabbedWidget knows its ID immediately
                  ...(customDashboardWidgetID ? { customDashboardWidgetID } : {})
                };
                if (normalizedWidgetId === 'tabbed-widget' || normalizedWidgetId === 'tab-menu-widget') {
                  // console.log('📦 [BloombergDashboard] TabbedWidget settings:', {
                  //   position,
                  //   customDashboardWidgetID,
                  //   mergedSettings
                  // });
                }
                return mergedSettings;
              })()}
              additionalSettings={normalizedWidgetId === 'price-chart' ? getAdditionalSettingsForPriceChart() : templateWidget?.settings?.additionalSettings as string | undefined}
              {...(['price-chart', 'cot-positioning', 'cot-chart-view', 'smart-bias', 'smart-bias-chart', 'average-daily-range', 'average-range-histogram', 'dmx-overview', 'seasonality-performance-chart', 'seasonality-forecast-chart'].includes(normalizedWidgetId) ? {
                onSaveSettings: (() => {
                  const callback = createSaveSettingsCallback(position, normalizedWidgetId);
                  // console.log('🔧 [BloombergDashboard] Creating onSaveSettings callback for ' + normalizedWidgetId + ':', {
                  //   position,
                  //   widgetId,
                  //   callbackType: typeof callback
                  // });
                  return callback;
                })()
              } : {})}
            />
          </div>
        </div>

        {/* Slide-in Settings Panel */}
        <WidgetSettingsSlideIn
          isOpen={isActiveWidget}
          onClose={handleCloseWidgetSettings}
          widgetType={settingsWidgetType}
          widgetPosition={settingsWidgetPosition}
          widgetInstanceId={settingsWidgetInstanceId}
          currentSettings={getWidgetSettings(settingsWidgetPosition)}
          onSave={handleSaveWidgetSettings}
          isModuleLocked={isActiveTemplateDetailsTemplate}
          isSymbolLocked={isActiveTemplateDetailsTemplate}
        />
      </div>
    );
  };

  // Get the active template
  const activeTemplate = templates.find(template => template.id === activeTemplateId);
  
  // Check if the active template is a Details template (symbol-based like EURUSD, NASDAQ:AAPL)
  // Details templates should lock module and symbol settings to prevent changes
  const isActiveTemplateDetailsTemplate = activeTemplate?.name ? isDetailsTemplate(activeTemplate.name) : false;

  /**
   * Calculate grid sizes from saved widget coordinates
   * Uses dynamic system for all layouts
   * Checks templateGridSizesStorage first before falling back to coordinates or defaults
   */
  const calculateGridSizes = React.useCallback(
    (layout: string, template?: UserTemplate | undefined, templateId?: string) => {
      const currentTemplate = template || activeTemplate;
      const currentTemplateId = templateId || activeTemplateId;

      if (!currentTemplate || !currentTemplate.saved) {
        // Return default sizes for unsaved templates
        return getDefaultGridSizes(layout);
      }

      // FIRST: Check if we have stored grid sizes from API/localStorage
      try {
        const storedSizes = templateGridSizesStorage.getTemplateGridSizes(currentTemplateId);

        if (storedSizes && storedSizes.layoutType === layout && storedSizes.cellSizes.length > 0) {
          // Convert stored percentages array to gridSizes object format
          const percentages = storedSizes.cellSizes.map((cell: { width: number }) => cell.width);

          // Convert percentages array to gridSizes object format based on layout
          const gridSizesObj: Record<string, string> = {};

          if (layout === '2-grid-vertical' || layout === 'two-vertical') {
            gridSizesObj.left = `${percentages[0] || 50}%`;
            gridSizesObj.right = `${percentages[1] || (100 - (percentages[0] || 50))}%`;
          } else if (layout === '2-grid-horizontal' || layout === 'two-horizontal') {
            gridSizesObj.top = `${percentages[0] || 50}%`;
            gridSizesObj.bottom = `${percentages[1] || (100 - (percentages[0] || 50))}%`;
          } else if (layout === '3-grid-columns' || layout === 'three-vertical') {
            gridSizesObj.left = `${percentages[0] || 33.33}%`;
            gridSizesObj.middle = `${percentages[1] || 33.33}%`;
            gridSizesObj.right = `${percentages[2] || (100 - (percentages[0] || 33.33) - (percentages[1] || 33.33))}%`;
          } else if (layout === '3-grid-rows' || layout === 'three-horizontal') {
            gridSizesObj.top = `${percentages[0] || 33.33}%`;
            gridSizesObj.middle = `${percentages[1] || 33.33}%`;
            gridSizesObj.bottom = `${percentages[2] || (100 - (percentages[0] || 33.33) - (percentages[1] || 33.33))}%`;
          } else if (layout === '3-grid-left-large' || layout === 'three-left-right') {
            const rightTotal = percentages[0] ? (100 - percentages[0]) : 50;
            gridSizesObj.left = `${percentages[0] || 50}%`;
            gridSizesObj.right = `${rightTotal}%`;
            if (percentages.length >= 3) {
              // percentages[1] and percentages[2] are height percentages, not widths
              const rightTopHeight = (percentages[1] / (percentages[1] + percentages[2])) * 100;
              gridSizesObj.rightTop = `${rightTopHeight}%`;
              gridSizesObj.rightBottom = `${100 - rightTopHeight}%`;
            }
          } else if (layout === '3-grid-right-large' || layout === 'three-right-stack') {
            const leftTotal = percentages[2] ? (100 - percentages[2]) : 50;
            gridSizesObj.left = `${leftTotal}%`;
            gridSizesObj.right = `${percentages[2] || 50}%`;
            if (percentages.length >= 2) {
              // percentages[0] and percentages[1] are height percentages, not widths
              const leftTopHeight = (percentages[0] / (percentages[0] + percentages[1])) * 100;
              gridSizesObj.leftTop = `${leftTopHeight}%`;
              gridSizesObj.leftBottom = `${100 - leftTopHeight}%`;
            }
          } else if (layout === '4-grid' || layout === 'four-grid') {
            // For 4-grid, percentages format: [top height, topLeft width, topRight width, bottomLeft width, bottomRight width, bottom height]
            // If we have 6 values (new format with heights), use them
            // If we have 4 values (old format with only widths), use defaults for heights
            if (percentages.length >= 6) {
              gridSizesObj.top = `${percentages[0]}%`;
              gridSizesObj.topLeft = `${percentages[1]}%`;
              gridSizesObj.topRight = `${percentages[2]}%`;
              gridSizesObj.bottomLeft = `${percentages[3]}%`;
              gridSizesObj.bottomRight = `${percentages[4]}%`;
              gridSizesObj.bottom = `${percentages[5]}%`;
            } else if (percentages.length >= 4) {
              // Old format with only widths - use default heights
              gridSizesObj.top = '50%';
              gridSizesObj.bottom = '50%';
              gridSizesObj.topLeft = `${percentages[0]}%`;
              gridSizesObj.topRight = `${percentages[1]}%`;
              gridSizesObj.bottomLeft = `${percentages[2]}%`;
              gridSizesObj.bottomRight = `${percentages[3]}%`;
            }
          }

          // If we successfully converted stored sizes, return them
          if (Object.keys(gridSizesObj).length > 0) {
            return gridSizesObj;
          }
        }
      } catch (error) {
        console.warn('Error loading stored grid sizes, falling back to coordinates:', error);
      }

      // SECOND: Fall back to calculating from widget coordinates
      const widgets = currentTemplate.widgets;
      if (widgets.length === 0) {
        return getDefaultGridSizes(layout);
      }

      // Extract coordinates from widgets and validate they have all required properties
      const coordinates = widgets
        .map(widget => widget.settings?.coordinates)
        .filter((coord): coord is { top: number; left: number; width: number; height: number } => {
          if (coord == null || typeof coord !== 'object') return false;
          const c = coord as any;
          return typeof c.top === 'number' &&
            typeof c.left === 'number' &&
            typeof c.width === 'number' &&
            typeof c.height === 'number' &&
            !isNaN(c.top) &&
            !isNaN(c.left) &&
            !isNaN(c.width) &&
            !isNaN(c.height) &&
            c.width > 0 &&
            c.height > 0;
        });

      if (coordinates.length === 0) {
        return getDefaultGridSizes(layout);
      }

      // Use dynamic system for all layouts
      return calculateDynamicGridSizes(layout, coordinates);
    },
    [activeTemplate, activeTemplateId]
  );

  /**
   * Get default grid sizes for layouts
   * Uses dynamic system to get defaults from layout configuration
   */
  const getDefaultGridSizes = (layout: string) => {
    const layoutConfig = getLayoutConfigByName(layout);

    if (!layoutConfig) {
      return {};
    }

    const defaultSizes: Record<string, string> = {};

    // Apply default ratios from layout config
    layoutConfig.structure.splits.forEach(split => {
      const splitAreas = split.areas.map(areaGroup =>
        areaGroup.split(',').map(area => area.trim())
      );

      splitAreas.forEach((areaGroup, index) => {
        const ratio = split.ratio[index] || 50;

        if (split.direction === 'vertical') {
          if (areaGroup.includes('area-1')) {
            defaultSizes.left = `${ratio}%`;
          }
          if (areaGroup.includes('area-2')) {
            defaultSizes.right = `${ratio}%`;
          }
          if (areaGroup.includes('area-1,area-3')) {
            defaultSizes.left = `${ratio}%`;
          }
          if (areaGroup.includes('area-2,area-4')) {
            defaultSizes.right = `${ratio}%`;
          }
        } else if (split.direction === 'horizontal') {
          if (areaGroup.includes('area-1')) {
            defaultSizes.top = `${ratio}%`;
          }
          if (areaGroup.includes('area-3')) {
            defaultSizes.bottom = `${ratio}%`;
          }
          if (areaGroup.includes('area-1,area-2')) {
            defaultSizes.top = `${ratio}%`;
          }
          if (areaGroup.includes('area-3,area-4')) {
            defaultSizes.bottom = `${ratio}%`;
          }
        }
      });
    });

    return defaultSizes;
  };

  const renderGridArea = (position: string) => {
    const widgetId = getWidget(position);
    const hasWidget = !!widgetId;

    return (
      <div
        className={`w-full h-full bg-background relative group border grid-line-border hover:border-primary transition-colors duration-200 ${!hasWidget ? 'z-0' : ''
          }`}
        style={{ borderColor: 'var(--grid-line)', borderWidth: '1px' }}
        data-area={position.replace('area-', 'area')}
        data-position={position}
      >
        {hasWidget ? (
          <div
            className={`w-full h-full overflow-hidden transition-all ${dragOverPosition === position ? "ring-2 ring-primary ring-opacity-50" : ""
              }`}
            onDragOver={(e) => handleDragOver(e, position)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, position)}
          >
            {renderWidget(widgetId, position)}
          </div>
        ) : (
          <EmptyGridCell
            onAddWidget={() => {
              setTargetPosition(position);
              setIsWidgetPanelOpen(true);
            }}
            position={position}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            isDragOver={dragOverPosition === position}
          />
        )}
      </div>
    );
  };

  const currentLayout = activeTemplate?.layout || "3-grid-left-large";

  // Console log active template info on every render
  // useEffect(() => {
  //   if (activeTemplate) {
  //     console.log('📋 Active Template Rendered:', {
  //       templateId: activeTemplate.id,
  //       'data-templateid': activeTemplate.id,
  //       templateName: activeTemplate.name,
  //       layout: currentLayout,
  //       widgetCount: activeTemplate.widgets?.length || 0,
  //       timestamp: new Date().toISOString()
  //     });
  //   }
  // }, [activeTemplate?.id, activeTemplate?.name, currentLayout, activeTemplate?.widgets?.length]);

  // Helper function to convert percentages array to gridSizes object
  const convertPercentagesToGridSizes = (layout: string, percentages: number[]): Record<string, string> => {
    const gridSizesObj: Record<string, string> = {};

    if (layout === '2-grid-vertical' || layout === 'two-vertical') {
      gridSizesObj.left = `${percentages[0] || 50}%`;
      gridSizesObj.right = `${percentages[1] || (100 - (percentages[0] || 50))}%`;
    } else if (layout === '2-grid-horizontal' || layout === 'two-horizontal') {
      gridSizesObj.top = `${percentages[0] || 50}%`;
      gridSizesObj.bottom = `${percentages[1] || (100 - (percentages[0] || 50))}%`;
    } else if (layout === '3-grid-columns' || layout === 'three-vertical') {
      gridSizesObj.left = `${percentages[0] || 33.33}%`;
      gridSizesObj.middle = `${percentages[1] || 33.33}%`;
      gridSizesObj.right = `${percentages[2] || (100 - (percentages[0] || 33.33) - (percentages[1] || 33.33))}%`;
    } else if (layout === '3-grid-rows' || layout === 'three-horizontal') {
      gridSizesObj.top = `${percentages[0] || 33.33}%`;
      gridSizesObj.middle = `${percentages[1] || 33.33}%`;
      gridSizesObj.bottom = `${percentages[2] || (100 - (percentages[0] || 33.33) - (percentages[1] || 33.33))}%`;
    } else if (layout === '3-grid-left-large' || layout === 'three-left-right') {
      const rightTotal = percentages[1] ? (100 - percentages[0]) : 50;
      gridSizesObj.left = `${percentages[0] || 50}%`;
      gridSizesObj.right = `${rightTotal}%`;
      if (percentages.length >= 3) {
        const rightTopPercent = (percentages[1] / (percentages[1] + percentages[2])) * rightTotal;
        gridSizesObj.rightTop = `${rightTopPercent}%`;
        gridSizesObj.rightBottom = `${rightTotal - rightTopPercent}%`;
      }
    } else if (layout === '3-grid-right-large' || layout === 'three-right-stack') {
      const leftTotal = percentages[0] ? (100 - percentages[2]) : 50;
      gridSizesObj.left = `${leftTotal}%`;
      gridSizesObj.right = `${percentages[2] || 50}%`;
      if (percentages.length >= 2) {
        const leftTopPercent = (percentages[0] / (percentages[0] + percentages[1])) * leftTotal;
        gridSizesObj.leftTop = `${leftTopPercent}%`;
        gridSizesObj.leftBottom = `${leftTotal - leftTopPercent}%`;
      }
    } else if (layout === '4-grid' || layout === 'four-grid') {
      // For 4-grid, percentages format: [top height, topLeft width, topRight width, bottomLeft width, bottomRight width, bottom height]
      // If we have 6 values (new format with heights), use them
      // If we have 4 values (old format with only widths), use defaults for heights
      if (percentages.length >= 6) {
        gridSizesObj.top = `${percentages[0]}%`;
        gridSizesObj.topLeft = `${percentages[1]}%`;
        gridSizesObj.topRight = `${percentages[2]}%`;
        gridSizesObj.bottomLeft = `${percentages[3]}%`;
        gridSizesObj.bottomRight = `${percentages[4]}%`;
        gridSizesObj.bottom = `${percentages[5]}%`;
      } else if (percentages.length >= 4) {
        // Old format with only widths - use default heights
        gridSizesObj.top = '50%';
        gridSizesObj.bottom = '50%';
        gridSizesObj.topLeft = `${percentages[0]}%`;
        gridSizesObj.topRight = `${percentages[1]}%`;
        gridSizesObj.bottomLeft = `${percentages[2]}%`;
        gridSizesObj.bottomRight = `${percentages[3]}%`;
      }
    } else if (layout === '4-grid-columns' || layout === 'four-vertical') {
      gridSizesObj.left = `${percentages[0] || 25}%`;
      gridSizesObj.leftMiddle = `${percentages[1] || 25}%`;
      gridSizesObj.rightMiddle = `${percentages[2] || 25}%`;
      gridSizesObj.right = `${percentages[3] || (100 - (percentages[0] || 25) - (percentages[1] || 25) - (percentages[2] || 25))}%`;
    } else if (layout === '4-grid-rows' || layout === 'four-horizontal') {
      gridSizesObj.top = `${percentages[0] || 25}%`;
      gridSizesObj.topMiddle = `${percentages[1] || 25}%`;
      gridSizesObj.bottomMiddle = `${percentages[2] || 25}%`;
      gridSizesObj.bottom = `${percentages[3] || (100 - (percentages[0] || 25) - (percentages[1] || 25) - (percentages[2] || 25))}%`;
    } else if (layout === '5-grid-columns' || layout === 'five-vertical') {
      gridSizesObj.left = `${percentages[0] || 20}%`;
      gridSizesObj.leftMiddle1 = `${percentages[1] || 20}%`;
      gridSizesObj.leftMiddle2 = `${percentages[2] || 20}%`;
      gridSizesObj.rightMiddle = `${percentages[3] || 20}%`;
      gridSizesObj.right = `${percentages[4] || (100 - (percentages[0] || 20) - (percentages[1] || 20) - (percentages[2] || 20) - (percentages[3] || 20))}%`;
    } else if (layout === '5-grid-rows' || layout === 'five-horizontal') {
      gridSizesObj.top = `${percentages[0] || 20}%`;
      gridSizesObj.topMiddle1 = `${percentages[1] || 20}%`;
      gridSizesObj.topMiddle2 = `${percentages[2] || 20}%`;
      gridSizesObj.bottomMiddle = `${percentages[3] || 20}%`;
      gridSizesObj.bottom = `${percentages[4] || (100 - (percentages[0] || 20) - (percentages[1] || 20) - (percentages[2] || 20) - (percentages[3] || 20))}%`;
    } else if (layout === '8-grid-columns') {
      gridSizesObj.left = `${percentages[0] || 12.5}%`;
      gridSizesObj.leftMiddle1 = `${percentages[1] || 12.5}%`;
      gridSizesObj.leftMiddle2 = `${percentages[2] || 12.5}%`;
      gridSizesObj.leftMiddle3 = `${percentages[3] || 12.5}%`;
      gridSizesObj.rightMiddle3 = `${percentages[4] || 12.5}%`;
      gridSizesObj.rightMiddle2 = `${percentages[5] || 12.5}%`;
      gridSizesObj.rightMiddle1 = `${percentages[6] || 12.5}%`;
      gridSizesObj.right = `${percentages[7] || (100 - (percentages[0] || 12.5) - (percentages[1] || 12.5) - (percentages[2] || 12.5) - (percentages[3] || 12.5) - (percentages[4] || 12.5) - (percentages[5] || 12.5) - (percentages[6] || 12.5))}%`;
    } else if (layout === '8-grid-rows') {
      gridSizesObj.top = `${percentages[0] || 12.5}%`;
      gridSizesObj.topMiddle1 = `${percentages[1] || 12.5}%`;
      gridSizesObj.topMiddle2 = `${percentages[2] || 12.5}%`;
      gridSizesObj.topMiddle3 = `${percentages[3] || 12.5}%`;
      gridSizesObj.bottomMiddle3 = `${percentages[4] || 12.5}%`;
      gridSizesObj.bottomMiddle2 = `${percentages[5] || 12.5}%`;
      gridSizesObj.bottomMiddle1 = `${percentages[6] || 12.5}%`;
      gridSizesObj.bottom = `${percentages[7] || (100 - (percentages[0] || 12.5) - (percentages[1] || 12.5) - (percentages[2] || 12.5) - (percentages[3] || 12.5) - (percentages[4] || 12.5) - (percentages[5] || 12.5) - (percentages[6] || 12.5))}%`;
    }

    return gridSizesObj;
  };

  const parsePercentageValue = (value?: string): number | undefined => {
    if (!value) {
      return undefined;
    }
    const numeric = parseFloat(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  };

  const buildGridSizesArray = (layout: string, gridSizeMap: Record<string, string>): number[] => {
    const series = (...keys: string[]): number[] => keys
      .map((key) => parsePercentageValue(gridSizeMap[key]))
      .filter((value): value is number => typeof value === 'number');

    let values: number[] = [];

    switch (layout) {
      case '2-grid-vertical':
      case 'two-vertical':
        values = series('left', 'right');
        break;
      case '2-grid-horizontal':
      case 'two-horizontal':
        values = series('top', 'bottom');
        break;
      case '3-grid-columns':
      case 'three-vertical':
        values = series('left', 'middle', 'right');
        break;
      case '3-grid-rows':
      case 'three-horizontal':
        values = series('top', 'middle', 'bottom');
        break;
      case '3-grid-left-large':
      case 'three-left-right':
        values = series('left', 'rightTop', 'rightBottom');
        break;
      case '3-grid-right-large':
      case 'three-right-stack':
        values = series('leftTop', 'leftBottom', 'right');
        break;
      case '3-grid-bottom-large':
      case 'three-top-bottom':
        values = series('topLeft', 'topRight', 'bottom');
        break;
      case '3-grid-top-large':
        values = series('top', 'bottomLeft', 'bottomRight');
        break;
      case '4-grid':
        values = series('topLeft', 'topRight', 'bottomLeft', 'bottomRight');
        break;
      case '4-grid-columns':
      case 'four-vertical':
        values = series('col1', 'col2', 'col3', 'col4');
        if (!values.length) {
          values = series('left', 'leftMiddle', 'rightMiddle', 'right');
        }
        break;
      case '4-grid-rows':
      case 'four-horizontal':
        values = series('row1', 'row2', 'row3', 'row4');
        if (!values.length) {
          values = series('top', 'topMiddle', 'bottomMiddle', 'bottom');
        }
        break;
      default: {
        const parsed = Object
          .values(gridSizeMap)
          .map((value) => parsePercentageValue(value))
          .filter((value): value is number => typeof value === 'number');
        values = parsed;
        break;
      }
    }

    // Ensure we only return finite numbers and preserve order
    return values.filter((value) => Number.isFinite(value));
  };

  // State for grid sizes - make it reactive to storage updates
  // Initialize by checking storage first (for persisted data from previous sessions)
  const [gridSizes, setGridSizes] = useState<Record<string, string>>(() => {
    // On initial load, check storage first before falling back to defaults
    if (activeTemplateId && activeTemplate?.saved) {
      try {
        const storedSizes = templateGridSizesStorage.getTemplateGridSizes(activeTemplateId);
        if (storedSizes && storedSizes.layoutType === currentLayout && storedSizes.cellSizes.length > 0) {
          // Convert stored sizes to gridSizes format
          const percentages = storedSizes.cellSizes.map((cell: { width: number }) => cell.width);
          const gridSizesObj = convertPercentagesToGridSizes(currentLayout, percentages);
          if (Object.keys(gridSizesObj).length > 0) {
            return gridSizesObj;
          }
        }
      } catch (error) {
        console.warn('Error checking storage on initial load:', error);
      }
    }
    // Fallback to calculating from coordinates or defaults
    return calculateGridSizes(currentLayout, activeTemplate, activeTemplateId);
  });

  // Update grid sizes when layout or template changes (but only if storage doesn't have values)
  useEffect(() => {
    // Don't update if we're currently loading grid positions from API
    if (isSavingGridPositionsRef.current) {
      return;
    }

    // Check if storage has values first - if so, use those instead of recalculating
    if (activeTemplateId && activeTemplate?.saved) {
      try {
        const storedSizes = templateGridSizesStorage.getTemplateGridSizes(activeTemplateId);
        if (storedSizes && storedSizes.layoutType === currentLayout && storedSizes.cellSizes.length > 0) {
          const percentages = storedSizes.cellSizes.map((cell: { width: number }) => cell.width);
          const gridSizesObj = convertPercentagesToGridSizes(currentLayout, percentages);
          if (Object.keys(gridSizesObj).length > 0) {
            setGridSizes(gridSizesObj);
            return; // Don't recalculate if we have stored values
          }
        }
      } catch (error) {
        console.warn('Error checking storage in effect:', error);
      }
    }

    // Only recalculate if we don't have stored values
    const newGridSizes = calculateGridSizes(currentLayout, activeTemplate, activeTemplateId);
    setGridSizes(newGridSizes);
  }, [currentLayout, activeTemplateId, activeTemplate?.saved, activeTemplate?.widgets, activeTemplate, calculateGridSizes]);

  // Listen for gridSizesUpdated events (dispatched when API loads grid positions)
  useEffect(() => {
    const handleGridSizesUpdated = () => {
      // Get fresh activeTemplate to avoid stale closure
      const currentActiveTemplate = templates.find(t => t.id === activeTemplateId);

      // Check storage first - it should have the newly loaded values
      if (activeTemplateId && currentActiveTemplate?.saved) {
        try {
          const storedSizes = templateGridSizesStorage.getTemplateGridSizes(activeTemplateId);
          if (storedSizes && storedSizes.layoutType === currentLayout && storedSizes.cellSizes.length > 0) {
            const percentages = storedSizes.cellSizes.map((cell: { width: number }) => cell.width);
            const gridSizesObj = convertPercentagesToGridSizes(currentLayout, percentages);
            if (Object.keys(gridSizesObj).length > 0) {
              setGridSizes(gridSizesObj);
              return;
            }
          }
        } catch (error) {
          console.warn('Error loading from storage after event:', error);
        }
      }

      // Fallback to calculating
      const newGridSizes = calculateGridSizes(currentLayout, currentActiveTemplate, activeTemplateId);
      setGridSizes(newGridSizes);
    };

    window.addEventListener('gridSizesUpdated', handleGridSizesUpdated);

    return () => {
      window.removeEventListener('gridSizesUpdated', handleGridSizesUpdated);
    };
  }, [currentLayout, activeTemplateId, templates, calculateGridSizes]);

  // Determine if current tab is saved
  const isCurrentTabSaved = activeTemplate?.saved || false;

  // Don't render grid layout until we have a valid active template
  const hasValidActiveTemplate = activeTemplate && activeTemplateId;

  // Debug logging
  // console.log('BloombergDashboard state:', {
  //   templatesCount: templates.length,
  //   activeTemplateId,
  //   activeTemplate: activeTemplate ? 'found' : 'not found',
  //   currentLayout,
  //   hasValidActiveTemplate,
  //   templates: templates.map(t => ({ id: t.id, name: t.name, layout: t.layout }))
  // });

  /**
   * Handle dynamic layout resize preview (while dragging)
   * Just logs the size for debugging, doesn't save
   */
  const handleDynamicResizePreview = (areaId: string, newSize: any) => {
    const activeTemplate = templates.find(t => t.id === activeTemplateId);
    if (!activeTemplate) return;

    // Calculate what the grid sizes would be with this resize
    const widget = activeTemplate.widgets.find(w => w.position === areaId);
    if (!widget) return;

    // Create temporary updated widgets to calculate grid sizes
    const tempUpdatedWidgets = activeTemplate.widgets.map(w =>
      w.id === widget.id
        ? { ...w, settings: { ...w.settings, coordinates: newSize } }
        : w
    );

    const widgetCoordinates = tempUpdatedWidgets
      .map(w => w.settings?.coordinates)
      .filter(Boolean) as Array<{ top: number; left: number; width: number; height: number }>;

    if (widgetCoordinates && widgetCoordinates.length > 0) {
      calculateDynamicGridSizes(activeTemplate.layout, widgetCoordinates);
    }
  };

  /**
   * Handle dynamic layout resize stop (when drag ends)
   * Updates coordinates and saves to API
   * NOTE: Grid positions should be saved even if cells are empty (no widgets)
   * Includes debouncing and duplicate prevention
   */
  const handleDynamicResizeStop = async (areaId: string, newSize: any) => {
    // OPTIMIZATION: Skip saving for nested layouts that have custom onSaveRequired handlers
    // These layouts handle their own saving in DynamicGridRenderer to prevent duplicate API calls
    const activeTemplate = templates.find(t => t.id === activeTemplateId);
    if (activeTemplate) {
      const nestedLayoutsWithCustomSave = [
        '3-grid-left-large',
        '3-grid-right-large',
        '3-grid-top-large',
        '3-grid-bottom-large',
        '4-grid',
        '4-grid-top-large',
        '4-grid-left-large',
        '4-grid-right-large',
        '4-grid-bottom-large',
        '5-grid-complex',
        '6-grid-2x3',
        '6-grid-3x2',
        '6-grid-left-large',
        '7-grid-complex1',
        '7-grid-left',
        '7-grid-complex2',
        '7-grid-large',
        '8-grid-2x4',
        '8-grid-4x2',
        '9-grid',
        '12-grid-3x4',
        '12-grid-4x3',
        '16-grid',
        '24-grid-4x6',
        '24-grid-6x4',
        '24-grid-3x8',
        '24-grid-8x3',
        '28-grid-4x7',
        '28-grid-7x4',
        '32-grid-4x8',
        '32-grid-8x4'
      ];

      if (nestedLayoutsWithCustomSave.includes(activeTemplate.layout)) {
        return;
      }
    }

    // Prevent concurrent saves
    if (isSavingGridPositionsRef.current) {
      return;
    }

    // Clear any pending debounce timer
    if (saveDebounceTimerRef.current) {
      clearTimeout(saveDebounceTimerRef.current);
      saveDebounceTimerRef.current = null;
    }

    // Debounce the save operation to prevent rapid multiple saves
    // This will be called after a short delay, giving time for DOM updates
    return new Promise<void>((resolve) => {
      saveDebounceTimerRef.current = setTimeout(async () => {
        await performGridSave();
        resolve();
      }, 200); // 200ms debounce delay
    });
  };

  const performGridSave = async () => {

    // Update the widget coordinates in the template
    const activeTemplate = templates.find(t => t.id === activeTemplateId);

    if (!activeTemplate) {
      return;
    }

    // IMPORTANT: Grid positions should be saved even if cells don't have widgets!
    // Get layout config to know all grid areas
    const layoutConfig = getLayoutConfigByName(activeTemplate.layout);
    if (!layoutConfig) {
      return;
    }

    // Get all grid areas from the layout structure
    const allGridAreas = layoutConfig.structure.areas.map(area => area.id);

    // Use setTimeout to ensure DOM has updated after resize
    // Increased delay to ensure all DOM updates are complete
    await new Promise(resolve => setTimeout(resolve, 200));

    // Find ALL elements with data-position in the grid container (including empty cells)
    // Try multiple selectors to find the grid container
    let gridContainer = document.querySelector('.flex-1.bg-background.overflow-hidden');
    if (!gridContainer) {
      gridContainer = document.querySelector('[data-dashboard-container]');
    }
    if (!gridContainer) {
      gridContainer = document.body;
    }

    const allGridElements = Array.from(gridContainer.querySelectorAll('[data-position]')) as HTMLElement[];

    // Capture coordinates for ALL grid areas (not just ones with widgets)
    const allGridCoordinates: Array<{ top: number; left: number; width: number; height: number }> = [];

    // Collect coordinates for all grid areas in order
    for (const areaId of allGridAreas) {
      const gridElement = allGridElements.find(el => {
        const position = el.getAttribute('data-position');
        return position === areaId;
      });

      if (gridElement) {
        // Get bounding rect for more accurate measurements
        const rect = gridElement.getBoundingClientRect();
        const containerRect = gridContainer.getBoundingClientRect();

        // Calculate relative coordinates
        const coords = {
          top: rect.top - containerRect.top,
          left: rect.left - containerRect.left,
          width: rect.width,
          height: rect.height
        };

        // Only add if element has valid dimensions
        if (coords.width > 0 && coords.height > 0) {
          allGridCoordinates.push(coords);
        }
      }
    }

    // Update widget coordinates if widgets exist (for widget persistence)
    const updatedWidgets = activeTemplate.widgets.map(w => {
      const gridElement = allGridElements.find(el => el.getAttribute('data-position') === w.position);

      if (gridElement && gridElement.offsetWidth > 0 && gridElement.offsetHeight > 0) {
        return {
          ...w,
          settings: {
            ...w.settings,
            coordinates: {
              top: gridElement.offsetTop,
              left: gridElement.offsetLeft,
              width: gridElement.offsetWidth,
              height: gridElement.offsetHeight
            }
          }
        };
      }
      return w;
    });

    // Update widget settings with new coordinates (if any widgets exist)
    if (updatedWidgets.length > 0) {
      await updateTemplate(activeTemplateId, {
        widgets: updatedWidgets
      });
    }

    // Save grid sizes to localStorage for ALL templates (saved or unsaved)
    // This ensures grid sizes persist during the session
    if (allGridCoordinates && allGridCoordinates.length > 0) {
      try {
        // Try to get grid sizes from templateGridSizesStorage first (most accurate, includes all cells)
        const { templateGridSizesStorage } = await import('@/lib/templateGridSizes');
        const savedGridSizes = templateGridSizesStorage.getTemplateGridSizes(activeTemplateId);

        let gridSizesArray: number[] = [];

        if (savedGridSizes && savedGridSizes.cellSizes.length > 0) {
          // Use stored cell sizes (most accurate, includes ALL cells)
          gridSizesArray = savedGridSizes.cellSizes.map(cell => cell.width);
          console.log('💾 [GridPosition] Using stored cell sizes for localStorage save:', gridSizesArray.length, 'cells');
        } else if (allGridCoordinates.length > 0) {
          // Calculate from coordinates - extract ALL cell sizes based on layout type
          const layout = activeTemplate.layout;

          // For column-based layouts, calculate widths directly from coordinates
          const isColumnLayout = layout === '2-grid-vertical' || layout === 'two-vertical' ||
            layout === '3-grid-columns' || layout === 'three-vertical' ||
            layout === '4-grid-columns' || layout === 'four-vertical' ||
            layout === '5-grid-columns' || layout === 'five-vertical' ||
            layout === '6-grid-2x3' ||
            layout === '6-grid-3x2' ||
            layout === '6-grid-left-large' ||
            layout === '7-grid-left' ||
            layout === '7-grid-complex1' ||
            layout === '7-grid-complex2' ||
            layout === '8-grid-columns' ||
            layout === '9-grid' ||
            layout === '12-grid-3x4' ||
            layout === '12-grid-4x3' ||
            layout === '16-grid' ||
            layout === '24-grid-columns' ||
            layout === '24-grid-6x4' ||
            layout === '28-grid-7x4' ||
            layout === '32-grid-8x4';

          // For row-based layouts, calculate heights directly from coordinates
          const isRowLayout = layout === '2-grid-horizontal' || layout === 'two-horizontal' ||
            layout === '3-grid-rows' || layout === 'three-horizontal' ||
            layout === '4-grid-rows' || layout === 'four-horizontal' ||
            layout === '5-grid-rows' || layout === 'five-horizontal' ||
            layout === '6-grid-rows' ||
            layout === '7-grid-large' ||
            layout === '8-grid-rows' ||
            layout === '24-grid-rows' ||
            layout === '24-grid-4x6' ||
            layout === '28-grid-4x7' ||
            layout === '32-grid-4x8';

          if (isColumnLayout) {
            // Sort coordinates by left position (horizontal order)
            const sortedCoords = [...allGridCoordinates].sort((a, b) => a.left - b.left);
            const totalWidth = sortedCoords.reduce((sum, coord) => sum + coord.width, 0);

            if (totalWidth > 0) {
              // Calculate width percentages for each column
              gridSizesArray = sortedCoords.map(coord =>
                parseFloat(((coord.width / totalWidth) * 100).toFixed(4))
              );

              // Ensure they sum to 100% (adjust last one if needed due to rounding)
              const total = gridSizesArray.reduce((sum, val) => sum + val, 0);
              if (Math.abs(total - 100) > 0.01) {
                gridSizesArray[gridSizesArray.length - 1] = parseFloat(
                  (gridSizesArray[gridSizesArray.length - 1] + (100 - total)).toFixed(4)
                );
              }
            }
          } else if (isRowLayout) {
            // Sort coordinates by top position (vertical order)
            const sortedCoords = [...allGridCoordinates].sort((a, b) => a.top - b.top);
            const totalHeight = sortedCoords.reduce((sum, coord) => sum + coord.height, 0);

            if (totalHeight > 0) {
              // Calculate height percentages for each row
              gridSizesArray = sortedCoords.map(coord =>
                parseFloat(((coord.height / totalHeight) * 100).toFixed(4))
              );

              // Ensure they sum to 100% (adjust last one if needed due to rounding)
              const total = gridSizesArray.reduce((sum, val) => sum + val, 0);
              if (Math.abs(total - 100) > 0.01) {
                gridSizesArray[gridSizesArray.length - 1] = parseFloat(
                  (gridSizesArray[gridSizesArray.length - 1] + (100 - total)).toFixed(4)
                );
              }
            }
          } else {
            // For complex layouts, calculate from all coordinates
            // Sort by position (top first, then left) to get all cells in order
            const sortedCoords = [...allGridCoordinates].sort((a, b) => {
              if (Math.abs(a.top - b.top) > 5) return a.top - b.top; // Different row
              return a.left - b.left; // Same row, sort by left
            });

            // For complex layouts, we need to determine if it's width-based or height-based
            // Check if coordinates are arranged horizontally (columns) or vertically (rows)
            const firstRow = sortedCoords.filter(coord =>
              Math.abs(coord.top - sortedCoords[0].top) < 5
            );

            if (firstRow.length > 1) {
              // Multiple cells in first row = column-based layout
              const totalWidth = sortedCoords.reduce((sum, coord) => sum + coord.width, 0);
              if (totalWidth > 0) {
                gridSizesArray = sortedCoords.map(coord =>
                  parseFloat(((coord.width / totalWidth) * 100).toFixed(4))
                );
              }
            } else {
              // Single cell per row = row-based layout
              const totalHeight = sortedCoords.reduce((sum, coord) => sum + coord.height, 0);
              if (totalHeight > 0) {
                gridSizesArray = sortedCoords.map(coord =>
                  parseFloat(((coord.height / totalHeight) * 100).toFixed(4))
                );
              }
            }

            // Ensure they sum to 100%
            if (gridSizesArray.length > 0) {
              const total = gridSizesArray.reduce((sum, val) => sum + val, 0);
              if (Math.abs(total - 100) > 0.01) {
                gridSizesArray[gridSizesArray.length - 1] = parseFloat(
                  (gridSizesArray[gridSizesArray.length - 1] + (100 - total)).toFixed(4)
                );
              }
            }
          }

          console.log('💾 [GridPosition] Calculated grid sizes from coordinates for localStorage save:', gridSizesArray.length, 'cells');
        }

        // Always save to localStorage (for both saved and unsaved templates)
        if (gridSizesArray.length > 0) {
          const { templateGridSizesStorage } = await import('@/lib/templateGridSizes');
          templateGridSizesStorage.saveTemplateGridSizes(
            activeTemplateId,
            activeTemplate.layout,
            gridSizesArray
          );

          console.log('💾 [GridPosition] Saved grid sizes to localStorage for template:', activeTemplateId, gridSizesArray);

          // Dispatch custom event to notify DynamicGridRenderer to reload
          window.dispatchEvent(new CustomEvent('gridSizesUpdated', {
            detail: { templateId: activeTemplateId }
          }));
        }
      } catch (error) {
        console.error('❌ Error saving grid sizes to localStorage:', error);
      }
    }

    // After saving to localStorage, also save to database if template is saved
    if (activeTemplate.saved) {
      try {
        // Check if template ID is numeric (saved template)
        const templateIdNum = parseInt(activeTemplateId, 10);

        if (!isNaN(templateIdNum)) {
          // Get grid sizes from localStorage (they should have been saved above)
          const { templateGridSizesStorage } = await import('@/lib/templateGridSizes');
          const savedGridSizes = templateGridSizesStorage.getTemplateGridSizes(activeTemplateId);

          if (savedGridSizes && savedGridSizes.cellSizes.length > 0) {
            const gridSizesArray = savedGridSizes.cellSizes.map(cell => cell.width);

            if (gridSizesArray.length > 0) {
              const apiLayoutCode = mapLayoutToApiCode(activeTemplate.layout as any);

              const positions = calculateGridPositions(
                activeTemplate.layout as any,
                gridSizesArray,
                apiLayoutCode
              );

              // Create a unique key for this grid configuration to prevent duplicates
              const gridConfigKey = `${positions.Top}|${positions.Left}|${positions.Height}|${positions.Width}`;

              // Check if this is the same as what we just saved
              if (lastSavedGridSizesRef.current === gridConfigKey) {
                return;
              }

              // Double-check: prevent concurrent saves
              if (isSavingGridPositionsRef.current) {
                return;
              }

              // Set flag to prevent concurrent saves BEFORE the async operation
              isSavingGridPositionsRef.current = true;

              // Update the last saved key immediately to prevent rapid duplicates
              lastSavedGridSizesRef.current = gridConfigKey;

              try {
                console.log('💾 [GridPosition] Saving grid positions to database for template:', templateIdNum, positions);
                const result = await insertMainGridPosition(
                  templateIdNum,
                  positions.Top,
                  positions.Left,
                  positions.Height,
                  positions.Width
                );

                if (result.success) {
                  console.log('✅ [GridPosition] Successfully saved grid positions to database');
                } else {
                  console.error('❌ [GridPosition] Failed to save grid positions to database:', result);
                  // If save failed, reset the last saved key so it can be retried
                  lastSavedGridSizesRef.current = null;
                }
              } catch (error) {
                console.error('❌ Error saving grid positions:', error);
                // If save failed, reset the last saved key so it can be retried
                lastSavedGridSizesRef.current = null;
              } finally {
                // Reset flag after save completes
                isSavingGridPositionsRef.current = false;
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error saving grid positions to database:', error);
      }
    }
  };

  /**
   * Handle dynamic layout widget addition
   */
  const handleDynamicAddWidget = (areaId: string, widgetId: string) => {
    console.log('Dynamic layout add widget:', { areaId, widgetId });
    // For now, we'll use the existing handleAddWidget which determines position automatically
    // TODO: Modify handleAddWidget to accept position parameter
    handleAddWidget(widgetId);
  };

  /**
   * Handle dynamic layout widget removal
   */
  const handleDynamicRemoveWidget = (areaId: string) => {
    console.log('Dynamic layout remove widget:', { areaId });
    handleRemoveWidget(areaId);
  };

  const renderGridLayout = () => {
    // Special case for free-floating layout - use FreeFloatingCanvas
    if (currentLayout === "free-floating") {
      return (
        <div className="flex-1 bg-background overflow-hidden">
          <FreeFloatingCanvas
            onAddWidget={() => setIsWidgetPanelOpen(true)}
            widgetCatalog={availableWidgets}
            selectedWidgetId={selectedWidgetForFloating || undefined}
            templateWidgets={activeTemplate?.layout === 'free-floating' ? activeTemplate.widgets : []}
            templateId={activeTemplate?.id}
            isTemplateSaved={activeTemplate?.saved || false}
            onUpdateWidgetFields={updateWidgetFields}
            onAddWidgetToTemplate={addWidgetToTemplate}
            onRemoveWidgetFromTemplate={removeWidgetByID}
            onRefreshTemplates={() => refreshTemplates(undefined, true)}
          />
        </div>
      );
    }

    // Use dynamic system for all other layouts
    if (shouldUseDynamicLayout(currentLayout)) {
      const activeTemplate = templates.find(t => t.id === activeTemplateId);
      if (!activeTemplate) return null;

      // Convert widget coordinates to area coordinates
      const areaCoordinates = convertCoordinatesToAreas(
        activeTemplate.widgets,
        getLayoutConfigByName(currentLayout)!,
        activeTemplate.widgets.reduce((acc, widget) => {
          if (widget.settings?.coordinates) {
            acc[widget.id] = widget.settings.coordinates;
          }
          return acc;
        }, {} as Record<string, any>)
      );

      return (
        <div className="flex-1 bg-background overflow-hidden">
          <DynamicGridRenderer
            layout={currentLayout}
            widgets={activeTemplate.widgets}
            coordinates={areaCoordinates}
            templateId={activeTemplateId}
            onResize={handleDynamicResizePreview}
            onResizeStop={handleDynamicResizeStop}
            onAddWidget={handleDynamicAddWidget}
            onRemoveWidget={handleDynamicRemoveWidget}
            renderWidget={renderWidget}
            getWidget={getWidget}
            onSetTargetPosition={setTargetPosition}
            onSetIsWidgetPanelOpen={setIsWidgetPanelOpen}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            isDragOver={dragOverPosition}
          />
        </div>
      );
    }

    // Fallback for unsupported layouts
    return (
      <div className="flex-1 bg-background overflow-hidden flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p>Layout not supported: {currentLayout}</p>
          <p className="text-xs mt-2">Please check layout configuration</p>
        </div>
      </div>
    );
  };

  const handleLogout = () => {
    logout();
    setIsProfilePanelOpen(false);
  };

  // Show loading state
  if (templatesLoading || !hasValidActiveTemplate) {
    return (
      <div className="h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{templatesLoading ? 'Loading templates...' : 'Initializing dashboard...'}</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (templatesError) {
    return (
      <div className="h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Error loading templates: {templatesError}</p>
          <button
            onClick={() => refreshTemplates()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-screen w-screen flex flex-col bg-background overflow-hidden ${isDragging ? 'cursor-grabbing' : ''}`}
      data-templateid={activeTemplateId}
    >
      {/* Top Navigation */}
      <TopNav
        selectedTemplate={activeTemplate?.name}

        templates={templates as any}
        onTemplateSelect={setActiveTemplateId}
        onTemplateDelete={deleteTemplate}
        onTemplateRename={handleTemplateRename}
        onTemplateStar={handleTemplateStar}
        onTemplateDisplayOrder={handleTemplateDisplayOrder}
        onTemplateIconChange={handleTemplateIconChange}
        onReorderTemplates={handleReorderTemplates}
        onOpenWidgetPanel={() => setIsWidgetPanelOpen(true)}
        onNewTab={handleNewTab}
        onSave={handleSave}
        onOpenWatchlist={() => {
          setIsAlertsPanelOpen(false);
          setIsNotificationsPanelOpen(false);
          setIsWatchlistPanelOpen(true);
        }}
        onOpenAlerts={() => {
          setIsWatchlistPanelOpen(false);
          setIsNotificationsPanelOpen(false);
          setIsAlertsPanelOpen(true);
        }}
        onOpenNotifications={() => {
          setIsWatchlistPanelOpen(false);
          setIsAlertsPanelOpen(false);
          setIsNotificationsPanelOpen(true);
        }}
        onOpenProfile={() => setIsProfilePanelOpen(true)}
        onSymbolSelect={handleSymbolSelect}
        onRefreshTemplates={async (templateIdToSelect?: string) => {
          // Clear the grid positions cache for the new template to force reload
          if (templateIdToSelect) {
            loadedGridPositionsRef.current.delete(templateIdToSelect);
          }

          // Refresh templates from API and select the new template atomically
          // This ensures templates state and activeTemplateId are updated together
          // which prevents TabbedWidget from running with stale template data
          await refreshTemplates(undefined, true, templateIdToSelect);

          console.log('🔄 Templates refreshed', templateIdToSelect ? `and switched to: ${templateIdToSelect}` : '');
        }}
        theme={theme}
        onThemeChange={async (newTheme) => {
          setTheme(newTheme);
          // Also update user preferences
          await updatePreference("darkMode", newTheme === "dark");
        }}
        isCurrentTabSaved={isCurrentTabSaved}
      />

      {/* Widget Panel */}
      <WidgetPanel
        isOpen={isWidgetPanelOpen}
        onClose={() => setIsWidgetPanelOpen(false)}
        recentlyUsedWidgets={recentWidgets}
        onAddWidget={handleAddWidget}
        availableWidgets={availableWidgets}
        onDragStart={handleDragStart}
      />

      {/* Watchlist Panel */}
      <WatchlistPanel
        isOpen={isWatchlistPanelOpen}
        onClose={() => setIsWatchlistPanelOpen(false)}
      />

      {/* Alerts Panel */}
      <AlertsPanel
        isOpen={isAlertsPanelOpen}
        onClose={() => setIsAlertsPanelOpen(false)}
      />

      {/* Notifications Panel */}
      <NotificationsPanel
        isOpen={isNotificationsPanelOpen}
        onClose={() => setIsNotificationsPanelOpen(false)}
      />

      {/* Layout Selector */}
      <LayoutSelector
        isOpen={isLayoutSelectorOpen}
        onClose={() => setIsLayoutSelectorOpen(false)}
        onSelectLayout={handleLayoutSelect}
      />


      <SaveTemplateDialog
        isOpen={isSaveDialogOpen}
        onClose={() => setIsSaveDialogOpen(false)}
        onSave={handleSaveTemplate}
        onReplace={handleReplaceTemplate}
        currentTemplateName={activeTemplate?.name}
        currentIcon={activeTemplate?.icon}
        widgetCount={activeTemplate?.widgets.length || 0}
        isRenaming={activeTemplate?.saved || false}
      />

      {/* Create Template Dialog - shown after layout selection */}
      <SaveTemplateDialog
        isOpen={isCreateTemplateDialogOpen}
        onClose={handleCloseCreateTemplateDialog}
        onSave={handleCreateTemplate}
        currentTemplateName=""
        currentIcon="Star"
        widgetCount={0}
        isRenaming={false}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Hide Template"
        message={`Are you sure you want to hide "${templates.find(t => t.id === tabToDelete)?.name || 'this template'}"? You can restore it from the template manager.`}
        confirmText="Hide"
        cancelText="Cancel"
      />

      {/* Template Tabs */}
      {/* {console.log('🔍 [BloombergDashboard] TemplateTabs props:', {
        activeTemplateId,
        templatesCount: templates.length,
        visibleTemplatesCount: templates.filter(t => t.displayOrder !== -1).length,
        templateIds: templates.filter(t => t.displayOrder !== -1).map(t => t.id).slice(0, 5),
        activeExists: templates.some(t => t.id === activeTemplateId && t.displayOrder !== -1)
      })} */}
      <TemplateTabs
        tabs={templates.filter(t => t.displayOrder !== -1)}
        activeTabId={activeTemplateId}
        onTabChange={setActiveTemplateId}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
        onTabsReorder={handleTabsReorder}
        onTabIconChange={handleTabIconChange}
      />

      {/* Main Content Area */}
      {/* Note: Removed activeTemplateId from key to prevent widget remounting on template switch */}
      {/* Widgets now update seamlessly without showing loading states */}
      <div key={currentLayout} className="flex-1 flex overflow-hidden">
        {renderGridLayout()}
      </div>

      {/* Fullscreen Widget Overlay */}
      {fullscreenWidget && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
          {/* Fullscreen Widget Content */}
          <div className={`flex-1 overflow-y-auto relative transition-all duration-300 ${
            settingsWidgetPosition === fullscreenWidget.position && settingsDialogOpen ? "blur-sm" : "blur-0"
          }`}>
            {(() => {
              const WidgetComponent = WidgetComponents[fullscreenWidget.widgetId];
              if (!WidgetComponent) return null;

              if (shouldEnforcePremiumLocks && isWidgetAccessRestricted(fullscreenWidget.position)) {
                const widgetMeta = availableWidgets.find(w => w.id === fullscreenWidget.widgetId);
                return (
                  <div className="h-full w-full min-h-full">
                    <LockedWidgetOverlay
                      onRemove={handleCloseFullscreenWidget}
                      widgetName={widgetMeta?.name}
                    />
                  </div>
                );
              }

              return (
                <div className="h-full w-full min-h-full">
                  <WidgetComponent
                    wgid={`${fullscreenWidget.tabId}-${fullscreenWidget.position}`}
                    onRemove={handleCloseFullscreenWidget}
                    {...(shouldShowSettingsIcon(fullscreenWidget.widgetId, isActiveTemplateDetailsTemplate) ? {
                      onSettings: () => handleWidgetSettings(fullscreenWidget.position, fullscreenWidget.widgetId)
                    } : {})}
                    onFullscreen={handleCloseFullscreenWidget}
                    isSymbolLocked={isActiveTemplateDetailsTemplate}
                    settings={getWidgetSettings(fullscreenWidget.position)}
                    {...(fullscreenWidget.widgetId === 'price-chart' && {
                      onSaveSettings: createSaveSettingsCallback(fullscreenWidget.position, fullscreenWidget.widgetId)
                    })}
                  />
                </div>
              );
            })()}
          </div>

          {/* Slide-in Settings Panel for Fullscreen Widgets */}
          <WidgetSettingsSlideIn
            isOpen={settingsWidgetPosition === fullscreenWidget.position && settingsDialogOpen}
            onClose={handleCloseWidgetSettings}
            widgetType={settingsWidgetType}
            widgetPosition={settingsWidgetPosition}
            widgetInstanceId={settingsWidgetInstanceId}
            currentSettings={getWidgetSettings(settingsWidgetPosition)}
            onSave={handleSaveWidgetSettings}
            isModuleLocked={isActiveTemplateDetailsTemplate}
            isSymbolLocked={isActiveTemplateDetailsTemplate}
          />
        </div>
      )}

      {/* Profile Panel */}
      <ProfilePanel
        isOpen={isProfilePanelOpen}
        onClose={() => setIsProfilePanelOpen(false)}
        onLogout={handleLogout}
      />

      {/* Onboarding Tour */}
      <OnboardingTour
        isActive={isOnboardingActive}
        onComplete={handleCompleteOnboarding}
        onSkip={handleSkipOnboarding}
        steps={onboardingSteps}
        onTemplateSwitch={handleTemplateSwitch}
      />

      {/* Toast Notification */}
      {toast.isVisible && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300">
          {toast.message}
        </div>
      )}

      {/* Profile Dialog removed duplicate */}
    </div>
  );
}

