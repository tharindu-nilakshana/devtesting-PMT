'use client'

import { useState, useEffect } from 'react'

interface MiniChartsProps {
  symbol?: string
  className?: string
}

export default function MiniCharts({ 
  symbol = 'EURUSD',
  className = '' 
}: MiniChartsProps) {
  const [miniData, setMiniData] = useState<{
    symbol: string;
    sparkline: Array<{ time: number; value: number }>;
    currentPrice: number;
    change: number;
    changePercent: number;
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate mini chart data loading
    const timer = setTimeout(() => {
      setMiniData({
        symbol,
        sparkline: Array.from({ length: 24 }, (_, i) => ({
          time: Date.now() - (24 - i) * 3600000, // hourly data
          value: 1.05 + Math.random() * 0.1 + Math.sin(i * 0.5) * 0.02
        })),
        currentPrice: 1.05 + Math.random() * 0.1,
        change: (Math.random() - 0.5) * 0.02,
        changePercent: (Math.random() - 0.5) * 2
      })
      setIsLoading(false)
    }, 600)

    return () => clearTimeout(timer)
  }, [symbol])

  if (isLoading || !miniData) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg p-3 ${className}`}>
        <div className="animate-pulse">
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
          <div className="h-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    )
  }

  // Now TypeScript knows miniData is not null
  const minValue = Math.min(...miniData.sparkline.map(d => d.value))
  const maxValue = Math.max(...miniData.sparkline.map(d => d.value))
  const range = maxValue - minValue

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg p-3 shadow ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium text-gray-900 dark:text-white text-sm">
          {miniData.symbol}
        </span>
        <span className={`text-xs font-medium ${
          miniData.change >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {miniData.change >= 0 ? '+' : ''}{miniData.changePercent.toFixed(2)}%
        </span>
      </div>
      
      <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        {miniData.currentPrice.toFixed(5)}
      </div>
      
      <div className="h-16 bg-gray-50 dark:bg-gray-800 rounded flex items-end justify-between px-1">
        {miniData.sparkline.map((point, index) => {
          const height = range > 0 ? ((point.value - minValue) / range) * 100 : 50
          return (
            <div
              key={index}
              className={`w-1 rounded-t ${
                miniData.change >= 0 ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ height: `${height}%` }}
            />
          )
        })}
      </div>
      
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
        24H Sparkline
      </div>
    </div>
  )
}
