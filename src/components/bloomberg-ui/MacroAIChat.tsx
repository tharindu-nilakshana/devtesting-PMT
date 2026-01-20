"use client";

import { Send, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { MacroAIIcon } from "./MacroAIIcon";
import { queryAI, transformQueryResponse, type Message, type EventCalendarItem } from "@/components/widgets/research/MacroAI/api";
import { useAuth } from "@/contexts/AuthContext";

const NAVBAR_CHAT_STORAGE_KEY_PREFIX = 'pmt_navbar_macro_ai_history_';

// Currency flag mapping
const currencyFlags: { [key: string]: string } = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  JPY: '🇯🇵',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  CHF: '🇨🇭',
  NZD: '🇳🇿',
  CNY: '🇨🇳',
  CNH: '🇨🇳',
  HKD: '🇭🇰',
  SGD: '🇸🇬',
  KRW: '🇰🇷',
  INR: '🇮🇳',
  MXN: '🇲🇽',
  BRL: '🇧🇷',
  ZAR: '🇿🇦',
  RUB: '🇷🇺',
  TRY: '🇹🇷',
  SEK: '🇸🇪',
  NOK: '🇳🇴',
  DKK: '🇩🇰',
  PLN: '🇵🇱',
  CZK: '🇨🇿',
  HUF: '🇭🇺',
};

