import React, { useState, useEffect, useContext, useRef } from 'react';
import LandingPage from './components/LandingPage';
import { LegalProvider } from './context/LegalContext';
import LegalModals from './components/LegalModals';
import CookieBanner from './components/CookieBanner';

import {
  Check,
  X,
  ArrowRight,
  Calendar,
  ListTodo,
  BarChart3,
  Clock,
  RefreshCw,
  Target,
  MoveRight,
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
  Loader2,
  LogOut,
  CalendarCheck,
  Trash2,
  Settings,
  Globe,
  LayoutDashboard,
  Activity,
  Unlink,
  Tag,
  Flame,
  TrendingUp,
  Zap,
  Edit3,
  Repeat,
  ZoomIn,
  ZoomOut,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  setAccessToken,
  debugGoogleCalendarSync
} from './googleCalendar';

import ConsistencyCard from './components/ConsistencyCard';
import DayDetailsModal from './components/DayDetailsModal';
import WeightSection from './components/WeightSection';
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
  saveNote,
  migrateOverdueTasks,
  loadAllTasksForDate,
  toggleTaskCompletion,
  setTaskCompletion,
  generateRecurringInstances,
  createTaskForDate,
  syncHabitCompletion,
  cleanupDuplicateTasks,
  moveTaskToList,
  // Recurring task functions
  createRecurringTask,
  getRecurringTemplates,
  deleteRecurringTemplate,
  updateTagNameAndColor,
} from './database';
import DeleteHabitModal from './components/DeleteHabitModal';
import StreakFlame from './components/StreakFlame';

// --- Constants & Utilities ---

const formatDateISO = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Check if a date is on or after the habit's start date
const isDateEligibleForHabit = (date: Date | string, habitStartDate: string): boolean => {
  const dateStr = typeof date === 'string' ? date : formatDateISO(date);
  return dateStr >= habitStartDate;
};

// Calculate weekly progress percentage for a habit
const calculateWeeklyProgress = (habit: { startDate: string; completedDates: string[] }, weekDates: Date[]): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter week dates to only include eligible days (>= start date AND <= today)
  const eligibleDays = weekDates.filter(date => {
    const dateStr = formatDateISO(date);
    return dateStr >= habit.startDate && date <= today;
  });

  if (eligibleDays.length === 0) return 0;

  // Count how many eligible days were completed
  const completedCount = eligibleDays.filter(date => {
    const dateStr = formatDateISO(date);
    return habit.completedDates.includes(dateStr);
  }).length;

  return Math.round((completedCount / eligibleDays.length) * 100);
};

// Get the dates for a specific week (Sunday to Saturday)
const getWeekDates = (weekOffset: number = 0): Date[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the Sunday of the current week
  const currentDayOfWeek = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - currentDayOfWeek + (weekOffset * 7));

  // Generate all 7 days of the week
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    weekDates.push(date);
  }

  return weekDates;
};

// Check if a date is today
const isToday = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate.getTime() === today.getTime();
};

// Get the first day of the month (0 = Sunday, 6 = Saturday)
const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

// Get the number of days in a month
const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

// --- Context ---

const ThemeContext = React.createContext({
  isDark: false,
  toggleTheme: () => { }
});

const useTheme = () => useContext(ThemeContext);

