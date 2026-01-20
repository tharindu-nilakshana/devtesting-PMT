// Trading Journal API service for CRUD operations
// Uses credentials: 'include' to let Next.js API route handle authentication from cookies

export interface JournalTitle {
  ID: number;
  Name: string;
  Title?: number; // Legacy support
  JournalName?: string; // Legacy support
  WidgetID?: number;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface JournalData {
  ID?: number;
  TradeID?: number; // Legacy support
  Journal_ID?: number;
  JournalID?: number;
  JournalId?: number;
  journalId?: number;
  Title?: number;
  TitleID?: number;
  Row_ID?: number | string;
  Pair?: string;
  Trade_Date?: string;
  Direction?: string;
  Status?: string;
  Win_Loss?: string;
  Pnl_no_Interest?: number;
  Pnl?: number;
  Equity_Before?: number;
  Equity_After?: number;
  Percent_Gain?: number;
  Pips?: number;
  Mfe_Pips?: number;
  Mfe_Percent?: number;
  Mae_Pips?: number;
  Mae_Percent?: number;
  Symbol?: string;
  Position_Type?: string;
  Strategy?: string;
  Open_Price?: number;
  Close_Price?: number;
  Stop_Loss?: number;
  Take_Profit?: number;
  Open_Time?: string;
  Close_Time?: string;
  Atr_Percent?: number;
  Quarter?: string;
  Year?: number;
  Trade_Style?: string;
  Duration?: string;
  Planned_Reward?: number;
  Risk?: number;
  Notes?: string;
  [key: string]: any; // Flexible structure for trade data
}

export interface JournalAnalysis {
  JournalID: number;
  TradeID: number;
  Analysis?: string;
  Risk?: string;
  PostAnalysis?: string;
}

export interface JournalImage {
  ImageID?: number;
  JournalID: number;
  TradeID: number;
  ImageURL?: string;
  ImageData?: string;
  ImagePath?: string; // Path returned from GetJournalImages API (capital I, capital P)
  imagePath?: string; // Path returned from saveJournalImage API (lowercase)
  filename?: string; // Filename returned from saveJournalImage API
  UploadedAt?: string;
}

export interface ColumnVisibility {
  Title: number;
  WidgetID: number;
  Column_Name: string;
  Is_Visible: boolean;
}

export interface ShareData {
  accessSettings: {
    expiryDays: number;
    maxAccess: number;
  };
  shareOptions: {
    include_journal: boolean;
    include_stats: boolean;
    include_charts: boolean;
    include_calendar: boolean;
    include_notes: boolean;
    include_images: boolean;
    include_sensitive: boolean;
    interactive: boolean;
  };
}

export interface CreateJournalPayload {
  TemplateId: number;
  Name: string;
  TopPos?: number;
  LeftPos?: number;
  Height?: number;
  Width?: number;
  position?: string;
  zIndex?: number;
  CustomTabsID?: number;
}

const API_BASE = '/api/pmt';

// Get all journal titles
export async function getJournalTitles(): Promise<JournalTitle[]> {
  try {
    const response = await fetch(`${API_BASE}/GetJournalTitles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to fetch journal titles: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // API returns: {"success": true, "journals": [{"ID": 5, "Name": "Test-6"}, ...]}
    if (data && data.success && Array.isArray(data.journals)) {
      return data.journals;
    }
    
    // Fallback: Handle other response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.data)) {
      return data.data;
    } else if (data && Array.isArray(data.Journals)) {
      return data.Journals;
    } else if (data && Array.isArray(data.titles)) {
      return data.titles;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching journal titles:', error);
    throw error;
  }
}

// Get journal data
export async function getJournalData(title: number, widgetID: number): Promise<JournalData[]> {
  try {
    if (!title || title <= 0) {
      throw new Error('Invalid Title');
    }
    if (!widgetID || widgetID <= 0) {
      throw new Error('Invalid WidgetID');
    }

    const response = await fetch(`${API_BASE}/GetJournalData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        Title: title,
        WidgetID: widgetID,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to fetch journal data: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // API returns: {"entries": [...], "hidden_columns": []}
    if (data && Array.isArray(data.entries)) {
      return data.entries;
    }
    
    // Fallback: Handle other response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.trades)) {
      return data.trades;
    } else if (data && Array.isArray(data.data)) {
      return data.data;
    } else if (data && Array.isArray(data.Trades)) {
      return data.Trades;
    } else if (data && Array.isArray(data.records)) {
      return data.records;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching journal data:', error);
    throw error;
  }
}

// Save journal data
export async function saveJournalData(journalData: JournalData): Promise<boolean> {
  try {
    // Build minimal payload matching the backend contract exactly
    const payload = {
      journalData: {
        Journal_ID: journalData.Journal_ID,
        Row_ID: journalData.Row_ID ?? 'Select...',
        Trade_Date: journalData.Trade_Date,
        Open_Time: journalData.Open_Time,
        Close_Time: journalData.Close_Time,
        Symbol: journalData.Symbol || journalData.Pair,
        Position_Type: journalData.Position_Type || journalData.Direction,
        Strategy: journalData.Strategy || journalData.Trade_Style,
        Status: journalData.Status ?? 'Open',
        Equity_Before: journalData.Equity_Before ?? 0,
        Pnl_no_Interest: journalData.Pnl_no_Interest ?? 0,
        Risk: journalData.Risk ?? 0,
        Planned_Reward: journalData.Planned_Reward ?? 0,
        Open_Price: journalData.Open_Price ?? 0,
        Close_Price: journalData.Close_Price ?? 0,
        Stop_Loss: journalData.Stop_Loss ?? 0,
        Take_Profit: journalData.Take_Profit ?? 0,
        Notes: journalData.Notes ?? '',
      },
    };

    const response = await fetch(`${API_BASE}/SaveJournalData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = `Failed to save journal entry: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (responseText) {
          errorMessage += ` - ${responseText}`;
        }
      }
      throw new Error(errorMessage);
    }

    return true;
  } catch (error) {
    console.error('Error saving journal data:', error);
    throw error;
  }
}

// Create new journal from widget
export async function newJournalFromWidget(journalName: string): Promise<JournalTitle | null> {
  try {
    if (!journalName || journalName.trim() === '') {
      throw new Error('Journal name cannot be empty');
    }

    const response = await fetch(`${API_BASE}/NewJournalFromWidget`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        journalName: journalName.trim(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to create journal: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating journal:', error);
    throw error;
  }
}

// Update journal details
export async function updateJournal(payload: { ID: number; Name?: string }): Promise<boolean> {
  try {
    if (!payload?.ID || payload.ID <= 0) {
      throw new Error('Journal ID is required');
    }
    if (payload.Name !== undefined && payload.Name.trim() === '') {
      throw new Error('Journal name cannot be empty');
    }

    const response = await fetch(`${API_BASE}/UpdateJournal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ID: payload.ID,
        ...(payload.Name !== undefined ? { Name: payload.Name.trim() } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to update journal: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    return true;
  } catch (error) {
    console.error('Error updating journal:', error);
    throw error;
  }
}

// Create journal and add to dashboard layout
export async function createJournalAndAddToDashboard(payload: CreateJournalPayload): Promise<any> {
  try {
    if (!payload?.TemplateId || payload.TemplateId <= 0) {
      throw new Error('TemplateId is required');
    }
    if (!payload?.Name || payload.Name.trim() === '') {
      throw new Error('Journal name is required');
    }

    const response = await fetch(`${API_BASE}/CreateJournalAndAddToDashboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        TemplateId: payload.TemplateId,
        Name: payload.Name.trim(),
        TopPos: payload.TopPos ?? 0,
        LeftPos: payload.LeftPos ?? 0,
        Height: payload.Height ?? 200,
        Width: payload.Width ?? 300,
        position: payload.position ?? '',
        zIndex: payload.zIndex ?? 0,
        CustomTabsID: payload.CustomTabsID ?? 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to create journal: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating journal and adding to dashboard:', error);
    throw error;
  }
}

// Insert journal (legacy helper)
export async function insertJournal(name: string): Promise<JournalTitle | null> {
  try {
    if (!name || name.trim() === '') {
      throw new Error('Journal name cannot be empty');
    }

    const response = await fetch(`${API_BASE}/InsertJournal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        Name: name.trim(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to insert journal: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error inserting journal:', error);
    throw error;
  }
}

// Update column visibility
export async function updateColumnVisibility(
  title: number,
  widgetID: number,
  columnName: string,
  isVisible: boolean
): Promise<boolean> {
  try {
    if (!title || title <= 0) {
      throw new Error('Invalid Title');
    }
    if (!widgetID || widgetID <= 0) {
      throw new Error('Invalid WidgetID');
    }
    if (!columnName || columnName.trim() === '') {
      throw new Error('Column name cannot be empty');
    }

    const response = await fetch(`${API_BASE}/UpdateTradingJournalColumnVisibility`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        Title: title,
        WidgetID: widgetID,
        Column_Name: columnName,
        Is_Visible: isVisible,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to update column visibility: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    return true;
  } catch (error) {
    console.error('Error updating column visibility:', error);
    throw error;
  }
}

// Save journal analysis
export async function saveJournalAnalysis(analysisData: JournalAnalysis): Promise<boolean> {
  try {
    if (!analysisData.JournalID || analysisData.JournalID <= 0) {
      throw new Error('Invalid JournalID');
    }
    if (!analysisData.TradeID || analysisData.TradeID <= 0) {
      throw new Error('Invalid TradeID');
    }

    const response = await fetch(`${API_BASE}/SaveJournalAnalysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        analysisData: analysisData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to save journal analysis: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    return true;
  } catch (error) {
    console.error('Error saving journal analysis:', error);
    throw error;
  }
}

// Get journal analysis
export async function getJournalAnalysis(journalID: number, tradeID: number): Promise<JournalAnalysis | null> {
  try {
    if (!journalID || journalID <= 0) {
      throw new Error('Invalid JournalID');
    }
    if (!tradeID || tradeID <= 0) {
      throw new Error('Invalid TradeID');
    }

    const response = await fetch(`${API_BASE}/GetJournalAnalysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        JournalID: journalID,
        TradeID: tradeID,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to get journal analysis: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // API returns: {"status": "success", "analysis": {...}}
    if (data && data.status === "success" && data.analysis) {
      return data.analysis;
    }
    
    // Fallback: Handle direct analysis object or other formats
    if (data && data.JournalID && data.TradeID) {
      return data;
    }
    
    // Return null if no analysis found
    return null;
  } catch (error) {
    console.error('Error getting journal analysis:', error);
    throw error;
  }
}

// Delete journal row
export async function deleteJournalRow(tradeID: number, title: number): Promise<boolean> {
  try {
    if (!tradeID || tradeID <= 0) {
      throw new Error('Invalid TradeID');
    }
    if (!title || title <= 0) {
      throw new Error('Invalid Title');
    }

    const payload = {
      TradeID: tradeID,
      Title: title,
    };

    const response = await fetch(`${API_BASE}/DeleteJournalRow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = `Failed to delete journal row: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (responseText) {
          errorMessage += ` - ${responseText}`;
        }
      }
      throw new Error(errorMessage);
    }

    return true;
  } catch (error) {
    console.error('Error deleting journal row:', error);
    throw error;
  }
}

// Delete journal
export async function deleteJournal(title: number): Promise<boolean> {
  try {
    if (!title || title <= 0) {
      throw new Error('Invalid Title');
    }

    const response = await fetch(`${API_BASE}/DeleteJournal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        DeleteJournal: title,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to delete journal: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    return true;
  } catch (error) {
    console.error('Error deleting journal:', error);
    throw error;
  }
}

// Save journal image (multipart/form-data)
export async function saveJournalImage(
  journalID: number,
  tradeID: number,
  imageFile: File
): Promise<{ imagePath: string; filename: string }> {
  try {
    if (!journalID || journalID <= 0) {
      throw new Error('Invalid JournalID');
    }
    if (!tradeID || tradeID <= 0) {
      throw new Error('Invalid TradeID');
    }
    if (!imageFile) {
      throw new Error('Image file is required');
    }

    const formData = new FormData();
    formData.append('JournalID', journalID.toString());
    formData.append('TradeID', tradeID.toString());
    formData.append('image', imageFile);

    const response = await fetch(`${API_BASE}/SaveJournalImage`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData, browser will set it with boundary
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to save journal image: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    // Handle response format: { status: "success", message: "...", imagePath: "...", filename: "..." }
    if (result.status === 'success' && result.imagePath) {
      return {
        imagePath: result.imagePath,
        filename: result.filename || result.imagePath.split('/').pop() || '',
      };
    }
    
    // Fallback: if response doesn't have expected format, return what we got
    return {
      imagePath: result.imagePath || result.path || '',
      filename: result.filename || result.imagePath?.split('/').pop() || '',
    };
  } catch (error) {
    console.error('Error saving journal image:', error);
    throw error;
  }
}

// Get journal images
export async function getJournalImages(journalID: number, tradeID: number): Promise<JournalImage[]> {
  try {
    if (!journalID || journalID <= 0) {
      throw new Error('Invalid JournalID');
    }
    if (!tradeID || tradeID <= 0) {
      throw new Error('Invalid TradeID');
    }

    const response = await fetch(`${API_BASE}/GetJournalImages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        JournalID: journalID,
        TradeID: tradeID,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to get journal images: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // API returns: {"status": "success", "images": [...]}
    if (data && data.status === "success" && Array.isArray(data.images)) {
      return data.images;
    }
    
    // Fallback: Handle other response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.images)) {
      return data.images;
    } else if (data && Array.isArray(data.data)) {
      return data.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error getting journal images:', error);
    throw error;
  }
}

// Create enhanced journal share
export async function createEnhancedJournalShare(
  journalID: number,
  widgetID: number,
  shareData: ShareData
): Promise<string | null> {
  try {
    if (!journalID || journalID <= 0) {
      throw new Error('Invalid JournalID');
    }
    if (!widgetID || widgetID <= 0) {
      throw new Error('Invalid WidgetID');
    }

    const response = await fetch(`${API_BASE}/CreateEnhancedJournalShare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        JournalID: journalID,
        WidgetID: widgetID,
        ShareData: shareData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to create journal share: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    // Return share URL or share ID
    return data.shareURL || data.shareId || null;
  } catch (error) {
    console.error('Error creating journal share:', error);
    throw error;
  }
}

