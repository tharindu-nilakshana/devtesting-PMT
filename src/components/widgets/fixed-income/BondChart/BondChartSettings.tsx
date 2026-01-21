'use client';

import { useState, useMemo, useEffect } from 'react';
import { Settings2, X, ChevronDown } from 'lucide-react';
import { BOND_SYMBOLS, getSymbolById } from '@/types/bond';

interface BondChartSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSymbol: string;
  selectedDisplay: string;
  onSymbolChange: (symbol: string) => void;
  onDisplayChange: (display: string) => void;
}

const DISPLAY_MODES = [
  { id: 'yield', name: 'Yield' },
  { id: 'price', name: 'Price' },
];

// Get unique countries from bond symbols
const COUNTRIES = [...new Set(BOND_SYMBOLS.map(s => s.country))];

// Get maturities for a specific country
function getMaturitiesForCountry(country: string): string[] {
  return BOND_SYMBOLS
    .filter(s => s.country === country)
    .map(s => s.maturity);
}

// Find symbol by country and maturity
function findSymbol(country: string, maturity: string): string | undefined {
  const symbol = BOND_SYMBOLS.find(s => s.country === country && s.maturity === maturity);
  return symbol?.id;
}

export function BondChartSettings({
  isOpen,
  onClose,
  selectedSymbol,
  selectedDisplay,
  onSymbolChange,
  onDisplayChange,
}: BondChartSettingsProps) {
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  // Get current country and maturity from selected symbol
  const selectedSymbolData = getSymbolById(selectedSymbol);
  const [selectedCountry, setSelectedCountry] = useState(selectedSymbolData?.country || COUNTRIES[0]);
  const [selectedMaturity, setSelectedMaturity] = useState(selectedSymbolData?.maturity || '10Y');

  // Get available maturities for the selected country
  const availableMaturities = useMemo(() => {
    return getMaturitiesForCountry(selectedCountry);
  }, [selectedCountry]);

  // Update symbol when country or maturity changes
  useEffect(() => {
    const newSymbol = findSymbol(selectedCountry, selectedMaturity);
    if (newSymbol && newSymbol !== selectedSymbol) {
      onSymbolChange(newSymbol);
    }
  }, [selectedCountry, selectedMaturity, selectedSymbol, onSymbolChange]);

  // When country changes, check if current maturity is available
  useEffect(() => {
    if (!availableMaturities.includes(selectedMaturity)) {
      // Select the first available maturity for this country
      setSelectedMaturity(availableMaturities[0] || '10Y');
    }
  }, [selectedCountry, availableMaturities, selectedMaturity]);

  // Sync with external symbol changes
  useEffect(() => {
    if (selectedSymbolData) {
      setSelectedCountry(selectedSymbolData.country);
      setSelectedMaturity(selectedSymbolData.maturity);
    }
  }, [selectedSymbolData]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Settings Panel */}
      <div className="w-full sm:w-80 max-w-[320px] bg-widget-body border-l border-border flex flex-col animate-slide-in-from-right">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <span className="text-foreground text-sm sm:text-base font-bold">Bond Chart Settings</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Country Selection (Dropdown) */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block font-bold">
              Country
            </label>
            <div className="relative">
              <button
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-widget-header border border-border rounded text-sm text-foreground hover:border-muted-foreground transition-colors"
              >
                <span className="font-bold">{selectedCountry}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isCountryDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-widget-body border border-border rounded shadow-lg z-10 overflow-hidden max-h-60 overflow-y-auto">
                  {COUNTRIES.map((country) => (
                    <button
                      key={country}
                      onClick={() => {
                        setSelectedCountry(country);
                        setIsCountryDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                        selectedCountry === country
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-widget-header'
                      }`}
                    >
                      <span className="font-bold">{country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Maturity Selection (Buttons) */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block font-bold">
              Maturity
            </label>
            <div className="flex flex-wrap gap-2">
              {availableMaturities.map((maturity) => (
                <button
                  key={maturity}
                  onClick={() => setSelectedMaturity(maturity)}
                  className={`px-3 py-1.5 text-sm rounded border transition-colors font-bold ${
                    selectedMaturity === maturity
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-widget-header/50 text-foreground hover:bg-widget-header border-border'
                  }`}
                >
                  {maturity}
                </button>
              ))}
            </div>
          </div>

          {/* Display Mode Selection */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block font-bold">
              Display
            </label>
            <div className="space-y-2">
              {DISPLAY_MODES.map((mode) => (
                <div
                  key={mode.id}
                  onClick={() => onDisplayChange(mode.id)}
                  className={`flex items-center gap-2 p-2 rounded border transition-colors cursor-pointer ${
                    selectedDisplay === mode.id
                      ? 'bg-primary/20 text-primary border-primary'
                      : 'bg-widget-header/50 text-foreground hover:bg-widget-header border-transparent'
                  }`}
                >
                  <span className="flex-1 text-sm font-bold">{mode.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export constants for use in parent component
export { DISPLAY_MODES };

export default BondChartSettings;
