/**
 * Symbol Mapping Utility
 * Maps forex symbol codes to their full display names
 */

// Currency name mappings
const CURRENCY_NAMES: Record<string, string> = {
    EUR: "Euro",
    USD: "US Dollar",
    GBP: "British Pound",
    JPY: "Japanese Yen",
    AUD: "Australian Dollar",
    CAD: "Canadian Dollar",
    CHF: "Swiss Franc",
    NZD: "New Zealand Dollar",
    CNY: "Chinese Yuan",
    HKD: "Hong Kong Dollar",
    SGD: "Singapore Dollar",
    SEK: "Swedish Krona",
    NOK: "Norwegian Krone",
    DKK: "Danish Krone",
    ZAR: "South African Rand",
    MXN: "Mexican Peso",
    TRY: "Turkish Lira",
    PLN: "Polish Zloty",
    RUB: "Russian Ruble",
    INR: "Indian Rupee",
    BRL: "Brazilian Real",
    KRW: "South Korean Won",
};

// Forex pair symbol mapping
const FOREX_SYMBOL_NAMES: Record<string, string> = {
    EURUSD: "Euro / US Dollar",
    GBPUSD: "British Pound / US Dollar",
    USDJPY: "US Dollar / Japanese Yen",
    AUDUSD: "Australian Dollar / US Dollar",
    USDCAD: "US Dollar / Canadian Dollar",
    USDCHF: "US Dollar / Swiss Franc",
    NZDUSD: "New Zealand Dollar / US Dollar",
    EURJPY: "Euro / Japanese Yen",
    GBPJPY: "British Pound / Japanese Yen",
    AUDJPY: "Australian Dollar / Japanese Yen",
    CADJPY: "Canadian Dollar / Japanese Yen",
    CHFJPY: "Swiss Franc / Japanese Yen",
    NZDJPY: "New Zealand Dollar / Japanese Yen",
    EURGBP: "Euro / British Pound",
    EURAUD: "Euro / Australian Dollar",
    EURCAD: "Euro / Canadian Dollar",
    EURCHF: "Euro / Swiss Franc",
    EURNZD: "Euro / New Zealand Dollar",
    GBPAUD: "British Pound / Australian Dollar",
    GBPCAD: "British Pound / Canadian Dollar",
    GBPCHF: "British Pound / Swiss Franc",
    GBPNZD: "British Pound / New Zealand Dollar",
    AUDCAD: "Australian Dollar / Canadian Dollar",
    AUDCHF: "Australian Dollar / Swiss Franc",
    AUDNZD: "Australian Dollar / New Zealand Dollar",
    CADCHF: "Canadian Dollar / Swiss Franc",
    NZDCAD: "New Zealand Dollar / Canadian Dollar",
    NZDCHF: "New Zealand Dollar / Swiss Franc",
};

/**
 * Get the display name for a given symbol
 * @param symbol - The symbol code (e.g., "EURUSD")
 * @param module - The asset module (e.g., "Forex", "Commodities", "Indices")
 * @returns The full display name (e.g., "Euro / US Dollar") or fallback format
 */
export function getSymbolDisplayName(symbol: string, module?: string): string {
    if (!symbol) return "";

    // Remove any existing slashes or special characters for lookup
    const cleanSymbol = symbol.replace(/[/:]/g, "").toUpperCase();

    // For Forex, check if we have a direct mapping
    if (!module || module === "Forex") {
        // Check direct mapping first
        if (FOREX_SYMBOL_NAMES[cleanSymbol]) {
            return FOREX_SYMBOL_NAMES[cleanSymbol];
        }

        // If it's a 6-character forex pair, try to construct the name
        if (cleanSymbol.length === 6) {
            const baseCurrency = cleanSymbol.substring(0, 3);
            const quoteCurrency = cleanSymbol.substring(3, 6);

            const baseName = CURRENCY_NAMES[baseCurrency];
            const quoteName = CURRENCY_NAMES[quoteCurrency];

            if (baseName && quoteName) {
                return `${baseName} / ${quoteName}`;
            }

            // Fallback to simple slash format
            return `${baseCurrency}/${quoteCurrency}`;
        }
    }

    // For other modules or unknown symbols, return the symbol as-is or with basic formatting
    if (cleanSymbol.length === 6 && !symbol.includes('/')) {
        return `${cleanSymbol.substring(0, 3)}/${cleanSymbol.substring(3)}`;
    }

    return symbol;
}

/**
 * Get just the base/quote format (e.g., "EUR/USD") from a symbol
 * @param symbol - The symbol code (e.g., "EURUSD")
 * @returns The formatted symbol (e.g., "EUR/USD")
 */
export function getSymbolShortFormat(symbol: string): string {
    if (!symbol) return "";

    const cleanSymbol = symbol.replace(/[/:]/g, "").toUpperCase();

    if (cleanSymbol.length === 6 && !symbol.includes('/')) {
        return `${cleanSymbol.substring(0, 3)}/${cleanSymbol.substring(3)}`;
    }

    return symbol;
}
