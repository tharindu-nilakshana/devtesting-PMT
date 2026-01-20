import { Lock, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { PricingDialog } from "@/components/widgets/PricingDialog";

interface BlockedWidgetProps {
  wgid?: string;
  onSettings?: () => void;
  onRemove?: () => void;
  settings?: Record<string, any>;
  widgetName?: string;
}

export default function BlockedWidget({ onSettings, onRemove, settings, widgetName = "Premium Widget" }: BlockedWidgetProps) {
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  const handleUpgrade = () => {
    setIsPricingOpen(true);
  };

  const handlePricingClose = () => {
    setIsPricingOpen(false);
  };

  const handleUpgradeComplete = (plan: string) => {
    console.log(`User selected plan: ${plan}`);
    // In a real app, this would handle the upgrade flow
    setIsPricingOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-widget-body relative">
      <WidgetHeader 
        title={widgetName}
        onSettings={onSettings}
        onRemove={onRemove}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-md">
        <div className="absolute inset-0 bg-background/40"></div>
        
        {/* Upgrade Card */}
        <div className="relative z-10 max-w-md mx-4">
          <div 
            className="rounded-lg border-2 p-8 text-center"
            style={{
              backgroundColor: 'var(--widget-body)',
              borderColor: 'var(--primary)',
              boxShadow: '0 0 0 1px rgba(249, 115, 22, 0.1), 0 20px 40px rgba(0, 0, 0, 0.4)'
            }}
          >
            {/* Lock Icon */}
            <div className="flex justify-center mb-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: 'rgba(249, 115, 22, 0.1)',
                  border: '2px solid var(--primary)'
                }}
              >
                <Lock className="w-8 h-8" style={{ color: 'var(--primary)' }} />
              </div>
            </div>

            {/* Title */}
            <h3 
              className="mb-2"
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: 'var(--foreground)'
              }}
            >
              Premium Widget
            </h3>

            {/* Description */}
            <p 
              className="mb-6 leading-relaxed"
              style={{
                fontSize: '0.9rem',
                color: 'var(--muted-foreground)'
              }}
            >
              This widget is only available on Pro and Enterprise plans. Upgrade your account to unlock advanced analytics, real-time data, and premium features.
            </p>

            {/* Features List */}
            <div className="mb-6 text-left">
              <div className="space-y-2">
                {[
                  'Real-time market data',
                  'Advanced charting tools',
                  'Custom indicators',
                  'Priority support'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: 'var(--primary)' }}
                    ></div>
                    <span 
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--muted-foreground)'
                      }}
                    >
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upgrade Button */}
            <button
              onClick={handleUpgrade}
              className="w-full py-3 px-6 rounded transition-all duration-200 flex items-center justify-center gap-2 group"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                fontWeight: 600,
                fontSize: '0.95rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ea580c';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(249, 115, 22, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span>Upgrade Now</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>

            {/* Additional Info */}
            <div className="mt-4">
              <button
                onClick={() => console.log("View pricing...")}
                className="text-xs transition-colors"
                style={{
                  color: 'var(--muted-foreground)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--muted-foreground)';
                }}
              >
                View all plans and pricing →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Blurred Background Content - Sample Widget */}
      <div className="flex-1 flex flex-col p-6 pointer-events-none" style={{ filter: 'blur(4px)' }}>
        {/* Header Stats */}
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-success/20 to-success/5 rounded-lg p-4 border border-success/30">
            <div className="text-xs text-success/80 mb-2 tracking-wide">TOTAL PROFIT</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>+$47,392</div>
            <div className="text-xs text-success/60 mt-1">↑ 24.7% this month</div>
          </div>
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg p-4 border border-primary/30">
            <div className="text-xs text-primary/80 mb-2 tracking-wide">WIN RATE</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f97316' }}>68.4%</div>
            <div className="text-xs text-primary/60 mt-1">↑ 12.3% increase</div>
          </div>
          <div className="bg-gradient-to-br from-accent/20 to-accent/5 rounded-lg p-4 border border-accent/30">
            <div className="text-xs text-accent/80 mb-2 tracking-wide">AVG RETURN</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>+15.8%</div>
            <div className="text-xs text-accent/60 mt-1">Per trade average</div>
          </div>
          <div className="bg-gradient-to-br from-warning/20 to-warning/5 rounded-lg p-4 border border-warning/30">
            <div className="text-xs text-warning/80 mb-2 tracking-wide">SHARPE RATIO</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#eab308' }}>2.87</div>
            <div className="text-xs text-warning/60 mt-1">Risk-adjusted</div>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="flex-1 bg-gradient-to-br from-widget-header to-background rounded-lg border-2 border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-muted-foreground tracking-wide mb-1">ADVANCED ANALYTICS</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }} className="text-foreground">Real-time Performance Dashboard</div>
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-1.5 bg-success/20 rounded text-xs text-success border border-success/40">LIVE</div>
              <div className="px-3 py-1.5 bg-primary/20 rounded text-xs text-primary border border-primary/40">PRO</div>
            </div>
          </div>
          
          <svg className="w-full h-full" viewBox="0 0 400 180" preserveAspectRatio="none">
            {/* Grid lines */}
            <defs>
              <linearGradient id="chartGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="chartGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="chartGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            
            {/* Grid */}
            <line x1="0" y1="45" x2="400" y2="45" stroke="var(--border)" strokeWidth="1" opacity="0.3" />
            <line x1="0" y1="90" x2="400" y2="90" stroke="var(--primary)" strokeWidth="1.5" opacity="0.5" />
            <line x1="0" y1="135" x2="400" y2="135" stroke="var(--border)" strokeWidth="1" opacity="0.3" />
            
            {/* Area fills */}
            <path
              d="M 0,120 L 50,100 L 100,90 L 150,70 L 200,75 L 250,55 L 300,45 L 350,35 L 400,25 L 400,180 L 0,180 Z"
              fill="url(#chartGradient1)"
            />
            <path
              d="M 0,140 L 50,130 L 100,120 L 150,110 L 200,105 L 250,95 L 300,85 L 350,75 L 400,65 L 400,180 L 0,180 Z"
              fill="url(#chartGradient2)"
            />
            <path
              d="M 0,160 L 50,155 L 100,145 L 150,140 L 200,135 L 250,125 L 300,120 L 350,110 L 400,105 L 400,180 L 0,180 Z"
              fill="url(#chartGradient3)"
            />
            
            {/* Lines */}
            <polyline
              points="0,120 50,100 100,90 150,70 200,75 250,55 300,45 350,35 400,25"
              fill="none"
              stroke="#22c55e"
              strokeWidth="3"
              opacity="0.9"
            />
            <polyline
              points="0,140 50,130 100,120 150,110 200,105 250,95 300,85 350,75 400,65"
              fill="none"
              stroke="#f97316"
              strokeWidth="3"
              opacity="0.9"
            />
            <polyline
              points="0,160 50,155 100,145 150,140 200,135 250,125 300,120 350,110 400,105"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              opacity="0.9"
            />
            
            {/* Data points */}
            {[0, 50, 100, 150, 200, 250, 300, 350, 400].map((x, i) => {
              const y1 = [120, 100, 90, 70, 75, 55, 45, 35, 25][i];
              return (
                <g key={i}>
                  <circle cx={x} cy={y1} r="4" fill="#22c55e" opacity="0.9" />
                  <circle cx={x} cy={y1} r="6" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.4" />
                </g>
              );
            })}
          </svg>
          
          {/* Legend */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <span className="text-xs text-success">Portfolio Value</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-xs text-primary">Target Allocation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent"></div>
              <span className="text-xs text-accent">Market Benchmark</span>
            </div>
          </div>
        </div>

        {/* Bottom Data Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Recent Trades */}
          <div className="bg-widget-header rounded-lg border border-border p-4">
            <div className="text-xs text-muted-foreground tracking-wide mb-3">RECENT SIGNALS</div>
            <div className="space-y-2">
              {[
                { symbol: 'EUR/USD', action: 'BUY', profit: '+$2,450', color: '#22c55e' },
                { symbol: 'GBP/JPY', action: 'SELL', profit: '+$1,890', color: '#22c55e' },
                { symbol: 'GOLD', action: 'BUY', profit: '+$3,120', color: '#22c55e' },
                { symbol: 'BTC/USD', action: 'BUY', profit: '-$890', color: '#ef4444' },
              ].map((trade, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-background/50 rounded border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary/40">
                      <span className="text-xs text-primary" style={{ fontWeight: 600 }}>{trade.symbol.slice(0, 2)}</span>
                    </div>
                    <div>
                      <div className="text-sm" style={{ fontWeight: 600 }}>{trade.symbol}</div>
                      <div className="text-xs text-muted-foreground">{trade.action}</div>
                    </div>
                  </div>
                  <div className="text-sm" style={{ fontWeight: 700, color: trade.color }}>{trade.profit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Metrics */}
          <div className="bg-widget-header rounded-lg border border-border p-4">
            <div className="text-xs text-muted-foreground tracking-wide mb-3">RISK ANALYSIS</div>
            <div className="space-y-3">
              {[
                { label: 'Portfolio Beta', value: '0.87', bar: 87, color: '#22c55e' },
                { label: 'Volatility Index', value: '18.4', bar: 62, color: '#f97316' },
                { label: 'Max Drawdown', value: '-8.2%', bar: 35, color: '#eab308' },
                { label: 'Recovery Time', value: '12 days', bar: 45, color: '#3b82f6' },
              ].map((metric, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{metric.label}</span>
                    <span className="text-sm" style={{ fontWeight: 600, color: metric.color }}>{metric.value}</span>
                  </div>
                  <div className="w-full h-2 bg-background/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${metric.bar}%`,
                        backgroundColor: metric.color,
                        boxShadow: `0 0 8px ${metric.color}40`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Dialog */}
      <PricingDialog
        isOpen={isPricingOpen}
        onClose={handlePricingClose}
        onUpgrade={handleUpgradeComplete}
      />
    </div>
  );
}

