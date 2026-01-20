/**
 * Local Grid Position Storage Service
 * 
 * This service stores grid positions in localStorage with the same format as the API
 * to provide offline support and faster access.
 */

// Main Grid Position Types
export interface MainGridPosition {
  ID?: number;
  TemplateID: string | number;
  Top: string;
  Left: string;
  Height: string;
  Width: string;
}

export interface MainGridPositionResponse {
  Status: string;
  GridPosition?: MainGridPosition;
}

// Tab Grid Position Types
export interface TabGridPosition {
  ID: number;
  TabID: number;
  CellID: string;
  Top: string;
  Left: string;
  Width: string;
  Height: string;
}

export interface TabGridPositionResponse {
  Status: string;
  GridPosition?: TabGridPosition;
}

// Tab Widget Types
export interface TabWidgetData {
  CustomDashboardTabID: number;
  UserID: number;
  TabWidgetID: number;
  TabIcon: string;
  TabName: string;
  UpdatedOn: string;
  UpdatedFrom: string;
  TabGrid: number;
  TabWidgetGap: number;
  TabOrder: number;
  IsPredefined: number;
  TabColor: string;
}

export interface GetAllTabWidgetsResponse {
  Status?: string;
  Message?: string;
  Data?: TabWidgetData[];
  Count?: number;
}

class LocalGridPositionStorage {
  private mainGridPositionKey = 'pmt_main_grid_positions';
  private tabGridPositionKey = 'pmt_tab_grid_positions';
  private tabWidgetsKey = 'pmt_tab_widgets';

  // ==================== Main Grid Position Methods ====================

  /**
   * Save main grid position to localStorage
   * Format matches API: { TemplateID: "", Top: "", Left: "", Height: "", Width: "" }
   */
  saveMainGridPosition(position: MainGridPosition): void {
    try {
      // Validate required fields
      if (!position.TemplateID || !position.Top || !position.Left || !position.Height || !position.Width) {
        console.warn('⚠️ [LocalStorage] Missing required fields in grid position:', {
          hasTemplateID: !!position.TemplateID,
          hasTop: !!position.Top,
          hasLeft: !!position.Left,
          hasHeight: !!position.Height,
          hasWidth: !!position.Width
        });
        return;
      }
      
      const positions = this.getMainGridPositions();
      const templateIdStr = String(position.TemplateID);
      
      // Find existing position for this template
      const existingIndex = positions.findIndex(
        p => String(p.TemplateID) === templateIdStr
      );
      
      if (existingIndex >= 0) {
        // Update existing position
        positions[existingIndex] = {
          ...positions[existingIndex],
          ...position,
          TemplateID: templateIdStr
        };
        console.log('✅ [LocalStorage] Updated existing grid position for template:', templateIdStr);
      } else {
        // Add new position
        positions.push({
          ...position,
          TemplateID: templateIdStr
        });
        console.log('✅ [LocalStorage] Added new grid position for template:', templateIdStr);
      }
      
      localStorage.setItem(this.mainGridPositionKey, JSON.stringify(positions));
      console.log('✅ [LocalStorage] Saved grid positions to localStorage, total count:', positions.length);
    } catch (error) {
      console.error('❌ Error saving main grid position to localStorage:', error);
    }
  }

