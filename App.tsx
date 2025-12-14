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
  Palette
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
  moveTask,
  loadScheduleBlocks,
  createScheduleBlock,
  deleteScheduleBlock,
  updateScheduleBlock,
  loadUserSettings,
  saveUserSettings,
  updateTask
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
  taskId?: number | string; // Link to original task
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

// --- Google Calendar Color Palette ---
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
  onOpenTagModal
}: TaskItemProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTagSubmenuOpen, setIsTagSubmenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
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
          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide`}
          style={{ backgroundColor: task.tagColor || '#6F00FF', color: 'white' }}
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
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          className="text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <MoreVertical size={16} />
        </button>
        
        {isMenuOpen && (
          <div className="absolute right-0 top-8 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl z-[100] py-1 text-sm">
            {/* Mark as Complete */}
            <button
              onClick={() => {
                onToggleComplete(task.id);
                setIsMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
            >
              <Check size={14} className={task.completed ? 'text-emerald-500' : ''} />
              {task.completed ? 'Mark as Incomplete' : 'Mark as Complete'}
            </button>
            
            {/* Move to Later/Active */}
            <button
              onClick={() => {
                onMoveToList(task.id, listType === 'active' ? 'later' : 'active');
                setIsMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
            >
              <MoveRight size={14} />
              {listType === 'active' ? 'Move to Later' : 'Move to Active'}
            </button>
            
            <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
            
            {/* Create Tag */}
            <button
              onClick={() => {
                onOpenTagModal(task.id);
                setIsMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
            >
              <Plus size={14} />
              Create Tag
            </button>
            
            {/* Add Tag (with inline options) */}
            <div className="relative">
              <button
                onClick={() => setIsTagSubmenuOpen(!isTagSubmenuOpen)}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 justify-between"
              >
                <span className="flex items-center gap-2">
                  <Tag size={14} />
                  Add Tag
                </span>
                {isTagSubmenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              
              {isTagSubmenuOpen && userTags.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  {userTags.map((tag, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onAddTag(task.id, tag.name, tag.color);
                        setIsMenuOpen(false);
                        setIsTagSubmenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <span 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-slate-600 dark:text-slate-300 text-sm">{tag.name}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {isTagSubmenuOpen && userTags.length === 0 && (
                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 py-2 px-4 text-xs text-slate-400">
                  No tags yet. Create one first!
                </div>
              )}
            </div>
            
            {/* Remove Tag */}
            {task.tag && (
              <button
                onClick={() => {
                  onRemoveTag(task.id);
                  setIsMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
              >
                <X size={14} />
                Remove Tag
              </button>
            )}
            
            <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
            
            {/* Delete Task */}
            <button
              onClick={() => {
                onDelete(task.id);
                setIsMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400"
            >
              <Trash2 size={14} />
              Delete Task
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
  existingTags: { name: string; color: string }[];
}

// --- Weight Line Chart Component ---
interface WeightLineChartProps {
  entries: { date: string; weight: number }[];
  height?: number;
}

const WeightLineChart = ({ entries, height = 200 }: WeightLineChartProps) => {
  if (entries.length < 2) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
        Need at least 2 entries to show chart
      </div>
    );
  }

  const padding = { top: 10, right: 10, bottom: 30, left: 40 };
  const chartWidth = 600; // Wider viewBox for better proportions
  const chartHeight = height;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const weights = entries.map(e => e.weight);
  const minWeight = Math.floor(Math.min(...weights) - 1);
  const maxWeight = Math.ceil(Math.max(...weights) + 1);
  const weightRange = maxWeight - minWeight;

  // Calculate points
  const points = entries.map((entry, idx) => {
    const x = padding.left + (idx / (entries.length - 1)) * innerWidth;
    const y = padding.top + innerHeight - ((entry.weight - minWeight) / weightRange) * innerHeight;
    return { x, y, ...entry };
  });

  // Create smooth curve path
  const linePath = points.reduce((path, point, idx) => {
    if (idx === 0) return `M ${point.x} ${point.y}`;
    
    const prev = points[idx - 1];
    const cpx1 = prev.x + (point.x - prev.x) / 3;
    const cpx2 = point.x - (point.x - prev.x) / 3;
    return `${path} C ${cpx1} ${prev.y}, ${cpx2} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  // Create area path (for gradient fill)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`;

  // Y-axis labels
  const yLabels = [];
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const value = minWeight + (weightRange * i) / ySteps;
    const y = padding.top + innerHeight - (i / ySteps) * innerHeight;
    yLabels.push({ value: value.toFixed(1), y });
  }

  // X-axis labels (show first, middle, last)
  const xLabels = [
    { label: new Date(entries[0].date).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' }), x: padding.left },
    { label: new Date(entries[Math.floor(entries.length / 2)].date).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' }), x: padding.left + innerWidth / 2 },
    { label: new Date(entries[entries.length - 1].date).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' }), x: padding.left + innerWidth },
  ];

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="weightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6F00FF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6F00FF" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map((label, idx) => (
        <line
          key={idx}
          x1={padding.left}
          y1={label.y}
          x2={padding.left + innerWidth}
          y2={label.y}
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeDasharray="4 4"
        />
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#weightGradient)" />

      {/* Main line */}
      <path
        d={linePath}
        fill="none"
        stroke="#6F00FF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Moving average line (thinner, smoother) */}
      {entries.length >= 7 && (() => {
        const maPoints = entries.map((entry, idx) => {
          const start = Math.max(0, idx - 3);
          const end = Math.min(entries.length, idx + 4);
          const slice = entries.slice(start, end);
          const avg = slice.reduce((sum, e) => sum + e.weight, 0) / slice.length;
          const x = padding.left + (idx / (entries.length - 1)) * innerWidth;
          const y = padding.top + innerHeight - ((avg - minWeight) / weightRange) * innerHeight;
          return { x, y };
        });
        
        const maPath = maPoints.reduce((path, point, idx) => {
          if (idx === 0) return `M ${point.x} ${point.y}`;
          const prev = maPoints[idx - 1];
          const cpx1 = prev.x + (point.x - prev.x) / 3;
          const cpx2 = point.x - (point.x - prev.x) / 3;
          return `${path} C ${cpx1} ${prev.y}, ${cpx2} ${point.y}, ${point.x} ${point.y}`;
        }, '');
        
        return (
          <path
            d={maPath}
            fill="none"
            stroke="#a78bfa"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
        );
      })()}

      {/* Data points */}
      {points.map((point, idx) => (
        <g key={idx}>
          <circle
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#6F00FF"
            stroke="white"
            strokeWidth="2"
            className="cursor-pointer hover:r-6 transition-all"
          />
          <title>{`${point.date}: ${point.weight} kg`}</title>
        </g>
      ))}

      {/* Y-axis labels */}
      {yLabels.map((label, idx) => (
        <text
          key={idx}
          x={padding.left - 8}
          y={label.y}
          textAnchor="end"
          dominantBaseline="middle"
          className="fill-slate-400 text-[10px]"
        >
          {label.value}
        </text>
      ))}

      {/* X-axis labels */}
      {xLabels.map((label, idx) => (
        <text
          key={idx}
          x={label.x}
          y={chartHeight - 10}
          textAnchor="middle"
          className="fill-slate-400 text-[10px]"
        >
          {label.label}
        </text>
      ))}

      {/* Y-axis title */}
      <text
        x={12}
        y={chartHeight / 2}
        textAnchor="middle"
        transform={`rotate(-90, 12, ${chartHeight / 2})`}
        className="fill-slate-400 text-[10px]"
      >
        kg
      </text>
    </svg>
  );
};

const TagModal = ({ isOpen, onClose, onSave, existingTags }: TagModalProps) => {
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(GOOGLE_COLORS[0].hex);

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
              <Tag size={20} className="text-[#6F00FF]" />
              Create Tag
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Tag Name Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tag Name
            </label>
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="e.g., Work, Personal, Urgent"
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/50 focus:border-[#6F00FF]"
              autoFocus
            />
          </div>
          
          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {GOOGLE_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.hex)}
                  className={`w-8 h-8 rounded-full transition-all ${selectedColor === color.hex ? 'ring-2 ring-offset-2 ring-[#6F00FF] dark:ring-offset-slate-900 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
          
          {/* Preview */}
          {tagName && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Preview
              </label>
              <span
                className="inline-block text-xs px-2 py-1 rounded font-semibold uppercase tracking-wide text-white"
                style={{ backgroundColor: selectedColor }}
              >
                {tagName}
              </span>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!tagName.trim()}
            className="px-4 py-2 text-sm font-medium bg-[#6F00FF] text-white rounded-lg hover:bg-[#5800cc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Tag
          </button>
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
  const [settings, setSettings] = useState({
    timeFormat: '12h', // '12h' | '24h'
    timezone: 'Local'
  });
  
  // State for Calendar Picker
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const calendarRef = useRef<HTMLDivElement>(null);
  
  // State for Tags
  const [userTags, setUserTags] = useState<{ name: string; color: string }[]>(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem('ascend_user_tags');
    return saved ? JSON.parse(saved) : [];
  });
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagModalTaskId, setTagModalTaskId] = useState<string | number | null>(null);

  // State for Notes
  const [notesContent, setNotesContent] = useState(() => {
    const saved = localStorage.getItem('ascend_notes');
    return saved || '';
  });
  
  // State for Promo Section collapse
  const [isPromoOpen, setIsPromoOpen] = useState(() => {
    const saved = localStorage.getItem('ascend_promo_open');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  // State for notes saved indicator
  const [notesSaved, setNotesSaved] = useState(false);
  
  // State for Weight Tracking
  const [weightEntries, setWeightEntries] = useState<{ date: string; weight: number }[]>(() => {
    const saved = localStorage.getItem('ascend_weight_entries');
    return saved ? JSON.parse(saved) : [];
  });
  const [newWeight, setNewWeight] = useState('');
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0]);

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
        if (savedUser && isSignedIn()) {
          console.log('Restored Google Calendar connection - will verify on first sync');
          setGoogleAccount(savedUser);
        } else if (savedUser) {
          // Token expired or invalid, clear saved user
          console.log('Saved Google user found but token is invalid, clearing...');
          revokeAccessToken(); // This clears localStorage
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

        // Always use database data for logged-in users (even if empty)
        // This ensures deleted items stay deleted
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
  
  // Timeline scroll ref
  const timelineRef = React.useRef<HTMLDivElement>(null);

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

  // Time labels for full 24-hour day (00:00 - 23:00)
  const timeLabels = Array.from({ length: 24 }, (_, i) => i);
  
  // Current time state - updates every minute
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);
  
  // Calculate current time as decimal (e.g., 13:30 = 13.5)
  const currentTimeDecimal = currentTime.getHours() + currentTime.getMinutes() / 60;
  
  // Scroll to current time on mount
  useEffect(() => {
    if (timelineRef.current) {
      // Scroll to current time minus 2 hours to show some context above
      const scrollPosition = Math.max(0, (currentTimeDecimal - 2) * 96);
      timelineRef.current.scrollTop = scrollPosition;
    }
  }, [isDataLoaded]); // Only run once when data is loaded

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    };
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCalendarOpen]);

  // --- Calendar Helper Functions ---
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  const handleDateSelect = async (day: number) => {
    const newDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
    setSelectedDate(newDate);
    setIsCalendarOpen(false);
    
    // Load schedule blocks for the selected date
    await loadScheduleForDate(newDate);
  };
  
  const loadScheduleForDate = async (date: Date) => {
    try {
      // Load blocks from database for this date
      const blocksData = await loadScheduleBlocks(date);
      
      // If Google is connected, also fetch Google Calendar events
      if (googleAccount && isSignedIn()) {
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
        
        const googleEvents = await fetchGoogleCalendarEvents(startOfDay, endOfDay, true, true);
        
        // Merge database blocks with Google events
        const googleBlocks: ScheduleBlock[] = googleEvents.map(event => {
          // Use calendar color from Google or fallback to blue
          const calColor = (event as any).calendarColor;
          const calName = (event as any).calendarName;
          
          return {
            id: event.id,
            title: event.title,
            tag: calName || null, // Use calendar name as tag
            start: event.start,
            duration: event.duration,
            color: calColor ? '' : 'bg-blue-400/90 dark:bg-blue-600/90 border-blue-500',
            textColor: 'text-white',
            isGoogle: true,
            googleEventId: event.id,
            completed: false,
            calendarColor: calColor, // Store the hex color
            calendarName: calName,
          };
        });
        
        // Combine: DB blocks + Google events (avoiding duplicates by googleEventId)
        const dbBlockIds = new Set(blocksData.map(b => b.googleEventId).filter(Boolean));
        const uniqueGoogleBlocks = googleBlocks.filter(g => !dbBlockIds.has(g.googleEventId));
        
        setSchedule([...blocksData, ...uniqueGoogleBlocks]);
      } else {
        setSchedule(blocksData.length > 0 ? blocksData : []);
      }
    } catch (error) {
      console.error('Failed to load schedule for date:', error);
      setNotification({ type: 'error', message: 'Failed to load schedule for selected date' });
    }
  };

  const handlePrevMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1));
  };

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
      // Handle resize
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
      
      // Handle drag/move
      if (draggingBlockId !== null && dragStartY !== null && dragStartTime !== null) {
        const deltaY = e.clientY - dragStartY;
        const deltaHours = deltaY / 96; // 96px per hour
        let newStart = dragStartTime + deltaHours;
        
        // Snap to 15 mins (0.25 hours)
        newStart = Math.round(newStart * 4) / 4;
        
        // Keep within day bounds (0-24)
        const block = schedule.find(b => b.id === draggingBlockId);
        if (block) {
          if (newStart < 0) newStart = 0;
          if (newStart + block.duration > 24) newStart = 24 - block.duration;
        }

        setSchedule(prev => prev.map(block => 
          block.id === draggingBlockId ? { ...block, start: newStart } : block
        ));
      }
    };

    const handleMouseUp = async () => {
      // Handle resize end
      if (resizingBlockId !== null) {
        const resizedBlock = schedule.find(b => b.id === resizingBlockId);
        
        if (resizedBlock?.googleEventId && googleAccount && isSignedIn()) {
          try {
            await updateGoogleCalendarEvent(
              resizedBlock.googleEventId,
              resizedBlock.title,
              resizedBlock.start,
              resizedBlock.duration,
              selectedDate
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
      
      // Handle drag/move end
      if (draggingBlockId !== null) {
        const movedBlock = schedule.find(b => b.id === draggingBlockId);
        
        // Sync new time to Google Calendar if connected
        if (movedBlock?.googleEventId && googleAccount && isSignedIn()) {
          try {
            await updateGoogleCalendarEvent(
              movedBlock.googleEventId,
              movedBlock.title,
              movedBlock.start,
              movedBlock.duration,
              selectedDate
            );
            console.log('Updated Google Calendar event time');
            setNotification({ type: 'success', message: 'Event time updated in Google Calendar' });
          } catch (error) {
            console.error('Failed to update Google Calendar event:', error);
            setNotification({ type: 'error', message: 'Failed to update Google Calendar' });
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
  }, [resizingBlockId, resizeStartY, resizeStartDuration, draggingBlockId, dragStartY, dragStartTime, schedule, googleAccount]);

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
    console.log('Deleting task:', taskId);
    console.log('All blocks:', schedule.map(b => ({ id: b.id, taskId: b.taskId, title: b.title })));
    
    // Find and delete any linked schedule block
    const linkedBlock = schedule.find(b => b.taskId && String(b.taskId) === String(taskId));
    console.log('Found linked block:', linkedBlock);
    
    if (linkedBlock) {
      // Delete from Google Calendar if connected
      if (linkedBlock.googleEventId && googleAccount && isSignedIn()) {
        try {
          await deleteGoogleCalendarEvent(linkedBlock.googleEventId);
          console.log('Deleted linked event from Google Calendar');
        } catch (error) {
          console.error('Failed to delete from Google Calendar:', error);
        }
      }
      // Delete block from database and state
      await deleteScheduleBlock(String(linkedBlock.id));
      setSchedule(prev => prev.filter(b => String(b.id) !== String(linkedBlock.id)));
      console.log('Deleted linked block from timeline');
    }
    
    // Delete task from database
    await deleteTaskFromDb(String(taskId));
    if (listType === 'active') {
      setActiveTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
    } else {
      setLaterTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
    }
    console.log('Task deleted');
  };

  const handleToggleComplete = (taskId: number | string, listType: 'active' | 'later') => {
    // Find the current task to get its new completed state
    const currentTask = listType === 'active' 
      ? activeTasks.find(t => String(t.id) === String(taskId))
      : laterTasks.find(t => String(t.id) === String(taskId));
    
    const newCompleted = currentTask ? !currentTask.completed : true;
    
    // Toggle completion in the task list
    if (listType === 'active') {
      setActiveTasks(prev => prev.map(t => 
        String(t.id) === String(taskId) ? { ...t, completed: newCompleted } : t
      ));
    } else {
      setLaterTasks(prev => prev.map(t => 
        String(t.id) === String(taskId) ? { ...t, completed: newCompleted } : t
      ));
    }
    
    // Also toggle completion in any linked schedule block (compare as strings)
    setSchedule(prev => prev.map(block => 
      String(block.taskId) === String(taskId) ? { ...block, completed: newCompleted } : block
    ));
    
    console.log('Toggle complete:', { taskId, newCompleted, listType });
  };

  // Toggle completion directly on a schedule block
  const handleToggleBlockComplete = (blockId: number | string) => {
    const block = schedule.find(b => String(b.id) === String(blockId));
    if (!block) return;
    
    const newCompleted = !block.completed;
    
    // Update the block
    setSchedule(prev => prev.map(b => 
      String(b.id) === String(blockId) ? { ...b, completed: newCompleted } : b
    ));
    
    // If this block is linked to a task, also update the task
    if (block.taskId) {
      setActiveTasks(prev => prev.map(t => 
        String(t.id) === String(block.taskId) ? { ...t, completed: newCompleted } : t
      ));
      setLaterTasks(prev => prev.map(t => 
        String(t.id) === String(block.taskId) ? { ...t, completed: newCompleted } : t
      ));
      console.log('Block toggle synced to task:', { blockId, taskId: block.taskId, newCompleted });
    }
  };

  // --- Tag Management Handlers ---
  
  const handleCreateTag = (tagName: string, tagColor: string) => {
    const newTag = { name: tagName, color: tagColor };
    const updatedTags = [...userTags, newTag];
    setUserTags(updatedTags);
    localStorage.setItem('ascend_user_tags', JSON.stringify(updatedTags));
    
    // If we have a task ID, apply the tag to it
    if (tagModalTaskId) {
      handleAddTagToTask(tagModalTaskId, tagName, tagColor);
    }
    setTagModalTaskId(null);
  };

  // Notes handler with saved indicator
  const handleNotesChange = (content: string) => {
    setNotesContent(content);
    localStorage.setItem('ascend_notes', content);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  };
  
  // Promo collapse handler
  const handlePromoToggle = () => {
    const newState = !isPromoOpen;
    setIsPromoOpen(newState);
    localStorage.setItem('ascend_promo_open', JSON.stringify(newState));
  };

  // Weight tracking handler
  const handleAddWeight = () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) return;
    
    const dateToLog = weightDate;
    const existingIndex = weightEntries.findIndex(e => e.date === dateToLog);
    
    let updatedEntries;
    if (existingIndex >= 0) {
      // Update existing entry for that date
      updatedEntries = [...weightEntries];
      updatedEntries[existingIndex] = { date: dateToLog, weight };
    } else {
      // Add new entry
      updatedEntries = [...weightEntries, { date: dateToLog, weight }].sort((a, b) => a.date.localeCompare(b.date));
    }
    
    // Keep only last 90 days (increased from 30)
    if (updatedEntries.length > 90) {
      updatedEntries = updatedEntries.slice(-90);
    }
    
    setWeightEntries(updatedEntries);
    localStorage.setItem('ascend_weight_entries', JSON.stringify(updatedEntries));
    setNewWeight('');
    setWeightDate(new Date().toISOString().split('T')[0]); // Reset to today
    
    const isToday = dateToLog === new Date().toISOString().split('T')[0];
    setNotification({ type: 'success', message: `Weight logged: ${weight} kg${isToday ? '' : ` for ${dateToLog}`}` });
  };

  const handleAddTagToTask = async (taskId: number | string, tagName: string, tagColor: string) => {
    // Update in active tasks
    setActiveTasks(prev => prev.map(t => 
      String(t.id) === String(taskId) ? { ...t, tag: tagName, tagColor: tagColor } : t
    ));
    // Update in later tasks
    setLaterTasks(prev => prev.map(t => 
      String(t.id) === String(taskId) ? { ...t, tag: tagName, tagColor: tagColor } : t
    ));
    // Update in database
    await updateTask(String(taskId), { tag: tagName, tagColor: tagColor });
  };

  const handleRemoveTagFromTask = async (taskId: number | string) => {
    // Update in active tasks
    setActiveTasks(prev => prev.map(t => 
      String(t.id) === String(taskId) ? { ...t, tag: null, tagColor: null } : t
    ));
    // Update in later tasks
    setLaterTasks(prev => prev.map(t => 
      String(t.id) === String(taskId) ? { ...t, tag: null, tagColor: null } : t
    ));
    // Update in database
    await updateTask(String(taskId), { tag: null, tagColor: null });
  };

  const handleOpenTagModal = (taskId: number | string) => {
    setTagModalTaskId(taskId);
    setIsTagModalOpen(true);
  };

  const handleMoveTaskToList = async (taskId: number | string, targetList: 'active' | 'later') => {
    // Find the task in both lists
    const taskInActive = activeTasks.find(t => String(t.id) === String(taskId));
    const taskInLater = laterTasks.find(t => String(t.id) === String(taskId));
    const task = taskInActive || taskInLater;
    
    if (!task) return;
    
    if (taskInActive && targetList === 'later') {
      // Move from active to later
      setActiveTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
      setLaterTasks(prev => [...prev, { ...task, time: null }]);
    } else if (taskInLater && targetList === 'active') {
      // Move from later to active
      setLaterTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
      setActiveTasks(prev => [...prev, task]);
    }
    
    // Update in database
    await moveTask(String(taskId), targetList);
  };

  const handleDeleteBlock = async (blockId: number | string) => {
      // Find the block to get Google event ID
      const block = schedule.find(b => String(b.id) === String(blockId));
      
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

      // Clear the time from the linked task (but DON'T delete the task)
      if (block?.taskId) {
        setActiveTasks(prev => prev.map(t => 
          String(t.id) === String(block.taskId) ? { ...t, time: null } : t
        ));
        setLaterTasks(prev => prev.map(t => 
          String(t.id) === String(block.taskId) ? { ...t, time: null } : t
        ));
      }

      // Delete block from database (not the task!)
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

      // Fetch events from BOTH Ascend calendar AND primary Google Calendar for selected date
      const startOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0);
      const endOfDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59);
      
      // Get all Google Calendar events (both primary and Ascend)
      console.log('Fetching Google Calendar events...');
      const googleEvents = await fetchGoogleCalendarEvents(startOfDay, endOfDay, true, true);
      console.log('Google events received:', googleEvents);
      
      // Perform two-way sync for selected date
      const syncResult = await syncCalendarEvents(localBlocksForSync, selectedDate);
      console.log('Sync result:', syncResult);

      setSchedule(prev => {
        let updated = [...prev];
        
        // Get existing Google event IDs to avoid duplicates
        const existingGoogleIds = new Set(
          prev.filter(b => b.googleEventId).map(b => b.googleEventId)
        );

        // Add ALL Google Calendar events (from both primary and Ascend calendars)
        console.log('Existing Google IDs:', Array.from(existingGoogleIds));
        console.log('Events to add:', googleEvents.filter(event => !existingGoogleIds.has(event.id)));
        
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

    } catch (error: any) {
      console.error('Sync failed:', error);
      if (error?.message === 'TOKEN_INVALID' || error?.message?.includes('token')) {
        setNotification({ type: 'error', message: 'Google session expired. Please reconnect in Settings.' });
        setGoogleAccount(null);
      } else {
        setNotification({ type: 'error', message: 'Failed to sync with Google Calendar' });
      }
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

  const handleListDrop = async (e: React.DragEvent, targetListId: 'active' | 'later') => {
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
      if (!draggedItem) return;
      const { task } = draggedItem;

      // Check if this task is already on the timeline
      const existingBlock = schedule.find(b => b.taskId === task.id);
      if (existingBlock) {
        setNotification({ type: 'info', message: 'This task is already on the timeline. Move it instead!' });
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

      // Save to database for the selected date
      const savedBlock = await createScheduleBlock(blockData, selectedDate);
      
      // Preserve taskId and completed since they're not in database
      const newBlock: ScheduleBlock = savedBlock ? {
          ...savedBlock,
          taskId: task.id,  // Keep the link to the original task
          completed: task.completed || false
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
      console.log('Checking Google connection:', { googleAccount: !!googleAccount, isSignedIn: isSignedIn() });
      if (googleAccount && isSignedIn()) {
          console.log('Attempting to create Google Calendar event...');
          try {
              const eventId = await createGoogleCalendarEvent(
                  task.title,
                  hour,
                  newBlock.duration, // Use actual block duration
                  selectedDate, // Use selected date instead of today
                  task.tag || undefined // Pass tag for color coding
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
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-white dark:bg-slate-700 text-[#6F00FF] shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('timebox')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'timebox' 
                ? 'bg-white dark:bg-slate-700 text-[#6F00FF] shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Clock size={16} />
            Timebox
          </button>
          <button 
            onClick={() => setActiveTab('habittracker')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'habittracker' 
                ? 'bg-white dark:bg-slate-700 text-[#6F00FF] shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Target size={16} />
            Habits
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

      {/* Tag Modal */}
      <TagModal
        isOpen={isTagModalOpen}
        onClose={() => {
          setIsTagModalOpen(false);
          setTagModalTaskId(null);
        }}
        onSave={handleCreateTag}
        existingTags={userTags}
      />

      {/* Main Content Area */}
      {activeTab === 'dashboard' && (
        <div className="flex-1 overflow-y-auto animate-fade-in-up">
          <div className="max-w-6xl mx-auto p-6 space-y-6">
            
            {/* Header / Greeting */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                  {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}{user ? `, ${user.name.split(' ')[0]}` : ''}! 👋
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Quick Stats */}
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
              
              {/* Today's Tasks - Takes 1 column */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                      <ListTodo size={20} className="text-[#6F00FF]" />
                      Today's Tasks
                    </h2>
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                      {activeTasks.filter(t => t.completed).length} of {activeTasks.length}
                    </span>
                  </div>
                  
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {activeTasks.length === 0 ? (
                      <p className="text-center text-slate-400 py-8 text-sm">No tasks for today</p>
                    ) : (
                      activeTasks.map(task => (
                        <div 
                          key={task.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            task.completed 
                              ? 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 opacity-60' 
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#6F00FF]/50'
                          }`}
                        >
                          <button
                            onClick={() => handleToggleComplete(task.id, 'active')}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              task.completed 
                                ? 'bg-emerald-500 border-emerald-500' 
                                : 'border-slate-300 dark:border-slate-600 hover:border-[#6F00FF]'
                            }`}
                          >
                            {task.completed && <Check size={12} className="text-white" />}
                          </button>
                          <span className={`flex-1 text-sm ${task.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            {task.title}
                          </span>
                          {task.tag && (
                            <span 
                              className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-white"
                              style={{ backgroundColor: task.tagColor || '#6F00FF' }}
                            >
                              {task.tag}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  <button 
                    onClick={() => setActiveTab('timebox')}
                    className="w-full mt-4 py-2 text-sm text-[#6F00FF] hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors font-medium"
                  >
                    Open Timebox →
                  </button>
                </div>
              </div>

              {/* Weight Tracker - Takes 2 columns */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                      <Activity size={20} className="text-[#6F00FF]" />
                      Weight Tracker
                    </h2>
                    {weightEntries.length > 0 && (
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-500">
                          Current: <strong className="text-slate-800 dark:text-white">{weightEntries[weightEntries.length - 1]?.weight} kg</strong>
                        </span>
                        {weightEntries.length > 1 && (
                          <span className={`font-medium ${
                            weightEntries[weightEntries.length - 1].weight < weightEntries[0].weight 
                              ? 'text-emerald-500' 
                              : 'text-red-500'
                          }`}>
                            {weightEntries[weightEntries.length - 1].weight < weightEntries[0].weight ? '↓' : '↑'}
                            {Math.abs(weightEntries[weightEntries.length - 1].weight - weightEntries[0].weight).toFixed(1)} kg
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Line Chart */}
                  <WeightLineChart entries={weightEntries} height={220} />
                  
                  {/* Weight Input */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <input
                      type="date"
                      value={weightDate}
                      onChange={(e) => setWeightDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/50"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      placeholder="Weight (kg)"
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/50"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddWeight()}
                    />
                    <button
                      onClick={handleAddWeight}
                      className="px-4 py-2 bg-[#6F00FF] text-white text-sm font-medium rounded-lg hover:bg-[#5800cc] transition-colors"
                    >
                      Log
                    </button>
                  </div>
                </div>
              </div>

              {/* Upcoming Events */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
                  <Calendar size={18} className="text-[#6F00FF]" />
                  Today's Schedule
                </h3>
                <div className="space-y-2">
                  {schedule.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">No events scheduled</p>
                  ) : (
                    schedule.slice(0, 4).map(block => (
                      <div key={block.id} className="flex items-center gap-3 text-sm">
                        <div className="text-slate-400 font-mono w-16">{formatTime(block.start)}</div>
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: block.calendarColor || '#6F00FF' }}
                        />
                        <div className="flex-1 text-slate-700 dark:text-slate-200 truncate">{block.title}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Weekly Progress */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
                  <BarChart3 size={18} className="text-[#6F00FF]" />
                  This Week
                </h3>
                <div className="grid grid-cols-7 gap-1">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
                    const isToday = idx === (new Date().getDay() + 6) % 7;
                    const hasTasks = Math.random() > 0.5; // Placeholder - would check real data
                    return (
                      <div key={idx} className="text-center">
                        <div className={`text-xs mb-1 ${isToday ? 'text-[#6F00FF] font-bold' : 'text-slate-400'}`}>{day}</div>
                        <div className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center ${
                          isToday 
                            ? 'bg-[#6F00FF] text-white' 
                            : hasTasks 
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' 
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                        }`}>
                          {isToday ? '●' : hasTasks ? '✓' : '○'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
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
                    listType="active"
                    userTags={userTags}
                    onDragStart={(e) => handleTaskDragStart(e, task, 'active')}
                    onDelete={(id) => handleDeleteTask(id, 'active')}
                    onToggleComplete={(id) => handleToggleComplete(id, 'active')}
                    onMoveToList={handleMoveTaskToList}
                    onAddTag={handleAddTagToTask}
                    onRemoveTag={handleRemoveTagFromTask}
                    onOpenTagModal={handleOpenTagModal}
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
             <div 
               ref={calendarRef}
               className="relative"
             >
               <div 
                 onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                 className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
               >
                  <div className={`w-2 h-2 rounded-full ${isToday(selectedDate) ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                  {selectedDate.toLocaleDateString('sv-SE', { month: 'long', day: 'numeric' })}
                  <User size={14} className="ml-1 text-slate-400" />
               </div>
               
               {/* Calendar Popup */}
               {isCalendarOpen && (
                 <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 z-50 min-w-[280px]">
                   {/* Month Navigation */}
                   <div className="flex items-center justify-between mb-4">
                     <button 
                       onClick={handlePrevMonth}
                       className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                     >
                       <ChevronLeft size={18} className="text-slate-500" />
                     </button>
                     <span className="font-semibold text-slate-800 dark:text-slate-200">
                       {calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                     </span>
                     <button 
                       onClick={handleNextMonth}
                       className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                     >
                       <ChevronRight size={18} className="text-slate-500" />
                     </button>
                   </div>
                   
                   {/* Weekday Headers */}
                   <div className="grid grid-cols-7 gap-1 mb-2">
                     {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                       <div key={day} className="text-center text-xs font-medium text-slate-400 py-1">
                         {day}
                       </div>
                     ))}
                   </div>
                   
                   {/* Days Grid */}
                   <div className="grid grid-cols-7 gap-1">
                     {/* Empty cells for days before first of month */}
                     {Array.from({ length: getFirstDayOfMonth(calendarViewDate.getFullYear(), calendarViewDate.getMonth()) }).map((_, i) => (
                       <div key={`empty-${i}`} className="w-9 h-9" />
                     ))}
                     
                     {/* Day cells */}
                     {Array.from({ length: getDaysInMonth(calendarViewDate.getFullYear(), calendarViewDate.getMonth()) }).map((_, i) => {
                       const day = i + 1;
                       const date = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
                       const isSelected = isSameDay(date, selectedDate);
                       const isTodayDate = isToday(date);
                       
                       return (
                         <button
                           key={day}
                           onClick={() => handleDateSelect(day)}
                           className={`w-9 h-9 rounded-lg text-sm font-medium transition-all
                             ${isSelected 
                               ? 'bg-emerald-500 text-white ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900' 
                               : isTodayDate 
                                 ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' 
                                 : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                             }`}
                         >
                           {day}
                         </button>
                       );
                     })}
                   </div>
                   
                   {/* Today Button */}
                   <button
                     onClick={async () => {
                       const today = new Date();
                       setSelectedDate(today);
                       setCalendarViewDate(today);
                       setIsCalendarOpen(false);
                       await loadScheduleForDate(today);
                     }}
                     className="mt-3 w-full py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                   >
                     Today
                   </button>
                 </div>
               )}
             </div>
          </div>
          <div ref={timelineRef} className="flex-1 overflow-y-auto relative custom-scrollbar scroll-smooth">
            
            {/* Calendar Grid - 24 hours * 96px = 2304px */}
            <div className="relative py-6" style={{ minHeight: `${24 * 96 + 48}px` }}>
              
              {/* Current Time Indicator (Dynamic) */}
              <div 
                className="absolute left-0 right-0 z-20 flex items-center pointer-events-none transition-all duration-1000"
                style={{ top: `${currentTimeDecimal * 96 + 24}px` }}
              >
                <div className="w-14 text-right pr-2">
                  <span className="text-[10px] font-bold text-emerald-500 bg-white dark:bg-slate-900 px-1">
                    {formatTime(currentTimeDecimal)}
                  </span>
                </div>
                <div className="h-0.5 bg-emerald-500 flex-1 relative shadow-sm">
                  <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-emerald-500 shadow-md"></div>
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
                // Calculate position based on midnight (0:00), each hour is 96px (h-24)
                const topOffset = block.start * 96; 
                const height = block.duration * 96;
                const endTime = block.start + block.duration;
                
                // Use Google Calendar color if available, otherwise use block.color
                const hasCalendarColor = block.calendarColor && block.isGoogle;
                const blockStyle = hasCalendarColor 
                  ? { 
                      top: `${topOffset}px`, 
                      height: `${height}px`,
                      backgroundColor: block.calendarColor,
                      borderColor: block.calendarColor,
                    }
                  : { top: `${topOffset}px`, height: `${height}px` };

                return (
                  <div 
                    key={block.id}
                    style={blockStyle}
                    className={`absolute left-16 right-4 rounded-lg p-3 border shadow-sm cursor-move hover:brightness-95 transition-all z-10 flex flex-col group ${block.completed ? 'bg-slate-300/80 dark:bg-slate-700/80 border-slate-400 text-slate-500 dark:text-slate-400' : hasCalendarColor ? 'text-white' : `${block.color} ${block.textColor}`} ${resizingBlockId === block.id || draggingBlockId === block.id ? 'z-20 ring-2 ring-emerald-400 select-none' : ''}`}
                    onMouseDown={(e) => {
                      // Don't start drag if clicking on buttons or resize handle
                      if ((e.target as HTMLElement).closest('button') || 
                          (e.target as HTMLElement).closest('.cursor-ns-resize')) {
                        return;
                      }
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
                            <button onClick={() => handleDeleteBlock(block.id)} className="hover:text-red-600"><X size={14}/></button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {/* Completion checkbox for all blocks */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleToggleBlockComplete(block.id);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors pointer-events-auto ${block.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-400 dark:border-slate-500 hover:border-emerald-500 bg-white/80 dark:bg-slate-800/80'}`}
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
                    {notesSaved && (
                      <span className="text-xs text-emerald-500 flex items-center gap-1">
                        <Check size={12} /> Saved
                      </span>
                    )}
                 </div>
                 
                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                    <textarea
                      value={notesContent}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Write your notes for today..."
                      className="w-full min-h-[180px] p-3 text-sm text-slate-700 dark:text-slate-300 bg-transparent resize-none focus:outline-none placeholder:text-slate-400"
                    />
                 </div>
              </div>

              {/* Weight Tracking Section */}
              <div>
                 <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                      <Activity size={20} className="text-[#6F00FF]" />
                      Weight Tracker
                    </h2>
                    {weightEntries.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">
                          <strong className="text-slate-800 dark:text-white">{weightEntries[weightEntries.length - 1]?.weight} kg</strong>
                        </span>
                        {weightEntries.length > 1 && (
                          <span className={`font-medium ${
                            weightEntries[weightEntries.length - 1].weight < weightEntries[0].weight 
                              ? 'text-emerald-500' 
                              : 'text-red-500'
                          }`}>
                            {weightEntries[weightEntries.length - 1].weight < weightEntries[0].weight ? '↓' : '↑'}
                            {Math.abs(weightEntries[weightEntries.length - 1].weight - weightEntries[0].weight).toFixed(1)}
                          </span>
                        )}
                      </div>
                    )}
                 </div>
                 
                 <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-4">
                    {/* Line Chart */}
                    <WeightLineChart entries={weightEntries} height={160} />
                    
                    {/* Today's Weight Input */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <input
                        type="number"
                        step="0.1"
                        value={newWeight}
                        onChange={(e) => setNewWeight(e.target.value)}
                        placeholder="Today's weight (kg)"
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setWeightDate(new Date().toISOString().split('T')[0]);
                            handleAddWeight();
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          setWeightDate(new Date().toISOString().split('T')[0]);
                          handleAddWeight();
                        }}
                        className="px-4 py-2 bg-[#6F00FF] text-white text-sm font-medium rounded-lg hover:bg-[#5800cc] transition-colors"
                      >
                        Log
                      </button>
                    </div>
                 </div>
              </div>

              {/* Promo Section (Collapsible) */}
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/10 dark:to-indigo-900/10 rounded-xl border border-violet-100 dark:border-violet-900/20 overflow-hidden">
                  <button 
                    onClick={handlePromoToggle}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="text-xl">👩‍🚀</span> What else does Ascend offer?
                    </h4>
                    <div className={`transform transition-transform ${isPromoOpen ? 'rotate-180' : ''}`}>
                      <ChevronDown size={20} className="text-slate-400" />
                    </div>
                  </button>
                  
                  {isPromoOpen && (
                    <div className="px-4 pb-4">
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