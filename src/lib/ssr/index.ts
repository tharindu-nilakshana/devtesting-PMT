// SSR Library Exports
export * from './types';
export * from './utils';
export { fetchCommonWidgetDataSSR } from './widgetDataFetcher';

// Widget-specific SSR exports
export { fetchSeasonalityForecastTableSSR } from '@/components/widgets/seasonality/SeasonalityForecastTableWidget/ssr';
export { fetchSeasonalityPerformanceTableSSR } from '@/components/widgets/seasonality/SeasonalityPerformanceTableWidget/ssr';
export { fetchCurrencyStrengthSSR } from '@/components/widgets/heatmaps/Currency Strength/ssr';
export { fetchRealtimeNewsSSR } from '@/components/widgets/news/RealtimeHeadlineTickerWidget/ssr';
export { fetchRiskSentimentSSR } from '@/components/widgets/utilities/RiskSentiment/ssr';
