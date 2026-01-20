'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// Extend Window interface for SpeechRecognition
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MacroAIIcon } from './MacroAIIcon';
import { Send, Mic, X, MessageSquare, Volume2, Loader2, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
import { queryAI, getChatHistory, saveChatMessage, clearChatHistory, transformQueryResponse, transformHistoryItem, type Message, type Source, type EventCalendarItem } from './api';
import { ConfirmDialog } from '@/components/bloomberg-ui/ConfirmDialog';

interface MacroAIWidgetProps {
  id: string;
  onRemove: () => void;
  onSettings: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, any>;
  wgid?: string;
}

function VoiceAssistantVisualizer({ isListening, isSpeaking }: { isListening: boolean; isSpeaking: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Central orb */}
      <div className="relative w-40 h-40 flex items-center justify-center mb-8">
        {/* Outer pulsing rings - enhanced */}
        {(isListening || isSpeaking) && (
          <>
            <div className={`absolute inset-0 rounded-full border-2 ${
              isListening ? "border-primary/30" : "border-success/30"
            } animate-ping opacity-40`}></div>
            <div className={`absolute inset-3 rounded-full border-2 ${
              isListening ? "border-primary/40" : "border-success/40"
            } animate-ping opacity-50 [animation-delay:0.3s]`}></div>
            <div className={`absolute inset-6 rounded-full border ${
              isListening ? "border-primary/50" : "border-success/50"
            } animate-ping opacity-60 [animation-delay:0.6s]`}></div>
          </>
        )}
        
        {/* Central orb - enhanced with gradient */}
        <div className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
          isListening 
            ? "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/40 shadow-[0_0_40px_rgba(249,115,22,0.3)]" 
            : isSpeaking
            ? "bg-gradient-to-br from-success/20 to-success/5 border-success/40 shadow-[0_0_40px_rgba(34,197,94,0.3)]"
            : "bg-gradient-to-br from-muted to-background border-border/50 shadow-lg"
        }`}>
          <MacroAIIcon className={`w-16 h-16 transition-all duration-500 ${
            isListening 
              ? "text-primary drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" 
              : isSpeaking
              ? "text-success drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]"
              : "text-muted-foreground"
          }`} />
        </div>
      </div>

      {/* Status text - enhanced */}
      <div className="text-center space-y-2 mb-6">
        <div className={`text-base font-medium transition-colors duration-300 ${
          isListening ? "text-primary" : isSpeaking ? "text-success" : "text-foreground"
        }`}>
          {isListening && "Listening..."}
          {isSpeaking && "Processing..."}
          {!isListening && !isSpeaking && "Ready to assist"}
        </div>
        <div className="text-sm text-muted-foreground">
          {isListening && "Speak your question clearly"}
          {isSpeaking && "Analyzing your request"}
          {!isListening && !isSpeaking && "Click the button below to start"}
        </div>
      </div>

      {/* Waveform - enhanced */}
      {(isListening || isSpeaking) && (
        <div className="w-full max-w-md px-8">
          <div className="flex items-center justify-center gap-1 h-16 bg-muted/30 rounded-lg px-4 border border-border/50">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all ${
                  isListening ? "bg-primary" : "bg-success"
                }`}
                style={{
                  height: isListening || isSpeaking ? `${Math.random() * 100}%` : "20%",
                  animation: isListening || isSpeaking ? `voice-wave 1s ease-in-out infinite` : "none",
                  animationDelay: `${i * 0.03}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format content with paragraph breaks after every 3 sentences
function formatContentWithParagraphs(content: string): React.ReactNode {
  // Split content into sentences (handle common sentence endings: . ! ?)
  // Use a regex that matches sentence endings followed by whitespace or end of string
  const sentenceEndings = /([.!?]+)(\s+|$)/g;
  const sentences: string[] = [];
  let lastIndex = 0;
  let match;
  
  // Reset regex lastIndex
  sentenceEndings.lastIndex = 0;
  
  while ((match = sentenceEndings.exec(content)) !== null) {
    const sentenceEnd = match.index + match[1].length;
    const sentence = content.substring(lastIndex, sentenceEnd).trim();
    if (sentence) {
      sentences.push(sentence);
    }
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text as last sentence if any
  const remaining = content.substring(lastIndex).trim();
  if (remaining) {
    sentences.push(remaining);
  }
  
  // If no sentences found (no punctuation), return original content as single paragraph
  if (sentences.length === 0) {
    return <div>{content}</div>;
  }
  
  // Group sentences into paragraphs of 3
  const paragraphs: string[][] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3));
  }
  
  // Render paragraphs with proper spacing
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={index < paragraphs.length - 1 ? "mb-3" : ""}>
          {paragraph.join(' ')}
        </p>
      ))}
    </>
  );
}

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
          className={`w-2.5 h-2.5 rounded-full ${
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
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1a1a] border-b border-[#333]">
              <span className="font-semibold text-base text-white">
                {formatDate(date)}
              </span>
              <span className="text-sm font-medium px-2.5 py-1 rounded bg-orange-600/80 text-white">
                {currencies.join(', ')} Impact: {getImpactLabel(maxImpact)}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-[#333] bg-[#111]">
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-400 text-sm uppercase">Time</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-400 text-sm uppercase">Curr</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-400 text-sm uppercase">Imp</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-400 text-sm uppercase">Event</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-gray-400 text-sm uppercase">Forecast</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-gray-400 text-sm uppercase">Previous</th>
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
                        <td className={`px-3 py-3 font-mono text-sm ${
                          'text-white'
                        }`}>
                          {event.NewsTime || '--:--'}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg leading-none">{currencyFlags[event.Currency] || '🏳️'}</span>
                            <span className={`text-sm font-medium ${
                              'text-white'
                            }`}>
                              {event.Currency}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <ImpactDots sentiment={event.Sentiment} />
                        </td>
                        <td className={`px-3 py-3 text-sm ${
                          'text-white'
                        }`}>
                          {event.NewsHeader}
                        </td>
                        <td className={`px-3 py-3 text-right font-mono text-sm ${
                          'text-white'
                        }`}>
                          {event.Forecast || '-'}
                        </td>
                        <td className={`px-3 py-3 text-right font-mono text-sm ${
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

function MessageBubble({ message, onFeedback }: { message: Message; onFeedback?: (messageId: string, feedback: 'up' | 'down') => void }) {
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [categoryExpanded, setCategoryExpanded] = useState<{ [key: string]: boolean }>({});

  // Group sources by category
  const groupedSources = message.sources?.reduce((acc, source) => {
    const category = source.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(source);
    return acc;
  }, {} as { [key: string]: Source[] });

  return (
    <div
      className={`max-w-[85%] rounded-xl px-4 py-3 shadow-sm ${
        message.type === 'user'
          ? 'bg-muted/60 backdrop-blur-sm text-foreground border border-border/30'
          : 'bg-muted/80 backdrop-blur-sm text-foreground border border-border/50'
      }`}
    >
      <div className="text-base leading-relaxed">
        {message.type === 'ai' ? formatContentWithParagraphs(message.content) : message.content}
      </div>
      
      {/* Event Calendar Table for event_calendar question type */}
      {message.type === 'ai' && message.question_type === 'event_calendar' && message.data && message.data.length > 0 && (
        <EventCalendarTable data={message.data as EventCalendarItem[]} />
      )}
      
      {/* Special question type indicator */}
      {message.type === 'ai' && (message.question_type === 'smart_bias_history' || message.question_type === 'research_files' || message.question_type === 'session_recap') && (
        <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
          <span className="capitalize">{message.question_type.replace(/_/g, ' ')}</span>
        </div>
      )}
      
      {/* Sources section */}
      {message.sources && message.sources.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <button
            onClick={() => setSourcesExpanded(!sourcesExpanded)}
            className="flex items-center gap-2 text-base text-primary hover:text-primary/80 transition-colors w-full"
          >
            {sourcesExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            <span className="font-medium">Sources used</span>
          </button>
          
          {sourcesExpanded && groupedSources && (
            <div className="mt-2 space-y-2">
              {Object.entries(groupedSources).map(([category, sources]) => (
                <div key={category}>
                  <button
                    onClick={() => setCategoryExpanded({ ...categoryExpanded, [category]: !categoryExpanded[category] })}
                    className="flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors w-full"
                  >
                    {categoryExpanded[category] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    <span className="font-medium">{category}</span>
                    <span className="ml-auto bg-muted/50 px-1.5 py-0.5 rounded text-sm">{sources.length}</span>
                  </button>
                  
                  {categoryExpanded[category] && (
                    <div className="mt-1.5 ml-5 space-y-1.5">
                      {sources.map((source, idx) => (
                        <div key={idx} className="text-base text-muted-foreground">
                          <div className="flex items-start gap-1.5">
                            <span className="text-primary mt-1">•</span>
                            <div className="flex-1">
                              <div className="text-sm text-foreground/90 leading-snug">{source.title}</div>
                              <div className="text-sm text-muted-foreground/70 mt-0.5">{source.date}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div
        className={`text-sm mt-2 flex items-center gap-1.5 ${
          message.type === 'user' ? 'justify-end' : 'justify-between'
        }`}
      >
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
        
        {/* Feedback buttons for AI messages */}
        {message.type === 'ai' && onFeedback && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onFeedback(message.id, 'up')}
              className={`p-1 rounded transition-all ${
                message.feedback === 'up'
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
              }`}
              title="Good response"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => onFeedback(message.id, 'down')}
              className={`p-1 rounded transition-all ${
                message.feedback === 'down'
                  ? 'bg-destructive/20 text-destructive'
                  : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
              }`}
              title="Bad response"
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function MacroAIWidget({ id, onRemove, onSettings, onFullscreen, settings, wgid }: MacroAIWidgetProps) {
  const [assistantMode, setAssistantMode] = useState<'chat' | 'voice'>('chat');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  
  // Get widget ID - prioritize settings.customDashboardWidgetID, then wgid, then id prop
  const getWidgetId = (): number | null => {
    // First priority: Check settings.customDashboardWidgetID (most reliable)
    const customDashboardWidgetID = settings?.customDashboardWidgetID;
    if (customDashboardWidgetID !== undefined && customDashboardWidgetID !== null) {
      const widgetInstanceId = typeof customDashboardWidgetID === 'number' 
        ? customDashboardWidgetID 
        : Number.parseInt(String(customDashboardWidgetID), 10);
      if (!Number.isNaN(widgetInstanceId) && widgetInstanceId > 0) {
        return widgetInstanceId;
      }
    }
    
    // Second priority: Check wgid prop
    if (wgid) {
      const parsedWgid = Number.parseInt(wgid, 10);
      if (!Number.isNaN(parsedWgid) && parsedWgid > 0) {
        return parsedWgid;
      }
    }
    
    // Third priority: Check id prop
    const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;
    if (!Number.isNaN(parsedId) && parsedId > 0) {
      return parsedId;
    }
    
    return null;
  };
  
  const widgetId = getWidgetId();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          console.log('🎤 Speech recognition started');
          setIsRecording(true);
          setIsProcessingAudio(false);
        };

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join('');
          console.log('🎤 Speech recognition result:', transcript);
          setInputValue(transcript);
          setIsProcessingAudio(false);
        };

        recognition.onerror = (event) => {
          console.error('🎤 Speech recognition error:', event.error);
          setIsRecording(false);
          setIsProcessingAudio(false);
          if (event.error === 'no-speech') {
            setError('No speech detected. Please try again.');
          } else if (event.error === 'audio-capture') {
            setError('No microphone found. Please check your microphone settings.');
          } else if (event.error === 'not-allowed') {
            setError('Microphone permission denied. Please allow microphone access.');
          } else {
            setError('Speech recognition failed. Please try again.');
          }
          // Clear error after 5 seconds
          setTimeout(() => setError(null), 5000);
        };

        recognition.onend = () => {
          console.log('🎤 Speech recognition ended');
          setIsRecording(false);
          setIsProcessingAudio(false);
        };

        recognitionRef.current = recognition;
      } else {
        console.warn('⚠️ Speech recognition not supported in this browser');
      }
    }

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
    };
  }, []);

  // Load chat history on component mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!widgetId) {
        console.warn('⚠️ [Macro AI] No widget ID available, skipping history load');
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);
      setError(null);

      try {
        const history = await getChatHistory(widgetId, 100, 'asc');
        
        // console.log('📜 [Macro AI] History loaded:', {
        //   itemsCount: history?.items?.length || 0,
        //   items: history?.items?.map(item => ({
        //     role: item.role,
        //     contentLength: item.content?.length || 0,
        //     hasSources: !!(item.sources || (item as any).Sources),
        //     sourcesCount: (item.sources || (item as any).Sources)?.length || 0,
        //     sources: item.sources || (item as any).Sources
        //   })) || []
        // });
        
        if (history && history.items && history.items.length > 0) {
          const transformedMessages = history.items.map((item, index) => {
            const transformed = transformHistoryItem(item, index);
            const rawSources = item.sources || (item as any).Sources;
            // console.log('📜 [Macro AI] Transformed message:', {
            //   index,
            //   role: item.role,
            //   hasSources: !!rawSources,
            //   sourcesCount: rawSources?.length || 0,
            //   transformedSourcesCount: transformed.sources?.length || 0
            // });
            return transformed;
          });
          setMessages(transformedMessages);
        }
      } catch (err) {
        console.error('Error loading chat history:', err);
        setError('Failed to load chat history');
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [widgetId]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const query = inputValue.trim();
    setInputValue('');
    setIsTyping(true);
    setError(null);

    try {
      // Query AI
      const apiResponse = await queryAI(query);
      
      if (!apiResponse) {
        throw new Error('Failed to get AI response');
      }

      // Transform and add AI response
      const aiMessage = transformQueryResponse(apiResponse, (Date.now() + 1).toString());
      setMessages((prev) => [...prev, aiMessage]);
      
      // Save messages to history
      if (widgetId) {
        console.log('💾 [Macro AI] Saving messages with sources:', {
          widgetId,
          userMessage: { role: 'user', contentLength: query.length, sourcesCount: 0 },
          assistantMessage: { 
            role: 'assistant', 
            contentLength: aiMessage.content.length,
            sourcesCount: apiResponse.sources?.length || 0,
            sources: apiResponse.sources || []
          },
        });
        
        await saveChatMessage(widgetId, [
          {
            role: 'user',
            content: query,
            sources: [],
          },
          {
            role: 'assistant',
            content: aiMessage.content,
            sources: apiResponse.sources || [],
          },
        ]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to get AI response');
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFeedback = (messageId: string, feedback: 'up' | 'down') => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          // Toggle feedback: if same feedback is clicked, remove it; otherwise set new feedback
          return {
            ...msg,
            feedback: msg.feedback === feedback ? null : feedback,
          };
        }
        return msg;
      })
    );
  };

  const handleVoiceToggle = async () => {
    if (assistantMode === 'voice') {
      // Voice Assistant Mode
      setIsRecording(!isRecording);
      if (!isRecording) {
        // TODO: Start voice recording and send to API
        // await startVoiceRecording();
        setTimeout(() => {
          setIsRecording(false);
          setIsSpeaking(true);
          // TODO: Process voice input and get AI response
          // await processVoiceInput();
          setTimeout(() => {
            setIsSpeaking(false);
          }, 3000);
        }, 3000);
      }
    } else {
      // Chat Mode with voice input
      setIsRecording(!isRecording);
      if (!isRecording) {
        // TODO: Process voice input and convert to text
        // const transcribedText = await transcribeVoice();
        setTimeout(() => {
          setIsRecording(false);
          // TODO: Use transcribed text instead of hardcoded
          const transcribedText = ''; // Will come from API
          if (transcribedText) {
            setInputValue(transcribedText);
            // handleSend will be called automatically or manually
          }
        }, 3000);
      }
    }
  };

  const handleClearChat = async () => {
    if (!widgetId) {
      setError('Widget ID not found');
      return;
    }

    setIsClearing(true);
    setError(null);

    try {
      const success = await clearChatHistory(widgetId);
      if (success) {
        // Clear messages from state
        setMessages([]);
        setShowClearConfirm(false);
      } else {
        setError('Failed to clear chat history');
      }
    } catch (err) {
      console.error('Error clearing chat history:', err);
      setError('Failed to clear chat history');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-card text-card-foreground rounded-lg border border-border overflow-hidden">
      <WidgetHeader
        title="Macro AI"
        onRemove={onRemove}
        onFullscreen={onFullscreen}
      >
        {/* Mode selector and clear chat button in header */}
        <div className="flex items-center gap-2">
          {/* Mode selector hidden */}
          {/* <div className="flex gap-0.5 bg-background/50 border border-border/50 rounded-md p-1 shadow-sm">
            <button
              onClick={() => {
                setAssistantMode('chat');
                setIsRecording(false);
                setIsSpeaking(false);
              }}
              className={`px-2.5 py-1.5 rounded transition-all ${
                assistantMode === 'chat'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              title="Chat Mode"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setAssistantMode('voice');
                setIsRecording(false);
                setIsSpeaking(false);
              }}
              className={`px-2.5 py-1.5 rounded transition-all ${
                assistantMode === 'voice'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              title="Voice Assistant Mode"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div> */}
          
          {/* Clear Chat Button */}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-2.5 py-1.5 rounded transition-all text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Clear all chats"
            disabled={messages.length === 0}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </WidgetHeader>

      {/* Chat Mode */}
      {assistantMode === 'chat' && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-background/50 to-background/30">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
                  <div className="text-muted-foreground text-base">Loading chat history...</div>
                </div>
              </div>
            ) : messages.length === 0 && !isTyping && !error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-muted-foreground text-base mb-2">Start a conversation</div>
                  <div className="text-sm text-muted-foreground/70">Ask about markets, trends, or economic indicators</div>
                </div>
              </div>
            ) : null}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <MessageBubble message={message} onFeedback={handleFeedback} />
              </div>
            ))}
            
            {/* Error indicator */}
            {error && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-destructive/10 backdrop-blur-sm border border-destructive/30 rounded-xl px-4 py-3 shadow-sm">
                  <div className="text-sm text-destructive font-medium mb-1">Error</div>
                  <div className="text-xs text-destructive/80">{error}</div>
                </div>
              </div>
            )}
            
            {/* Loading indicator */}
            {isTyping && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-muted/80 backdrop-blur-sm border border-border/50 rounded-xl px-4 py-3 shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">Generating response...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-4 py-3.5 border-t border-border/50 bg-muted/20 backdrop-blur-sm">
            <div className="flex gap-2.5">
              {/* Input - text field when not recording, audio UI when recording */}
              {!isRecording ? (
                <Input
                  placeholder="Ask about markets, trends, data..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 h-10 text-base bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 shadow-sm transition-all"
                />
              ) : (
                <div className="flex-1 h-10 bg-background/80 backdrop-blur-sm border border-primary/50 rounded-md flex items-center px-3.5 shadow-sm">
                  <div className="flex items-center gap-px flex-1 h-full">
                    {[...Array(50)].map((_, i) => {
                      // Create varied animation delays and heights for more dynamic wave effect
                      const baseDelay = i * 0.025;
                      const randomOffset = (i % 7) * 0.01; // Cycle through 7 different patterns
                      return (
                        <div
                          key={i}
                          className="w-px bg-primary rounded-full"
                          style={{
                            minHeight: '4px',
                            maxHeight: '20px',
                            animation: 'voice-wave-input 1.2s ease-in-out infinite',
                            animationDelay: `${baseDelay + randomOffset}s`,
                          }}
                        />
                      );
                    })}
                  </div>
                  <span className="ml-3 text-xs text-primary font-medium">Recording...</span>
                </div>
              )}

              {/* Action Button */}
              <Button
                size="sm"
                onClick={async () => {
                  if (isRecording) {
                    // Stop recording
                    if (recognitionRef.current) {
                      try {
                        recognitionRef.current.stop();
                      } catch (e) {
                        console.error('Error stopping recognition:', e);
                        setIsRecording(false);
                        setIsProcessingAudio(false);
                      }
                    } else {
                      setIsRecording(false);
                      setIsProcessingAudio(false);
                    }
                  } else if (inputValue) {
                    // Send message
                    handleSend();
                  } else {
                    // Start recording
                    if (recognitionRef.current) {
                      try {
                        setIsProcessingAudio(true);
                        recognitionRef.current.start();
                      } catch (e) {
                        console.error('Error starting recognition:', e);
                        setError('Failed to start recording. Please try again.');
                        setIsProcessingAudio(false);
                        setTimeout(() => setError(null), 5000);
                      }
                    } else {
                      setError('Speech recognition is not supported in this browser.');
                      setTimeout(() => setError(null), 5000);
                    }
                  }
                }}
                disabled={isProcessingAudio}
                className={`h-10 w-10 p-0 rounded-lg shadow-sm transition-all ${
                  isRecording
                    ? 'bg-destructive hover:bg-destructive/90 shadow-destructive/20'
                    : inputValue
                    ? 'bg-primary hover:bg-primary/90 shadow-primary/20'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                } ${isProcessingAudio ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isRecording ? (
                  <X className="w-4 h-4" />
                ) : inputValue ? (
                  <Send className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground/70 mt-2.5 text-center font-medium">
              AI responses are for informational purposes only
            </div>
          </div>
        </>
      )}

      {/* Voice Assistant Mode */}
      {assistantMode === 'voice' && (
        <div className="flex-1 bg-gradient-to-b from-background/50 to-background/30 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <VoiceAssistantVisualizer 
              isListening={isRecording} 
              isSpeaking={isSpeaking} 
            />
          </div>
          
          {/* Voice Control */}
          <div className="px-6 pb-6 flex flex-col items-center gap-3">
            <Button
              size="lg"
              onClick={handleVoiceToggle}
              disabled={isSpeaking}
              className={`${
                isRecording
                  ? 'bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/30'
                  : isSpeaking
                  ? 'bg-muted cursor-not-allowed text-muted-foreground shadow-none'
                  : 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30'
              } text-primary-foreground px-8 h-11 rounded-lg font-medium transition-all`}
            >
              <Mic className="w-4 h-4 mr-2.5" />
              {isRecording ? 'Stop Recording' : isSpeaking ? 'Processing...' : 'Start Speaking'}
            </Button>
            
            <div className="text-xs text-muted-foreground/70 font-medium">
              Voice responses are simulated for demonstration
            </div>
          </div>
        </div>
      )}

      {/* Clear Chat Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearChat}
        title="Clear All Chats"
        message="Do you want to clear all chats? This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        isLoading={isClearing}
      />
    </div>
  );
}

export default MacroAIWidget;