'use client';

import { useRef, useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Undo,
  Palette,
  Type,
  ChevronDown,
  Quote,
  Code,
  Table,
  Link,
  Image as ImageIcon,
  Minus,
  IndentDecrease,
  IndentIncrease,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onSave?: () => void;
  isSaving?: boolean;
  showSaveButton?: boolean;
}

const COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Yellow', value: '#fbbf24' },
  { name: 'Orange', value: '#FFB02E' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
];

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = 'Start typing...',
  onSave,
  isSaving = false,
  showSaveButton = false
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [listStates, setListStates] = useState({ unordered: false, ordered: false });
  // Check if content is empty (strip HTML tags)
  const isContentEmpty = (html: string): boolean => {
    if (!html) return true;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = tmp.textContent || tmp.innerText || '';
    return text.trim() === '';
  };

  // Check if editor is empty
  const checkIfEmpty = (): boolean => {
    if (!editorRef.current) return true;
    const text = editorRef.current.textContent || editorRef.current.innerText || '';
    return text.trim() === '';
  };

  const [isEmpty, setIsEmpty] = useState(() => isContentEmpty(content));

  // Set content when prop changes
  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== content) {
        editorRef.current.innerHTML = content;
      }
      // Check if empty after setting content
      const empty = checkIfEmpty();
      setIsEmpty(empty);
    }
  }, [content]);

  // Update list states based on current selection
  const updateListStates = () => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setListStates({ unordered: false, ordered: false });
      return;
    }
    
    const range = selection.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    
    if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
      node = node.parentElement;
    }
    
    let inUnordered = false;
    let inOrdered = false;
    
    let current: Node | null = node;
    while (current && current !== editorRef.current) {
      if (current.nodeName === 'UL') {
        inUnordered = true;
        break;
      }
      if (current.nodeName === 'OL') {
        inOrdered = true;
        break;
      }
      current = current instanceof Element ? current.parentElement : null;
    }
    
    setListStates({ unordered: inUnordered, ordered: inOrdered });
  };

  // Handle content changes
  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setIsEmpty(checkIfEmpty());
      setCanUndo(true);
      updateListStates();
    }
  };

  // Execute formatting command
  const executeCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  // Toggle list (insert if not in list, remove if in list)
  const toggleList = (listType: 'insertUnorderedList' | 'insertOrderedList') => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    const isUnordered = listType === 'insertUnorderedList';
    const currentState = isUnordered ? listStates.unordered : listStates.ordered;
    const otherState = isUnordered ? listStates.ordered : listStates.unordered;
    
    if (currentState) {
      // Currently in this list type - remove it by executing the same command again
      // execCommand acts as a toggle for lists
      document.execCommand(listType, false);
      handleInput();
    } else if (otherState) {
      // In the other list type - switch to this one
      // First remove the current list, then add the new one
      const otherListType = isUnordered ? 'insertOrderedList' : 'insertUnorderedList';
      document.execCommand(otherListType, false); // Remove current list
      setTimeout(() => {
        document.execCommand(listType, false); // Add new list type
        handleInput();
      }, 10);
    } else {
      // Not in any list - create this list type
      document.execCommand(listType, false);
      handleInput();
    }
  };

  // Execute command and prevent default (for certain commands)
  const executeCommandPreventDefault = (command: string, value?: string, preventDefault = true) => {
    if (preventDefault && editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    handleInput();
  };

  // Apply color
  const applyColor = (color: string) => {
    executeCommand('foreColor', color);
    setShowColorPicker(false);
  };

  // Check if format is active
  const isFormatActive = (command: string): boolean => {
    if (!editorRef.current || document.activeElement !== editorRef.current) {
      return false;
    }
    try {
      // Special handling for list commands - they don't work reliably with queryCommandState
      if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return false;
        
        const range = selection.getRangeAt(0);
        let node = range.commonAncestorContainer;
        
        // If it's a text node, get the parent element
        if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
          node = node.parentElement;
        }
        
        // Walk up the DOM tree to find if we're inside a list
        let current: Node | null = node;
        while (current && current !== editorRef.current) {
          if (current.nodeName === 'UL' && command === 'insertUnorderedList') {
            return true;
          }
          if (current.nodeName === 'OL' && command === 'insertOrderedList') {
            return true;
          }
          current = current instanceof Element ? current.parentElement : null;
        }
        return false;
      }
      
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  // Focus editor
  const focusEditor = () => {
    editorRef.current?.focus();
    updateListStates();
  };

  // Update list states on selection change
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleSelectionChange = () => {
      if (document.activeElement === editor) {
        updateListStates();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    editor.addEventListener('mouseup', handleSelectionChange);
    editor.addEventListener('keyup', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      editor.removeEventListener('mouseup', handleSelectionChange);
      editor.removeEventListener('keyup', handleSelectionChange);
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-background border-b border-border flex items-center gap-1 px-2 py-1.5 flex-shrink-0">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={`w-7 h-7 ${isFormatActive('bold') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'} hover:text-foreground hover:bg-muted`}
          onClick={() => executeCommand('bold')}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" strokeWidth={isFormatActive('bold') ? 3 : 2.5} />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={`w-7 h-7 ${isFormatActive('italic') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'} hover:text-foreground hover:bg-muted`}
          onClick={() => executeCommand('italic')}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" strokeWidth={isFormatActive('italic') ? 3 : 2.5} />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={`w-7 h-7 ${isFormatActive('underline') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'} hover:text-foreground hover:bg-muted`}
          onClick={() => executeCommand('underline')}
          title="Underline"
        >
          <Underline className="w-3.5 h-3.5" strokeWidth={isFormatActive('underline') ? 3 : 2.5} />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={`w-7 h-7 ${isFormatActive('strikeThrough') ? 'bg-primary/20 text-primary' : 'text-muted-foreground'} hover:text-foreground hover:bg-muted`}
          onClick={() => executeCommand('strikeThrough')}
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" strokeWidth={isFormatActive('strikeThrough') ? 3 : 2.5} />
        </Button>

        <div className="w-px h-5 bg-border mx-0.5"></div>

        <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Text Color"
            >
              <Palette className="w-3.5 h-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-4 shadow-xl border-2 border-border/60 rounded-none" align="start">
            <div className="grid grid-cols-4 gap-3">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className="w-12 h-12 border-2 border-border hover:border-primary hover:scale-110 transition-all duration-200 shadow-md rounded-none"
                  style={{ backgroundColor: color.value }}
                  onClick={() => applyColor(color.value)}
                  title={color.name}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Text Size"
        >
          <Type className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-muted"
          title="More Options"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-0.5"></div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={`w-7 h-7 ${listStates.unordered ? 'bg-primary/20 text-primary' : 'text-muted-foreground'} hover:text-foreground hover:bg-muted`}
          onClick={() => toggleList('insertUnorderedList')}
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={`w-7 h-7 ${listStates.ordered ? 'bg-primary/20 text-primary' : 'text-muted-foreground'} hover:text-foreground hover:bg-muted`}
          onClick={() => toggleList('insertOrderedList')}
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-0.5"></div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={() => executeCommand('formatBlock', 'blockquote')}
          title="Quote"
        >
          <Quote className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={() => {
            const selectedText = window.getSelection()?.toString() || '';
            if (selectedText) {
              executeCommand('formatBlock', 'pre');
            }
          }}
          title="Code"
        >
          <Code className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-muted-foreground hover:!text-primary hover:!bg-primary/20"
          title="Table"
        >
          <Table className="w-3.5 h-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-0.5"></div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-muted-foreground hover:!text-primary hover:!bg-primary/20"
          onClick={() => {
            const url = prompt('Enter URL:');
            if (url) {
              executeCommand('createLink', url);
            }
          }}
          title="Link"
        >
          <Link className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-muted-foreground hover:!text-primary hover:!bg-primary/20"
          onClick={() => {
            const url = prompt('Enter image URL:');
            if (url) {
              executeCommand('insertImage', url);
            }
          }}
          title="Image"
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-muted-foreground hover:!text-primary hover:!bg-primary/20"
          onClick={() => executeCommand('insertHorizontalRule')}
          title="Horizontal Line"
        >
          <Minus className="w-3.5 h-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-0.5"></div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-muted-foreground hover:!text-primary hover:!bg-primary/20"
          onClick={() => executeCommand('outdent')}
          title="Decrease Indent"
        >
          <IndentDecrease className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-muted-foreground hover:!text-primary hover:!bg-primary/20"
          onClick={() => executeCommand('indent')}
          title="Increase Indent"
        >
          <IndentIncrease className="w-3.5 h-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-0.5"></div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-muted-foreground hover:!text-primary hover:!bg-primary/20"
          onClick={() => executeCommand('justifyLeft')}
          title="Align Left"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-muted-foreground hover:!text-primary hover:!bg-primary/20"
          onClick={() => executeCommand('justifyCenter')}
          title="Align Center"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="w-7 h-7 text-muted-foreground hover:!text-primary hover:!bg-primary/20"
          onClick={() => executeCommand('justifyRight')}
          title="Align Right"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </Button>

        <div className="flex-1"></div>

        {showSaveButton && onSave && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 bg-transparent hover:bg-primary/10 border-primary text-primary hover:text-primary text-sm font-semibold transition-all duration-200 disabled:opacity-50"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 mr-2" />
                Save
              </>
            )}
          </Button>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto bg-background p-4 relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onClick={focusEditor}
          onFocus={focusEditor}
          className="min-h-full outline-none text-foreground rich-text-editor focus:outline-none"
          style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            fontSize: '14px',
            lineHeight: '1.6',
          }}
        />
        {isEmpty && (
          <div 
            className="absolute top-4 left-4 text-muted-foreground/60 pointer-events-none select-none italic"
            style={{ fontSize: '14px', lineHeight: '1.6' }}
          >
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}

