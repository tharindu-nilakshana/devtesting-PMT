/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import { templateApi, UserTemplate, TemplateWidget, clearTemplatesCache } from '@/lib/templateApi';
import { getAuthToken } from '@/utils/api';
import { captureWidgetCoordinates, captureFreeFloatingWidgetCoordinates } from '@/utils/coordinateCapture';
import { templateGridSizesStorage } from '@/lib/templateGridSizes';
import { getLayoutTypeForApi } from '@/utils/layoutTypeUtils';
import { getCachedSymbols, isTemplateNameSimilarToSymbol } from '@/utils/symbolValidation';
import { toast } from 'sonner';

interface UseTemplatesReturn {
  templates: UserTemplate[];
  activeTemplateId: string;
  isLoading: boolean;
  error: string | null;
  setActiveTemplateId: (id: string) => void;
  createTemplate: (name: string, layout: string, widgets: string[], icon?: string) => Promise<void>;
  saveTemplateToApi: (templateId: string, customName?: string, customIcon?: string) => Promise<{ success: boolean; message: string }>;
  renameTemplate: (templateId: string, newName: string) => Promise<{ success: boolean; message: string }>;
  updateTemplate: (templateId: string, updates: Partial<UserTemplate>) => Promise<{ success: boolean; message?: string }>;
  hideTemplate: (templateId: string) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  addWidgetToTemplate: (templateId: string, widgetId: string, widgetTitle: string, position: string, coordinates?: { top: number; left: number; height: number; width: number }, customTabsID?: number) => Promise<void>;
  updateWidgetFields: (widgetId: string, templateId: string, updates: any) => Promise<{ success: boolean; message: string }>;
  removeWidgetFromTemplate: (templateId: string, position: string) => Promise<void>;
  removeWidgetByID: (templateId: string, widgetId: string) => Promise<void>;
  reorderTemplates: (reorderedTemplates: UserTemplate[]) => Promise<void>;
  clearError: () => void;
  refreshTemplates: (preferredActiveTemplateName?: string, skipLoading?: boolean, preferredActiveTemplateId?: string, clearTabCache?: boolean) => Promise<void>;
  refreshTemplateWidgets: (templateId: string) => Promise<void>;
}

