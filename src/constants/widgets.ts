import { Widget } from '../types';

// Helper function to get translated widget name
export const getWidgetTranslationKey = (widgetId: string): string => {
  const translationMap: { [key: string]: string } = {
    'currency-strength': 'Widgets.CurrencyStrength',
    'realtime-headline-ticker': 'Widgets.RealtimeHeadlineTicker',
    'seasonality-forecast': 'Widgets.SeasonalityForecast',
    'seasonality-forecast-chart': 'Widgets.SeasonalityForecastChart',
    'seasonality-forecast-table': 'Widgets.SeasonalityForecastTable',
    'seasonality-performance-table': 'Widgets.SeasonalityPerformanceTable',
    'seasonality-performance-chart': 'Widgets.SeasonalityPerformanceChart',
    'cot-positioning': 'Widgets.COTPositioning',
    'cot-chart-view': 'Widgets.COTChartView',
    'cot-table-view': 'Widgets.COTTableView',
    'risk-sentiment': 'Widgets.RiskSentiment',
    'risk-indicator': 'Widgets.RiskIndicator',
    'technical-charts': 'Widgets.TechnicalCharts',
    'price-chart': 'Widgets.TradingViewChart',
    'information-chart': 'Widgets.InformationChart',
    'tabbed-widget': 'Widgets.TabMenuWidget',
    'economic-event-calendar': 'Widgets.EconomicEventCalendar',
    'economic-event-countdown': 'Widgets.EconomicEventCountdown',
    'economic-data-charts': 'Widgets.EconomicDataCharts',
    'economic-data-table': 'Widgets.EconomicDataTable',
    'currency-strength-meter': 'Widgets.CurrencyStrengthMeter',
    'fx-cross-rates': 'Widgets.FXCrossRates',
    'ticker-tape': 'Widgets.TickerTape',
    'heatmap': 'Widgets.Heatmap',
    'interest-rate-probability': 'Widgets.InterestRateProbability',
    'implied-forward-curve': 'Widgets.ImpliedForwardCurve',
    'implied-forward-rates': 'Widgets.ImpliedForwardRates',
    'probability-table': 'Widgets.ProbabilityTable',
    'research-files': 'Widgets.ResearchFiles',
    'smart-bias': 'Widgets.SmartBias',
    'smart-bias-chart': 'Widgets.SmartBiasChart',
    'fx-volatility-levels': 'Widgets.FXVolatilityLevels',
    'fx-options-expiry': 'Widgets.FXOptionsExpiry',
    'risk-reversals': 'Widgets.RiskReversals',
    'distribution-chart': 'Widgets.DistributionChart',
    'average-daily-range': 'Widgets.AverageDailyRange',
    'average-range-histogram': 'Widgets.AverageRangeHistogram',
    'range-probability': 'Widgets.RangeProbability',
    'distribution-stats': 'Widgets.DistributionStats',
    'volatility-statistics': 'Widgets.VolatilityStatistics',
    'world-clock': 'Widgets.WorldClock',
    'ticklist': 'Widgets.Ticklist',
    'notes': 'Widgets.Notes',
    'exchange-market-hours': 'Widgets.ExchangeMarketHours',
    'moodboard': 'Widgets.MoodBoard',
    'trading-journal': 'Widgets.TradingJournal',
    'scoring-table': 'Widgets.ScoringTable',
    'watchlist': 'Widgets.Watchlist',
    'news-story': 'Widgets.NewsStory',
    'news-dashboard': 'Widgets.NewsDashboard',
    'news-sentiment': 'Widgets.NewsSentiment',
    'trending-topics': 'Widgets.TrendingTopics',
    'latest-stories': 'Widgets.LatestStories',
    'dmx-positioning': 'Widgets.DMXPositioning',
    'dmx-chart': 'Widgets.DMXChart',
    'dmx-statistics-table': 'Widgets.DMXStatisticsTable',
    'dmx-overview': 'Widgets.DMXOverview',
    'dmx-open-interest': 'Widgets.DMXOpenInterest',
    'supply-demand-areas': 'Widgets.SupplyDemandAreas',
    'supply-and-demand-areas': 'Widgets.SupplyDemandAreas',
    'high-low-points': 'Widgets.HighLowPoints',
    'high-and-low-points': 'Widgets.HighLowPoints',
    'session-ranges': 'Widgets.SessionRanges',
    'percent-monthly-targets': 'Widgets.PercentMonthlyTargets',
    'quarter-movement': 'Widgets.QuarterMovement',
    'position-book': 'Widgets.PositionBook',
    'orderbook': 'Widgets.Orderbook',
  };

  return translationMap[widgetId] || `Widgets.${widgetId.replace(/-/g, '')}`;
};

