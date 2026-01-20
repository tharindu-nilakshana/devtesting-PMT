import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WidgetSettingsSlideIn, type WidgetSettings } from "@/components/bloomberg-ui/WidgetSettingsSlideIn";
import {
  getTodoTasks,
  addTodoTask,
  updateTodoTaskName,
  deleteTodoTask,
  updateTaskStatus,
  getTicklistTitles,
  createTicklistAndAddToDashboard,
  updateTicklist,
  deleteTicklist,
  type TodoTask,
  type TicklistTitle,
} from "./ticklistApi";

interface TicklistProps {
  wgid?: string;
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, any>;
}

export default function Ticklist({ onSettings, onRemove, onFullscreen, settings, wgid }: TicklistProps) {
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [newTaskText, setNewTaskText] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticklists, setTicklists] = useState<TicklistTitle[]>([]);
  const [taskListID, setTaskListID] = useState<number | null>(null);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [initialTaskName, setInitialTaskName] = useState("");
  const [isRenamingList, setIsRenamingList] = useState(false);
  const [renameListValue, setRenameListValue] = useState("");
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<WidgetSettings>({
    taskListID: settings?.taskListID ? parseInt(String(settings.taskListID), 10) : undefined,
  });

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
        console.warn("Ticklist: Unable to read active template ID from localStorage", storageError);
      }
    }

    return null;
  }, [wgid, settings]);

  const refreshTicklistTitles = useCallback(async () => {
    try {
      setIsLoadingLists(true);
      const lists = await getTicklistTitles();
      setTicklists(lists);
      return lists;
    } catch (err) {
      console.error("Ticklist: Failed to load ticklists", err);
      setError((err as Error)?.message ?? "Failed to load ticklists");
      setTicklists([]);
      return [];
    } finally {
      setIsLoadingLists(false);
    }
  }, []);

  const getNumericSetting = useCallback((value: unknown, fallback: number) => {
    if (value === null || value === undefined) {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }, []);

  const currentTicklist = useMemo(
    () => ticklists.find((tl) => tl.TicklistID === taskListID),
    [ticklists, taskListID]
  );
  const hasLoggedInitialTemplate = useRef(false);

  const renderTaskText = useCallback((text: string) => {
    if (!text) {
      return null;
    }

    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={`link-${part}-${index}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline"
            onClick={(event) => event.stopPropagation()}
          >
            {part}
          </a>
        );
      }

      return (
        <span key={`text-${index}`} className="break-words">
          {part}
        </span>
      );
    });
  }, []);

  // Extract WidgetID from wgid prop
  const getWidgetID = useCallback((): number => {
    if (wgid) {
      const numericMatch = wgid.match(/\d+/);
      if (numericMatch) {
        const parsed = parseInt(numericMatch[0], 10);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }
    // Fallback: try to get from settings
    if (settings?.widgetID) {
      return parseInt(settings.widgetID, 10);
    }
    // Last resort: generate a placeholder (should not happen in production)
    console.warn('Could not determine WidgetID, using placeholder');
    return Date.now();
  }, [wgid, settings]);

  // Get TaskListID from settings or cached ticklists
  const getTaskListID = useCallback(async (): Promise<number | null> => {
    if (taskListID) {
      return taskListID;
    }

    // First, check if TaskListID is in settings
    if (settings?.taskListID) {
      const parsed = parseInt(settings.taskListID, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setTaskListID(parsed);
        return parsed;
      }
    }
    
      const widgetID = getWidgetID();
    let availableTicklists = ticklists;

    if (!availableTicklists.length) {
      console.log('Ticklist: No cached ticklists, fetching from API...');
      availableTicklists = await refreshTicklistTitles();
    }
      
    if (availableTicklists && availableTicklists.length > 0) {
      const matchingTicklist = availableTicklists.find((tl) => tl.WidgetID === widgetID);
      if (matchingTicklist?.TicklistID) {
          console.log('Ticklist: Found matching ticklist for WidgetID:', { widgetID, ticklistID: matchingTicklist.TicklistID });
        setTaskListID(matchingTicklist.TicklistID);
          return matchingTicklist.TicklistID;
        }
        
      const firstTicklist = availableTicklists[0];
      if (firstTicklist?.TicklistID) {
        console.log('Ticklist: Using first available ticklist ID:', firstTicklist.TicklistID);
        setTaskListID(firstTicklist.TicklistID);
        return firstTicklist.TicklistID;
        }
      }
      
      console.log('Ticklist: No ticklists found');
    setTaskListID(null);
      return null;
  }, [settings, getWidgetID, ticklists, refreshTicklistTitles, taskListID]);

  // Load tasks from API
  const loadTasks = useCallback(async (taskListIdOverride?: number | null) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get TaskListID - this will fetch from API if not in settings
      const resolvedTaskListID =
        typeof taskListIdOverride === 'number'
          ? taskListIdOverride
          : await getTaskListID();
      
      // If no taskListID, initialize empty ticklist
      if (!resolvedTaskListID) {
        console.log('Ticklist: No taskListID found, initializing empty ticklist');
        setTasks([]);
        setIsLoading(false);
        return;
      }
      
      // Validate TaskListID before making the request
      if (resolvedTaskListID <= 0 || isNaN(resolvedTaskListID)) {
        throw new Error(`Invalid TaskListID: ${resolvedTaskListID}. Please configure the widget settings.`);
      }
      
      if (!taskListID || taskListID !== resolvedTaskListID) {
        setTaskListID(resolvedTaskListID);
      }
      
      const widgetID = getWidgetID();
      console.log('Ticklist: Loading tasks for TaskListID:', resolvedTaskListID);
      console.log('Ticklist: WidgetID:', widgetID);
      console.log('Ticklist: Settings:', settings);
      const tasksData = await getTodoTasks(resolvedTaskListID, widgetID);
      console.log('Ticklist: Loaded tasks:', tasksData);
      setTasks(tasksData);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      // Initialize empty tasks on error
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [getTaskListID, getWidgetID, settings, taskListID]);

  const handleSelectTicklist = useCallback(
    async (value: string) => {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed) || parsed <= 0) {
        return;
      }
      setTaskListID(parsed);
      await loadTasks(parsed);
    },
    [loadTasks]
  );

  const handleCreateTicklist = useCallback(async () => {
    if (isSaving) return;
    const templateId = getTemplateId();
    if (!templateId) {
      setError('Unable to determine dashboard template ID for this widget.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const response = await createTicklistAndAddToDashboard({
        TemplateId: templateId,
        ListName: newListName.trim() || undefined,
        WidgetID: wgid ?? settings?.widgetID ?? undefined,
        TaskName: initialTaskName.trim() || undefined,
        TopPos: getNumericSetting(settings?.TopPos ?? settings?.topPos, 0),
        LeftPos: getNumericSetting(settings?.LeftPos ?? settings?.leftPos, 0),
        Height: getNumericSetting(settings?.Height ?? settings?.height, 200),
        Width: getNumericSetting(settings?.Width ?? settings?.width, 300),
        position: typeof settings?.position === 'string' ? settings.position : '',
        zIndex: getNumericSetting(settings?.zIndex, 0),
        CustomTabsID: getNumericSetting(settings?.customTabsID, 0),
      });

      const newTaskListID =
        response?.TicklistID ??
        response?.TaskListID ??
        response?.ticklist?.TicklistID ??
        response?.ticklist?.TaskListID ??
        response?.data?.TicklistID ??
        response?.data?.TaskListID ??
        null;

      const lists = await refreshTicklistTitles();
      const fallbackId = newTaskListID ?? lists[0]?.TicklistID ?? null;

      if (fallbackId) {
        setTaskListID(fallbackId);
        await loadTasks(fallbackId);
      } else {
        await loadTasks();
      }

      setIsCreatingList(false);
      setNewListName('');
      setInitialTaskName('');
    } catch (err) {
      console.error('Error creating ticklist:', err);
      setError(err instanceof Error ? err.message : 'Failed to create ticklist');
    } finally {
      setIsSaving(false);
    }
  }, [
    getNumericSetting,
    getTemplateId,
    initialTaskName,
    isSaving,
    loadTasks,
    newListName,
    refreshTicklistTitles,
    settings,
    wgid,
  ]);

  const handleCreateTicklistWrapper = useCallback(async () => {
    await handleCreateTicklist();
    // Refresh ticklists after creation
    await refreshTicklistTitles();
  }, [handleCreateTicklist, refreshTicklistTitles]);

  const handleSaveSettings = useCallback((newSettings: WidgetSettings) => {
    setLocalSettings(newSettings);
    if (newSettings.taskListID && newSettings.taskListID !== taskListID) {
      setTaskListID(newSettings.taskListID);
      loadTasks(newSettings.taskListID);
    }
  }, [taskListID, loadTasks]);

  const handleStartRename = useCallback(() => {
    if (!taskListID) return;
    setRenameListValue(currentTicklist?.Title ?? '');
    setIsRenamingList(true);
    setIsCreatingList(false);
  }, [taskListID, currentTicklist]);

  const handleRenameTicklist = useCallback(async () => {
    if (!taskListID) {
      setError('No ticklist selected to rename.');
      return;
    }
    if (!renameListValue.trim()) {
      setError('List name cannot be empty.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await updateTicklist({
        TaskListID: taskListID,
        ListName: renameListValue.trim(),
      });
      await refreshTicklistTitles();
      setIsRenamingList(false);
    } catch (err) {
      console.error('Error renaming ticklist:', err);
      setError(err instanceof Error ? err.message : 'Failed to rename ticklist');
    } finally {
      setIsSaving(false);
    }
  }, [renameListValue, refreshTicklistTitles, setError, taskListID]);

  const handleDeleteList = useCallback(async (ticklistId: number) => {
    if (ticklists.length <= 1) {
      setError('Cannot delete the last ticklist.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await deleteTicklist(ticklistId);
      await refreshTicklistTitles();
      
      // If deleted list was selected, switch to first available
      if (taskListID === ticklistId) {
        const remaining = ticklists.filter(tl => tl.TicklistID !== ticklistId);
        if (remaining.length > 0) {
          setTaskListID(remaining[0].TicklistID);
          await loadTasks(remaining[0].TicklistID);
        } else {
          setTaskListID(null);
          setTasks([]);
        }
      }
    } catch (err) {
      console.error('Error deleting ticklist:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete ticklist');
    } finally {
      setIsSaving(false);
    }
  }, [taskListID, ticklists, refreshTicklistTitles, loadTasks]);

  // Load tasks on mount and when dependencies change
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    refreshTicklistTitles();
  }, [refreshTicklistTitles]);

  useEffect(() => {
    if (!isSettingsPanelOpen) {
      setIsCreatingList(false);
      setIsRenamingList(false);
      setNewListName("");
      setInitialTaskName("");
      setRenameListValue("");
    }
  }, [isSettingsPanelOpen]);

  useEffect(() => {
    if (taskListID) return;
    (async () => {
      const initialId = await getTaskListID();
      if (initialId) {
        setTaskListID(initialId);
      }
    })();
  }, [getTaskListID, taskListID]);

  useEffect(() => {
    if (hasLoggedInitialTemplate.current) {
      return;
    }
    const resolvedTemplateId = getTemplateId();
    console.log("[Ticklist] Initial template ID:", resolvedTemplateId ?? "unknown");
    hasLoggedInitialTemplate.current = true;
  }, [getTemplateId]);

  const handleAddTask = async () => {
    if (!newTaskText.trim() || isSaving) return;

    try {
      setIsSaving(true);
      setError(null);
      const widgetID = getWidgetID();
      const taskListID = await getTaskListID();
      
      if (!taskListID) {
        throw new Error('No TaskListID available. Please configure the widget settings.');
      }
      
      const newTask = await addTodoTask(widgetID, taskListID, newTaskText.trim());
      
      if (newTask) {
        setTasks([...tasks, newTask]);
        setNewTaskText("");
        setIsAddingTask(false);
      } else {
        // If API doesn't return the new task, reload the list
        await loadTasks();
        setNewTaskText("");
        setIsAddingTask(false);
      }
    } catch (err) {
      console.error('Error adding task:', err);
      setError(err instanceof Error ? err.message : 'Failed to add task');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTask = async (id: number) => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Find the task to get current status
      const task = tasks.find((t) => t.ID === id);
      if (!task) {
        throw new Error('Task not found');
      }

      // Toggle completion status: 1 = completed, 0 = not completed
      const currentStatus = task.Completed ? 1 : 0;
      const newStatus = currentStatus === 1 ? 0 : 1;

      // Update on server
      await updateTaskStatus(id, newStatus);

      // Update locally
      setTasks(
        tasks.map((t) =>
          t.ID === id ? { ...t, Completed: newStatus === 1 } : t
        )
      );
    } catch (err) {
      console.error('Error toggling task status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task status');
      // Reload tasks to sync with server
      await loadTasks();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      setIsSaving(true);
      setError(null);
      await deleteTodoTask(id);
      setTasks(tasks.filter((task) => task.ID !== id));
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      // Reload tasks to sync with server
      await loadTasks();
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (task: TodoTask) => {
    setEditingTaskId(task.ID);
    setEditingText(task.TaskName);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editingText.trim() || isSaving) return;

    try {
      setIsSaving(true);
      setError(null);
      await updateTodoTaskName(id, editingText.trim());
      setTasks(
        tasks.map((task) =>
          task.ID === id ? { ...task, TaskName: editingText.trim() } : task
        )
      );
      setEditingTaskId(null);
      setEditingText("");
    } catch (err) {
      console.error('Error updating task:', err);
      setError(err instanceof Error ? err.message : 'Failed to update task');
      // Reload tasks to sync with server
      await loadTasks();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingText("");
  };

  const displayTitle = currentTicklist && currentTicklist.Title?.trim()
    ? currentTicklist.Title
    : currentTicklist
    ? `List ${currentTicklist.TicklistID}`
    : "Ticklist";

  return (
    <div className="relative flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
      <WidgetHeader
        title={displayTitle}
        onSettings={() => setIsSettingsPanelOpen(true)}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          onClick={() => setIsAddingTask(true)}
          title="Add Task"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </WidgetHeader>

      <div className="flex-1 overflow-auto">
        {/* Error Message */}
        {error && (
          <div className="px-3 py-2 bg-destructive/10 border-b border-destructive/20">
            <p className="text-lg text-destructive">{error}</p>
          </div>
        )}

        {/* Add New Task Input */}
        {isAddingTask && (
          <div className="px-3 py-2 border-b border-border bg-widget-header/50">
            <div className="flex items-center gap-2">
              <Input
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSaving) {
                    handleAddTask();
                  } else if (e.key === "Escape") {
                    setIsAddingTask(false);
                    setNewTaskText("");
                  }
                }}
                placeholder="Enter task name..."
                className="h-8 bg-widget-body border-border text-lg"
                autoFocus
                disabled={isSaving}
              />
              <Button
                size="sm"
                onClick={handleAddTask}
                disabled={isSaving || !newTaskText.trim()}
                className="h-8 px-3 bg-primary hover:bg-primary/90"
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTaskText("");
                }}
                disabled={isSaving}
                className="h-8 px-2"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-lg">
              Loading tasks...
            </div>
          ) : tasks.length === 0 && !isAddingTask ? (
            <div className="p-8 text-center text-muted-foreground text-lg">
              No tasks yet. Click the + button to add a task.
            </div>
          ) : (
            tasks.map((task) => {
              const isCompleted = task.Completed ?? false;
              return (
                <div
                  key={task.ID}
                  className="group flex items-center gap-3 px-3 py-2.5 border-b border-border hover:bg-widget-header/30 transition-colors"
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleTask(task.ID)}
                    disabled={isSaving}
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all disabled:opacity-50 ${
                      isCompleted
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/50 hover:border-primary/50"
                    }`}
                  >
                    {isCompleted && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Task Text */}
                  {editingTaskId === task.ID ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !isSaving) {
                            handleSaveEdit(task.ID);
                          } else if (e.key === "Escape") {
                            handleCancelEdit();
                          }
                        }}
                        className="h-7 bg-widget-body border-border text-lg"
                        autoFocus
                        disabled={isSaving}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(task.ID)}
                        disabled={isSaving || !editingText.trim()}
                        className="h-7 px-2 bg-primary hover:bg-primary/90 text-lg"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="h-7 px-2"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span
                        className={`flex-1 text-lg cursor-pointer ${
                          isCompleted
                            ? "text-muted-foreground/70 line-through"
                            : "text-foreground"
                        }`}
                        onClick={() => handleStartEdit(task)}
                      >
                        {renderTaskText(task.TaskName)}
                      </span>

                      {/* Delete Button - Shown on Hover */}
                      <button
                        onClick={() => handleDeleteTask(task.ID)}
                        disabled={isSaving}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity disabled:opacity-50"
                        title="Delete task"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer - Task Count */}
      <div className="px-3 py-2 border-t border-border bg-widget-header">
        <div className="flex items-center justify-between text-base text-muted-foreground">
          <span>
            {tasks.filter((t) => t.Completed).length} of {tasks.length} completed
          </span>
          {tasks.length > 0 && (
            <span>
              {Math.round(
                (tasks.filter((t) => t.Completed).length / tasks.length) * 100
              )}
              % done
            </span>
          )}
        </div>
      </div>

      <WidgetSettingsSlideIn
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        widgetType="ticklist"
        widgetPosition={wgid || ""}
        widgetInstanceId={wgid}
        currentSettings={localSettings}
        onSave={handleSaveSettings}
        ticklistHandlers={{
          ticklists,
          taskListID,
          isLoadingLists,
          isSaving,
          isCreatingList,
          newListName,
          initialTaskName,
          onSelectTicklist: handleSelectTicklist,
          onCreateTicklist: handleCreateTicklistWrapper,
          onDeleteList: handleDeleteList,
          onSetIsCreatingList: setIsCreatingList,
          onSetNewListName: setNewListName,
          onSetInitialTaskName: setInitialTaskName,
          onRefreshTicklists: refreshTicklistTitles,
          getTemplateId,
          getNumericSetting,
          wgid,
          widgetSettings: settings,
        }}
      />
    </div>
  );
}

