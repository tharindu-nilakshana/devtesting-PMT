"use client";

import { X, User, Send, Image, FileText, Camera, Download } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: Date;
  attachment?: {
    name: string;
    size: string;
    type: 'pdf' | 'image';
  };
}

interface SupportChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportChat({ isOpen, onClose }: SupportChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1',
    text: 'Hi! I\'m Mike from Premium Market Terminal support. How can I help you today?',
    sender: 'support',
    timestamp: new Date()
  }]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Notify other panels when opening
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('panel-opening', { detail: { panel: 'chat' } }));
    }
  }, [isOpen]);

  // Listen for other panels opening
  useEffect(() => {
    const handlePanelOpening = (event: Event) => {
      const customEvent = event as CustomEvent<{ panel: string }>;
      if (customEvent.detail.panel !== 'chat' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('panel-opening', handlePanelOpening);
    return () => window.removeEventListener('panel-opening', handlePanelOpening);
  }, [isOpen, onClose]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages([...messages, newMessage]);
    setInputValue('');

    // Simulate support response after a delay
    setTimeout(() => {
      const supportResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Thanks for reaching out! I'm looking into that for you now. Give me just a moment.",
        sender: 'support',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, supportResponse]);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && inputValue.trim()) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachment = (type: 'image' | 'file') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : '.pdf,.doc,.docx,.png,.jpg,.jpeg';
    input.click();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 top-[42px] bg-black/30 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Chat Panel - Slides in from right */}
      <div
        className={`fixed top-[42px] right-0 bottom-0 w-[460px] bg-widget-body border-l border-border z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Chat Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-widget-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-widget-header border border-border overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Mike - Support Team</h3>
              <p className="text-xs text-muted-foreground">Usually responds in minutes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-widget-header text-foreground border border-border'
                }`}
              >
                {message.attachment && (
                  <div className="mb-2 p-3 bg-widget-body border border-border rounded-lg flex items-center gap-3">
                    {message.attachment.type === 'pdf' ? (
                      <FileText className="w-8 h-8 text-primary" />
                    ) : (
                      <Camera className="w-8 h-8 text-primary" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{message.attachment.name}</p>
                      <p className="text-xs text-muted-foreground">{message.attachment.size}</p>
                    </div>
                    <button className="text-primary hover:text-primary/80">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.sender === 'user'
                      ? 'text-white/70'
                      : 'text-muted-foreground'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-border bg-widget-header">
          <div className="flex items-center gap-2">
            <button
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              title="Attach image"
              onClick={() => handleAttachment('image')}
            >
              <Image className="w-4 h-4" aria-label="Attach image" />
            </button>
            <button
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              title="Attach file"
              onClick={() => handleAttachment('file')}
            >
              <FileText className="w-4 h-4" />
            </button>
            <Input
              type="text"
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 bg-widget-body border-border text-foreground"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="bg-primary hover:bg-primary/90 text-white flex-shrink-0 w-8 h-8 px-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