interface ScheduleBlock {
  id: number | string;
  title: string;
  tag: string | null;
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
// Import our new high-performance chart
import { WeightTrendChart } from './components/WeightTrendChart';

// --- Types ---
interface Task {
  id: number | string;
  title: string;
  tag: string | null;
  tagColor: string | null;
  time: string | null;
  completed: boolean;
  completedAt?: string | null; // Timestamp for when the task was completed
  assignedDate?: string | null; // Date the task belongs to (YYYY-MM-DD)
  isRecurring?: boolean;
  recurrencePattern?: string;
  parentTaskId?: string;
  createdAt?: string; // Creation timestamp
  listType?: 'active' | 'later';
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
  startDate: string; // ISO date string (YYYY-MM-DD) - when user starts tracking this habit
  archivedAt?: string | null; // ISO date string - if set, habit is archived from this date onwards
  endDate?: string | null; // ISO date string - if set, habit stops appearing after this date
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

// --- SVG Icons Gradient Definition ---
// This component should be rendered once at the top of the app to define the gradient
// This component should be rendered once at the top of the app to define the gradient
const IconsGradientDef = () => (
  <svg width="0" height="0" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
    <defs>
      <linearGradient id="active-tab-gradient-def" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#6F00FF" />
        <stop offset="100%" stopColor="#9333ea" />
      </linearGradient>
    </defs>
  </svg>
);

// --- Data Models for Demo ---

const TIME_BLOCKS: ScheduleBlock[] = [];


// --- Timebox App Components ---

interface TaskItemProps {
  key?: string | number;
  task: Task;
  listType: 'active' | 'later';
  userTags: { name: string; color: string }[];
  onDragStart: (e: React.DragEvent, task: Task, sourceList: 'active' | 'later') => void;
  onDelete: (id: string | number) => Promise<void>;
  onToggleComplete: (id: string | number) => Promise<void>;
  onMoveToList: (taskId: string | number, targetList: 'active' | 'later') => Promise<void>;
  onAddTag: (taskId: string | number, tagName: string, tagColor: string) => void;
  onRemoveTag: (taskId: string | number) => void;
  onOpenTagModal: (taskId: string | number) => void;
  onEditTag: (tag: { name: string; color: string }) => void;
  onDeleteTag: (tagName: string) => void;
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
  onEditTag,
  onDeleteTag
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
      onDragStart={(e) => onDragStart(e, task, listType)}
      className={`group flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-[#6F00FF]/50 cursor-grab active:cursor-grabbing transition-all shadow-sm ${task.completed ? 'opacity-60' : ''}`}
    >
      <div
        onClick={() => onToggleComplete(task.id)}
        className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${task.completed ? 'bg-[#6F00FF] border-[#6F00FF]' : 'border-slate-300 dark:border-slate-700 hover:border-[#6F00FF]'}`}
      >
        {task.completed && <Check size={14} className="text-white" />}
      </div>
      <span className={`flex-1 text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
        {task.title}
      </span>
      {task.tag && (
        <span
          onClick={(e) => { e.stopPropagation(); if (onEditTag) onEditTag({ name: task.tag!, color: task.tagColor! }); }}
          className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide text-white cursor-pointer hover:ring-2 hover:ring-white/50 transition-all shrink-0"
          style={{ backgroundColor: task.tagColor || '#6F00FF' }}
          title="Klicka för att redigera tagg"
        >
          {task.tag}
        </span>
      )}
      {task.time && (
        <span className="text-[10px] opacity-70 text-slate-600 dark:text-slate-300">
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
            {(!task.tag || task.tag.trim() === "") && (
              <button onClick={() => { onOpenTagModal(task.id); setIsMenuOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Plus size={14} /> Create Tag
              </button>
            )}
            {task.tag && task.tagColor && onEditTag && (
              <button onClick={() => { onEditTag({ name: task.tag!, color: task.tagColor! }); setIsMenuOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Edit3 size={14} /> Edit Tag
              </button>
            )}

            {(!task.tag || task.tag.trim() === "") && (
              <div className="relative">
                <button onClick={() => setIsTagSubmenuOpen(!isTagSubmenuOpen)} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 justify-between">
                  <span className="flex items-center gap-2"><Tag size={14} /> Add Tag</span>
                  {isTagSubmenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {isTagSubmenuOpen && userTags.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    {userTags.map((tag, idx) => (
                      <div key={idx} className="flex items-center group/tag">
                        <button
                          onClick={() => { onAddTag(task.id, tag.name, tag.color); setIsMenuOpen(false); setIsTagSubmenuOpen(false); }}
                          className="flex-1 px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                          <span className="text-slate-600 dark:text-slate-300 text-sm">{tag.name}</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditTag(tag); setIsMenuOpen(false); }}
                          className="px-3 py-2 text-slate-400 hover:stroke-gradient hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Redigera tagg"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {isTagSubmenuOpen && userTags.length === 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 py-2 px-4 text-xs text-slate-400">No tags yet</div>
                )}
              </div>
            )}
            {task.tag && task.tag.trim() !== "" && (
              <button onClick={() => { onRemoveTag(task.id); setIsMenuOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
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
    </div >
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Tag size={20} className="stroke-gradient" /> {isEditMode ? 'Edit Tag' : 'Create Tag'}
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
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={!tagName.trim()} className="px-4 py-2 text-sm font-medium bg-[#6F00FF] text-white rounded-lg hover:bg-[#5800cc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isEditMode ? 'Save' : 'Create Tag'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Habit Form Component ---
// Simplified: Habits are always daily (appear every day from creation)
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
  const [startDate, setStartDate] = useState(initialHabit?.startDate || formatDateISO(new Date()));
  const [endDate, setEndDate] = useState(initialHabit?.endDate || null); // New state for end date
  const [isStartDateCalendarOpen, setIsStartDateCalendarOpen] = useState(false);
  const [isEndDateCalendarOpen, setIsEndDateCalendarOpen] = useState(false); // New calendar state
  const [startDateCalendarView, setStartDateCalendarView] = useState(new Date(initialHabit?.startDate || new Date()));
  const [endDateCalendarView, setEndDateCalendarView] = useState(new Date(initialHabit?.endDate || new Date())); // New calendar view

  // Auto-select newly created tags
  const [prevTagsLength, setPrevTagsLength] = useState(userTags.length);

  useEffect(() => {
    if (userTags.length > prevTagsLength) {
      const latestTag = userTags[userTags.length - 1];
      setTag(latestTag.name);
      setTagColor(latestTag.color);
    }
    setPrevTagsLength(userTags.length);
  }, [userTags, prevTagsLength]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    // Always daily, no scheduled time (appears in Habits section, can be dragged to timeline)
    onSave({
      name: name.trim(),
      tag,
      tagColor,
      frequency: 'daily',
      scheduledDays: [],
      scheduledStartTime: null,
      scheduledEndTime: null,
      startDate,
      endDate
    });
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
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Start Date</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsStartDateCalendarOpen(!isStartDateCalendarOpen)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#6F00FF] text-left flex items-center justify-between"
          >
            <span>{new Date(startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <Calendar size={16} className="text-slate-400" />
          </button>
          {isStartDateCalendarOpen && (
            <div className="relative mt-4 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4 z-10">
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setStartDateCalendarView(new Date(startDateCalendarView.getFullYear(), startDateCalendarView.getMonth() - 1))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <ChevronLeft size={18} className="text-slate-500" />
                </button>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {startDateCalendarView.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => setStartDateCalendarView(new Date(startDateCalendarView.getFullYear(), startDateCalendarView.getMonth() + 1))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <ChevronRight size={18} className="text-slate-500" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 place-items-center">
                {Array.from({ length: getFirstDayOfMonth(startDateCalendarView.getFullYear(), startDateCalendarView.getMonth()) }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-8 h-8" />
                ))}
                {Array.from({ length: getDaysInMonth(startDateCalendarView.getFullYear(), startDateCalendarView.getMonth()) }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(startDateCalendarView.getFullYear(), startDateCalendarView.getMonth(), day);
                  const dateStr = formatDateISO(date);
                  const isSelected = dateStr === startDate;
                  const isTodayDate = isToday(date);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setStartDate(dateStr);
                        setIsStartDateCalendarOpen(false);
                      }}
                      className={`w-8 h-8 rounded-full text-sm font-semibold transition-all flex items-center justify-center ${isSelected
                        ? 'bg-gradient-to-r from-[#6F00FF] to-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : isTodayDate
                          ? 'bg-purple-50 dark:bg-purple-500/10 stroke-gradient dark:text-purple-400 border border-purple-200 dark:border-purple-500/30'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setStartDate(formatDateISO(today));
                  setStartDateCalendarView(today);
                  setIsStartDateCalendarOpen(false);
                }}
                className="mt-3 w-full py-2 text-sm font-medium stroke-gradient dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
              >
                Today
              </button>
            </div>
          )}
        </div>
      </div>

      {/* End Date Field (Optional) */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">End Date <span className="text-slate-400 font-normal">(optional)</span></label>
        <div className="relative">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsEndDateCalendarOpen(!isEndDateCalendarOpen)}
              className={`flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#6F00FF] text-left flex items-center justify-between ${!endDate ? 'text-slate-400 dark:text-slate-500' : ''}`}
            >
              <span>{endDate ? new Date(endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No end date'}</span>
              <Calendar size={16} className="text-slate-400" />
            </button>
            {endDate && (
              <button
                type="button"
                onClick={() => setEndDate(null)}
                className="px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                title="Remove End Date"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {isEndDateCalendarOpen && (
            <div className="relative mt-4 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4 z-10">
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setEndDateCalendarView(new Date(endDateCalendarView.getFullYear(), endDateCalendarView.getMonth() - 1))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <ChevronLeft size={18} className="text-slate-500" />
                </button>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {endDateCalendarView.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => setEndDateCalendarView(new Date(endDateCalendarView.getFullYear(), endDateCalendarView.getMonth() + 1))}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <ChevronRight size={18} className="text-slate-500" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 place-items-center">
                {Array.from({ length: getFirstDayOfMonth(endDateCalendarView.getFullYear(), endDateCalendarView.getMonth()) }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-8 h-8" />
                ))}
                {Array.from({ length: getDaysInMonth(endDateCalendarView.getFullYear(), endDateCalendarView.getMonth()) }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(endDateCalendarView.getFullYear(), endDateCalendarView.getMonth(), day);
                  const dateStr = formatDateISO(date);
                  const isSelected = dateStr === endDate;
                  const isTodayDate = isToday(date);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setEndDate(dateStr);
                        setIsEndDateCalendarOpen(false);
                      }}
                      className={`w-8 h-8 rounded-full text-sm font-semibold transition-all flex items-center justify-center ${isSelected
                        ? 'bg-gradient-to-r from-[#6F00FF] to-purple-600 text-white shadow-lg shadow-purple-500/30'
                        : isTodayDate
                          ? 'bg-purple-50 dark:bg-purple-500/10 stroke-gradient dark:text-purple-400 border border-purple-200 dark:border-purple-500/30'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Repeat size={16} className="stroke-gradient" />
          <span>Habits appear <strong>every day</strong> in the Habits section</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">Drag habits to the timeline to schedule them for a specific time. Your streak builds as you complete them each day!</p>
      </div>
      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200">Cancel</button>
        <button type="submit" disabled={!name.trim()} className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-[#6F00FF] to-purple-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-all disabled:opacity-50">{initialHabit ? 'Update Habit' : 'Create Habit'}</button>
      </div>
    </form >
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

  // Local state for temporary changes (not saved until "Save" is clicked)
  const [localSettings, setLocalSettings] = useState(settings);

  // Check if there are unsaved changes
  const hasUnsavedChanges = localSettings.timeFormat !== settings.timeFormat ||
    localSettings.timezone !== settings.timezone;

  // Reset to initialTab and sync local settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveSettingsTab(initialTab);
      setLocalSettings(settings); // Reset local state to current saved settings
    }
  }, [isOpen, initialTab, settings]);

  // Handle save
  const handleSave = () => {
    setSettings(localSettings);
    onClose();
  };

  // Handle close (discard changes)
  const handleClose = () => {
    setLocalSettings(settings); // Reset to saved settings
    onClose();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'account', label: 'Account' },
    { id: 'billing', label: 'Billing' },
    { id: 'customisations', label: 'Customisations' },
    { id: 'integrations', label: 'Integrations' },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300 mt-0.5">Manage your account, billing, customisations, and integrations here.</p>
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
                onClick={handleClose}
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
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeSettingsTab === tab.id
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border-l-2 border-[#6F00FF]'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
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
                        <p className="text-sm text-slate-600 dark:text-slate-300">{user.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sign Out */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Sign Out</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mb-3">Sign out of your account on all devices.</p>
                  <button
                    onClick={onLogout}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>

                {/* Unsubscribe from emails */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Unsubscribe from emails</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mb-3">You will not receive any emails from Ascend.</p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <button
                      onClick={() => setEmailUnsubscribed(!emailUnsubscribed)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${emailUnsubscribed ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${emailUnsubscribed ? 'left-6' : 'left-1'}`} />
                    </button>
                    <span className="text-sm text-slate-600 dark:text-slate-300">
                      Unsubscribe from emails: {emailUnsubscribed ? 'Yes' : 'No'}
                    </span>
                  </label>
                </div>

                {/* Delete Account */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Delete Account</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mb-3">Deleting your account will remove all of your data from our servers.</p>
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
                  <button className="px-5 py-2.5 bg-gradient-to-r from-[#6F00FF] to-purple-600 hover:from-[#5800cc] hover:to-purple-700 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40">
                    Upgrade to Lifetime
                  </button>
                  <button className="px-5 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Orders Portal
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-300">
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
                  <p className="text-xs text-slate-500 dark:text-slate-300 mb-3">Choose how times are displayed in your calendar.</p>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
                    <button
                      onClick={() => setLocalSettings({ ...localSettings, timeFormat: '12h' })}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${localSettings.timeFormat === '12h' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      12-hour (9:00 AM)
                    </button>
                    <button
                      onClick={() => setLocalSettings({ ...localSettings, timeFormat: '24h' })}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${localSettings.timeFormat === '24h' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      24-hour (09:00)
                    </button>
                  </div>
                </div>

                {/* Timezone */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Timezone</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mb-3">Your calendar events will be displayed in this timezone.</p>
                  <div className="relative w-full max-w-xs">
                    <select
                      value={localSettings.timezone}
                      onChange={(e) => setLocalSettings({ ...localSettings, timezone: e.target.value })}
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
                  <p className="text-xs text-slate-500 dark:text-slate-300 mb-3">Sync your schedule with Google Calendar for two-way sync.</p>

                  {/* Status indicator */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-300">Status:</span>
                    {googleAccount ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
                        <div className="w-2 h-2 rounded-full bg-[#6F00FF]"></div>
                        Synced
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                        Not Connected
                      </span>
                    )}
                  </div>

                  {googleAccount ? (
                    <div className="flex flex-col p-4 gap-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-200/50 dark:border-purple-800/30">
                      <div className="flex items-center gap-3">
                        {googleAccount.picture ? (
                          <img
                            src={googleAccount.picture}
                            alt={googleAccount.name || googleAccount.email}
                            className="w-10 h-10 rounded-full ring-2 ring-purple-200 dark:ring-purple-800/50 shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold ring-2 ring-purple-200 dark:ring-purple-800/50 shrink-0 ${googleAccount.picture ? 'hidden' : ''}`}>
                          <User size={20} />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 truncate">{googleAccount.name}</p>
                          <p className="text-xs stroke-gradient dark:text-purple-400 truncate">{googleAccount.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href="https://calendar.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-purple-500/10 stroke-gradient dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 hover:bg-purple-50 dark:hover:bg-purple-500/20 rounded-lg transition-all text-sm font-semibold whitespace-nowrap shadow-sm active:scale-95"
                        >
                          <Calendar size={16} />
                          Open Calendar
                        </a>
                        <button
                          onClick={handleDisconnectGoogle}
                          className="flex items-center justify-center gap-2 px-3 py-2 text-slate-500 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-sm font-medium whitespace-nowrap"
                          title="Disconnect account"
                        >
                          <Unlink size={16} />
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleConnectGoogle}
                      disabled={isGoogleConnecting || !googleApiReady}
                      className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                      {isGoogleConnecting ? (
                        <>
                          <Loader2 size={20} className="animate-spin text-slate-500" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Connecting...</span>
                        </>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Connect Google Calendar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={async () => {
                  const result = await debugGoogleCalendarSync();
                  alert(result);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
              >
                Test Google Sync (Debug)
              </button>
            </div>
          </div>
        </div >

        {/* Footer with Save button and unsaved changes warning */}
        < div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50" >
          <div className="flex items-center justify-between">
            <div>
              {hasUnsavedChanges && (
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  You have unsaved changes
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${hasUnsavedChanges
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
              >
                Save
              </button>
            </div>
          </div>
        </div >
      </div >
    </div >
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
    timeFormat: '24h',
    timezone: 'Local'
  });

  // State for Calendar Picker - persist selected date across refreshes
  const [selectedDate, setSelectedDate] = useState(() => {
    // CRITICAL FIX: Always default to TODAY
    // Don't trust localStorage if it contains an old date
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight

    const saved = localStorage.getItem('ascend_selected_date');
    if (saved) {
      const savedDate = new Date(saved);
      savedDate.setHours(0, 0, 0, 0); // Normalize to midnight

      // Only use saved date if it's not in the past
      if (savedDate >= today) {
        return savedDate;
      }


    }

    return today;
  });
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
  const [weightDate, setWeightDate] = useState(formatDateISO(new Date()));
  const [isWeightCalendarOpen, setIsWeightCalendarOpen] = useState(false);
  const [isWeightListOpen, setIsWeightListOpen] = useState(false);
  const [weightCalendarViewDate, setWeightCalendarViewDate] = useState(new Date());
  const weightCalendarRef = useRef<HTMLDivElement>(null);

  // State for Habits
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('ascend_habits');
    return saved ? JSON.parse(saved) : [];
  });
  const habitsRef = useRef<Habit[]>(habits);
  const [isAddHabitOpen, setIsAddHabitOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null); // For delete confirmation modal

  // Migrate existing habits to have startDate
  useEffect(() => {
    const needsMigration = habits.some(h => !h.startDate);
    if (needsMigration) {
      const migratedHabits = habits.map(h => {
        if (!h.startDate) {
          // Set startDate to earliest completedDate or today
          const earliestDate = h.completedDates.length > 0
            ? h.completedDates.sort()[0]
            : formatDateISO(new Date());
          return { ...h, startDate: earliestDate };
        }
        return h;
      });
      setHabits(migratedHabits);
    }
  }, []); // Run once on mount

  // Save habits to localStorage
  useEffect(() => {
    localStorage.setItem('ascend_habits', JSON.stringify(habits));
    habitsRef.current = habits;
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
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [laterTasks, setLaterTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<ScheduleBlock[]>(TIME_BLOCKS);
  const [newTaskInput, setNewTaskInput] = useState("");
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Timeline zoom state
  const [isZoomedOut, setIsZoomedOut] = useState(() => {
    const saved = localStorage.getItem('ascend_zoom_state');
    return saved ? JSON.parse(saved) : false;
  });
  const [habitWeekOffset, setHabitWeekOffset] = useState(0);
  const HOUR_HEIGHT_NORMAL = 96; // 96px per hour (normal view)
  const HOUR_HEIGHT_ZOOMED = 40; // 40px per hour (zoomed out view)
  const hourHeight = isZoomedOut ? HOUR_HEIGHT_ZOOMED : HOUR_HEIGHT_NORMAL;

  // Handle zoom toggle with auto-scroll to center current time
  const handleZoomToggle = () => {
    const newZoomState = !isZoomedOut;
    setIsZoomedOut(newZoomState);
    localStorage.setItem('ascend_zoom_state', JSON.stringify(newZoomState));

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

  // Save selected date to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ascend_selected_date', selectedDate.toISOString());
  }, [selectedDate]);

  // --- Day Details Modal ---
  const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false);
  const [dayDetailsDate, setDayDetailsDate] = useState<Date>(new Date());
  const [dayDetailsData, setDayDetailsData] = useState<{
    habits: Habit[];
    tasks: { active: Task[]; later: Task[] };
    weight: number | null;
    note: string;
  }>({
    habits: [],
    tasks: { active: [], later: [] },
    weight: null,
    note: ''
  });

  const handleDayClick = async (date: Date) => {
    setDayDetailsDate(date);

    const dateStr = formatDateISO(date);
    const weightEntry = weightEntries.find(w => w.date === dateStr);
    const weight = weightEntry ? weightEntry.weight : null;

    let active: Task[] = [];
    let later: Task[] = [];
    let note = '';

    if (isSameDay(date, selectedDate)) {
      active = activeTasks;
      later = laterTasks;
      note = notesContent;
    } else {
      try {
        const { active: fetchedActive, later: fetchedLater } = await loadAllTasksForDate(dateStr);
        active = fetchedActive;
        later = fetchedLater;
        const fetchedNote = await loadNote(dateStr);
        note = fetchedNote || '';
      } catch (error) {
        console.error("Error fetching day details:", error);
      }
    }

    setDayDetailsData({
      habits: habits,
      tasks: { active, later },
      weight,
      note
    });
    setIsDayDetailsOpen(true);
  };



  // Load data from database on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      // Only show top-level loader if we have NO data yet (initial load)
      const isInitialLoad = !isDataLoaded;
      if (isInitialLoad) setIsDataLoaded(false);

      try {
        const todayISO = formatDateISO(selectedDate);


        // 1. Generate today's recurring instances (now bulk-optimized)
        await generateRecurringInstances(selectedDate);

        // 2. Load date-specific data in parallel
        // Optimization: combined active and later task loading into one call
        const [allTasksData, blocksData, noteContent] = await Promise.all([
          loadAllTasksForDate(selectedDate),
          loadScheduleBlocks(selectedDate),
          loadNote(selectedDate)
        ]);

        const { active: todayTasks, later: laterData } = allTasksData;

        // IMMEDIATELY clear states right before applying new data to prevent jumping
        // but avoid the full-screen loader
        setActiveTasks([]);
        setLaterTasks([]);
        setSchedule([]);

        // Set active tasks - trust the database results
        setActiveTasks(todayTasks.map(t => ({
          id: t.id,
          title: t.title,
          tag: t.tag,
          tagColor: t.tagColor,
          time: t.time,
          completed: t.completed,
          completedAt: t.completedAt,
          assignedDate: t.assignedDate,
          isRecurring: t.isRecurring,
          recurrencePattern: t.recurrencePattern,
          parentTaskId: t.parentTaskId,
        })));

        // Set later tasks (these persist across all days)
        setLaterTasks(laterData.map(t => ({
          id: t.id,
          title: t.title,
          tag: t.tag,
          tagColor: t.tagColor,
          time: t.time,
          completed: t.completed,
          completedAt: t.completedAt,
          assignedDate: t.assignedDate,
          isRecurring: t.isRecurring,
          recurrencePattern: t.recurrencePattern,
          parentTaskId: t.parentTaskId,
        })));

        // Sync completion status between schedule blocks and tasks
        const syncedSchedule = (blocksData as ScheduleBlock[]).map((block: ScheduleBlock) => {
          if (block.taskId) {
            const taskIdStr = String(block.taskId);
            const linkedTask = todayTasks.find(t => String(t.id) === taskIdStr)
              || laterData.find(t => String(t.id) === taskIdStr);

            if (linkedTask && linkedTask.completed !== block.completed) {

              return { ...block, completed: linkedTask.completed };
            }
          }

          if (block.habitId) {
            const linkedHabit = habitsRef.current.find(h => String(h.id) === String(block.habitId));
            if (linkedHabit) {
              const isComp = linkedHabit.completedDates.includes(todayISO);

              if (block.completed && !isComp) {
                // reverse sync
                setHabits(prev => prev.map(h =>
                  String(h.id) === String(block.habitId)
                    ? { ...h, completedDates: [...h.completedDates, todayISO] }
                    : h
                ));
              } else if (!block.completed && isComp) {
                // forward sync
                return { ...block, completed: true };
              }
            }
          }

          return block;
        });

        // Remove duplicates based on block ID
        const uniqueSchedule = syncedSchedule.filter((block, index, self) =>
          index === self.findIndex(b => String(b.id) === String(block.id))
        );

        // Remove blocks that reference deleted habits




        const validSchedule = uniqueSchedule.filter(block => {
          if (block.habitId) {
            const habitExists = habits.some(h => h.id === block.habitId);
            if (!habitExists) {

              // Also delete from database
              deleteScheduleBlock(String(block.id)).catch(() => { });
              return false;
            }
          }
          return true;
        });

        setSchedule(validSchedule);
        setNotesContent(noteContent);
        setIsDataLoaded(true);

        // Load Google Calendar events in parallel (don't wait for it)
        if (googleAccount) {
          loadGoogleEventsForDate(selectedDate).catch(err =>
            console.error('Error loading Google Calendar:', err)
          );
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setIsDataLoaded(true);
      }
    };

    loadData();
  }, [user, selectedDate]);

  // Load User Settings once on mount/user change
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      const userSettings = await loadUserSettings();
      if (userSettings) {
        setSettings({
          timeFormat: userSettings.timeFormat || '24h',
          timezone: userSettings.timezone || 'Local'
        });
      }
    };
    loadSettings();
  }, [user]);

  // Function to move incomplete "later" tasks to today (they persist across days)
  const moveIncompleteLaterTasksToToday = async () => {
    // Later tasks are already loaded - they persist by design
    // We just need to ensure incomplete ones remain visible

  };

  // Function to load Google Calendar events for a specific date
  const loadGoogleEventsForDate = async (date: Date) => {
    if (!googleAccount) return;

    // Ensure we have a valid access token from backend
    const token = await getValidAccessToken();
    if (!token) {
      if (googleAccount) {
        setNotification({
          type: 'error',
          message: 'Google Calendar sync failed. Please reconnect in Settings.'
        });
      }
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

      // Deduplicate and update: Merge Google events with local blocks
      setSchedule(prev => {
        // Get all Google event IDs that we're about to add/update
        const incomingGoogleEventIds = new Set(googleBlocks.map(b => b.googleEventId).filter(Boolean));

        // Create a map of old blocks by googleEventId to preserve their properties
        const oldBlocksByGoogleId = new Map(
          prev.filter(b => b.googleEventId).map(b => [b.googleEventId, b])
        );

        // Keep blocks that are:
        // 1) Not from Google AND don't have a googleEventId that matches incoming events
        // 2) User-created (have taskId/habitId) AND don't have a googleEventId that matches incoming events
        // This ensures we never lose user blocks, but we remove old versions of Google events
        const localBlocks = prev.filter(b => {
          // If this block has a googleEventId that's in the incoming events, remove it
          if (b.googleEventId && incomingGoogleEventIds.has(b.googleEventId)) {

            return false;
          }
          // Keep non-Google blocks or user-created blocks
          return !b.isGoogle || b.taskId || b.habitId;
        });

        // Find old Google events that will be replaced
        const eventsToReplace = prev.filter(b =>
          b.isGoogle &&
          b.googleEventId &&
          incomingGoogleEventIds.has(b.googleEventId)
        );

        // Log what's being updated
        eventsToReplace.forEach(old => {
          const newEvent = googleBlocks.find(g => g.googleEventId === old.googleEventId);
          if (newEvent && old.start !== newEvent.start) {

          }
        });

        // Remove old Google events that will be replaced by incoming ones
        const existingGoogleBlocks = prev.filter(b =>
          b.isGoogle &&
          b.googleEventId &&
          !incomingGoogleEventIds.has(b.googleEventId)
        );

        // Create sets for signature matching (to avoid duplicates without Google IDs)
        const localBlockSignatures = new Set(localBlocks.map(b => `${b.start}-${b.title}`));

        // Process Google blocks: merge with old properties if they exist
        const processedGoogleBlocks = googleBlocks.map(g => {
          const oldBlock = oldBlocksByGoogleId.get(g.googleEventId as string) as ScheduleBlock | undefined;
          if (oldBlock) {
            // Merge: keep taskId, habitId, and other important properties from old block

            return {
              ...g,
              taskId: oldBlock.taskId,
              habitId: oldBlock.habitId,
              completed: oldBlock.completed,
              // Keep original tag if it was user-set, otherwise use Google calendar name
              tag: oldBlock.taskId || oldBlock.habitId ? oldBlock.tag : g.tag,
            };
          }
          return g;
        });

        // Filter out Google events that match local blocks by signature
        const uniqueGoogleBlocks = processedGoogleBlocks.filter(g => {
          const signature = `${g.start}-${g.title}`;
          if (localBlockSignatures.has(signature)) {

            return false;
          }
          return true;
        });



        // Merge all blocks and remove any duplicates by ID
        const mergedBlocks = [...localBlocks, ...existingGoogleBlocks, ...uniqueGoogleBlocks];
        const dedupedBlocks = mergedBlocks.filter((block, index, self) =>
          index === self.findIndex(b => String(b.id) === String(block.id))
        );

        if (dedupedBlocks.length < mergedBlocks.length) {

        }

        return dedupedBlocks;
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
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [dragOverList, setDragOverList] = useState<string | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);

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
  // DISABLED: Auto-sync creates duplicates - user must manually sync instead
  /*
  useEffect(() => {
    const autoSync = async () => {
      if (googleAccount && isDataLoaded && !isCalendarSynced) {

        try {
          await loadGoogleEventsForDate(selectedDate);
          setIsCalendarSynced(true);

        } catch (error) {
          console.error('Auto-sync failed:', error);
        }
      }
    };
    autoSync();
  }, [googleAccount, isDataLoaded]);
  */

  // Poll Google Calendar events every 10 seconds to detect external changes
  useEffect(() => {
    if (!googleAccount || !isDataLoaded) return;

    const pollInterval = setInterval(async () => {

      const token = await getValidAccessToken();
      if (token) {
        await loadGoogleEventsForDate(selectedDate);
      }
    }, 10000); // 10 seconds

    return () => clearInterval(pollInterval);
  }, [googleAccount, isDataLoaded, selectedDate]);

  // Notification State
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Auto-hide notification after 1 second
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 1000);
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
      if (weightCalendarRef.current && !weightCalendarRef.current.contains(event.target as Node)) {
        setIsWeightCalendarOpen(false);
      }
    };
    if (isCalendarOpen || isWeightCalendarOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCalendarOpen, isWeightCalendarOpen]);

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
  // Habit helper functions - now simplified as all habits are daily
  // Habit helper functions - now simplified as all habits are daily

  const getTodayString = () => formatDateISO(new Date());

  const isHabitScheduledForDay = (habit: Habit, date: Date) => {
    // Habits appear every day from the start date (or creation date as fallback)
    const startDateStr = habit.startDate || habit.createdAt;
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate >= startDate;
  };
  const isHabitCompletedOnDate = (habit: Habit, dateString: string) => habit.completedDates.includes(dateString);

  const calculateStreak = (habit: Habit): number => {
    let streak = 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Start checking from "now" or the latest completion date (whichever is later)
    // to handle completion of future habits or keeping streak alive today
    let checkDate = new Date(now);

    // If the habit is completed in the future, we start from there
    const sortedDates = [...habit.completedDates].sort().reverse();
    if (sortedDates.length > 0) {
      const latestDone = new Date(sortedDates[0]);
      if (latestDone > checkDate) {
        checkDate = latestDone;
      }
    }

    // Check if it's completed today or was completed yesterday to keep streak alive
    const todayStr = formatDateISO(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateISO(yesterday);

    const isDoneToday = habit.completedDates.includes(todayStr);
    const isDoneYesterday = habit.completedDates.includes(yesterdayStr);

    // Also check for "Tomorrow" if we are counting future streaks
    if (!isDoneToday && !isDoneYesterday) {
      // Check if there are any completions at all that could be part of a streak
      const hasAnyCompletion = habit.completedDates.length > 0;
      if (!hasAnyCompletion) return 0;

      // If we are looking at a streak, we might have skipped today but done yesterday.
      // If we haven't done today OR yesterday, the streak is broken (0).
      return 0;
    }

    // Start checking backwards from the checkDate
    let currentCheck = new Date(checkDate);
    while (true) {
      const dateStr = formatDateISO(currentCheck);
      if (habit.completedDates.includes(dateStr)) {
        streak++;
        currentCheck.setDate(currentCheck.getDate() - 1);
      } else {
        // Only break if we've passed "now" back into the past
        // If we started from a future date, we keep going until we hit a gap
        break;
      }
      if (streak > 1000) break;
    }
    return streak;
  };

  const toggleHabitCompletion = (habitId: string, date?: Date) => {
    const targetDate = date || selectedDate;
    const dateString = formatDateISO(targetDate);

    // Find current habit to determine new completion state
    const currentHabit = habits.find(h => h.id === habitId);
    if (!currentHabit) return;

    // Validate that the date is on or after the habit's start date
    if (!isDateEligibleForHabit(dateString, currentHabit.startDate)) {
      setNotification({
        type: 'info',
        message: `Cannot mark habit before start date (${new Date(currentHabit.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`
      });
      return;
    }

    const isCurrentlyCompleted = currentHabit.completedDates.includes(dateString);
    const newCompleted = !isCurrentlyCompleted;

    setHabits(prev => prev.map(habit => {
      if (habit.id !== habitId) return habit;

      const newCompletedDates = newCompleted
        ? [...habit.completedDates, dateString]
        : habit.completedDates.filter(d => d !== dateString);

      const updatedHabit = { ...habit, completedDates: newCompletedDates };
      const newStreak = calculateStreak(updatedHabit);

      return {
        ...updatedHabit,
        currentStreak: newStreak,
        longestStreak: Math.max(habit.longestStreak, newStreak)
      };
    }));

    // Sync status with any schedule blocks for this habit ON THIS SPECIFIC DATE
    setSchedule(prev => prev.map(block => {
      if (block.habitId === habitId) {
        // We only want to update the block if it's for the selected date
        // Note: Currently schedule contains blocks for selectedDate
        return { ...block, completed: newCompleted };
      }
      return block;
    }));

    // Persist to database if there are blocks on the timeline
    const associatedBlocks = schedule.filter(b => b.habitId === habitId);
    for (const block of associatedBlocks) {
      updateScheduleBlock(String(block.id), { completed: newCompleted }).catch(err =>
        console.error('Failed to sync habit block completion:', err)
      );
    }
  };

  const addHabit = (newHabit: Omit<Habit, 'id' | 'currentStreak' | 'longestStreak' | 'completedDates' | 'createdAt'>) => {
    const habit: Habit = { ...newHabit, id: crypto.randomUUID(), currentStreak: 0, longestStreak: 0, completedDates: [], createdAt: formatDateISO(new Date()) };
    setHabits(prev => [...prev, habit]);
    setIsAddHabitOpen(false);
  };

  const updateHabit = (habitId: string, updates: Partial<Habit>) => {
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, ...updates } : h));
    setEditingHabit(null);
  };

  // Handle habit deletion button (opens modal)
  const deleteHabit = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (habit) setHabitToDelete(habit);
  };

  // Confirm: Hard Delete
  const confirmDeleteForever = () => {
    if (habitToDelete) {
      setHabits(prev => prev.filter(h => h.id !== habitToDelete.id));
      setHabitToDelete(null);
    }
  };

  // Confirm: Archive
  const confirmArchive = () => {
    if (habitToDelete) {
      setHabits(prev => prev.map(h =>
        h.id === habitToDelete.id
          ? { ...h, archivedAt: new Date().toISOString() }
          : h
      ));
      setHabitToDelete(null);
    }
  };

  // Simplified: All habits are daily, so they all show every day
  // Filter out archived habits if the current view date is ON or AFTER the archive date
  const getTodaysHabits = () => {
    // Determine the relevant date for filtering
    const viewDateStr = formatDateISO(selectedDate);

    // Filter habits
    return habits.filter(h => {
      // If habit is archived...
      if (h.archivedAt) {
        // ...hide it if the view date is ON or AFTER the archive date
        // Example: Archived today (2024-01-01). 
        // View Today (2024-01-01): Hide.
        // View Yesterday (2023-12-31): Show.
        const archiveDateStr = h.archivedAt.split('T')[0]; // Extract YYYY-MM-DD
        if (viewDateStr >= archiveDateStr) {
          return false;
        }
      }
      // If habit has an end date...
      if (h.endDate) {
        // ...hide it if the view date is AFTER the end date
        if (viewDateStr > h.endDate) {
          return false;
        }
      }
      return true;
    });
  };
  // All habits appear in the Habits section (can be dragged to timeline)
  const getUnscheduledTodaysHabits = () => getTodaysHabits();

  const getWeekNumber = (d: Date) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const getWeeklyData = (habit: Habit) => {
    const result = [];
    const today = new Date();
    // Apply week offset
    today.setDate(today.getDate() + (habitWeekOffset * 7));

    // Get Monday of current week
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateString = formatDateISO(date);
      const isTodayReal = formatDateISO(new Date()) === dateString;

      // Only mark as scheduled if date is on or after startDate
      const isAfterStartDate = dateString >= habit.startDate;

      result.push({
        date, dateString, dayName: WEEKDAYS[date.getDay()],
        isScheduled: isAfterStartDate && isHabitScheduledForDay(habit, date),
        isCompleted: habit.completedDates.includes(dateString),
        isToday: isTodayReal
      });
    }
    return result;
  };

  // Tag handlers
  const handleCreateTag = async (tagName: string, tagColor: string) => {
    if (editingTag) {
      // Editing existing tag - update all tasks/habits that use this tag
      const oldTagName = editingTag.name;
      const updatedTags = userTags.map(t => t.name === oldTagName ? { name: tagName, color: tagColor } : t);
      setUserTags(updatedTags);
      localStorage.setItem('ascend_user_tags', JSON.stringify(updatedTags));

      // Update all tasks with the old tag in UI
      setActiveTasks(prev => prev.map(t => t.tag === oldTagName ? { ...t, tag: tagName, tagColor: tagColor } : t));
      setLaterTasks(prev => prev.map(t => t.tag === oldTagName ? { ...t, tag: tagName, tagColor: tagColor } : t));

      // Update all habits with the old tag in UI
      setHabits(prev => prev.map(h => h.tag === oldTagName ? { ...h, tag: tagName, tagColor: tagColor } : h));

      // Persist cascading update to database
      await updateTagNameAndColor(oldTagName, tagName, tagColor);

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

  const handleDeleteTagByName = (tagName: string) => {
    const updatedTags = userTags.filter(t => t.name !== tagName);
    setUserTags(updatedTags);
    localStorage.setItem('ascend_user_tags', JSON.stringify(updatedTags));

    // Remove tag from all tasks
    setActiveTasks(prev => prev.map(t => t.tag === tagName ? { ...t, tag: null, tagColor: null } : t));
    setLaterTasks(prev => prev.map(t => t.tag === tagName ? { ...t, tag: null, tagColor: null } : t));

    // Remove tag from all habits
    setHabits(prev => prev.map(h => h.tag === tagName ? { ...h, tag: undefined, tagColor: undefined } : h));
  };


  const handleOpenEditTagModal = (tag: { name: string; color: string }, contextId?: { taskId?: number | string, habitId?: string }) => {
    setEditingTag(tag);
    if (contextId?.taskId) setTagModalTaskId(contextId.taskId);
    if (contextId?.habitId) setTagModalHabitId(contextId.habitId);
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
      setLaterTasks(prev => [...prev, { ...task, time: null, assignedDate: null }]);
    } else if (taskInLater && targetList === 'active') {
      setLaterTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
      setActiveTasks(prev => [...prev, { ...task, assignedDate: formatDateISO(selectedDate) }]);
    }

    // Always pass selectedDate so that "Later" tasks are also bound to this specific day
    await moveTaskToList(String(taskId), targetList, selectedDate);
  };

  const handleToggleComplete = async (taskId: string | number) => {
    const id = String(taskId);
    // Find the task in either list
    const task = activeTasks.find(t => t.id === id) || laterTasks.find(t => t.id === id);
    if (!task) return;

    const newCompleted = !task.completed;
    const completedAt = newCompleted ? formatDateISO(new Date()) : null;

    // 1. Update UI state for tasks
    setActiveTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newCompleted, completedAt } : t));
    setLaterTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newCompleted, completedAt } : t));

    // 2. Update UI state for schedule blocks
    // If a task is toggled, all blocks linked to it should also toggle
    setSchedule(prev => prev.map(block =>
      String(block.taskId) === id ? { ...block, completed: newCompleted } : block
    ));

    try {
      // 3. Persist to DB - Task
      await setTaskCompletion(id, newCompleted);

      // 4. Persist to DB - Associated Blocks
      const associatedBlocks = schedule.filter(b => String(b.taskId) === id);
      for (const block of associatedBlocks) {
        await updateScheduleBlock(String(block.id), { completed: newCompleted });
      }


    } catch (err) {
      console.error('Failed to sync completion to database:', err);
    }
  };

  const handleToggleBlockComplete = async (blockId: number | string) => {
    const block = schedule.find(b => String(b.id) === String(blockId));
    if (!block) return;

    const newCompleted = !block.completed;
    const now = formatDateISO(new Date());

    // Update schedule block in UI
    setSchedule(prev => prev.map(b => String(b.id) === String(blockId) ? { ...b, completed: newCompleted } : b));

    // If block is linked to a task, update task completion
    if (block.taskId) {
      // Update task in UI with completion timestamp
      setActiveTasks(prev => prev.map(t =>
        String(t.id) === String(block.taskId)
          ? { ...t, completed: newCompleted, completedAt: newCompleted ? now : null }
          : t
      ));
      setLaterTasks(prev => prev.map(t =>
        String(t.id) === String(block.taskId)
          ? { ...t, completed: newCompleted, completedAt: newCompleted ? now : null }
          : t
      ));

      // Find current task to get its completion status
      const currentTask = activeTasks.find(t => String(t.id) === String(block.taskId))
        || laterTasks.find(t => String(t.id) === String(block.taskId));

      // Update task in DB with proper timestamp tracking
      if (currentTask) {
        await setTaskCompletion(String(block.taskId), newCompleted);
      }
    }

    // If block is linked to a habit, toggle habit completion
    if (block.habitId) {
      toggleHabitCompletion(block.habitId, selectedDate);
    }

    // Update schedule block in DB
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
    setWeightDate(formatDateISO(new Date()));
    setNotification({ type: 'success', message: `Weight logged: ${weight} kg` });
  };

  const handleDeleteWeightEntry = (index: number) => {
    const updatedEntries = weightEntries.filter((_, i) => i !== index);
    setWeightEntries(updatedEntries);
    localStorage.setItem('ascend_weight_entries', JSON.stringify(updatedEntries));
    setNotification({ type: 'success', message: 'Weight entry deleted' });
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
      const dateString = formatDateISO(date);

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
            color: habit.tagColor || '#6F00FF',
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
            color: (event as any).calendarColor ? '' : 'bg-fuchsia-600/90 dark:bg-fuchsia-700/90 border-fuchsia-600',
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
      console.log('🔍 DB Block Google IDs:', Array.from(dbBlockGoogleIds));

      // Also create a "signature" set for fallback matching (Start Time + Title)
      const dbBlockSignatures = new Set(blocksData.map(b => `${b.start}-${b.title}`));
      console.log('🔍 DB Block Signatures:', Array.from(dbBlockSignatures));
      console.log('🔍 Google Blocks to filter:', googleBlocks.map(g => ({ title: g.title, start: g.start, id: g.googleEventId })));

      const uniqueGoogleBlocks = googleBlocks.filter(g => {
        // 1. Exact ID Match
        if (g.googleEventId && dbBlockGoogleIds.has(g.googleEventId)) {

          return false;
        }

        // 2. Signature Match
        const signature = `${g.start}-${g.title}`;
        if (dbBlockSignatures.has(signature)) {

          return false;
        }


        return true;
      });


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
        // User-created blocks (with taskId/habitId) can always be edited
        if (block.taskId || block.habitId) return true;
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
                  resizedBlock.calendarId,
                  resizedBlock.color || resizedBlock.calendarColor || undefined
                );

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
                  movedBlock.calendarId,
                  movedBlock.color || movedBlock.calendarColor || undefined
                );

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

          // Update linked task's time in To-Do list
          if (movedBlock.taskId) {
            const newTimeString = formatTime(movedBlock.start);
            setActiveTasks(prev => prev.map(t => String(t.id) === String(movedBlock.taskId) ? { ...t, time: newTimeString } : t));
            setLaterTasks(prev => prev.map(t => String(t.id) === String(movedBlock.taskId) ? { ...t, time: newTimeString } : t));
            await updateTask(String(movedBlock.taskId), { time: newTimeString });

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
      // Create task in database with date assignment
      const savedTask = await createTaskForDate(newTaskInput.trim(), selectedDate, 'active');

      if (savedTask) {
        const newTask: Task = {
          id: savedTask.id,
          title: savedTask.title,
          tag: savedTask.tag,
          tagColor: savedTask.tagColor,
          time: savedTask.time,
          completed: savedTask.completed,
          completedAt: savedTask.completedAt,
          assignedDate: savedTask.assignedDate
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

    // Check if this is a truly external calendar event (read-only)
    // Events with taskId/habitId are USER-CREATED and can always be deleted
    const isUserCreated = block?.taskId || block?.habitId;
    const isReadOnlyEvent = block?.isGoogle && block?.canEdit !== true && !isUserCreated;

    if (isReadOnlyEvent) {
      // Read-only calendar events can't be deleted - just hide from view
      setNotification({ type: 'info', message: `Calendar events from "${block?.calendarName}" can only be hidden (read-only access)` });
      setSchedule(prev => prev.filter(b => String(b.id) !== String(blockId)));
      return;
    }

    // Delete from Google Calendar (if we created it or have write access)
    // We should delete if: 1) It's NOT a read-only external calendar, OR 2) We created it (has taskId/habitId)
    const shouldDeleteFromGoogle = block?.googleEventId && googleAccount && (!block?.isGoogle || block?.canEdit || block?.taskId || block?.habitId);

    if (shouldDeleteFromGoogle) {
      try {

        await deleteGoogleCalendarEvent(block.googleEventId);

      } catch (error) {
        console.error('❌ Failed to delete from Google Calendar:', error);
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

  const handleTaskDragStart = (e: React.DragEvent, task: Task, sourceList: string) => {
    setDraggedItem({ task, sourceList });
    e.dataTransfer.setData('application/json', JSON.stringify({ task, sourceList }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleListDragOver = (e: React.DragEvent, listId: string) => {
    e.preventDefault();
    if (dragOverList !== listId) setDragOverList(listId);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleListDrop = async (e: React.DragEvent, targetListId: string) => {
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
    await moveTask(String(task.id), targetListId as 'active' | 'later');

    setDraggedItem(null);
  };

  const handleHourDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleHourDrop = async (e: React.DragEvent, hour: number) => {
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

      // Check if habit is already completed today
      const h = habits.find(hab => String(hab.id) === String(habitId));
      const todayISO = formatDateISO(selectedDate);
      const isAlreadyCompleted = h ? h.completedDates.includes(todayISO) : false;

      const blockData = {
        title: habitName,
        tag: habitTag,
        start: hour,
        duration: 1,
        color: habitTagColor || '#6F00FF',
        textColor: 'text-white',
        isGoogle: false,
        completed: isAlreadyCompleted,
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


      if (googleAccount) {
        try {

          googleEventId = await createGoogleCalendarEvent(habitName, hour, 1, selectedDate, habitTag || undefined, habitTagColor || undefined);


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

    // If block exists, we might need to move it OR just warn
    if (existingBlock) {
      // If it's already on the timeline, let's move it to the new time
      // This handles the "drag from list again" scenario which users often do to move tasks
      const newStart = hour;

      // Update local state
      setSchedule(prev => prev.map(b => b.id === existingBlock.id ? { ...b, start: newStart } : b));

      // Update DB
      if (!existingBlock.isGoogle) {
        await updateScheduleBlock(String(existingBlock.id), { start: newStart });
      }

      // Handle Google Sync
      if (googleAccount) {
        // If it already has a Google ID, update the time
        if (existingBlock.googleEventId) {
          // Logic to update existing event time...
          // We can reuse the updateGoogleCalendarEvent logic here if we extract it or call it
          try {
            await updateGoogleCalendarEvent(
              existingBlock.googleEventId,
              existingBlock.title,
              newStart,
              existingBlock.duration,
              selectedDate,
              undefined, // calendarId
              existingBlock.color || existingBlock.calendarColor || undefined
            );
            setNotification({ type: 'success', message: `Updated "${task.title}" time on Google Calendar` });
          } catch (error) {
            console.error('Failed to update Google event on drop:', error);
          }
        } else {
          // It doesn't have a Google ID yet! Create one now.
          try {
            const eventId = await createGoogleCalendarEvent(
              existingBlock.title,
              newStart,
              existingBlock.duration,
              selectedDate,
              task.tag || undefined,
              task.tagColor || undefined
            );

            // Update state with new ID
            setSchedule(prev => prev.map(b => b.id === existingBlock.id ? { ...b, googleEventId: eventId, isGoogle: true } : b));

            // Save ID to DB immediately

            await updateScheduleBlock(String(existingBlock.id), { googleEventId: eventId, isGoogle: true });

            setNotification({ type: 'success', message: `Synced "${task.title}" to Google Calendar` });
          } catch (error) {
            console.error('Failed to create Google event for existing block:', error);
          }
        }
      } else {
        setNotification({ type: 'success', message: `Moved "${task.title}" to ${formatTime(hour)}` });
      }

      setDraggedItem(null);
      return;
    }

    // CRITICAL: Update the task's assigned_date to the current selectedDate
    // This ensures the task will load correctly after refresh (date-bound logic)
    const dateStr = formatDateISO(selectedDate);

    await updateTask(String(task.id), {
      assignedDate: dateStr
    });

    // Update local state to reflect the date change
    setActiveTasks(prev => prev.map(t =>
      String(t.id) === String(task.id) ? { ...t, assignedDate: dateStr } : t
    ));
    setLaterTasks(prev => prev.map(t =>
      String(t.id) === String(task.id) ? { ...t, assignedDate: dateStr } : t
    ));

    const blockData = {
      title: task.title,
      tag: task.tag || null,
      start: hour,
      duration: 1,
      color: task.tagColor || '#8e24aa',
      textColor: "text-white",
      isGoogle: false,
      completed: task.completed || false,
      taskId: String(task.id) // Explicitly cast to string
    };

    const savedBlock = await createScheduleBlock(blockData, selectedDate);

    if (!savedBlock) {
      console.error('❌ Failed to save block to DB immediately after creation');
      setNotification({ type: 'error', message: 'Failed to save to database! Please try logging out and in again.' });
    }

    const newBlock: ScheduleBlock = savedBlock ? {
      ...savedBlock,
      taskId: String(task.id),
      calendarColor: task.tagColor || undefined,
      completed: task.completed || false
    } : {
      id: Date.now(),
      ...blockData,
      calendarColor: task.tagColor || undefined
    };

    setSchedule(prev => [...prev, newBlock]);

    // AUTO-SYNC: If Google is connected, sync immediately!
    if (googleAccount && savedBlock) {
      try {

        const eventId = await createGoogleCalendarEvent(
          task.title,
          hour,
          1,
          selectedDate,
          task.tag || undefined,
          task.tagColor || undefined
        );

        if (eventId) {


          // Update local state isGoogle=true immediately so UI reflects it (and hides duplicates on refresh)
          const updatedBlock = { ...newBlock, googleEventId: eventId, isGoogle: true };
          setSchedule(prev => prev.map(b => b.id === savedBlock.id ? updatedBlock : b));

          // Update DB isGoogle=true and googleEventId
          await updateScheduleBlock(String(savedBlock.id), { googleEventId: eventId, isGoogle: true });
        }
      } catch (err) {
        console.error('❌ Failed to auto-sync to Google:', err);
      }
    }

    // Update task time and assigned date in both UI and database
    const timeString = formatTime(hour);
    const dateString = formatDateISO(selectedDate);

    // If task is from "Later" list, move it to "Active" list for this date
    if (draggedItem.sourceList === 'later') {
      // Remove from Later list
      setLaterTasks(prev => prev.filter(t => t.id !== task.id));

      // Add to Active list with updated time and date
      const updatedTask = {
        ...task,
        time: timeString,
        assignedDate: dateString
      };
      setActiveTasks(prev => [...prev, updatedTask]);

      // Update in database: move to active list with new date and time
      await moveTaskToList(String(task.id), 'active', selectedDate);
      await updateTask(String(task.id), { time: timeString });
    } else {
      // Task is already in Active list, just update time and date
      setActiveTasks(prev => prev.map(t =>
        t.id === task.id
          ? { ...t, time: timeString, assignedDate: dateString }
          : t
      ));

      // Update in database
      await updateTask(String(task.id), {
        time: timeString,
        assignedDate: dateString
      });
    }

    setDraggedItem(null);

    // REMOVED: Old Google sync code - now handled by AUTO-SYNC above (line ~2408)
    // This was creating duplicate events!
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      <IconsGradientDef />
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${notification.type === 'success'
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

      {/* DEBUGGER UI */}
      {/* DEBUGGER UI REMOVED */}



      {/* App Header */}
      <header className="relative h-14 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-md shadow-violet-600/20">
              <svg width="32" height="32" viewBox="0 0 512 512" fill="none">
                <rect width="512" height="512" rx="100" fill="#6d3dc1" />
                <path d="M 65.148438 215.859375 L 81.007812 225.375 L 150.804688 136.546875 L 184.117188 176.992188 L 311.011719 0.136719 L 385.5625 84.199219 L 415.699219 66.785156 L 517.222656 177.023438 L 571.117188 155.582031 L 713.113281 288.820312 L 567.582031 187.308594 L 511.699219 214.703125 C 511.699219 214.703125 510.898438 308.683594 510.898438 312.648438 C 510.898438 316.613281 414.082031 179.410156 414.082031 179.410156 L 414.082031 278.542969 L 315.398438 49.339844 L 124.363281 332.972656 L 166.761719 225.765625 L 133.746094 252.339844 L 146.972656 192.921875 L 85.773438 259.898438 L 64.351562 245.617188 L 0.910156 288.839844 Z" fill="white" transform="translate(20, 120) scale(0.65)" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight dark:text-slate-100">Ascend<span className="stroke-gradient text-transparent bg-clip-text bg-gradient-to-r from-[#6F00FF] to-purple-600">.</span></span>
          </button>
        </div>

        {/* Center Navigation Tabs */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center bg-slate-100 dark:bg-white/5 rounded-full p-1 border border-transparent dark:border-slate-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <LayoutDashboard size={18} style={activeTab === 'dashboard' ? { stroke: 'url(#active-tab-gradient-def)' } : undefined} />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('timebox')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'timebox' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <Clock size={18} style={activeTab === 'timebox' ? { stroke: 'url(#active-tab-gradient-def)' } : undefined} />
            <span>Timebox</span>
          </button>
          <button
            onClick={() => setActiveTab('habittracker')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'habittracker' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <Flame size={18} style={activeTab === 'habittracker' ? { stroke: 'url(#active-tab-gradient-def)' } : undefined} />
            <span>Habits</span>
          </button>


        </div>

        <div className="flex items-center gap-3">
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9, rotate: -30 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isDark ? 'dark' : 'light'}
                initial={{ y: -20, opacity: 0, rotate: -90 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: 20, opacity: 0, rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                {isDark ? <Sun size={20} className="stroke-gradient" /> : <Moon size={20} className="stroke-gradient" />}
              </motion.div>
            </AnimatePresence>
          </motion.button>

          <button onClick={() => {
            setSettingsInitialTab('account');
            setIsSettingsOpen(true);
          }} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title="Settings">
            <Settings size={18} className="stroke-gradient" />
          </button>
        </div>
      </header >

      {/* Delete Habit Modal */}
      <DeleteHabitModal
        isOpen={!!habitToDelete}
        onClose={() => setHabitToDelete(null)}
        onDeleteForever={confirmDeleteForever}
        onArchive={confirmArchive}
        habitName={habitToDelete?.name || ''}
      />

      {/* Settings Modal */}
      {
        isSettingsOpen && (
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
        )
      }

      {/* Tag Modal */}
      <TagModal
        isOpen={isTagModalOpen}
        onClose={() => { setIsTagModalOpen(false); setTagModalTaskId(null); setTagModalHabitId(null); setEditingTag(null); }}
        onSave={handleCreateTag}
        editTag={editingTag}
        onDelete={handleDeleteTag}
      />

      {/* Main Content Area */}
      {
        activeTab === 'dashboard' && (
          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 animate-fade-in-up">
            <div className="max-w-7xl mx-auto p-6 space-y-6">






              {/* Row 1: Tasks & Weight */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Today's Tasks */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-xl">
                        <ListTodo className="text-purple-600 dark:text-violet-400" size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Todays Tasks</h2>
                        <p className="text-slate-500 dark:text-slate-300 text-sm hidden sm:block">
                          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                      {activeTasks.filter(t => t.completed).length}/{activeTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar mb-6 flex-1">
                    <AnimatePresence mode="popLayout">
                      {activeTasks.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="text-center py-10"
                        >
                          <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Check size={20} className="text-slate-300 dark:text-slate-600" />
                          </div>
                          <p className="text-slate-400 dark:text-slate-500 text-sm">All cleared! Time to relax.</p>
                        </motion.div>
                      ) : (
                        activeTasks.map(task => (
                          <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                            onClick={() => handleToggleComplete(task.id)}
                            className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer"
                          >
                            {/* Custom Checkbox */}
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0 ${task.completed
                              ? 'bg-[#6F00FF] border-[#6F00FF] shadow-lg shadow-violet-500/20 scale-110'
                              : 'border-slate-300 dark:border-slate-700 group-hover:border-[#6F00FF] dark:group-hover:border-violet-400'
                              }`}>
                              {task.completed && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={12} className="text-white" strokeWidth={3} /></motion.div>}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate transition-all ${task.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'
                                }`}>
                                {task.title}
                              </p>
                              {(task.tag || task.time) && (
                                <div className="flex items-center gap-2 mt-0.5">
                                  {task.time && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1"><Clock size={10} /> {task.time}</span>}
                                  {task.tag && <span className="text-[10px] px-1.5 rounded-full font-bold text-white relative h-4 flex items-center" style={{ backgroundColor: task.tagColor || '#6F00FF' }}>{task.tag}</span>}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>

                </div>

                {/* Weight Tracker */}
                <div className="lg:col-span-2">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-slate-800 h-full hover:shadow-md transition-shadow overflow-hidden">
                    {/* Header */}
                    <div className="p-6 pb-2">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
                            <Activity className="text-purple-600 dark:text-violet-400" size={20} />
                          </div>
                          <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Weight Tracker</h2>
                            <p className="text-slate-500 dark:text-slate-300 text-sm">Track your progress</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {weightEntries.length > 0 && (
                            <div className="flex items-center gap-3">
                              <div className="text-right flex flex-col justify-center">

                                <div className="text-2xl font-bold text-slate-800 dark:text-white leading-none">{weightEntries[weightEntries.length - 1]?.weight} <span className="text-lg text-slate-400 dark:text-slate-500">kg</span></div>
                              </div>
                              {weightEntries.length > 1 && (
                                <div className="h-full flex items-center">
                                  {(() => {
                                    const latest = weightEntries[weightEntries.length - 1];
                                    const prev = weightEntries[weightEntries.length - 2];
                                    const diff = latest.weight - prev.weight;
                                    return (
                                      <div className="px-2.5 py-1.5 rounded-lg font-bold text-sm bg-[#6F00FF]/10 text-purple-600 dark:bg-[#6F00FF]/20 dark:stroke-gradient flex items-center gap-0.5">
                                        {diff < 0 ? '↓' : '↑'} {Math.abs(diff).toFixed(1)} kg
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => setIsWeightListOpen(!isWeightListOpen)}
                            className={`p-2.5 rounded-xl transition-colors ${isWeightListOpen
                              ? 'bg-[#6F00FF] text-white shadow-lg shadow-purple-500/20'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:stroke-gradient hover:bg-purple-50 dark:hover:bg-purple-900/20'
                              }`}
                            title={isWeightListOpen ? "Show Chart" : "Edit List"}
                          >
                            <List size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="h-[220px] relative">
                        {isWeightListOpen ? (
                          <div className="absolute inset-0 bg-white dark:bg-slate-900 z-10 overflow-y-auto pr-1 custom-scrollbar">
                            {(() => {
                              const sortedEntries = [...weightEntries].sort((a, b) => b.date.localeCompare(a.date));
                              return (
                                <div className="space-y-1 p-1">
                                  {sortedEntries.map((entry) => {
                                    const originalIndex = weightEntries.findIndex(e => e.date === entry.date && e.weight === entry.weight);
                                    return (
                                      <div key={entry.date} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-500/30 transition-colors group">
                                        <div className="flex items-center gap-3">
                                          <div className="bg-slate-200 dark:bg-slate-700/50 p-2 rounded-lg text-slate-500 dark:text-slate-300">
                                            <Calendar size={14} className="stroke-gradient" />
                                          </div>
                                          <div>
                                            <div className="font-medium text-slate-700 dark:text-slate-200 text-sm">
                                              {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="font-bold text-slate-800 dark:text-white">{entry.weight} kg</span>
                                          <button
                                            onClick={() => handleDeleteWeightEntry(originalIndex)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete entry"
                                          >
                                            <Trash2 size={16} className="stroke-gradient" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {sortedEntries.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 pt-10">
                                      <p>No entries yet</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <WeightTrendChart entries={weightEntries} height={220} />
                        )}
                      </div>
                    </div>

                    {/* Footer Input */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                      {/* Custom Calendar Button */}
                      <div ref={weightCalendarRef} className="relative">
                        <button
                          onClick={() => setIsWeightCalendarOpen(!isWeightCalendarOpen)}
                          className="px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none w-40 dark:text-slate-200 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                        >
                          <span>{new Date(weightDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <Calendar size={16} className="stroke-gradient" />
                        </button>

                        {/* Calendar Popup */}
                        {isWeightCalendarOpen && (
                          <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-4 z-50 min-w-[280px]">
                            <div className="flex items-center justify-between mb-4">
                              <button
                                onClick={() => {
                                  const newDate = new Date(weightCalendarViewDate);
                                  newDate.setMonth(newDate.getMonth() - 1);
                                  setWeightCalendarViewDate(newDate);
                                }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                              >
                                <ChevronLeft size={18} className="stroke-gradient" />
                              </button>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {weightCalendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </span>
                              <button
                                onClick={() => {
                                  const newDate = new Date(weightCalendarViewDate);
                                  newDate.setMonth(newDate.getMonth() + 1);
                                  setWeightCalendarViewDate(newDate);
                                }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                              >
                                <ChevronRight size={18} className="stroke-gradient" />
                              </button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-2">
                              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                <div key={day} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">{day}</div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {Array.from({ length: getFirstDayOfMonth(weightCalendarViewDate.getFullYear(), weightCalendarViewDate.getMonth()) }).map((_, i) => (
                                <div key={`empty-${i}`} className="w-8 h-8" />
                              ))}
                              {Array.from({ length: getDaysInMonth(weightCalendarViewDate.getFullYear(), weightCalendarViewDate.getMonth()) }).map((_, i) => {
                                const day = i + 1;
                                const date = new Date(weightCalendarViewDate.getFullYear(), weightCalendarViewDate.getMonth(), day);
                                const dateStr = formatDateISO(date);
                                const isSelected = dateStr === weightDate;
                                const isTodayDate = isToday(date);
                                return (
                                  <button
                                    key={day}
                                    onClick={() => {
                                      setWeightDate(dateStr);
                                      setIsWeightCalendarOpen(false);
                                    }}
                                    className={`w-8 h-8 rounded-full text-sm font-semibold transition-all flex items-center justify-center ${isSelected
                                      ? 'bg-gradient-to-r from-[#6F00FF] to-purple-600 text-white shadow-lg shadow-purple-500/30'
                                      : isTodayDate
                                        ? 'bg-purple-50 dark:bg-purple-500/10 stroke-gradient dark:text-purple-400 border border-purple-200 dark:border-purple-500/30'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                      }`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              onClick={() => {
                                const today = formatDateISO(new Date());
                                setWeightDate(today);
                                setWeightCalendarViewDate(new Date());
                                setIsWeightCalendarOpen(false);
                              }}
                              className="mt-3 w-full py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                            >
                              Today
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="number"
                          step="0.1"
                          value={newWeight}
                          onChange={(e) => setNewWeight(e.target.value)}
                          placeholder="Weight (kg)"
                          className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none dark:text-slate-200"
                        />
                        <motion.button
                          onClick={handleAddWeight}
                          className="px-6 py-2.5 bg-gradient-to-r from-[#6F00FF] to-purple-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30"
                          whileHover={{ scale: 1.05, y: -1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Log
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Habit Progress & Interactive Habits */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Today's Habits Interactive List */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-slate-800 lg:col-span-2 flex flex-col hover:shadow-md transition-shadow">
                  {/* Decorative background element */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors"></div>

                  <div className="relative z-10 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
                          <Flame className="text-purple-600 dark:text-violet-400" size={20} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Today's Habits</h2>
                          <p className="text-slate-500 dark:text-slate-300 text-sm">{getTodaysHabits().filter(h => isHabitCompletedOnDate(h, getTodayString())).length} / {getTodaysHabits().length} completed</p>
                        </div>
                      </div>
                    </div>

                    {getTodaysHabits().length > 0 ? (
                      <div className="flex gap-4 overflow-x-auto pb-2 pt-2 px-2 scrollbar-hide">
                        <AnimatePresence>
                          {getTodaysHabits().map(habit => {
                            const isCompleted = isHabitCompletedOnDate(habit, getTodayString());
                            return (
                              <motion.button
                                key={habit.id}
                                layout
                                onClick={() => toggleHabitCompletion(habit.id, new Date())}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                className={`flex-shrink-0 w-32 p-4 rounded-[20px] border transition-all text-left relative overflow-hidden group shadow-sm ${isCompleted
                                  ? 'bg-[#6F00FF]/5 dark:bg-[#6F00FF]/10 border-[#6F00FF]/20 dark:border-[#6F00FF]/30'
                                  : 'bg-white dark:bg-white/5 border-slate-100 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
                                  }`}
                              >
                                {/* Glow effect on hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-[#6F00FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex justify-between items-start mb-2 relative z-10">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 ${isCompleted
                                    ? 'bg-[#6F00FF] text-white shadow-lg shadow-[#6F00FF]/40 rotate-0'
                                    : 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-500 group-hover:bg-purple-50 dark:group-hover:bg-purple-500/20 group-hover:text-purple-600'
                                    }`}>
                                    <Check size={16} strokeWidth={3} className={isCompleted ? 'text-white' : 'stroke-gradient'} />
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-300 flex items-center gap-1 bg-slate-100/50 dark:bg-black/30 px-1.5 py-0.5 rounded-lg backdrop-blur-sm">
                                    <Flame size={11} className={isCompleted ? 'text-orange-500 animate-pulse' : 'text-slate-400'} fill={isCompleted ? 'currentColor' : 'none'} />
                                    {habit.currentStreak}
                                  </div>
                                </div>
                                <h3 className={`font-bold text-sm leading-tight transition-colors relative z-10 ${isCompleted ? 'stroke-gradient dark:text-purple-300' : 'text-slate-700 dark:text-slate-200 group-hover:text-purple-600'}`}>
                                  {habit.name}
                                </h3>

                                <div className="mt-1 relative z-10 flex items-center gap-1">
                                  <span className={`text-[9px] uppercase tracking-wider font-semibold ${isCompleted ? 'stroke-gradient/70 dark:text-purple-400/70' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {isCompleted ? 'Done' : 'Pending'}
                                  </span>
                                </div>

                                {/* Progress bar effect for completed */}
                                {isCompleted && (
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '100%' }}
                                    className="absolute bottom-0 left-0 h-1.5 bg-[#6F00FF]/50"
                                  />
                                )}
                              </motion.button>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 py-6">
                        No habits scheduled for today
                      </div>
                    )}
                  </div>
                </div>

                {/* Weekly Progress Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm dark:shadow-xl dark:shadow-black/20 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all group overflow-hidden relative">
                  {/* Decorative background element */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors"></div>

                  <div className="relative z-10 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
                        <TrendingUp className="text-purple-600 dark:text-violet-400" size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Weekly Progress</h2>
                        <p className="text-slate-500 dark:text-slate-300 text-sm">Consistency across habits</p>
                      </div>
                    </div>

                    {(() => {
                      const globalStats = habits.reduce((acc, h) => {
                        const weekData = getWeeklyData(h);
                        acc.scheduled += weekData.filter(d => d.isScheduled).length;
                        acc.completed += weekData.filter(d => d.isScheduled && d.isCompleted).length;
                        return acc;
                      }, { scheduled: 0, completed: 0 });
                      const globalProgress = globalStats.scheduled > 0 ? (globalStats.completed / globalStats.scheduled) * 100 : 0;

                      return (
                        <div className="flex-1 flex items-center gap-4">
                          <div className="flex-1 space-y-4">
                            <div>
                              <div className="flex items-end gap-1 mb-1">
                                <span className="text-3xl font-black text-slate-800 dark:text-white leading-none">{Math.round(globalProgress)}%</span>
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pb-0.5">Goal Reach</span>
                              </div>
                              {/* Progress bar */}
                              <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#6F00FF] to-fuchsia-500 rounded-full transition-all duration-1000"
                                  style={{ width: `${globalProgress}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <span className="text-[10px] font-bold stroke-gradient dark:stroke-gradient uppercase">{globalStats.completed}/{globalStats.scheduled} Done</span>
                              </div>
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 italic">this week</span>
                            </div>
                          </div>


                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div >

              {/* Consistency/Streak View */}
              < div className="pt-0" >
                <ConsistencyCard habits={habits} onDayClick={handleDayClick} />
              </div >
            </div >
          </div >
        )
      } {
        activeTab === 'habittracker' && (<>
          <div className="flex-1 overflow-hidden bg-gradient-to-br from-slate-50 via-purple-50/20 to-slate-50 dark:from-[#0B1121] dark:via-purple-950/10 dark:to-[#0B1121] animate-fade-in-up">
            <div className="h-full overflow-y-auto">
              <div className="max-w-5xl mx-auto p-8 space-y-8">

                {/* Header with FAB */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                        <Flame className="text-purple-600 dark:text-violet-400" size={24} />
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                          Habit Tracker
                        </h1>
                        <p className="text-slate-500 dark:text-slate-300 text-base">Build consistency, one day at a time</p>
                      </div>
                    </div>
                  </div>
                  {/* Floating Action Button */}
                  <motion.button
                    onClick={() => setIsAddHabitOpen(true)}
                    className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#6F00FF] to-purple-600 text-white rounded-2xl font-bold hover:shadow-2xl hover:shadow-purple-500/40 transition-all"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus size={20} strokeWidth={2.5} /> New Habit
                  </motion.button>
                </div>





                {/* Today's Habits */}
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">

                      Habits
                      <span className="text-sm font-normal text-slate-400">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                    </h2>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setHabitWeekOffset(p => p - 1)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-purple-600 transition-colors"
                      >
                        <ChevronLeft size={18} className="stroke-gradient" />
                      </button>
                      <div className="text-sm px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg font-bold min-w-[80px] text-center">
                        Week {(() => {
                          const d = new Date();
                          d.setDate(d.getDate() + habitWeekOffset * 7);
                          return getWeekNumber(d);
                        })()}
                      </div>
                      <button
                        onClick={() => setHabitWeekOffset(p => p + 1)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-purple-600 transition-colors"
                      >
                        <ChevronRight size={18} className="stroke-gradient" />
                      </button>
                      {habitWeekOffset !== 0 && (
                        <button
                          onClick={() => setHabitWeekOffset(0)}
                          className="text-[10px] ml-2 font-bold text-purple-500 hover:text-purple-600 uppercase tracking-tighter"
                        >
                          Today
                        </button>
                      )}
                    </div>
                  </div>

                  {getTodaysHabits().length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-900/30 rounded-2xl p-6 text-center border-2 border-dashed border-slate-300 dark:border-slate-700"
                    >
                      <Activity size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                      <p className="text-slate-600 dark:text-slate-300 text-base font-medium">No habits scheduled for today</p>
                      <p className="text-slate-400 text-sm mt-1">Create a new habit to get started!</p>
                    </motion.div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      <div className="space-y-4">
                        {getTodaysHabits().map((habit, index) => {
                          const isCompleted = isHabitCompletedOnDate(habit, getTodayString());
                          const weekData = getWeeklyData(habit);

                          return (
                            <motion.div
                              key={habit.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                              transition={{ delay: index * 0.05 }}
                              layout
                              className={`group relative bg-white dark:bg-slate-800/40 backdrop-blur-sm rounded-2xl p-6 border transition-all hover:shadow-xl hover:scale-[1.02] ${isCompleted
                                ? 'border-purple-300/50 dark:border-purple-500/30 bg-gradient-to-br from-purple-50/80 to-white dark:from-purple-900/20 dark:to-slate-800/40'
                                : 'border-slate-200 dark:border-slate-700/50 hover:border-purple-300 dark:hover:border-purple-500/30'
                                }`}
                            >
                              <div className="flex items-center gap-5">
                                {/* Custom Checkbox with Spring Animation */}
                                <motion.button
                                  onClick={() => toggleHabitCompletion(habit.id)}
                                  className={`relative w-16 h-16 rounded-2xl flex items-center justify-center transition-all shrink-0 ${isCompleted
                                    ? 'bg-gradient-to-br from-[#6F00FF] to-purple-600 shadow-lg shadow-purple-500/40'
                                    : 'bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 hover:shadow-lg'
                                    }`}
                                  style={!isCompleted && habit.tagColor ? {
                                    background: `linear-gradient(135deg, ${habit.tagColor}, ${habit.tagColor}dd)`
                                  } : undefined}
                                  whileTap={{ scale: 0.85 }}
                                  whileHover={{ scale: 1.05 }}
                                >
                                  <motion.div
                                    initial={false}
                                    animate={{
                                      scale: isCompleted ? 1 : 0.8,
                                      rotate: isCompleted ? 0 : -10
                                    }}
                                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                  >
                                    {isCompleted ? (
                                      <Check size={32} strokeWidth={3} className="text-white" />
                                    ) : (
                                      <Target size={28} className="stroke-gradient opacity-60" />
                                    )}
                                  </motion.div>
                                </motion.button>

                                {/* Habit Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className={`text-lg font-bold text-slate-800 dark:text-slate-100 ${isCompleted ? 'line-through opacity-50' : ''}`}>
                                      {habit.name}
                                    </h3>
                                    {habit.scheduledStartTime && (
                                      <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                                        <Clock size={12} className="stroke-gradient" />
                                        {habit.scheduledStartTime}{habit.scheduledEndTime ? ` - ${habit.scheduledEndTime}` : ''}
                                      </span>
                                    )}
                                    {habit.tag && (
                                      <span
                                        onClick={(e) => { e.stopPropagation(); handleOpenEditTagModal({ name: habit.tag!, color: habit.tagColor! || '#6F00FF' }, { habitId: habit.id }); }}
                                        className="text-xs px-3 py-1 rounded-full text-white font-semibold shadow-sm cursor-pointer hover:ring-2 hover:ring-white/50 transition-all"
                                        style={{ backgroundColor: habit.tagColor || '#6F00FF' }}
                                        title="Klicka för att redigera tagg"
                                      >
                                        {habit.tag}
                                      </span>
                                    )}
                                  </div>

                                  {/* Weekly History Dots - Modern Design */}
                                  <div className="flex items-center gap-2">
                                    {weekData.map((day, idx) => (
                                      <motion.button
                                        key={idx}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: index * 0.05 + idx * 0.03 }}
                                        onClick={() => toggleHabitCompletion(habit.id, day.date)}
                                        className={`relative w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110 active:scale-90 ${day.isToday
                                          ? 'ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-slate-800 shadow-lg'
                                          : ''
                                          } ${!day.isScheduled
                                            ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-300 dark:text-slate-600'
                                            : day.isCompleted
                                              ? 'bg-gradient-to-br from-[#6F00FF] to-purple-600 text-white shadow-md'
                                              : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 hover:bg-slate-300'
                                          }`}
                                      >
                                        {day.dayName.charAt(0)}
                                      </motion.button>
                                    ))}
                                  </div>
                                </div>

                                {/* Streak Flame */}
                                <div className="hidden lg:flex items-center px-3">
                                  {(() => {
                                    // Use the new calculateWeeklyProgress function that respects start dates
                                    const weekDates = weekData.map(d => d.date);
                                    const weeklyProgress = calculateWeeklyProgress(habit, weekDates);
                                    return (
                                      <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-center">
                                          <div className="text-2xl font-bold text-slate-700 dark:text-slate-200 leading-none">
                                            {Math.round(weeklyProgress)}%
                                          </div>
                                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mt-1">
                                            Weekly
                                          </span>
                                        </div>
                                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                                        <StreakFlame
                                          progressPercentage={weeklyProgress}
                                          streakCount={habit.currentStreak}
                                          size={44}
                                        />
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                  <motion.button
                                    onClick={() => setEditingHabit(habit)}
                                    className="p-2.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-all"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Edit3 size={18} className="stroke-gradient" />
                                  </motion.button>
                                  <motion.button
                                    onClick={() => deleteHabit(habit.id)}
                                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Trash2 size={18} className="stroke-gradient" />
                                  </motion.button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </AnimatePresence>
                  )}
                </div>

                {/* Empty State */}
                {habits.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-100 dark:from-slate-800/50 dark:via-purple-900/10 dark:to-slate-900/50 rounded-3xl p-16 text-center backdrop-blur-sm border border-slate-200 dark:border-slate-700"
                  >
                    <motion.div
                      className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#6F00FF] to-purple-600 flex items-center justify-center shadow-2xl shadow-purple-500/40"
                      animate={{
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Flame size={48} className="text-white" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">Start Building Better Habits</h3>
                    <p className="text-slate-500 dark:text-slate-300 max-w-md mx-auto mb-8 text-base">
                      Create your first habit and start tracking your progress. Build consistency and achieve your goals!
                    </p>
                    <motion.button
                      onClick={() => setIsAddHabitOpen(true)}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#6F00FF] to-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Plus size={20} strokeWidth={2.5} /> Create First Habit
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Add/Edit Habit Modal */}
          <AnimatePresence>
            {(isAddHabitOpen || editingHabit) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
                onClick={() => { setIsAddHabitOpen(false); setEditingHabit(null); }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {editingHabit ? 'Edit Habit' : 'Create New Habit'}
                      </h2>
                      <motion.button
                        onClick={() => { setIsAddHabitOpen(false); setEditingHabit(null); }}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X size={20} />
                      </motion.button>
                    </div>
                    <HabitForm
                      initialHabit={editingHabit}
                      userTags={userTags}
                      onSave={(data) => { if (editingHabit) updateHabit(editingHabit.id, data); else addHabit(data); }}
                      onCancel={() => { setIsAddHabitOpen(false); setEditingHabit(null); }}
                      onCreateTag={() => { setTagModalTaskId(null); setIsTagModalOpen(true); }}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
        )
      }

      {
        activeTab === 'timebox' && (
          <div className="flex-1 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-white/5 animate-fade-in-up pb-24 md:pb-0">

            {/* Left Column: Habits & To-Do List */}
            <div className="md:col-span-3 flex flex-col bg-white dark:bg-slate-900 overflow-visible md:overflow-y-auto min-h-screen md:min-h-0">
              <div className="p-4 space-y-6">

                {/* Habits Section */}
                {getUnscheduledTodaysHabits().length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-slate-800 dark:text-slate-100">
                      <Flame size={20} className="text-purple-600 dark:text-violet-400" />
                      <h2 className="font-bold text-lg">Habits</h2>
                      <span className="text-xs text-slate-400 ml-auto">
                        {getUnscheduledTodaysHabits().filter(h => isHabitCompletedOnDate(h, formatDateISO(selectedDate))).length}/{getUnscheduledTodaysHabits().length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {getUnscheduledTodaysHabits().map(habit => {
                        const dateStr = formatDateISO(selectedDate);
                        const isCompleted = isHabitCompletedOnDate(habit, dateStr);
                        return (
                          <div
                            key={`habit-${habit.id}`}
                            style={{ zIndex: habitTagMenuOpen === habit.id ? 50 : 1 }}
                            className={`relative flex items-center gap-3 p-2.5 bg-white dark:bg-slate-800 rounded-lg border transition-all hover:shadow-sm ${isCompleted ? 'border-[#6F00FF]/20 dark:border-[#6F00FF]/20 opacity-60' : 'border-slate-200 dark:border-slate-700 hover:border-[#6F00FF]/30'}`}
                          >
                            <div
                              draggable
                              onDragStart={(e) => { e.dataTransfer.setData('habitId', habit.id); e.dataTransfer.setData('habitName', habit.name); e.dataTransfer.setData('habitTag', habit.tag || ''); e.dataTransfer.setData('habitTagColor', habit.tagColor || ''); }}
                              className="flex items-center gap-3 flex-1 cursor-grab active:cursor-grabbing"
                            >
                              <button onClick={(e) => { e.stopPropagation(); toggleHabitCompletion(habit.id, selectedDate); }} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${isCompleted ? 'bg-[#6F00FF] border-[#6F00FF]' : 'border-slate-300 dark:border-slate-700 hover:border-[#6F00FF]'}`}>
                                {isCompleted && <Check size={12} className="text-white" strokeWidth={3} />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm font-medium text-slate-700 dark:text-slate-200 ${isCompleted ? 'line-through opacity-60' : ''}`}>{habit.name}</span>
                                {habit.tag && (
                                  <span
                                    onClick={(e) => { e.stopPropagation(); handleOpenEditTagModal({ name: habit.tag!, color: habit.tagColor! || '#6F00FF' }, { habitId: habit.id }); }}
                                    className="ml-2 text-[10px] px-1.5 py-0.5 rounded text-white font-medium cursor-pointer hover:ring-2 hover:ring-white/50 transition-all"
                                    style={{ backgroundColor: habit.tagColor || '#6F00FF' }}
                                    title="Klicka för att redigera tagg"
                                  >
                                    {habit.tag}
                                  </span>
                                )}
                              </div>

                              {/* Time and Streak */}
                              <div className="flex items-center gap-1.5">
                                {(() => {
                                  // Find if this habit has a schedule block today
                                  const habitBlock = schedule.find(b => b.habitId === habit.id);
                                  if (habitBlock) {
                                    return (
                                      <span className="text-[10px] opacity-70 text-slate-600 dark:text-slate-300">
                                        {formatTime(habitBlock.start)}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}

                                {habit.currentStreak > 0 && (
                                  <div
                                    className="flex items-center gap-0.5 text-xs"
                                    style={{
                                      animation: isCompleted ? 'flameGrow 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
                                    }}
                                  >
                                    <div className="relative">
                                      {/* Outline flame (always visible) */}
                                      <Flame
                                        size={14}
                                        className="text-orange-500 transition-all duration-500"
                                        strokeWidth={2}
                                        fill="none"
                                      />
                                      {/* Filled flame (fades in when completed) */}
                                      <Flame
                                        size={14}
                                        className={`absolute inset-0 text-orange-500 transition-opacity duration-500 ${isCompleted ? 'opacity-100' : 'opacity-0'
                                          }`}
                                        fill="currentColor"
                                        stroke="none"
                                      />
                                    </div>
                                    <span
                                      className="font-semibold text-orange-600 dark:text-orange-400 transition-all duration-300"
                                      style={{
                                        animation: isCompleted ? 'numberPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
                                      }}
                                    >
                                      {habit.currentStreak}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
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
                                {!habit.tag && (
                                  <button
                                    onClick={() => { setTagModalHabitId(null); setIsTagModalOpen(true); setHabitTagMenuOpen(null); }}
                                    className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                                  >
                                    <Plus size={14} /> Create Tag
                                  </button>
                                )}

                                {/* Edit Tag (only if habit has a tag) */}
                                {habit.tag && habit.tagColor && (
                                  <button
                                    onClick={() => { handleOpenEditTagModal({ name: habit.tag!, color: habit.tagColor! }); setHabitTagMenuOpen(null); }}
                                    className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                                  >
                                    <Edit3 size={14} /> Edit Tag
                                  </button>
                                )}



                                {!habit.tag && (
                                  <>
                                    <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                                    <div className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-300">Add Tag</div>
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
                                  </>
                                )}
                                {habit.tag && (
                                  <>
                                    <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                                    <button
                                      onClick={() => { handleRemoveTagFromHabit(habit.id); setHabitTagMenuOpen(null); }}
                                      className="w-full px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400 font-medium"
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
                    </div>
                  </div>
                )}

                {/* To-do Header & Input */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-slate-800 dark:text-slate-100">
                    <ListTodo size={20} className="text-purple-600 dark:text-violet-400" />
                    <h2 className="font-bold text-lg">To-do</h2>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={newTaskInput}
                      onChange={(e) => setNewTaskInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type task & press Enter"
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/20 focus:border-[#6F00FF] transition-all dark:text-slate-100 placeholder:text-slate-400"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-white dark:bg-white/10 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-400 font-mono shadow-sm">
                      ↵
                    </div>
                  </div>
                </div>

                {/* Active Tasks Drop Zone - Tasks only, no habits */}
                <div
                  className={`space-y-2 min-h-[100px] rounded-lg transition-colors ${dragOverList === 'active' ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-400 ring-inset' : ''}`}
                  onDragOver={(e) => handleListDragOver(e, 'active')}
                  onDrop={(e) => handleListDrop(e, 'active')}
                  onDragLeave={() => setDragOverList(null)}
                >
                  {activeTasks.length === 0 && (
                    <div className="bg-slate-50/50 dark:bg-slate-800/10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center">
                      <div className="inline-block mb-3">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-slate-300 dark:text-slate-600">
                          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 mb-1">Type task & press Enter</p>
                      <p className="text-xs text-slate-400 dark:text-slate-600">Use the input field above to add your first task</p>
                    </div>
                  )}

                  {activeTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      listType="active"
                      userTags={userTags}
                      onDragStart={handleTaskDragStart}
                      onDelete={(id) => handleDeleteTask(id, 'active')}
                      onToggleComplete={handleToggleComplete}
                      onMoveToList={handleMoveTaskToList}
                      onAddTag={handleAddTagToTask}
                      onRemoveTag={handleRemoveTagFromTask}
                      onOpenTagModal={handleOpenTagModal}
                      onEditTag={tag => handleOpenEditTagModal(tag, { taskId: task.id })}
                      onDeleteTag={handleDeleteTagByName}
                    />
                  ))}
                </div>

                {/* To-Do Later Section */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50">
                  <button
                    onClick={() => setIsLaterOpen(!isLaterOpen)}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold mb-3 hover:stroke-gradient transition-colors w-full"
                  >
                    <Calendar size={18} className="text-purple-600 dark:text-violet-400" />
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
                      {laterTasks.length === 0 && (
                        <div className="bg-slate-50/50 dark:bg-slate-800/10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center">
                          <div className="inline-block mb-3">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-slate-300 dark:text-slate-600">
                              <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M12 3V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M3 17V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 mb-1">Drag tasks here</p>
                          <p className="text-xs text-slate-400 dark:text-slate-600">Move to-dos that need to be done later</p>
                        </div>
                      )}
                      {laterTasks.map(task => (
                        <div key={task.id} className="pl-4">
                          <TaskItem
                            task={task}
                            listType="later"
                            userTags={userTags}
                            onDragStart={handleTaskDragStart}
                            onDelete={(id) => handleDeleteTask(id, 'later')}
                            onToggleComplete={handleToggleComplete}
                            onMoveToList={handleMoveTaskToList}
                            onAddTag={handleAddTagToTask}
                            onRemoveTag={handleRemoveTagFromTask}
                            onOpenTagModal={handleOpenTagModal}
                            onEditTag={tag => handleOpenEditTagModal(tag, { taskId: task.id })}
                            onDeleteTag={handleDeleteTagByName}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Middle Column: Calendar/Timeline */}
            <div className="md:col-span-6 bg-white dark:bg-slate-950 flex flex-col relative overflow-visible md:overflow-hidden h-[1500px] md:h-auto">
              {/* Date Selector Header - Floating Style */}
              <div className="h-14 flex items-center justify-center shrink-0 relative z-10">
                <div ref={calendarRef} className="relative flex items-center">
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-slate-900 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 shadow-md shadow-slate-200/50 dark:shadow-black/40 border border-slate-100 dark:border-slate-800">
                    <div
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      className="flex items-center gap-2 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full ${isToday(selectedDate) ? 'bg-gradient-to-r from-[#6F00FF] to-purple-600' : 'bg-slate-400'}`}></div>
                      {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </div>
                    {/* Calendar Integration Button */}
                    <button
                      onClick={() => {
                        setSettingsInitialTab('integrations');
                        setIsSettingsOpen(true);
                      }}
                      className={`p-1 rounded-full transition-all ${googleAccount
                        ? 'text-purple-600 dark:text-violet-400'
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
                      className={`p-1 rounded-full transition-all ${isZoomedOut
                        ? 'stroke-gradient hover:text-[#5800cc]'
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
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (<div key={day} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">{day}</div>))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: getFirstDayOfMonth(calendarViewDate.getFullYear(), calendarViewDate.getMonth()) }).map((_, i) => (<div key={`empty-${i}`} className="w-8 h-8" />))}
                        {Array.from({ length: getDaysInMonth(calendarViewDate.getFullYear(), calendarViewDate.getMonth()) }).map((_, i) => {
                          const day = i + 1;
                          const date = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
                          const isSelected = isSameDay(date, selectedDate);
                          const isTodayDate = isToday(date);
                          return (
                            <button
                              key={day}
                              onClick={() => handleDateSelect(day)}
                              className={`w-8 h-8 rounded-full text-sm font-semibold transition-all flex items-center justify-center ${isSelected
                                ? 'bg-gradient-to-r from-[#6F00FF] to-purple-600 text-white shadow-lg shadow-purple-500/30'
                                : isTodayDate
                                  ? 'bg-purple-50 dark:bg-purple-500/10 stroke-gradient dark:text-purple-400 border border-purple-200 dark:border-purple-500/30'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                      <button onClick={async () => { const today = new Date(); setSelectedDate(today); setCalendarViewDate(today); setIsCalendarOpen(false); await loadScheduleForDate(today); }} className="mt-3 w-full py-2 text-sm font-medium stroke-gradient dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg">Today</button>
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
                    {/* Time label matched with hour labels */}
                    <div className="w-14 shrink-0 text-right pr-3 text-xs font-medium relative h-0">
                      <span className="absolute right-3 top-0 -translate-y-2 stroke-gradient dark:text-violet-400 whitespace-nowrap font-bold" style={{ textShadow: '0 0 8px rgba(139, 92, 246, 0.3)' }}>
                        {formatTime(currentTimeDecimal)}
                      </span>
                    </div>
                    {/* Gradient line container - dot is outside to avoid clipping */}
                    <div className="flex-1 relative flex items-center h-full">
                      {/* Fixed dot at the start */}
                      <div className="absolute -left-1.5 z-20 w-3 h-3 rounded-full bg-gradient-to-r from-[#6F00FF] to-purple-600 shadow-lg shadow-purple-500/40 border-2 border-white dark:border-slate-900"></div>

                      {/* Gradient line with subtle stream animation */}
                      <div className="h-[3px] bg-gradient-to-r from-[#6F00FF] to-purple-600 flex-1 relative shadow-sm overflow-hidden rounded-full">
                        {/* Subtle stream animation */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full"
                          initial={{ x: '-100%' }}
                          animate={{ x: '100%' }}
                          transition={{
                            repeat: Infinity,
                            duration: 4,
                            ease: "linear",
                          }}
                        />
                      </div>
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
                          <div className="absolute top-0 left-2 right-4 border-2 border-dashed border-[#6F00FF] bg-[#6F00FF]/10 rounded-lg z-0 pointer-events-none flex items-center justify-center stroke-gradient font-medium text-sm" style={{ height: `${hourHeight - 4}px` }}>
                            {!isZoomedOut && 'Drop to schedule'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                  }

                  {/* Render Time Blocks */}
                  {
                    schedule.map((block) => {
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
                      // Priority: 1. linked task/habit tagColor, 2. calendarColor, 3. saved color, 4. default
                      let bgColor = DEFAULT_BLUE;

                      if (tagColor) {
                        bgColor = tagColor;
                      } else if (block.calendarColor) {
                        bgColor = block.calendarColor;
                      } else if (block.color) {
                        // Handle both hex colors (#FF5733) and old Tailwind format (bg-[#FF5733])
                        if (block.color.startsWith('#')) {
                          bgColor = block.color;
                        } else {
                          const hexMatch = block.color.match(/#[0-9A-Fa-f]{6}/);
                          if (hexMatch) {
                            bgColor = hexMatch[0];
                          }
                        }
                      }

                      const blockStyle = {
                        top: `${topOffset}px`,
                        height: `${height}px`,
                        backgroundColor: block.completed ? undefined : bgColor,
                        borderColor: block.completed ? undefined : bgColor
                      };

                      // Determine if this is a compact event (less than 1 hour)
                      const isCompact = block.duration < 1;
                      const isVeryCompact = block.duration <= 0.5;

                      return (
                        <div
                          key={block.id}
                          style={blockStyle}
                          className={`absolute left-16 right-4 rounded-lg border shadow-sm cursor-move hover:brightness-95 transition-all z-10 group text-white overflow-hidden ${isVeryCompact ? 'p-1.5 pr-6' : isCompact ? 'p-2 pr-8' : 'p-3 pr-10'} ${block.completed ? 'bg-slate-300/80 dark:bg-slate-700/80 border-slate-400 !text-slate-500' : ''} ${resizingBlockId === block.id || draggingBlockId === block.id ? 'z-20 ring-2 ring-emerald-400 select-none' : ''}`}
                          onMouseDown={(e) => {
                            if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.cursor-ns-resize')) return;
                            e.preventDefault();
                            setDraggingBlockId(block.id);
                            setDragStartY(e.clientY);
                            setDragStartTime(block.start);
                          }}
                        >
                          {/* Top right corner: Tag + Close button grouped together */}
                          <div className={`absolute ${isVeryCompact ? 'top-1 right-1' : isCompact ? 'top-1.5 right-1.5' : 'top-2 right-2'} flex flex-row items-center gap-1.5`}>
                            {/* Category tag - prioritize actual tag over calendar name, skip "Ascend" as it's not a real tag */}
                            {(block.tag || (block.calendarName && block.calendarName !== 'Ascend')) && (
                              <span className={`uppercase font-bold bg-black/10 dark:bg-white/15 px-1.5 py-0.5 rounded pointer-events-none ${isVeryCompact ? 'text-[8px]' : 'text-[10px]'}`}>
                                {block.tag || block.calendarName}
                              </span>
                            )}
                            {/* Close button - always visible on hover */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-300 bg-black/20 hover:bg-black/30 rounded p-0.5 pointer-events-auto"
                            >
                              <X size={isVeryCompact ? 10 : 12} />
                            </button>
                          </div>

                          {/* Content: Title first, then time below */}
                          <div className="flex flex-col min-w-0 overflow-hidden">
                            {/* Title row with checkbox */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              {/* Completion checkbox */}
                              <div
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleToggleBlockComplete(block.id); }}
                                onMouseDown={(e) => e.stopPropagation()}
                                className={`shrink-0 rounded border-2 flex items-center justify-center cursor-pointer transition-colors pointer-events-auto ${isVeryCompact ? 'w-3.5 h-3.5' : isCompact ? 'w-4 h-4' : 'w-5 h-5'} ${block.completed ? 'bg-emerald-500 border-emerald-500' : 'border-white/50 hover:border-emerald-400 bg-white/20'}`}
                              >
                                {block.completed && <Check size={isVeryCompact ? 8 : isCompact ? 10 : 14} className="text-white" strokeWidth={3} />}
                              </div>
                              <h3 className={`font-bold pointer-events-none truncate ${isVeryCompact ? 'text-[11px]' : isCompact ? 'text-xs' : 'text-sm'} ${block.completed ? 'line-through opacity-70' : ''}`}>{block.title}</h3>
                            </div>

                            {/* Time row - below title */}
                            {!isVeryCompact && (
                              <div className={`flex items-center gap-1 ${isCompact ? 'mt-0.5' : 'mt-1'} pointer-events-none`}>
                                {block.isGoogle && <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-3 h-3 opacity-80" alt="GCal" />}
                                <span className={`opacity-70 ${isCompact ? 'text-[10px]' : 'text-xs'}`}>
                                  {formatTime(block.start)} – {formatTime(endTime)}
                                </span>
                              </div>
                            )}
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
                    })
                  }

                </div >
              </div >
            </div >

            {/* Right Column: Notes & Extras */}
            {/* Right Column: Notes & Extras */}
            <div className="md:col-span-3 bg-slate-50/50 dark:bg-slate-900 flex flex-col overflow-visible md:overflow-y-auto min-h-screen md:min-h-0">
              <div className="p-4 space-y-8">

                {/* Inline formatting helper */}
                {(() => {
                  const renderInlineFormatting = (text: string) => {
                    const parts: React.ReactNode[] = [];
                    let remaining = text;
                    let key = 0;

                    while (remaining.length > 0) {
                      // Bold (**text**)
                      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
                      if (boldMatch) {
                        parts.push(<strong key={key++} className="font-semibold">{boldMatch[1]}</strong>);
                        remaining = remaining.substring(boldMatch[0].length);
                        continue;
                      }

                      // Italic (*text*)
                      const italicMatch = remaining.match(/^\*(.+?)\*/);
                      if (italicMatch) {
                        parts.push(<em key={key++} className="italic">{italicMatch[1]}</em>);
                        remaining = remaining.substring(italicMatch[0].length);
                        continue;
                      }

                      // Strikethrough (~~text~~)
                      const strikeMatch = remaining.match(/^~~(.+?)~~/);
                      if (strikeMatch) {
                        parts.push(<span key={key++} className="line-through opacity-70">{strikeMatch[1]}</span>);
                        remaining = remaining.substring(strikeMatch[0].length);
                        continue;
                      }

                      // Regular character
                      parts.push(remaining[0]);
                      remaining = remaining.substring(1);
                    }

                    return <>{parts}</>;
                  };

                  (window as any).renderInlineFormatting = renderInlineFormatting;
                  return null;
                })()}


                {/* Notes Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 dark:text-violet-400"><path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" /><path d="M15 3v6h6" /></svg>
                      </div>
                      <h2 className="font-bold text-lg">Notes</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {notesLoading && <Loader2 size={12} className="animate-spin text-slate-400" />}
                      {notesSaved && <span className="text-xs text-emerald-500 flex items-center gap-1"><Check size={12} /> Saved</span>}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
                    {/* Formatting Toolbar */}
                    <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      {/* Text Formatting */}
                      <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-700 pr-2">
                        <button
                          onClick={() => {
                            const activeInput = document.activeElement as HTMLInputElement;
                            if (!activeInput || activeInput.tagName !== 'INPUT') return;

                            const start = activeInput.selectionStart || 0;
                            const end = activeInput.selectionEnd || 0;
                            const currentValue = activeInput.value;

                            if (start === end) {
                              // No selection, insert template
                              const newValue = currentValue.substring(0, start) + '**bold**' + currentValue.substring(end);
                              const lines = notesContent.split('\n');
                              const lineIndex = Array.from(document.querySelectorAll('input[type="text"]')).indexOf(activeInput);
                              if (lineIndex >= 0) {
                                lines[lineIndex] = newValue;
                                handleNotesChange(lines.join('\n'));
                                setTimeout(() => activeInput.focus(), 10);
                              }
                            } else {
                              // Wrap selection
                              const selectedText = currentValue.substring(start, end);
                              const newValue = currentValue.substring(0, start) + '**' + selectedText + '**' + currentValue.substring(end);
                              const lines = notesContent.split('\n');
                              const lineIndex = Array.from(document.querySelectorAll('input[type="text"]')).indexOf(activeInput);
                              if (lineIndex >= 0) {
                                lines[lineIndex] = newValue;
                                handleNotesChange(lines.join('\n'));
                                setTimeout(() => {
                                  activeInput.focus();
                                  activeInput.setSelectionRange(start, end + 4);
                                }, 10);
                              }
                            }
                          }}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors group"
                          title="Bold"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            const activeInput = document.activeElement as HTMLInputElement;
                            if (!activeInput || activeInput.tagName !== 'INPUT') return;

                            const start = activeInput.selectionStart || 0;
                            const end = activeInput.selectionEnd || 0;
                            const currentValue = activeInput.value;

                            if (start === end) {
                              const newValue = currentValue.substring(0, start) + '*italic*' + currentValue.substring(end);
                              const lines = notesContent.split('\n');
                              const lineIndex = Array.from(document.querySelectorAll('input[type="text"]')).indexOf(activeInput);
                              if (lineIndex >= 0) {
                                lines[lineIndex] = newValue;
                                handleNotesChange(lines.join('\n'));
                                setTimeout(() => activeInput.focus(), 10);
                              }
                            } else {
                              const selectedText = currentValue.substring(start, end);
                              const newValue = currentValue.substring(0, start) + '*' + selectedText + '*' + currentValue.substring(end);
                              const lines = notesContent.split('\n');
                              const lineIndex = Array.from(document.querySelectorAll('input[type="text"]')).indexOf(activeInput);
                              if (lineIndex >= 0) {
                                lines[lineIndex] = newValue;
                                handleNotesChange(lines.join('\n'));
                                setTimeout(() => {
                                  activeInput.focus();
                                  activeInput.setSelectionRange(start, end + 2);
                                }, 10);
                              }
                            }
                          }}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors group"
                          title="Italic"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                            <line x1="19" y1="4" x2="10" y2="4"></line>
                            <line x1="14" y1="20" x2="5" y2="20"></line>
                            <line x1="15" y1="4" x2="9" y2="20"></line>
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            const activeInput = document.activeElement as HTMLInputElement;
                            if (!activeInput || activeInput.tagName !== 'INPUT') return;

                            const start = activeInput.selectionStart || 0;
                            const end = activeInput.selectionEnd || 0;
                            const currentValue = activeInput.value;

                            if (start === end) {
                              const newValue = currentValue.substring(0, start) + '~~strikethrough~~' + currentValue.substring(end);
                              const lines = notesContent.split('\n');
                              const lineIndex = Array.from(document.querySelectorAll('input[type="text"]')).indexOf(activeInput);
                              if (lineIndex >= 0) {
                                lines[lineIndex] = newValue;
                                handleNotesChange(lines.join('\n'));
                                setTimeout(() => activeInput.focus(), 10);
                              }
                            } else {
                              const selectedText = currentValue.substring(start, end);
                              const newValue = currentValue.substring(0, start) + '~~' + selectedText + '~~' + currentValue.substring(end);
                              const lines = notesContent.split('\n');
                              const lineIndex = Array.from(document.querySelectorAll('input[type="text"]')).indexOf(activeInput);
                              if (lineIndex >= 0) {
                                lines[lineIndex] = newValue;
                                handleNotesChange(lines.join('\n'));
                                setTimeout(() => {
                                  activeInput.focus();
                                  activeInput.setSelectionRange(start, end + 4);
                                }, 10);
                              }
                            }
                          }}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors group"
                          title="Strikethrough"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                            <path d="M17.5 5H9a4 4 0 0 0 0 8h6a4 4 0 0 1 0 8H5"></path>
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                          </svg>
                        </button>
                      </div>

                      {/* Headers */}
                      <div className="flex items-center gap-0.5 border-r border-slate-200 dark:border-slate-700 pr-2">
                        <button
                          onClick={() => {
                            const newText = notesContent + (notesContent && !notesContent.endsWith('\n') ? '\n' : '') + '# Heading 1';
                            handleNotesChange(newText);
                          }}
                          className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                          title="Heading 1"
                        >
                          H1
                        </button>
                        <button
                          onClick={() => {
                            const newText = notesContent + (notesContent && !notesContent.endsWith('\n') ? '\n' : '') + '## Heading 2';
                            handleNotesChange(newText);
                          }}
                          className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                          title="Heading 2"
                        >
                          H2
                        </button>
                        <button
                          onClick={() => {
                            const newText = notesContent + (notesContent && !notesContent.endsWith('\n') ? '\n' : '') + '### Heading 3';
                            handleNotesChange(newText);
                          }}
                          className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                          title="Heading 3"
                        >
                          H3
                        </button>
                      </div>

                      {/* Lists */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => {
                            const newText = notesContent + (notesContent && !notesContent.endsWith('\n') ? '\n' : '') + '1. List item';
                            handleNotesChange(newText);
                          }}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors group"
                          title="Numbered List"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                            <line x1="10" y1="6" x2="21" y2="6"></line>
                            <line x1="10" y1="12" x2="21" y2="12"></line>
                            <line x1="10" y1="18" x2="21" y2="18"></line>
                            <path d="M4 6h1v4"></path>
                            <path d="M4 10h2"></path>
                            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            const newText = notesContent + (notesContent && !notesContent.endsWith('\n') ? '\n' : '') + '- List item';
                            handleNotesChange(newText);
                          }}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors group"
                          title="Bullet List"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            // Add a new checkbox line
                            const newText = notesContent + (notesContent && !notesContent.endsWith('\n') ? '\n' : '') + '☐ ';
                            handleNotesChange(newText);
                            // Focus last input
                            setTimeout(() => {
                              const inputs = document.querySelectorAll('.notes-input');
                              const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
                              lastInput?.focus();
                            }, 0);
                          }}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors group"
                          title="Add Checkbox"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Notes Content Area - Hybrid Editor */}
                    <div
                      className="p-3 min-h-[120px] max-h-[500px] overflow-y-auto text-sm"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        // Cmd+A / Ctrl+A - Select all
                        if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                          e.preventDefault();
                          // Select all text in all inputs
                          const inputs = document.querySelectorAll('.notes-container input[type="text"]') as NodeListOf<HTMLInputElement>;
                          inputs.forEach(input => {
                            input.select();
                          });
                          // Store that we want to delete everything
                          (window as any).notesSelectAll = true;
                        }
                        // Backspace or Delete after Cmd+A
                        if ((e.key === 'Backspace' || e.key === 'Delete') && (window as any).notesSelectAll) {
                          e.preventDefault();
                          handleNotesChange('');
                          (window as any).notesSelectAll = false;
                        }
                      }}
                    >
                      <div className="notes-container">
                        {notesContent.split('\n').map((line, lineIndex) => {
                          // Render checkboxes
                          const checkboxMatch = line.match(/^\[([x ])\]\s*(.*)$/);
                          if (checkboxMatch) {
                            const isChecked = checkboxMatch[1] === 'x';
                            const text = checkboxMatch[2];
                            return (
                              <div key={lineIndex} className="flex items-start gap-2 my-1.5 group">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const lines = notesContent.split('\n');
                                    lines[lineIndex] = `[${e.target.checked ? 'x' : ' '}] ${text}`;
                                    handleNotesChange(lines.join('\n'));
                                  }}
                                  className="mt-0.5 w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={text}
                                  onChange={(e) => {
                                    const lines = notesContent.split('\n');
                                    lines[lineIndex] = `[${isChecked ? 'x' : ' '}] ${e.target.value}`;
                                    handleNotesChange(lines.join('\n'));
                                    (window as any).notesSelectAll = false;
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const lines = notesContent.split('\n');
                                      lines.splice(lineIndex + 1, 0, '[ ] ');
                                      handleNotesChange(lines.join('\n'));
                                      setTimeout(() => {
                                        const inputs = document.querySelectorAll('input[type="text"]');
                                        (inputs[lineIndex + 1] as HTMLInputElement)?.focus();
                                      }, 10);
                                    } else if (e.key === 'Backspace' && text === '') {
                                      e.preventDefault();
                                      const lines = notesContent.split('\n');
                                      lines.splice(lineIndex, 1);
                                      handleNotesChange(lines.join('\n'));
                                    }
                                  }}
                                  className={`flex-1 bg-transparent border-none outline-none text-slate-700 dark:text-slate-300 ${isChecked ? 'line-through opacity-60' : ''}`}
                                  placeholder="Add task..."
                                  disabled={notesLoading}
                                />
                              </div>
                            );
                          }

                          // Render headings
                          if (line.startsWith('### ')) {
                            return (
                              <input
                                key={lineIndex}
                                type="text"
                                value={line.substring(4)}
                                onChange={(e) => {
                                  const lines = notesContent.split('\n');
                                  lines[lineIndex] = `### ${e.target.value}`;
                                  handleNotesChange(lines.join('\n'));
                                  (window as any).notesSelectAll = false;
                                }}
                                className="w-full text-lg font-semibold text-slate-800 dark:text-slate-100 my-1 bg-transparent border-none outline-none"
                                placeholder="Heading 3"
                                disabled={notesLoading}
                              />
                            );
                          }
                          if (line.startsWith('## ')) {
                            return (
                              <input
                                key={lineIndex}
                                type="text"
                                value={line.substring(3)}
                                onChange={(e) => {
                                  const lines = notesContent.split('\n');
                                  lines[lineIndex] = `## ${e.target.value}`;
                                  handleNotesChange(lines.join('\n'));
                                  (window as any).notesSelectAll = false;
                                }}
                                className="w-full text-xl font-bold text-slate-800 dark:text-slate-100 my-1.5 bg-transparent border-none outline-none"
                                placeholder="Heading 2"
                                disabled={notesLoading}
                              />
                            );
                          }
                          if (line.startsWith('# ')) {
                            return (
                              <input
                                key={lineIndex}
                                type="text"
                                value={line.substring(2)}
                                onChange={(e) => {
                                  const lines = notesContent.split('\n');
                                  lines[lineIndex] = `# ${e.target.value}`;
                                  handleNotesChange(lines.join('\n'));
                                  (window as any).notesSelectAll = false;
                                }}
                                className="w-full text-2xl font-bold text-slate-900 dark:text-slate-50 my-2 bg-transparent border-none outline-none"
                                placeholder="Heading 1"
                                disabled={notesLoading}
                              />
                            );
                          }

                          // Render lists
                          if (line.match(/^\d+\.\s/) || line.startsWith('- ')) {
                            const isNumbered = line.match(/^\d+\.\s/);
                            const content = isNumbered ? line.replace(/^\d+\.\s/, '') : line.substring(2);
                            return (
                              <div key={lineIndex} className="flex items-start gap-2 my-0.5">
                                <span className="text-slate-500 dark:text-slate-300 mt-0.5">•</span>
                                <input
                                  type="text"
                                  value={content}
                                  onChange={(e) => {
                                    const lines = notesContent.split('\n');
                                    lines[lineIndex] = isNumbered ? `1. ${e.target.value}` : `- ${e.target.value}`;
                                    handleNotesChange(lines.join('\n'));
                                    (window as any).notesSelectAll = false;
                                  }}
                                  className="flex-1 bg-transparent border-none outline-none text-slate-700 dark:text-slate-300"
                                  placeholder="List item"
                                  disabled={notesLoading}
                                />
                              </div>
                            );
                          }

                          // Regular text or empty line
                          return (
                            <input
                              key={lineIndex}
                              type="text"
                              value={line}
                              onChange={(e) => {
                                const lines = notesContent.split('\n');
                                lines[lineIndex] = e.target.value;
                                handleNotesChange(lines.join('\n'));
                                (window as any).notesSelectAll = false;
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const lines = notesContent.split('\n');
                                  lines.splice(lineIndex + 1, 0, '');
                                  handleNotesChange(lines.join('\n'));
                                  setTimeout(() => {
                                    const inputs = document.querySelectorAll('input[type="text"]');
                                    (inputs[lineIndex + 1] as HTMLInputElement)?.focus();
                                  }, 10);
                                }
                              }}
                              className="w-full bg-transparent border-none outline-none text-slate-700 dark:text-slate-300 my-0.5"
                              placeholder={lineIndex === 0 && !notesContent ? `Write your notes for ${selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}...` : ''}
                              disabled={notesLoading}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weight Tracking Section */}
                <div>
                  <WeightSection
                    weightEntries={weightEntries}
                    newWeight={newWeight}
                    setNewWeight={setNewWeight}
                    onAddWeight={() => { setWeightDate(formatDateISO(new Date())); handleAddWeight(); }}
                  />
                </div >


              </div >
            </div >

          </div >
        )
      }

      {/* Mobile Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 pb-safe z-50">
        <div className="flex justify-around items-center h-16">
          <button
            onClick={() => setActiveTab('timebox')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'timebox' ? 'stroke-gradient dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <Clock size={24} strokeWidth={activeTab === 'timebox' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Timebox</span>
          </button>

          <button
            onClick={() => setActiveTab('habittracker')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'habittracker' ? 'stroke-gradient dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <Flame size={24} strokeWidth={activeTab === 'habittracker' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Habits</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'dashboard' ? 'stroke-gradient dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}`}
          >
            <LayoutDashboard size={24} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Dashboard</span>
          </button>
        </div>
      </div>
      <DayDetailsModal
        isOpen={isDayDetailsOpen}
        onClose={() => setIsDayDetailsOpen(false)}
        date={dayDetailsDate}
        data={dayDetailsData}
      />
    </div >

  )
};

// --- Landing Page & Root App ---



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
              <path d="M 65.148438 215.859375 L 81.007812 225.375 L 150.804688 136.546875 L 184.117188 176.992188 L 311.011719 0.136719 L 385.5625 84.199219 L 415.699219 66.785156 L 517.222656 177.023438 L 571.117188 155.582031 L 713.113281 288.820312 L 567.582031 187.308594 L 511.699219 214.703125 C 511.699219 214.703125 510.898438 308.683594 510.898438 312.648438 C 510.898438 316.613281 414.082031 179.410156 414.082031 179.410156 L 414.082031 278.542969 L 315.398438 49.339844 L 124.363281 332.972656 L 166.761719 225.765625 L 133.746094 252.339844 L 146.972656 192.921875 L 85.773438 259.898438 L 64.351562 245.617188 L 0.910156 288.839844 Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Welcome to Ascend
          </h1>
          <p className="text-slate-500 dark:text-slate-300 mt-2">
            Your personal productivity companion
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => handleTabChange('signin')}
              className={`flex-1 py-4 text-sm font-semibold transition-all relative ${activeTab === 'signin'
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
              className={`flex-1 py-4 text-sm font-semibold transition-all relative ${activeTab === 'signup'
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
              className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 font-medium rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <Loader2 size={20} className="animate-spin text-slate-500" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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
            <p className="text-center text-sm text-slate-500 dark:text-slate-300 mt-6">
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
  console.log('App component rendering');
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; avatar: string; email: string } | null>(null);
  const [view, setView] = useState<'landing' | 'auth' | 'app'>('landing');
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Add a timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session check timed out')), 5000)
        );

        const currentUser = await Promise.race([
          getCurrentUser(),
          timeoutPromise
        ]) as any;

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
      // IMPORTANT: Only sign out from Supabase auth
      // DO NOT call disconnectGoogle() or delete any Google Calendar data
      // Google Calendar events should persist even after logout

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
    <LegalProvider>
      <ThemeContext.Provider value={{ isDark, toggleTheme }}>
        <IconsGradientDef />
        <LegalModals />
        {view === 'landing' && <CookieBanner />}

        {view === 'landing' && (
          <LandingPage onGetStarted={() => setView('auth')} />
        )}
        {view === 'auth' && (
          <AuthPage onSuccess={() => { }} />
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
    </LegalProvider>
  );
};

export default App;