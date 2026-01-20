"use client";

import { AlertTriangle, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  sharpCorners?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  sharpCorners = false
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const roundedClass = sharpCorners ? 'rounded-none' : 'rounded-lg';
  const buttonRoundedClass = sharpCorners ? 'rounded-none' : 'rounded-md';

  const dialogContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className={`bg-background border-2 border-border ${roundedClass} shadow-2xl max-w-lg w-full mx-4`}>
        <div className="flex items-center justify-between p-5 border-b-2 border-border">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-orange-500" strokeWidth={2.5} />
            <h3 className="text-xl font-bold text-foreground">{title}</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 rounded-none p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{message}</p>
          
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={`px-6 py-3 text-base font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 ${buttonRoundedClass}`}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-6 py-3 text-base font-bold bg-red-500 text-white ${buttonRoundedClass} hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin" />
                  Deleting...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
