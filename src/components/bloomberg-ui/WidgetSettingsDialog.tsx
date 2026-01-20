import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { useState } from "react";
import { 
  TrendingUp, 
  BarChart3, 
  Newspaper,
  Settings2,
  Calendar,
  DollarSign,
  Clock,
  TrendingDown,
  Activity
} from "lucide-react";

export interface WidgetSettings {
  // Trading Chart Settings
  currencies?: string[];
  timeframe?: string;
  chartType?: string;
  indicators?: string[];
  showVolume?: boolean;
  
  // Order Book Settings
  depth?: number;
  grouping?: string;
  
  // Watchlist Settings
  columns?: string[];
  sortBy?: string;
  
  // News Feed Settings
  sources?: string[];
  categories?: string[];
  
  // Trading Panel Settings
  orderType?: string;
  leverage?: number;
  
  // Date Range
  dateFrom?: string;
  dateTo?: string;
}

interface WidgetSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  widgetType: string;
  widgetPosition: string;
  currentSettings: WidgetSettings;
  onSave: (settings: WidgetSettings) => void;
}

export function WidgetSettingsDialog({
  isOpen,
  onClose,
  widgetType,
  widgetPosition,
  currentSettings,
  onSave,
}: WidgetSettingsDialogProps) {
  const [settings, setSettings] = useState<WidgetSettings>(currentSettings);

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const getWidgetIcon = () => {
    switch (widgetType) {
      case "cot-positioning":
        return <BarChart3 className="w-5 h-5 text-primary" />;
      case "currency-strength":
        return <TrendingUp className="w-5 h-5 text-primary" />;
      case "risk-sentiment":
        return <Activity className="w-5 h-5 text-primary" />;
      case "risk-indicator":
        return <TrendingDown className="w-5 h-5 text-primary" />;
      case "news-ticker":
        return <Newspaper className="w-5 h-5 text-primary" />;
      case "economic-calendar":
        return <Calendar className="w-5 h-5 text-primary" />;
      case "seasonality-performance-chart":
        return <BarChart3 className="w-5 h-5 text-primary" />;
      case "seasonality-forecast-chart":
        return <BarChart3 className="w-5 h-5 text-primary" />;
      case "seasonality-forecast":
        return <BarChart3 className="w-5 h-5 text-primary" />;
      case "seasonality-forecast-table":
        return <BarChart3 className="w-5 h-5 text-primary" />;
      case "seasonality-performance-table":
        return <BarChart3 className="w-5 h-5 text-primary" />;
      default:
        return <Settings2 className="w-5 h-5 text-primary" />;
    }
  };

  const getWidgetName = () => {
    const names: Record<string, string> = {
      "cot-positioning": "COT Positioning",
      "currency-strength": "Currency Strength",
      "risk-sentiment": "Risk Sentiment",
      "risk-indicator": "Risk Indicator",
      "news-ticker": "News Ticker",
      "economic-calendar": "Economic Calendar",
      "seasonality-performance-chart": "Seasonality Performance Chart",
      "seasonality-forecast-chart": "Seasonality Forecast Chart",
      "seasonality-forecast": "Seasonality Forecast",
      "seasonality-forecast-table": "Seasonality Forecast Table",
      "seasonality-performance-table": "Seasonality Performance Table",
    };
    return names[widgetType] || "Widget";
  };

  const toggleCurrency = (currency: string) => {
    const currencies = settings.currencies || ["USD"];
    if (currencies.includes(currency)) {
      setSettings({
        ...settings,
        currencies: currencies.filter(c => c !== currency),
      });
    } else {
      setSettings({
        ...settings,
        currencies: [...currencies, currency],
      });
    }
  };


  const renderCOTPositioningSettings = () => (
    <div className="space-y-6">
      {/* Currency Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm text-foreground">Currency</Label>
        </div>
        <Select 
          value={settings.currencies?.[0] || "USD"} 
          onValueChange={(value) => setSettings({...settings, currencies: [value]})}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="GBP">GBP</SelectItem>
            <SelectItem value="JPY">JPY</SelectItem>
            <SelectItem value="AUD">AUD</SelectItem>
            <SelectItem value="CAD">CAD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reporter Type */}
      <div className="space-y-3">
        <Label className="text-sm text-foreground">Reporter Type</Label>
        <Select 
          value={settings.grouping || "Dealer"} 
          onValueChange={(value) => setSettings({...settings, grouping: value})}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Dealer">Dealer</SelectItem>
            <SelectItem value="Asset Manager">Asset Manager</SelectItem>
            <SelectItem value="Leveraged Money">Leveraged Money</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderCurrencyStrengthSettings = () => (
    <div className="space-y-6">
      {/* Timeframe */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm text-foreground">Timeframe</Label>
        </div>
        <Select 
          value={settings.timeframe || "1H"} 
          onValueChange={(value) => setSettings({...settings, timeframe: value})}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5M">5 Minutes</SelectItem>
            <SelectItem value="15M">15 Minutes</SelectItem>
            <SelectItem value="1H">1 Hour</SelectItem>
            <SelectItem value="4H">4 Hours</SelectItem>
            <SelectItem value="1D">1 Day</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Currencies */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm text-foreground">Currencies</Label>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY"].map((currency) => (
            <button
              key={currency}
              onClick={() => toggleCurrency(currency)}
              className={`flex items-center gap-2 px-3 py-2 rounded border transition-colors ${
                (settings.currencies || ["USD"]).includes(currency)
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-widget-body border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center ${
                  (settings.currencies || ["USD"]).includes(currency)
                    ? "bg-primary border-primary"
                    : "bg-widget-body border-border"
                }`}
              >
                {(settings.currencies || ["USD"]).includes(currency) && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <span className="text-sm">{currency}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRiskSentimentSettings = () => (
    <div className="space-y-6">
      {/* Date Range */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm text-foreground">Date Range</Label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={settings.dateFrom || ""}
              onChange={(e) => setSettings({...settings, dateFrom: e.target.value})}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={settings.dateTo || ""}
              onChange={(e) => setSettings({...settings, dateTo: e.target.value})}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderNewsTickerSettings = () => (
    <div className="space-y-6">
      {/* News Sources */}
      <div className="space-y-3">
        <Label className="text-sm text-foreground">News Sources</Label>
        <div className="space-y-2">
          {["Bloomberg", "Reuters", "MarketWatch", "Financial Times"].map((source) => (
            <div key={source} className="flex items-center space-x-2">
              <Checkbox
                id={source}
                checked={(settings.sources || ["Bloomberg"]).includes(source)}
                onCheckedChange={(checked) => {
                  const sources = settings.sources || ["Bloomberg"];
                  if (checked) {
                    setSettings({...settings, sources: [...sources, source]});
                  } else {
                    setSettings({...settings, sources: sources.filter(s => s !== source)});
                  }
                }}
              />
              <Label htmlFor={source} className="text-sm text-foreground">{source}</Label>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <Label className="text-sm text-foreground">Categories</Label>
        <div className="space-y-2">
          {["Market News", "Economic Data", "Central Banks", "Politics"].map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={category}
                checked={(settings.categories || ["Market News"]).includes(category)}
                onCheckedChange={(checked) => {
                  const categories = settings.categories || ["Market News"];
                  if (checked) {
                    setSettings({...settings, categories: [...categories, category]});
                  } else {
                    setSettings({...settings, categories: categories.filter(c => c !== category)});
                  }
                }}
              />
              <Label htmlFor={category} className="text-sm text-foreground">{category}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEconomicCalendarSettings = () => (
    <div className="space-y-6">
      {/* Impact Level Filter */}
      <div className="space-y-3">
        <Label className="text-sm text-foreground">Impact Level</Label>
        <div className="space-y-2">
          {["High", "Medium", "Low"].map((impact) => (
            <div key={impact} className="flex items-center space-x-2">
              <Checkbox
                id={impact}
                checked={(settings.categories || ["High", "Medium", "Low"]).includes(impact)}
                onCheckedChange={(checked) => {
                  const categories = settings.categories || ["High", "Medium", "Low"];
                  if (checked) {
                    setSettings({...settings, categories: [...categories, impact]});
                  } else {
                    setSettings({...settings, categories: categories.filter(c => c !== impact)});
                  }
                }}
              />
              <Label htmlFor={impact} className="text-sm text-foreground">{impact}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSeasonalityPerformanceChartSettings = () => {
    const forexSymbols = [
      "EURUSD", "EURAUD", "EURGBP", "EURNZD", "EURCAD", "EURCHF", "EURJPY",
      "USDEUR", "USDAUD", "USDGBP", "USDNZD", "USDCAD", "USDCHF", "USDJPY",
      "AUDEUR", "AUDUSD", "AUDGBP", "AUDNZD", "AUDCAD", "AUDCHF", "AUDJPY",
      "GBPEUR", "GBPUSD", "GBPAUD", "GBPNZD", "GBPCAD", "GBPCHF", "GBPJPY",
      "NZDEUR", "NZDUSD", "NZDAUD", "NZDGBP", "NZDCAD", "NZDCHF", "NZDJPY",
      "CADEUR", "CADUSD", "CADAUD", "CADGBP", "CADNZD", "CADCHF", "CADJPY",
      "CHFEUR", "CHFUSD", "CHFAUD", "CHFGBP", "CHFNZD", "CHFCAD", "CHFJPY",
      "JPYEUR", "JPYUSD", "JPYAUD", "JPYGBP", "JPYNZD", "JPYCAD", "JPYCHF"
    ];

    return (
      <div className="space-y-6">
        {/* Module Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm text-foreground">Module</Label>
          </div>
          <Select 
            value={settings.grouping || "Forex"} 
            onValueChange={(value) => setSettings({...settings, grouping: value})}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Forex">Forex</SelectItem>
              <SelectItem value="Futures">Futures</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Symbol Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm text-foreground">Symbol</Label>
          </div>
          <Select 
            value={settings.currencies?.[0] || "EURUSD"} 
            onValueChange={(value) => setSettings({...settings, currencies: [value]})}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {forexSymbols.map((symbol) => (
                <SelectItem key={symbol} value={symbol}>
                  {symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const renderSeasonalityForecastChartSettings = () => {
    const forexSymbols = [
      'AUDCAD', 'AUDCHF', 'AUDJPY', 'AUDNZD', 'AUDUSD', 'CADCHF', 'CADJPY', 'CHFJPY',
      'EURAUD', 'EURCAD', 'EURCHF', 'EURGBP', 'EURJPY', 'EURNZD', 'EURUSD', 'GBPAUD',
      'GBPCAD', 'GBPCHF', 'GBPJPY', 'GBPNZD', 'GBPUSD', 'NZDCAD', 'NZDCHF', 'NZDJPY',
      'NZDUSD', 'USDCAD', 'USDCHF', 'USDJPY'
    ];

    return (
      <div className="space-y-6">
        {/* Symbol Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm text-foreground">Symbol</Label>
          </div>
          <Select 
            value={settings.currencies?.[0] || "EURUSD"} 
            onValueChange={(value) => setSettings({...settings, currencies: [value]})}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {forexSymbols.map((symbol) => (
                <SelectItem key={symbol} value={symbol}>
                  {symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const renderSeasonalityForecastSettings = () => {
    const forexSymbols = [
      'AUDCAD', 'AUDCHF', 'AUDJPY', 'AUDNZD', 'AUDUSD', 'CADCHF', 'CADJPY', 'CHFJPY',
      'EURAUD', 'EURCAD', 'EURCHF', 'EURGBP', 'EURJPY', 'EURNZD', 'EURUSD', 'GBPAUD',
      'GBPCAD', 'GBPCHF', 'GBPJPY', 'GBPNZD', 'GBPUSD', 'NZDCAD', 'NZDCHF', 'NZDJPY',
      'NZDUSD', 'USDCAD', 'USDCHF', 'USDJPY'
    ];

    return (
      <div className="space-y-6">
        {/* Symbol Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm text-foreground">Symbol</Label>
          </div>
          <Select 
            value={settings.currencies?.[0] || "EURUSD"} 
            onValueChange={(value) => setSettings({...settings, currencies: [value]})}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {forexSymbols.map((symbol) => (
                <SelectItem key={symbol} value={symbol}>
                  {symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    switch (widgetType) {
      case "cot-positioning":
        return renderCOTPositioningSettings();
      case "currency-strength":
        return renderCurrencyStrengthSettings();
      case "risk-sentiment":
        return renderRiskSentimentSettings();
      case "news-ticker":
        return renderNewsTickerSettings();
      case "economic-calendar":
        return renderEconomicCalendarSettings();
      case "seasonality-performance-chart":
        return renderSeasonalityPerformanceChartSettings();
      case "seasonality-forecast-chart":
        return renderSeasonalityForecastChartSettings();
      case "seasonality-forecast":
        return renderSeasonalityForecastSettings();
      case "seasonality-forecast-table":
        return renderSeasonalityForecastSettings();
      case "seasonality-performance-table":
        return renderSeasonalityForecastSettings();
      default:
        return (
          <div className="text-center py-8">
            <Settings2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p>No settings available for this widget</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-widget-body border-border max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getWidgetIcon()}
            <div>
              <DialogTitle className="text-foreground">{getWidgetName()} Settings</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Position: {widgetPosition}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {renderSettings()}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="secondary"
            onClick={onClose}
            className="bg-widget-header hover:bg-muted text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
