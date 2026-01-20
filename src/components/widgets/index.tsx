import React from 'react';
import CurrencyStrengthWidget from './heatmaps/Currency Strength';
import CurrencyStrengthMeterWidget from './heatmaps/CurrencyStrengthMeter';
import FXCrossRatesWidget from './heatmaps/FXCrossRates';
import TickerTapeHeatmapWidget from './heatmaps/TickerTapeHeatmap';
import StockHeatmapWidget from './heatmaps/StockHeatmap';
import RealtimeNewsTickerWidget from './news/RealtimeHeadlineTickerWidget';
import NewsStoryWidget from './news/NewsStory/index';
import NewsDashboardWidget from './news/NewsDashboard/index';
import NewsSentimentWidget from './news/NewsSentiment/index';
import TrendingTopicsWidget from './news/TrendingTopics/index';
import LatestStoriesWidget from './news/LatestStories/index';
import RiskSentimentWidget from './utilities/RiskSentiment';
import RiskIndicatorWidget from './utilities/RiskIndicator';
import EventCalendarWidget from './economic-data/EconomicEventCalendar';
import PlaceholderWidget from './PlaceholderWidget';
import RealtimeHeadlineTickerWidget from './news/RealtimeHeadlineTickerWidget';
import SeasonalityForecastTableWidget from './seasonality/SeasonalityForecastTableWidget';
import SeasonalityPerformanceTableWidget from './seasonality/SeasonalityPerformanceTableWidget';
import SeasonalityForecastWidget from './seasonality/SeasonalityForecastWidget';
import SeasonalityForecastChartWidget from './seasonality/SeasonalityForecastChartWidget';
import COTPositioningWidget from './cot/COTPositioningWidget';
import COTTableViewWidget from './cot/COTTableViewWidget';
import COTChartViewWidget from './cot/COTChartViewWidget';
import SeasonalityPerformanceChartWidget from './seasonality/SeasonalityPerformanceChartWidget';
import TradingViewWidget from './price-charts/TradingViewWidget';
import TechnicalChart from './price-charts/TechnicalChart';
import InformationChart from './price-charts/MiniChart';
import EconomicEventCountdownWidget from './economic-data/EconomicEventCountdown';
import MacroDataChartsWidget from './economic-data/MacroDataCharts';
import MacroDataTableWidget from './economic-data/MacroDataTable';
import ResearchFilesWidget from './research/ResearchFiles';
import SmartBiasWidget from './research/SmartBias';
import SmartBiasChartWidget from './research/SmartBiasChart';
import MacroAIWidget from './research/MacroAI';
import LiveSquawkWidget from './research/LiveSquawk';
import WeekAheadWidget from './research/WeekAhead';
import BankTradesWidget from './research/BankTrades';
import EventTradesScenariosWidget from './research/EventTradesScenarios';
import MacroBriefingWidget from './research/MacroBriefing';
import FXBankForecastsWidget from './research/FXBankForecasts';
import OverviewListWidget from './scanner/OverviewList';
import MarketDataWidget from './scanner/MarketData';
import GaugeOverviewWidget from './scanner/GaugeOverview';
import FXVolatilityLevelsWidget from './options/FXVolatilityLevels';
import FXOptionsExpiryWidget from './options/FXOptionsExpiry';
import DistributionChartWidget from './volatility/DistributionChart';
import AverageDailyRangeWidget from './volatility/AverageDailyRange';
import AverageRangeHistogramWidget from './volatility/AverageRangeHistogram';
import RangeProbabilityWidget from './volatility/RangeProbability';
import DistributionStatsWidget from './volatility/DistributionStats';
import VolatilityStatisticsWidget from './volatility/VolatilityStatistics';
import TabbedWidget from './utilities/TabbedWidget';
import RiskReversalsWidget from './options/RiskReversals';
import WorldClockWidget from './utilities/WorldClock';
import TicklistWidget from './utilities/Ticklist';
import NotesWidget from './utilities/Notes';
import ExchangeMarketHoursWidget from './utilities/ExchangeMarketHours';
import MoodBoardWidget from './utilities/MoodBoard';
import TradingJournalWidget from './utilities/TradingJournal';
import ScoringTableWidget from './utilities/ScoringTable';
import WatchlistWidget from './utilities/Watchlist';
import InterestRateProbabilityWidget from './central-banks/InterestRateProbability';
import ImpliedForwardCurveWidget from './central-banks/ImpliedForwardCurve';
import ImpliedForwardRatesWidget from './central-banks/ImpliedForwardRates';
import ProbabilityTableWidget from './central-banks/ProbabilityTable';
import DMXPositioningWidget from './retail-sentiment/DMXPositioning';
import DMXChartWidget from './retail-sentiment/DMXChart';
import DMXStatisticsTableWidget from './retail-sentiment/DMXStatisticsTable';
import DMXOverviewWidget from './retail-sentiment/DMXOverview';
import DMXOpenInterestWidget from './retail-sentiment/DMXOpenInterest';
import SupplyDemandAreasWidget from './market-structure/SupplyDemandAreas';
import HighLowPointsWidget from './market-structure/HighLowPoints';
import SessionRangesWidget from './market-structure/SessionRanges';
import PercentMonthlyTargetsWidget from './market-structure/PercentMonthlyTargets';
import ExponentialMovingAverageWidget from './market-structure/ExponentialMovingAverage';
import SupertrendWidget from './market-structure/Supertrend';
import QuarterMovementWidget from './market-structure/QuarterMovement';
import BalanceSheetWidget from './stock-analysis/BalanceSheet';
import IncomeStatementWidget from './stock-analysis/IncomeStatement';
import CashFlowReportWidget from './stock-analysis/CashFlowReport';
import AnalystRecommendationsWidget from './stock-analysis/AnalystRecommendations';
import PriceTargetsWidget from './stock-analysis/PriceTargets';
import RecentAnalystActionsWidget from './stock-analysis/RecentAnalystActions';
import InsiderTransactionsWidget from './stock-analysis/InsiderTransactions';
import InstitutionalShareholdersWidget from './stock-analysis/InstitutionalShareholders';
import PositionBookWidget from './orderflow/PositionBook';
import OrderbookWidget from './orderflow/Orderbook';
import FootprintChartsWidget from './orderflow/FootprintCharts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const widgetComponents: Record<string, React.ComponentType<any>> = {};

