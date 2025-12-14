import React, { useState, useEffect, useContext, useCallback } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
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
  Unlink,
  Mail,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  initGoogleApi,
  initGoogleIdentity,
  requestAccessToken,
  revokeAccessToken,
  fetchGoogleCalendarEvents,
  createGoogleCalendarEvent,
  getGoogleUserInfo
} from './googleCalendar';
import { 
  supabase, 
  signIn, 
  signUp, 
  signOut, 
  signInWithGoogle as supabaseSignInWithGoogle,
  onAuthStateChange,
  getCurrentUser 
} from './supabase';
import {
  loadTasks,
  createTask,
  updateTask,
  deleteTask as dbDeleteTask,
  moveTask,
  loadScheduleBlocks,
  createScheduleBlock,
  updateScheduleBlock,
  deleteScheduleBlock,
  loadUserSettings,
  saveUserSettings,
  Task as DbTaskType,
  ScheduleBlock as DbScheduleBlockType
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

interface TaskItemProps {
  task: Task;
  onDragStart: (e: React.DragEvent) => void;
  onDelete: (id: number | string) => void | Promise<void>;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onDragStart, onDelete }) => (
  <div 
    draggable="true"
    onDragStart={onDragStart}
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

const TimeboxApp = ({ onBack, user, onLogin, onLogout }: {
  onBack: () => void;
  user: { id: string; name: string; avatar: string; email: string } | null;
  onLogin: () => void;
  onLogout: () => void;
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'timebox' | 'habittracker'>('timebox');
  const [isLaterOpen, setIsLaterOpen] = useState(true);
  
  // State for Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    timeFormat: '12h', // '12h' | '24h'
    timezone: 'Local'
  });

  // State for Lists and Schedule
  const [activeTasks, setActiveTasks] = useState<Task[]>(INITIAL_TASKS);
  const [laterTasks, setLaterTasks] = useState<Task[]>(LATER_TASKS);
  const [schedule, setSchedule] = useState<ScheduleBlock[]>(TIME_BLOCKS);
  const [newTaskInput, setNewTaskInput] = useState("");
  
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

  // Google Calendar State
  const [googleAccount, setGoogleAccount] = useState<{
    email: string;
    name: string;
    picture: string;
  } | null>(null);
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);
  const [googleApiReady, setGoogleApiReady] = useState(false);

  // Time labels from 7 AM to 3 PM for the demo view
  const timeLabels = [7, 8, 9, 10, 11, 12, 13, 14, 15];

  // Data loading state
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Load data from database on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setIsDataLoading(true);
      try {
        // Load tasks
        const [activeTasksData, laterTasksData, blocksData, settingsData] = await Promise.all([
          loadTasks('active'),
          loadTasks('later'),
          loadScheduleBlocks(),
          loadUserSettings()
        ]);

        if (activeTasksData.length > 0 || laterTasksData.length > 0) {
          setActiveTasks(activeTasksData);
          setLaterTasks(laterTasksData);
        }

        if (blocksData.length > 0) {
          // blocksData is already in the correct ScheduleBlock format from database.ts
          setSchedule(blocksData);
        }

        if (settingsData) {
          setSettings({
            timeFormat: settingsData.timeFormat,
            timezone: settingsData.timezone
          });
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsDataLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Initialize Google APIs on mount
  useEffect(() => {
    const initGoogle = async () => {
      try {
        await initGoogleApi();
        initGoogleIdentity(async () => {
          const userInfo = await getGoogleUserInfo();
          if (userInfo) {
            setGoogleAccount(userInfo);
            setIsCalendarSynced(true);
          }
          setIsGoogleConnecting(false);
        });
        setGoogleApiReady(true);
      } catch (error) {
        console.error('Failed to initialize Google APIs:', error);
      }
    };
    
    const timer = setTimeout(initGoogle, 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle Google Calendar connection
  const handleConnectGoogle = useCallback(() => {
    if (!googleApiReady) {
      alert('Google APIs are still loading. Please try again in a moment.');
      return;
    }
    setIsGoogleConnecting(true);
    requestAccessToken();
    setTimeout(() => setIsGoogleConnecting(false), 30000);
  }, [googleApiReady]);

  // Handle Google Calendar disconnection
  const handleDisconnectGoogle = useCallback(() => {
    revokeAccessToken();
    setGoogleAccount(null);
    setIsCalendarSynced(false);
    setSchedule(prev => prev.filter(block => !block.isGoogle || typeof block.id === 'number'));
  }, []);

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

    const handleMouseUp = () => {
      if (resizingBlockId !== null) {
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
  }, [resizingBlockId, resizeStartY, resizeStartDuration]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskInput.trim()) {
        // Create task in database
        const dbTask = await createTask(newTaskInput, 'active');
        
        if (dbTask) {
          setActiveTasks([...activeTasks, dbTask]);
        } else {
          // Fallback to local-only task if DB fails
          const newTask: Task = {
              id: String(Date.now()),
              title: newTaskInput,
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

  const handleDeleteTask = async (taskId: number | string, listType: 'active' | 'later') => {
      // Delete from database
      await dbDeleteTask(String(taskId));
      
      if (listType === 'active') {
          setActiveTasks(activeTasks.filter(t => t.id !== taskId));
      } else {
          setLaterTasks(laterTasks.filter(t => t.id !== taskId));
      }
  };

  const handleDeleteBlock = async (blockId: number | string) => {
      // Delete from database
      await deleteScheduleBlock(String(blockId));
      setSchedule(schedule.filter(b => b.id !== blockId));
  };

  const handleSync = async () => {
    if (!googleAccount) {
      alert("Please connect your Google Calendar in Settings first!");
      setIsSettingsOpen(true);
      return;
    }
    
    setIsSyncing(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const googleEvents = await fetchGoogleCalendarEvents(today, tomorrow);
      
      setSchedule(prev => {
        const localBlocks = prev.filter(block => !block.isGoogle);
        const newGoogleBlocks: ScheduleBlock[] = googleEvents.map(event => ({
          id: event.id,
          title: event.title,
          tag: 'meeting',
          start: event.start,
          duration: event.duration,
          color: "bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800",
          textColor: "text-blue-700 dark:text-blue-300",
          isGoogle: true
        }));
        return [...localBlocks, ...newGoogleBlocks];
      });
      
      setIsCalendarSynced(true);
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Failed to sync with Google Calendar. Please try reconnecting in Settings.');
    } finally {
      setIsSyncing(false);
    }
  };

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

  const handleHourDrop = async (e: React.DragEvent, hour: number) => {
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
          isGoogle: false
      };

      // If connected to Google Calendar, create the event there too
      if (googleAccount) {
          try {
              await createGoogleCalendarEvent(
                  task.title,
                  hour,
                  1 // 1 hour duration
              );
              blockData.isGoogle = true;
              blockData.color = "bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800";
              blockData.textColor = "text-blue-700 dark:text-blue-300";
          } catch (error) {
              console.error('Failed to create Google Calendar event:', error);
          }
      }

      // Save to database
      const dbBlock = await createScheduleBlock(blockData);
      
      const newBlock: ScheduleBlock = dbBlock ? {
        ...dbBlock,
        id: dbBlock.id
      } : {
        id: String(Date.now()),
        ...blockData
      };

      setSchedule(prev => [...prev, newBlock]);
      
      // Update the task to reflect it has been scheduled
      if (draggedItem.sourceList === 'active') {
          const timeString = formatTime(hour);
          setActiveTasks(prev => prev.map(t => t.id === task.id ? { ...t, time: timeString } : t));
          // Update task in database
          await updateTask(String(task.id), { time: timeString });
      }
      setDraggedItem(null);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
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
                    {/* Google Calendar Connection */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Google Calendar</label>
                        {googleAccount ? (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                <div className="flex items-center gap-3">
                                    <img src={googleAccount.picture} alt={googleAccount.name} className="w-10 h-10 rounded-full" />
                                    <div className="flex-1">
                                        <p className="font-medium text-green-800 dark:text-green-200">{googleAccount.name}</p>
                                        <p className="text-xs text-green-600 dark:text-green-400">{googleAccount.email}</p>
                                    </div>
                                    <button onClick={handleDisconnectGoogle} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                        <Unlink size={14} /> Disconnect
                                    </button>
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                                    <CalendarCheck size={14} />
                                    <span>Calendar connected and syncing</span>
                                </div>
                            </div>
                        ) : (
                            <button onClick={handleConnectGoogle} disabled={isGoogleConnecting || !googleApiReady}
                                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {isGoogleConnecting ? <Loader2 size={20} className="animate-spin text-slate-400" /> : 
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" className="w-5 h-5" />}
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                    {isGoogleConnecting ? 'Connecting...' : !googleApiReady ? 'Loading...' : 'Connect Google Calendar'}
                                </span>
                            </button>
                        )}
                        <p className="text-xs text-slate-500 mt-2">Connect your Google account to sync events.</p>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                    {/* Time Format */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Time Format</label>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button 
                                onClick={() => {
                                  const newSettings = {...settings, timeFormat: '12h' as const};
                                  setSettings(newSettings);
                                  saveUserSettings({ timeFormat: '12h' });
                                }}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${settings.timeFormat === '12h' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >12-hour (9:00 AM)</button>
                            <button 
                                onClick={() => {
                                  const newSettings = {...settings, timeFormat: '24h' as const};
                                  setSettings(newSettings);
                                  saveUserSettings({ timeFormat: '24h' });
                                }}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${settings.timeFormat === '24h' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >24-hour (09:00)</button>
                        </div>
                    </div>
                    </div>

                    {/* Timezone */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Timezone</label>
                        <div className="relative">
                            <select 
                                value={settings.timezone}
                                onChange={(e) => {
                                  const newSettings = {...settings, timezone: e.target.value};
                                  setSettings(newSettings);
                                  saveUserSettings({ timezone: e.target.value });
                                }}
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
                December 13
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

// --- Auth Form Component ---

const AuthForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await signUp(email, password);
        setError('Check your email for confirmation link!');
      } else {
        await signIn(email, password);
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await supabaseSignInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
          <div className="relative">
            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/20 focus:border-[#6F00FF] transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/20 focus:border-[#6F00FF] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <p className={`text-sm ${error.includes('Check your email') ? 'text-green-600' : 'text-red-500'}`}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-[#6F00FF] text-white rounded-lg font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {isSignUp ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
        <span className="text-sm text-slate-400">or</span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
      </div>

      <button
        onClick={handleGoogleSignIn}
        className="w-full py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-3"
      >
        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
        Continue with Google
      </button>

      <p className="mt-6 text-center text-sm text-slate-500">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
          className="text-[#6F00FF] font-semibold hover:underline"
        >
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </p>
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

const AuthPage = ({ onSuccess }: { onSuccess: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4">
      <div className="w-16 h-16 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-violet-600/20 mb-6">
        <Target size={36} strokeWidth={2.5} />
      </div>
      <h1 className="text-3xl font-extrabold mb-2 tracking-tight">
        Welcome to Ascend<span className="text-[#6F00FF]">.</span>
      </h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">Sign in to sync your data across devices</p>
      
      <AuthForm onSuccess={onSuccess} />
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
          const initials = currentUser.email?.slice(0, 2).toUpperCase() || 'U';
          setUser({
            id: currentUser.id,
            name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
            avatar: initials,
            email: currentUser.email || ''
          });
          setView('app');
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const u = session.user;
        const initials = u.email?.slice(0, 2).toUpperCase() || 'U';
        setUser({
          id: u.id,
          name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
          avatar: initials,
          email: u.email || ''
        });
        setView('app');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setView('landing');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Theme handling
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
      console.error('Logout failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 size={32} className="animate-spin text-[#6F00FF]" />
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
      <SpeedInsights />
    </ThemeContext.Provider>
  );
};

export default App;