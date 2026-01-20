"use client";

import { X, Plus, Search, Circle } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useState, useEffect } from "react";

interface AlertsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Alert {
  id: string;
  symbol: string;
  title: string;
  status: "Active" | "Stopped" | "Triggered";
  timestamp?: string;
  condition?: string;
  price?: string;
}

export function AlertsPanel({ isOpen, onClose }: AlertsPanelProps) {
  const [activeTab, setActiveTab] = useState<"alerts" | "log">("alerts");
  const [isAddAlertOpen, setIsAddAlertOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Notify other panels when opening
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('panel-opening', { detail: { panel: 'alerts' } }));
    }
  }, [isOpen]);

  // Listen for other panels opening
  useEffect(() => {
    const handlePanelOpening = (event: Event) => {
      const customEvent = event as CustomEvent<{ panel: string }>;
      if (customEvent.detail.panel !== 'alerts' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('panel-opening', handlePanelOpening);
    return () => window.removeEventListener('panel-opening', handlePanelOpening);
  }, [isOpen, onClose]);

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "1",
      symbol: "DXY",
      title: "DXY Crossing 97.258",
      status: "Triggered",
      timestamp: "08/10/2025, 14:28:24",
      condition: "Stopped — Triggered",
      price: "97.258",
    },
    {
      id: "2",
      symbol: "GBP/USD",
      title: "GBP/USD Crossing 1.3462",
      status: "Active",
      condition: "Active",
      price: "1.3462",
    },
  ]);

  const [newAlertData, setNewAlertData] = useState({
    symbol: "",
    condition: "above",
    price: "",
  });

  const logCount = alerts.filter(a => a.status === "Triggered").length;

  const handleAddAlert = () => {
    if (!newAlertData.symbol || !newAlertData.price) return;

    const newAlert: Alert = {
      id: `alert-${Math.random().toString(36).substr(2, 9)}`,
      symbol: newAlertData.symbol,
      title: `${newAlertData.symbol} ${newAlertData.condition === "above" ? "Above" : "Below"} ${newAlertData.price}`,
      status: "Active",
      condition: "Active",
      price: newAlertData.price,
    };

    setAlerts([newAlert, ...alerts]);
    setNewAlertData({ symbol: "", condition: "above", price: "" });
    setIsAddAlertOpen(false);
  };

  const handleRemoveAlert = (alertId: string) => {
    setAlerts(alerts.filter(a => a.id !== alertId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "text-success";
      case "Triggered":
        return "text-primary";
      case "Stopped":
        return "text-muted-foreground";
      default:
        return "text-foreground";
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === "log") return alert.status === "Triggered";
    if (searchQuery) {
      return alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             alert.symbol.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 top-[42px] bg-black/40 z-40 transition-opacity" onClick={onClose} />
      )}

      <div
        className={`fixed top-[42px] right-0 bottom-0 w-[460px] bg-widget-header border-l border-border z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-widget-header">
          <div className="flex items-center gap-4">
            <button
              className={`text-sm transition-colors ${
                activeTab === "alerts" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("alerts")}
            >
              Alerts
            </button>
            <button
              className={`text-sm transition-colors flex items-center gap-1.5 ${
                activeTab === "log" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("log")}
            >
              Log
              {logCount > 0 && (
                <span className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {logCount}
                </span>
              )}
            </button>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-4 py-3 border-b border-border bg-background flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsAddAlertOpen(true)}
            title="Add Alert"
          >
            <Plus className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs bg-input border-border"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredAlerts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-sm text-muted-foreground">
                {searchQuery ? "No alerts found" : activeTab === "log" ? "No triggered alerts" : "No active alerts"}
              </div>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div key={alert.id} className="px-4 py-3 border-b border-border hover:bg-popover transition-colors group">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Circle className="w-4 h-4 text-primary fill-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-sm text-foreground">{alert.symbol}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveAlert(alert.id)}
                      >
                        <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">{alert.title}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={getStatusColor(alert.status)}>{alert.condition}</span>
                      {alert.timestamp && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{alert.timestamp}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={isAddAlertOpen} onOpenChange={setIsAddAlertOpen}>
        <DialogContent className="bg-popover border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Create Alert</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Set up a price alert for your trading symbols.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="alert-symbol">Symbol</Label>
              <Input
                id="alert-symbol"
                placeholder="e.g., AAPL, EUR/USD, BTC"
                value={newAlertData.symbol}
                onChange={(e) => setNewAlertData({ ...newAlertData, symbol: e.target.value })}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={newAlertData.condition}
                onValueChange={(value) => setNewAlertData({ ...newAlertData, condition: value })}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Crosses Above</SelectItem>
                  <SelectItem value="below">Crosses Below</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.0001"
                placeholder="e.g., 150.25"
                value={newAlertData.price}
                onChange={(e) => setNewAlertData({ ...newAlertData, price: e.target.value })}
                className="bg-input border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddAlertOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddAlert}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!newAlertData.symbol || !newAlertData.price}
            >
              Create Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

