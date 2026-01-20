"use client";

import React from 'react';
import { useTranslation } from 'react-i18next';

interface PlaceholderWidgetProps {
  wgid: string;
}

export default function PlaceholderWidget({ 
  wgid
}: PlaceholderWidgetProps) {
  const { t } = useTranslation();
  
  return (
    <div className="widget-container h-full w-full bg-neutral-800 border border-neutral-700 rounded-lg p-4">
      <div className="widget-header mb-4">
        <h3 className="text-white text-lg font-semibold">{wgid.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
      </div>
      <div className="widget-content flex items-center justify-center h-full">
        <div className="text-center text-neutral-400">
          <div className="text-4xl mb-4">🚧</div>
          <p className="text-lg font-medium">{t('PlaceholderWidget.UnderConstruction')}</p>
          <p className="text-sm mt-2">{t('PlaceholderWidget.PlaceholderMessage')}</p>
        </div>
      </div>
    </div>
  );
}