  /**
   * Get main grid position by TemplateID from localStorage
   * Returns response in API format: { Status: "Success", GridPosition: { ... } }
   */
  getMainGridPositionByTemplate(templateId: number | string): MainGridPositionResponse | null {
    try {
      const positions = this.getMainGridPositions();
      const templateIdStr = String(templateId);
      
      const position = positions.find(
        p => String(p.TemplateID) === templateIdStr
      );
      
      if (position) {
        return {
          Status: 'Success',
          GridPosition: {
            ...position,
            TemplateID: typeof templateId === 'number' ? templateId : parseInt(templateIdStr, 10) || templateId
          }
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting main grid position from localStorage:', error);
      return null;
    }
  }

  /**
   * Get all main grid positions from localStorage
   */
  private getMainGridPositions(): MainGridPosition[] {
    try {
      const stored = localStorage.getItem(this.mainGridPositionKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading main grid positions from localStorage:', error);
      return [];
    }
  }

  /**
   * Delete main grid position by TemplateID
   */
  deleteMainGridPosition(templateId: number | string): void {
    try {
      const positions = this.getMainGridPositions();
      const templateIdStr = String(templateId);
      
      const filtered = positions.filter(
        p => String(p.TemplateID) !== templateIdStr
      );
      
      localStorage.setItem(this.mainGridPositionKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting main grid position from localStorage:', error);
    }
  }

  // ==================== Tab Grid Position Methods ====================

  /**
   * Save tab grid position to localStorage
   * Format matches API: { TabID: number, CellID: "", Top: "", Left: "", Width: "", Height: "" }
   */
  saveTabGridPosition(position: Omit<TabGridPosition, 'ID'>): void {
    try {
      const positions = this.getTabGridPositions();
      
      // Find existing position for this TabID and CellID
      const existingIndex = positions.findIndex(
        p => p.TabID === position.TabID && p.CellID === position.CellID
      );
      
      if (existingIndex >= 0) {
        // Update existing position (keep existing ID if it exists)
        positions[existingIndex] = {
          ...positions[existingIndex],
          ...position
        };
      } else {
        // Add new position with generated ID
        const newId = this.generateTabGridPositionId();
        positions.push({
          ...position,
          ID: newId
        });
      }
      
      localStorage.setItem(this.tabGridPositionKey, JSON.stringify(positions));
    } catch (error) {
      console.error('Error saving tab grid position to localStorage:', error);
    }
  }

  /**
   * Save multiple tab grid positions to localStorage
   */
  saveTabGridPositions(positions: Omit<TabGridPosition, 'ID'>[]): void {
    try {
      positions.forEach(position => {
        this.saveTabGridPosition(position);
      });
    } catch (error) {
      console.error('Error saving tab grid positions to localStorage:', error);
    }
  }

  /**
   * Get tab grid position by ID from localStorage
   * Returns response in API format: { Status: "Success", GridPosition: { ... } }
   */
  getTabGridPositionById(id: number): TabGridPositionResponse | null {
    try {
      const positions = this.getTabGridPositions();
      const position = positions.find(p => p.ID === id);
      
      if (position) {
        return {
          Status: 'Success',
          GridPosition: position
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting tab grid position from localStorage:', error);
      return null;
    }
  }

  /**
   * Get tab grid positions by TabID from localStorage
   */
  getTabGridPositionsByTabId(tabId: number): TabGridPosition[] {
    try {
      const positions = this.getTabGridPositions();
      return positions.filter(p => p.TabID === tabId);
    } catch (error) {
      console.error('Error getting tab grid positions by TabID from localStorage:', error);
      return [];
    }
  }

  /**
   * Get all tab grid positions from localStorage
   */
  private getTabGridPositions(): TabGridPosition[] {
    try {
      const stored = localStorage.getItem(this.tabGridPositionKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading tab grid positions from localStorage:', error);
      return [];
    }
  }

  /**
   * Delete tab grid position by ID
   */
  deleteTabGridPosition(id: number): void {
    try {
      const positions = this.getTabGridPositions();
      const filtered = positions.filter(p => p.ID !== id);
      localStorage.setItem(this.tabGridPositionKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting tab grid position from localStorage:', error);
    }
  }

  /**
   * Delete all tab grid positions for a specific TabID
   */
  deleteTabGridPositionsByTabId(tabId: number): void {
    try {
      const positions = this.getTabGridPositions();
      const filtered = positions.filter(p => p.TabID !== tabId);
      localStorage.setItem(this.tabGridPositionKey, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting tab grid positions by TabID from localStorage:', error);
    }
  }

  /**
   * Generate a unique ID for tab grid positions
   */
  private generateTabGridPositionId(): number {
    try {
      const positions = this.getTabGridPositions();
      if (positions.length === 0) {
        return 1;
      }
      const maxId = Math.max(...positions.map(p => p.ID || 0));
      return maxId + 1;
    } catch {
      return Date.now();
    }
  }

  /**
   * Clear all main grid positions (for testing/reset)
   */
  clearMainGridPositions(): void {
    localStorage.removeItem(this.mainGridPositionKey);
  }

  /**
   * Clear all tab grid positions (for testing/reset)
   */
  clearTabGridPositions(): void {
    localStorage.removeItem(this.tabGridPositionKey);
  }

  // ==================== Tab Widget Methods ====================

  /**
   * Save all tab widgets to localStorage
   * Format matches API: { Status: "Success", Data: [...], Count: number }
   */
  saveAllTabWidgets(response: GetAllTabWidgetsResponse): void {
    try {
      if (!response.Data || response.Data.length === 0) {
        console.warn('⚠️ [LocalStorage] No tab widgets data to save');
        return;
      }
      
      localStorage.setItem(this.tabWidgetsKey, JSON.stringify(response));
      console.log('✅ [LocalStorage] Saved tab widgets to localStorage, count:', response.Data.length);
    } catch (error) {
      console.error('❌ Error saving tab widgets to localStorage:', error);
    }
  }

  /**
   * Get all tab widgets from localStorage
   * Returns response in API format: { Status: "Success", Data: [...], Count: number }
   */
  getAllTabWidgets(): GetAllTabWidgetsResponse | null {
    try {
      const stored = localStorage.getItem(this.tabWidgetsKey);
      if (!stored) {
        return null;
      }
      return JSON.parse(stored) as GetAllTabWidgetsResponse;
    } catch (error) {
      console.error('❌ Error reading tab widgets from localStorage:', error);
      return null;
    }
  }

  /**
   * Update a single tab widget in localStorage
   */
  updateTabWidget(tabWidget: TabWidgetData): void {
    try {
      const stored = this.getAllTabWidgets();
      if (!stored || !stored.Data) {
        console.warn('⚠️ [LocalStorage] No tab widgets in storage to update');
        return;
      }

      const index = stored.Data.findIndex(
        t => t.CustomDashboardTabID === tabWidget.CustomDashboardTabID
      );

      if (index >= 0) {
        stored.Data[index] = tabWidget;
      } else {
        stored.Data.push(tabWidget);
      }

      stored.Count = stored.Data.length;
      localStorage.setItem(this.tabWidgetsKey, JSON.stringify(stored));
      console.log('✅ [LocalStorage] Updated tab widget in localStorage:', tabWidget.CustomDashboardTabID);
    } catch (error) {
      console.error('❌ Error updating tab widget in localStorage:', error);
    }
  }

  /**
   * Add a new tab widget to localStorage
   */
  addTabWidget(tabWidget: TabWidgetData): void {
    try {
      const stored = this.getAllTabWidgets();
      if (!stored || !stored.Data) {
        // Create new storage
        const newStorage: GetAllTabWidgetsResponse = {
          Status: 'Success',
          Data: [tabWidget],
          Count: 1
        };
        localStorage.setItem(this.tabWidgetsKey, JSON.stringify(newStorage));
      } else {
        // Check if already exists
        const exists = stored.Data.some(
          t => t.CustomDashboardTabID === tabWidget.CustomDashboardTabID
        );
        if (!exists) {
          stored.Data.push(tabWidget);
          stored.Count = stored.Data.length;
          localStorage.setItem(this.tabWidgetsKey, JSON.stringify(stored));
        }
      }
      console.log('✅ [LocalStorage] Added tab widget to localStorage:', tabWidget.CustomDashboardTabID);
    } catch (error) {
      console.error('❌ Error adding tab widget to localStorage:', error);
    }
  }

  /**
   * Delete a tab widget from localStorage
   */
  deleteTabWidget(customDashboardTabID: number): void {
    try {
      const stored = this.getAllTabWidgets();
      if (!stored || !stored.Data) {
        return;
      }

      const filtered = stored.Data.filter(
        t => t.CustomDashboardTabID !== customDashboardTabID
      );

      stored.Data = filtered;
      stored.Count = filtered.length;
      localStorage.setItem(this.tabWidgetsKey, JSON.stringify(stored));
      console.log('✅ [LocalStorage] Deleted tab widget from localStorage:', customDashboardTabID);
    } catch (error) {
      console.error('❌ Error deleting tab widget from localStorage:', error);
    }
  }

  /**
   * Clear all tab widgets (for testing/reset)
   */
  clearTabWidgets(): void {
    localStorage.removeItem(this.tabWidgetsKey);
  }
}

// Export singleton instance
export const localGridPositionStorage = new LocalGridPositionStorage();

