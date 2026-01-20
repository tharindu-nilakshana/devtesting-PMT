'use client';

import { useState, useEffect } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from './RichTextEditor';
import { 
  X, 
  Trash2,
  StickyNote,
  Settings2,
  FileDown
} from 'lucide-react';
import { 
  getUserNotes, 
  addUserNote, 
  updateUserNoteMessage, 
  updateUserNoteTitleTags, 
  deleteUserNote,
  Note 
} from './notesApi';
import { ConfirmDialog } from '@/components/bloomberg-ui/ConfirmDialog';
import { AlertDialog } from './AlertDialog';

interface NotesProps {
  wgid?: string;
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, any>;
}

type ViewMode = 'list' | 'edit';

const NOTES_STORAGE_KEY = '@pmt_app_notes_draft';
const NOTE_ID_STORAGE_KEY = '@pmt_app_note_id';

export default function Notes({ onSettings, onRemove, onFullscreen, settings }: NotesProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Dialog states
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'error' | 'success' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    note: Note | null;
  }>({
    isOpen: false,
    note: null,
  });


  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, []);

  // Load note from settings.noteID when it changes
  useEffect(() => {
    if (settings?.noteID) {
      const noteId = typeof settings.noteID === 'string' 
        ? parseInt(settings.noteID, 10) 
        : settings.noteID;
      
      // If notes are not loaded yet, load them first
      if (notes.length === 0) {
        loadNotes();
        return;
      }
      
      const note = notes.find(n => n.ID === noteId);
      if (note && (!selectedNote || selectedNote.ID !== noteId)) {
        setIsCreatingNew(false);
        setSelectedNote(note);
        setNoteTitle(note.NoteTitle);
        setNoteContent(note.NoteMessage || '');
        setNoteTags(note.Tags || '');
        setViewMode('edit');
      } else if (!note) {
        // Note not found in current list, reload notes to get latest data
        loadNotes().then((updatedNotes) => {
          // After reloading, try to find the note again
          if (updatedNotes && Array.isArray(updatedNotes)) {
            const foundNote = updatedNotes.find(n => n.ID === noteId);
          if (foundNote) {
            setIsCreatingNew(false);
            setSelectedNote(foundNote);
            setNoteTitle(foundNote.NoteTitle);
            setNoteContent(foundNote.NoteMessage || '');
            setNoteTags(foundNote.Tags || '');
            setViewMode('edit');
          }
          }
        }).catch((error) => {
          console.error('Error reloading notes:', error);
        });
      }
    } else if (settings?.noteID === null || settings?.noteID === undefined) {
      // If noteID is cleared, show empty editor
      if (!isCreatingNew) {
        setSelectedNote(null);
        setNoteTitle('');
        setNoteContent('');
        setNoteTags('');
        setViewMode('edit');
        clearDraft();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.noteID, notes, selectedNote, isCreatingNew]);

  // Load draft from localStorage when entering edit mode
  useEffect(() => {
    if (viewMode === 'edit') {
      loadDraft();
    }
  }, [viewMode]);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (viewMode === 'edit' && noteContent) {
      saveDraft();
    }
  }, [noteContent, viewMode]);

  const loadNotes = async (): Promise<Note[]> => {
    try {
      setIsLoading(true);
      const notesData = await getUserNotes();
      
      const sortedNotes = notesData.sort((a, b) => {
        // Sort by date, newest first
        // Handle invalid dates by treating them as very old dates (sorted to end)
        const getDateValue = (noteDate: string | null | undefined): number => {
          if (!noteDate || typeof noteDate !== 'string' || noteDate.trim() === '') {
            return 0; // Treat empty/invalid as very old
          }
          
          // Try parsing the date
          const date = new Date(noteDate);
          const time = date.getTime();
          
          // If invalid, return 0
          if (isNaN(time)) {
            return 0;
          }
          
          return time;
        };
        
        const timeA = getDateValue(a.NoteDate);
        const timeB = getDateValue(b.NoteDate);
        
        return timeB - timeA; // Newest first
      });
      
      setNotes(sortedNotes);
      return sortedNotes;
    } catch (error) {
      console.error('❌ [Notes] Error loading notes:', error);
      return []; // Return empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const loadDraft = () => {
    try {
      const draft = localStorage.getItem(NOTES_STORAGE_KEY);
      const noteId = localStorage.getItem(NOTE_ID_STORAGE_KEY);
      
      if (draft && (!selectedNote || noteId === String(selectedNote.ID))) {
        setNoteContent(draft);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, noteContent);
      if (selectedNote) {
        localStorage.setItem(NOTE_ID_STORAGE_KEY, String(selectedNote.ID));
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(NOTES_STORAGE_KEY);
      localStorage.removeItem(NOTE_ID_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  };

  const handleCreateNote = () => {
    setIsCreatingNew(true);
    setSelectedNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteTags('');
    setViewMode('edit');
    // Clear noteID from settings when creating new note
    // This will be handled by the slide-in when creating a new note
  };

  const handleEditNote = (note: Note) => {
    setIsCreatingNew(false);
    setSelectedNote(note);
    setNoteTitle(note.NoteTitle);
    setNoteContent(note.NoteMessage || '');
    setNoteTags(note.Tags || '');
    setViewMode('edit');
  };

  const handleBackToList = () => {
    setViewMode('list');
    clearDraft();
  };

  const showAlert = (title: string, message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setAlertDialog({
      isOpen: true,
      title,
      message,
      type,
    });
  };

  const handleSave = async () => {
    // Validation
    if (!noteContent || noteContent.trim() === '') {
      showAlert('Validation Error', 'Note content cannot be empty', 'error');
      return;
    }

    if (!selectedNote) {
      showAlert('Validation Error', 'No note selected', 'error');
      return;
    }

    try {
      setIsSaving(true);

      // Only save the content - title and tags are edited in settings panel
      await updateUserNoteMessage(selectedNote.ID, noteContent.trim());

      // Refresh notes to get latest data
      await loadNotes();
      
      showAlert('Success', 'Note saved successfully!', 'success');
      clearDraft();
    } catch (error) {
      console.error('Error saving note:', error);
      showAlert('Error', 'Failed to save note. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({
      isOpen: true,
      note,
    });
  };

  const confirmDeleteNote = async () => {
    const note = deleteConfirm.note;
    if (!note) return;

    try {
      await deleteUserNote(note.ID);
      setNotes((prev) => prev.filter((n) => n.ID !== note.ID));
      
      // If deleting the currently selected note, go back to list
      if (selectedNote && selectedNote.ID === note.ID) {
        setViewMode('list');
        clearDraft();
      }
      
      setDeleteConfirm({ isOpen: false, note: null });
    } catch (error) {
      console.error('Error deleting note:', error);
      setDeleteConfirm({ isOpen: false, note: null });
      showAlert('Error', 'Failed to delete note. Please try again.', 'error');
    }
  };

  const cancelDeleteNote = () => {
    setDeleteConfirm({ isOpen: false, note: null });
  };


  // Handle PDF export
  const handleExportToPDF = () => {
    if (!selectedNote) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${selectedNote.NoteTitle}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
              }
              h1 {
                color: #ff6b35;
                border-bottom: 2px solid #ff6b35;
                padding-bottom: 10px;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
              }
            </style>
          </head>
          <body>
            <h1>${selectedNote.NoteTitle}</h1>
            <pre>${noteContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Strip HTML tags for preview
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Format date - handles various date formats from API (simplified, less logging)
  const formatDate = (dateString: string | null | undefined, noteId?: number): string => {
    // Handle null, undefined, or empty strings
    if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') {
      return 'No date';
    }

    const trimmedDate = dateString.trim();

    try {
      let date: Date | null = null;
      
      // Try parsing DD.MM.YYYY format (European date format) - seen in API responses like "18.07.2025"
      const europeanMatch = trimmedDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (europeanMatch) {
        const [, day, month, year] = europeanMatch;
        date = new Date(
          parseInt(year, 10),
          parseInt(month, 10) - 1, // Month is 0-indexed
          parseInt(day, 10)
        );
      }
      
      // Try parsing MySQL datetime format: "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD HH:mm:ss.fff"
      if (!date || isNaN(date.getTime())) {
        const mysqlMatch = trimmedDate.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+)(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/);
        if (mysqlMatch) {
          const [, year, month, day, hour, minute, second] = mysqlMatch;
          date = new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            parseInt(hour, 10),
            parseInt(minute, 10),
            parseInt(second || '0', 10)
          );
        }
      }
      
      // Try parsing DD/MM/YYYY format
      if (!date || isNaN(date.getTime())) {
        const slashMatch = trimmedDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (slashMatch) {
          const [, day, month, year] = slashMatch;
          date = new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10)
          );
        }
      }
      
      // If manual parsing didn't work, try standard Date parsing
      if (!date || isNaN(date.getTime())) {
        const isoFormat = trimmedDate.replace(' ', 'T');
        date = new Date(isoFormat);
        if (isNaN(date.getTime())) {
          date = new Date(trimmedDate);
        }
      }
      
      // Check if the date is valid
      if (!date || isNaN(date.getTime())) {
        return 'No date';
      }
      
      // Format date in a more readable way with full date and time
      const formatted = date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      
      if (formatted === 'Invalid Date') {
        return 'No date';
      }
      
      return formatted;
    } catch (error) {
      return 'No date';
    }
  };

  // Format date for display (shorter format)
  const formatDateShort = (dateString: string | null | undefined): string => {
    if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') {
      return '';
    }

    const trimmedDate = dateString.trim();

    try {
      let date: Date | null = null;
      
      const europeanMatch = trimmedDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (europeanMatch) {
        const [, day, month, year] = europeanMatch;
        date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      }
      
      if (!date || isNaN(date.getTime())) {
        const mysqlMatch = trimmedDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (mysqlMatch) {
          const [, year, month, day] = mysqlMatch;
          date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
        }
      }
      
      if (!date || isNaN(date.getTime())) {
        date = new Date(trimmedDate);
      }
      
      if (!date || isNaN(date.getTime())) {
        return '';
      }
      
      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Show relative time for recent notes
      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else if (diffDays < 30) {
        return `${Math.floor(diffDays / 7)}w ago`;
      }
      
      // For older notes, show month and day
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return '';
    }
  };

  // Show empty state if no note is selected and not creating new
  const showEmptyState = !selectedNote && !isCreatingNew && !settings?.noteID;

  // Get current note title for header
  const currentNoteTitle = selectedNote?.NoteTitle || 'Untitled';

  // Editor View (always shown, list is in slide-in)
  return (
    <div className="w-full h-full bg-widget-header border border-border flex flex-col overflow-hidden">
      {/* Custom Header */}
      <div className="h-9 bg-widget-header border-b border-border flex items-center justify-between px-3 flex-shrink-0 group">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onFullscreen}>
          <span className="text-sm text-muted-foreground">Notes |</span>
          <span className="text-sm text-primary">{currentNoteTitle}</span>
          {onFullscreen && (
            <div className="text-muted-foreground text-xs ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              Click to expand
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6 text-primary hover:text-primary hover:bg-primary/10"
            onClick={handleExportToPDF}
            title="Export to PDF"
            disabled={!selectedNote}
          >
            <FileDown className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={onSettings}
            title="Settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="w-6 h-6 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={onRemove}
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Editor or Empty State */}
      {showEmptyState ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <StickyNote className="w-16 h-16 text-muted-foreground mb-4" strokeWidth={1.5} />
          <h3 className="text-xl font-semibold text-foreground mb-2">No note selected</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Select a note from the settings menu to view or edit it.
          </p>
          <Button 
            onClick={onSettings}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 text-sm font-medium transition-colors"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Open Notes List
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <RichTextEditor
            content={noteContent}
            onChange={setNoteContent}
            placeholder="Start typing your notes..."
            onSave={handleSave}
            isSaving={isSaving}
            showSaveButton={true}
          />
        </div>
      )}

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog({ ...alertDialog, isOpen: false })}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={cancelDeleteNote}
        onConfirm={confirmDeleteNote}
        title="Delete Note"
        message={deleteConfirm.note ? `Are you sure you want to delete "${deleteConfirm.note.NoteTitle}"? This action cannot be undone.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        sharpCorners={true}
      />
    </div>
  );
}