Object.assign(widgetComponents, {
  // Others Category (backward compatibility)
  'risk-sentiment': RiskSentimentWidget,
  'risk-indicator': RiskIndicatorWidget,
  'tabbed-widget': TabbedWidget,
  'tab-menu-widget': TabbedWidget, // Alias for backward compatibility

  // New categorized mappings (working widgets mapped to new categories)
  'economic-event-calendar-legacy': EventCalendarWidget,
  'realtime-headline-ticker-legacy': RealtimeHeadlineTickerWidget,
  'risk-sentiment-chart': RiskSentimentWidget,

  // Price Charts Category Placeholdersf
  'technical-charts': TradingViewWidget,
  'price-chart': TechnicalChart,
  'information-chart': InformationChart,

  // Seasonality Category
  'seasonality-forecast': SeasonalityForecastWidget,
  'seasonality-forecast-chart': SeasonalityForecastChartWidget,
  'seasonality-performance-table': SeasonalityPerformanceTableWidget,
  'seasonality-forecast-table': SeasonalityForecastTableWidget,
  'seasonality-performance-chart': SeasonalityPerformanceChartWidget,

  // COT Category - Map working COT widgets
  'cot-positioning': COTPositioningWidget,
  'cot-chart-view': COTChartViewWidget,
  'cot-table-view': COTTableViewWidget,

  // Heatmaps Category - Map working Currency Strength widget
  'currency-strength': CurrencyStrengthWidget,
  'currency-strength-meter': CurrencyStrengthMeterWidget,
  'fx-cross-rates': FXCrossRatesWidget,
  'ticker-tape': TickerTapeHeatmapWidget,
  'heatmap': StockHeatmapWidget,

  // News Category - Map working Realtime News Ticker widget
  'realtime-headline-ticker': RealtimeNewsTickerWidget,
  'news-story': NewsStoryWidget,
  'news-dashboard': NewsDashboardWidget,
  'news-sentiment': NewsSentimentWidget,
  'trending-topics': TrendingTopicsWidget,
  'latest-stories': LatestStoriesWidget,

  // Economic Data Category - Map working Event Calendar widget
  'economic-event-calendar': EventCalendarWidget,
  'economic-event-countdown': EconomicEventCountdownWidget,
  'economic-data-charts': MacroDataChartsWidget,
  'economic-data-table': MacroDataTableWidget,

  // Central Banks Category
  'interest-rate-probability': InterestRateProbabilityWidget,
  'implied-forward-curve': ImpliedForwardCurveWidget,
  'implied-forward-rates': ImpliedForwardRatesWidget,
  'probability-table': ProbabilityTableWidget,

  // Retail Sentiment Category
  'dmx-positioning': DMXPositioningWidget,
  'dmx-chart': DMXChartWidget,
  'dmx-statistics-table': DMXStatisticsTableWidget,
  'dmx-overview': DMXOverviewWidget,
  'dmx-open-interest': DMXOpenInterestWidget,

  // Research Category
  'research-files': ResearchFilesWidget,
  'smart-bias': SmartBiasWidget,
  'smart-bias-chart': SmartBiasChartWidget,
  'macro-ai': MacroAIWidget,
  'live-squawk': LiveSquawkWidget,
  'week-ahead': WeekAheadWidget,
  'bank-trades': BankTradesWidget,
  'event-trades-scenarios': EventTradesScenariosWidget,
  'macro-briefing': MacroBriefingWidget,
  'fx-bank-forecasts': FXBankForecastsWidget,

  // Scanner Category
  'overview-list': OverviewListWidget,
  'market-data': MarketDataWidget,
  'gauge-overview': GaugeOverviewWidget,

  // Options Category
  'fx-volatility-levels': FXVolatilityLevelsWidget,
  'fx-options-expiry': FXOptionsExpiryWidget,
  'risk-reversals': RiskReversalsWidget,

  // Volatility Category
  'distribution-chart': DistributionChartWidget,
  'average-daily-range': AverageDailyRangeWidget,
  'average-range-histogram': AverageRangeHistogramWidget,
  'range-probability': RangeProbabilityWidget,
  'distribution-stats': DistributionStatsWidget,
  'volatility-statistics': VolatilityStatisticsWidget,

  // Market Structure Category
  'supply-demand-areas': SupplyDemandAreasWidget,
  'supply-and-demand-areas': SupplyDemandAreasWidget, // Alias for template compatibility
  'high-low-points': HighLowPointsWidget,
  'high-and-low-points': HighLowPointsWidget, // Alias for template compatibility
  'session-ranges': SessionRangesWidget,
  'percent-monthly-targets': PercentMonthlyTargetsWidget,
  'exponential-moving-average': ExponentialMovingAverageWidget,
  'supertrend': SupertrendWidget,
  'quarter-movement': QuarterMovementWidget,

  // Stock Analysis Category
  'balance-sheet': BalanceSheetWidget,
  'income-statement': IncomeStatementWidget,
  'cash-flow-report': CashFlowReportWidget,
  'analyst-recommendations': AnalystRecommendationsWidget,
  'price-targets': PriceTargetsWidget,
  'recent-analyst-actions': RecentAnalystActionsWidget,
  'insider-transactions': InsiderTransactionsWidget,
  'institutional-shareholders': InstitutionalShareholdersWidget,

  // Order Flow Category
  'position-book': PositionBookWidget,
  'orderbook': OrderbookWidget,
  'footprint-charts': FootprintChartsWidget,

  // Utilities Category
  'world-clock': WorldClockWidget,
  'ticklist': TicklistWidget,
  'notes': NotesWidget,
  'exchange-market-hours': ExchangeMarketHoursWidget,
  'moodboard': MoodBoardWidget,
  'trading-journal': TradingJournalWidget,
  'scoring-table': ScoringTableWidget,
  'watchlist': WatchlistWidget,
});

