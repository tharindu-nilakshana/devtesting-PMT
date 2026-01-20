'use client';

import { useEffect, useState } from 'react';
import { Toaster as Sonner } from 'sonner';

export function Toaster() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const el = document.documentElement;

    const apply = () => {
      setTheme(el.classList.contains('dark') ? 'dark' : 'light');
    };

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(el, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => observer.disconnect();
  }, []);

  const toastClassNames =
    theme === 'dark'
      ? {
          toast:
            'bg-gradient-to-br from-[#0a0a0a]/95 via-[#0f0f0f]/95 to-[#141414]/95 text-foreground border border-primary/30 shadow-lg backdrop-blur-sm',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
          cancelButton: 'bg-muted text-muted-foreground hover:bg-muted/90',
          closeButton: 'text-muted-foreground hover:text-foreground',
        }
      : {
          toast: 'bg-card text-foreground border border-border shadow-lg',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
          cancelButton: 'bg-muted text-muted-foreground hover:bg-muted/90',
          closeButton: 'text-muted-foreground hover:text-foreground',
        };

  return (
    <Sonner
      position="top-right"
      theme={theme}
      closeButton
      toastOptions={{
        classNames: {
          ...toastClassNames,
        },
      }}
    />
  );
}
