/* eslint-disable @typescript-eslint/no-explicit-any */
// SSR data types for widgets
export interface SSRWidgetData {
  seasonalityForecast: any;
  seasonalityPerformance: any;
  currencyStrength: any;
  realtimeNews: any;
  riskSentiment: any;
}

export interface SSRFetchConfig {
  authToken: string;
  timeout?: number;
}

export interface SSRFetchResult<T = any> {
  success: boolean;
  data: T | null;
  error?: string;
}