export const WidgetComponents = widgetComponents;

export {
  CurrencyStrengthWidget,
  CurrencyStrengthMeterWidget,
  FXCrossRatesWidget,
  TickerTapeHeatmapWidget,
  StockHeatmapWidget,
  RealtimeNewsTickerWidget,
  RiskSentimentWidget,
  RiskIndicatorWidget,
  EventCalendarWidget,
  InterestRateProbabilityWidget,
  ImpliedForwardCurveWidget,
  ImpliedForwardRatesWidget,
  ProbabilityTableWidget,
  DMXPositioningWidget,
  DMXChartWidget,
  DMXStatisticsTableWidget,
  DMXOverviewWidget,
  DMXOpenInterestWidget,
  EconomicEventCountdownWidget,
  MacroDataChartsWidget,
  MacroDataTableWidget,
  ResearchFilesWidget,
  SmartBiasWidget,
  SmartBiasChartWidget,
  MacroAIWidget,
  LiveSquawkWidget,
  WeekAheadWidget,
  BankTradesWidget,
  EventTradesScenariosWidget,
  MacroBriefingWidget,
  FXBankForecastsWidget,
  OverviewListWidget,
  MarketDataWidget,
  GaugeOverviewWidget,
  FXVolatilityLevelsWidget,
  FXOptionsExpiryWidget,
  RiskReversalsWidget,
  DistributionChartWidget,
  AverageDailyRangeWidget,
  AverageRangeHistogramWidget,
  RangeProbabilityWidget,
  DistributionStatsWidget,
  VolatilityStatisticsWidget,
  // New categorized exports
  RealtimeHeadlineTickerWidget,
  SeasonalityForecastTableWidget,
  SeasonalityPerformanceTableWidget,
  SeasonalityForecastWidget,
  SeasonalityForecastChartWidget,
  COTPositioningWidget,
  TradingViewWidget,
  // Utilities exports
  WorldClockWidget,
  TicklistWidget,
  NotesWidget,
  ExchangeMarketHoursWidget,
  MoodBoardWidget,
  TradingJournalWidget,
  ScoringTableWidget,
  WatchlistWidget,
  // Market Structure exports
  SupplyDemandAreasWidget,
  HighLowPointsWidget,
  SessionRangesWidget,
  PercentMonthlyTargetsWidget,
  ExponentialMovingAverageWidget,
  SupertrendWidget,
  QuarterMovementWidget,
  // Order Flow exports
  PositionBookWidget,
  OrderbookWidget,
  FootprintChartsWidget,
};
