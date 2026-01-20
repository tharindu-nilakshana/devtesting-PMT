"use client";

interface TechnicalChartsProps {
  symbol: string;
  darkMode: boolean;
  fixedScroll: boolean;
}

export default function TechnicalCharts({ 
  symbol, 
  darkMode, 
  fixedScroll 
}: TechnicalChartsProps) {
  return (
    <div className={`technical-charts ${darkMode ? 'dark' : 'light'} ${fixedScroll ? 'fixed-scroll' : ''}`}>
      <h3>{symbol} Technical Charts</h3>
      <canvas id={`chart-${symbol}`}></canvas>
    </div>
  );
}