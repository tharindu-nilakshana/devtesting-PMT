import React, { useState } from 'react';
import { Widget, WidgetModalProps } from '../types';
import { availableWidgets } from '../constants/widgets';
import { widgetIcons } from './WidgetIcons';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { Input } from './ui/input';

export function WidgetModal({ isOpen, onClose, onSelectWidget, onAddWidgetDirectly, recentWidgets = [], isInsideTabbedWidget = false, isFreeFloatingLayout = false }: WidgetModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Don't render if not open, but keep hooks above this check

  const shouldExcludeTabbedWidget = isInsideTabbedWidget || isFreeFloatingLayout;
  const widgetCatalog = shouldExcludeTabbedWidget
    ? availableWidgets.filter(widget => widget.id !== 'tabbed-widget')
    : availableWidgets;

  // Helper function to get category icon for a widget
  const getCategoryIcon = (widget: Widget) => {
    const categoryIcons: Record<string, React.ReactNode> = {
      'economic-data': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      'heatmaps': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      'price-charts': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      'seasonality': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      'cot': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      'news': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
      'research': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      'options': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      'sentiment': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'retail-sentiment': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      'central-banks': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      'market-structure': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      'stock-analysis': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      'orderflow': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      'Others': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    };
    return categoryIcons[widget.category || 'Others'];
  };

  // Filter widgets by search query
  const filteredWidgets = searchQuery
    ? widgetCatalog.filter(widget =>
        widget.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : widgetCatalog;

  // Group widgets by category
  const widgetsByCategory = filteredWidgets.reduce((acc, widget) => {
    const category = widget.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(widget);
    return acc;
  }, {} as Record<string, Widget[]>);

  // Create categories array with proper names and icons
  const categories = Object.entries(widgetsByCategory).map(([categoryKey, widgets]) => {
    // Map category keys to display names
    const categoryNames: Record<string, string> = {
      'economic-data': 'Economic Data',
      'heatmaps': 'Heatmaps',
      'price-charts': 'Price Charts',
      'seasonality': 'Seasonality',
      'cot': 'COT',
      'news': 'News',
      'research': 'Research',
      'scanner': 'Scanner',
      'options': 'Options',
      'volatility': 'Volatility',
      'sentiment': 'Sentiment',
      'retail-sentiment': 'Retail Sentiment',
      'central-banks': 'Central Banks',
      'market-structure': 'Market Structure',
      'stock-analysis': 'Stock Analysis',
      'orderflow': 'Order Flow',
      'Others': 'Others'
    };

    // Map category keys to icons
    const categoryIcons: Record<string, React.ReactNode> = {
      'economic-data': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      'heatmaps': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
      'price-charts': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      'seasonality': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      'cot': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      'news': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
      'research': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      'scanner': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      'options': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      'volatility': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l4-4 4 4M3 17l4-4 4 4M13 3l4 4-4 4M13 21l4-4-4 4M21 13l-4-4-4 4M21 17l-4-4-4 4" />
        </svg>
      ),
      'sentiment': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'retail-sentiment': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      'central-banks': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      'market-structure': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      'stock-analysis': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      'orderflow': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      'Others': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    };

    return {
      name: categoryNames[categoryKey] || categoryKey,
      icon: categoryIcons[categoryKey],
      widgets,
    };
  }).sort((a, b) => {
    // Sort categories in a specific order
    const order = ['Price Charts', 'Seasonality', 'COT', 'Heatmaps', 'News', 'Economic Data', 'Central Banks', 'Research', 'Stock Analysis', 'Scanner', 'Options', 'Volatility', 'Sentiment', 'Retail Sentiment', 'Market Structure', 'Order Flow', 'Others'];
    return order.indexOf(a.name) - order.indexOf(b.name);
  });

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        data-modal
        className="bg-neutral-800 border border-neutral-700 rounded-xl w-[380px] max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-700/70">
          <h2 className="text-base font-semibold text-neutral-100">Select Widget</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300 transition-colors p-1 rounded-md hover:bg-neutral-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-neutral-700/70">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              type="text"
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9 bg-neutral-900 border-neutral-700 text-neutral-100 placeholder:text-neutral-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Modal Content */}
        <div className="flex-1 px-6 py-5 overflow-y-auto bg-neutral-900/50">
          <div className="space-y-6">
            {searchQuery && (
              <div className="mb-4">
                <div className="text-sm text-neutral-400 mb-3">
                  Search Results ({filteredWidgets.length})
                </div>
                {filteredWidgets.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 text-sm">
                    No widgets found for "{searchQuery}"
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {filteredWidgets.map((widget) => {
                      const category = categories.find(cat => 
                        cat.widgets.some(w => w.id === widget.id)
                      );
                      return (
                        <button
                          key={widget.id}
                          onClick={() => {
                            onSelectWidget(widget);
                            onClose();
                          }}
                          className="flex flex-col items-center p-4 rounded-lg transition-all focus:outline-none hover:bg-neutral-700/60"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={widget.isImplemented ? 'text-orange-400' : 'text-neutral-500'}>
                              {category?.icon || getCategoryIcon(widget)}
                            </div>
                            <div className={widget.isImplemented ? 'text-orange-400' : ''}>
                              {widgetIcons[widget.id]}
                            </div>
                          </div>
                          <span className="text-[13px] font-medium text-center mb-0.5 mt-1 text-neutral-400">{widget.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {!searchQuery && !isInsideTabbedWidget && (
              <div>
                {isFreeFloatingLayout ? (
                  <div className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-md text-left">
                    <div className="text-neutral-400">{widgetIcons['tabbed-widget']}</div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-200 leading-tight">Tab Menu Widget unavailable</p>
                      <p className="text-xs text-neutral-400 leading-tight">Use a grid layout to add the Tab Menu Widget.</p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const tabbedWidget = availableWidgets.find(w => w.id === 'tabbed-widget');
                      if (onAddWidgetDirectly) {
                        onAddWidgetDirectly(tabbedWidget || { id: 'tabbed-widget', name: 'Tab Menu Widget', description: 'A container widget with tabs and a + button to add new tabs' });
                      } else {
                        onSelectWidget(tabbedWidget || { id: 'tabbed-widget', name: 'Tab Menu Widget', description: 'A container widget with tabs and a + button to add new tabs' });
                      }
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-medium rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    {t('Dashboard.AddTabbedWidget')}
                  </button>
                )}
              </div>
            )}
            {!searchQuery && categories.map((cat) => (
              <div key={cat.name}>
                <div className="flex items-center gap-2 text-neutral-300 text-base font-bold mb-3">
                  <div className="text-neutral-400">
                    {cat.icon}
                  </div>
                  {cat.name}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {cat.widgets.map((widget) => (
                    <button
                      key={widget.id}
                      onClick={() => {
                        onSelectWidget(widget);
                        onClose();
                      }}
                      className="flex flex-col items-center p-4 rounded-lg transition-all focus:outline-none hover:bg-neutral-700/60"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={widget.isImplemented ? 'text-orange-400' : 'text-neutral-500'}>
                          {cat.icon}
                        </div>
                        <div className={widget.isImplemented ? 'text-orange-400' : ''}>
                          {widgetIcons[widget.id]}
                        </div>
                      </div>
                      <span className="text-[13px] font-medium text-center mb-0.5 mt-1 text-neutral-400">{widget.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!searchQuery && recentWidgets && recentWidgets.length > 0 && (
              <>
                <div className="border-t border-neutral-700 pt-5 mt-2">
                  <div className="flex items-center gap-2 text-neutral-300 text-base font-bold mb-3">
                    <div className="text-neutral-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    {t('Categories.RecentWidgets')}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {recentWidgets
                      .filter(widget => !shouldExcludeTabbedWidget || widget.id !== 'tabbed-widget')
                      .map((widget) => (
                        <button
                          key={widget.id}
                          onClick={() => {
                            onSelectWidget(widget);
                            onClose();
                          }}
                          className="flex flex-col items-center p-4 rounded-lg transition-all focus:outline-none hover:bg-neutral-700/60"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className={widget.isImplemented ? 'text-orange-400' : 'text-neutral-500'}>
                              {getCategoryIcon(widget)}
                            </div>
                            <div className={widget.isImplemented ? 'text-orange-400' : ''}>
                              {widgetIcons[widget.id]}
                            </div>
                          </div>
                          <span className="text-[13px] font-medium text-center mb-0.5 mt-1 text-neutral-400">{widget.name}</span>
                        </button>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
