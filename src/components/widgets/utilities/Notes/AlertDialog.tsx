'use client';

import { AlertCircle, CheckCircle2, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'success' | 'info';
}

export function AlertDialog({ isOpen, onClose, title, message, type = 'info' }: AlertDialogProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-6 w-6 text-destructive" strokeWidth={2.5} />;
      case 'success':
        return <CheckCircle2 className="h-6 w-6 text-green-500" strokeWidth={2.5} />;
      case 'info':
      default:
        return <Info className="h-6 w-6 text-primary" strokeWidth={2.5} />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'error':
        return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
      case 'success':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'info':
      default:
        return 'bg-primary text-primary-foreground hover:bg-primary/90';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onClose}>
      <div 
        className="bg-background border-2 border-border rounded-none shadow-2xl max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b-2 border-border">
          <div className="flex items-center gap-3">
            {getIcon()}
            <h3 className="text-xl font-bold text-foreground">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-none p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{message}</p>
          
          <div className="flex justify-end">
            <Button
              onClick={onClose}
              className={`px-6 py-3 text-base font-semibold rounded-none ${getButtonColor()}`}
            >
              OK
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