export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track ongoing fetch operations to prevent duplicate API calls
  const fetchInProgressRef = useRef<Promise<void> | null>(null);

  // Storage key for active template ID
  const ACTIVE_TEMPLATE_STORAGE_KEY = 'pmt_active_template_id';

  // Save active template ID to localStorage
  const saveActiveTemplateId = useCallback((templateId: string) => {
    try {
      localStorage.setItem(ACTIVE_TEMPLATE_STORAGE_KEY, templateId);
    } catch (error) {
      console.error('Failed to save active template ID:', error);
    }
  }, []);

  // Get saved active template ID from localStorage
  const getSavedActiveTemplateId = useCallback((): string | null => {
    try {
      return localStorage.getItem(ACTIVE_TEMPLATE_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to get saved active template ID:', error);
      return null;
    }
  }, []);

  // Create a fresh unsaved template for new users
  const createFreshTemplate = (): UserTemplate => ({
    id: `fresh-${Date.now()}`,
    name: "Untitled Layout",
    layout: "3-grid-left-large",
    saved: false,
    icon: "Star",
    isFavorite: false,
    widgets: [],
  });

  /**
   * Generate a unique "Untitled Layout" name
   * Returns "Untitled Layout", "Untitled Layout-1", "Untitled Layout-2", etc.
   */
  const generateUniqueUntitledName = useCallback((): string => {
    const baseName = "Untitled Layout";

    // Find all existing "Untitled Layout" names (with or without numbers)
    const namePattern = /^Untitled Layout(?:-(\d+))?$/;
    const existingNumbers = new Set<number>();

    templates.forEach(template => {
      const match = template.name.match(namePattern);
      if (match) {
        if (match[1]) {
          // Has a number suffix
          existingNumbers.add(parseInt(match[1], 10));
        } else {
          // Base name "Untitled Layout" exists
          existingNumbers.add(0);
        }
      }
    });

    // If base name doesn't exist, return it
    if (!existingNumbers.has(0)) {
      return baseName;
    }

    // Find the next available number
    let nextNumber = 1;
    while (existingNumbers.has(nextNumber)) {
      nextNumber++;
    }

    return `${baseName}-${nextNumber}`;
  }, [templates]);

  const fetchTemplatesInternal = useCallback(async (preferredActiveTemplateName?: string, forceRefresh: boolean = false, skipLoading: boolean = false, preferredActiveTemplateId?: string) => {
    try {
      if (!skipLoading) {
        setIsLoading(true);
      }
      setError(null);

      // Check if user is authenticated before making API call
      const token = getAuthToken();

      if (!token) {
        // No authentication token - create a fresh template for local use
        const freshTemplate = createFreshTemplate();
        setTemplates([freshTemplate]);
        setActiveTemplateId(freshTemplate.id);
        setIsLoading(false);
        return;
      }

      // User is authenticated - fetch from external API
      const userTemplates = await templateApi.getTemplatesByUser(forceRefresh);

      // Use user templates if available, otherwise create a fresh template
      const templatesToUse = userTemplates.length > 0 ? userTemplates : [createFreshTemplate()];

      setTemplates(templatesToUse);

      // Restore saved active template ID or set first template as active
      setActiveTemplateId(prev => {
        // Always validate that the active template exists in the loaded templates
        if (templatesToUse.length > 0) {
          // If a preferred template ID is provided, try to find it first
          if (preferredActiveTemplateId) {
            const preferredTemplate = templatesToUse.find(t => t.id === preferredActiveTemplateId);
            if (preferredTemplate) {
              saveActiveTemplateId(preferredTemplate.id);
              return preferredTemplate.id;
            }
          }
          
          // If a preferred template name is provided, try to find it first
          if (preferredActiveTemplateName) {
            const preferredTemplate = templatesToUse.find(t => t.name === preferredActiveTemplateName);
            if (preferredTemplate) {
              saveActiveTemplateId(preferredTemplate.id);
              return preferredTemplate.id;
            }
          }

          const savedActiveId = getSavedActiveTemplateId();
          // Check if saved ID exists in current templates AND is visible (displayOrder !== -1)
          const savedTemplate = savedActiveId ? templatesToUse.find(t => t.id === savedActiveId) : null;
          const savedTemplateIsVisible = savedTemplate && savedTemplate.displayOrder !== -1;
          
          if (savedTemplateIsVisible && savedActiveId) {
            return savedActiveId;
          }
          
          // Fall back to first visible template
          const firstVisibleTemplate = templatesToUse.find(t => t.displayOrder !== -1);
          const activeId = firstVisibleTemplate ? firstVisibleTemplate.id : templatesToUse[0].id;
          saveActiveTemplateId(activeId);
          return activeId;
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to fetch templates:', err);

      // Always fallback to fresh template on error
      const fallbackTemplate = createFreshTemplate();
      setTemplates([fallbackTemplate]);
      setActiveTemplateId(prev => {
        const savedActiveId = getSavedActiveTemplateId();
        // Check if saved ID exists in current templates (in this case just the fallback)
        const savedTemplateExists = savedActiveId && savedActiveId === fallbackTemplate.id;
        // Check if current prev exists in templates
        const prevExists = prev && prev === fallbackTemplate.id;

        // Priority: saved ID (if valid) > prev (if valid) > fallback template
        let activeId: string;
        if (savedTemplateExists) {
          activeId = savedActiveId;
        } else if (prevExists) {
          activeId = prev;
        } else {
          activeId = fallbackTemplate.id;
        }

        saveActiveTemplateId(activeId);
        return activeId;
      });
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = null;
    }
  }, [getSavedActiveTemplateId, saveActiveTemplateId]);

  // Wrapper function to deduplicate concurrent fetch calls
  const fetchTemplates = useCallback(async (preferredActiveTemplateName?: string, forceRefresh: boolean = false, skipLoading: boolean = false, preferredActiveTemplateId?: string) => {
    // If there's already a fetch in progress, wait for it instead of starting a new one
    if (fetchInProgressRef.current) {
      return fetchInProgressRef.current;
    }
    
    // Store the promise so concurrent calls can reuse it
    const fetchPromise = fetchTemplatesInternal(preferredActiveTemplateName, forceRefresh, skipLoading, preferredActiveTemplateId);
    fetchInProgressRef.current = fetchPromise;
    
    return fetchPromise;
  }, [fetchTemplatesInternal]);

  const createTemplate = useCallback(async (name: string, layout: string, widgets: string[], icon?: string) => {
    try {
      setError(null);

      // Check if user is authenticated
      const token = getAuthToken();
      if (!token) {
        throw new Error('User must be authenticated to create templates');
      }

      // Use provided name if available, otherwise generate "Untitled Layout" with auto-increment
      const templateName = name.trim() || generateUniqueUntitledName();
      const templateIcon = icon || 'Star';

      // Check if template name is similar to a symbol
      const symbols = await getCachedSymbols();
      if (isTemplateNameSimilarToSymbol(templateName, symbols)) {
        const errorMessage = `You cannot create a template with the name "${templateName}" as it conflicts with a system template. Please choose a different name.`;
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Check for duplicate template names before making the API call
      const existingTemplate = templates.find(t => t.name.toLowerCase() === templateName.toLowerCase());
      if (existingTemplate) {
        const errorMessage = `A template with the name "${templateName}" already exists. Please choose a different name or add a number (e.g., "${templateName} 2").`;
        // Don't set global error - let the dialog handle it
        throw new Error(errorMessage);
      }

      // Capture widget coordinates at creation time
      let coordinates: { WidgetTitle: string; Module: string; Symbols: string; AdditionalSettings: string; TopPos: number; LeftPos: number; Height: number; Width: number; position: string; zIndex: number; }[] = [];
      let filledAreas: string = '';

      if (layout === 'free-floating') {
        // For free-floating templates, capture from localStorage
        const result = captureFreeFloatingWidgetCoordinates();
        coordinates = result.coordinates;
        filledAreas = result.filledAreas;
      } else {
        // For grid templates, capture from DOM elements if widgets exist
        if (widgets.length > 0) {
          const result = captureWidgetCoordinates(
            widgets.map((widgetId, index) => ({
              name: widgetId,
              position: `area-${index + 1}`
            })),
            layout
          );
          coordinates = result.coordinates;
          filledAreas = result.filledAreas;
        } else {
          // No widgets initially, create empty arrays
          coordinates = [];
          filledAreas = '';
        }
      }

      // Create API request
      const request = {
        TemplateName: templateName,
        Widgets: coordinates, // Use captured coordinates
        templateType: layout,
        layoutType: getLayoutTypeForApi(layout),
        filledAreas, // Use captured filledAreas
        isFavorite: false,
        displayOrder: templates.length + 1,
        isFreeFloating: layout === 'free-floating',
        icon: templateIcon,
        isActiveTab: false,
      };

      // Optimistically create template in state immediately for instant UI update
      const optimisticTemplate: UserTemplate = {
        id: `temp-${Date.now()}`, // Temporary ID, will be replaced with server ID
        name: templateName,
        layout,
        saved: true, // Mark as saved since we're creating via API
        icon: templateIcon,
        isFavorite: false,
        widgets: widgets.map((widgetId, index) => ({
          id: `widget-${Date.now()}-${index}`,
          name: widgetId,
          position: `area-${index + 1}`,
        })),
      };

      // Add to templates and set as active immediately
      setTemplates(prev => [...prev, optimisticTemplate]);
      setActiveTemplateId(optimisticTemplate.id);
      saveActiveTemplateId(optimisticTemplate.id);

      // Call API to create template
      const response = await templateApi.createTemplateWithWidgets(request);

      if (!response.success) {
        // Remove optimistic template on error
        setTemplates(prev => prev.filter(t => t.id !== optimisticTemplate.id));

        const errorMessage = response.message || 'Failed to create template';

        // Provide more specific error messages for common issues
        if (errorMessage.includes('already have a template named')) {
          const friendlyMessage = `A template with the name "${templateName}" already exists. Please choose a different name or add a number (e.g., "${templateName} 2").`;
          setError(friendlyMessage);
          throw new Error(friendlyMessage);
        }

        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Clear any global error state
      setError(null);

      // Clear templates cache since we created a new template
      clearTemplatesCache();

      // Update the optimistic template with the real ID from the server response
      // This avoids an extra API call to refresh all templates
      if (response.templateId) {
        const realTemplateId = response.templateId.toString();
        setTemplates(prev => prev.map(t => {
          if (t.id === optimisticTemplate.id) {
            return {
              ...t,
              id: realTemplateId,
            };
          }
          return t;
        }));
        setActiveTemplateId(realTemplateId);
        saveActiveTemplateId(realTemplateId);
        console.log('✅ [useTemplates] Template created with ID:', realTemplateId);
      } else {
        // Fallback: If no template ID in response, refresh to get the real data
        console.log('⚠️ [useTemplates] No templateId in response, refreshing templates');
        try {
          await fetchTemplates(templateName, true, true);
        } catch (err) {
          console.error('Failed to refresh templates after creation:', err);
        }
      }

    } catch (err) {
      console.error('Failed to create template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
      
      // Don't set global error for duplicate names - let the dialog handle it with a toast
      if (!errorMessage.includes('already exists')) {
        setError(errorMessage);
      }
      
      throw err;
    }
  }, [templates, fetchTemplates, generateUniqueUntitledName, saveActiveTemplateId]);

  /**
   * Save a local template to the API (for authenticated users only)
   */
  const saveTemplateToApi = useCallback(async (templateId: string, customName?: string, customIcon?: string): Promise<{ success: boolean; message: string }> => {
    try {
      setError(null);

      // Check if user is authenticated
      const token = getAuthToken();
      if (!token) {
        throw new Error('User must be authenticated to save templates to the server');
      }

      // Find the template to save
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      if (template.saved) {
        throw new Error('Template is already saved');
      }

      // Use custom name/icon if provided, otherwise use template's current values
      const templateName = customName || template.name;
      const templateIcon = customIcon || template.icon || 'Star';

      // Validate template name length
      if (templateName.trim().length < 3) {
        const errorMessage = 'Template name must be at least 3 characters';
        return { success: false, message: errorMessage };
      }

      // Check if template name is similar to a symbol
      const symbols = await getCachedSymbols();
      if (isTemplateNameSimilarToSymbol(templateName, symbols)) {
        const errorMessage = `You cannot save a template with the name "${templateName}" as it conflicts with a system template. Please choose a different name.`;
        toast.error(errorMessage);
        return { success: false, message: errorMessage };
      }

      // Check for duplicate template names before making the API call
      const existingTemplate = templates.find(t => t.id !== templateId && t.name.toLowerCase() === templateName.toLowerCase());
      if (existingTemplate) {
        const errorMessage = `A template with the name "${templateName}" already exists. Please choose a different name or add a number (e.g., "${templateName} 2").`;
        return { success: false, message: errorMessage };
      }

      // Capture widget coordinates at save time
      let coordinates, filledAreas;

      if (template.layout === 'free-floating') {
        // For free-floating templates, capture from localStorage
        const result = captureFreeFloatingWidgetCoordinates();
        coordinates = result.coordinates;
        filledAreas = result.filledAreas;
      } else {
        // For grid templates, capture from DOM elements
        const result = captureWidgetCoordinates(
          template.widgets.map(widget => ({
            name: widget.name,
            position: widget.position
          })),
          template.layout
        );
        coordinates = result.coordinates;
        filledAreas = result.filledAreas;
      }

      // Create API request
      const request = {
        TemplateName: templateName, // Use the custom name
        Widgets: coordinates, // Use captured coordinates instead of manual mapping
        templateType: template.layout,
        layoutType: getLayoutTypeForApi(template.layout),
        filledAreas, // Use captured filledAreas instead of sequential mapping
        isFavorite: template.isFavorite || false,
        displayOrder: templates.length + 1,
        isFreeFloating: template.layout === 'free-floating',
        icon: templateIcon, // Use the custom icon
        isActiveTab: false,
      };

      // Call API to save template
      const response = await templateApi.createTemplateWithWidgets(request);

      if (response.success) {
        // Clear any global error state
        setError(null);

        // Mark template as saved locally
        setTemplates(prev => prev.map(t =>
          t.id === templateId
            ? { ...t, saved: true }
            : t
        ));

        // Refresh templates to get the server-assigned ID
        await fetchTemplates(templateName);

        return { success: true, message: 'Template saved successfully' };
      } else {
        // Handle API error response
        const errorMessage = response.message || 'Failed to save template';

        // Provide more specific error messages for common issues
        if (errorMessage.includes('already have a template named')) {
          const templateName = customName || templates.find(t => t.id === templateId)?.name || 'this template';
          const friendlyMessage = `A template with the name "${templateName}" already exists. Please choose a different name or add a number (e.g., "${templateName} 2").`;
          // Don't set global error - let the dialog handle it
          return { success: false, message: friendlyMessage };
        }

        // Don't set global error - let the dialog handle it
        return { success: false, message: errorMessage };
      }
    } catch (err) {
      console.error('Failed to save template to API:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save template';

      // Provide more specific error messages for common issues
      if (errorMessage.includes('already have a template named')) {
        const templateName = customName || templates.find(t => t.id === templateId)?.name || 'this template';
        const friendlyMessage = `A template with the name "${templateName}" already exists. Please choose a different name or add a number (e.g., "${templateName} 2").`;
        // Don't set global error - let the dialog handle it
        return { success: false, message: friendlyMessage };
      }

      // Don't set global error - let the dialog handle it
      return { success: false, message: errorMessage };
    }
  }, [templates, fetchTemplates]);

  const renameTemplate = useCallback(async (templateId: string, newName: string): Promise<{ success: boolean; message: string }> => {
    try {
      setError(null);

      // Check if user is authenticated
      const token = getAuthToken();
      if (!token) {
        return { success: false, message: 'Please log in to rename templates' };
      }

      // Find the template to rename
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        return { success: false, message: 'Template not found' };
      }

      // Check if template is saved (has server ID)
      if (!template.saved) {
        return { success: false, message: 'Cannot rename unsaved templates. Please save the template first.' };
      }

      // Validate template name length
      if (newName.trim().length < 3) {
        const errorMessage = 'Template name must be at least 3 characters';
        return { success: false, message: errorMessage };
      }

      // Check if new name is similar to a symbol
      const symbols = await getCachedSymbols();
      if (isTemplateNameSimilarToSymbol(newName, symbols)) {
        const errorMessage = `You cannot rename a template to "${newName}" as it conflicts with a system template. Please choose a different name.`;
        toast.error(errorMessage);
        return { success: false, message: errorMessage };
      }

      // Check for duplicate template names before making the API call
      const existingTemplate = templates.find(t => t.id !== templateId && t.name.toLowerCase() === newName.toLowerCase());
      if (existingTemplate) {
        const errorMessage = `A template with the name "${newName}" already exists. Please choose a different name or add a number (e.g., "${newName} 2").`;
        return { success: false, message: errorMessage };
      }

      // Call API to rename template
      const response = await templateApi.renameTemplate(templateId, newName);

      if (response.success) {
        // Update local state with new name
        setTemplates(prev => prev.map(t =>
          t.id === templateId ? { ...t, name: newName } : t
        ));

        return { success: true, message: 'Template renamed successfully' };
      } else {
        // Handle API error response
        const errorMessage = response.message || 'Failed to rename template';

        // Provide more specific error messages for common issues
        if (errorMessage.includes('already have a template named')) {
          const friendlyMessage = `A template with the name "${newName}" already exists. Please choose a different name or add a number (e.g., "${newName} 2").`;
          return { success: false, message: friendlyMessage };
        }

        return { success: false, message: errorMessage };
      }
    } catch (err) {
      console.error('Failed to rename template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename template';

      // Provide more specific error messages for common issues
      if (errorMessage.includes('already have a template named')) {
        const friendlyMessage = `A template with the name "${newName}" already exists. Please choose a different name or add a number (e.g., "${newName} 2").`;
        return { success: false, message: friendlyMessage };
      }

      return { success: false, message: errorMessage };
    }
  }, [templates]);

  const updateTemplate = useCallback(async (templateId: string, updates: Partial<UserTemplate>): Promise<{ success: boolean; message?: string }> => {
    try {
      setError(null);

      // Check if user is authenticated
      const token = getAuthToken();

      // If updating isFavorite field
      if ('isFavorite' in updates && token) {
        // Check if trying to add to favorites (isFavorite = true)
        if (updates.isFavorite === true) {
          // Count current favorites
          const currentFavorites = templates.filter(t => t.isFavorite && t.id !== templateId);

          // Check if we already have 8 favorites
          if (currentFavorites.length >= 8) {
            const errorMessage = 'You can only have a maximum of 8 favorite templates. Please remove one before adding another.';
            // Don't set global error for favorite limit - just return the error message
            return { success: false, message: errorMessage };
          }
        }

        // Call API to update isFavorite field
        const result = await templateApi.updateTemplateFields(templateId, {
          isFavorite: updates.isFavorite
        });

        if (!result.success) {
          const errorMessage = result.message || 'Failed to update template favorite status';
          // Don't set global error for favorite updates - just return the error message
          return { success: false, message: errorMessage };
        }

        // Update local state after successful API call
        setTemplates(prev => prev.map(template =>
          template.id === templateId ? { ...template, ...updates } : template
        ));

        return { success: true };
      }

      // For other fields (like name, icon, etc.), check if we need to call API
      if (token && ('name' in updates || 'icon' in updates || 'displayOrder' in updates)) {
        // Prepare API fields
        const apiFields: any = {};

        if ('name' in updates) {
          apiFields.templateName = updates.name;
        }
        if ('icon' in updates) {
          apiFields.icon = updates.icon;
        }
        if ('displayOrder' in updates) {
          apiFields.displayOrder = updates.displayOrder;
        }

        // Call API to update template fields
        const result = await templateApi.updateTemplateFields(templateId, apiFields);

        if (!result.success) {
          const errorMessage = result.message || 'Failed to update template';
          setError(errorMessage);
          return { success: false, message: errorMessage };
        }
      }

      // Update local state
      setTemplates(prev => prev.map(template =>
        template.id === templateId ? { ...template, ...updates } : template
      ));

      return { success: true };
    } catch (err) {
      console.error('Failed to update template:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update template';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  }, [templates]);

  const hideTemplate = useCallback(async (templateId: string) => {
    try {
      setError(null);

      // Don't allow hiding the last template
      if (templates.length <= 1) {
        return;
      }

      // Check if user is authenticated before making API call
      const token = getAuthToken();
      if (!token) {
        // No authentication token - update local state only
        setTemplates(prev => {
          const updated = prev.map(template => 
            template.id === templateId 
              ? { ...template, displayOrder: -1 }
              : template
          );

          // If we hid the active template, switch to the first visible template
          if (activeTemplateId === templateId) {
            const visibleTemplates = updated.filter(t => t.displayOrder !== -1);
            if (visibleTemplates.length > 0) {
              setActiveTemplateId(visibleTemplates[0].id);
              saveActiveTemplateId(visibleTemplates[0].id);
            }
          }

          return updated;
        });
        return;
      }

      // User is authenticated - call API to hide template by setting displayOrder to -1
      const result = await templateApi.updateTemplateFields(templateId, { displayOrder: -1 });

      if (result.success) {
        // Update local state after successful API call - mark template as hidden
        setTemplates(prev => {
          const updated = prev.map(template => 
            template.id === templateId 
              ? { ...template, displayOrder: -1 }
              : template
          );

          // If we hid the active template, switch to the first visible template
          if (activeTemplateId === templateId) {
            const visibleTemplates = updated.filter(t => t.displayOrder !== -1);
            if (visibleTemplates.length > 0) {
              setActiveTemplateId(visibleTemplates[0].id);
              saveActiveTemplateId(visibleTemplates[0].id);
            }
          }

          return updated;
        });

      } else {
        throw new Error(result.message || 'Failed to hide template');
      }
    } catch (err) {
      console.error('Failed to hide template:', err);
      setError(err instanceof Error ? err.message : 'Failed to hide template');
      throw err; // Re-throw to be handled by the calling component
    }
  }, [templates.length, activeTemplateId, saveActiveTemplateId]);

  const deleteTemplate = useCallback(async (templateId: string) => {
    try {
      setError(null);

      // Don't allow deleting the last template
      if (templates.length <= 1) {
        return;
      }

      // Check if user is authenticated before making API call
      const token = getAuthToken();
      if (!token) {
        // No authentication token - update local state only
        // Remove grid resize localStorage key for this template
        templateGridSizesStorage.deleteTemplateGridSizes(templateId);

        setTemplates(prev => {
          const filtered = prev.filter(template => template.id !== templateId);

          // If we deleted the active template, switch to the first remaining template
          if (activeTemplateId === templateId && filtered.length > 0) {
            setActiveTemplateId(filtered[0].id);
            saveActiveTemplateId(filtered[0].id);
          }

          return filtered;
        });
        return;
      }

      // User is authenticated - call API to delete template
      const result = await templateApi.deleteTemplate(templateId);

      if (result.success) {
        // Remove grid resize localStorage key for this template
        templateGridSizesStorage.deleteTemplateGridSizes(templateId);

        // Update local state after successful API call
        setTemplates(prev => {
          const filtered = prev.filter(template => template.id !== templateId);

          // If we deleted the active template, switch to the first remaining template
          if (activeTemplateId === templateId && filtered.length > 0) {
            setActiveTemplateId(filtered[0].id);
            saveActiveTemplateId(filtered[0].id);
          }

          return filtered;
        });

      } else {
        throw new Error(result.message || 'Failed to delete template');
      }
    } catch (err) {
      console.error('Failed to delete template:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      throw err; // Re-throw to be handled by the calling component
    }
  }, [templates.length, activeTemplateId, saveActiveTemplateId]);

  const addWidgetToTemplate = useCallback(async (
    templateId: string,
    widgetId: string,
    widgetTitle: string,
    position: string,
    coordinates?: { top: number; left: number; height: number; width: number },
    customTabsID?: number
  ) => {
    try {
      setError(null);

      // Find the template to check if it's saved
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        console.error('❌ Template not found:', {
          requestedTemplateId: templateId,
          availableTemplateIds: templates.map(t => t.id),
          templates: templates.map(t => ({ id: t.id, name: t.name, saved: t.saved }))
        });
        throw new Error(`Template not found: ${templateId}`);
      }

      // Check if template has a temporary ID (starts with "temp-")
      // This means the template is being created and we need to wait for the real ID
      if (templateId.startsWith('temp-')) {
        throw new Error('Template is still being created. Please wait a moment and try again.');
      }

      // If template is not saved, work locally only (regardless of authentication)
      if (!template.saved) {
        setTemplates(prev => prev.map(t => {
          if (t.id === templateId) {
            const newWidget: TemplateWidget = {
              id: `${templateId}-${widgetId}-${Date.now()}`,
              name: widgetId,
              position,
            };

            return {
              ...t,
              widgets: [...t.widgets, newWidget],
            };
          }
          return t;
        }));
        return;
      }

      // Template is saved - check authentication and call API
      const token = getAuthToken();
      if (!token) {
        throw new Error('User must be authenticated to modify saved templates');
      }

      // Get widget-specific default additional settings and other params
      const getWidgetDefaults = (id: string): { additionalSettings: string; module?: string; symbols?: string } => {
        switch (id) {
          case 'price-chart':
            // Format: "chartStyle|showVolume|timeframe" (1|1|1h = candlestick with volume, 1 hour timeframe)
            // Module: Forex, Symbol: EURUSD
            return {
              additionalSettings: '1|1|1h',
              module: 'Forex',
              symbols: 'EURUSD'
            };
          case 'exponential-moving-average':
            // Format: "dataType|timeframe" (Institutional|4h)
            // Module: Forex, Symbol: EURUSD
            return {
              additionalSettings: 'Institutional|4h',
              module: 'Forex',
              symbols: 'EURUSD'
            };
          case 'supertrend':
            // Format: "timeframe" (4h)
            // Module: Forex, Symbol: EURUSD
            return {
              additionalSettings: '4h',
              module: 'Forex',
              symbols: 'EURUSD'
            };
          case 'supply-and-demand-areas':
            // Format: "timeframe" (4h)
            // Module: Forex, Symbol: AUDCAD
            return {
              additionalSettings: '4h',
              module: 'Forex',
              symbols: 'AUDCAD'
            };
          case 'high-and-low-points':
            // Format: "timeframe" (4h)
            // Module: Forex, Symbol: AUDCAD
            return {
              additionalSettings: '4h',
              module: 'Forex',
              symbols: 'AUDCAD'
            };
          case 'session-ranges':
            // Module: Forex, Symbol: EURUSD
            return {
              additionalSettings: 'selectAll',
              module: 'Forex',
              symbols: 'EURUSD'
            };
          case 'percent-monthly-targets':
            // Module: Forex, Symbol: EURUSD
            return {
              additionalSettings: 'selectAll',
              module: 'Forex',
              symbols: 'EURUSD'
            };
          case 'cot-table-view':
            // Format: "symbolPart|owner" (EUR|Dealer = EUR currency, Dealer reporter)
            return {
              additionalSettings: 'EUR|Dealer'
            };
          case 'cot-chart-view':
            // Format: JSON with symbol, chartType, cotDataType, cotOwner
            return {
              additionalSettings: JSON.stringify({
                symbol: 'EUR',
                chartType: 'bar chart',
                cotDataType: 'NetPercent',
                cotOwner: 'Dealer Intermediary'
              })
            };
          case 'realtime-headline-ticker':
            // Format: JSON with newsSections and newsPriorities arrays (all selected by default)
            return {
              additionalSettings: JSON.stringify({
                newsSections: [
                  'DAX', 'CAC', 'SMI', 'US Equities', 'Asian Equities', 'FTSE 100', 'European Equities',
                  'Global Equities', 'UK Equities', 'EUROSTOXX', 'US Equity Plus',
                  'US Data', 'Swiss Data', 'EU Data', 'Canadian Data', 'Other Data', 'UK Data',
                  'Other Central Banks', 'BoC', 'RBNZ', 'RBA', 'SNB', 'BoJ', 'BoE', 'ECB', 'PBoC', 'Fed', 'Bank Research',
                  'Fixed Income', 'Geopolitical', 'Rating Agency comments', 'Global News', 'Market Analysis',
                  'FX Flows', 'Asian News', 'Economic Commentary', 'Brexit', 'Energy & Power', 'Metals',
                  'Ags & Softs', 'Crypto', 'Emerging Markets', 'US Election', 'Trade', 'Newsquawk Update'
                ],
                newsPriorities: ['Important', 'Rumour', 'Highlighted', 'Normal']
              })
            };
          case 'currency-strength':
            // Format: JSON with currencies array, timeframe, and showVolume
            return {
              additionalSettings: JSON.stringify({
                currencies: ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CHF', 'CAD', 'NZD'],
                timeframe: '7d',
                showVolume: 1
              })
            };
          default:
            return {
              additionalSettings: 'selectAll'
            };
        }
      };

      const widgetDefaults = getWidgetDefaults(widgetId);

      // Call API to add widget to template
      const response = await templateApi.addWidgetToTemplate(
        templateId,
        widgetTitle,
        widgetDefaults.additionalSettings, // Widget-specific default additional settings
        coordinates, // Pass coordinates for free-floating templates
        position, // Pass cell ID position (g22_1, gt22_1, etc.)
        customTabsID, // Pass CustomTabsID for tabbed widgets
        widgetDefaults.module, // Pass module if provided
        widgetDefaults.symbols // Pass symbols if provided
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to add widget to template');
      }

      // Check if this is a "No Access" response - widget should be added but marked as restricted
      const isNoAccess = (response as { noAccess?: boolean }).noAccess === true;

      // Update local state after successful API call
      setTemplates(prev => prev.map(template => {
        if (template.id === templateId) {
          const newWidget: TemplateWidget = {
            id: `${templateId}-${widgetId}-${Date.now()}`,
            name: widgetId,
            position,
            // Set accessStatus in settings if "No Access" response
            ...(isNoAccess && {
              settings: {
                accessStatus: 'no access'
              }
            })
          };

          return {
            ...template,
            widgets: [...template.widgets, newWidget],
          };
        }
        return template;
      }));

      // Note: We don't refresh from API here to avoid unnecessary loading
      // The caller (BloombergDashboard or TabbedWidget) will handle refreshing if needed

    } catch (err) {
      console.error('Failed to add widget to template:', err);
      setError(err instanceof Error ? err.message : 'Failed to add widget to template');
      throw err; // Re-throw to be handled by the calling component
    }
  }, [templates]); // Add templates dependency to get updated templates array

  const removeWidgetFromTemplate = useCallback(async (templateId: string, position: string) => {
    try {
      setError(null);

      // Find the template and widget to remove
      const template = templates.find(t => t.id === templateId);
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Try to find widget by exact position match first
      let widgetToRemove = template.widgets.find(w => w.position === position);

      // If not found and position is a grid cell ID (like g36_1), try converting to area format (area-1)
      if (!widgetToRemove && /^g\d+_\d+/.test(position)) {
        const areaPosition = position.replace(/^g\d+_/, 'area-');
        widgetToRemove = template.widgets.find(w => w.position === areaPosition);
      }

      // If not found and position is a tabbed widget cell ID (like gt21_1), try converting to area format (area-1)
      if (!widgetToRemove && /^gt\d+_\d+/.test(position)) {
        const areaPosition = position.replace(/^gt\d+_/, 'area-');
        widgetToRemove = template.widgets.find(w => w.position === areaPosition);
      }

      // If still not found, try the reverse: if position is area format, try grid cell ID
      if (!widgetToRemove && /^area-\d+/.test(position)) {
        // Extract the number from area-X
        const areaNumber = position.replace(/^area-/, '');
        // Try to find widget by matching the area number in grid cell format
        // This is a fallback - we'll search for any widget that might match
        const gridCellPattern = new RegExp(`^g\\d+_${areaNumber}$`);
        widgetToRemove = template.widgets.find(w => gridCellPattern.test(w.position));
        
        // Also try tabbed widget format if still not found
        if (!widgetToRemove) {
          const tabbedCellPattern = new RegExp(`^gt\\d+_${areaNumber}$`);
          widgetToRemove = template.widgets.find(w => tabbedCellPattern.test(w.position));
        }
      }

      if (!widgetToRemove) {
        // Log available positions for debugging
        const availablePositions = template.widgets.map(w => w.position);
        console.error('Widget not found at position:', {
          requestedPosition: position,
          availablePositions,
          templateId,
          widgetCount: template.widgets.length
        });
        throw new Error(`Widget not found at position: ${position}`);
      }

      // Extract the actual widget ID from the composite ID (format: "templateId-widgetId")
      const actualWidgetId = widgetToRemove.id.split('-').pop();
      if (!actualWidgetId) {
        throw new Error(`Invalid widget ID format: ${widgetToRemove.id}`);
      }

      console.log('Removing widget:', {
        templateId,
        position,
        widgetId: widgetToRemove.id,
        actualWidgetId,
        widgetName: widgetToRemove.name,
        templateSaved: template.saved
      });

      // Check if user is authenticated
      const token = getAuthToken();

      // For saved templates, always call the API to remove the widget
      if (template.saved && token) {
        // Call API to remove widget from template
        const response = await templateApi.removeWidgetByID(templateId, actualWidgetId);

        if (!response.success) {
          throw new Error(response.message || 'Failed to remove widget from template');
        }

        // Update local state directly instead of refetching all templates
        // This is more efficient and provides immediate UI feedback
        const actualPosition = widgetToRemove.position;
        setTemplates(prev => prev.map(t => {
          if (t.id === templateId) {
            return {
              ...t,
              widgets: t.widgets.filter(widget => widget.position !== actualPosition),
            };
          }
          return t;
        }));

        return;
      }

      // For unsaved templates or when not authenticated, just update local state
      // Get the actual position of the widget to remove (might be different from input position)
      const actualPosition = widgetToRemove.position;

      setTemplates(prev => prev.map(t => {
        if (t.id === templateId) {
          return {
            ...t,
            widgets: t.widgets.filter(widget => widget.position !== actualPosition),
          };
        }
        return t;
      }));

    } catch (err) {
      console.error('Failed to remove widget from template:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove widget from template');
      // No need to refetch on error - if the API call failed, nothing changed on the server
    }
  }, [templates]);

  const updateWidgetFields = useCallback(async (widgetId: string, templateId: string, updates: any): Promise<{ success: boolean; message: string }> => {
    try {
      setError(null);

      // Check if user is authenticated
      const token = getAuthToken();
      if (!token) {
        return { success: false, message: 'Please log in to update widget fields' };
      }

      // Call API to update widget fields
      const response = await templateApi.updateWidgetFields(widgetId, templateId, updates);

      if (response.success) {
        return { success: true, message: 'Widget fields updated successfully' };
      } else {
        return { success: false, message: response.message || 'Failed to update widget fields' };
      }
    } catch (err) {
      console.error('Failed to update widget fields:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update widget fields';
      return { success: false, message: errorMessage };
    }
  }, []);

  const reorderTemplates = useCallback(async (reorderedTemplates: UserTemplate[]) => {
    try {
      setError(null);

      // Check if user is authenticated before making API calls
      const token = getAuthToken();
      if (!token) {
        // No authentication token - merge reordered with existing templates
        const reorderedIds = new Set(reorderedTemplates.map(t => t.id));
        const unchangedTemplates = templates.filter(t => !reorderedIds.has(t.id));
        setTemplates([...reorderedTemplates, ...unchangedTemplates]);
        return;
      }

      // Calculate new displayOrder values (1, 2, 3, 4, ...)
      const updatePromises = reorderedTemplates.map(async (template, index) => {
        const newDisplayOrder = index + 1;

        const result = await templateApi.updateTemplateFields(template.id, {
          displayOrder: newDisplayOrder
        });

        if (!result.success) {
          throw new Error(`Failed to update template ${template.name}: ${result.message}`);
        }

        return result;
      });

      // Update all templates via API
      await Promise.all(updatePromises);

      // Merge reordered templates with templates that weren't in the reorder list
      // This preserves templates with displayOrder: -1 or other templates not included in the reorder
      const reorderedIds = new Set(reorderedTemplates.map(t => t.id));
      const unchangedTemplates = templates.filter(t => !reorderedIds.has(t.id));
      setTemplates([...reorderedTemplates, ...unchangedTemplates]);

    } catch (err) {
      console.error('Failed to reorder templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to reorder templates');

      // On error, still merge templates to maintain consistency
      const reorderedIds = new Set(reorderedTemplates.map(t => t.id));
      const unchangedTemplates = templates.filter(t => !reorderedIds.has(t.id));
      setTemplates([...reorderedTemplates, ...unchangedTemplates]);
    }
  }, [templates]);

  const refreshTemplates = useCallback(async (preferredActiveTemplateName?: string, skipLoading: boolean = false, preferredActiveTemplateId?: string, clearTabCache: boolean = false) => {
    // If there's already a fetch in progress, wait for it instead of starting a new one
    // This prevents duplicate API calls when multiple components call refreshTemplates
    if (fetchInProgressRef.current) {
      await fetchInProgressRef.current;
      return;
    }
    
    // Clear cache before fetching to ensure we get fresh data from API
    clearTemplatesCache();

    // Only clear tab widgets cache if explicitly requested
    // When creating a details template, tabs are added to cache by createDetailsTemplate,
    // and we don't want to clear them immediately after
    if (clearTabCache) {
      try {
        const { clearAllTabWidgetsCache } = await import('@/lib/tabWidgetApi');
        await clearAllTabWidgetsCache();
      } catch (error) {
        console.warn('⚠️ Failed to clear tab widgets cache:', error);
      }
    }

    await fetchTemplates(preferredActiveTemplateName, true, skipLoading, preferredActiveTemplateId);
  }, [fetchTemplates]);

  const refreshTemplateWidgets = useCallback(async (templateId: string) => {
    try {
      setError(null);

      // Fetch only the widgets for this specific template from API
      const updatedTemplate = await templateApi.refreshTemplateWidgets(templateId);

      if (!updatedTemplate) {
        throw new Error('Failed to refresh template widgets');
      }

      // Update only this template in local state
      setTemplates(prev => prev.map(template => 
        template.id === templateId ? updatedTemplate : template
      ));
    } catch (err) {
      console.error('Failed to refresh template widgets:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh template widgets');
      throw err;
    }
  }, []);

  // Custom setActiveTemplateId that also saves to localStorage
  const handleSetActiveTemplateId = useCallback((id: string) => {
    console.log('🔄 Template Switch:', {
      templateId: id,
      'data-templateid': id,
      timestamp: new Date().toISOString()
    });
    setActiveTemplateId(id);
    saveActiveTemplateId(id);
  }, [saveActiveTemplateId]);

  // Load templates on mount
  // Use cached data first to reduce API calls on page refresh
  // Cache will be populated if empty, or used if available
  useEffect(() => {
    fetchTemplates(undefined, false); // Use cache first on page load
     
  }, []); // Only run on mount, not when fetchTemplates changes

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const removeWidgetByID = useCallback(async (templateId: string, widgetId: string) => {
    try {
      setError(null);

      // Check if user is authenticated
      const token = getAuthToken();
      if (!token) {
        throw new Error('Please log in to remove widgets');
      }

      // Call API to remove widget by ID
      const response = await templateApi.removeWidgetByID(templateId, widgetId);

      if (!response.success) {
        throw new Error(response.message || 'Failed to remove widget');
      }

      // Update local state directly instead of refetching all templates
      // Find and remove the widget by ID from the template
      setTemplates(prev => prev.map(t => {
        if (t.id === templateId) {
          // Remove widget by matching the widget ID (could be full ID or just the numeric part)
          const filtered = t.widgets.filter(widget => {
            const widgetIdParts = widget.id.split('-');
            const numericWidgetId = widgetIdParts[widgetIdParts.length - 1];
            return numericWidgetId !== widgetId && widget.id !== widgetId;
          });
          return {
            ...t,
            widgets: filtered,
          };
        }
        return t;
      }));

    } catch (err) {
      console.error('Failed to remove widget:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove widget');
      throw err; // Re-throw to be handled by the calling component
    }
  }, [templates]);

  return {
    templates,
    activeTemplateId,
    isLoading,
    error,
    setActiveTemplateId: handleSetActiveTemplateId,
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
  };
}