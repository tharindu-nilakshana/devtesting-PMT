import React, { createContext, useContext } from 'react';
import type { NumberSize } from 're-resizable';

type ResizeHandler = (position: string, size: NumberSize) => void;

interface ResizableGridContextValue {
  onResize?: ResizeHandler | null;
  onResizeStop?: ResizeHandler | null;
}

const ResizableGridContext = createContext<ResizableGridContextValue | null>(null);

export function useResizableGridContext() {
  return useContext(ResizableGridContext);
}

interface ResizableGridProviderProps {
  onResize?: ResizeHandler | null;
  onResizeStop?: ResizeHandler | null;
  children: React.ReactNode;
}

export function ResizableGridProvider({ onResize, onResizeStop, children }: ResizableGridProviderProps) {
  return (
    <ResizableGridContext.Provider value={{ onResize, onResizeStop }}>
      {children}
    </ResizableGridContext.Provider>
  );
}


