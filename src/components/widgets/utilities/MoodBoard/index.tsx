'use client';

import { useEffect, useRef, useState, useCallback } from "react";
import type { ChangeEvent, DragEvent, MouseEvent } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Rnd } from "react-rnd";
import { AlignCenter, AlignLeft, AlignRight, Bold, FileDown, Highlighter, Image as ImageIcon, Italic, Palette, Pen, Plus, Redo, Square, Trash2, Type, Underline, Undo, Upload, X, Circle, Triangle, Minus, ArrowRight, ArrowLeft, ArrowUp, ArrowDown } from "lucide-react";
import { 
  getMoodboardTitles, 
  loadMoodboard, 
  createMoodboard, 
  updateMoodboard, 
  deleteMoodboard as deleteMoodboardApi 
} from "./moodboardApi";

interface MoodBoardElement {
  id: string;
  type: "image" | "text" | "drawing" | "highlight" | "shape";
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: string;
  borderColor?: string;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  textColor?: string;
  fontSize?: number;
  textAlign?: "left" | "center" | "right";
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  shapeType?: "rectangle" | "triangle" | "square" | "circle" | "line" | "arrow" | "rectangle-outline" | "triangle-outline" | "square-outline" | "circle-outline" | "arrow-back" | "arrow-back-outline" | "arrow-up" | "arrow-down";
  fillColor?: string;
}

export interface MoodBoardBoard {
  id: string; // Local ID for React keys
  moodboardID?: number; // API MoodboardID
  name: string;
  elements: MoodBoardElement[];
}

export type MoodBoardSnapshot = {
  boards: MoodBoardBoard[];
  selectedBoardId: string;
};

export interface MoodBoardController {
  getSnapshot: () => MoodBoardSnapshot;
  subscribe: (listener: (snapshot: MoodBoardSnapshot) => void) => () => void;
  selectBoard: (boardId: string) => void;
  createBoard: (name: string) => void;
  deleteBoard: (boardId: string) => void;
}

const moodboardControllers = new Map<string, MoodBoardController>();

export function getMoodBoardController(instanceId: string) {
  return moodboardControllers.get(instanceId);
}

// Template ID for creating new moodboards (optional - can be undefined to let API use default)
// If template creation fails, we'll create a local-only board
const MOODBOARD_TEMPLATE_ID: number | undefined = undefined;

const COLOR_PRESETS = [
  { name: "Orange", bg: "rgba(249, 115, 22, 0.1)", border: "rgb(249, 115, 22)" },
  { name: "Red", bg: "rgba(239, 68, 68, 0.1)", border: "rgb(239, 68, 68)" },
  { name: "Yellow", bg: "rgba(234, 179, 8, 0.1)", border: "rgb(234, 179, 8)" },
  { name: "Green", bg: "rgba(34, 197, 94, 0.1)", border: "rgb(34, 197, 94)" },
  { name: "Blue", bg: "rgba(59, 130, 246, 0.1)", border: "rgb(59, 130, 246)" },
  { name: "Purple", bg: "rgba(168, 85, 247, 0.1)", border: "rgb(168, 85, 247)" },
  { name: "Pink", bg: "rgba(236, 72, 153, 0.1)", border: "rgb(236, 72, 153)" },
  { name: "Gray", bg: "rgba(156, 163, 175, 0.1)", border: "rgb(156, 163, 175)" },
];

const DRAW_COLORS = [
  "rgb(249, 115, 22)", // Orange
  "rgb(239, 68, 68)", // Red
  "rgb(234, 179, 8)", // Yellow
  "rgb(34, 197, 94)", // Green
  "rgb(59, 130, 246)", // Blue
  "rgb(168, 85, 247)", // Purple
  "rgb(236, 72, 153)", // Pink
  "rgb(255, 255, 255)", // White
];

const TEXT_COLORS = [
  "rgb(249, 115, 22)", // Orange
  "rgb(239, 68, 68)", // Red
  "rgb(234, 179, 8)", // Yellow
  "rgb(34, 197, 94)", // Green
  "rgb(59, 130, 246)", // Blue
  "rgb(168, 85, 247)", // Purple
  "rgb(236, 72, 153)", // Pink
  "rgb(255, 255, 255)", // White
];

const HIGHLIGHTER_COLORS = [
  "rgba(249, 115, 22, 0.4)", // Orange
  "rgba(239, 68, 68, 0.4)", // Red
  "rgba(234, 179, 8, 0.4)", // Yellow
  "rgba(34, 197, 94, 0.4)", // Green
  "rgba(59, 130, 246, 0.4)", // Blue
  "rgba(168, 85, 247, 0.4)", // Purple
  "rgba(236, 72, 153, 0.4)", // Pink
  "rgba(255, 255, 255, 0.3)", // White
];

interface MoodBoardProps {
  wgid?: string;
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, unknown>;
}

