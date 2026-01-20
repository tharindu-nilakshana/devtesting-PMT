import React from 'react';

export const widgetIcons: Record<string, React.ReactNode> = {
  'tabbed-widget': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="7" width="18" height="14" rx="2" stroke="currentColor" />
      <path d="M3 7h6a2 2 0 0 1 2 2v0" stroke="currentColor" />
      <path d="M11 7h6a2 2 0 0 1 2 2v0" stroke="currentColor" />
    </svg>
  ),
  'rolling-zscore': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="4 17 10 11 14 15 20 9" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="4" cy="17" r="1.5" fill="currentColor" />
      <circle cx="10" cy="11" r="1.5" fill="currentColor" />
      <circle cx="14" cy="15" r="1.5" fill="currentColor" />
      <circle cx="20" cy="9" r="1.5" fill="currentColor" />
    </svg>
  ),
  'deviation-profile': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="4" y="8" width="16" height="8" rx="2" stroke="currentColor" />
      <path d="M8 16V8M16 16V8" stroke="currentColor" />
    </svg>
  ),
  'market-overview': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="2" stroke="currentColor" />
      <rect x="14" y="3" width="7" height="7" rx="2" stroke="currentColor" />
      <rect x="3" y="14" width="7" height="7" rx="2" stroke="currentColor" />
      <rect x="14" y="14" width="7" height="7" rx="2" stroke="currentColor" />
    </svg>
  ),
  'advanced-chart': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
      <path d="M7 17V13M12 17V7M17 17V10" stroke="currentColor" />
    </svg>
  ),
  'information-chart': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
      <polyline points="6 15 9 12 13 14 18 9" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
      <path d="M12 8.5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  'gbpusd-analysis': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <text x="4" y="17" fontSize="10" fill="white">£$</text>
      <circle cx="12" cy="12" r="10" stroke="currentColor" />
    </svg>
  ),
  'seasonality-heatmap': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="4" y="4" width="4" height="4" fill="currentColor" />
      <rect x="10" y="4" width="4" height="4" fill="currentColor" />
      <rect x="16" y="4" width="4" height="4" fill="currentColor" />
      <rect x="4" y="10" width="4" height="4" fill="currentColor" />
      <rect x="10" y="10" width="4" height="4" fill="currentColor" />
      <rect x="16" y="10" width="4" height="4" fill="currentColor" />
      <rect x="4" y="16" width="4" height="4" fill="currentColor" />
      <rect x="10" y="16" width="4" height="4" fill="currentColor" />
      <rect x="16" y="16" width="4" height="4" fill="currentColor" />
    </svg>
  ),
  'economic-calendar': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" />
      <path d="M16 3v4M8 3v4M3 9h18" stroke="currentColor" />
    </svg>
  ),
  'correlation-matrix': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="7" cy="7" r="3" stroke="currentColor" />
      <circle cx="17" cy="7" r="3" stroke="currentColor" />
      <circle cx="7" cy="17" r="3" stroke="currentColor" />
      <circle cx="17" cy="17" r="3" stroke="currentColor" />
      <path d="M7 7L17 17M17 7L7 17" stroke="currentColor" />
    </svg>
  ),
  'volatility-surface': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 17c2-2.5 4-7.5 8-7.5s6 5 8 7.5" stroke="currentColor" />
      <circle cx="12" cy="9.5" r="1.5" fill="currentColor" />
    </svg>
  ),
  'order-book': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" />
      <path d="M9 8h6M9 12h6M9 16h6" stroke="currentColor" />
    </svg>
  ),
  'news-feed': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" />
      <path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" />
    </svg>
  ),
  'currency-strength': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" />
      <path d="M8 12h8M12 8v8" stroke="currentColor" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
  'realtime-news-ticker': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" />
      <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" />
      <circle cx="18" cy="6" r="2" fill="currentColor" />
    </svg>
  ),
  'risk-sentiment': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" />
      <path d="M8 12h8M12 8v8" stroke="currentColor" />
      <path d="M9 9l3 3 3-3" stroke="currentColor" />
      <path d="M9 15l3-3 3 3" stroke="currentColor" />
    </svg>
  ),
  'risk-indicator': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" />
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" />
    </svg>
  ),
  'event-calendar': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" />
      <path d="M16 3v4M8 3v4M3 9h18" stroke="currentColor" />
      <circle cx="8" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="16" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
  'cot-chart-view': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 3v18h18" stroke="currentColor" />
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" />
    </svg>
  ),
  'cot-positioning': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" />
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  ),
  'smart-bias-chart': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
      <path d="M7 17L12 12L17 17" stroke="currentColor" />
      <path d="M7 7L12 12L17 7" stroke="currentColor" />
    </svg>
  ),
  'fx-volatility-levels': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
      <path d="M7 12h10M12 7v10" stroke="currentColor" />
      <path d="M7 8l5-3 5 3M7 16l5 3 5-3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  'fx-options-expiry': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" />
      <path d="M8 3v4M16 3v4M3 9h18" stroke="currentColor" />
      <path d="M9 13h6M9 17h6" stroke="currentColor" />
    </svg>
  ),
  'risk-reversals': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
      <path d="M6 16l4-2 4 1 4-2" stroke="#ef4444" />
      <path d="M6 10l4-1 4-2 4 1" stroke="#22c55e" />
    </svg>
  ),
  'supply-demand-areas': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
      <rect x="6" y="6" width="6" height="6" rx="1" fill="#22c55e" fillOpacity="0.3" stroke="#22c55e" />
      <rect x="12" y="12" width="6" height="6" rx="1" fill="#ef4444" fillOpacity="0.3" stroke="#ef4444" />
      <path d="M9 9h0M15 15h0" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  'high-low-points': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
      <circle cx="8" cy="8" r="2" fill="#ef4444" stroke="#ef4444" />
      <circle cx="16" cy="16" r="2" fill="#22c55e" stroke="#22c55e" />
      <path d="M6 6l4 4M14 14l4 4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  'single-ticker': (
    <svg className="w-7 h-7 mx-auto mb-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" />
      <text x="7" y="15" fontSize="8" fontWeight="bold" fill="currentColor">$</text>
      <path d="M13 9h5M13 12h4M13 15h3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};
