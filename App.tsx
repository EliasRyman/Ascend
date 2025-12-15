import React, { useState, useEffect, useContext, useRef } from 'react';
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
  MoreVertical,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
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
  Tag,
  Palette,
  Flame,
  TrendingUp,
  Zap,
  Edit3,
  Repeat,
  Info,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import {
  initGoogleApi,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  fetchGoogleCalendarEvents,
  syncCalendarEvents,
  saveGoogleUser,
  clearSavedData as clearGoogleData,
  handleGoogleOAuthCallback,
  checkGoogleConnectionStatus,
  startGoogleOAuth,
  disconnectGoogle,
  setSupabaseToken,
  getValidAccessToken,
  setAccessToken
} from './googleCalendar';
import {
  signIn,
  signUp,
  signOut,
  signInWithGoogle,
  onAuthStateChange,
  getCurrentUser,
  supabase
} from './supabase';
import {
  loadTasks,
  createTask,
  deleteTask as deleteTaskFromDb,
  moveTask,
  loadScheduleBlocks,
  createScheduleBlock,
  deleteScheduleBlock,
  updateScheduleBlock,
  loadUserSettings,
  saveUserSettings,
  updateTask,
  loadNote,
  saveNote
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
  completed?: boolean;
  taskId?: number | string;
  habitId?: string;
  calendarColor?: string;
  calendarName?: string;
  calendarId?: string; // Google Calendar ID for external events
  canEdit?: boolean; // true if user has write access to edit this event
}

interface Task {
  id: number | string;
  title: string;
  tag: string | null;
  tagColor: string | null;
  time: string | null;
  completed: boolean;
}

interface Habit {
  id: string;
  name: string;
  tag: string | null;
  tagColor: string | null;
  frequency: 'daily' | 'weekly';
  scheduledDays: number[];
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  currentStreak: number;
  longestStreak: number;
  completedDates: string[];
  createdAt: string;
}

