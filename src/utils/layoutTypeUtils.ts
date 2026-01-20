/**
 * Layout Type Utilities
 * 
 * Helper functions for handling layoutType values across the application.
 * The system supports three layoutType values:
 * - 'grid': Standard grid-based layout
 * - 'Details': Legacy layoutType that represents a grid layout (should be treated same as 'grid')
 * - 'free-floating': Free-floating canvas layout
 */

/**
 * Check if a layoutType represents a grid-based layout
 * Both 'grid' and 'Details' are grid-based layouts
 * 
 * @param layoutType - The layoutType value from the API or template
 * @returns true if it's a grid layout (including 'Details')
 */
export function isGridLayoutType(layoutType: string | undefined): boolean {
    if (!layoutType) return false;
    return layoutType === 'grid' || layoutType === 'Details';
}

/**
 * Check if a layoutType represents a free-floating layout
 * 
 * @param layoutType - The layoutType value from the API or template
 * @returns true if it's a free-floating layout
 */
export function isFreeFloatingLayoutType(layoutType: string | undefined): boolean {
    return layoutType === 'free-floating';
}

/**
 * Normalize a layoutType value for consistent handling
 * Converts 'Details' to 'grid' for internal use
 * 
 * @param layoutType - The layoutType value from the API
 * @returns Normalized layoutType ('grid' or 'free-floating')
 */
export function normalizeLayoutType(layoutType: string): 'grid' | 'free-floating' {
    if (layoutType === 'free-floating') {
        return 'free-floating';
    }
    // Treat both 'grid' and 'Details' as 'grid'
    return 'grid';
}

/**
 * Get the layoutType to send to the API based on the template layout
 * 
 * @param layout - The template layout name (e.g., '3-grid-left-large', 'free-floating')
 * @returns The layoutType for the API request
 */
export function getLayoutTypeForApi(layout: string): 'free-floating' | 'grid' {
    if (layout === 'free-floating') {
        return 'free-floating';
    }
    // All other layouts are grid-based
    return 'grid';
}
