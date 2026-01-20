// Notes API service for CRUD operations
// Based on Notes_Widget_Implementation.md

export interface Note {
  ID: number;
  NoteTitle: string;
  NoteMessage: string | null;
  Tags: string;
  NoteDate: string;
}

const API_BASE = '/api/pmt';

// Get all user notes
export async function getUserNotes(): Promise<Note[]> {
  try {
    const response = await fetch(`${API_BASE}/getUserNotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch notes: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle both array and wrapped response formats
    let notesArray: Note[] = [];
    if (Array.isArray(data)) {
      notesArray = data;
    } else if (data && data.notes && Array.isArray(data.notes)) {
      notesArray = data.notes;
    } else if (data && Array.isArray(data.data)) {
      notesArray = data.data;
    }

    return notesArray;
  } catch (error) {
    console.error('Error fetching user notes:', error);
    throw error;
  }
}

// Create new note
export async function addUserNote(
  title: string, 
  noteMessage?: string, 
  symbolID?: number, 
  tags?: string
): Promise<{ success: boolean; data?: any; message?: string }> {
  try {
    // Based on API testing, the backend requires NoteMessage, Tags, and SymbolID to be present
    // SymbolID must be > 0, so use a default value of 1 if not provided
    const payload: {
      NoteTitle: string;
      NoteMessage: string;
      SymbolID: number;
      Tags: string;
    } = {
      NoteTitle: title,
      NoteMessage: (noteMessage !== undefined && noteMessage !== null && noteMessage.trim() !== '') 
        ? noteMessage.trim() 
        : '',
      SymbolID: (symbolID !== undefined && symbolID !== null && symbolID > 0) 
        ? symbolID 
        : 1, // Default to 1 if not provided (backend requires SymbolID > 0)
      Tags: (tags !== undefined && tags !== null && tags.trim() !== '') 
        ? tags.trim() 
        : '',
    };

    const response = await fetch(`${API_BASE}/addUserNote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    // Read response as text first so we can parse it for both success and error cases
    const responseText = await response.text();
    
    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `Failed to create note: ${response.status} ${response.statusText}`;
      try {
        if (responseText) {
          try {
            const errorData = JSON.parse(responseText);
            if (errorData?.error) {
              errorMessage = errorData.error;
            } else if (errorData?.message) {
              errorMessage = errorData.message;
            } else if (typeof errorData === 'string') {
              errorMessage = errorData;
            } else if (errorData?.data?.message) {
              errorMessage = errorData.data.message;
            }
          } catch {
            // If not JSON, use the text directly
            errorMessage = responseText || errorMessage;
          }
        }
      } catch (parseError) {
        // If we can't parse, use the response text or default message
        errorMessage = responseText || errorMessage;
      }
      console.error('API Error Response:', responseText);
      throw new Error(errorMessage);
    }

    // Parse the successful response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response:', responseText);
      throw new Error('Invalid response format from server');
    }

    return {
      success: data.success !== false, // Default to true if not explicitly false
      data: data.data,
      message: data.message,
    };
  } catch (error) {
    console.error('Error creating note:', error);
    throw error;
  }
}

// Update note content
export async function updateUserNoteMessage(noteId: number, noteContent: string): Promise<boolean> {
  try {
    // Validation
    if (!noteId || noteId <= 0) {
      throw new Error('Invalid note ID');
    }
    if (!noteContent || noteContent.trim() === '') {
      throw new Error('Note content cannot be empty');
    }

    const response = await fetch(`${API_BASE}/updateUserNoteMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ID: noteId,
        NoteMessage: noteContent.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update note: ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating note message:', error);
    throw error;
  }
}

// Update note title and tags
export async function updateUserNoteTitleTags(
  noteId: number,
  title: string,
  tags: string = 'trading,notes'
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/updateUserNoteTitleTags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ID: noteId,
        NoteTitle: title,
        Tags: tags,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update note title/tags: ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating note title/tags:', error);
    throw error;
  }
}

// Delete note
export async function deleteUserNote(noteId: number): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/deleteUserNote`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ID: noteId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete note: ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting note:', error);
    throw error;
  }
}