// Google Calendar color palette
const GOOGLE_COLORS = [
  { id: '1', name: 'Lavender', hex: '#7986cb', tailwind: 'bg-[#7986cb] text-white' },
  { id: '2', name: 'Sage', hex: '#33b679', tailwind: 'bg-[#33b679] text-white' },
  { id: '3', name: 'Grape', hex: '#8e24aa', tailwind: 'bg-[#8e24aa] text-white' },
  { id: '4', name: 'Flamingo', hex: '#e67c73', tailwind: 'bg-[#e67c73] text-white' },
  { id: '5', name: 'Banana', hex: '#f6bf26', tailwind: 'bg-[#f6bf26] text-slate-800' },
  { id: '6', name: 'Tangerine', hex: '#f4511e', tailwind: 'bg-[#f4511e] text-white' },
  { id: '7', name: 'Peacock', hex: '#039be5', tailwind: 'bg-[#039be5] text-white' },
  { id: '8', name: 'Graphite', hex: '#616161', tailwind: 'bg-[#616161] text-white' },
  { id: '9', name: 'Blueberry', hex: '#3f51b5', tailwind: 'bg-[#3f51b5] text-white' },
  { id: '10', name: 'Basil', hex: '#0b8043', tailwind: 'bg-[#0b8043] text-white' },
  { id: '11', name: 'Tomato', hex: '#d50000', tailwind: 'bg-[#d50000] text-white' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  listType: 'active' | 'later';
  userTags: { name: string; color: string }[];
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDelete: (id: number | string) => void;
  onToggleComplete: (id: number | string) => void;
  onMoveToList: (taskId: number | string, targetList: 'active' | 'later') => void;
  onAddTag: (taskId: number | string, tagName: string, tagColor: string) => void;
  onRemoveTag: (taskId: number | string) => void;
  onOpenTagModal: (taskId: number | string) => void;
  onEditTag?: (tag: { name: string; color: string }) => void;
}

const TaskItem = ({ 
  task, 
  listType,
  userTags,
  onDragStart, 
  onDelete, 
  onToggleComplete,
  onMoveToList,
  onAddTag,
  onRemoveTag,
  onOpenTagModal,
  onEditTag
}: TaskItemProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTagSubmenuOpen, setIsTagSubmenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsTagSubmenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <div 
      draggable="true"
      onDragStart={(e) => onDragStart(e, task)}
      className={`group flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-[#6F00FF]/50 cursor-grab active:cursor-grabbing transition-all shadow-sm ${task.completed ? 'opacity-60' : ''}`}
    >
      <div 
        onClick={() => onToggleComplete(task.id)}
        className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${task.completed ? 'bg-[#6F00FF] border-[#6F00FF]' : 'border-slate-300 dark:border-slate-600 hover:border-[#6F00FF]'}`}
      >
        {task.completed && <Check size={14} className="text-white" />}
      </div>
      <span className={`flex-1 text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
        {task.title}
      </span>
      {task.tag && (
        <span 
          className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide text-white"
          style={{ backgroundColor: task.tagColor || '#6F00FF' }}
        >
          {task.tag}
        </span>
      )}
      {task.time && (
        <span className="text-[10px] text-slate-400 font-mono border border-slate-100 dark:border-slate-800 px-1 rounded">
          {task.time}
        </span>
      )}
      
      {/* Options Menu */}
      <div className="relative z-40" ref={menuRef}>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
          className="text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <MoreVertical size={16} />
        </button>
        
        {isMenuOpen && (
          <div className="absolute right-0 top-8 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl z-[100] py-1 text-sm">
            <button onClick={() => { onToggleComplete(task.id); setIsMenuOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <Check size={14} className={task.completed ? 'text-emerald-500' : ''} />
              {task.completed ? 'Mark as Incomplete' : 'Mark as Complete'}
            </button>
            <button onClick={() => { onMoveToList(task.id, listType === 'active' ? 'later' : 'active'); setIsMenuOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <MoveRight size={14} />
              {listType === 'active' ? 'Move to Later' : 'Move to Active'}
            </button>
            <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
            <button onClick={() => { onOpenTagModal(task.id); setIsMenuOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200">
              <Plus size={14} /> Create Tag
            </button>
            {task.tag && task.tagColor && onEditTag && (
              <button onClick={() => { onEditTag({ name: task.tag!, color: task.tagColor! }); setIsMenuOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Edit3 size={14} /> Edit Tag
              </button>
            )}
            <div className="relative">
              <button onClick={() => setIsTagSubmenuOpen(!isTagSubmenuOpen)} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 justify-between">
                <span className="flex items-center gap-2"><Tag size={14} /> Add Tag</span>
                {isTagSubmenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {isTagSubmenuOpen && userTags.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  {userTags.map((tag, idx) => (
                    <button key={idx} onClick={() => { onAddTag(task.id, tag.name, tag.color); setIsMenuOpen(false); setIsTagSubmenuOpen(false); }} className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                      <span className="text-slate-600 dark:text-slate-300 text-sm">{tag.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {isTagSubmenuOpen && userTags.length === 0 && (
                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 py-2 px-4 text-xs text-slate-400">No tags yet</div>
              )}
            </div>
            {task.tag && (
              <button onClick={() => { onRemoveTag(task.id); setIsMenuOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <X size={14} /> Remove Tag
              </button>
            )}
            <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
            <button onClick={() => { onDelete(task.id); setIsMenuOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 size={14} /> Delete Task
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Tag Modal Component ---
interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tagName: string, tagColor: string) => void;
  editTag?: { name: string; color: string } | null;
  onDelete?: () => void;
}

const TagModal = ({ isOpen, onClose, onSave, editTag, onDelete }: TagModalProps) => {
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(GOOGLE_COLORS[0].hex);
  const isEditMode = !!editTag;

  // Update state when editTag changes
  useEffect(() => {
    if (editTag) {
      setTagName(editTag.name);
      setSelectedColor(editTag.color);
    } else {
      setTagName('');
      setSelectedColor(GOOGLE_COLORS[0].hex);
    }
  }, [editTag, isOpen]);

  const handleSave = () => {
    if (tagName.trim()) {
      onSave(tagName.trim(), selectedColor);
      setTagName('');
      setSelectedColor(GOOGLE_COLORS[0].hex);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Tag size={20} className="text-[#6F00FF]" /> {isEditMode ? 'Edit Tag' : 'Create Tag'}
            </h3>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tag Name</label>
            <input type="text" value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="e.g., Work, Personal" className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/50" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Color</label>
            <div className="grid grid-cols-6 gap-2">
              {GOOGLE_COLORS.map((color) => (
                <button key={color.id} onClick={() => setSelectedColor(color.hex)} className={`w-8 h-8 rounded-full transition-all ${selectedColor === color.hex ? 'ring-2 ring-offset-2 ring-[#6F00FF] dark:ring-offset-slate-900 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: color.hex }} title={color.name} />
              ))}
            </div>
          </div>
          {tagName && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Preview</label>
              <span className="inline-block text-xs px-2 py-1 rounded font-semibold uppercase tracking-wide text-white" style={{ backgroundColor: selectedColor }}>{tagName}</span>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
          {isEditMode && onDelete && (
            <button onClick={() => { onDelete(); onClose(); }} className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">Delete Tag</button>
          )}
          <div className={`flex gap-2 ${!isEditMode ? 'ml-auto' : ''}`}>
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={!tagName.trim()} className="px-4 py-2 text-sm font-medium bg-[#6F00FF] text-white rounded-lg hover:bg-[#5800cc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isEditMode ? 'Save' : 'Create Tag'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Weight Line Chart Component ---
const WeightLineChart = ({ entries, height = 200 }: { entries: { date: string; weight: number }[]; height?: number }) => {
  if (entries.length < 2) {
    return <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Need at least 2 entries to show chart</div>;
  }

  const padding = { top: 10, right: 10, bottom: 30, left: 40 };
  const chartWidth = 600;
  const chartHeight = height;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const weights = entries.map(e => e.weight);
  const minWeight = Math.floor(Math.min(...weights) - 1);
  const maxWeight = Math.ceil(Math.max(...weights) + 1);
  const weightRange = maxWeight - minWeight;

  const points = entries.map((entry, idx) => {
    const x = padding.left + (idx / (entries.length - 1)) * innerWidth;
    const y = padding.top + innerHeight - ((entry.weight - minWeight) / weightRange) * innerHeight;
    return { x, y, ...entry };
  });

  const linePath = points.reduce((path, point, idx) => {
    if (idx === 0) return `M ${point.x} ${point.y}`;
    const prev = points[idx - 1];
    const cpx1 = prev.x + (point.x - prev.x) / 3;
    const cpx2 = point.x - (point.x - prev.x) / 3;
    return `${path} C ${cpx1} ${prev.y}, ${cpx2} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`;

  const yLabels = [];
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const value = minWeight + (weightRange * i) / ySteps;
    const y = padding.top + innerHeight - (i / ySteps) * innerHeight;
    yLabels.push({ value: value.toFixed(1), y });
  }

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="weightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6F00FF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6F00FF" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {yLabels.map((label, idx) => (
        <line key={idx} x1={padding.left} y1={label.y} x2={padding.left + innerWidth} y2={label.y} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" />
      ))}
      <path d={areaPath} fill="url(#weightGradient)" />
      <path d={linePath} fill="none" stroke="#6F00FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, idx) => (
        <g key={idx}>
          <circle cx={point.x} cy={point.y} r="4" fill="#6F00FF" stroke="white" strokeWidth="2" className="cursor-pointer" />
          <title>{`${point.date}: ${point.weight} kg`}</title>
        </g>
      ))}
      {yLabels.map((label, idx) => (
        <text key={idx} x={padding.left - 8} y={label.y} textAnchor="end" dominantBaseline="middle" className="fill-slate-400 text-[10px]">{label.value}</text>
      ))}
    </svg>
  );
};

// --- Habit Form Component ---
const HabitForm = ({ initialHabit, userTags, onSave, onCancel, onCreateTag }: {
  initialHabit?: Habit | null;
  userTags: { name: string; color: string }[];
  onSave: (data: Omit<Habit, 'id' | 'currentStreak' | 'longestStreak' | 'completedDates' | 'createdAt'>) => void;
  onCancel: () => void;
  onCreateTag: () => void;
}) => {
  const [name, setName] = useState(initialHabit?.name || '');
  const [tag, setTag] = useState<string | null>(initialHabit?.tag || null);
  const [tagColor, setTagColor] = useState<string | null>(initialHabit?.tagColor || null);
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>(initialHabit?.frequency || 'daily');
  const [scheduledDays, setScheduledDays] = useState<number[]>(initialHabit?.scheduledDays || []);
  const [startTime, setStartTime] = useState(initialHabit?.scheduledStartTime || '');
  const [endTime, setEndTime] = useState(initialHabit?.scheduledEndTime || '');

  const toggleDay = (day: number) => {
    setScheduledDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), tag, tagColor, frequency, scheduledDays: frequency === 'daily' ? [] : scheduledDays, scheduledStartTime: startTime || null, scheduledEndTime: endTime || null });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Habit Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Morning workout" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#6F00FF]" autoFocus />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tag <span className="text-slate-400 font-normal">(optional)</span></label>
        <div className="flex flex-wrap gap-2">
          {userTags.map(t => (
            <button key={t.name} type="button" onClick={() => { setTag(t.name); setTagColor(t.color); }} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all text-white ${tag === t.name ? 'ring-2 ring-[#6F00FF] ring-offset-2 dark:ring-offset-slate-900' : 'hover:opacity-80'}`} style={{ backgroundColor: t.color }}>{t.name}</button>
          ))}
          <button type="button" onClick={onCreateTag} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1"><Plus size={14} /> New Tag</button>
        </div>
        {tag && <button type="button" onClick={() => { setTag(null); setTagColor(null); }} className="mt-2 text-xs text-slate-500 hover:text-slate-700">✕ Remove tag</button>}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Frequency</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setFrequency('daily')} className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${frequency === 'daily' ? 'bg-[#6F00FF] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}><Repeat size={16} className="inline mr-2" /> Every Day</button>
          <button type="button" onClick={() => setFrequency('weekly')} className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${frequency === 'weekly' ? 'bg-[#6F00FF] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}><Calendar size={16} className="inline mr-2" /> Specific Days</button>
        </div>
      </div>
      {frequency === 'weekly' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Days</label>
          <div className="flex gap-1">
            {WEEKDAYS.map((day, idx) => (
              <button key={day} type="button" onClick={() => toggleDay(idx)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${scheduledDays.includes(idx) ? 'bg-[#6F00FF] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>{day}</button>
            ))}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Scheduled Time <span className="text-slate-400 font-normal">(optional)</span></label>
          <div className="relative group">
            <Info size={14} className="text-slate-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
              <div className="font-medium mb-1">With time:</div>
              <div className="text-slate-300">Appears directly on timeline</div>
              <div className="font-medium mt-2 mb-1">Without time:</div>
              <div className="text-slate-300">Appears in To-Do list</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Start</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#6F00FF]" />
          </div>
          <span className="text-slate-400 mt-5">–</span>
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">End</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#6F00FF]" />
          </div>
          {(startTime || endTime) && <button type="button" onClick={() => { setStartTime(''); setEndTime(''); }} className="mt-5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"><X size={18} /></button>}
        </div>
        {startTime && endTime ? (
          <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1"><Clock size={12} /> Will appear on timeline</p>
        ) : (
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><ListTodo size={12} /> Will appear in To-Do list</p>
        )}
      </div>
      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200">Cancel</button>
        <button type="submit" disabled={!name.trim()} className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-[#6F00FF] text-white hover:bg-[#5800cc] disabled:opacity-50">{initialHabit ? 'Update Habit' : 'Create Habit'}</button>
      </div>
    </form>
  );
};

// --- Settings Modal Component ---
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: { timeFormat: string; timezone: string };
  setSettings: (settings: { timeFormat: string; timezone: string }) => void;
  googleAccount: { email: string; name: string; picture: string } | null;
  isGoogleConnecting: boolean;
  googleApiReady: boolean;
  handleConnectGoogle: () => void;
  handleDisconnectGoogle: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  user: any;
  onLogout: () => void;
  initialTab?: 'account' | 'billing' | 'customisations' | 'integrations';
}

const SettingsModal = ({
  isOpen,
  onClose,
  settings,
  setSettings,
  googleAccount,
  isGoogleConnecting,
  googleApiReady,
  handleConnectGoogle,
  handleDisconnectGoogle,
  isDark,
  toggleTheme,
  user,
  onLogout,
  initialTab = 'account'
}: SettingsModalProps) => {
  const [activeSettingsTab, setActiveSettingsTab] = useState<'account' | 'billing' | 'customisations' | 'integrations'>(initialTab);
  const [emailUnsubscribed, setEmailUnsubscribed] = useState(false);

  // Reset to initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveSettingsTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'account', label: 'Account' },
    { id: 'billing', label: 'Billing' },
    { id: 'customisations', label: 'Customisations' },
    { id: 'integrations', label: 'Integrations' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage your account, billing, customisations, and integrations here.</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-full"
              >
                <div className={`p-1.5 rounded-full transition-all ${!isDark ? 'bg-white shadow-sm' : ''}`}>
                  <Sun size={14} className={`${!isDark ? 'text-amber-500' : 'text-slate-400'}`} />
                </div>
                <div className={`p-1.5 rounded-full transition-all ${isDark ? 'bg-slate-700 shadow-sm' : ''}`}>
                  <Moon size={14} className={`${isDark ? 'text-slate-200' : 'text-slate-400'}`} />
                </div>
              </button>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex min-h-[400px]">
          {/* Sidebar Tabs */}
          <div className="w-48 border-r border-slate-200 dark:border-slate-800 p-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeSettingsTab === tab.id
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-l-2 border-emerald-500'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Account Tab */}
            {activeSettingsTab === 'account' && (
              <div className="space-y-6">
                {/* User Email */}
                {user && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Logged in as</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sign Out */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Sign Out</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Sign out of your account on all devices.</p>
                  <button
                    onClick={onLogout}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>

                {/* Unsubscribe from emails */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Unsubscribe from emails</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">You will not receive any emails from Ascend.</p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <button
                      onClick={() => setEmailUnsubscribed(!emailUnsubscribed)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${emailUnsubscribed ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${emailUnsubscribed ? 'left-6' : 'left-1'}`} />
                    </button>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      Unsubscribe from emails: {emailUnsubscribed ? 'Yes' : 'No'}
                    </span>
                  </label>
                </div>

                {/* Delete Account */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Delete Account</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Deleting your account will remove all of your data from our servers.</p>
                  <button className="text-sm text-red-500 hover:text-red-600 font-medium hover:underline">
                    Click here to delete your account
                  </button>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeSettingsTab === 'billing' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors">
                    Upgrade to Lifetime
                  </button>
                  <button className="px-5 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Orders Portal
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You are currently on the Free plan. Upgrade to unlock all features.
                </p>
              </div>
            )}

            {/* Customisations Tab */}
            {activeSettingsTab === 'customisations' && (
              <div className="space-y-6">
                {/* Time Format */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Time Format</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Choose how times are displayed in your calendar.</p>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
                    <button 
                      onClick={() => setSettings({...settings, timeFormat: '12h'})}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${settings.timeFormat === '12h' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      12-hour (9:00 AM)
                    </button>
                    <button 
                      onClick={() => setSettings({...settings, timeFormat: '24h'})}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${settings.timeFormat === '24h' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      24-hour (09:00)
                    </button>
                  </div>
                </div>

                {/* Timezone */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Timezone</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Your calendar events will be displayed in this timezone.</p>
                  <div className="relative w-full max-w-xs">
                    <select 
                      value={settings.timezone}
                      onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
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
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeSettingsTab === 'integrations' && (
              <div className="space-y-6">
                {/* Google Calendar */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Google Calendar</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Sync your schedule with Google Calendar for two-way sync.</p>
                  
                  {/* Status indicator */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Status:</span>
                    {googleAccount ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        Synced
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                        Not Connected
                      </span>
                    )}
                  </div>

                  {googleAccount ? (
                    <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-3">
                        <img 
                          src={googleAccount.picture} 
                          alt={googleAccount.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{googleAccount.name}</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">{googleAccount.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleDisconnectGoogle}
                        className="flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
                      >
                        <Unlink size={16} />
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleConnectGoogle}
                      disabled={isGoogleConnecting || !googleApiReady}
                      className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                      {isGoogleConnecting ? (
                        <>
                          <Loader2 size={20} className="animate-spin text-slate-500" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Connecting...</span>
                        </>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Connect Google Calendar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TimeboxApp = ({ onBack, user, onLogin, onLogout }) => {
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'timebox' | 'habittracker'>('timebox');
  const [isLaterOpen, setIsLaterOpen] = useState(true);
  
  // State for Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'account' | 'billing' | 'customisations' | 'integrations'>('account');
  const [settings, setSettings] = useState({
    timeFormat: '12h',
    timezone: 'Local'
  });

  // State for Calendar Picker
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);

  // State for Tags
  const [userTags, setUserTags] = useState<{ name: string; color: string }[]>(() => {
    const saved = localStorage.getItem('ascend_user_tags');
    return saved ? JSON.parse(saved) : [];
  });
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagModalTaskId, setTagModalTaskId] = useState<string | number | null>(null);
  const [tagModalHabitId, setTagModalHabitId] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<{ name: string; color: string } | null>(null);

  // State for Notes (date-specific)
  const [notesContent, setNotesContent] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);

  // State for Promo Section - only shows once, then permanently hidden
  const [showPromo, setShowPromo] = useState(() => {
    const dismissed = localStorage.getItem('ascend_promo_dismissed');
    return dismissed !== 'true'; // Show only if not dismissed
  });

  // State for Weight Tracking
  const [weightEntries, setWeightEntries] = useState<{ date: string; weight: number }[]>(() => {
    const saved = localStorage.getItem('ascend_weight_entries');
    return saved ? JSON.parse(saved) : [];
  });
  const [newWeight, setNewWeight] = useState('');
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0]);

  // State for Habits
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('ascend_habits');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAddHabitOpen, setIsAddHabitOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Save habits to localStorage
  useEffect(() => {
    localStorage.setItem('ascend_habits', JSON.stringify(habits));
  }, [habits]);

  // Timeline refs and state
  const timelineRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentTimeDecimal = currentTime.getHours() + currentTime.getMinutes() / 60;

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
        
        // Check for OAuth callback params in URL (from backend redirect)
        const callbackResult = handleGoogleOAuthCallback();
        if (callbackResult?.connected) {
          console.log('OAuth callback successful');
          setGoogleAccount({ email: callbackResult.email || '', name: '', picture: '' });
          saveGoogleUser({ email: callbackResult.email || '' });
          setNotification({ type: 'success', message: 'Google Calendar connected!' });
          setIsGoogleConnecting(false);
        }
        
        setGoogleApiReady(true);
      } catch (error) {
        console.error('Failed to initialize Google APIs:', error);
        setGoogleApiReady(true); // Still mark as ready so user can try to connect
      }
    };
    initGoogle();
  }, []);

  // Check Google connection status when user logs in
  useEffect(() => {
    const checkGoogleConnection = async () => {
      if (!user) return;
      
      // Get Supabase session token for backend auth
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setSupabaseToken(session.access_token);
        
        // Check if Google is connected via backend
        const status = await checkGoogleConnectionStatus();
        if (status.connected) {
          console.log('Google Calendar connected via backend');
          setGoogleAccount({ email: status.email || '', name: '', picture: '' });
          saveGoogleUser({ email: status.email || '' });
          
          // Get access token for Google API calls
          const token = await getValidAccessToken();
          if (token) {
            setAccessToken(token);
          }
        }
      }
    };
    checkGoogleConnection();
  }, [user]);

  const handleConnectGoogle = () => {
    if (!user) {
      setNotification({ type: 'error', message: 'Please log in first' });
      return;
    }
    setIsGoogleConnecting(true);
    startGoogleOAuth(user.id);
  };

  const handleDisconnectGoogle = async () => {
    await disconnectGoogle();
    setGoogleAccount(null);
    setIsCalendarSynced(false);
    clearGoogleData();
    setNotification({ type: 'info', message: 'Google Calendar disconnected' });
  };

  // State for Lists and Schedule
  const [activeTasks, setActiveTasks] = useState<Task[]>(INITIAL_TASKS);
  const [laterTasks, setLaterTasks] = useState<Task[]>(LATER_TASKS);
  const [schedule, setSchedule] = useState<ScheduleBlock[]>(TIME_BLOCKS);
  const [newTaskInput, setNewTaskInput] = useState("");
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // Timeline zoom state
  const [isZoomedOut, setIsZoomedOut] = useState(false);
  const HOUR_HEIGHT_NORMAL = 96; // 96px per hour (normal view)
  const HOUR_HEIGHT_ZOOMED = 40; // 40px per hour (zoomed out view)
  const hourHeight = isZoomedOut ? HOUR_HEIGHT_ZOOMED : HOUR_HEIGHT_NORMAL;

  // Handle zoom toggle with auto-scroll to center current time
  const handleZoomToggle = () => {
    const newZoomState = !isZoomedOut;
    setIsZoomedOut(newZoomState);
    
    // Auto-scroll to center current time indicator in viewport
    setTimeout(() => {
      if (timelineRef.current) {
        const newHourHeight = newZoomState ? HOUR_HEIGHT_ZOOMED : HOUR_HEIGHT_NORMAL;
        const currentTimePosition = currentTimeDecimal * newHourHeight;
        const containerHeight = timelineRef.current.clientHeight;
        const scrollTarget = currentTimePosition - (containerHeight / 2);
        timelineRef.current.scrollTo({ 
          top: Math.max(0, scrollTarget), 
          behavior: 'smooth' 
        });
      }
    }, 50); // Small delay to let state update and re-render
  };

  // Load data from database on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        const [activeData, laterData, blocksData, userSettings, noteContent] = await Promise.all([
          loadTasks('active'),
          loadTasks('later'),
          loadScheduleBlocks(selectedDate),
          loadUserSettings(),
          loadNote(selectedDate)
        ]);

        // Always use database data if user is logged in (even if empty)
        setActiveTasks(activeData.map(t => ({
            id: t.id,
            title: t.title,
            tag: t.tag,
            tagColor: t.tagColor,
            time: t.time,
            completed: t.completed
        })));
          
        setLaterTasks(laterData.map(t => ({
            id: t.id,
            title: t.title,
            tag: t.tag,
            tagColor: t.tagColor,
            time: t.time,
            completed: t.completed
        })));

          setSchedule(blocksData);
          
        // Load notes for the selected date
        setNotesContent(noteContent);

        // Load user settings
        if (userSettings) {
          setSettings({
            timeFormat: userSettings.timeFormat || '12h',
            timezone: userSettings.timezone || 'Local'
          });
        }

        // Move incomplete "later" tasks from previous days
        await moveIncompleteLaterTasksToToday();

        setIsDataLoaded(true);
        
        // Auto-sync with Google Calendar if connected
        if (googleAccount) {
          await loadGoogleEventsForDate(selectedDate);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setIsDataLoaded(true);
      }
    };

    loadData();
  }, [user]);

  // Function to move incomplete "later" tasks to today (they persist across days)
  const moveIncompleteLaterTasksToToday = async () => {
    // Later tasks are already loaded - they persist by design
    // We just need to ensure incomplete ones remain visible
    console.log('Later tasks loaded - incomplete tasks persist across days');
  };

  // Function to load Google Calendar events for a specific date
  const loadGoogleEventsForDate = async (date: Date) => {
    if (!googleAccount) return;
    
    // Ensure we have a valid access token from backend
    const token = await getValidAccessToken();
    if (!token) {
      console.log('No valid Google token available');
      return;
    }
    setAccessToken(token);
    
    try {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      const googleEvents = await fetchGoogleCalendarEvents(startOfDay, endOfDay, true, true);
      
      const googleBlocks: ScheduleBlock[] = googleEvents.map(event => ({
        id: event.id,
        title: event.title,
        tag: (event as any).calendarName || 'google',
        start: event.start,
        duration: event.duration,
        color: (event as any).calendarColor ? '' : 'bg-blue-400/90 dark:bg-blue-600/90 border-blue-500',
        textColor: 'text-white',
        isGoogle: true,
        googleEventId: event.id,
        completed: false,
        calendarColor: (event as any).calendarColor,
        calendarName: (event as any).calendarName,
        calendarId: (event as any).calendarId,
        canEdit: (event as any).canEdit ?? false, // true if user has write access
      }));
      
      // Replace all Google events with fresh data from API (avoiding duplicates)
      setSchedule(prev => {
        // Keep only non-Google blocks (local blocks), replace all Google blocks with fresh data
        const localBlocks = prev.filter(b => !b.isGoogle);
        return [...localBlocks, ...googleBlocks];
      });
    } catch (error: any) {
      console.error('Failed to load Google Calendar events:', error);
      // Handle session expired - clear Google account and notify user
      if (error?.message === 'SESSION_EXPIRED') {
        setGoogleAccount(null);
        setNotification({ 
          type: 'info', 
          message: 'Google Calendar session expired. Please reconnect in Settings.' 
        });
      }
    }
  };
  
  // Drag State
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverList, setDragOverList] = useState(null);
  const [dragOverHour, setDragOverHour] = useState(null);

  // Resize State
  const [resizingBlockId, setResizingBlockId] = useState<number | string | null>(null);
  const [resizeStartY, setResizeStartY] = useState<number | null>(null);
  const [resizeStartDuration, setResizeStartDuration] = useState<number | null>(null);

  // Drag/Move Block State
  const [draggingBlockId, setDraggingBlockId] = useState<number | string | null>(null);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragStartTime, setDragStartTime] = useState<number | null>(null);

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCalendarSynced, setIsCalendarSynced] = useState(false);

  // Auto-sync Google Calendar when account is connected (after OAuth redirect)
  useEffect(() => {
    const autoSync = async () => {
      if (googleAccount && isDataLoaded && !isCalendarSynced) {
        console.log('Auto-syncing Google Calendar...');
        try {
          await loadGoogleEventsForDate(selectedDate);
          setIsCalendarSynced(true);
          console.log('Auto-sync complete');
        } catch (error) {
          console.error('Auto-sync failed:', error);
        }
      }
    };
    autoSync();
  }, [googleAccount, isDataLoaded]);

  // Load schedule blocks and notes when selectedDate changes
  useEffect(() => {
    const loadDateData = async () => {
      if (!user || !isDataLoaded) return;
      
      try {
        setNotesLoading(true);
        
        // Load schedule blocks and notes for the new date
        const [blocksData, noteContent] = await Promise.all([
          loadScheduleBlocks(selectedDate),
          loadNote(selectedDate)
        ]);
        
        // Update schedule (keep only non-Google events from database, Google events will be loaded separately)
        setSchedule(blocksData);
        
        // Update notes
        setNotesContent(noteContent);
        
        // Reload Google Calendar events for the new date
        if (googleAccount) {
          await loadGoogleEventsForDate(selectedDate);
        }
      } catch (error) {
        console.error('Error loading data for date:', error);
      } finally {
        setNotesLoading(false);
      }
    };
    
    loadDateData();
  }, [selectedDate, user, isDataLoaded]);

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

  // Time labels for full 24-hour day
  const timeLabels = Array.from({ length: 24 }, (_, i) => i);

  // Scroll to current time on load
  useEffect(() => {
    if (timelineRef.current && isDataLoaded) {
      const scrollPosition = Math.max(0, (currentTimeDecimal - 2) * 96);
      timelineRef.current.scrollTop = scrollPosition;
    }
  }, [isDataLoaded]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCalendarOpen]);

  // State for habit tag menu
  const [habitTagMenuOpen, setHabitTagMenuOpen] = useState<string | null>(null);

  // Close habit tag menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setHabitTagMenuOpen(null);
    if (habitTagMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [habitTagMenuOpen]);

  // Calendar helper functions
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const isSameDay = (date1: Date, date2: Date) => date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate();
  const isToday = (date: Date) => isSameDay(date, new Date());

  // Habit helper functions
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const isHabitScheduledForDay = (habit: Habit, date: Date) => habit.frequency === 'daily' || habit.scheduledDays.includes(date.getDay());
  const isHabitCompletedOnDate = (habit: Habit, dateString: string) => habit.completedDates.includes(dateString);

  const calculateStreak = (habit: Habit): number => {
    let streak = 0;
    let currentDate = new Date();
    const todayString = currentDate.toISOString().split('T')[0];
    
    while (true) {
      const dateString = currentDate.toISOString().split('T')[0];
      if (isHabitScheduledForDay(habit, currentDate)) {
        if (habit.completedDates.includes(dateString)) streak++;
        else if (dateString !== todayString) break;
      }
      currentDate.setDate(currentDate.getDate() - 1);
      if (streak > 365) break;
    }
    return streak;
  };

  const toggleHabitCompletion = (habitId: string, date?: Date) => {
    const targetDate = date || new Date();
    const dateString = targetDate.toISOString().split('T')[0];
    
    setHabits(prev => prev.map(habit => {
      if (habit.id !== habitId) return habit;
      const isCompleted = habit.completedDates.includes(dateString);
      const newCompletedDates = isCompleted ? habit.completedDates.filter(d => d !== dateString) : [...habit.completedDates, dateString];
      const updatedHabit = { ...habit, completedDates: newCompletedDates };
      const newStreak = calculateStreak(updatedHabit);
      return { ...updatedHabit, currentStreak: newStreak, longestStreak: Math.max(updatedHabit.longestStreak, newStreak) };
    }));
  };

  const addHabit = (newHabit: Omit<Habit, 'id' | 'currentStreak' | 'longestStreak' | 'completedDates' | 'createdAt'>) => {
    const habit: Habit = { ...newHabit, id: crypto.randomUUID(), currentStreak: 0, longestStreak: 0, completedDates: [], createdAt: new Date().toISOString() };
    setHabits(prev => [...prev, habit]);
    setIsAddHabitOpen(false);
  };

  const updateHabit = (habitId: string, updates: Partial<Habit>) => {
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, ...updates } : h));
    setEditingHabit(null);
  };

  const deleteHabit = (habitId: string) => setHabits(prev => prev.filter(h => h.id !== habitId));

  const getTodaysHabits = () => habits.filter(h => isHabitScheduledForDay(h, new Date()));
  const getUnscheduledTodaysHabits = () => getTodaysHabits().filter(h => !h.scheduledStartTime);

  const getWeeklyData = (habit: Habit) => {
    const result = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      result.push({
        date, dateString, dayName: WEEKDAYS[date.getDay()],
        isScheduled: isHabitScheduledForDay(habit, date),
        isCompleted: habit.completedDates.includes(dateString),
        isToday: i === 0
      });
    }
    return result;
  };

  // Tag handlers
  const handleCreateTag = (tagName: string, tagColor: string) => {
    if (editingTag) {
      // Editing existing tag - update all tasks/habits that use this tag
      const oldTagName = editingTag.name;
      const updatedTags = userTags.map(t => t.name === oldTagName ? { name: tagName, color: tagColor } : t);
      setUserTags(updatedTags);
      localStorage.setItem('ascend_user_tags', JSON.stringify(updatedTags));
      
      // Update all tasks with the old tag
      setActiveTasks(prev => prev.map(t => t.tag === oldTagName ? { ...t, tag: tagName, tagColor: tagColor } : t));
      setLaterTasks(prev => prev.map(t => t.tag === oldTagName ? { ...t, tag: tagName, tagColor: tagColor } : t));
      
      // Update all habits with the old tag
      setHabits(prev => prev.map(h => h.tag === oldTagName ? { ...h, tag: tagName, tagColor: tagColor } : h));
      
      setEditingTag(null);
    } else {
      // Creating new tag
      const newTag = { name: tagName, color: tagColor };
      const updatedTags = [...userTags, newTag];
      setUserTags(updatedTags);
      localStorage.setItem('ascend_user_tags', JSON.stringify(updatedTags));
      
      // Apply to task if one is selected
      if (tagModalTaskId) handleAddTagToTask(tagModalTaskId, tagName, tagColor);
      // Apply to habit if one is selected
      if (tagModalHabitId) handleAddTagToHabit(tagModalHabitId, tagName, tagColor);
    }
    setTagModalTaskId(null);
    setTagModalHabitId(null);
  };

  const handleDeleteTag = () => {
    if (!editingTag) return;
    const tagToDelete = editingTag.name;
    const updatedTags = userTags.filter(t => t.name !== tagToDelete);
    setUserTags(updatedTags);
    localStorage.setItem('ascend_user_tags', JSON.stringify(updatedTags));
    
    // Remove tag from all tasks
    setActiveTasks(prev => prev.map(t => t.tag === tagToDelete ? { ...t, tag: null, tagColor: null } : t));
    setLaterTasks(prev => prev.map(t => t.tag === tagToDelete ? { ...t, tag: null, tagColor: null } : t));
    
    // Remove tag from all habits
    setHabits(prev => prev.map(h => h.tag === tagToDelete ? { ...h, tag: undefined, tagColor: undefined } : h));
    
    setEditingTag(null);
  };

  const handleOpenEditTagModal = (tag: { name: string; color: string }) => {
    setEditingTag(tag);
    setIsTagModalOpen(true);
  };

  const handleAddTagToTask = async (taskId: number | string, tagName: string, tagColor: string) => {
    setActiveTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, tag: tagName, tagColor: tagColor } : t));
    setLaterTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, tag: tagName, tagColor: tagColor } : t));
    await updateTask(String(taskId), { tag: tagName, tagColor: tagColor });
  };

  const handleRemoveTagFromTask = async (taskId: number | string) => {
    setActiveTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, tag: null, tagColor: null } : t));
    setLaterTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, tag: null, tagColor: null } : t));
    await updateTask(String(taskId), { tag: null, tagColor: null });
  };

  const handleOpenTagModal = (taskId: number | string) => { setTagModalTaskId(taskId); setIsTagModalOpen(true); };

  // Habit tag handlers
  const handleAddTagToHabit = (habitId: string, tagName: string, tagColor: string) => {
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, tag: tagName, tagColor: tagColor } : h));
  };

  const handleRemoveTagFromHabit = (habitId: string) => {
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, tag: undefined, tagColor: undefined } : h));
  };

  const handleMoveTaskToList = async (taskId: number | string, targetList: 'active' | 'later') => {
    const taskInActive = activeTasks.find(t => String(t.id) === String(taskId));
    const taskInLater = laterTasks.find(t => String(t.id) === String(taskId));
    const task = taskInActive || taskInLater;
    if (!task) return;
    
    if (taskInActive && targetList === 'later') {
      setActiveTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
      setLaterTasks(prev => [...prev, { ...task, time: null }]);
    } else if (taskInLater && targetList === 'active') {
      setLaterTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
      setActiveTasks(prev => [...prev, task]);
    }
    await moveTask(String(taskId), targetList);
  };

  const handleToggleComplete = async (taskId: number | string, listType: 'active' | 'later') => {
    const currentTask = listType === 'active' ? activeTasks.find(t => String(t.id) === String(taskId)) : laterTasks.find(t => String(t.id) === String(taskId));
    const newCompleted = currentTask ? !currentTask.completed : true;
    
    if (listType === 'active') {
      setActiveTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, completed: newCompleted } : t));
    } else {
      setLaterTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, completed: newCompleted } : t));
    }
    setSchedule(prev => prev.map(block => String(block.taskId) === String(taskId) ? { ...block, completed: newCompleted } : block));
    await updateTask(String(taskId), { completed: newCompleted });
  };

  const handleToggleBlockComplete = async (blockId: number | string) => {
    const block = schedule.find(b => String(b.id) === String(blockId));
    if (!block) return;
    const newCompleted = !block.completed;
    setSchedule(prev => prev.map(b => String(b.id) === String(blockId) ? { ...b, completed: newCompleted } : b));
    if (block.taskId) {
      setActiveTasks(prev => prev.map(t => String(t.id) === String(block.taskId) ? { ...t, completed: newCompleted } : t));
      setLaterTasks(prev => prev.map(t => String(t.id) === String(block.taskId) ? { ...t, completed: newCompleted } : t));
    }
    if (block.habitId) toggleHabitCompletion(block.habitId, selectedDate);
    await updateScheduleBlock(String(blockId), { completed: newCompleted });
  };

  // Notes handlers (date-specific)
  const notesSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleNotesChange = (content: string) => {
    setNotesContent(content);
    
    // Debounce save to avoid too many API calls
    if (notesSaveTimeoutRef.current) {
      clearTimeout(notesSaveTimeoutRef.current);
    }
    
    notesSaveTimeoutRef.current = setTimeout(async () => {
      if (user) {
        const success = await saveNote(selectedDate, content);
        if (success) {
          setNotesSaved(true);
          setTimeout(() => setNotesSaved(false), 2000);
        }
      }
    }, 500);
  };

  const handleDismissPromo = () => {
    setShowPromo(false);
    localStorage.setItem('ascend_promo_dismissed', 'true');
  };

  const handleAddWeight = () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) return;
    
    const dateToLog = weightDate;
    const existingIndex = weightEntries.findIndex(e => e.date === dateToLog);
    
    let updatedEntries = existingIndex >= 0 
      ? weightEntries.map((e, i) => i === existingIndex ? { date: dateToLog, weight } : e)
      : [...weightEntries, { date: dateToLog, weight }].sort((a, b) => a.date.localeCompare(b.date));
    
    if (updatedEntries.length > 90) updatedEntries = updatedEntries.slice(-90);
    
    setWeightEntries(updatedEntries);
    localStorage.setItem('ascend_weight_entries', JSON.stringify(updatedEntries));
    setNewWeight('');
    setWeightDate(new Date().toISOString().split('T')[0]);
    setNotification({ type: 'success', message: `Weight logged: ${weight} kg` });
  };

  // Calendar date selection
  const handleDateSelect = async (day: number) => {
    const newDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
    setSelectedDate(newDate);
    setIsCalendarOpen(false);
    await loadScheduleForDate(newDate);
  };

  const loadScheduleForDate = async (date: Date) => {
    try {
      const blocksData = await loadScheduleBlocks(date);
      const dateString = date.toISOString().split('T')[0];
      
      // Add habit blocks
      const habitBlocks: ScheduleBlock[] = habits
        .filter(h => h.scheduledStartTime && isHabitScheduledForDay(h, date))
        .map(habit => {
          const [startHours, startMinutes] = habit.scheduledStartTime!.split(':').map(Number);
          const startTime = startHours + startMinutes / 60;
          let duration = 0.5;
          if (habit.scheduledEndTime) {
            const [endHours, endMinutes] = habit.scheduledEndTime.split(':').map(Number);
            duration = Math.max(0.25, (endHours + endMinutes / 60) - startTime);
          }
          return {
            id: `habit-${habit.id}-${dateString}`,
            title: habit.name,
            tag: habit.tag,
            start: startTime,
            duration,
            color: habit.tagColor ? `bg-[${habit.tagColor}]` : 'bg-[#6F00FF]',
            textColor: 'text-white',
            isGoogle: false,
            completed: habit.completedDates.includes(dateString),
            habitId: habit.id,
            calendarColor: habit.tagColor,
          };
        });

      // Fetch Google Calendar events
      let googleBlocks: ScheduleBlock[] = [];
      if (googleAccount) {
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
        try {
        const googleEvents = await fetchGoogleCalendarEvents(startOfDay, endOfDay, true, true);
          googleBlocks = googleEvents.map(event => ({
          id: event.id,
          title: event.title,
            tag: (event as any).calendarName || 'google',
          start: event.start,
          duration: event.duration,
          color: (event as any).calendarColor ? '' : 'bg-blue-400/90 dark:bg-blue-600/90 border-blue-500',
          textColor: 'text-white',
          isGoogle: true,
          googleEventId: event.id,
          completed: false,
          calendarColor: (event as any).calendarColor,
          calendarName: (event as any).calendarName,
        }));
        } catch (error) {
          console.error('Failed to fetch Google Calendar events:', error);
        }
      }
      
      // Combine all blocks, avoiding duplicates
      const dbBlockGoogleIds = new Set(blocksData.map(b => b.googleEventId).filter(Boolean));
      const uniqueGoogleBlocks = googleBlocks.filter(g => !dbBlockGoogleIds.has(g.googleEventId));
        setSchedule([...blocksData, ...uniqueGoogleBlocks, ...habitBlocks]);
    } catch (error) {
      console.error('Failed to load schedule for date:', error);
      setNotification({ type: 'error', message: 'Failed to load schedule' });
    }
  };

  const handlePrevMonth = () => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1));

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

  // Use refs to access current values without triggering re-renders
  const scheduleRef = useRef(schedule);
  scheduleRef.current = schedule;
  const hourHeightRef = useRef(hourHeight);
  hourHeightRef.current = hourHeight;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const currentHourHeight = hourHeightRef.current;
      
      // Handle resize
      if (resizingBlockId !== null && resizeStartY !== null && resizeStartDuration !== null) {
        const deltaY = e.clientY - resizeStartY;
        const deltaHours = deltaY / currentHourHeight;
        let newDuration = resizeStartDuration + deltaHours;
        newDuration = Math.round(newDuration * 4) / 4;
        if (newDuration < 0.25) newDuration = 0.25;
        setSchedule(prev => prev.map(block => block.id === resizingBlockId ? { ...block, duration: newDuration } : block));
      }
      
      // Handle drag/move
      if (draggingBlockId !== null && dragStartY !== null && dragStartTime !== null) {
        const deltaY = e.clientY - dragStartY;
        const deltaHours = deltaY / currentHourHeight;
        let newStart = dragStartTime + deltaHours;
        newStart = Math.round(newStart * 4) / 4;
        // Use ref to get current schedule without causing re-renders
        const currentSchedule = scheduleRef.current;
        const block = currentSchedule.find(b => b.id === draggingBlockId);
        if (block) {
          if (newStart < 0) newStart = 0;
          if (newStart + block.duration > 24) newStart = 24 - block.duration;
        }
        setSchedule(prev => prev.map(block => block.id === draggingBlockId ? { ...block, start: newStart } : block));
      }
    };

    const handleMouseUp = async () => {
      // Use ref to get current schedule
      const currentSchedule = scheduleRef.current;
      
      // Helper to check if we can edit a Google Calendar event
      // Check if user has write access to edit this calendar event
      const canEditGoogleEvent = (block: ScheduleBlock) => {
        // Local blocks (not from Google) can always be edited
        if (!block.isGoogle) return true;
        // Google blocks use the canEdit flag from the API
        return block.canEdit === true;
      };
      
      // Handle resize end
      if (resizingBlockId !== null) {
        const resizedBlock = currentSchedule.find(b => b.id === resizingBlockId);
        if (resizedBlock) {
          // Only save to database if it's NOT a Google Calendar event
          // (Google events are synced from Google, not stored locally)
          if (!resizedBlock.isGoogle) {
            await updateScheduleBlock(String(resizedBlock.id), { 
              duration: resizedBlock.duration 
            });
          }
          
          // Update Google Calendar if it's an Ascend calendar event (we have write access)
          if (resizedBlock.googleEventId && googleAccount) {
            if (canEditGoogleEvent(resizedBlock)) {
              try {
                await updateGoogleCalendarEvent(
                  resizedBlock.googleEventId, 
                  resizedBlock.title, 
                  resizedBlock.start, 
                  resizedBlock.duration, 
                  selectedDate,
                  resizedBlock.calendarId
                );
                console.log('Updated Google Calendar event duration');
                setNotification({ type: 'success', message: 'Event updated' });
              } catch (error) {
                console.error('Failed to update Google Calendar event:', error);
                setNotification({ type: 'error', message: 'Failed to update event' });
              }
            } else {
              // External calendar - can't edit, show message
              setNotification({ type: 'info', message: `External calendar events (${resizedBlock.calendarName}) are read-only` });
            }
          }
        }
        setResizingBlockId(null);
        setResizeStartY(null);
        setResizeStartDuration(null);
      }
      
      // Handle drag/move end
      if (draggingBlockId !== null) {
        const movedBlock = currentSchedule.find(b => b.id === draggingBlockId);
        if (movedBlock) {
          // Only save to database if it's NOT a Google Calendar event
          if (!movedBlock.isGoogle) {
            await updateScheduleBlock(String(movedBlock.id), { 
              start: movedBlock.start 
            });
          }
          
          // Update Google Calendar if it's an Ascend calendar event (we have write access)
          if (movedBlock.googleEventId && googleAccount) {
            if (canEditGoogleEvent(movedBlock)) {
              try {
                await updateGoogleCalendarEvent(
                  movedBlock.googleEventId, 
                  movedBlock.title, 
                  movedBlock.start, 
                  movedBlock.duration, 
                  selectedDate,
                  movedBlock.calendarId
                );
                console.log('Updated Google Calendar event time');
                setNotification({ type: 'success', message: 'Event time updated' });
              } catch (error) {
                console.error('Failed to update Google Calendar event:', error);
                setNotification({ type: 'error', message: 'Failed to update event' });
              }
            } else {
              // External calendar - can't edit, show message
              setNotification({ type: 'info', message: `External calendar events (${movedBlock.calendarName}) are read-only` });
            }
          }
        }
        setDraggingBlockId(null);
        setDragStartY(null);
        setDragStartTime(null);
      }
    };

    if (resizingBlockId !== null || draggingBlockId !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  // Removed 'schedule' from deps - using scheduleRef instead to prevent listener churn during drag
  }, [resizingBlockId, resizeStartY, resizeStartDuration, draggingBlockId, dragStartY, dragStartTime, googleAccount, selectedDate]);

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
    // Find and delete linked schedule block
    const linkedBlock = schedule.find(b => b.taskId && String(b.taskId) === String(taskId));
    if (linkedBlock) {
      if (linkedBlock.googleEventId && googleAccount) {
        try {
          await deleteGoogleCalendarEvent(linkedBlock.googleEventId);
        } catch (error) {
          console.error('Failed to delete from Google Calendar:', error);
        }
      }
      await deleteScheduleBlock(String(linkedBlock.id));
      setSchedule(prev => prev.filter(b => String(b.id) !== String(linkedBlock.id)));
    }
    
    // Delete task from database
    await deleteTaskFromDb(String(taskId));
    if (listType === 'active') {
      setActiveTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
    } else {
      setLaterTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
    }
  };

  const handleDeleteBlock = async (blockId: number | string) => {
    const block = schedule.find(b => String(b.id) === String(blockId));
    
    // Check if this is an external calendar event (read-only)
    const isReadOnlyEvent = block?.isGoogle && block?.canEdit !== true;
    
    if (isReadOnlyEvent) {
      // Read-only calendar events can't be deleted - just hide from view
      setNotification({ type: 'info', message: `Calendar events from "${block?.calendarName}" can only be hidden (read-only access)` });
      setSchedule(prev => prev.filter(b => String(b.id) !== String(blockId)));
      return;
    }
    
    // Delete from Google Calendar (only if we have write access)
    if (block?.googleEventId && googleAccount && block?.canEdit) {
      try {
        await deleteGoogleCalendarEvent(block.googleEventId);
      } catch (error) {
        console.error('Failed to delete from Google Calendar:', error);
        setNotification({ type: 'error', message: 'Failed to delete from Google Calendar' });
      }
    }

    // Clear linked task's time (but don't delete the task)
    if (block?.taskId) {
      setActiveTasks(prev => prev.map(t => String(t.id) === String(block.taskId) ? { ...t, time: null } : t));
      setLaterTasks(prev => prev.map(t => String(t.id) === String(block.taskId) ? { ...t, time: null } : t));
      // Update in database
      await updateTask(String(block.taskId), { time: null });
    }

    // Delete from database
    await deleteScheduleBlock(String(blockId));
    setSchedule(prev => prev.filter(b => String(b.id) !== String(blockId)));
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

      // Perform two-way sync
      const syncResult = await syncCalendarEvents(localBlocksForSync, new Date());

      setSchedule(prev => {
        let updated = [...prev];

        // Add new events from Google
        const newBlocks = syncResult.toAdd.map(event => ({
          id: event.id,
          title: event.title,
          tag: 'google',
          start: event.start,
          duration: event.duration,
          color: 'bg-blue-400/90 dark:bg-blue-600/90 border-blue-500',
          textColor: 'text-blue-950 dark:text-blue-50',
          isGoogle: true,
          googleEventId: event.id,
        }));
        updated = [...updated, ...newBlocks];

        // Update changed events
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

    } catch (error: any) {
      console.error('Sync failed:', error);
      const errorMessage = error?.message || '';
      
      // Check if user needs to reconnect
      if (errorMessage.includes('reconnect') || errorMessage.includes('expired') || errorMessage.includes('401')) {
        clearGoogleData();
        setGoogleAccount(null);
        setIsCalendarSynced(false);
        setNotification({ type: 'error', message: 'Please reconnect Google Calendar in Settings to enable sync.' });
      } else {
      setNotification({ type: 'error', message: 'Failed to sync with Google Calendar' });
      }
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

  const handleListDrop = async (e, targetListId) => {
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
    
    // Save to database
    await moveTask(String(task.id), targetListId);
    
    setDraggedItem(null);
  };

  const handleHourDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
  };

  const handleHourDrop = async (e, hour) => {
      e.preventDefault();
      setDragOverHour(null);
      
      // Check if a habit was dropped
      const habitId = e.dataTransfer.getData('habitId');
      if (habitId) {
        const habitName = e.dataTransfer.getData('habitName');
        const habitTag = e.dataTransfer.getData('habitTag') || null;
        const habitTagColor = e.dataTransfer.getData('habitTagColor') || null;
        
        // Check if already on timeline
        const existingBlock = schedule.find(b => b.habitId === habitId);
        if (existingBlock) {
          setNotification({ type: 'info', message: 'This habit is already on the timeline!' });
          return;
        }
        
        const blockData = {
          title: habitName,
          tag: habitTag,
          start: hour,
          duration: 1,
          color: habitTagColor ? `bg-[${habitTagColor}]` : 'bg-[#6F00FF]',
          textColor: 'text-white',
          isGoogle: googleAccount !== null,
          completed: false,
          habitId: habitId,
        };
        
        // Save to database
        const savedBlock = await createScheduleBlock(blockData, selectedDate);
        
        const habitBlock: ScheduleBlock = savedBlock ? {
          ...savedBlock,
          habitId: habitId,
          calendarColor: habitTagColor,
        } : {
          id: Date.now(),
          ...blockData,
          calendarColor: habitTagColor,
        };
        
        // Sync to Google Calendar if connected - do this BEFORE adding to state
        let googleEventId: string | undefined;
        console.log('Checking Google sync for habit:', { googleAccount: !!googleAccount });
        
        if (googleAccount) {
          try {
            console.log('Creating Google Calendar event for habit:', habitName, 'at hour:', hour);
            googleEventId = await createGoogleCalendarEvent(habitName, hour, 1, selectedDate, habitTag || undefined);
            console.log('Google Calendar event created with ID:', googleEventId);
            
            // Update database with Google event ID
            if (savedBlock && googleEventId) {
              await updateScheduleBlock(String(savedBlock.id), { googleEventId: googleEventId });
            }
          } catch (error: any) {
            console.error('Failed to create Google Calendar event for habit:', error);
            setNotification({ type: 'error', message: `Failed to sync "${habitName}" to Google Calendar` });
          }
        }
        
        // Add to schedule with Google event ID if available
        const finalBlock: ScheduleBlock = {
          ...habitBlock,
          googleEventId: googleEventId,
        };
        
        setSchedule(prev => [...prev, finalBlock]);
        
        if (googleEventId) {
          setNotification({ type: 'success', message: `Scheduled "${habitName}" and synced to Google Calendar` });
        } else if (!googleAccount) {
          setNotification({ type: 'success', message: `Scheduled "${habitName}" at ${formatTime(hour)}` });
        }
        return;
      }
      
      if (!draggedItem) return;
      const { task } = draggedItem;

      // Check if task is already on timeline
      const existingBlock = schedule.find(b => b.taskId === task.id);
      if (existingBlock) {
        setNotification({ type: 'info', message: 'This task is already on the timeline!' });
        setDraggedItem(null);
        return;
      }

      const blockData = {
          title: task.title,
          tag: task.tag || null,
          start: hour,
          duration: 1,
          color: "bg-indigo-400/90 dark:bg-indigo-600/90 border-indigo-500", 
          textColor: "text-indigo-950 dark:text-indigo-50",
          isGoogle: googleAccount !== null,
          completed: task.completed || false,
          taskId: task.id
      };

      const savedBlock = await createScheduleBlock(blockData, selectedDate);
      
      const newBlock: ScheduleBlock = savedBlock ? {
          ...savedBlock,
          taskId: task.id,
          completed: task.completed || false
      } : {
          id: Date.now(),
          ...blockData
      };

      setSchedule(prev => [...prev, newBlock]);
      
      // Update task time in both UI and database
          const timeString = formatTime(hour);
      if (draggedItem.sourceList === 'active') {
          setActiveTasks(prev => prev.map(t => t.id === task.id ? { ...t, time: timeString } : t));
      } else {
          setLaterTasks(prev => prev.map(t => t.id === task.id ? { ...t, time: timeString } : t));
      }
      await updateTask(String(task.id), { time: timeString });
      
      setDraggedItem(null);

      if (googleAccount) {
          try {
              const eventId = await createGoogleCalendarEvent(task.title, hour, newBlock.duration, selectedDate, task.tag || undefined);
              setSchedule(prev => prev.map(b => b.id === newBlock.id ? { ...b, googleEventId: eventId } : b));
              setNotification({ type: 'success', message: `Added "${task.title}" to Google Calendar` });
          } catch (error: any) {
              console.error('Failed to create Google Calendar event:', error);
              const errorMessage = error?.message || 'Unknown error';
              if (errorMessage.includes('token expired') || errorMessage.includes('Not signed in')) {
                setNotification({ type: 'error', message: 'Google session expired. Please reconnect in Settings.' });
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
            <img src="/favicon.svg" alt="Ascend" className="w-8 h-8 rounded-lg shadow-md shadow-violet-600/20" />
            <span className="font-bold text-lg tracking-tight">Ascend<span className="text-[#6F00FF]">.</span></span>
          </button>
        </div>

        {/* Center Navigation Tabs */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 text-[#6F00FF] shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('timebox')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === 'timebox' ? 'bg-white dark:bg-slate-700 text-[#6F00FF] shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <Clock size={16} /> Timebox
          </button>
          <button 
            onClick={() => setActiveTab('habittracker')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === 'habittracker' ? 'bg-white dark:bg-slate-700 text-[#6F00FF] shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <Flame size={16} /> Habits
          </button>
        </div>

        <div className="flex items-center gap-3">
           <button onClick={toggleTheme} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
             {isDark ? <Sun size={18} /> : <Moon size={18} />}
           </button>
           
           <button onClick={() => {
             setSettingsInitialTab('account');
             setIsSettingsOpen(true);
           }} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Settings">
             <Settings size={18} />
           </button>
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          setSettings={setSettings}
          googleAccount={googleAccount}
          isGoogleConnecting={isGoogleConnecting}
          googleApiReady={googleApiReady}
          handleConnectGoogle={handleConnectGoogle}
          handleDisconnectGoogle={handleDisconnectGoogle}
          isDark={isDark}
          toggleTheme={toggleTheme}
          user={user}
          onLogout={onLogout}
          initialTab={settingsInitialTab}
        />
      )}

      {/* Tag Modal */}
      <TagModal 
        isOpen={isTagModalOpen} 
        onClose={() => { setIsTagModalOpen(false); setTagModalTaskId(null); setTagModalHabitId(null); setEditingTag(null); }} 
        onSave={handleCreateTag} 
        editTag={editingTag}
        onDelete={handleDeleteTag}
      />

      {/* Main Content Area */}
      {activeTab === 'dashboard' && (
        <div className="flex-1 overflow-y-auto animate-fade-in-up">
          <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                  {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}{user ? `, ${user.name?.split(' ')[0] || ''}` : ''}! 👋
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3 shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="text-2xl font-bold text-[#6F00FF]">{activeTasks.filter(t => t.completed).length}/{activeTasks.length}</div>
                  <div className="text-xs text-slate-500">Tasks done</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl px-4 py-3 shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="text-2xl font-bold text-emerald-500">{schedule.reduce((sum, b) => sum + b.duration, 0).toFixed(1)}h</div>
                  <div className="text-xs text-slate-500">Scheduled</div>
                </div>
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Today's Tasks */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><ListTodo size={20} className="text-[#6F00FF]" /> Today's Tasks</h2>
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">{activeTasks.filter(t => t.completed).length} of {activeTasks.length}</span>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {activeTasks.length === 0 ? (
                      <p className="text-center text-slate-400 py-8 text-sm">No tasks for today</p>
                    ) : (
                      activeTasks.map(task => (
                        <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${task.completed ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 opacity-60' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                          <button onClick={() => handleToggleComplete(task.id, 'active')} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600 hover:border-[#6F00FF]'}`}>
                            {task.completed && <Check size={12} className="text-white" />}
                          </button>
                          <span className={`flex-1 text-sm ${task.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</span>
                          {task.tag && <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-white" style={{ backgroundColor: task.tagColor || '#6F00FF' }}>{task.tag}</span>}
                        </div>
                      ))
                    )}
                  </div>
                  <button onClick={() => setActiveTab('timebox')} className="w-full mt-4 py-2 text-sm text-[#6F00FF] hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors font-medium">Open Timebox →</button>
                </div>
              </div>

              {/* Weight Tracker */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><Activity size={20} className="text-[#6F00FF]" /> Weight Tracker</h2>
                    {weightEntries.length > 0 && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-500">Current: <strong className="text-slate-800 dark:text-white">{weightEntries[weightEntries.length - 1]?.weight} kg</strong></span>
                        {weightEntries.length > 1 && (
                          <span className={`font-medium ${weightEntries[weightEntries.length - 1].weight < weightEntries[0].weight ? 'text-emerald-500' : 'text-red-500'}`}>
                            {weightEntries[weightEntries.length - 1].weight < weightEntries[0].weight ? '↓' : '↑'}
                            {Math.abs(weightEntries[weightEntries.length - 1].weight - weightEntries[0].weight).toFixed(1)} kg
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <WeightLineChart entries={weightEntries} height={220} />
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <input type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/50" />
                    <input type="number" step="0.1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="Weight (kg)" className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/50" onKeyDown={(e) => e.key === 'Enter' && handleAddWeight()} />
                    <button onClick={handleAddWeight} className="px-4 py-2 bg-[#6F00FF] text-white text-sm font-medium rounded-lg hover:bg-[#5800cc] transition-colors">Log</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'habittracker' && (
        <div className="flex-1 overflow-hidden animate-fade-in-up">
          <div className="h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6F00FF] to-purple-600 flex items-center justify-center"><Flame size={20} className="text-white" /></div>
                    Habit Tracker
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Build consistency, one day at a time</p>
                </div>
                <button onClick={() => setIsAddHabitOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#6F00FF] text-white rounded-xl font-semibold hover:bg-[#5800cc] transition-all shadow-lg shadow-purple-500/25">
                  <Plus size={18} /> New Habit
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Target size={14} /> Active Habits</div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{habits.length}</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Check size={14} /> Done Today</div>
                  <div className="text-2xl font-bold text-emerald-500">{getTodaysHabits().filter(h => isHabitCompletedOnDate(h, getTodayString())).length}<span className="text-slate-400 text-lg font-normal">/{getTodaysHabits().length}</span></div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><Flame size={14} /> Best Streak</div>
                  <div className="text-2xl font-bold text-orange-500">{habits.length > 0 ? Math.max(...habits.map(h => h.longestStreak)) : 0}<span className="text-slate-400 text-sm font-normal ml-1">days</span></div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-1"><TrendingUp size={14} /> Weekly Rate</div>
                  <div className="text-2xl font-bold text-blue-500">{habits.length > 0 ? Math.round(habits.reduce((acc, h) => { const weekData = getWeeklyData(h); const scheduled = weekData.filter(d => d.isScheduled).length; const completed = weekData.filter(d => d.isScheduled && d.isCompleted).length; return acc + (scheduled > 0 ? (completed / scheduled) * 100 : 0); }, 0) / habits.length) : 0}%</div>
                </div>
              </div>

              {/* Today's Habits */}
              <div>
                <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <Zap size={18} className="text-amber-500" /> Today's Habits
                  <span className="text-sm font-normal text-slate-400 ml-2">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </h2>
                
                {getTodaysHabits().length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <Activity size={48} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="text-slate-500">No habits scheduled for today</p>
                    <p className="text-slate-400 text-sm mt-1">Create a new habit to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getTodaysHabits().map(habit => {
                      const isCompleted = isHabitCompletedOnDate(habit, getTodayString());
                      const weekData = getWeeklyData(habit);
                      return (
                        <div key={habit.id} className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border transition-all ${isCompleted ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                          <div className="flex items-center gap-4">
                            <button onClick={() => toggleHabitCompletion(habit.id)} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 ${isCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-700'}`} style={!isCompleted && habit.tagColor ? { backgroundColor: habit.tagColor } : undefined}>
                              {isCompleted ? <Check size={24} strokeWidth={3} className="text-white" /> : <Target size={20} className="text-white" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className={`font-semibold text-slate-800 dark:text-slate-100 ${isCompleted ? 'line-through opacity-60' : ''}`}>{habit.name}</h3>
                                {habit.scheduledStartTime && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center gap-1"><Clock size={10} />{habit.scheduledStartTime}{habit.scheduledEndTime ? ` - ${habit.scheduledEndTime}` : ''}</span>}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                {habit.tag && <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: habit.tagColor || '#6F00FF' }}>{habit.tag}</span>}
                                {habit.currentStreak > 0 && <span className="text-xs font-medium text-orange-500 flex items-center gap-1"><Flame size={12} />{habit.currentStreak} day streak</span>}
                              </div>
                            </div>
                            <div className="hidden sm:flex items-center gap-1">
                              {weekData.map((day, idx) => (
                                <div key={idx} className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-medium ${day.isToday ? 'ring-2 ring-[#6F00FF] ring-offset-1 dark:ring-offset-slate-800' : ''} ${!day.isScheduled ? 'bg-slate-100 dark:bg-slate-700 text-slate-300' : day.isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-500'}`}>{day.dayName.charAt(0)}</div>
                              ))}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setEditingHabit(habit)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><Edit3 size={16} /></button>
                              <button onClick={() => deleteHabit(habit.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Empty State */}
              {habits.length === 0 && (
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#6F00FF] to-purple-600 flex items-center justify-center shadow-xl shadow-purple-500/20"><Target size={40} className="text-white" /></div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Start Building Better Habits</h3>
                  <p className="text-slate-500 max-w-md mx-auto mb-6">Create your first habit and start tracking your progress!</p>
                  <button onClick={() => setIsAddHabitOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-[#6F00FF] text-white rounded-xl font-semibold hover:bg-[#5800cc] shadow-lg shadow-purple-500/25"><Plus size={18} /> Create First Habit</button>
                </div>
              )}
            </div>
          </div>

          {/* Add/Edit Habit Modal */}
          {(isAddHabitOpen || editingHabit) && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{editingHabit ? 'Edit Habit' : 'Create New Habit'}</h2>
                    <button onClick={() => { setIsAddHabitOpen(false); setEditingHabit(null); }} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X size={20} /></button>
                  </div>
                  <HabitForm
                    initialHabit={editingHabit}
                    userTags={userTags}
                    onSave={(data) => { if (editingHabit) updateHabit(editingHabit.id, data); else addHabit(data); }}
                    onCancel={() => { setIsAddHabitOpen(false); setEditingHabit(null); }}
                    onCreateTag={() => { setTagModalTaskId(null); setIsTagModalOpen(true); }}
                  />
                </div>
              </div>
            </div>
          )}
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
              {activeTasks.length === 0 && getUnscheduledTodaysHabits().length === 0 && <p className="text-center text-sm text-slate-400 py-8">Drop tasks here</p>}
              
              {/* Unscheduled habits for today */}
              {getUnscheduledTodaysHabits().map(habit => {
                const isCompleted = isHabitCompletedOnDate(habit, getTodayString());
                return (
                  <div key={`habit-${habit.id}`} className={`relative flex items-center gap-3 p-2.5 bg-white dark:bg-slate-800 rounded-lg border transition-all hover:shadow-sm ${isCompleted ? 'border-emerald-200 dark:border-emerald-800 opacity-60' : 'border-slate-200 dark:border-slate-700 hover:border-[#6F00FF]/30'}`}>
                    <div 
                      draggable 
                      onDragStart={(e) => { e.dataTransfer.setData('habitId', habit.id); e.dataTransfer.setData('habitName', habit.name); e.dataTransfer.setData('habitTag', habit.tag || ''); e.dataTransfer.setData('habitTagColor', habit.tagColor || ''); }} 
                      className="flex items-center gap-3 flex-1 cursor-grab active:cursor-grabbing"
                    >
                      <button onClick={(e) => { e.stopPropagation(); toggleHabitCompletion(habit.id); }} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600 hover:border-[#6F00FF]'}`}>
                        {isCompleted && <Check size={12} className="text-white" strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium text-slate-700 dark:text-slate-200 ${isCompleted ? 'line-through opacity-60' : ''}`}>{habit.name}</span>
                        {habit.tag && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded text-white font-medium" style={{ backgroundColor: habit.tagColor || '#6F00FF' }}>{habit.tag}</span>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400"><Flame size={12} className="text-orange-400" /><span className="font-medium">{habit.currentStreak}</span></div>
                    </div>
                    
                    {/* Menu button */}
                    <button 
                      onClick={() => setHabitTagMenuOpen(habitTagMenuOpen === habit.id ? null : habit.id)}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <MoreVertical size={16} className="text-slate-400" />
                    </button>
                    
                    {/* Tag menu dropdown */}
                    {habitTagMenuOpen === habit.id && (
                      <div 
                        className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-[160px]"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {/* Create Tag */}
                        <button 
                          onClick={() => { setTagModalHabitId(habit.id); setIsTagModalOpen(true); setHabitTagMenuOpen(null); }} 
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                        >
                          <Plus size={14} /> Create Tag
                        </button>
                        
                        {/* Edit Tag (only if habit has a tag) */}
                        {habit.tag && habit.tagColor && (
                          <button 
                            onClick={() => { handleOpenEditTagModal({ name: habit.tag!, color: habit.tagColor! }); setHabitTagMenuOpen(null); }} 
                            className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                          >
                            <Edit3 size={14} /> Edit Tag
                          </button>
                        )}
                        
                        <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                        <div className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">Add Tag</div>
                        {userTags.length > 0 ? (
                          userTags.map((tag, idx) => (
                            <button 
                              key={idx} 
                              onClick={() => { handleAddTagToHabit(habit.id, tag.name, tag.color); setHabitTagMenuOpen(null); }} 
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                            >
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                              <span className="text-slate-600 dark:text-slate-300 text-sm">{tag.name}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-slate-400">No tags yet</div>
                        )}
                        {habit.tag && (
                          <>
                            <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                            <button 
                              onClick={() => { handleRemoveTagFromHabit(habit.id); setHabitTagMenuOpen(null); }} 
                              className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-red-500"
                            >
                              <X size={14} /> Remove Tag
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {activeTasks.map(task => (
                <TaskItem 
                    key={task.id} 
                    task={task}
                    listType="active"
                    userTags={userTags}
                    onDragStart={(e) => handleTaskDragStart(e, task, 'active')}
                    onDelete={(id) => handleDeleteTask(id, 'active')}
                    onToggleComplete={(id) => handleToggleComplete(id, 'active')}
                    onMoveToList={handleMoveTaskToList}
                    onAddTag={handleAddTagToTask}
                    onRemoveTag={handleRemoveTagFromTask}
                    onOpenTagModal={handleOpenTagModal}
                    onEditTag={handleOpenEditTagModal}
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
                            listType="later"
                            userTags={userTags}
                            onDragStart={(e) => handleTaskDragStart(e, task, 'later')} 
                            onDelete={(id) => handleDeleteTask(id, 'later')}
                            onToggleComplete={(id) => handleToggleComplete(id, 'later')}
                            onMoveToList={handleMoveTaskToList}
                            onAddTag={handleAddTagToTask}
                            onRemoveTag={handleRemoveTagFromTask}
                            onOpenTagModal={handleOpenTagModal}
                            onEditTag={handleOpenEditTagModal}
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
          {/* Date Selector Header */}
          <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 relative">
            <div ref={calendarRef} className="relative flex items-center">
              <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200">
                <div 
                  onClick={() => setIsCalendarOpen(!isCalendarOpen)} 
                  className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                <div className={`w-2 h-2 rounded-full ${isToday(selectedDate) ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                {selectedDate.toLocaleDateString('sv-SE', { month: 'long', day: 'numeric' })}
                </div>
                {/* Calendar Integration Button */}
                <button 
                  onClick={() => {
                    setSettingsInitialTab('integrations');
                    setIsSettingsOpen(true);
                  }}
                  className={`p-1 rounded-full transition-all ${
                    googleAccount 
                      ? 'text-emerald-500 hover:text-emerald-600' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                  title={googleAccount ? 'Calendar synced' : 'Connect Google Calendar'}
                >
                  {googleAccount ? (
                    <CalendarCheck size={14} />
                  ) : (
                    <Calendar size={14} />
                  )}
                </button>
                
                {/* Zoom Toggle Button - also centers current time */}
                <button 
                  onClick={handleZoomToggle}
                  className={`p-1 rounded-full transition-all ${
                    isZoomedOut 
                      ? 'text-[#6F00FF] hover:text-[#5800cc]' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                  title={isZoomedOut ? 'Zoom in & center on now' : 'Zoom out & center on now'}
                >
                  {isZoomedOut ? <ZoomIn size={14} /> : <ZoomOut size={14} />}
                </button>
              </div>
              
              {/* Calendar Popup */}
              {isCalendarOpen && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 z-50 min-w-[280px]">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ChevronLeft size={18} className="text-slate-500" /></button>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ChevronRight size={18} className="text-slate-500" /></button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (<div key={day} className="text-center text-xs font-medium text-slate-400 py-1">{day}</div>))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: getFirstDayOfMonth(calendarViewDate.getFullYear(), calendarViewDate.getMonth()) }).map((_, i) => (<div key={`empty-${i}`} className="w-9 h-9" />))}
                    {Array.from({ length: getDaysInMonth(calendarViewDate.getFullYear(), calendarViewDate.getMonth()) }).map((_, i) => {
                      const day = i + 1;
                      const date = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
                      const isSelected = isSameDay(date, selectedDate);
                      const isTodayDate = isToday(date);
                      return (
                        <button key={day} onClick={() => handleDateSelect(day)} className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${isSelected ? 'bg-emerald-500 text-white ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900' : isTodayDate ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{day}</button>
                      );
                    })}
                  </div>
                  <button onClick={async () => { const today = new Date(); setSelectedDate(today); setCalendarViewDate(today); setIsCalendarOpen(false); await loadScheduleForDate(today); }} className="mt-3 w-full py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg">Today</button>
                </div>
              )}
            </div>
          </div>
          
          <div ref={timelineRef} className="flex-1 overflow-y-auto relative custom-scrollbar scroll-smooth">
            
            {/* Calendar Grid - 24 hours */}
            <div className="relative" style={{ minHeight: `${24 * hourHeight}px` }}>
              
              {/* Current Time Indicator (Dynamic) - precisely aligned */}
              <div 
                className="absolute left-0 right-0 z-20 flex items-center pointer-events-none transition-all duration-300" 
                style={{ top: `${currentTimeDecimal * hourHeight}px` }}
              >
                {/* Time label - h-0 ensures exact vertical centering with the line */}
                <div className="w-14 text-right pr-2 flex items-center justify-end h-0">
                  <span className="text-[10px] font-bold text-emerald-500 bg-white dark:bg-slate-900 px-1 rounded leading-none">
                    {formatTime(currentTimeDecimal)}
                  </span>
                </div>
                {/* Green line with dot - dot uses transform for perfect centering */}
                <div className="h-0.5 bg-emerald-500 flex-1 relative shadow-sm">
                  <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 shadow-md"></div>
                </div>
              </div>

              {timeLabels.map((hour) => (
                <div 
                    key={hour} 
                    className={`flex group relative transition-colors ${dragOverHour === hour ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                    style={{ height: `${hourHeight}px` }}
                    onDragEnter={() => setDragOverHour(hour)}
                    onDragOver={handleHourDragOver}
                    onDrop={(e) => handleHourDrop(e, hour)}
                    onDragLeave={() => setDragOverHour(null)}
                >
                  {/* Time Label - perfectly aligned with grid line */}
                  <div className="w-14 shrink-0 text-right pr-3 text-xs text-slate-400 dark:text-slate-500 font-medium relative">
                    <span className="absolute right-3 -top-2">{formatTime(hour, true)}</span>
                  </div>
                  
                  {/* Grid Line */}
                  <div className="flex-1 border-t border-slate-200 dark:border-slate-700 relative">
                    {/* Half-hour guideline */}
                    <div className="absolute left-0 right-0 border-t border-dashed border-slate-100 dark:border-slate-800/50 w-full" style={{ top: `${hourHeight / 2}px` }}></div>
                    
                    {/* Ghost Block Preview when dragging over */}
                    {dragOverHour === hour && (
                        <div className="absolute top-0 left-2 right-4 border-2 border-dashed border-[#6F00FF] bg-[#6F00FF]/10 rounded-lg z-0 pointer-events-none flex items-center justify-center text-[#6F00FF] font-medium text-sm" style={{ height: `${hourHeight - 4}px` }}>
                            {!isZoomedOut && 'Drop to schedule'}
                        </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Render Time Blocks */}
              {schedule.map((block) => {
                // Calculate position based on midnight (0:00) using hourHeight for zoom support
                const topOffset = block.start * hourHeight; 
                const height = block.duration * hourHeight;
                const endTime = block.start + block.duration;
                
                // Determine block color:
                // 1. If completed, use gray
                // 2. If has tag color from task/habit, use that
                // 3. If Google event with calendar color, use that
                // 4. Default to Google Calendar blue (#4285f4)
                const DEFAULT_BLUE = '#4285f4';
                
                // Find the associated task or habit tag color
                const linkedTask = block.taskId ? [...activeTasks, ...laterTasks].find(t => String(t.id) === String(block.taskId)) : null;
                const linkedHabit = block.habitId ? habits.find(h => h.id === block.habitId) : null;
                const tagColor = linkedTask?.tagColor || linkedHabit?.tagColor || null;
                
                // Determine the final background color
                let bgColor = DEFAULT_BLUE;
                if (tagColor) {
                  bgColor = tagColor;
                } else if (block.calendarColor && block.isGoogle) {
                  bgColor = block.calendarColor;
                }
                
                const blockStyle = { 
                  top: `${topOffset}px`, 
                  height: `${height}px`, 
                  backgroundColor: block.completed ? undefined : bgColor,
                  borderColor: block.completed ? undefined : bgColor 
                };

                return (
                  <div 
                    key={block.id}
                    style={blockStyle}
                    className={`absolute left-16 right-4 rounded-lg p-3 border shadow-sm cursor-move hover:brightness-95 transition-all z-10 flex flex-col group text-white ${block.completed ? 'bg-slate-300/80 dark:bg-slate-700/80 border-slate-400 !text-slate-500' : ''} ${resizingBlockId === block.id || draggingBlockId === block.id ? 'z-20 ring-2 ring-emerald-400 select-none' : ''}`}
                    onMouseDown={(e) => {
                      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.cursor-ns-resize')) return;
                      e.preventDefault();
                      setDraggingBlockId(block.id);
                      setDragStartY(e.clientY);
                      setDragStartTime(block.start);
                    }}
                  >
                    <div className="flex items-start justify-between pointer-events-none">
                        <span className="text-xs font-medium opacity-80 flex items-center gap-1">
                            {block.isGoogle && <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-3 h-3" alt="GCal" />}
                            {formatTime(block.start)} – {formatTime(endTime)}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                            <MoreHorizontal size={14} className="cursor-pointer" />
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="hover:text-red-600"
                            >
                              <X size={14}/>
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {/* Completion checkbox */}
                      <div 
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleToggleBlockComplete(block.id); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors pointer-events-auto ${block.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-400 hover:border-emerald-500 bg-white/80 dark:bg-slate-800/80'}`}
                      >
                        {block.completed && <Check size={14} className="text-white" strokeWidth={3} />}
                      </div>
                      <h3 className={`font-bold text-sm pointer-events-none ${block.completed ? 'line-through' : ''}`}>{block.title}</h3>
                    </div>
                    <div className="mt-auto flex items-center gap-2 pointer-events-none">
                        {block.calendarName && <span className="text-[10px] font-bold opacity-80 bg-white/20 px-1.5 rounded">{block.calendarName}</span>}
                        {block.tag && !block.calendarName && <span className="text-[10px] uppercase font-bold opacity-60 bg-black/5 dark:bg-white/10 px-1.5 rounded">{block.tag}</span>}
                    </div>

                    {/* Resize Handle */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity z-20"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
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
        </div>

        {/* Right Column: Notes & Extras */}
        <div className="md:col-span-3 bg-slate-50/50 dark:bg-slate-950 flex flex-col overflow-y-auto">
           <div className="p-4 space-y-8">
              
              {/* Notes Section */}
              <div>
                 <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      <div className="text-[#6F00FF]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/></svg>
                      </div>
                      <h2 className="font-bold text-lg">Notes</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {notesLoading && <Loader2 size={12} className="animate-spin text-slate-400" />}
                      {notesSaved && <span className="text-xs text-emerald-500 flex items-center gap-1"><Check size={12} /> Saved</span>}
                    </div>
                 </div>
                 
                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                    <textarea
                      value={notesContent}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder={`Write your notes for ${selectedDate.toLocaleDateString('sv-SE', { month: 'long', day: 'numeric' })}...`}
                      className="w-full min-h-[180px] p-3 text-sm text-slate-700 dark:text-slate-300 bg-transparent resize-none focus:outline-none placeholder:text-slate-400"
                      disabled={notesLoading}
                    />
                 </div>
              </div>

              {/* Weight Tracking Section */}
              <div>
                 <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><Activity size={20} className="text-[#6F00FF]" /> Weight Tracker</h2>
                    {weightEntries.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500"><strong className="text-slate-800 dark:text-white">{weightEntries[weightEntries.length - 1]?.weight} kg</strong></span>
                        {weightEntries.length > 1 && (
                          <span className={`font-medium ${weightEntries[weightEntries.length - 1].weight < weightEntries[0].weight ? 'text-emerald-500' : 'text-red-500'}`}>
                            {weightEntries[weightEntries.length - 1].weight < weightEntries[0].weight ? '↓' : '↑'}
                            {Math.abs(weightEntries[weightEntries.length - 1].weight - weightEntries[0].weight).toFixed(1)}
                          </span>
                        )}
                      </div>
                    )}
                 </div>
                 
                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-4">
                    <WeightLineChart entries={weightEntries} height={160} />
                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <input type="number" step="0.1" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="Today's weight (kg)" className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/50" onKeyDown={(e) => { if (e.key === 'Enter') { setWeightDate(new Date().toISOString().split('T')[0]); handleAddWeight(); } }} />
                      <button onClick={() => { setWeightDate(new Date().toISOString().split('T')[0]); handleAddWeight(); }} className="px-4 py-2 bg-[#6F00FF] text-white text-sm font-medium rounded-lg hover:bg-[#5800cc] transition-colors">Log</button>
                    </div>
                 </div>
              </div>

              {/* Promo Section - Only shows once for new users */}
              {showPromo && (
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/10 dark:to-indigo-900/10 rounded-xl border border-violet-100 dark:border-violet-900/20 overflow-hidden relative p-4">
                  {/* Dismiss button */}
                  <button 
                    onClick={handleDismissPromo}
                    className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-violet-200/50 dark:hover:bg-violet-800/30 transition-colors z-10"
                    title="Dismiss"
                  >
                    <X size={16} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                  </button>
                  
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3 pr-6">
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
              )}

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
      <div className="w-20 h-20 bg-[#6d3dc1] rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-600/30 mb-8 transform rotate-3 hover:rotate-6 transition-transform overflow-hidden">
        <svg width="60" height="60" viewBox="0 0 720 340" fill="white">
          <path d="M 65.148438 215.859375 L 81.007812 225.375 L 150.804688 136.546875 L 184.117188 176.992188 L 311.011719 0.136719 L 385.5625 84.199219 L 415.699219 66.785156 L 517.222656 177.023438 L 571.117188 155.582031 L 713.113281 288.820312 L 567.582031 187.308594 L 511.699219 214.703125 C 511.699219 214.703125 510.898438 308.683594 510.898438 312.648438 C 510.898438 316.613281 414.082031 179.410156 414.082031 179.410156 L 414.082031 278.542969 L 315.398438 49.339844 L 124.363281 332.972656 L 166.761719 225.765625 L 133.746094 252.339844 L 146.972656 192.921875 L 85.773438 259.898438 L 64.351562 245.617188 L 0.910156 288.839844 Z"/>
        </svg>
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
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (activeTab === 'signup') {
        await signUp(email, password);
        setSuccess('Account created! Please check your email to verify.');
        setEmail('');
        setPassword('');
        setActiveTab('signin');
      } else {
        await signIn(email, password);
        onSuccess();
      }
    } catch (err: any) {
      if (err.message?.includes('Email not confirmed')) {
        setError('Please verify your email before signing in.');
      } else if (err.message?.includes('Invalid login')) {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleTabChange = (tab: 'signin' | 'signup') => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-slate-100 dark:from-slate-950 dark:via-violet-950/20 dark:to-slate-900 text-slate-900 dark:text-slate-100 transition-colors p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-600/30 mx-auto mb-4 overflow-hidden transform hover:scale-105 transition-transform">
            <svg width="40" height="40" viewBox="0 0 720 340" fill="white">
              <path d="M 65.148438 215.859375 L 81.007812 225.375 L 150.804688 136.546875 L 184.117188 176.992188 L 311.011719 0.136719 L 385.5625 84.199219 L 415.699219 66.785156 L 517.222656 177.023438 L 571.117188 155.582031 L 713.113281 288.820312 L 567.582031 187.308594 L 511.699219 214.703125 C 511.699219 214.703125 510.898438 308.683594 510.898438 312.648438 C 510.898438 316.613281 414.082031 179.410156 414.082031 179.410156 L 414.082031 278.542969 L 315.398438 49.339844 L 124.363281 332.972656 L 166.761719 225.765625 L 133.746094 252.339844 L 146.972656 192.921875 L 85.773438 259.898438 L 64.351562 245.617188 L 0.910156 288.839844 Z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Welcome to Ascend
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Your personal productivity companion
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => handleTabChange('signin')}
              className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
                activeTab === 'signin'
                  ? 'text-violet-600 dark:text-violet-400'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Sign In
              {activeTab === 'signin' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-purple-600" />
              )}
            </button>
            <button
              onClick={() => handleTabChange('signup')}
              className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
                activeTab === 'signup'
                  ? 'text-violet-600 dark:text-violet-400'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Sign Up
              {activeTab === 'signup' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-purple-600" />
              )}
            </button>
          </div>

          <div className="p-6">
            {/* Success Message */}
            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <Check size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <X size={16} className="text-red-600 dark:text-red-400 shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 font-medium rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <Loader2 size={20} className="animate-spin text-slate-500" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-slate-700 dark:text-slate-200">Continue with Google</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {activeTab === 'signin' && (
                    <button
                      type="button"
                      className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={activeTab === 'signin' ? 'current-password' : 'new-password'}
                />
                {activeTab === 'signup' && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    Must be at least 6 characters
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
              {activeTab === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                onClick={() => handleTabChange(activeTab === 'signin' ? 'signup' : 'signin')}
                className="text-violet-600 dark:text-violet-400 hover:underline font-semibold"
              >
                {activeTab === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6 px-4">
          By continuing, you agree to our{' '}
          <a href="#" className="underline hover:text-slate-600 dark:hover:text-slate-300">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="underline hover:text-slate-600 dark:hover:text-slate-300">Privacy Policy</a>
        </p>
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