// Impact level component
function ImpactDots({ sentiment }: { sentiment: number }) {
  // Sentiment: 1=low, 2=medium, 3=high
  const getImpactColor = () => {
    switch (sentiment) {
      case 3: return 'bg-red-500 dark:bg-red-500'; // High impact
      case 2: return 'bg-amber-500 dark:bg-orange-500'; // Medium impact
      default: return 'bg-yellow-500 dark:bg-yellow-500'; // Low impact
    }
  };

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((level) => (
        <span
          key={level}
          className={`w-2 h-2 rounded-full ${
            level <= sentiment ? getImpactColor() : 'bg-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
}

// Event Calendar Table Component
function EventCalendarTable({ data }: { data: EventCalendarItem[] }) {
  // Group events by date
  const eventsByDate = data.reduce((acc, event) => {
    const date = event.NewsDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as { [key: string]: EventCalendarItem[] });

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get the highest impact level for a date's events
  const getMaxImpact = (events: EventCalendarItem[]) => {
    return Math.max(...events.map(e => e.Sentiment));
  };

  // Get impact label
  const getImpactLabel = (sentiment: number) => {
    switch (sentiment) {
      case 3: return 'High';
      case 2: return 'Medium';
      default: return 'Low';
    }
  };

  // Get unique currencies for a date
  const getUniqueCurrencies = (events: EventCalendarItem[]) => {
    return [...new Set(events.map(e => e.Currency))];
  };

  // Get impact badge styles based on level
  const getImpactBadgeStyles = (impact: number) => {
    switch (impact) {
      case 3: 
        return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      case 2: 
        return 'bg-amber-100 text-amber-700 dark:bg-orange-500/20 dark:text-orange-400';
      default: 
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
    }
  };

  // Get high impact text color
  const getHighImpactTextColor = () => {
    return 'text-amber-600 dark:text-orange-400';
  };

  return (
    <div className="mt-4 space-y-4">
      {Object.entries(eventsByDate).map(([date, events]) => {
        const maxImpact = getMaxImpact(events);
        const currencies = getUniqueCurrencies(events);
        
        return (
          <div key={date} className="rounded-lg overflow-hidden border border-border bg-card">
            {/* Date Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#333]">
              <span className="font-semibold text-sm text-white">
                {formatDate(date)}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-orange-600/80 text-white">
                {currencies.join(', ')} Impact: {getImpactLabel(maxImpact)}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#333] bg-[#111]">
                    <th className="px-2 py-2 text-left font-semibold text-gray-400 text-xs uppercase">Time</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-400 text-xs uppercase">Curr</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-400 text-xs uppercase">Imp</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-400 text-xs uppercase">Event</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-400 text-xs uppercase">Forecast</th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-400 text-xs uppercase">Previous</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, idx) => {
                    const isHighImpact = event.Sentiment === 3;
                    const highImpactText = getHighImpactTextColor();
                    const isEvenRow = idx % 2 === 0;
                    return (
                      <tr 
                        key={`${event.InvestingNewsID}-${idx}`}
                        className={`border-b border-[#222] transition-colors ${
                          isEvenRow
                            ? 'bg-[#0a0a0a] hover:bg-[#1a1a1a]'
                            : 'bg-[#111] hover:bg-[#1a1a1a]'
                        }`}
                      >
                        <td className={`px-2 py-2 font-mono text-xs ${
                          'text-white'
                        }`}>
                          {event.NewsTime || '--:--'}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base leading-none">{currencyFlags[event.Currency] || '🏳️'}</span>
                            <span className={`text-xs font-medium ${
                              'text-white'
                            }`}>
                              {event.Currency}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <ImpactDots sentiment={event.Sentiment} />
                        </td>
                        <td className={`px-2 py-2 text-xs ${
                          'text-white'
                        }`}>
                          {event.NewsHeader}
                        </td>
                        <td className={`px-2 py-2 text-right font-mono text-xs ${
                          'text-white'
                        }`}>
                          {event.Forecast || '-'}
                        </td>
                        <td className={`px-2 py-2 text-right font-mono text-xs ${
                          'text-white'
                        }`}>
                          {event.Previous || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MacroAIChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Create user-specific storage key
  const storageKey = user?.id ? `${NAVBAR_CHAT_STORAGE_KEY_PREFIX}${user.id}` : null;
  
  const defaultMessage: Message = {
    id: "1",
    type: "ai",
    content: "Hello! I'm your Macro AI assistant. Ask me about market trends, economic indicators, or get insights on global markets.",
    timestamp: new Date(),
  };
  
  // Initialize messages from localStorage synchronously
  const getInitialMessages = (): Message[] => {
    if (typeof window === 'undefined' || !storageKey) {
      return [defaultMessage];
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedMessages = JSON.parse(stored);
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        if (messagesWithDates.length > 0) {
          return messagesWithDates;
        }
      }
    } catch (err) {
      console.error('Error loading chat history from localStorage:', err);
    }
    return [defaultMessage];
  };
  
  const [messages, setMessages] = useState<Message[]>(getInitialMessages);
  const prevStorageKeyRef = useRef<string | null>(storageKey);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Notify other panels to close
      window.dispatchEvent(new CustomEvent('panel-opening', { detail: { panel: 'macro-ai' } }));
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Listen for other panels opening
  useEffect(() => {
    const handlePanelOpening = (event: Event) => {
      const customEvent = event as CustomEvent<{ panel: string }>;
      if (customEvent.detail.panel !== 'macro-ai' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('panel-opening', handlePanelOpening);
    return () => window.removeEventListener('panel-opening', handlePanelOpening);
  }, [isOpen]);

  // Reload messages when user changes (different storageKey)
  useEffect(() => {
    if (prevStorageKeyRef.current !== storageKey) {
      prevStorageKeyRef.current = storageKey;
      
      if (!storageKey) {
        setMessages([defaultMessage]);
        return;
      }
      
      // Load from localStorage for new user
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsedMessages = JSON.parse(stored);
          const messagesWithDates = parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          if (messagesWithDates.length > 0) {
            setMessages(messagesWithDates);
            return;
          }
        }
      } catch (err) {
        console.error('Error loading chat history from localStorage:', err);
      }
      setMessages([defaultMessage]);
    }
  }, [storageKey, defaultMessage]);
  
  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (storageKey && messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (err) {
        console.error('Error saving chat history to localStorage:', err);
      }
    }
  }, [messages, storageKey]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const query = inputValue.trim();
    setInputValue("");
    setIsTyping(true);
    setError(null);

    try {
      // Query AI using the same API as the widget
      const apiResponse = await queryAI(query);
      
      if (!apiResponse) {
        throw new Error('Failed to get AI response');
      }

      // Transform and add AI response
      const aiMessage = transformQueryResponse(apiResponse, `msg-${Date.now() + 1}`);
      setMessages((prev) => [...prev, aiMessage]);
      // Messages are automatically saved to localStorage via the useEffect above
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to get AI response');
      // Remove the user message on error
      setMessages((prev) => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="relative">
        <div className="relative">
          {/* Pulsing glow effect when active */}
          {isOpen && (
            <div className="absolute inset-0 rounded-md bg-primary/30 animate-pulse blur-sm"></div>
          )}
          <button
            className={`h-8 w-8 flex items-center justify-center rounded-md transition-all relative ${
              isOpen
                ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_12px_rgba(249,115,22,0.4)]"
                : "text-muted-foreground hover:text-primary hover:bg-primary/20"
            }`}
            onClick={() => setIsOpen(!isOpen)}
            title="Macro AI"
          >
            <MacroAIIcon className="w-6 h-6" />
            {/* Always-visible indicator dot showing AI is ready */}
            <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
              isOpen 
                ? "bg-primary animate-pulse shadow-[0_0_6px_rgba(249,115,22,0.8)]"
                : "bg-success animate-pulse shadow-[0_0_4px_rgba(34,197,94,0.6)]"
            }`}></span>
          </button>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 top-[42px] bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Chat Side Panel - Slides from Right */}
      <div 
        ref={dropdownRef}
        className={`fixed top-[42px] right-0 bottom-0 w-[460px] bg-popover border-l border-border shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-widget-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <MacroAIIcon className="w-7 h-7 text-primary" />
              </div>
              <div>
                <div className="text-sm text-foreground">Macro AI Assistant</div>
                <div className="text-xs text-success flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                  Online
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-widget-body">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    message.type === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <div className="text-sm leading-relaxed">{message.content}</div>
                  
                  {/* Event Calendar Table for event_calendar question type */}
                  {message.type === 'ai' && message.question_type === 'event_calendar' && message.data && message.data.length > 0 && (
                    <EventCalendarTable data={message.data as EventCalendarItem[]} />
                  )}
                  
                  {/* Special question type indicator */}
                  {message.type === 'ai' && (message.question_type === 'smart_bias_history' || message.question_type === 'research_files' || message.question_type === 'session_recap') && (
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-primary"></span>
                      <span className="capitalize">{message.question_type.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <div className="text-xs text-muted-foreground">
                        {message.sources.length} source{message.sources.length !== 1 ? 's' : ''} used
                      </div>
                    </div>
                  )}
                  <div
                    className={`text-xs mt-1 ${
                      message.type === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
            {error && (
              <div className="flex justify-start">
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 max-w-[85%]">
                  <div className="text-xs text-destructive font-medium mb-1">Error</div>
                  <div className="text-xs text-destructive/80">{error}</div>
                </div>
              </div>
            )}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-widget-header">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about markets, trends, data..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 h-9 text-sm bg-input border-border"
              />
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="h-9 w-9 p-0"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-2 text-center">
              AI responses are for informational purposes only
            </div>
          </div>
        </div>
    </>
  );
}

