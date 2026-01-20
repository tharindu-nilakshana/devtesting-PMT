'use client'

import { useState, useEffect } from 'react'

interface OverviewChartsProps {
  symbols?: string[]
  className?: string
}

export default function OverviewCharts({ 
  symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'],
  className = '' 
}: OverviewChartsProps) {
  const [overviewData, setOverviewData] = useState<{
    symbols: Array<{
      symbol: string;
      price: number;
      change: number;
      changePercent: number;
      volume: number;
      high24h: number;
      low24h: number;
    }>;
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate overview data loading
    const timer = setTimeout(() => {
      setOverviewData({
        symbols: symbols.map(symbol => ({
          symbol,
          price: 1.05 + Math.random() * 0.1,
          change: (Math.random() - 0.5) * 0.02,
          changePercent: (Math.random() - 0.5) * 2,
          volume: Math.random() * 1000000,
          high24h: 1.06 + Math.random() * 0.1,
          low24h: 1.04 + Math.random() * 0.1
        }))
      })
      setIsLoading(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [symbols])

  if (isLoading) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg p-4 shadow ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Market Overview
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {overviewData?.symbols.map((item) => (
          <div key={item.symbol} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {item.symbol}
              </span>
              <span className={`text-sm font-medium ${
                item.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {item.change >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
              </span>
            </div>
            
            <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {item.price.toFixed(5)}
            </div>
            
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <div>H: {item.high24h.toFixed(5)}</div>
              <div>L: {item.low24h.toFixed(5)}</div>
              <div>Vol: {(item.volume / 1000000).toFixed(1)}M</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 flex gap-2">
        <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
          Refresh
        </button>
        <button className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">
          Customize
        </button>
      </div>
    </div>
  )
}