export default function MoodBoard({ wgid, onSettings, onRemove, onFullscreen, settings }: MoodBoardProps) {
  const [boards, setBoards] = useState<MoodBoardBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const instanceId = wgid ?? "moodboard-default";

  // Get template ID from wgid, settings, or localStorage (similar to Ticklist)
  const getTemplateId = useCallback((): number | null => {
    const parseNumeric = (value: unknown): number | null => {
      if (value === undefined || value === null) return null;
      const parsed = typeof value === "number" ? value : parseInt(String(value), 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };

    if (wgid) {
      const templatePart = wgid.split("-")[0];
      const parsedFromWgid = parseNumeric(templatePart);
      if (parsedFromWgid) {
        return parsedFromWgid;
      }
    }

    const parsedFromSettings =
      parseNumeric(settings?.templateId) ??
      parseNumeric(settings?.dashboardTemplateId) ??
      parseNumeric(settings?.templateID) ??
      parseNumeric(settings?.dashboardTemplateID);
    if (parsedFromSettings) {
      return parsedFromSettings;
    }

    if (typeof window !== "undefined") {
      try {
        const storedActiveTemplateId = window.localStorage.getItem("pmt_active_template_id");
        const parsedFromStorage = parseNumeric(storedActiveTemplateId ?? undefined);
        if (parsedFromStorage) {
          return parsedFromStorage;
        }
      } catch (storageError) {
        console.warn("MoodBoard: Unable to read active template ID from localStorage", storageError);
      }
    }

    return null;
  }, [wgid, settings]);

  const selectedBoard = boards.find((board) => board.id === selectedBoardId) ?? boards[0];
  const [elements, setElements] = useState<MoodBoardElement[]>(selectedBoard?.elements ?? []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isDrawMenuOpen, setIsDrawMenuOpen] = useState(false);
  const [isTextMenuOpen, setIsTextMenuOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [penSize, setPenSize] = useState(3);
  const [currentPath, setCurrentPath] = useState("");
  const [drawingActive, setDrawingActive] = useState(false);
  const [textColor, setTextColor] = useState(TEXT_COLORS[7]); // Default white
  const [fontSize, setFontSize] = useState(14);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">("normal");
  const [fontStyle, setFontStyle] = useState<"normal" | "italic">("normal");
  const [textDecoration, setTextDecoration] = useState<"none" | "underline">("none");

  const [isHighlighterMenuOpen, setIsHighlighterMenuOpen] = useState(false);
  const [highlighterActive, setHighlighterActive] = useState(false);
  const [highlighterColor, setHighlighterColor] = useState(HIGHLIGHTER_COLORS[2]); // Default yellow
  const [highlighterSize, setHighlighterSize] = useState(12);
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const subscribersRef = useRef<Set<(snapshot: MoodBoardSnapshot) => void>>(new Set());
  const latestSnapshotRef = useRef<MoodBoardSnapshot>({ boards, selectedBoardId });
  const handlersRef = useRef<{
    selectBoard: (boardId: string) => void;
    createBoard: (name: string) => void;
    deleteBoard: (boardId: string) => void;
  }>({
    selectBoard: () => {},
    createBoard: () => {},
    deleteBoard: () => {},
  });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  const isUpdatingFromSwitchRef = useRef(false);
  
  // Undo/Redo history
  const [undoStack, setUndoStack] = useState<MoodBoardElement[][]>([]);
  const [redoStack, setRedoStack] = useState<MoodBoardElement[][]>([]);
  const isUndoRedoRef = useRef(false);

  const notifySubscribers = useCallback((snapshot: MoodBoardSnapshot) => {
    subscribersRef.current.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("MoodBoard subscriber error", error);
      }
    });
  }, []);

  // Save current state to undo stack
  const saveToHistory = useCallback((currentElements: MoodBoardElement[]) => {
    if (isUndoRedoRef.current || isInitialLoadRef.current || isUpdatingFromSwitchRef.current) {
      return; // Don't save history during undo/redo operations, initial load, or board switches
    }
    // Deep clone the elements array
    const cloned = JSON.parse(JSON.stringify(currentElements));
    setUndoStack((prev) => {
      const newStack = [...prev, cloned];
      // Limit undo stack to 50 items to prevent memory issues
      return newStack.slice(-50);
    });
    // Clear redo stack when a new action is performed
    setRedoStack([]);
  }, []);

  // Undo function
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) {
      return;
    }
    
    isUndoRedoRef.current = true;
    
    // Save current state to redo stack
    const currentElements = JSON.parse(JSON.stringify(elements));
    setRedoStack((prev) => [...prev, currentElements]);
    
    // Restore previous state from undo stack
    const previousState = undoStack[undoStack.length - 1];
    setElements(previousState);
    setUndoStack((prev) => prev.slice(0, -1));
    
    // Clear selection when undoing
    setSelectedId(null);
    
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, [undoStack, elements]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) {
      return;
    }
    
    isUndoRedoRef.current = true;
    
    // Save current state to undo stack
    const currentElements = JSON.parse(JSON.stringify(elements));
    setUndoStack((prev) => [...prev, currentElements]);
    
    // Restore next state from redo stack
    const nextState = redoStack[redoStack.length - 1];
    setElements(nextState);
    setRedoStack((prev) => prev.slice(0, -1));
    
    // Clear selection when redoing
    setSelectedId(null);
    
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, [redoStack, elements]);

  // Save board to API
  const saveBoardToAPI = useCallback(async (board: MoodBoardBoard) => {
    if (!board.moodboardID) {
      return; // Skip if board doesn't have an API ID
    }

    try {
      setIsSaving(true);
      await updateMoodboard({
        MoodboardID: board.moodboardID,
        MoodboardName: board.name,
        CanvasData: {
          elements: board.elements,
        },
        BrushSettings: {
          drawColor,
          penSize,
          textColor,
          fontSize,
          highlighterColor,
          highlighterSize,
        },
      });
      console.log(`Saved moodboard ${board.moodboardID} to API`);
    } catch (error) {
      console.error('Error saving board to API:', error);
    } finally {
      setIsSaving(false);
    }
  }, [drawColor, penSize, textColor, fontSize, highlighterColor, highlighterSize]);

  const persistCurrentBoard = useCallback(
    (boardsToUpdate: MoodBoardBoard[]) =>
      boardsToUpdate.map((board) =>
        board.id === selectedBoardId
          ? {
              ...board,
              elements,
            }
          : board
      ),
    [elements, selectedBoardId]
  );

  const handleBoardChange = useCallback(
    async (boardId: string) => {
      // Save current board before switching
      const currentBoard = boards.find((b) => b.id === selectedBoardId);
      if (currentBoard && currentBoard.moodboardID) {
        await saveBoardToAPI(currentBoard);
      }

      setBoards((prevBoards) => persistCurrentBoard(prevBoards));

      const snapshot = latestSnapshotRef.current;
      const newBoard =
        snapshot.boards.find((board) => board.id === boardId) ?? snapshot.boards[0];
      if (newBoard) {
        isUpdatingFromSwitchRef.current = true;
        setSelectedBoardId(newBoard.id);
        
        // Clear undo/redo history when switching boards
        setUndoStack([]);
        setRedoStack([]);
        
        // Load board data from API if it has a moodboardID
        if (newBoard.moodboardID) {
          try {
            setIsLoading(true);
            const boardData = await loadMoodboard(newBoard.moodboardID);
            if (boardData && boardData.CanvasData && Array.isArray(boardData.CanvasData.elements)) {
              setElements(boardData.CanvasData.elements);
            } else {
              setElements([]);
            }
          } catch (error) {
            console.error('Error loading board data:', error);
            setElements(newBoard.elements);
          } finally {
            setIsLoading(false);
          }
        } else {
          setElements(newBoard.elements);
        }
      }
    },
    [boards, selectedBoardId, persistCurrentBoard, saveBoardToAPI]
  );

  const handleCreateBoard = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }

      try {
        setIsLoading(true);
        // Get template ID from wgid, settings, or localStorage
        const templateId = getTemplateId() ?? MOODBOARD_TEMPLATE_ID;
        
        // Try to create moodboard via API if we have a template ID
        if (templateId && templateId > 0) {
          try {
            const response = await createMoodboard({
              TemplateId: templateId,
              MoodboardName: trimmed,
            });

            const moodboardID = response.MoodboardID || response.ID;
            if (moodboardID) {
              // Successfully created via API
              const newBoardId = `mb-${moodboardID}`;
              const newBoard: MoodBoardBoard = {
                id: newBoardId,
                moodboardID: moodboardID,
                name: trimmed,
                elements: [],
              };

              setBoards((prevBoards) => {
                const persisted = persistCurrentBoard(prevBoards);
                return [...persisted, newBoard];
              });

              setSelectedBoardId(newBoardId);
              setElements([]);
              return; // Success, exit early
            }
          } catch (apiError: any) {
            // Silently handle API errors - log but don't throw
            console.log('API creation failed, creating local-only moodboard:', apiError?.message || 'Unknown error');
          }
        }
        
        // Fallback: Create local-only board (no API call or API failed)
        const newBoardId = Date.now().toString();
        setBoards((prevBoards) => {
          const persisted = persistCurrentBoard(prevBoards);
          return [
            ...persisted,
            {
              id: newBoardId,
              name: trimmed,
              elements: [],
            },
          ];
        });
        setSelectedBoardId(newBoardId);
        setElements([]);
      } catch (error: any) {
        // Final fallback - should rarely reach here
        console.log('Error in handleCreateBoard, creating local-only moodboard:', error?.message || 'Unknown error');
        const newBoardId = Date.now().toString();
        setBoards((prevBoards) => {
          const persisted = persistCurrentBoard(prevBoards);
          return [
            ...persisted,
            {
              id: newBoardId,
              name: trimmed,
              elements: [],
            },
          ];
        });
        setSelectedBoardId(newBoardId);
        setElements([]);
      } finally {
        setIsLoading(false);
      }
    },
    [persistCurrentBoard, getTemplateId]
  );

  const handleDeleteBoard = useCallback(
    async (boardId: string) => {
      const boardToDelete = boards.find((b) => b.id === boardId);
      
      // Delete from API if it has a moodboardID
      if (boardToDelete?.moodboardID) {
        try {
          await deleteMoodboardApi(boardToDelete.moodboardID);
        } catch (error) {
          console.error('Error deleting moodboard from API:', error);
          // Continue with local deletion even if API fails
        }
      }

      setBoards((prevBoards) => {
        if (prevBoards.length <= 1) {
          return prevBoards;
        }

        const persisted = persistCurrentBoard(prevBoards);
        const filtered = persisted.filter((board) => board.id !== boardId);
        return filtered.length > 0 ? filtered : persisted;
      });

      const snapshot = latestSnapshotRef.current;
      if (snapshot.selectedBoardId === boardId) {
        const remainingBoards = snapshot.boards.filter((board) => board.id !== boardId);
        if (remainingBoards.length > 0) {
          const nextBoard = remainingBoards[0];
          setSelectedBoardId(nextBoard.id);
          // Load board data if it has a moodboardID
          if (nextBoard.moodboardID) {
            try {
              const boardData = await loadMoodboard(nextBoard.moodboardID);
              if (boardData && boardData.CanvasData && Array.isArray(boardData.CanvasData.elements)) {
                setElements(boardData.CanvasData.elements);
              } else {
                setElements([]);
              }
            } catch (error) {
              console.error('Error loading board after delete:', error);
              setElements(nextBoard.elements);
            }
          } else {
            setElements(nextBoard.elements);
          }
        }
      }
    },
    [boards, persistCurrentBoard]
  );

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const selectedElement = elements.find((element) => element.id === selectedId);
    if (selectedElement && selectedElement.type === "text") {
      setTextColor(selectedElement.textColor || TEXT_COLORS[7]);
      setFontSize(selectedElement.fontSize || 14);
      setTextAlign(selectedElement.textAlign || "left");
      setFontWeight(selectedElement.fontWeight || "normal");
      setFontStyle(selectedElement.fontStyle || "normal");
      setTextDecoration(selectedElement.textDecoration || "none");
    }
  }, [selectedId, elements]);

  // Load boards from API on mount
  useEffect(() => {
    const loadBoards = async () => {
      try {
        setIsLoading(true);
        const titles = await getMoodboardTitles();
        
        if (titles.length === 0) {
          // No boards exist, start with empty state
          setBoards([]);
          setSelectedBoardId("");
          setElements([]);
          return;
        }

        // Convert API titles to MoodBoardBoard format
        const loadedBoards: MoodBoardBoard[] = await Promise.all(
          titles.map(async (title) => {
            const boardId = `mb-${title.MoodboardID}`;
            let boardElements: MoodBoardElement[] = [];

            // Load board data
            try {
              const boardData = await loadMoodboard(title.MoodboardID);
              if (boardData && boardData.CanvasData && Array.isArray(boardData.CanvasData.elements)) {
                boardElements = boardData.CanvasData.elements;
              }
            } catch (error) {
              console.error(`Error loading board ${title.MoodboardID}:`, error);
            }

            return {
              id: boardId,
              moodboardID: title.MoodboardID,
              name: title.Title || `Moodboard ${title.MoodboardID}`,
              elements: boardElements,
            };
          })
        );

        setBoards(loadedBoards);
        if (loadedBoards.length > 0) {
          setSelectedBoardId(loadedBoards[0].id);
          setElements(loadedBoards[0].elements);
        }
        isInitialLoadRef.current = false;
      } catch (error) {
        console.error('Error loading boards:', error);
        setBoards([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadBoards();
  }, []);

  useEffect(() => {
    const snapshot = {
      boards,
      selectedBoardId,
    };
    latestSnapshotRef.current = snapshot;
    notifySubscribers(snapshot);
  }, [boards, notifySubscribers, selectedBoardId]);

  // Update boards state when elements change (to keep state in sync)
  useEffect(() => {
    if (isInitialLoadRef.current || !selectedBoardId || isUpdatingFromSwitchRef.current) {
      isUpdatingFromSwitchRef.current = false;
      return;
    }

    setBoards((prevBoards) =>
      prevBoards.map((board) =>
        board.id === selectedBoardId
          ? { ...board, elements }
          : board
      )
    );
  }, [elements, selectedBoardId]);

  // Auto-save with debouncing when elements change
  useEffect(() => {
    if (isInitialLoadRef.current || !selectedBoard || !selectedBoard.moodboardID) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save to API (wait 2 seconds after last change)
    saveTimeoutRef.current = setTimeout(() => {
      const boardToSave: MoodBoardBoard = {
        ...selectedBoard,
        elements,
      };
      saveBoardToAPI(boardToSave);
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [elements, selectedBoardId, selectedBoard, saveBoardToAPI]);

  useEffect(() => {
    handlersRef.current = {
      selectBoard: handleBoardChange,
      createBoard: handleCreateBoard,
      deleteBoard: handleDeleteBoard,
    };
  }, [handleBoardChange, handleCreateBoard, handleDeleteBoard]);

  useEffect(() => {
    const controller: MoodBoardController = {
      getSnapshot: () => latestSnapshotRef.current,
      subscribe: (listener) => {
        subscribersRef.current.add(listener);
        listener(latestSnapshotRef.current);
        return () => {
          subscribersRef.current.delete(listener);
        };
      },
      selectBoard: (boardId: string) => handlersRef.current.selectBoard(boardId),
      createBoard: (name: string) => handlersRef.current.createBoard(name),
      deleteBoard: (boardId: string) => handlersRef.current.deleteBoard(boardId),
    };

    moodboardControllers.set(instanceId, controller);

    return () => {
      moodboardControllers.delete(instanceId);
      subscribersRef.current.clear();
    };
  }, [instanceId]);

  const addTextBox = () => {
    // Ensure drawing/highlighter modes are disabled so clicks work
    setDrawingActive(false);
    setHighlighterActive(false);
    
    // Save to history before adding
    saveToHistory(elements);
    
    const newElement: MoodBoardElement = {
      id: `text-${Date.now()}`,
      type: "text",
      content: "",
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      backgroundColor: selectedColor.bg,
      borderColor: selectedColor.border,
      textColor,
      fontSize,
      textAlign,
      fontWeight,
      fontStyle,
      textDecoration,
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedId(newElement.id);
  };

  const applyTextFormatToSelected = () => {
    if (!selectedId) {
      return;
    }

    // Save to history before applying format
    saveToHistory(elements);

    setElements((prevElements) =>
      prevElements.map((element) =>
        element.id === selectedId && element.type === "text"
          ? {
              ...element,
              textColor,
              fontSize,
              textAlign,
              fontWeight,
              fontStyle,
              textDecoration,
            }
          : element
      )
    );
  };

  const applyColorToSelected = (color: (typeof COLOR_PRESETS)[number]) => {
    if (selectedId) {
      // Save to history before applying color
      saveToHistory(elements);
      
      setElements((prevElements) =>
        prevElements.map((element) =>
          element.id === selectedId && element.type === "text"
            ? { ...element, backgroundColor: color.bg, borderColor: color.border }
            : element
        )
      );
    }
    setSelectedColor(color);
    setIsColorPickerOpen(false);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Ensure drawing/highlighter modes are disabled so clicks work
    setDrawingActive(false);
    setHighlighterActive(false);

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      // Save to history before adding image
      saveToHistory(elements);
      
      const newElement: MoodBoardElement = {
        id: `image-${Date.now()}`,
        type: "image",
        content: loadEvent.target?.result as string,
        x: 150,
        y: 150,
        width: 250,
        height: 200,
      };
      setElements((prev) => [...prev, newElement]);
      setSelectedId(newElement.id);
    };
    reader.readAsDataURL(file);
  };

  const dragStartRef = useRef<MoodBoardElement[] | null>(null);
  
  const handleDragStart = () => {
    // Store initial state when drag starts (only once per drag)
    if (!dragStartRef.current) {
      dragStartRef.current = JSON.parse(JSON.stringify(elements));
    }
  };

  const handleDragStop = (id: string, position: { x: number; y: number }) => {
    // Save initial state to history before updating position
    if (dragStartRef.current) {
      saveToHistory(dragStartRef.current);
    }
    
    setElements((prevElements) => {
      const updated = prevElements.map((element) =>
        element.id === id
          ? {
              ...element,
              x: position.x,
              y: position.y,
            }
          : element
      );
      return updated;
    });
    
    // Reset drag start ref after drag completes
    dragStartRef.current = null;
  };

  const resizeStartRef = useRef<MoodBoardElement[] | null>(null);
  
  const handleResizeStart = () => {
    // Store initial state when resize starts (only once per resize)
    if (!resizeStartRef.current) {
      resizeStartRef.current = JSON.parse(JSON.stringify(elements));
    }
  };

  const handleResizeStop = (id: string, ref: HTMLElement, position: { x: number; y: number }) => {
    // Save initial state to history before updating size/position
    if (resizeStartRef.current) {
      saveToHistory(resizeStartRef.current);
    }
    
    setElements((prevElements) =>
      prevElements.map((element) =>
        element.id === id
          ? {
              ...element,
              x: position.x,
              y: position.y,
              width: parseInt(ref.style.width, 10),
              height: parseInt(ref.style.height, 10),
            }
          : element
      )
    );
    // Reset resize start ref after resize completes
    resizeStartRef.current = null;
  };

  const textChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textChangeHistorySavedRef = useRef(false);
  
  const handleTextChange = (id: string, newText: string) => {
    // Save to history only once when text editing starts
    if (!textChangeHistorySavedRef.current) {
      saveToHistory(elements);
      textChangeHistorySavedRef.current = true;
    }
    
    setElements((prevElements) =>
      prevElements.map((element) =>
        element.id === id
          ? {
              ...element,
              content: newText,
            }
          : element
      )
    );
    
    // Reset the flag after a delay (when user stops typing)
    if (textChangeTimeoutRef.current) {
      clearTimeout(textChangeTimeoutRef.current);
    }
    textChangeTimeoutRef.current = setTimeout(() => {
      textChangeHistorySavedRef.current = false;
    }, 1000);
  };

  const deleteSelected = () => {
    if (!selectedId) {
      return;
    }

    // Save to history before deleting
    saveToHistory(elements);

    setElements((prevElements) => prevElements.filter((element) => element.id !== selectedId));
    setSelectedId(null);
  };

  const deleteElement = (elementId: string) => {
    // Save to history before deleting
    saveToHistory(elements);
    
    setElements((prevElements) => prevElements.filter((element) => element.id !== elementId));
    if (selectedId === elementId) {
      setSelectedId(null);
    }
  };

  const handleCanvasDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const files = event.dataTransfer.files;
    if (files.length === 0) {
      return;
    }

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Ensure drawing/highlighter modes are disabled so clicks work
    setDrawingActive(false);
    setHighlighterActive(false);

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      // Save to history before adding image
      saveToHistory(elements);
      
      const rect = canvasRef.current?.getBoundingClientRect();
      const x = rect ? event.clientX - rect.left - 125 : 150;
      const y = rect ? event.clientY - rect.top - 100 : 150;

      const newElement: MoodBoardElement = {
        id: `image-${Date.now()}`,
        type: "image",
        content: loadEvent.target?.result as string,
        x,
        y,
        width: 250,
        height: 200,
      };
      setElements((prev) => [...prev, newElement]);
      setSelectedId(newElement.id);
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleCanvasDragLeave = () => {
    setIsDragging(false);
  };

  const toggleDrawingMode = () => {
    setDrawingActive((prev) => !prev);
    setHighlighterActive(false);
    setSelectedId(null);
  };

  const toggleHighlighterMode = () => {
    setHighlighterActive((prev) => !prev);
    setDrawingActive(false);
    setSelectedId(null);
  };

  const startDrawing = (event: MouseEvent<HTMLDivElement>) => {
    if (!drawingActive && !highlighterActive) {
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    // Save to history when starting to draw
    saveToHistory(elements);

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setIsDrawing(true);
    setCurrentPath(`M ${x} ${y}`);
  };

  const draw = (event: MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || (!drawingActive && !highlighterActive)) {
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setCurrentPath((prev) => `${prev} L ${x} ${y}`);
  };

  // Helper function to calculate bounding box and normalize path
  const calculatePathBounds = (path: string, strokeWidth: number) => {
    const pathCoords = path.match(/[ML]\s+([\d.]+)\s+([\d.]+)/g);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    if (pathCoords && pathCoords.length > 0) {
      pathCoords.forEach(coord => {
        const match = coord.match(/[ML]\s+([\d.]+)\s+([\d.]+)/);
        if (match) {
          const x = parseFloat(match[1]);
          const y = parseFloat(match[2]);
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      });
    }
    
    // Normalize path to start at (0,0) by subtracting minX and minY
    let normalizedPath = path;
    if (minX !== Infinity && minY !== Infinity) {
      normalizedPath = path.replace(/([ML])\s+([\d.]+)\s+([\d.]+)/g, (match, cmd, x, y) => {
        const newX = parseFloat(x) - minX;
        const newY = parseFloat(y) - minY;
        return `${cmd} ${newX} ${newY}`;
      });
    }
    
    const width = maxX !== -Infinity && minX !== Infinity ? maxX - minX + (strokeWidth * 2) : 200;
    const height = maxY !== -Infinity && minY !== Infinity ? maxY - minY + (strokeWidth * 2) : 100;
    
    return {
      normalizedPath,
      x: minX !== Infinity ? Math.max(0, minX - strokeWidth) : 0,
      y: minY !== Infinity ? Math.max(0, minY - strokeWidth) : 0,
      width: Math.max(50, width),
      height: Math.max(50, height),
    };
  };

  const stopDrawing = () => {
    if (!isDrawing || !currentPath) {
      return;
    }

    if (highlighterActive) {
      // Calculate bounding box and normalize path for highlights
      const bounds = calculatePathBounds(currentPath, highlighterSize);
      
      const newElement: MoodBoardElement = {
        id: `highlight-${Date.now()}`,
        type: "highlight",
        content: bounds.normalizedPath, // Store normalized path
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        color: highlighterColor,
        strokeWidth: highlighterSize,
        opacity: 0.4,
      };
      setElements((prev) => [...prev, newElement]);
      // Disable highlighter mode after creating highlight so clicks work
      setHighlighterActive(false);
    } else {
      // Calculate bounding box and normalize path for drawings
      const bounds = calculatePathBounds(currentPath, penSize);
      
      const newElement: MoodBoardElement = {
        id: `drawing-${Date.now()}`,
        type: "drawing",
        content: bounds.normalizedPath, // Store normalized path
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        color: drawColor,
        strokeWidth: penSize,
      };
      setElements((prev) => [...prev, newElement]);
      // Disable drawing mode after creating drawing so clicks work
      setDrawingActive(false);
    }

    setIsDrawing(false);
    setCurrentPath("");
  };

  const addShape = (shapeType: "rectangle" | "triangle" | "square" | "circle" | "line" | "arrow" | "rectangle-outline" | "triangle-outline" | "square-outline" | "circle-outline" | "arrow-back" | "arrow-back-outline" | "arrow-up" | "arrow-down") => {
    // Ensure drawing/highlighter modes are disabled so clicks work
    setDrawingActive(false);
    setHighlighterActive(false);
    
    // Save to history before adding
    saveToHistory(elements);
    
    const isHorizontalArrow = shapeType === "line" || shapeType === "arrow" || shapeType === "arrow-back" || shapeType === "arrow-back-outline";
    const isVerticalArrow = shapeType === "arrow-up" || shapeType === "arrow-down";
    const isLineOrArrow = isHorizontalArrow || isVerticalArrow;
    
    // For horizontal arrows: width=150, height=24 (to accommodate 10px arrowhead on each side)
    // For vertical arrows: width=24, height=150 (to accommodate 10px arrowhead on each side)
    // For line: width=150, height=2 (line stays thin)
    const defaultSize = isHorizontalArrow ? 150 : (isVerticalArrow ? 24 : 100);
    const defaultHeight = isHorizontalArrow ? (shapeType === "line" ? 2 : 24) : (isVerticalArrow ? 150 : 100);
    const isOutline = shapeType.includes("-outline") || shapeType === "line" || shapeType === "arrow" || shapeType === "arrow-back" || shapeType === "arrow-back-outline" || shapeType === "arrow-up" || shapeType === "arrow-down";
    
    const newElement: MoodBoardElement = {
      id: `shape-${Date.now()}`,
      type: "shape",
      content: "",
      x: 150,
      y: 150,
      width: defaultSize,
      height: defaultHeight,
      shapeType,
      color: drawColor,
      strokeWidth: 2,
      fillColor: isOutline ? "none" : drawColor,
      opacity: isOutline ? 1 : 0.3,
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedId(newElement.id);
    setIsShapeMenuOpen(false);
  };

  const renderShape = (element: MoodBoardElement) => {
    if (element.type !== "shape" || !element.shapeType) return null;
    
    const { shapeType, width, height, color, strokeWidth, fillColor, opacity } = element;
    const stroke = color || drawColor;
    const strokeW = strokeWidth || 2;
    const opac = opacity ?? 1;
    
    // Determine if this is an outline version
    const isOutline = shapeType.includes("-outline") || shapeType === "line" || shapeType === "arrow" || shapeType === "arrow-back" || shapeType === "arrow-back-outline" || shapeType === "arrow-up" || shapeType === "arrow-down";
    const fill = isOutline ? "none" : (fillColor || stroke);
    
    switch (shapeType) {
      case "rectangle":
      case "rectangle-outline":
        return (
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            stroke={stroke}
            fill={fill}
            strokeWidth={strokeW}
            opacity={opac}
          />
        );
      case "square":
      case "square-outline":
        const size = Math.min(width, height);
        return (
          <rect
            x={(width - size) / 2}
            y={(height - size) / 2}
            width={size}
            height={size}
            stroke={stroke}
            fill={fill}
            strokeWidth={strokeW}
            opacity={opac}
          />
        );
      case "circle":
      case "circle-outline":
        const radius = Math.min(width, height) / 2;
        return (
          <circle
            cx={width / 2}
            cy={height / 2}
            r={radius}
            stroke={stroke}
            fill={fill}
            strokeWidth={strokeW}
            opacity={opac}
          />
        );
      case "triangle":
      case "triangle-outline":
        return (
          <polygon
            points={`${width / 2},0 ${width},${height} 0,${height}`}
            stroke={stroke}
            fill={fill}
            strokeWidth={strokeW}
            opacity={opac}
          />
        );
      case "line":
        return (
          <line
            x1={0}
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke={stroke}
            strokeWidth={strokeW}
            opacity={opac}
          />
        );
      case "arrow":
        const arrowHeadSize = 10;
        return (
          <g>
            <line
              x1={0}
              y1={height / 2}
              x2={width - arrowHeadSize}
              y2={height / 2}
              stroke={stroke}
              strokeWidth={strokeW}
              opacity={opac}
            />
            <polygon
              points={`${width - arrowHeadSize},${height / 2 - arrowHeadSize} ${width},${height / 2} ${width - arrowHeadSize},${height / 2 + arrowHeadSize}`}
              fill={stroke}
              opacity={opac}
            />
          </g>
        );
      case "arrow-back":
      case "arrow-back-outline":
        const backArrowHeadSize = 10;
        return (
          <g>
            <line
              x1={backArrowHeadSize}
              y1={height / 2}
              x2={width}
              y2={height / 2}
              stroke={stroke}
              strokeWidth={strokeW}
              opacity={opac}
            />
            <polygon
              points={`${backArrowHeadSize},${height / 2 - backArrowHeadSize} 0,${height / 2} ${backArrowHeadSize},${height / 2 + backArrowHeadSize}`}
              fill={stroke}
              opacity={opac}
            />
          </g>
        );
      case "arrow-up":
        const upArrowHeadSize = 10;
        return (
          <g>
            <line
              x1={width / 2}
              y1={upArrowHeadSize}
              x2={width / 2}
              y2={height}
              stroke={stroke}
              strokeWidth={strokeW}
              opacity={opac}
            />
            <polygon
              points={`${width / 2 - upArrowHeadSize},${upArrowHeadSize} ${width / 2},0 ${width / 2 + upArrowHeadSize},${upArrowHeadSize}`}
              fill={stroke}
              opacity={opac}
            />
          </g>
        );
      case "arrow-down":
        const downArrowHeadSize = 10;
        return (
          <g>
            <line
              x1={width / 2}
              y1={0}
              x2={width / 2}
              y2={height - downArrowHeadSize}
              stroke={stroke}
              strokeWidth={strokeW}
              opacity={opac}
            />
            <polygon
              points={`${width / 2 - downArrowHeadSize},${height - downArrowHeadSize} ${width / 2},${height} ${width / 2 + downArrowHeadSize},${height - downArrowHeadSize}`}
              fill={stroke}
              opacity={opac}
            />
          </g>
        );
      default:
        return null;
    }
  };

  const handleExportToPDF = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <>
      <style>{`
        @media print {
          /* Force color preservation in print */
          * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Preserve black background when printing - only on canvas */
          .moodboard-canvas-print {
            background: #000000 !important;
            background-color: #000000 !important;
          }
          
          /* Hide toolbar when printing */
          .moodboard-toolbar-print {
            display: none !important;
          }
          
          /* Hide header when printing */
          .moodboard-header-print {
            display: none !important;
          }
        }
      `}</style>
      <div className="w-full h-full bg-widget-header border border-border flex flex-col relative moodboard-print-container">
      <div className="moodboard-header-print">
      <WidgetHeader title={`Moodboard | ${selectedBoard?.name ?? "Untitled"}`} onSettings={onSettings} onRemove={onRemove} onFullscreen={onFullscreen}>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
          onClick={handleExportToPDF}
          title="Export to PDF"
          type="button"
        >
          <FileDown className="w-4 h-4" />
        </Button>
      </WidgetHeader>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-12 bg-background border-r border-border flex flex-col items-center py-3 gap-2 moodboard-toolbar-print">
          <Popover open={isTextMenuOpen} onOpenChange={setIsTextMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10 relative"
                title="Text Options"
                type="button"
              >
                <Type className="w-4 h-4" />
                <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-background" style={{ backgroundColor: textColor }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-64 p-3 bg-widget-header border-border">
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Text Color</div>
                  <div className="grid grid-cols-4 gap-2">
                    {TEXT_COLORS.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setTextColor(color);
                          applyTextFormatToSelected();
                        }}
                        className={`w-10 h-10 rounded border-2 transition-all hover:scale-110 ${
                          textColor === color ? "ring-2 ring-primary ring-offset-1 ring-offset-widget-header" : "border-border"
                        }`}
                        style={{ backgroundColor: color }}
                        type="button"
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">Font Size: {fontSize}px</div>
                  <input
                    type="range"
                    min="8"
                    max="48"
                    value={fontSize}
                    onChange={(event) => {
                      setFontSize(Number(event.target.value));
                      applyTextFormatToSelected();
                    }}
                    className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">Text Alignment</div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={textAlign === "left" ? "default" : "outline"}
                      className="flex-1 h-8"
                      onClick={() => {
                        setTextAlign("left");
                        applyTextFormatToSelected();
                      }}
                    >
                      <AlignLeft className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant={textAlign === "center" ? "default" : "outline"}
                      className="flex-1 h-8"
                      onClick={() => {
                        setTextAlign("center");
                        applyTextFormatToSelected();
                      }}
                    >
                      <AlignCenter className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant={textAlign === "right" ? "default" : "outline"}
                      className="flex-1 h-8"
                      onClick={() => {
                        setTextAlign("right");
                        applyTextFormatToSelected();
                      }}
                    >
                      <AlignRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">Text Style</div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={fontWeight === "bold" ? "default" : "outline"}
                      className="flex-1 h-8"
                      onClick={() => {
                        setFontWeight((prev) => (prev === "bold" ? "normal" : "bold"));
                        applyTextFormatToSelected();
                      }}
                    >
                      <Bold className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant={fontStyle === "italic" ? "default" : "outline"}
                      className="flex-1 h-8"
                      onClick={() => {
                        setFontStyle((prev) => (prev === "italic" ? "normal" : "italic"));
                        applyTextFormatToSelected();
                      }}
                    >
                      <Italic className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant={textDecoration === "underline" ? "default" : "outline"}
                      className="flex-1 h-8"
                      onClick={() => {
                        setTextDecoration((prev) => (prev === "underline" ? "none" : "underline"));
                        applyTextFormatToSelected();
                      }}
                    >
                      <Underline className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    addTextBox();
                    setIsTextMenuOpen(false);
                  }}
                >
                  Add Text Box
                </Button>

                {selectedId && elements.find((element) => element.id === selectedId)?.type === "text" ? (
                  <div className="pt-2 border-t border-border text-xs text-muted-foreground">Changes applied to selected text</div>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => fileInputRef.current?.click()}
            title="Add Image"
            type="button"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

          <Popover open={isDrawMenuOpen} onOpenChange={setIsDrawMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={`w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10 relative ${
                  drawingActive ? "bg-primary/20 text-primary" : ""
                }`}
                onClick={toggleDrawingMode}
                title="Draw"
                type="button"
              >
                <Pen className="w-4 h-4" />
                <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-background" style={{ backgroundColor: drawColor }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-56 p-3 bg-widget-header border-border">
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Pen Color</div>
                  <div className="grid grid-cols-4 gap-2">
                    {DRAW_COLORS.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => setDrawColor(color)}
                        className={`w-10 h-10 rounded border-2 transition-all hover:scale-110 ${
                          drawColor === color ? "ring-2 ring-primary ring-offset-1 ring-offset-widget-header" : "border-border"
                        }`}
                        style={{ backgroundColor: color }}
                        type="button"
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">Pen Size: {penSize}px</div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={penSize}
                    onChange={(event) => setPenSize(Number(event.target.value))}
                    className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                  {drawingActive ? "Drawing mode active" : "Click to enable drawing"}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover open={isHighlighterMenuOpen} onOpenChange={setIsHighlighterMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={`w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10 relative ${
                  highlighterActive ? "bg-primary/20 text-primary" : ""
                }`}
                onClick={toggleHighlighterMode}
                title="Highlighter"
                type="button"
              >
                <Highlighter className="w-4 h-4" />
                <div
                  className="absolute bottom-1 right-1 w-2 h-2 rounded border border-background"
                  style={{ backgroundColor: highlighterColor }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-56 p-3 bg-widget-header border-border">
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Highlighter Color</div>
                  <div className="grid grid-cols-4 gap-2">
                    {HIGHLIGHTER_COLORS.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => setHighlighterColor(color)}
                        className={`w-10 h-10 rounded border-2 transition-all hover:scale-110 ${
                          highlighterColor === color ? "ring-2 ring-primary ring-offset-1 ring-offset-widget-header" : "border-border"
                        }`}
                        style={{ backgroundColor: color }}
                        type="button"
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">Highlighter Width: {highlighterSize}px</div>
                  <input
                    type="range"
                    min="8"
                    max="30"
                    value={highlighterSize}
                    onChange={(event) => setHighlighterSize(Number(event.target.value))}
                    className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <div className="pt-2 border-t border-border text-xs text-muted-foreground">
                  {highlighterActive ? "Highlighter mode active" : "Click to enable highlighter"}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10 relative"
                title="Color Picker"
                type="button"
              >
                <Palette className="w-4 h-4" />
                <div
                  className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-background"
                  style={{ backgroundColor: selectedColor.border }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-56 p-3 bg-widget-header border-border">
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">Background &amp; Border Color</div>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => applyColorToSelected(color)}
                      className={`w-10 h-10 rounded border-2 transition-all hover:scale-110 ${
                        selectedColor.name === color.name ? "ring-2 ring-primary ring-offset-1 ring-offset-widget-header" : "border-border"
                      }`}
                      style={{ backgroundColor: color.bg, borderColor: color.border }}
                      title={color.name}
                      type="button"
                    />
                  ))}
                </div>
                {selectedId && elements.find((element) => element.id === selectedId)?.type === "text" ? (
                  <div className="pt-2 border-t border-border text-xs text-muted-foreground">Applying to selected element</div>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>

          <Popover open={isShapeMenuOpen} onOpenChange={setIsShapeMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                title="Add Shape"
                type="button"
              >
                <Square className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-64 p-3 bg-widget-header border-border">
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground mb-2">Select Shape</div>
                <div className="grid grid-cols-3 gap-2">
                  {/* Square - Filled */}
                  <button
                    onClick={() => addShape("square")}
                    className="w-12 h-12 flex items-center justify-center border border-border rounded hover:bg-primary/10 hover:border-primary transition-all"
                    title="Square (Filled)"
                    type="button"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="2" width="16" height="16" fill="currentColor" />
                    </svg>
                  </button>
                  {/* Square - Outline */}
                  <button
                    onClick={() => addShape("square-outline")}
                    className="w-12 h-12 flex items-center justify-center border border-border rounded hover:bg-primary/10 hover:border-primary transition-all"
                    title="Square (Outline)"
                    type="button"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="2" width="16" height="16" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                  </button>
                  {/* Circle - Filled */}
                  <button
                    onClick={() => addShape("circle")}
                    className="w-12 h-12 flex items-center justify-center border border-border rounded hover:bg-primary/10 hover:border-primary transition-all"
                    title="Circle (Filled)"
                    type="button"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="10" cy="10" r="8" fill="currentColor" />
                    </svg>
                  </button>
                  {/* Circle - Outline */}
                  <button
                    onClick={() => addShape("circle-outline")}
                    className="w-12 h-12 flex items-center justify-center border border-border rounded hover:bg-primary/10 hover:border-primary transition-all"
                    title="Circle (Outline)"
                    type="button"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                  </button>
                  {/* Triangle - Filled */}
                  <button
                    onClick={() => addShape("triangle")}
                    className="w-12 h-12 flex items-center justify-center border border-border rounded hover:bg-primary/10 hover:border-primary transition-all"
                    title="Triangle (Filled)"
                    type="button"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <polygon points="10,2 18,18 2,18" fill="currentColor" />
                    </svg>
                  </button>
                  {/* Triangle - Outline */}
                  <button
                    onClick={() => addShape("triangle-outline")}
                    className="w-12 h-12 flex items-center justify-center border border-border rounded hover:bg-primary/10 hover:border-primary transition-all"
                    title="Triangle (Outline)"
                    type="button"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <polygon points="10,2 18,18 2,18" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                  </button>
                  {/* Arrow */}
                  <button
                    onClick={() => addShape("arrow")}
                    className="w-12 h-12 flex items-center justify-center border border-border rounded hover:bg-primary/10 hover:border-primary transition-all"
                    title="Arrow"
                    type="button"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  {/* Back Arrow */}
                  <button
                    onClick={() => addShape("arrow-back")}
                    className="w-12 h-12 flex items-center justify-center border border-border rounded hover:bg-primary/10 hover:border-primary transition-all"
                    title="Back Arrow"
                    type="button"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {/* Up Arrow */}
                  <button
                    onClick={() => addShape("arrow-up")}
                    className="w-12 h-12 flex items-center justify-center border border-border rounded hover:bg-primary/10 hover:border-primary transition-all"
                    title="Up Arrow"
                    type="button"
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                  {/* Down Arrow */}
                  <button
                    onClick={() => addShape("arrow-down")}
                    className="w-12 h-12 flex items-center justify-center border border-border rounded hover:bg-primary/10 hover:border-primary transition-all"
                    title="Down Arrow"
                    type="button"
                  >
                    <ArrowDown className="w-5 h-5" />
                  </button>
                  {/* Line */}
                  <button
                    onClick={() => addShape("line")}
                    className="w-12 h-12 flex items-center justify-center border border-border rounded hover:bg-primary/10 hover:border-primary transition-all"
                    title="Line"
                    type="button"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="h-px w-6 bg-border my-1" />

          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-50"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Undo"
            type="button"
          >
            <Undo className="w-4 h-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-50"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo"
            type="button"
          >
            <Redo className="w-4 h-4" />
          </Button>

          <div className="h-px w-6 bg-border my-1" />

          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() => fileInputRef.current?.click()}
            title="Upload"
            type="button"
          >
            <Upload className="w-4 h-4" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={deleteSelected}
            disabled={!selectedId}
            title="Delete Selected"
            type="button"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div
          ref={canvasRef}
          className={`flex-1 bg-background relative overflow-hidden moodboard-canvas-print ${isDragging ? "ring-2 ring-primary ring-inset" : ""} ${
            drawingActive || highlighterActive ? "cursor-crosshair" : ""
          }`}
          onClick={(event) => {
            if (event.target === event.currentTarget && !drawingActive && !highlighterActive) {
              setSelectedId(null);
            }
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
        >
          {isDragging ? (
            <div className="absolute inset-0 bg-primary/5 flex items-center justify-center pointer-events-none z-50">
              <div className="text-primary text-sm">Drop image here</div>
            </div>
          ) : null}

          {elements.length === 0 && !isDragging ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm pointer-events-none">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <div>Drop images or click toolbar to add elements</div>
              </div>
            </div>
          ) : null}

          {/* SVG layer for current path only - drawings and highlights are rendered separately with Rnd */}
          <svg 
            className="absolute inset-0 w-full h-full" 
            style={{ 
              zIndex: 1, 
              pointerEvents: "none" // Container doesn't block - only paths capture clicks
            }}
          >
            {currentPath ? (
              <path
                d={currentPath}
                stroke={highlighterActive ? highlighterColor : drawColor}
                strokeWidth={highlighterActive ? highlighterSize : penSize}
                fill="none"
                strokeLinecap={highlighterActive ? "butt" : "round"}
                strokeLinejoin={highlighterActive ? "miter" : "round"}
                opacity={highlighterActive ? 0.4 : 1}
                style={{ pointerEvents: "none" }}
              />
            ) : null}
          </svg>

          {/* Render drawings as draggable Rnd components */}
          {elements
            .filter((element) => element.type === "drawing")
            .map((element) => (
              <Rnd
                key={element.id}
                default={{
                  x: element.x,
                  y: element.y,
                  width: element.width,
                  height: element.height,
                }}
                bounds="parent"
                onDragStart={handleDragStart}
                onDragStop={(event, data) => handleDragStop(element.id, { x: data.x, y: data.y })}
                className=""
                onClick={(event) => {
                  event.stopPropagation();
                  if (!drawingActive && !highlighterActive) {
                    setSelectedId(element.id);
                  }
                }}
                enableResizing={false}
                disableDragging={drawingActive || highlighterActive}
                style={{ zIndex: 2, cursor: drawingActive || highlighterActive ? "crosshair" : "move" }}
              >
                <div className="relative w-full h-full" style={{ pointerEvents: drawingActive || highlighterActive ? "none" : "auto" }}>
                  <svg 
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: "none" }}
                  >
                    <path
                      d={element.content}
                      stroke={element.color}
                      strokeWidth={element.strokeWidth}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ pointerEvents: "none" }}
                    />
                  </svg>
                  {selectedId === element.id && !drawingActive && !highlighterActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteElement(element.id);
                      }}
                      className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full shadow-lg transition-all hover:scale-110 pointer-events-auto"
                      title="Delete"
                      type="button"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </Rnd>
            ))}

          {/* Render highlights as draggable Rnd components */}
          {elements
            .filter((element) => element.type === "highlight")
            .map((element) => (
              <Rnd
                key={element.id}
                default={{
                  x: element.x,
                  y: element.y,
                  width: element.width,
                  height: element.height,
                }}
                bounds="parent"
                onDragStart={handleDragStart}
                onDragStop={(event, data) => handleDragStop(element.id, { x: data.x, y: data.y })}
                className=""
                onClick={(event) => {
                  event.stopPropagation();
                  if (!drawingActive && !highlighterActive) {
                    setSelectedId(element.id);
                  }
                }}
                enableResizing={false}
                disableDragging={drawingActive || highlighterActive}
                style={{ zIndex: 2, cursor: drawingActive || highlighterActive ? "crosshair" : "move" }}
              >
                <div className="relative w-full h-full" style={{ pointerEvents: drawingActive || highlighterActive ? "none" : "auto" }}>
                  <svg 
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: "none" }}
                  >
                    <path
                      d={element.content}
                      stroke={element.color}
                      strokeWidth={element.strokeWidth}
                      fill="none"
                      strokeLinecap="butt"
                      strokeLinejoin="miter"
                      opacity={element.opacity ?? 0.4}
                      style={{ pointerEvents: "none" }}
                    />
                  </svg>
                  {selectedId === element.id && !drawingActive && !highlighterActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteElement(element.id);
                      }}
                      className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full shadow-lg transition-all hover:scale-110 pointer-events-auto"
                      title="Delete"
                      type="button"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </Rnd>
            ))}

          {/* Render shapes as draggable Rnd components */}
          {elements
            .filter((element) => element.type === "shape")
            .map((element) => (
              <Rnd
                key={element.id}
                default={{
                  x: element.x,
                  y: element.y,
                  width: element.width,
                  height: element.height,
                }}
                bounds="parent"
                onDragStart={handleDragStart}
                onDragStop={(event, data) => handleDragStop(element.id, { x: data.x, y: data.y })}
                onResizeStart={handleResizeStart}
                onResizeStop={(event, direction, ref, delta, position) => handleResizeStop(element.id, ref, position)}
                className=""
                onClick={(event) => {
                  event.stopPropagation();
                  if (!drawingActive && !highlighterActive) {
                    setSelectedId(element.id);
                  }
                }}
                enableResizing={selectedId === element.id}
                disableDragging={drawingActive || highlighterActive}
              >
                <div className="relative w-full h-full" style={{ pointerEvents: drawingActive || highlighterActive ? "none" : "auto" }}>
                  <svg 
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: "none" }}
                  >
                    {renderShape(element)}
                  </svg>
                  {selectedId === element.id && !drawingActive && !highlighterActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteElement(element.id);
                      }}
                      className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full shadow-lg transition-all hover:scale-110 pointer-events-auto"
                      title="Delete"
                      type="button"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </Rnd>
            ))}

          {elements
            .filter((element) => element.type !== "drawing" && element.type !== "highlight" && element.type !== "shape")
            .map((element) => (
              <Rnd
                key={element.id}
                default={{
                  x: element.x,
                  y: element.y,
                  width: element.width,
                  height: element.height,
                }}
                bounds="parent"
                onDragStart={handleDragStart}
                onDragStop={(event, data) => handleDragStop(element.id, { x: data.x, y: data.y })}
                onResizeStart={handleResizeStart}
                onResizeStop={(event, direction, ref, delta, position) => handleResizeStop(element.id, ref, position)}
                className={selectedId === element.id ? "ring-2 ring-primary shadow-lg" : "ring-1 ring-border/50"}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!drawingActive && !highlighterActive) {
                    setSelectedId(element.id);
                  }
                }}
                enableResizing={selectedId === element.id}
                disableDragging={drawingActive || highlighterActive}
              >
                <div className="relative w-full h-full">
                  {element.type === "image" ? (
                    <img src={element.content} alt="Moodboard element" className="w-full h-full object-cover" draggable={false} />
                  ) : (
                    <div className="w-full h-full p-3 overflow-auto" style={{ backgroundColor: element.backgroundColor }}>
                      <textarea
                        value={element.content}
                        onChange={(event) => handleTextChange(element.id, event.target.value)}
                        className="w-full h-full bg-transparent border-none outline-none resize-none"
                        style={{
                          fontSize: `${element.fontSize ?? 12}px`,
                          lineHeight: "1.5",
                          color: element.textColor ?? "rgb(255, 255, 255)",
                          textAlign: element.textAlign ?? "left",
                          fontWeight: element.fontWeight ?? "normal",
                          fontStyle: element.fontStyle ?? "normal",
                          textDecoration: element.textDecoration ?? "none",
                        }}
                        placeholder="Start typing..."
                        disabled={drawingActive || highlighterActive}
                      />
                    </div>
                  )}
                  {selectedId === element.id && !drawingActive && !highlighterActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteElement(element.id);
                      }}
                      className="absolute top-1 right-1 z-10 w-6 h-6 flex items-center justify-center bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full shadow-lg transition-all hover:scale-110"
                      title="Delete"
                      type="button"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </Rnd>
            ))}
        </div>
      </div>
      </div>
    </>
  );
}


