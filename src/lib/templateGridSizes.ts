/**
 * Template Grid Sizes Storage Service
 * 
 * This service handles saving and loading custom grid sizes for templates.
 * It stores the data in localStorage and provides methods to manage grid sizes.
 */

export interface TemplateGridSizes {
  templateId: string;
  layoutType: string;
  cellSizes: Array<{
    cellClass: string;
    width: number;
  }>;
  updatedAt: string;
}

class TemplateGridSizesStorage {
  private readonly STORAGE_KEY = 'pmt_template_grid_sizes';

  /**
   * Save grid sizes for a template
   */
  saveTemplateGridSizes(templateId: string, layoutType: string, cellSizes: number[]): void {
    try {
      const gridSizes: TemplateGridSizes = {
        templateId,
        layoutType,
        cellSizes: cellSizes.map((size, index) => ({
          cellClass: `g${templateId}_${index + 1}`,
          width: size
        })),
        updatedAt: new Date().toISOString()
      };

      const existingData = this.getAllTemplatesData();
      existingData[templateId] = gridSizes;
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingData));

      // Notify any listeners in the current tab that grid sizes have been updated
      // DynamicGridRenderer listens for this to immediately apply new sizes
      if (typeof window !== 'undefined') {
        try {
          const event = new CustomEvent('gridSizesUpdated', {
            detail: { templateId }
          });
          window.dispatchEvent(event);
        } catch (error) {
          // Fail silently if CustomEvent/window is not available for any reason
          console.warn('Warning dispatching gridSizesUpdated event:', error);
        }
      }
    } catch (error) {
      console.error('Error saving template grid sizes:', error);
    }
  }

  /**
   * Load grid sizes for a template, returning default sizes if not found
   */
  loadGridSizesForTemplate(templateId: string, layoutType: string, defaultSizes: number[]): number[] {
    try {
      const templateData = this.getTemplateGridSizes(templateId);
      
      if (templateData && templateData.layoutType === layoutType) {
        return templateData.cellSizes.map(cell => cell.width);
      }
      
      return defaultSizes;
    } catch (error) {
      console.error('Error loading template grid sizes:', error);
      return defaultSizes;
    }
  }

  /**
   * Get detailed grid sizes for a template
   */
  getTemplateGridSizes(templateId: string): TemplateGridSizes | null {
    try {
      const allData = this.getAllTemplatesData();
      return allData[templateId] || null;
    } catch (error) {
      console.error('Error getting template grid sizes:', error);
      return null;
    }
  }

  /**
   * Check if template has custom grid sizes
   */
  hasCustomGridSizes(templateId: string): boolean {
    return this.getTemplateGridSizes(templateId) !== null;
  }

  /**
   * Delete grid sizes for a template
   */
  deleteTemplateGridSizes(templateId: string): void {
    try {
      const allData = this.getAllTemplatesData();
      delete allData[templateId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allData));
    } catch (error) {
      console.error('Error deleting template grid sizes:', error);
    }
  }

  /**
   * Get all template IDs that have custom grid sizes
   */
  getAllTemplatesWithGridSizes(): string[] {
    try {
      const allData = this.getAllTemplatesData();
      return Object.keys(allData);
    } catch (error) {
      console.error('Error getting all templates with grid sizes:', error);
      return [];
    }
  }

  /**
   * Get all templates data from localStorage
   */
  private getAllTemplatesData(): Record<string, TemplateGridSizes> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error parsing template grid sizes data:', error);
      return {};
    }
  }
}

export const templateGridSizesStorage = new TemplateGridSizesStorage();

