// Ticklist API service for CRUD operations
// Uses credentials: 'include' to let Next.js API route handle authentication from cookies

export interface TodoTask {
  ID: number;
  TaskName: string;
  Completed?: boolean; // Mapped from Status field (1 = true, 0 = false)
  Status?: number; // API may return Status: 1 (completed) or 0 (not completed)
  SortOrder?: number;
  WidgetID?: number;
  TaskListID?: number;
}

export interface TicklistTitle {
  TicklistID: number;
  Title?: string;
  WidgetID?: number;
}

export interface CreateTicklistPayload {
  TemplateId: number;
  ListName?: string;
  WidgetID?: string | number;
  TaskName?: string;
  TopPos?: number;
  LeftPos?: number;
  Height?: number;
  Width?: number;
  position?: string;
  zIndex?: number;
  CustomTabsID?: number;
}

export interface UpdateTicklistPayload {
  TaskListID: number;
  ListName?: string;
}

const API_BASE = '/api/pmt';

// Get all ticklist titles
export async function getTicklistTitles(): Promise<TicklistTitle[]> {
  try {
    const response = await fetch(`${API_BASE}/GetTicklistTitles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ticklist titles: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('getTicklistTitles: Raw API response:', JSON.stringify(data, null, 2));
    
    // Handle various response formats
    // API returns: {"success":true,"ticklists":[{"TaskListID":56,"ListName":""}]}
    if (data && data.success && Array.isArray(data.ticklists)) {
      console.log('getTicklistTitles: Found ticklists array, length:', data.ticklists.length);
      return data.ticklists.map((tl: any) => ({
        TicklistID: tl.TaskListID || tl.ID || tl.TicklistID,
        Title: tl.ListName || tl.Title || tl.Name || '',
        WidgetID: tl.WidgetID,
      }));
    } else if (Array.isArray(data)) {
      console.log('getTicklistTitles: Response is array, length:', data.length);
      return data.map((tl: any) => ({
        TicklistID: tl.TaskListID || tl.ID || tl.TicklistID,
        Title: tl.ListName || tl.Title || tl.Name || '',
        WidgetID: tl.WidgetID,
      }));
    } else if (data && Array.isArray(data.ticklists)) {
      console.log('getTicklistTitles: Response has ticklists array, length:', data.ticklists.length);
      return data.ticklists.map((tl: any) => ({
        TicklistID: tl.TaskListID || tl.ID || tl.TicklistID,
        Title: tl.ListName || tl.Title || tl.Name || '',
        WidgetID: tl.WidgetID,
      }));
    } else if (data && Array.isArray(data.data)) {
      console.log('getTicklistTitles: Response has data array, length:', data.data.length);
      return data.data.map((tl: any) => ({
        TicklistID: tl.TaskListID || tl.ID || tl.TicklistID,
        Title: tl.ListName || tl.Title || tl.Name || '',
        WidgetID: tl.WidgetID,
      }));
    }
    
    console.warn('getTicklistTitles: No array found in response, returning empty array');
    return [];
  } catch (error) {
    console.error('Error fetching ticklist titles:', error);
    throw error;
  }
}

// Get all tasks for a task list
export async function getTodoTasks(taskListID: number, widgetID?: number): Promise<TodoTask[]> {
  try {
    if (!taskListID || taskListID <= 0 || isNaN(taskListID)) {
      throw new Error('TaskListID is required');
    }

    // Build request body
    const requestBody: any = {
      TaskListID: taskListID,
    };
    
    // Include WidgetID if provided (API might require it)
    if (widgetID && widgetID > 0 && !isNaN(widgetID)) {
      requestBody.WidgetID = widgetID;
    }

    const url = `${API_BASE}/GetTodoTasks`;
    console.log('getTodoTasks: Fetching from:', url);
    console.log('getTodoTasks: Request body:', JSON.stringify(requestBody, null, 2));
    
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });
    } catch (fetchError: any) {
      console.error('getTodoTasks: Fetch error details:', {
        message: fetchError?.message,
        name: fetchError?.name,
        stack: fetchError?.stack,
        url,
      });
      throw new Error(`Network error: ${fetchError?.message || 'Failed to fetch'}. URL: ${url}`);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to fetch tasks: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
        console.error('getTodoTasks: API error response:', errorData);
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('getTodoTasks: Raw API response:', JSON.stringify(data, null, 2));
    
    // Handle both array and wrapped response formats
    // API might return: {"success":true,"tasks":[...]} or just an array
    let tasksArray: TodoTask[] = [];
    if (data && data.success && Array.isArray(data.tasks)) {
      console.log('getTodoTasks: Found tasks array in success response, length:', data.tasks.length);
      tasksArray = data.tasks;
    } else if (Array.isArray(data)) {
      console.log('getTodoTasks: Response is array, length:', data.length);
      tasksArray = data;
    } else if (data && Array.isArray(data.tasks)) {
      console.log('getTodoTasks: Response has tasks array, length:', data.tasks.length);
      tasksArray = data.tasks;
    } else if (data && Array.isArray(data.data)) {
      console.log('getTodoTasks: Response has data array, length:', data.data.length);
      tasksArray = data.data;
    } else if (data && data.success === false) {
      // API returned an error response
      const errorMsg = data.message || data.error || 'Unknown error';
      console.error('getTodoTasks: API returned error:', errorMsg);
      throw new Error(errorMsg);
    }
    
    // Map Status field to Completed boolean if needed
    return tasksArray.map((task) => ({
      ...task,
      Completed: task.Status !== undefined ? task.Status === 1 : task.Completed ?? false,
    }));
  } catch (error) {
    console.error('Error fetching todo tasks:', error);
    throw error;
  }
}

// Add a new task
export async function addTodoTask(
  widgetID: number,
  taskListID: number,
  taskName: string
): Promise<TodoTask | null> {
  try {
    if (!widgetID || widgetID <= 0) {
      throw new Error('Invalid WidgetID');
    }
    if (!taskListID || taskListID <= 0) {
      throw new Error('Invalid TaskListID');
    }
    if (!taskName || taskName.trim() === '') {
      throw new Error('Task name cannot be empty');
    }

    const response = await fetch(`${API_BASE}/AddTodoTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        WidgetID: widgetID,
        TaskListID: taskListID,
        TaskName: taskName.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add task: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error adding todo task:', error);
    throw error;
  }
}

// Update task name
export async function updateTodoTaskName(taskID: number, taskName: string): Promise<boolean> {
  try {
    if (!taskID || taskID <= 0) {
      throw new Error('Invalid task ID');
    }
    if (!taskName || taskName.trim() === '') {
      throw new Error('Task name cannot be empty');
    }

    const response = await fetch(`${API_BASE}/UpdateTodoTaskName`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ID: taskID,
        TaskName: taskName.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update task name: ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating task name:', error);
    throw error;
  }
}

// Update task order
export async function updateTicklistTaskOrder(
  taskOrders: Array<{ taskId: number; sortOrder: number }>
): Promise<boolean> {
  try {
    if (!taskOrders || taskOrders.length === 0) {
      throw new Error('Task orders array cannot be empty');
    }

    const response = await fetch(`${API_BASE}/UpdateTicklistTaskOrder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        UpdateTicklistTaskOrder: taskOrders,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update task order: ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating task order:', error);
    throw error;
  }
}

// Delete a task
export async function deleteTodoTask(taskID: number): Promise<boolean> {
  try {
    if (!taskID || taskID <= 0) {
      throw new Error('Invalid task ID');
    }

    const response = await fetch(`${API_BASE}/DeleteTodoTask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ID: taskID,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete task: ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting todo task:', error);
    throw error;
  }
}

// Update task status (completion toggle)
// Status: 1 = completed, 0 = not completed
export async function updateTaskStatus(taskID: number, status: number): Promise<boolean> {
  try {
    if (!taskID || taskID <= 0) {
      throw new Error('Invalid task ID');
    }
    if (status !== 0 && status !== 1) {
      throw new Error('Status must be 0 (not completed) or 1 (completed)');
    }

    const response = await fetch(`${API_BASE}/UpdateTaskStatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ID: taskID,
        Status: status,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update task status: ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
}

// Delete a ticklist
export async function deleteTicklist(ticklistID: number): Promise<boolean> {
  try {
    if (!ticklistID || ticklistID <= 0) {
      throw new Error('Invalid TicklistID');
    }

    const response = await fetch(`${API_BASE}/DeleteTicklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        TicklistID: ticklistID,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete ticklist: ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting ticklist:', error);
    throw error;
  }
}

// Create a new ticklist and add it to the dashboard
export async function createTicklistAndAddToDashboard(payload: CreateTicklistPayload): Promise<any> {
  try {
    if (!payload?.TemplateId || payload.TemplateId <= 0 || Number.isNaN(payload.TemplateId)) {
      throw new Error('TemplateId is required to create a ticklist');
    }

    const response = await fetch(`${API_BASE}/CreateTicklistAndAddToDashboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        TemplateId: payload.TemplateId,
        ListName: payload.ListName,
        WidgetID: payload.WidgetID,
        TaskName: payload.TaskName,
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
      throw new Error(
        `Failed to create ticklist: ${response.status} ${response.statusText}${
          errorText ? ` - ${errorText}` : ''
        }`
      );
    }

    const data = await response.json().catch(() => ({}));
    console.log('createTicklistAndAddToDashboard: Response', data);
    return data;
  } catch (error) {
    console.error('Error creating ticklist:', error);
    throw error;
  }
}

// Update an existing ticklist name
export async function updateTicklist(payload: UpdateTicklistPayload): Promise<boolean> {
  try {
    if (!payload?.TaskListID || payload.TaskListID <= 0 || Number.isNaN(payload.TaskListID)) {
      throw new Error('TaskListID is required to update a ticklist');
    }
    if (payload.ListName !== undefined && payload.ListName.trim() === '') {
      throw new Error('ListName cannot be empty');
    }

    const response = await fetch(`${API_BASE}/UpdateTicklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        TaskListID: payload.TaskListID,
        ListName: payload.ListName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Failed to update ticklist: ${response.status} ${response.statusText}${
          errorText ? ` - ${errorText}` : ''
        }`
      );
    }

    return true;
  } catch (error) {
    console.error('Error updating ticklist:', error);
    throw error;
  }
}

