/**
 * Utility functions for handling template images
 * Templates can have custom images stored in /public/assets/template-images/
 * Image files should be named after the template name in lowercase (e.g., audcad.svg, audcad.png, etc.)
 * 
 * NOTE: Custom images are ONLY for "details templates" - templates created from symbol searches
 * (e.g., EURUSD, NASDAQ:AAPL, XAUUSD). Regular user-created templates should use icons/emojis.
 */

const SUPPORTED_IMAGE_FORMATS = ['svg', 'png', 'webp', 'jpg', 'jpeg', 'gif'];

/**
 * Check if a template name matches the "details template" pattern
 * Details templates are created when users search for symbols and have names like:
 * - Forex pairs: EURUSD, GBPJPY, AUDUSD (6 uppercase letters)
 * - Forex with slash: EUR/USD, GBP/JPY
 * - Stock symbols: NASDAQ:AAPL, NYSE:MSFT
 * - Commodities: XAUUSD, XAGUSD
 * - Crypto: BTCUSD, ETHUSD
 * - Indices: US30, US500, GER40
 * 
 * @param templateName - The name of the template to check
 * @returns true if this is a details template, false otherwise
 */
export function isDetailsTemplate(templateName: string): boolean {
  if (!templateName) return false;
  
  const name = templateName.trim();
  
  // Pattern 1: Forex pairs - 6 uppercase letters (EURUSD, GBPJPY)
  const forexPattern = /^[A-Z]{6}$/;
  // Pattern 2: Forex with slash - XXX/XXX (EUR/USD)
  const forexSlashPattern = /^[A-Z]{3}\/[A-Z]{3}$/;
  // Pattern 3: Exchange:Symbol format (NASDAQ:AAPL, NYSE:MSFT)
  const exchangeSymbolPattern = /^[A-Z]+:[A-Z0-9.]+$/i;
  // Pattern 4: Commodities and metals (XAUUSD, XAGUSD - XAU/XAG followed by currency)
  const commodityPattern = /^X[A-Z]{2}[A-Z]{3}$/;
  // Pattern 5: Crypto pairs (BTCUSD, ETHUSD, etc.)
  const cryptoPattern = /^(BTC|ETH|XRP|LTC|BCH|ADA|DOT|LINK|XLM|UNI|DOGE|SOL|AVAX|MATIC)[A-Z]{3}$/;
  // Pattern 6: Indices (US30, US500, GER40, UK100, etc.)
  const indexPattern = /^(US|UK|GER|FRA|EU|JP|AU|HK|CH)[0-9]+$/i;
  
  return forexPattern.test(name) ||
         forexSlashPattern.test(name) ||
         exchangeSymbolPattern.test(name) ||
         commodityPattern.test(name) ||
         cryptoPattern.test(name) ||
         indexPattern.test(name);
}

/**
 * Sanitize template name for use as a filename
 * Replaces characters that are invalid in filenames and converts to lowercase
 * @param templateName - The template name to sanitize
 * @returns Sanitized filename in lowercase
 */
function sanitizeTemplateNameForFile(templateName: string): string {
  return templateName
    .trim()
    .toLowerCase()  // Convert to lowercase for consistency
    .replace(/:/g, '_')  // Replace colons with underscores
    .replace(/\//g, '_') // Replace forward slashes with underscores
    .replace(/\\/g, '_') // Replace backslashes with underscores
    .replace(/[<>"|?*]/g, '_'); // Replace other invalid filename characters
}

/**
 * Get the image path for a template if it exists
 * Only returns a path for "details templates" (symbol-based templates)
 * @param templateName - The name of the template
 * @returns The image path if found, null otherwise
 */
export function getTemplateImagePath(templateName: string): string | null {
  if (!templateName) return null;
  
  // Only details templates (symbol-based) should have custom images
  if (!isDetailsTemplate(templateName)) return null;
  
  // Sanitize template name for use as a filename
  const sanitizedName = sanitizeTemplateNameForFile(templateName);
  
  // Try each supported format
  for (const format of SUPPORTED_IMAGE_FORMATS) {
    const imagePath = `/assets/template-images/${sanitizedName}.${format}`;
    // Note: In Next.js, we can't synchronously check if a file exists on the client
    // The component will need to handle image loading errors
    return imagePath;
  }
  
  return null;
}

/**
 * Check if a template has a custom image
 * This returns the first matching image path, but doesn't verify existence
 * The component should handle onError for the <img> tag
 * Only returns a path for "details templates" (symbol-based templates)
 * @param templateName - The name of the template
 * @returns The potential image path or null
 */
export function getTemplateImageUrl(templateName: string): string | null {
  if (!templateName) return null;
  
  // Only details templates (symbol-based) should have custom images
  if (!isDetailsTemplate(templateName)) return null;
  
  const sanitizedName = sanitizeTemplateNameForFile(templateName);
  
  // Return the base path - the component will try different formats
  // Start with .svg as the default format for forex images
  return `/assets/template-images/${sanitizedName}.svg`;
}

/**
 * Get all possible image paths for a template (for preloading or checking)
 * Only returns paths for "details templates" (symbol-based templates)
 * Regular templates should use icons/emojis, not images
 * @param templateName - The name of the template
 * @returns Array of all possible image paths (empty for non-details templates)
 */
export function getAllTemplateImagePaths(templateName: string): string[] {
  if (!templateName) return [];
  
  // Only details templates (symbol-based) should have custom images
  if (!isDetailsTemplate(templateName)) return [];
  
  const sanitizedName = sanitizeTemplateNameForFile(templateName);
  
  return SUPPORTED_IMAGE_FORMATS.map(format => 
    `/assets/template-images/${sanitizedName}.${format}`
  );
}