// Helper function to get translated category name
export const getCategoryTranslationKey = (category: string): string => {
  const categoryMap: { [key: string]: string } = {
    'price-charts': 'Categories.PriceCharts',
    'seasonality': 'Categories.Seasonality',
    'cot': 'Categories.COT',
    'heatmaps': 'Categories.Heatmaps',
    'news': 'Categories.News',
    'economic-data': 'Categories.MacroeconomicData',
    'central-banks': 'Categories.CentralBanks',
    'research': 'Categories.Research',
    'options': 'Categories.Options',
    'volatility': 'Categories.Volatility',
    'sentiment': 'Categories.Sentiment',
    'retail-sentiment': 'Categories.RetailSentiment',
    'scanner': 'Categories.Scanner',
    'market-structure': 'Categories.MarketStructure',
    'orderflow': 'Categories.OrderFlow',
    'Others': 'Categories.Others'
  };

  return categoryMap[category] || category;
};

export const availableWidgets: Widget[] = [
  {
    id: 'tabbed-widget',
    name: 'Tab Menu Widget',
    description: 'A container widget with tabs and a + button to add new tabs',
    category: 'Others',
    isImplemented: true
  },
  // Price Charts Category
  {
    id: 'technical-charts',
    name: 'Technical Charts',
    description: 'Advanced technical analysis charts with drawing tools, indicators, and multiple chart types',
    category: 'price-charts',
    isImplemented: true
  },
  {
    id: 'price-chart',
    name: 'Price Chart',
    description: 'Professional trading chart with advanced technical analysis, drawing tools, and 100+ indicators using TradingView Advanced Charts',
    category: 'price-charts',
    isImplemented: true
  },
  {
    id: 'information-chart',
    name: 'Information Chart',
    description: 'Mini charts with configurable chart styles and volume options',
    category: 'price-charts',
    isImplemented: true
  },
  // Seasonality Category
  {
    id: 'seasonality-forecast',
    name: 'Seasonality Forecast',
    description: 'Seasonal forecast with TradingView Lightweight Charts',
    category: 'seasonality',
    isImplemented: true
  },
  {
    id: 'seasonality-forecast-chart',
    name: 'Seasonality Forecast Chart',
    description: 'Seasonality forecast chart with TradingView Lightweight Charts',
    category: 'seasonality',
    isImplemented: true
  },
  {
    id: 'seasonality-forecast-table',
    name: 'Seasonality Forecast Table',
    description: 'Detailed seasonality forecast table',
    category: 'seasonality',
    isImplemented: true
  },
  {
    id: 'seasonality-performance-table',
    name: 'Seasonality Performance Table',
    description: 'Seasonality performance analysis with futures data dropdown',
    category: 'seasonality',
    isImplemented: true
  },
  {
    id: 'seasonality-performance-chart',
    name: 'Seasonality Performance Chart',
    description: 'Seasonality performance visualization with TradingView Lightweight Charts',
    category: 'seasonality',
    isImplemented: true
  },
  // COT Category
  {
    id: 'cot-positioning',
    name: 'COT Positioning',
    description: 'Commitments of Traders positioning data (formerly Smart Money Report)',
    category: 'cot',
    isImplemented: true
  },
  {
    id: 'cot-chart-view',
    name: 'COT Chart View',
    description: 'COT historical data chart with TradingView visualization (formerly Cot History Chart)',
    category: 'cot',
    isImplemented: true
  },
  {
    id: 'cot-table-view',
    name: 'COT Table View',
    description: 'COT history table with user date format settings (formerly Cot History Table)',
    category: 'cot',
    isImplemented: true
  },
  // Heatmaps Category
  {
    id: 'currency-strength',
    name: 'Currency Strength',
    description: 'Currency strength visualization',
    category: 'heatmaps',
    isImplemented: true
  },
  {
    id: 'currency-strength-meter',
    name: 'Currency Strength Meter',
    description: 'Currency strength meter display',
    category: 'heatmaps',
    isImplemented: true
  },
  {
    id: 'fx-cross-rates',
    name: 'FX Cross Rates',
    description: 'Cross currency rates heatmap (formerly Cross Rates)',
    category: 'heatmaps',
    isImplemented: true
  },
  {
    id: 'ticker-tape',
    name: 'Ticker Tape',
    description: 'Ticker tape with multiselect input options (Forex, Commodities, Indices, US Stocks)',
    category: 'heatmaps',
    isImplemented: true
  },
  {
    id: 'heatmap',
    name: 'Heatmap',
    description: 'Stock heatmap with options for Stocks, Crypto, and ETFs (formerly Stock Heatmap)',
    category: 'heatmaps',
    isImplemented: true
  },
  // News Category
  {
    id: 'realtime-headline-ticker',
    name: 'Realtime Headline Ticker',
    description: 'Real-time headline ticker widget',
    category: 'news',
    isImplemented: true
  },
  {
    id: 'news-story',
    name: 'News Story',
    description: 'Detailed news stories with full articles, images, and market sentiment analysis',
    category: 'news',
    isImplemented: true
  },
  {
    id: 'news-dashboard',
    name: 'News Dashboard',
    description: 'Comprehensive news dashboard with categorized stories from global markets',
    category: 'news',
    isImplemented: true
  },
  {
    id: 'news-sentiment',
    name: 'News Sentiment',
    description: 'News sentiment analysis chart showing bullish, bearish, and neutral sentiment over time',
    category: 'news',
    isImplemented: true
  },
  {
    id: 'trending-topics',
    name: 'Trending Topics',
    description: 'Real-time trending topics and keywords from market news and analysis',
    category: 'news',
    isImplemented: true
  },
  {
    id: 'latest-stories',
    name: 'Latest Stories',
    description: 'Latest breaking news and market stories with trending topics view',
    category: 'news',
    isImplemented: true
  },
  // Economic Data Category
  {
    id: 'economic-event-calendar',
    name: 'Economic Event Calendar',
    description: 'Economic events calendar (formerly Event Calendar)',
    category: 'economic-data',
    isImplemented: true
  },
  {
    id: 'economic-event-countdown',
    name: 'Economic Event Countdown',
    description: 'Economic event countdown with real-time updates (formerly Event Countdown)',
    category: 'economic-data',
    isImplemented: true
  },
  {
    id: 'economic-data-charts',
    name: 'Economic Data Charts',
    description: 'Macro economic data charts (formerly Macro Charts)',
    category: 'economic-data',
    isImplemented: true
  },
  {
    id: 'economic-data-table',
    name: 'Economic Data Table',
    description: 'Macro economic data table (formerly Macro Table)',
    category: 'economic-data',
    isImplemented: true
  },
  {
    id: 'interest-rate-probability',
    name: 'Interest Rate Probability',
    description: 'Central bank interest rate probability forecast',
    category: 'central-banks',
    isImplemented: true
  },
  {
    id: 'implied-forward-curve',
    name: 'Implied forward Curve',
    description: 'Compare futures implied yields with the current spot curve across meeting dates',
    category: 'central-banks',
    isImplemented: true
  },
  {
    id: 'implied-forward-rates',
    name: 'Implied Forward Rates',
    description: 'Step-style view of implied rate changes across fixed announcement dates',
    category: 'central-banks',
    isImplemented: true
  },
  {
    id: 'probability-table',
    name: 'Probability Table',
    description: 'Heatmap table of interest rate probabilities for upcoming central bank meetings',
    category: 'central-banks',
    isImplemented: true
  },
  // Retail Sentiment Category
  {
    id: 'dmx-positioning',
    name: 'DMX Positioning',
    description: 'Retail trader positioning data from major FX brokers showing long vs short positions',
    category: 'retail-sentiment',
    isImplemented: true
  },
  {
    id: 'dmx-chart',
    name: 'DMX Chart',
    description: 'Retail trader positioning chart over time with multiple chart types and data views',
    category: 'retail-sentiment',
    isImplemented: true
  },
  {
    id: 'dmx-statistics-table',
    name: 'DMX Statistic Table',
    description: 'Detailed retail trader positioning statistics including positions, prices, ratios, and volumes',
    category: 'retail-sentiment',
    isImplemented: true
  },
  {
    id: 'dmx-overview',
    name: 'DMX Overview',
    description: 'Overview of retail trader positioning across multiple currency pairs with sorting options',
    category: 'retail-sentiment',
    isImplemented: true
  },
  {
    id: 'dmx-open-interest',
    name: 'DMX Open Interest',
    description: 'Open interest for various currency pairs over time with filtering and pair selection',
    category: 'retail-sentiment',
    isImplemented: true
  },
  // Research Category
  {
    id: 'research-files',
    name: 'Research Files',
    description: 'Research papers and documents from various financial institutions',
    category: 'research',
    isImplemented: true
  },
  {
    id: 'smart-bias',
    name: 'Smart BIAS',
    description: 'Currency bias tracker with fundamental, technical, and sentiment analysis',
    category: 'research',
    isImplemented: true
  },
  {
    id: 'smart-bias-chart',
    name: 'Smart Bias History',
    description: 'Historical weekly currency bias visualization',
    category: 'research',
    isImplemented: true
  },
  {
    id: 'macro-ai',
    name: 'Macro AI',
    description: 'AI-powered macro research assistant with chat and voice modes',
    category: 'research',
    isImplemented: true
  },
  {
    id: 'live-squawk',
    name: 'Live Squawk',
    description: 'Simulated analyst squawk stream with prioritized market headlines',
    category: 'research',
    isImplemented: true
  },
  {
    id: 'week-ahead',
    name: 'Week Ahead',
    description: 'Timeline of the coming week’s high-impact macro catalysts',
    category: 'research',
    isImplemented: true
  },
  {
    id: 'bank-trades',
    name: 'Bank Trades',
    description: 'Institutional trade blotter with entries, targets, and rationale',
    category: 'research',
    isImplemented: true
  },
  {
    id: 'event-trades-scenarios',
    name: 'Event Trades Scenarios',
    description: 'Scenario planning for key economic events with trade ideas',
    category: 'research',
    isImplemented: true
  },
  {
    id: 'macro-briefing',
    name: 'Macro briefing',
    description: 'Curated analyst commentary with actionable macro insights',
    category: 'research',
    isImplemented: true
  },
  {
    id: 'fx-bank-forecasts',
    name: 'FX Bank Forecasts',
    description: 'Multi-quarter FX forecasts from major global banks',
    category: 'research',
    isImplemented: true
  },
  // Scanner Category
  {
    id: 'overview-list',
    name: 'Overview List',
    description: 'Comprehensive market scanner with technical indicators, fundamentals, performance metrics, and real-time market analysis',
    category: 'scanner',
    isImplemented: true
  },
  {
    id: 'market-data',
    name: 'Market Data',
    description: 'Real-time market data across indices, futures, bonds, commodities, forex, and crypto with performance metrics',
    category: 'scanner',
    isImplemented: true
  },
  {
    id: 'gauge-overview',
    name: 'Gauge Overview',
    description: 'Overall technical signal based on multiple indicators with visual gauge and market sentiment breakdown',
    category: 'scanner',
    isImplemented: true
  },
  // Options Category
  {
    id: 'fx-volatility-levels',
    name: 'FX Options Volatility Levels',
    description: 'FX volatility levels chart with daily, weekly, and monthly levels',
    category: 'options',
    isImplemented: true
  },
  {
    id: 'fx-options-expiry',
    name: 'FX Options Expiry',
    description: 'FX options expiry dates and strike prices with notional amounts',
    category: 'options',
    isImplemented: true
  },
  {
    id: 'risk-reversals',
    name: 'FX Options Risk Reversals',
    description: 'Monitor call vs put risk reversals with line chart toggles',
    category: 'options',
    isImplemented: true
  },
  // Volatility Category
  {
    id: 'distribution-chart',
    name: 'Distribution Chart',
    description: 'Price distribution chart with bell curve overlay and histogram',
    category: 'volatility',
    isImplemented: true
  },
  {
    id: 'average-daily-range',
    name: 'Average Daily Range',
    description: 'Average price ranges for different time periods with current price indicator',
    category: 'volatility',
    isImplemented: true
  },
  {
    id: 'average-range-histogram',
    name: 'Average Range Histogram',
    description: 'Histogram showing average ranges by day of week, week of month, or month',
    category: 'volatility',
    isImplemented: true
  },
  {
    id: 'range-probability',
    name: 'Range Probability',
    description: 'Histogram data showing price range probabilities and cumulative probabilities',
    category: 'volatility',
    isImplemented: true
  },
  {
    id: 'distribution-stats',
    name: 'Distribution Stats',
    description: 'Statistical measures of price distribution including mean, median, standard deviation',
    category: 'volatility',
    isImplemented: true
  },
  {
    id: 'volatility-statistics',
    name: 'Volatility Statistics',
    description: 'Historical volatility statistics with daily price movements and ATR',
    category: 'volatility',
    isImplemented: true
  },
  // Sentiment Category
  {
    id: 'risk-sentiment',
    name: 'Risk Sentiment',
    description: 'Market risk sentiment indicator with historical charts',
    category: 'sentiment',
    isImplemented: true
  },
  {
    id: 'risk-indicator',
    name: 'Risk Indicator',
    description: 'Simple risk sentiment indicator with color-coded status',
    category: 'sentiment',
    isImplemented: true
  },
  // Market Structure Category
  {
    id: 'supply-and-demand-areas',
    name: 'Supply and Demand Areas',
    description: 'Identify and visualize supply and demand zones on price charts with automatic detection and manual drawing tools',
    category: 'market-structure',
    isImplemented: true
  },
  {
    id: 'high-and-low-points',
    name: 'High and Low Points',
    description: 'Track and display significant high and low price points with swing analysis and trend identification',
    category: 'market-structure',
    isImplemented: true
  },
  {
    id: 'session-ranges',
    name: 'Session Ranges',
    description: 'Visualize trading session ranges including Asian, London, and New York sessions with liquidity ranges and open values',
    category: 'market-structure',
    isImplemented: true
  },
  {
    id: 'percent-monthly-targets',
    name: 'Percent Monthly Targets',
    description: 'Visualize percent monthly targets on price charts for trading analysis with configurable module and symbol settings',
    category: 'market-structure',
    isImplemented: true
  },
  {
    id: 'exponential-moving-average',
    name: 'Exponential Moving Average',
    description: 'TradingView advanced chart with EMA overlay. Supports Retail/Institutional presets and configurable module, symbol, and timeframe.',
    category: 'market-structure',
    isImplemented: true
  },
  {
    id: 'supertrend',
    name: 'Supertrend',
    description: 'TradingView advanced chart with Supertrend overlay and configurable module, symbol, and timeframe.',
    category: 'market-structure',
    isImplemented: true
  },
  {
    id: 'quarter-movement',
    name: 'Quarter Movement',
    description: 'Visualizes quarterly price movements with TradingView advanced charts. Shows start and end prices for each quarter with percentage change indicators and WebSocket real-time updates.',
    category: 'market-structure',
    isImplemented: true
  },
  // Others Category (existing implemented widgets)
  // Utilities Category
  {
    id: 'world-clock',
    name: 'World Clock',
    description: 'Display multiple timezones with current time and weather',
    category: 'Others',
    isImplemented: true
  },
  {
    id: 'ticklist',
    name: 'Ticklist',
    description: 'Task management widget with checkboxes and task tracking',
    category: 'Others',
    isImplemented: true
  },
  {
    id: 'notes',
    name: 'Notes',
    description: 'Rich text notes widget with formatting toolbar',
    category: 'Others',
    isImplemented: true
  },
  {
    id: 'exchange-market-hours',
    name: 'Exchange Market Hours',
    description: 'Display global forex market hours with timeline, table, and map views',
    category: 'Others',
    isImplemented: true
  },
  {
    id: 'moodboard',
    name: 'Moodboard',
    description: 'Interactive mood board with text, images, and drawing tools',
    category: 'Others',
    isImplemented: true
  },
  {
    id: 'trading-journal',
    name: 'Trading Journal',
    description: 'Trade tracking and analysis with calendar view and statistics',
    category: 'Others',
    isImplemented: true
  },
  {
    id: 'scoring-table',
    name: 'Scoring Table',
    description: 'Currency bias scoring table with indicators and categories',
    category: 'Others',
    isImplemented: true
  },
  {
    id: 'watchlist',
    name: 'Watchlist',
    description: 'Monitor favorite assets in real-time with price tracking and order management',
    category: 'Others',
    isImplemented: true
  },
  // Stock Analysis Category
  {
    id: 'balance-sheet',
    name: 'Balance Sheet',
    description: 'Annual balance sheet showing assets, liabilities, and shareholders\' equity',
    category: 'stock-analysis',
    isImplemented: true
  },
  {
    id: 'income-statement',
    name: 'Income Statement',
    description: 'Annual income statement showing revenue, expenses, and net income',
    category: 'stock-analysis',
    isImplemented: true
  },
  {
    id: 'cash-flow-report',
    name: 'Cash Flow Report',
    description: 'Annual cash flow statement showing operating, investing, and financing activities',
    category: 'stock-analysis',
    isImplemented: true
  },
  {
    id: 'analyst-recommendations',
    name: 'Analyst Recommendations',
    description: 'Analyst consensus rating and distribution with historical rating trends',
    category: 'stock-analysis',
    isImplemented: true
  },
  {
    id: 'price-targets',
    name: 'Price Targets',
    description: 'Analyst price targets with historical price chart and projection lines',
    category: 'stock-analysis',
    isImplemented: true
  },
  {
    id: 'recent-analyst-actions',
    name: 'Recent Analyst Actions',
    description: 'Recent analyst rating changes and price target updates',
    category: 'stock-analysis',
    isImplemented: true
  },
  {
    id: 'insider-transactions',
    name: 'Insider Transactions',
    description: 'Recent insider trading transactions showing buys and sells by company executives',
    category: 'stock-analysis',
    isImplemented: true
  },
  {
    id: 'institutional-shareholders',
    name: 'Institutional Shareholders',
    description: 'Top institutional shareholders with ownership distribution and holdings table',
    category: 'stock-analysis',
    isImplemented: true
  },
  // Order Flow Category
  {
    id: 'position-book',
    name: 'Position Book',
    description: 'Real-time position book showing order flow and market depth with bid/ask levels',
    category: 'orderflow',
    isImplemented: true
  },
  {
    id: 'orderbook',
    name: 'Orderbook',
    description: 'Live order book displaying current buy and sell orders with price levels and volumes',
    category: 'orderflow',
    isImplemented: true
  }
];
