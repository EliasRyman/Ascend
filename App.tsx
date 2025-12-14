import React, { useState, useEffect, useContext } from 'react';
import { 
  Check, 
  Menu, 
  X, 
  Star, 
  ArrowRight, 
  ExternalLink, 
  Calendar, 
  ListTodo, 
  BarChart3, 
  Clock, 
  RefreshCw,
  Layout,
  Target,
  MoveRight, 
  Play,
  Sun,
  Moon,
  Plus,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Type,
  User,
  GripVertical,
  Loader2,
  LogOut,
  CalendarCheck,
  Trash2,
  GripHorizontal,
  Settings,
  Globe,
  LayoutDashboard,
  Activity,
  Unlink
} from 'lucide-react';
import {
  initGoogleApi,
  initGoogleIdentity,
  requestAccessToken,
  revokeAccessToken,
  getGoogleUserInfo,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  fetchGoogleCalendarEvents,
  syncCalendarEvents,
  isSignedIn,
  saveGoogleUser,
  loadSavedGoogleUser
} from './googleCalendar';
import {
  signIn,
  signUp,
  signOut,
  signInWithGoogle,
  onAuthStateChange,
  getCurrentUser
} from './supabase';
import {
  loadTasks,
  createTask,
  deleteTask as deleteTaskFromDb,
  loadScheduleBlocks,
  createScheduleBlock,
  deleteScheduleBlock,
  loadUserSettings,
  saveUserSettings
} from './database';

// --- Context ---

const ThemeContext = React.createContext({
  isDark: false,
  toggleTheme: () => {}
});

const useTheme = () => useContext(ThemeContext);

interface ScheduleBlock {
  id: number | string;
  title: string;
  tag: string;
  start: number;
  duration: number;
  color: string;
  textColor: string;
  isGoogle?: boolean;
  googleEventId?: string;
}

interface Task {
  id: number | string;
  title: string;
  tag: string | null;
  tagColor: string | null;
  time: string | null;
  completed: boolean;
}

// --- Data Models for Demo ---

