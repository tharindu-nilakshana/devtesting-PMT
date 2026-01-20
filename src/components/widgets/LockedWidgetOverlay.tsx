'use client';

import { ArrowUpRight, Lock } from "lucide-react";
import { WidgetHeader } from "../bloomberg-ui/WidgetHeader";

interface LockedWidgetOverlayProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onUpgrade?: () => void;
  widgetName?: string;
  upgradeUrl?: string;
}

export function LockedWidgetOverlay({
  onSettings,
  onRemove,
  onUpgrade,
  widgetName = "Premium Widget",
  upgradeUrl = "https://primemarket-terminal.com/pricing.html",
}: LockedWidgetOverlayProps) {
  const handleUpgrade = () => {
    onUpgrade?.();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded border border-border bg-widget-body">
      <WidgetHeader title={widgetName} onSettings={onSettings} onRemove={onRemove} />

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="absolute inset-0 z-10 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="pointer-events-none absolute inset-0 bg-background/55 backdrop-blur-md" />

          <div className="relative mx-auto flex min-h-full w-full max-w-lg items-center">
            <div
              className="relative z-10 w-full rounded-lg border-2 p-6 text-center shadow-[0_20px_40px_rgba(0,0,0,0.45)] transition-transform duration-300 sm:p-7 lg:p-8"
              style={{
                backgroundColor: "var(--widget-body)",
                borderColor: "var(--primary)",
                boxShadow: "0 0 0 1px rgba(249, 115, 22, 0.08), 0 24px 60px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div className="mb-4 flex justify-center sm:mb-5">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full border-2"
                  style={{
                    backgroundColor: "rgba(249, 115, 22, 0.12)",
                    borderColor: "var(--primary)",
                  }}
                >
                  <Lock className="h-8 w-8" style={{ color: "var(--primary)" }} />
                </div>
              </div>

              <h3
                className="mb-2"
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "var(--foreground)",
                }}
              >
                {widgetName}
              </h3>

              <p
                className="mb-6 leading-relaxed"
                style={{
                  fontSize: "0.9rem",
                  color: "var(--muted-foreground)",
                }}
              >
                This widget is available on Pro and Enterprise plans. Upgrade your account to unlock
                advanced analytics, real-time data, and premium workflow features.
              </p>

              <div className="mb-5 text-left sm:mb-6">
                <div className="space-y-2">
                  {[
                    "Real-time market data",
                    "Advanced charting tools",
                    "Custom indicators",
                    "Priority support",
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <a
                href={upgradeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleUpgrade}
                className="group relative flex w-full items-center justify-center gap-2 rounded border border-primary bg-primary px-6 py-3 text-base font-semibold text-white shadow-none transition duration-200 hover:-translate-y-0.5 hover:border-[#ea580c] hover:bg-[#ea580c] hover:shadow-[0_10px_24px_rgba(249,115,22,0.35)]"
              >
                <span className="text-base text-white">View All Plans and pricing</span>
                <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:flex" style={{ filter: "blur(4px)" }}>
          <div className="mt-auto w-full p-6 opacity-50">
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "TOTAL PROFIT",
                  value: "+$47,392",
                  helper: "↑ 24.7% this month",
                  color: "#22c55e",
                  wrapper: "from-success/20 to-success/5 border-success/30 text-success/80",
                },
                {
                  label: "WIN RATE",
                  value: "68.4%",
                  helper: "↑ 12.3% increase",
                  color: "#f97316",
                  wrapper: "from-primary/20 to-primary/5 border-primary/30 text-primary/80",
                },
                {
                  label: "AVG RETURN",
                  value: "+15.8%",
                  helper: "Per trade average",
                  color: "#3b82f6",
                  wrapper: "from-accent/20 to-accent/5 border-accent/30 text-accent/80",
                },
                {
                  label: "SHARPE RATIO",
                  value: "2.87",
                  helper: "Risk-adjusted",
                  color: "#eab308",
                  wrapper: "from-warning/20 to-warning/5 border-warning/30 text-warning/80",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-lg border bg-gradient-to-br ${stat.wrapper} p-4`}
                >
                  <div className="mb-2 text-xs tracking-wide">{stat.label}</div>
                  <div className="text-2xl font-bold" style={{ color: stat.color }}>
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: `${stat.color}99` }}>
                    {stat.helper}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-6 flex-1 rounded-lg border-2 border-border bg-gradient-to-br from-widget-header to-background p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="mb-1 text-xs tracking-wide text-muted-foreground">ADVANCED ANALYTICS</div>
                  <div className="text-foreground" style={{ fontSize: "1.25rem", fontWeight: 600 }}>
                    Real-time Performance Dashboard
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="rounded border border-success/40 bg-success/20 px-3 py-1.5 text-xs text-success">
                    LIVE
                  </span>
                  <span className="rounded border border-primary/40 bg-primary/20 px-3 py-1.5 text-xs text-primary">
                    PRO
                  </span>
                </div>
              </div>

              <svg className="h-48 w-full" viewBox="0 0 400 180" preserveAspectRatio="none">
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

                <line x1="0" y1="45" x2="400" y2="45" stroke="var(--border)" strokeWidth="1" opacity="0.3" />
                <line x1="0" y1="90" x2="400" y2="90" stroke="var(--primary)" strokeWidth="1.5" opacity="0.5" />
                <line x1="0" y1="135" x2="400" y2="135" stroke="var(--border)" strokeWidth="1" opacity="0.3" />

                <path d="M0,120 L50,100 L100,90 L150,70 L200,75 L250,55 L300,45 L350,35 L400,25 L400,180 L0,180 Z" fill="url(#chartGradient1)" />
                <path d="M0,140 L50,130 L100,120 L150,110 L200,105 L250,95 L300,85 L350,75 L400,65 L400,180 L0,180 Z" fill="url(#chartGradient2)" />
                <path d="M0,160 L50,155 L100,145 L150,140 L200,135 L250,125 L300,120 L350,110 L400,105 L400,180 L0,180 Z" fill="url(#chartGradient3)" />

                <polyline points="0,120 50,100 100,90 150,70 200,75 250,55 300,45 350,35 400,25" fill="none" stroke="#22c55e" strokeWidth="3" opacity="0.9" />
                <polyline points="0,140 50,130 100,120 150,110 200,105 250,95 300,85 350,75 400,65" fill="none" stroke="#f97316" strokeWidth="3" opacity="0.9" />
                <polyline points="0,160 50,155 100,145 150,140 200,135 250,125 300,120 350,110 400,105" fill="none" stroke="#3b82f6" strokeWidth="3" opacity="0.9" />

                {[0, 50, 100, 150, 200, 250, 300, 350, 400].map((x, index) => {
                  const y = [120, 100, 90, 70, 75, 55, 45, 35, 25][index];
                  return (
                    <g key={x}>
                      <circle cx={x} cy={y} r="4" fill="#22c55e" opacity="0.9" />
                      <circle cx={x} cy={y} r="6" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.4" />
                    </g>
                  );
                })}
              </svg>

              <div className="mt-4 flex items-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-success" />
                  <span className="text-muted-foreground">Portfolio Value</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Target Allocation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-accent" />
                  <span className="text-muted-foreground">Market Benchmark</span>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border bg-widget-header p-4">
                  <div className="mb-3 text-xs tracking-wide text-muted-foreground">RECENT SIGNALS</div>
                  <div className="space-y-2">
                    {[
                      { symbol: "EUR/USD", action: "BUY", profit: "+$2,450", color: "#22c55e" },
                      { symbol: "GBP/JPY", action: "SELL", profit: "+$1,890", color: "#22c55e" },
                      { symbol: "GOLD", action: "BUY", profit: "+$3,120", color: "#22c55e" },
                      { symbol: "BTC/USD", action: "BUY", profit: "-$890", color: "#ef4444" },
                    ].map((trade) => (
                      <div key={trade.symbol} className="flex items-center justify-between rounded border border-border/50 bg-background/60 p-2">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded border border-primary/40 bg-primary/20 text-xs font-semibold text-primary">
                            {trade.symbol.slice(0, 2)}
                          </span>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{trade.symbol}</div>
                            <div className="text-xs text-muted-foreground">{trade.action}</div>
                          </div>
                        </div>
                        <span className="text-sm font-bold" style={{ color: trade.color }}>
                          {trade.profit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-widget-header p-4">
                  <div className="mb-3 text-xs tracking-wide text-muted-foreground">RISK ANALYSIS</div>
                  <div className="space-y-3">
                    {[
                      { label: "Portfolio Beta", value: "0.87", bar: 87, color: "#22c55e" },
                      { label: "Volatility Index", value: "18.4", bar: 62, color: "#f97316" },
                      { label: "Max Drawdown", value: "-8.2%", bar: 35, color: "#eab308" },
                      { label: "Recovery Time", value: "12 days", bar: 45, color: "#3b82f6" },
                    ].map((metric) => (
                      <div key={metric.label}>
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{metric.label}</span>
                          <span className="text-sm font-semibold" style={{ color: metric.color }}>
                            {metric.value}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-background/60">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${metric.bar}%`,
                              backgroundColor: metric.color,
                              boxShadow: `0 0 8px ${metric.color}40`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