const INITIAL_TASKS: Task[] = [
  { id: 1, title: "Love the demo!", tag: "demo", tagColor: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300", time: "12:00 PM", completed: true },
  { id: 2, title: "Move this timebox!", tag: "task", tagColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", time: "09:00 AM", completed: false },
  { id: 3, title: "Drag and drop me!", tag: "move", tagColor: "bg-[#6F00FF]/10 text-[#6F00FF] dark:bg-[#6F00FF]/30 dark:text-violet-200", time: null, completed: false },
];

const LATER_TASKS: Task[] = [
  { id: 4, title: "Drop me in the later list!", tag: "later", tagColor: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", time: null, completed: false },
  { id: 5, title: "I'm a sub to-do!", tag: "later", tagColor: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", time: null, completed: true },
  { id: 6, title: "Test task for future", tag: null, tagColor: null, time: null, completed: false },
];

const TIME_BLOCKS: ScheduleBlock[] = [
  { 
    id: 1, 
    title: "Move this timebox!", 
    tag: "task", 
    start: 9, // 9:00 AM
    duration: 2, // 2 hours
    color: "bg-amber-400/90 dark:bg-amber-600/90 border-amber-500",
    textColor: "text-amber-950 dark:text-amber-50"
  },
  { 
    id: 2, 
    title: "Love the demo!", 
    tag: "demo", 
    start: 12, // 12:00 PM
    duration: 1, // 1 hour
    color: "bg-emerald-300/90 dark:bg-emerald-600/90 border-emerald-400",
    textColor: "text-emerald-950 dark:text-emerald-50"
  }
];

// Simulated external events from Google Calendar
const EXTERNAL_GOOGLE_EVENTS: ScheduleBlock[] = [
  { 
    id: 'g1', 
    title: "Team Standup", 
    tag: "meeting", 
    start: 10, 
    duration: 0.5, 
    color: "bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800",
    textColor: "text-blue-700 dark:text-blue-300",
    isGoogle: true
  },
  { 
    id: 'g2', 
    title: "Product Review", 
    tag: "meeting", 
    start: 14, 
    duration: 1, 
    color: "bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800",
    textColor: "text-blue-700 dark:text-blue-300",
    isGoogle: true
  }
];

// --- Timebox App Components ---

const TaskItem = ({ task, onDragStart, onDelete }) => (
  <div 
    draggable="true"
    onDragStart={(e) => onDragStart(e, task)}
    className={`group flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-[#6F00FF]/50 cursor-grab active:cursor-grabbing transition-all shadow-sm ${task.completed ? 'opacity-60' : ''}`}
  >
    <div className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${task.completed ? 'bg-[#6F00FF] border-[#6F00FF]' : 'border-slate-300 dark:border-slate-600 hover:border-[#6F00FF]'}`}>
      {task.completed && <Check size={14} className="text-white" />}
    </div>
    <span className={`flex-1 text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
      {task.title}
    </span>
    {task.tag && (
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${task.tagColor}`}>
        {task.tag}
      </span>
    )}
    {task.time && (
      <span className="text-[10px] text-slate-400 font-mono border border-slate-100 dark:border-slate-800 px-1 rounded">
        {task.time}
      </span>
    )}
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300">
            <GripVertical size={16} />
        </button>
        <button 
            onClick={() => onDelete(task.id)}
            className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400"
        >
            <X size={16} />
        </button>
    </div>
  </div>
);

const TimeboxApp = ({ onBack, user, onLogin, onLogout }) => {
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'timebox' | 'habittracker'>('timebox');
  const [isLaterOpen, setIsLaterOpen] = useState(true);
  
  // State for Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    timeFormat: '12h', // '12h' | '24h'
    timezone: 'Local'
  });

  // Google Calendar State
  const [googleAccount, setGoogleAccount] = useState<{
    email: string;
    name: string;
    picture: string;
  } | null>(null);
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);
  const [googleApiReady, setGoogleApiReady] = useState(false);

  // Initialize Google APIs on mount
  useEffect(() => {
    const initGoogle = async () => {
      try {
        await initGoogleApi();
        
        // Check for saved Google user (persisted connection)
        const savedUser = loadSavedGoogleUser();
        if (savedUser) {
          if (isSignedIn()) {
            console.log('Restored Google Calendar connection');
            setGoogleAccount(savedUser);
          } else {
            // Token expired or invalid, clear saved user
            console.log('Saved Google user found but token is invalid, clearing...');
            revokeAccessToken(); // This clears localStorage
          }
        }
        
        initGoogleIdentity(async (token) => {
          // Token received, get user info
          const userInfo = await getGoogleUserInfo();
          if (userInfo) {
            setGoogleAccount(userInfo);
            saveGoogleUser(userInfo);
          }
          setIsGoogleConnecting(false);
        });
        setGoogleApiReady(true);
      } catch (error) {
        console.error('Failed to initialize Google APIs:', error);
      }
    };
    initGoogle();
  }, []);

  // Auto-sync flag to prevent multiple syncs
  const [hasAutoSynced, setHasAutoSynced] = useState(false);

  const handleConnectGoogle = () => {
    setIsGoogleConnecting(true);
    requestAccessToken();
  };

  const handleDisconnectGoogle = () => {
    revokeAccessToken();
    setGoogleAccount(null);
  };

  // State for Lists and Schedule
  const [activeTasks, setActiveTasks] = useState<Task[]>(INITIAL_TASKS);
  const [laterTasks, setLaterTasks] = useState<Task[]>(LATER_TASKS);
  const [schedule, setSchedule] = useState<ScheduleBlock[]>(TIME_BLOCKS);
  const [newTaskInput, setNewTaskInput] = useState("");
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load data from database on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        const [activeData, laterData, blocksData, userSettings] = await Promise.all([
          loadTasks('active'),
          loadTasks('later'),
          loadScheduleBlocks(),
          loadUserSettings()
        ]);

        if (activeData.length > 0 || laterData.length > 0) {
          setActiveTasks(activeData.length > 0 ? activeData.map(t => ({
            id: t.id,
            title: t.title,
            tag: t.tag,
            tagColor: t.tagColor,
            time: t.time,
            completed: t.completed
          })) : INITIAL_TASKS);
          
          setLaterTasks(laterData.length > 0 ? laterData.map(t => ({
            id: t.id,
            title: t.title,
            tag: t.tag,
            tagColor: t.tagColor,
            time: t.time,
            completed: t.completed
          })) : LATER_TASKS);
        }

        if (blocksData.length > 0) {
          setSchedule(blocksData);
        }

        // Load user settings
        if (userSettings) {
          setSettings({
            timeFormat: userSettings.timeFormat || '12h',
            timezone: userSettings.timezone || 'Local'
          });
        }

        setIsDataLoaded(true);
      } catch (error) {
        console.error('Error loading data:', error);
        setIsDataLoaded(true);
      }
    };

    loadData();
  }, [user]);
  
  // Drag State
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverList, setDragOverList] = useState(null);
  const [dragOverHour, setDragOverHour] = useState(null);

  // Resize State
  const [resizingBlockId, setResizingBlockId] = useState<number | string | null>(null);
  const [resizeStartY, setResizeStartY] = useState<number | null>(null);
  const [resizeStartDuration, setResizeStartDuration] = useState<number | null>(null);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCalendarSynced, setIsCalendarSynced] = useState(false);

  // Notification State
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Auto-hide notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Save settings when they change
  useEffect(() => {
    if (!user || !isDataLoaded) return;
    
    const saveSettings = async () => {
      await saveUserSettings({
        timeFormat: settings.timeFormat as '12h' | '24h',
        timezone: settings.timezone
      });
    };
    
    saveSettings();
  }, [settings, user, isDataLoaded]);

  // Time labels from 7 AM to 3 PM for the demo view
  const timeLabels = [7, 8, 9, 10, 11, 12, 13, 14, 15];

  // --- Handlers ---

  // Helper to format decimal time (e.g. 9.5 -> 9:30 AM or 09:30)
  const formatTime = (decimalTime: number, compact = false) => {
      const hours = Math.floor(decimalTime);
      const minutes = Math.round((decimalTime - hours) * 60);
      const displayMinutes = minutes.toString().padStart(2, '0');

      if (settings.timeFormat === '24h') {
          const displayHours = hours.toString().padStart(2, '0');
          return `${displayHours}:${displayMinutes}`;
      }

      // 12h format
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours > 12 ? hours - 12 : (hours === 0 || hours === 24 ? 12 : hours);
      
      // If compact (for axis) and minutes are 0, hide minutes
      if (compact && minutes === 0) {
          return `${displayHours} ${period}`;
      }
      return `${displayHours}:${displayMinutes} ${period}`;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingBlockId !== null && resizeStartY !== null && resizeStartDuration !== null) {
        const deltaY = e.clientY - resizeStartY;
        const deltaHours = deltaY / 96; // 96px per hour
        let newDuration = resizeStartDuration + deltaHours;
        
        // Snap to 15 mins (0.25 hours)
        newDuration = Math.round(newDuration * 4) / 4;
        
        // Minimum duration 15 mins
        if (newDuration < 0.25) newDuration = 0.25;

        setSchedule(prev => prev.map(block => 
          block.id === resizingBlockId ? { ...block, duration: newDuration } : block
        ));
      }
    };

    const handleMouseUp = async () => {
      if (resizingBlockId !== null) {
        // Get the resized block
        const resizedBlock = schedule.find(b => b.id === resizingBlockId);
        
        // Sync duration to Google Calendar if connected
        if (resizedBlock?.googleEventId && googleAccount && isSignedIn()) {
          try {
            await updateGoogleCalendarEvent(
              resizedBlock.googleEventId,
              resizedBlock.title,
              resizedBlock.start,
              resizedBlock.duration,
              new Date()
            );
            console.log('Updated Google Calendar event duration');
          } catch (error) {
            console.error('Failed to update Google Calendar event:', error);
          }
        }

        setResizingBlockId(null);
        setResizeStartY(null);
        setResizeStartDuration(null);
      }
    };

    if (resizingBlockId !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingBlockId, resizeStartY, resizeStartDuration, schedule, googleAccount]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskInput.trim()) {
        // Create task in database
        const savedTask = await createTask(newTaskInput.trim(), 'active');
        
        if (savedTask) {
          const newTask: Task = {
              id: savedTask.id,
              title: savedTask.title,
              tag: savedTask.tag,
              tagColor: savedTask.tagColor,
              time: savedTask.time,
              completed: savedTask.completed
          };
          setActiveTasks([...activeTasks, newTask]);
        } else {
          // Fallback to local-only if not logged in
          const newTask: Task = {
              id: Date.now(),
              title: newTaskInput.trim(),
              tag: null,
              tagColor: null,
              time: null,
              completed: false
          };
          setActiveTasks([...activeTasks, newTask]);
        }
        setNewTaskInput("");
    }
  };

  const handleDeleteTask = async (taskId: number | string, listType: string) => {
    // Delete from database
    await deleteTaskFromDb(String(taskId));
      if (listType === 'active') {
          setActiveTasks(activeTasks.filter(t => t.id !== taskId));
      } else {
          setLaterTasks(laterTasks.filter(t => t.id !== taskId));
      }
  };

  const handleDeleteBlock = async (blockId: number | string) => {
      // Find the block to get Google event ID
      const block = schedule.find(b => b.id === blockId);
      
      // Delete from Google Calendar if it has a googleEventId
      if (block?.googleEventId && googleAccount && isSignedIn()) {
        try {
          await deleteGoogleCalendarEvent(block.googleEventId);
          console.log('Deleted event from Google Calendar:', block.googleEventId);
        } catch (error) {
          console.error('Failed to delete from Google Calendar:', error);
          // Continue with local delete even if Google delete fails
        }
      }

      // Delete from database
      await deleteScheduleBlock(String(blockId));
      setSchedule(schedule.filter(b => b.id !== blockId));
  };

  const handleSync = async () => {
    if (!user) {
      setNotification({ type: 'error', message: 'Please sign in to sync your calendar!' });
      return;
    }

    if (!googleAccount) {
      setNotification({ type: 'info', message: 'Connect Google Calendar in Settings first' });
      return;
    }
    
    setIsSyncing(true);
    
    try {
      // Prepare local blocks for sync comparison
      const localBlocksForSync = schedule
        .filter(b => b.googleEventId) // Only blocks linked to Google
        .map(b => ({
          id: b.id,
          title: b.title,
          start: b.start,
          duration: b.duration,
          googleEventId: b.googleEventId,
        }));

      // Fetch events from BOTH Ascend calendar AND primary Google Calendar
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      // Get all Google Calendar events (both primary and Ascend)
      const googleEvents = await fetchGoogleCalendarEvents(startOfDay, endOfDay, true, true);
      
      // Perform two-way sync
      const syncResult = await syncCalendarEvents(localBlocksForSync, new Date());

      setSchedule(prev => {
        let updated = [...prev];
        
        // Get existing Google event IDs to avoid duplicates
        const existingGoogleIds = new Set(
          prev.filter(b => b.googleEventId).map(b => b.googleEventId)
        );

        // Add ALL Google Calendar events (from both primary and Ascend calendars)
        const allNewBlocks = googleEvents
          .filter(event => !existingGoogleIds.has(event.id))
          .map(event => ({
            id: event.id,
            title: event.title,
            tag: 'google',
            start: event.start,
            duration: event.duration,
            color: event.isFromAscendCalendar 
              ? 'bg-indigo-400/90 dark:bg-indigo-600/90 border-indigo-500'
              : 'bg-blue-400/90 dark:bg-blue-600/90 border-blue-500',
            textColor: event.isFromAscendCalendar
              ? 'text-indigo-950 dark:text-indigo-50'
              : 'text-blue-950 dark:text-blue-50',
            isGoogle: true,
            googleEventId: event.id,
          }));
        updated = [...updated, ...allNewBlocks];

        // Update changed events from syncResult
        for (const { localId, event } of syncResult.toUpdate) {
          updated = updated.map(b => 
            b.id === localId 
              ? { ...b, title: event.title, start: event.start, duration: event.duration }
              : b
          );
        }

        // Remove deleted events
        const toRemoveSet = new Set(syncResult.toRemove);
        updated = updated.filter(b => !toRemoveSet.has(String(b.id)));

        return updated;
      });

      // Show sync results
      const { stats } = syncResult;
      const total = stats.added + stats.updated + stats.removed;
      if (total > 0) {
        setNotification({ 
          type: 'success', 
          message: `Synced: ${stats.added} added, ${stats.updated} updated, ${stats.removed} removed` 
        });
      } else {
        setNotification({ type: 'success', message: 'Calendar is up to date!' });
      }

      setIsCalendarSynced(true);

    } catch (error) {
      console.error('Sync failed:', error);
      setNotification({ type: 'error', message: 'Failed to sync with Google Calendar' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync when Google account is connected (only once per session)
  useEffect(() => {
    if (googleAccount && isSignedIn() && user && isDataLoaded && !hasAutoSynced && !isSyncing) {
      console.log('Auto-syncing Google Calendar...');
      setHasAutoSynced(true);
      handleSync();
    }
  }, [googleAccount, user, isDataLoaded, hasAutoSynced, isSyncing]);

  const handleTaskDragStart = (e, task, sourceList) => {
    setDraggedItem({ task, sourceList });
    e.dataTransfer.setData('application/json', JSON.stringify({ task, sourceList }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleListDragOver = (e, listId) => {
    e.preventDefault(); 
    if (dragOverList !== listId) setDragOverList(listId);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleListDrop = (e, targetListId) => {
    e.preventDefault();
    setDragOverList(null);
    if (!draggedItem) return;
    const { task, sourceList } = draggedItem;
    if (sourceList === targetListId) return;

    if (sourceList === 'active') {
        setActiveTasks(prev => prev.filter(t => t.id !== task.id));
    } else {
        setLaterTasks(prev => prev.filter(t => t.id !== task.id));
    }

    const newTask = { ...task };
    if (targetListId !== 'active') newTask.time = null;

    if (targetListId === 'active') {
        setActiveTasks(prev => [...prev, newTask]);
    } else {
        setLaterTasks(prev => [...prev, newTask]);
    }
    setDraggedItem(null);
  };

  const handleHourDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
  };

  const handleHourDrop = async (e, hour) => {
      e.preventDefault();
      setDragOverHour(null);
      if (!draggedItem) return;
      const { task } = draggedItem;

      const blockData = {
          title: task.title,
          tag: task.tag || 'work',
          start: hour,
          duration: 1,
          color: "bg-indigo-400/90 dark:bg-indigo-600/90 border-indigo-500", 
          textColor: "text-indigo-950 dark:text-indigo-50",
          isGoogle: googleAccount !== null
      };

      // Save to database
      const savedBlock = await createScheduleBlock(blockData);
      
      const newBlock: ScheduleBlock = savedBlock ? {
          ...savedBlock
      } : {
          id: Date.now(),
          ...blockData
      };

      setSchedule(prev => [...prev, newBlock]);
      
      // Update the task to reflect it has been scheduled
      if (draggedItem.sourceList === 'active') {
          const timeString = formatTime(hour);
          setActiveTasks(prev => prev.map(t => t.id === task.id ? { ...t, time: timeString } : t));
      }
      setDraggedItem(null);

      // Push to Google Calendar if connected
      if (googleAccount && isSignedIn()) {
          try {
              const eventId = await createGoogleCalendarEvent(
                  task.title,
                  hour,
                  newBlock.duration, // Use actual block duration
                  new Date(),
                  task.tag || 'work' // Pass tag for color coding
              );
              console.log('Created Google Calendar event:', eventId);
              // Update the block with the Google event ID
              setSchedule(prev => prev.map(b => 
                  b.id === newBlock.id 
                      ? { ...b, googleEventId: eventId }
                      : b
              ));
              setNotification({ type: 'success', message: `Added "${task.title}" to Google Calendar` });
          } catch (error: any) {
              console.error('Failed to create Google Calendar event:', error);
              const errorMessage = error?.message || 'Unknown error';
              if (errorMessage.includes('token expired') || errorMessage.includes('Not signed in')) {
                setNotification({ type: 'error', message: 'Google session expired. Please reconnect in Settings.' });
                // Clear the stale Google account
                setGoogleAccount(null);
              } else {
                setNotification({ type: 'error', message: `Failed to add to Google Calendar: ${errorMessage}` });
              }
          }
      }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Toast Notification */}
      {notification && (
        <div 
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
            notification.type === 'success' 
              ? 'bg-emerald-500 text-white' 
              : notification.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-blue-500 text-white'
          }`}
        >
          {notification.type === 'success' && <CalendarCheck size={18} />}
          {notification.type === 'error' && <X size={18} />}
          {notification.type === 'info' && <Calendar size={18} />}
          <span className="text-sm font-medium">{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* App Header */}
      <header className="relative h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 bg-[#6F00FF] rounded-lg flex items-center justify-center text-white shadow-md shadow-violet-600/20">
              <Target size={18} strokeWidth={3} />
            </div>
            <span className="font-bold text-lg tracking-tight">Ascend<span className="text-[#6F00FF]">.</span></span>
          </button>
        </div>

        {/* Center Navigation Tabs */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-8 font-bold text-xl tracking-tight">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`transition-colors uppercase ${activeTab === 'dashboard' ? 'text-[#6F00FF]' : 'text-slate-300 hover:text-slate-500 dark:text-slate-700 dark:hover:text-slate-500'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('timebox')}
            className={`transition-colors uppercase ${activeTab === 'timebox' ? 'text-[#6F00FF]' : 'text-slate-300 hover:text-slate-500 dark:text-slate-700 dark:hover:text-slate-500'}`}
          >
            Timebox
          </button>
          <button 
            onClick={() => setActiveTab('habittracker')}
            className={`transition-colors uppercase ${activeTab === 'habittracker' ? 'text-[#6F00FF]' : 'text-slate-300 hover:text-slate-500 dark:text-slate-700 dark:hover:text-slate-500'}`}
          >
            Habittracker
          </button>
        </div>

        <div className="flex items-center gap-3">
           <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Settings">
             <Settings size={18} />
           </button>

           <button onClick={toggleTheme} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
             {isDark ? <Sun size={18} /> : <Moon size={18} />}
           </button>
           
           {/* Sync Button */}
           <button 
             onClick={handleSync}
             disabled={isSyncing}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
               isCalendarSynced 
                 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                 : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
             }`}
           >
             {isSyncing ? (
               <Loader2 size={14} className="animate-spin" />
             ) : isCalendarSynced ? (
                <CalendarCheck size={14} />
             ) : (
                <RefreshCw size={14} />
             )}
             {isSyncing ? 'Syncing...' : isCalendarSynced ? 'Synced' : 'Sync'}
           </button>

           <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

           {/* User Profile / Login */}
           {user ? (
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-slate-800 cursor-pointer" title={user.name}>
                  {user.avatar}
                </div>
                <button onClick={onLogout} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Log out">
                    <LogOut size={16} />
                </button>
             </div>
           ) : (
             <button onClick={onLogin} className="text-sm font-semibold text-[#6F00FF] hover:bg-violet-50 dark:hover:bg-slate-800 px-3 py-1.5 rounded-full transition-colors">
               Sign in
             </button>
           )}
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="font-bold text-lg">Settings</h2>
                    <button onClick={() => setIsSettingsOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-6">
                    {/* Time Format */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Time Format</label>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button 
                                onClick={() => setSettings({...settings, timeFormat: '12h'})}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${settings.timeFormat === '12h' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >12-hour (9:00 AM)</button>
                            <button 
                                onClick={() => setSettings({...settings, timeFormat: '24h'})}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${settings.timeFormat === '24h' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >24-hour (09:00)</button>
                        </div>
                    </div>

                    {/* Timezone */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Timezone</label>
                        <div className="relative">
                            <select 
                                value={settings.timezone}
                                onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            >
                                <option value="Local">Local Time</option>
                                <option value="UTC">UTC (Coordinated Universal Time)</option>
                                <option value="EST">EST (Eastern Standard Time)</option>
                                <option value="PST">PST (Pacific Standard Time)</option>
                                <option value="CET">CET (Central European Time)</option>
                            </select>
                            <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Your calendar events will be displayed in this timezone.</p>
                    </div>

                    {/* Google Calendar Connection */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <label className="block text-sm font-medium mb-3 text-slate-700 dark:text-slate-300">Google Calendar</label>
                        {googleAccount ? (
                            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-3">
                                    <img 
                                        src={googleAccount.picture} 
                                        alt={googleAccount.name}
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-green-800 dark:text-green-200">{googleAccount.name}</p>
                                        <p className="text-xs text-green-600 dark:text-green-400">{googleAccount.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDisconnectGoogle}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Disconnect"
                                >
                                    <Unlink size={18} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleConnectGoogle}
                                disabled={isGoogleConnecting || !googleApiReady}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                {isGoogleConnecting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Connecting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Calendar size={18} className="text-blue-500" />
                                        <span>Connect Google Calendar</span>
                                    </>
                                )}
                            </button>
                        )}
                        <p className="text-xs text-slate-500 mt-2">Sync your schedule with Google Calendar.</p>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
                    <button 
                        onClick={() => setIsSettingsOpen(false)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'dashboard' && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 animate-fade-in-up">
            <LayoutDashboard size={64} className="mb-4 opacity-20" />
            <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300">Dashboard View</h2>
            <p className="mt-2">Analytics and high-level overview coming soon.</p>
        </div>
      )}

      {activeTab === 'habittracker' && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 animate-fade-in-up">
            <Activity size={64} className="mb-4 opacity-20" />
            <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300">Habit Tracker View</h2>
            <p className="mt-2">Track your daily streaks and habits here.</p>
        </div>
      )}

      {activeTab === 'timebox' && (
      <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 animate-fade-in-up">
        
        {/* Left Column: To-Do List */}
        <div className="md:col-span-3 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto">
          <div className="p-4 space-y-6">
            
            {/* Header & Input */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-slate-800 dark:text-slate-100">
                <ListTodo size={20} className="text-[#6F00FF]" />
                <h2 className="font-bold text-lg">To-do</h2>
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type task & press Enter" 
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/20 focus:border-[#6F00FF] transition-all"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs text-slate-400 font-mono shadow-sm">
                  ↵
                </div>
              </div>
            </div>

            {/* Active Tasks Drop Zone */}
            <div 
                className={`space-y-2 min-h-[100px] rounded-lg transition-colors ${dragOverList === 'active' ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-400 ring-inset' : ''}`}
                onDragOver={(e) => handleListDragOver(e, 'active')}
                onDrop={(e) => handleListDrop(e, 'active')}
                onDragLeave={() => setDragOverList(null)}
            >
              {activeTasks.length === 0 && <p className="text-center text-sm text-slate-400 py-8">Drop tasks here</p>}
              {activeTasks.map(task => (
                <TaskItem 
                    key={task.id} 
                    task={task} 
                    onDragStart={(e) => handleTaskDragStart(e, task, 'active')}
                    onDelete={(id) => handleDeleteTask(id, 'active')}
                />
              ))}
            </div>

            {/* To-Do Later Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50">
              <button 
                onClick={() => setIsLaterOpen(!isLaterOpen)}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-semibold mb-3 hover:text-[#6F00FF] transition-colors w-full"
              >
                <Calendar size={18} className={isLaterOpen ? "text-[#6F00FF]" : ""} />
                To-do Later
                {isLaterOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              
              {isLaterOpen && (
                <div 
                    className={`space-y-2 pl-2 border-l-2 border-slate-100 dark:border-slate-800 ml-2 min-h-[50px] transition-colors ${dragOverList === 'later' ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-400 ring-inset rounded-r-lg' : ''}`}
                    onDragOver={(e) => handleListDragOver(e, 'later')}
                    onDrop={(e) => handleListDrop(e, 'later')}
                    onDragLeave={() => setDragOverList(null)}
                >
                  {laterTasks.length === 0 && <p className="text-xs text-slate-400 py-4 italic">Drag tasks here for later</p>}
                  {laterTasks.map(task => (
                    <div key={task.id} className="pl-4">
                       <TaskItem 
                            task={task} 
                            onDragStart={(e) => handleTaskDragStart(e, task, 'later')} 
                            onDelete={(id) => handleDeleteTask(id, 'later')}
                        />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Middle Column: Calendar/Timeline */}
        <div className="md:col-span-6 bg-white dark:bg-slate-900 flex flex-col relative overflow-hidden">
          <div className="flex-1 overflow-y-auto relative custom-scrollbar">
            
            {/* Calendar Grid */}
            <div className="relative min-h-[800px] py-6">
              
              {/* Current Time Indicator (Static for demo) */}
              <div className="absolute left-0 right-0 top-[38%] z-20 flex items-center pointer-events-none">
                <div className="w-14 text-right pr-2">
                  <span className="text-[10px] font-bold text-emerald-500 bg-white dark:bg-slate-900 px-1">1:00 PM</span>
                </div>
                <div className="h-px bg-emerald-500 flex-1 relative">
                  <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
              </div>

              {timeLabels.map((hour) => (
                <div 
                    key={hour} 
                    className={`flex h-24 group relative transition-colors ${dragOverHour === hour ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                    onDragEnter={() => setDragOverHour(hour)}
                    onDragOver={handleHourDragOver}
                    onDrop={(e) => handleHourDrop(e, hour)}
                    onDragLeave={() => setDragOverHour(null)}
                >
                  {/* Time Label */}
                  <div className="w-14 shrink-0 text-right pr-3 text-xs text-slate-400 dark:text-slate-500 font-medium -mt-2">
                    {formatTime(hour, true)}
                  </div>
                  
                  {/* Grid Line */}
                  <div className="flex-1 border-t border-slate-100 dark:border-slate-800 relative">
                    {/* Half-hour guideline (invisible unless hovered) */}
                    <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-slate-50 dark:border-slate-800/50 w-full"></div>
                    
                    {/* Ghost Block Preview when dragging over */}
                    {dragOverHour === hour && (
                        <div className="absolute top-0 left-16 right-4 bottom-2 border-2 border-dashed border-[#6F00FF] bg-[#6F00FF]/10 rounded-lg z-0 pointer-events-none flex items-center justify-center text-[#6F00FF] font-medium text-sm">
                            Drop to schedule on Calendar
                        </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Render Time Blocks */}
              {schedule.map((block) => {
                // Calculate position based on 7 AM start, each hour is 96px (h-24)
                const topOffset = (block.start - 7) * 96; 
                const height = block.duration * 96;
                const endTime = block.start + block.duration;

                return (
                  <div 
                    key={block.id}
                    style={{ top: `${topOffset}px`, height: `${height}px` }}
                    className={`absolute left-16 right-4 rounded-lg p-3 border shadow-sm cursor-move hover:brightness-95 transition-all z-10 flex flex-col group ${block.color} ${block.textColor} ${resizingBlockId === block.id ? 'z-20 ring-2 ring-emerald-400 select-none' : ''}`}
                  >
                    <div className="flex items-start justify-between pointer-events-none">
                        <span className="text-xs font-medium opacity-80 flex items-center gap-1">
                            {block.isGoogle && <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-3 h-3" alt="GCal" />}
                            {formatTime(block.start)} – {formatTime(endTime)}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                            <MoreHorizontal size={14} className="cursor-pointer" />
                            <button onClick={() => handleDeleteBlock(block.id)} className="hover:text-red-600"><X size={14}/></button>
                        </div>
                    </div>
                    <h3 className="font-bold text-sm mt-1 pointer-events-none">{block.title}</h3>
                    <div className="mt-auto flex items-center gap-2 pointer-events-none">
                        {block.tag && <span className="text-[10px] uppercase font-bold opacity-60 bg-black/5 dark:bg-white/10 px-1.5 rounded">{block.tag}</span>}
                    </div>

                    {/* Resize Handle */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-20"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault(); // Prevent text selection
                        setResizingBlockId(block.id);
                        setResizeStartY(e.clientY);
                        setResizeStartDuration(block.duration);
                      }}
                    >
                      <div className="w-8 h-1 rounded-full bg-slate-400/50 dark:bg-slate-500/50 backdrop-blur-sm"></div>
                    </div>
                  </div>
                )
              })}

            </div>
          </div>

          {/* Date Selector Footer */}
          <div className="h-14 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0">
             <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                {new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
                <User size={14} className="ml-1 text-slate-400" />
             </div>
          </div>
        </div>

        {/* Right Column: Notes & Extras */}
        <div className="md:col-span-3 bg-slate-50/50 dark:bg-slate-950 flex flex-col overflow-y-auto">
           <div className="p-4 space-y-8">
              
              {/* Notes Section */}
              <div>
                 <div className="flex items-center gap-2 mb-3 text-slate-800 dark:text-slate-100">
                    <div className="text-[#6F00FF]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/></svg>
                    </div>
                    <h2 className="font-bold text-lg">Notes</h2>
                 </div>
                 
                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden min-h-[200px] flex flex-col">
                    {/* Fake Toolbar */}
                    <div className="flex items-center gap-1 p-2 border-b border-slate-100 dark:border-slate-800 text-slate-400">
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Bold size={14}/></button>
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Italic size={14}/></button>
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Underline size={14}/></button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><List size={14}/></button>
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><ListOrdered size={14}/></button>
                    </div>
                    
                    {/* Editor Content (Static for demo) */}
                    <div className="p-3 text-sm text-slate-700 dark:text-slate-300 space-y-3 outline-none flex-1">
                        <h3 className="font-bold text-lg">🌟 Welcome to the Demo for timebox.so!</h3>
                        <p>✨ This would be your space for daily notes. But for now.. let's get you started with this demo:</p>
                        
                        <div className="mt-4">
                            <h4 className="font-bold flex items-center gap-2 mb-2">🧠 Main Focus</h4>
                            <ul className="space-y-1">
                                {["Create some new to-dos", "Drag and re-order some to-dos", "Drop a to-do in the timebox scheduler", "Check off a to-do to complete it!"].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 opacity-50 line-through decoration-slate-400">
                                        <div className="mt-1 min-w-[14px] h-[14px] bg-emerald-500 rounded flex items-center justify-center"><Check size={10} className="text-white"/></div>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-4">
                            <h4 className="font-bold flex items-center gap-2 mb-2">🤔 Extras</h4>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-2">
                                    <div className="mt-1 min-w-[14px] h-[14px] border border-slate-300 dark:border-slate-600 rounded"></div>
                                    <span>Tag a to-do with the # symbol (like #work)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="mt-1 min-w-[14px] h-[14px] border border-slate-300 dark:border-slate-600 rounded"></div>
                                    <span>Drag a to-do into the to-do later list</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                 </div>
              </div>

              {/* Promo Section */}
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/10 dark:to-indigo-900/10 rounded-xl p-4 border border-violet-100 dark:border-violet-900/20">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                      <span className="text-xl">👩‍🚀</span> What else does Ascend offer?
                  </h4>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <li className="flex items-center gap-2">
                          <div className={`w-4 h-4 border rounded flex items-center justify-center ${isCalendarSynced ? 'bg-green-500 border-green-500' : 'bg-white dark:bg-slate-800'}`}>
                              {isCalendarSynced && <Check size={10} className="text-white"/>}
                          </div> 
                          Google Calendar Sync
                      </li>
                      <li className="flex items-center gap-2"><div className="w-4 h-4 border rounded bg-white dark:bg-slate-800"></div> Planners for every day of the year</li>
                      <li className="flex items-center gap-2"><div className="w-4 h-4 border rounded bg-white dark:bg-slate-800"></div> Everything saved to the cloud instantly</li>
                      <li className="flex items-center gap-2"><div className="w-4 h-4 border rounded bg-white dark:bg-slate-800"></div> Accountability and deep work tracking!</li>
                  </ul>
                  {!user && (
                      <button onClick={onLogin} className="inline-block mt-4 text-[#6F00FF] font-bold hover:underline">Sign in to start timeboxing!</button>
                  )}
              </div>

           </div>
        </div>

      </div>
      )}
    </div>
  );
};

// --- Landing Page & Root App ---

const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="w-20 h-20 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-violet-600/30 mb-8 transform rotate-3 hover:rotate-6 transition-transform">
        <Target size={48} strokeWidth={2.5} />
      </div>
      <h1 className="text-6xl font-extrabold mb-6 tracking-tight text-center">
        Ascend<span className="text-[#6F00FF]">.</span>
      </h1>
      <p className="text-2xl text-slate-500 dark:text-slate-400 mb-12 max-w-xl text-center leading-relaxed">
        The all-in-one timeboxing workspace for <span className="text-slate-800 dark:text-slate-200 font-semibold">deep work</span>.
      </p>
      <button 
        onClick={onGetStarted} 
        className="group flex items-center gap-3 px-8 py-4 bg-[#6F00FF] text-white rounded-full font-bold text-xl hover:bg-violet-700 hover:shadow-xl hover:shadow-violet-600/20 transition-all transform hover:-translate-y-1"
      >
        Get Started 
        <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
      </button>
      
      <div className="mt-16 text-sm text-slate-400 flex gap-6">
        <span className="flex items-center gap-2"><Check size={14}/> Timeboxing</span>
        <span className="flex items-center gap-2"><Check size={14}/> Task Management</span>
        <span className="flex items-center gap-2"><Check size={14}/> Calendar Sync</span>
      </div>
    </div>
  );
};

// Auth Page Component
const AuthPage = ({ onSuccess }: { onSuccess: () => void }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await signUp(email, password);
        setError('Konto skapat! Du kan nu logga in.');
        setIsSignUp(false);
      } else {
        await signIn(email, password);
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Ett fel uppstod');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google-inloggning misslyckades');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-violet-600/30 mx-auto mb-4">
            <Target size={36} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold">
            {isSignUp ? 'Skapa konto' : 'Logga in'}
          </h1>
          <p className="text-slate-500 mt-2">
            {isSignUp ? 'Skapa ett konto för att börja' : 'Välkommen tillbaka!'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800">
          {error && (
            <div className={`p-3 rounded-lg mb-4 text-sm ${error.includes('skapat') ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                placeholder="din@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lösenord</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#6F00FF] hover:bg-violet-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                isSignUp ? 'Skapa konto' : 'Logga in'
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-slate-900 text-slate-500">eller</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Fortsätt med Google
          </button>

          <p className="text-center text-sm text-slate-500 mt-6">
            {isSignUp ? 'Har du redan ett konto?' : 'Inget konto?'}{' '}
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-[#6F00FF] hover:underline font-medium"
            >
              {isSignUp ? 'Logga in' : 'Skapa konto'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState<{id: string; name: string; avatar: string; email: string} | null>(null);
  const [view, setView] = useState<'landing' | 'auth' | 'app'>('landing');
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser({
            id: currentUser.id,
            name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
            avatar: (currentUser.user_metadata?.full_name || currentUser.email || 'U').substring(0, 2).toUpperCase(),
            email: currentUser.email || ''
          });
          setView('app');
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          avatar: (session.user.user_metadata?.full_name || session.user.email || 'U').substring(0, 2).toUpperCase(),
          email: session.user.email || ''
        });
        setView('app');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setView('landing');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load theme
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const handleLogout = async () => {
    try {
      await signOut();
      setUser(null);
      setView('landing');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 size={48} className="animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {view === 'landing' && (
        <LandingPage onGetStarted={() => setView('auth')} />
      )}
      {view === 'auth' && (
        <AuthPage onSuccess={() => {}} />
      )}
      {view === 'app' && user && (
        <TimeboxApp 
          user={user} 
          onLogin={() => setView('auth')} 
          onLogout={handleLogout}
          onBack={() => setView('landing')}
        />
      )}
    </ThemeContext.Provider>
  );
};

export default App;