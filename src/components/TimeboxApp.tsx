import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    Calendar, ListTodo, BarChart3, Clock, RefreshCw, Target, Plus,
    MoreVertical, ChevronDown, ChevronRight, ChevronLeft, User,
    Loader2, LogOut, Settings, LayoutDashboard, Activity, Flame,
    Zap, ZoomIn, ZoomOut, CheckCircle2, AlertCircle, Trash2, Edit3, X, Check,
    Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types & Utils
import { Task, Habit, ScheduleBlock, UserSettings, WeightEntry, WEEKDAYS, GOOGLE_COLORS } from '../types';
import { formatDateISO, isSameDay, isToday, formatTime, getWeekNumber } from '../utils';
import { format } from 'date-fns';

// Context
import { useTheme } from '../context/ThemeContext';

// Components
import TagModal from './TagModal';
import HabitForm from './HabitForm';
import TaskItem from './TaskItem';
import SettingsModal from './SettingsModal';
import NoteSection from './NoteSection';
import WeightSection from './WeightSection';
import StreakFlame from './StreakFlame';
import ConsistencyCard from './ConsistencyCard';
import DayDetailsModal from './DayDetailsModal';
import { WeightTrendChart } from './WeightTrendChart';

// Backend Services
import {
    initGoogleApi, fetchGoogleCalendarEvents, syncCalendarEvents,
    saveGoogleUser, handleGoogleOAuthCallback, checkGoogleConnectionStatus,
    startGoogleOAuth, disconnectGoogle, setSupabaseToken,
    getValidAccessToken, setAccessToken, deleteGoogleCalendarEvent,
    updateGoogleCalendarEvent, createGoogleCalendarEvent, clearSavedData as clearGoogleData
} from '../googleCalendar';
import {
    updateScheduleBlock, loadUserSettings, saveUserSettings,
    updateTask, loadNote, saveNote, migrateOverdueTasks,
    loadAllTasksForDate, toggleTaskCompletion, setTaskCompletion,
    generateRecurringInstances, createTaskForDate, deleteTask as deleteTaskFromDb,
    moveTask, moveTaskToList, updateTagNameAndColor,
    loadScheduleBlocks, deleteScheduleBlock, createScheduleBlock
} from '../database';
import { supabase } from '../supabase';

interface TimeboxAppProps {
    user: any;
    onBack: () => void;
    onLogin: () => void;
    onLogout: () => void;
}

const TimeboxApp = ({ onBack, user, onLogin, onLogout }: TimeboxAppProps) => {
    const { isDark, toggleTheme } = useTheme();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'timebox' | 'habittracker'>('timebox');
    const [isLaterOpen, setIsLaterOpen] = useState(true);

    // Settings
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsInitialTab, setSettingsInitialTab] = useState<'account' | 'billing' | 'customisations' | 'integrations'>('account');
    const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);
    const [googleApiReady, setGoogleApiReady] = useState(false);
    const [settings, setSettings] = useState<UserSettings>({
        timeFormat: '24h',
        timezone: 'Local',
        googleConnected: false
    });

    // Calendar
    const [selectedDate, setSelectedDate] = useState(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const saved = localStorage.getItem('ascend_selected_date');
        if (saved) {
            const savedDate = new Date(saved);
            savedDate.setHours(0, 0, 0, 0);
            if (savedDate >= today) return savedDate;
        }
        return today;
    });
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [calendarViewDate, setCalendarViewDate] = useState(new Date());
    const calendarRef = useRef<HTMLDivElement>(null);
    const calendarButtonRef = useRef<HTMLButtonElement>(null);

    // Tags
    const [userTags, setUserTags] = useState<{ name: string; color: string }[]>(() => {
        const saved = localStorage.getItem('ascend_user_tags');
        return saved ? JSON.parse(saved) : [];
    });
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [tagModalTaskId, setTagModalTaskId] = useState<string | number | null>(null);
    const [tagModalHabitId, setTagModalHabitId] = useState<string | null>(null);
    const [editingTag, setEditingTag] = useState<{ name: string; color: string } | null>(null);

    // Notes & Weight
    const [notesContent, setNotesContent] = useState('');
    const [notesSaved, setNotesSaved] = useState(false);
    const [notesLoading, setNotesLoading] = useState(false);
    const [weightEntries, setWeightEntries] = useState<WeightEntry[]>(() => {
        const saved = localStorage.getItem('ascend_weight_entries');
        return saved ? JSON.parse(saved) : [];
    });
    const [newWeight, setNewWeight] = useState('');

    // Habits
    const [habits, setHabits] = useState<Habit[]>(() => {
        const saved = localStorage.getItem('ascend_habits');
        return saved ? JSON.parse(saved) : [];
    });
    const habitsRef = useRef<Habit[]>(habits);
    const [isAddHabitOpen, setIsAddHabitOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [habitWeekOffset, setHabitWeekOffset] = useState(0);

    // Timeline & Time
    const timelineRef = useRef<HTMLDivElement>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isZoomedOut, setIsZoomedOut] = useState(() => {
        const saved = localStorage.getItem('ascend_zoom_state');
        return saved ? JSON.parse(saved) : false;
    });
    const HOUR_HEIGHT_NORMAL = 96;
    const HOUR_HEIGHT_ZOOMED = 40;
    const hourHeight = isZoomedOut ? HOUR_HEIGHT_ZOOMED : HOUR_HEIGHT_NORMAL;
    const currentTimeDecimal = currentTime.getHours() + currentTime.getMinutes() / 60;

    // Google Calendar
    const [googleAccount, setGoogleAccount] = useState<{ email: string; name: string; picture: string } | null>(null);

    // Tasks & Schedule State
    const [activeTasks, setActiveTasks] = useState<Task[]>([]);
    const [laterTasks, setLaterTasks] = useState<Task[]>([]);
    const [todayTasks, setTodayTasks] = useState<{ active: Task[], later: Task[] }>({ active: [], later: [] });

    // Schedule State
    const [dbSchedule, setDbSchedule] = useState<ScheduleBlock[]>([]);
    const [newTaskInput, setNewTaskInput] = useState("");
    const [isDataLoaded, setIsDataLoaded] = useState(false); // Initially false, then true forever after first load


    // UI States
    const [draggedItem, setDraggedItem] = useState<any>(null);
    const [dragOverList, setDragOverList] = useState<string | null>(null);
    const [dragOverHour, setDragOverHour] = useState<number | null>(null);
    const [resizingBlockId, setResizingBlockId] = useState<number | string | null>(null);
    const [resizeStartY, setResizeStartY] = useState<number | null>(null);
    const [resizeStartDuration, setResizeStartDuration] = useState<number | null>(null);
    const [draggingBlockId, setDraggingBlockId] = useState<number | string | null>(null);
    const [dragStartY, setDragStartY] = useState<number | null>(null);
    const [dragStartTime, setDragStartTime] = useState<number | null>(null);

    // Refs for Drag/Resize (To avoid race conditions in event listeners)
    const draggingBlockIdRef = useRef<number | string | null>(null);
    const dragStartYRef = useRef<number | null>(null);
    const dragStartTimeRef = useRef<number | null>(null);
    const resizingBlockIdRef = useRef<number | string | null>(null);
    const resizeStartYRef = useRef<number | null>(null);
    const resizeStartDurationRef = useRef<number | null>(null);
    const isLongPressRef = useRef<boolean>(false);

    const [isSyncing, setIsSyncing] = useState(false);
    const [isCalendarSynced, setIsCalendarSynced] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

    // Day Details Modal State
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

    // --- Google Calendar Cache & Sync ---
    const [googleEventsCache, setGoogleEventsCache] = useState<Record<string, ScheduleBlock[]>>(() => {
        try {
            const cached = localStorage.getItem('googleEventsCache_v2');
            return cached ? JSON.parse(cached) : {};
        } catch (e) {
            console.error('Failed to parse googleEventsCache', e);
            return {};
        }
    });

    // Save cache to localStorage whenever it changes
    useEffect(() => {
        try {
            if (Object.keys(googleEventsCache).length > 0) {
                localStorage.setItem('googleEventsCache_v2', JSON.stringify(googleEventsCache));
            }
        } catch (e) {
            console.error('Failed to save googleEventsCache', e);
            setNotification({ type: 'error', message: 'Failed to save calendar cache (Storage Full?)' });
        }
    }, [googleEventsCache]);

    // --- Synchronous Schedule Derivation ---
    // 1. Get Google Events from cache instantly
    const dateKey = formatDateISO(selectedDate);
    // Explicitly cast to ScheduleBlock[] to avoid type errors
    const googleSchedule = (googleEventsCache[dateKey] || []) as ScheduleBlock[];

    // 2. Merge with DB schedule
    const schedule = [...dbSchedule, ...googleSchedule];

    // Helper functions for localStorage data (restoring missing functionality)
    const getHabits = useCallback(async (): Promise<Habit[]> => {
        try {
            const stored = localStorage.getItem('ascend_habits');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error loading habits:', e);
            return [];
        }
    }, []);

    const getWeightEntries = useCallback(async (): Promise<WeightEntry[]> => {
        try {
            const stored = localStorage.getItem('ascend_weight_entries');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error loading weight entries:', e);
            return [];
        }
    }, []);

    // Helper to sync Google Calendar events in background
    const syncGoogleEvents = useCallback(async () => {
        if (!googleAccount || !isCalendarSynced) return;

        setIsSyncing(true);
        try {
            // Fetch events for a wide range (e.g., +/- 45 days)
            const now = new Date();
            const start = new Date(now);
            start.setDate(now.getDate() - 45);
            const end = new Date(now);
            end.setDate(now.getDate() + 45);

            const events = await fetchGoogleCalendarEvents(start, end);

            // Group events by date string (YYYY-MM-DD)
            const newCache: Record<string, ScheduleBlock[]> = {};

            events.forEach((event: any) => {
                const eventDate = new Date(event.start.dateTime || event.start.date || new Date().toISOString());
                const dateKey = formatDateISO(eventDate);

                if (!newCache[dateKey]) {
                    newCache[dateKey] = [];
                }

                // Convert Google Event to ScheduleBlock
                const startHour = eventDate.getHours() + eventDate.getMinutes() / 60;
                const endD = new Date(event.end.dateTime || event.end.date || new Date().toISOString());
                const duration = (endD.getTime() - eventDate.getTime()) / (1000 * 60 * 60);

                // Map color
                let blockColor = 'bg-blue-100';
                let textColor = 'text-blue-700';
                if (event.colorId) {
                    const gColor = GOOGLE_COLORS.find((c: any) => c.id === event.colorId);
                    if (gColor) {
                        const parts = gColor.tailwind.split(' ');
                        blockColor = parts.find((p: string) => p.startsWith('bg-')) || blockColor;
                        textColor = parts.find((p: string) => p.startsWith('text-')) || textColor;
                    }
                }

                newCache[dateKey].push({
                    id: event.id,
                    title: event.summary || '(No title)',
                    tag: null,
                    start: startHour,
                    duration: duration,
                    color: blockColor,
                    textColor: textColor,
                    isGoogle: true,
                    googleEventId: event.id,
                    colorId: event.colorId,
                    completed: false
                });


            });

            // Merge with existing cache logic could be complex, but for now we replace the specific days or merge?
            // To be safe and simple: We update the cache with the fetched range.
            // But we shouldn't wipe out other days if we only fetched -45/+45.
            // For now, let's just merge:
            setGoogleEventsCache(prev => ({
                ...prev,
                ...newCache
            }));

        } catch (error) {
            console.error('Background sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    }, [googleAccount, isCalendarSynced, user]);

    // Background sync interval (every 5 minutes)
    useEffect(() => {
        if (!googleAccount || !isCalendarSynced) return;

        syncGoogleEvents(); // Initial sync

        const interval = setInterval(syncGoogleEvents, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [syncGoogleEvents, googleAccount, isCalendarSynced]); const scheduleRef = useRef(schedule);
    scheduleRef.current = schedule;
    const hourHeightRef = useRef(hourHeight);
    hourHeightRef.current = hourHeight;

    // --- Handlers ---

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

    const addHabit = (newHabit: Omit<Habit, 'id' | 'currentStreak' | 'longestStreak' | 'completedDates' | 'createdAt'>) => {
        const habit: Habit = { ...newHabit, id: crypto.randomUUID(), currentStreak: 0, longestStreak: 0, completedDates: [], createdAt: formatDateISO(new Date()) };
        setHabits(prev => [...prev, habit]);
        setIsAddHabitOpen(false);
    };

    const handleNotesChange = (content: string) => {
        setNotesContent(content);
        if (notesSaveTimeoutRef.current) clearTimeout(notesSaveTimeoutRef.current);
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
    const notesSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleAddWeight = () => {
        const weight = parseFloat(newWeight);
        if (isNaN(weight) || weight <= 0) return;
        const dateToLog = formatDateISO(new Date());
        const existingIndex = weightEntries.findIndex(e => e.date === dateToLog);
        let updatedEntries = existingIndex >= 0
            ? weightEntries.map((e, i) => i === existingIndex ? { ...e, weight } : e)
            : [...weightEntries, { id: crypto.randomUUID(), date: dateToLog, weight, userId: user.id }].sort((a, b) => a.date.localeCompare(b.date));
        if (updatedEntries.length > 90) updatedEntries = updatedEntries.slice(-90);
        setWeightEntries(updatedEntries);
        localStorage.setItem('ascend_weight_entries', JSON.stringify(updatedEntries));
        setNewWeight('');
        setNotification({ type: 'success', message: `Weight logged: ${weight} kg` });
    };

    const handleToggleComplete = async (taskId: string | number) => {
        const id = String(taskId);
        const task = activeTasks.find(t => t.id === id) || laterTasks.find(t => t.id === id);
        if (!task) return;
        const newCompleted = !task.completed;
        const completedAt = newCompleted ? formatDateISO(new Date()) : null;
        setActiveTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newCompleted, completedAt } : t));
        setLaterTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newCompleted, completedAt } : t));
        setTodayTasks(prev => ({
            active: prev.active.map(t => t.id === id ? { ...t, completed: newCompleted, completedAt } : t),
            later: prev.later.map(t => t.id === id ? { ...t, completed: newCompleted, completedAt } : t)
        }));
        setDbSchedule(prev => prev.map(block => String(block.taskId) === id ? { ...block, completed: newCompleted } : block));
        try {
            await setTaskCompletion(id, newCompleted);
            const associatedBlocks = schedule.filter(b => String(b.taskId) === id);
            for (const block of associatedBlocks) {
                await updateScheduleBlock(String(block.id), { completed: newCompleted });
            }
        } catch (err) { console.error('Failed to sync completion:', err); }
    };

    const handleDeleteTask = async (taskId: number | string, listType: string) => {
        const linkedBlock = schedule.find(b => b.taskId && String(b.taskId) === String(taskId));
        if (linkedBlock) {
            if (linkedBlock.googleEventId && googleAccount) {
                try { await deleteGoogleCalendarEvent(linkedBlock.googleEventId); } catch (error) { console.error('Google delete failed:', error); }
            }
            await deleteScheduleBlock(String(linkedBlock.id));
            setDbSchedule(prev => prev.filter(b => String(b.id) !== String(linkedBlock.id)));
        }
        await deleteTaskFromDb(String(taskId));
        if (listType === 'active') {
            setActiveTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
            setTodayTasks(prev => ({ ...prev, active: prev.active.filter(t => String(t.id) !== String(taskId)) }));
        } else {
            setLaterTasks(prev => prev.filter(t => String(t.id) !== String(taskId)));
            setTodayTasks(prev => ({ ...prev, later: prev.later.filter(t => String(t.id) !== String(taskId)) }));
        }
    };

    const handleToggleBlockComplete = async (blockId: number | string) => {
        const block = schedule.find(b => String(b.id) === String(blockId));
        if (!block) return;
        const newCompleted = !block.completed;
        setDbSchedule(prev => prev.map(b => String(b.id) === String(blockId) ? { ...b, completed: newCompleted } : b));
        const now = formatDateISO(new Date());
        if (block.taskId) {
            setActiveTasks(prev => prev.map(t => String(t.id) === String(block.taskId) ? { ...t, completed: newCompleted, completedAt: newCompleted ? now : null } : t));
            setLaterTasks(prev => prev.map(t => String(t.id) === String(block.taskId) ? { ...t, completed: newCompleted, completedAt: newCompleted ? now : null } : t));
            setTodayTasks(prev => ({
                active: prev.active.map(t => String(t.id) === String(block.taskId) ? { ...t, completed: newCompleted, completedAt: newCompleted ? now : null } : t),
                later: prev.later.map(t => String(t.id) === String(block.taskId) ? { ...t, completed: newCompleted, completedAt: newCompleted ? now : null } : t)
            }));
            await setTaskCompletion(String(block.taskId), newCompleted);
        }
        if (block.habitId) toggleHabitCompletion(block.habitId, selectedDate);
        await updateScheduleBlock(String(blockId), { completed: newCompleted });
    };

    const handleDeleteBlock = async (blockId: number | string) => {
        const block = schedule.find(b => String(b.id) === String(blockId));
        if (!block) return;
        const isReadOnly = block.isGoogle && block.canEdit !== true && !block.taskId && !block.habitId;
        if (isReadOnly) {
            setNotification({ type: 'info', message: 'Read-only calendar event' });
            if (isReadOnly) {
                setNotification({ type: 'info', message: 'Read-only calendar event' });
                // For read only google events, we effectively hide them if we "delete" them locally? 
                // Or maybe we can't delete them from view if we can't delete from google.
                // For now, if we filter them out, we should update cache.
                // setGoogleEventsCache... (complex, skip for now or alert)
                return;
            }
        }
        if (block.googleEventId && googleAccount && (!block.isGoogle || block.canEdit || block.taskId || block.habitId)) {
            try { await deleteGoogleCalendarEvent(block.googleEventId); } catch (error) { console.error('Google delete failed:', error); }
        }
        if (block.taskId) {
            setActiveTasks(prev => prev.map(t => String(t.id) === String(block.taskId) ? { ...t, time: null } : t));
            setLaterTasks(prev => prev.map(t => String(t.id) === String(block.taskId) ? { ...t, time: null } : t));
            await updateTask(String(block.taskId), { time: null });
        }
        await deleteScheduleBlock(String(blockId));
        await deleteScheduleBlock(String(blockId));
        setDbSchedule(prev => prev.filter(b => String(b.id) !== String(blockId)));
    };

    const handleMoveTaskToList = async (taskId: number | string, targetList: 'active' | 'later') => {
        await moveTaskToList(String(taskId), targetList, selectedDate);
        const task = [...activeTasks, ...laterTasks].find(t => String(t.id) === String(taskId));
        if (!task) return;
        if (targetList === 'later') {
            setActiveTasks(prev => prev.filter(t => t.id !== task.id));
            setLaterTasks(prev => [...prev, { ...task, time: null, assignedDate: null }]);
            // If it was today, remove it from today active
            setTodayTasks(prev => ({
                ...prev,
                active: prev.active.filter(t => t.id !== task.id),
                later: isToday(selectedDate) ? [...prev.later, { ...task, time: null, assignedDate: null }] : prev.later
            }));
        } else {
            setLaterTasks(prev => prev.filter(t => t.id !== task.id));
            const updatedTask = { ...task, assignedDate: formatDateISO(selectedDate) };
            setActiveTasks(prev => [...prev, updatedTask]);
            // If the target date is today, add it to today active
            if (isToday(selectedDate)) {
                setTodayTasks(prev => ({
                    ...prev,
                    later: prev.later.filter(t => t.id !== task.id),
                    active: [...prev.active, updatedTask]
                }));
            }
        }
    };

    const handleAddTagToTask = async (taskId: number | string, tagName: string, tagColor: string) => {
        setActiveTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, tag: tagName, tagColor } : t));
        setLaterTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, tag: tagName, tagColor } : t));
        setTodayTasks(prev => ({
            active: prev.active.map(t => String(t.id) === String(taskId) ? { ...t, tag: tagName, tagColor } : t),
            later: prev.later.map(t => String(t.id) === String(taskId) ? { ...t, tag: tagName, tagColor } : t)
        }));
        await updateTask(String(taskId), { tag: tagName, tagColor });
    };

    const handleRemoveTagFromTask = async (taskId: number | string) => {
        setActiveTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, tag: null, tagColor: null } : t));
        setLaterTasks(prev => prev.map(t => String(t.id) === String(taskId) ? { ...t, tag: null, tagColor: null } : t));
        await updateTask(String(taskId), { tag: null, tagColor: null });
    };

    const handleCreateTag = async (tagName: string, tagColor: string) => {
        const oldTagName = editingTag?.name;
        const newTag = { name: tagName, color: tagColor };

        if (editingTag) {
            // CASCADING UPDATE: If editing, update all occurrences in state
            if (oldTagName) {
                // Update in database first
                await updateTagNameAndColor(oldTagName, tagName, tagColor);

                setUserTags(prev => prev.map(t => t.name === oldTagName ? newTag : t));
                setActiveTasks(prev => prev.map(t => t.tag === oldTagName ? { ...t, tag: tagName, tagColor: tagColor } : t));
                setLaterTasks(prev => prev.map(t => t.tag === oldTagName ? { ...t, tag: tagName, tagColor: tagColor } : t));
                setHabits(prev => prev.map(h => h.tag === oldTagName ? { ...h, tag: tagName, tagColor: tagColor } : h));

                // Update schedule blocks
                // Update schedule blocks
                setDbSchedule(prev => prev.map(b => b.tag === oldTagName ? { ...b, tag: tagName, color: tagColor } : b));
            }
        } else {
            setUserTags(prev => [...prev, newTag]);
        }

        // Apply tag if it was opened from a specific task or habit context
        if (tagModalTaskId) {
            await handleAddTagToTask(tagModalTaskId, tagName, tagColor);
        } else if (tagModalHabitId) {
            setHabits(prev => prev.map(h => h.id === tagModalHabitId ? { ...h, tag: tagName, tagColor: tagColor } : h));
        }

        setIsTagModalOpen(false);
        setEditingTag(null);
        setTagModalTaskId(null);
        setTagModalHabitId(null);

        // Persist user tags
        const updatedTags = editingTag
            ? userTags.map(t => t.name === oldTagName ? newTag : t)
            : [...userTags, newTag];
        localStorage.setItem('ascend_user_tags', JSON.stringify(updatedTags));
    };

    const handleOpenEditTagModal = (tag: { name: string, color: string }, contextId?: { taskId?: number | string, habitId?: string }) => {
        setEditingTag(tag);
        if (contextId?.taskId) {
            setTagModalTaskId(contextId.taskId);
            setTagModalHabitId(null);
        } else if (contextId?.habitId) {
            setTagModalHabitId(contextId.habitId);
            setTagModalTaskId(null);
        } else {
            setTagModalTaskId(null);
            setTagModalHabitId(null);
        }
        setIsTagModalOpen(true);
    };

    const handleOpenTagModal = (taskId: string | number) => {
        setTagModalTaskId(taskId);
        setTagModalHabitId(null);
        setIsTagModalOpen(true);
    };

    const handleDeleteTagByName = async (tagName: string) => {
        setUserTags(prev => prev.filter(t => t.name !== tagName));
        setActiveTasks(prev => prev.map(t => t.tag === tagName ? { ...t, tag: null, tagColor: null } : t));
        setLaterTasks(prev => prev.map(t => t.tag === tagName ? { ...t, tag: null, tagColor: null } : t));
        setHabits(prev => prev.map(h => h.tag === tagName ? { ...h, tag: null, tagColor: null } : h));
        setHabits(prev => prev.map(h => h.tag === tagName ? { ...h, tag: null, tagColor: null } : h));
        setDbSchedule(prev => prev.map(b => b.tag === tagName ? { ...b, tag: null, color: '#6F00FF' } : b));

        // Persist change
        const updatedTags = userTags.filter(t => t.name !== tagName);
        localStorage.setItem('ascend_user_tags', JSON.stringify(updatedTags));

        // Update DB: Replace tag/color with null where it matches
        await updateTagNameAndColor(tagName, null, null);
    };

    const handleToggleHabitCompletion = (habitId: string, date: Date) => toggleHabitCompletion(habitId, date);

    const toggleHabitCompletion = (habitId: string, date?: Date) => {
        const targetDate = date || selectedDate;

        // Prevent marking future dates as complete
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(targetDate);
        checkDate.setHours(0, 0, 0, 0);

        if (checkDate > today) {
            setNotification({ type: 'error', message: 'Cannot mark future dates' });
            return;
        }

        const dateString = formatDateISO(targetDate);
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;
        const isCompleted = habit.completedDates.includes(dateString);
        const newCompleted = !isCompleted;

        setHabits(prev => prev.map(h => {
            if (h.id !== habitId) return h;
            const newDates = newCompleted ? [...h.completedDates, dateString] : h.completedDates.filter(d => d !== dateString);
            const updated = { ...h, completedDates: newDates };
            const streak = calculateStreak(updated);
            return { ...updated, currentStreak: streak, longestStreak: Math.max(h.longestStreak, streak) };
        }));

        setDbSchedule(prev => prev.map(b => b.habitId === habitId ? { ...b, completed: newCompleted } : b));
        const blocks = schedule.filter(b => b.habitId === habitId);
        for (const b of blocks) updateScheduleBlock(String(b.id), { completed: newCompleted }).catch(err => console.error(err));
    };

    const calculateStreak = (habit: Habit): number => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayStr = formatDateISO(today);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatDateISO(yesterday);

        // Keep the streak alive even if today isn't checked yet.
        // If neither today nor yesterday is completed, the streak is broken.
        const anchor = habit.completedDates.includes(todayStr)
            ? today
            : habit.completedDates.includes(yesterdayStr)
                ? yesterday
                : null;

        if (!anchor) return 0;

        let streak = 0;
        const checkDate = new Date(anchor);
        while (true) {
            const dateStr = formatDateISO(checkDate);
            if (!habit.completedDates.includes(dateStr)) break;
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
            if (streak > 1000) break;
        }

        return streak;
    };

    const handleDayClick = async (date: Date) => {
        console.log("Day clicked in TimeboxApp:", date);
        setDayDetailsDate(date);

        // 1. Habits (Already in state, just filter)
        // habits are already available in 'habits' state

        // 2. Weight
        const dateStr = formatDateISO(date);
        const weightEntry = weightEntries.find(w => w.date === dateStr);

        // 3. Notes & Tasks (Need to fetch if not today/selectedDate)
        let note = "";
        let tasks = { active: [] as Task[], later: [] as Task[] };

        // Optimistic check if we already have the data locally for selected date
        if (isSameDay(date, selectedDate)) {
            note = notesContent;
            tasks = { active: activeTasks, later: laterTasks };
        } else {
            // Fetch from DB
            try {
                const [fetchedTasks, fetchedNote] = await Promise.all([
                    loadAllTasksForDate(date),
                    loadNote(date)
                ]);
                tasks = fetchedTasks;
                note = fetchedNote;
            } catch (err) {
                console.error("Failed to fetch day details", err);
            }
        }

        setDayDetailsData({
            habits: habits, // Pass all habits, modal filters them
            tasks,
            weight: weightEntry ? weightEntry.weight : null,
            note
        });

        setIsDayDetailsOpen(true);
    };

    // --- Effects ---

    // --- Manual Event Listeners (Refs) ---
    // Defined outside useEffect to be stable and callable from onMouseDown

    const handleWindowMouseMove = useCallback((e: MouseEvent) => {
        const currentHourHeight = hourHeightRef.current;

        // Handle resize
        if (resizingBlockIdRef.current !== null && resizeStartYRef.current !== null && resizeStartDurationRef.current !== null) {
            const deltaY = e.clientY - resizeStartYRef.current;
            const deltaHours = deltaY / currentHourHeight;
            let newDuration = resizeStartDurationRef.current + deltaHours;
            newDuration = Math.round(newDuration * 4) / 4;
            if (newDuration < 0.25) newDuration = 0.25;

            const rId = resizingBlockIdRef.current;
            const isResizingGoogle = rId && typeof rId === 'string' && scheduleRef.current.find(b => b.id === rId)?.isGoogle;

            if (isResizingGoogle) {
                setGoogleEventsCache(prev => {
                    const dKey = formatDateISO(selectedDate);
                    const dayEvents = prev[dKey] || [];
                    return {
                        ...prev,
                        [dKey]: dayEvents.map(b => b.id === rId ? { ...b, duration: newDuration } : b)
                    };
                });
            } else {
                setDbSchedule(prev => prev.map(block => block.id === rId ? { ...block, duration: newDuration } : block));
            }
        }

        // Handle drag/move
        if (draggingBlockIdRef.current !== null && dragStartYRef.current !== null && dragStartTimeRef.current !== null && isLongPressRef.current) {
            const deltaY = e.clientY - dragStartYRef.current;
            const deltaHours = deltaY / currentHourHeight;
            let newStart = dragStartTimeRef.current + deltaHours;
            newStart = Math.round(newStart * 4) / 4;

            const currentSchedule = scheduleRef.current;
            const dId = draggingBlockIdRef.current;
            const block = currentSchedule.find(b => b.id === dId);

            if (block) {
                if (newStart < 0) newStart = 0;
                if (newStart + block.duration > 24) newStart = 24 - block.duration;
            }

            const isDraggingGoogle = dId && typeof dId === 'string' && currentSchedule.find(b => b.id === dId)?.isGoogle;

            if (isDraggingGoogle) {
                setGoogleEventsCache(prev => {
                    const dKey = formatDateISO(selectedDate);
                    const dayEvents = prev[dKey] || [];
                    return {
                        ...prev,
                        [dKey]: dayEvents.map(b => b.id === dId ? { ...b, start: newStart } : b)
                    };
                });
            } else {
                setDbSchedule(prev => prev.map(block => block.id === dId ? { ...block, start: newStart } : block));
            }
        }
    }, [selectedDate]); // Dependencies: selectedDate (used in cache key)

    const handleWindowMouseUp = useCallback(async () => {
        const currentSchedule = scheduleRef.current;
        const canEditGoogleEvent = (block: ScheduleBlock) => {
            if (!block.isGoogle) return true;
            if (block.taskId || block.habitId) return true;
            return block.canEdit === true;
        };

        // Resize End
        if (resizingBlockIdRef.current !== null) {
            const rId = resizingBlockIdRef.current;
            const resizedBlock = currentSchedule.find(b => b.id === rId);

            if (resizedBlock) {
                if (!resizedBlock.isGoogle) {
                    await updateScheduleBlock(String(resizedBlock.id), { duration: resizedBlock.duration });
                }
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
                                undefined, // Don't pass hexColor to avoid re-mapping logic on time update
                                resizedBlock.colorId
                            );
                            setNotification({ type: 'success', message: 'Event updated' });
                        } catch (error) {
                            console.error('Failed to update Google Calendar event:', error);
                            setNotification({ type: 'error', message: 'Failed to update event' });
                        }
                    } else {
                        setNotification({ type: 'info', message: `Base calendar events cannot be edited here` });
                    }
                }
            }
            // Clear Ref interaction state
            resizingBlockIdRef.current = null;
            resizeStartYRef.current = null;
            resizeStartDurationRef.current = null;

            // Clear UI state
            setResizingBlockId(null);
            setResizeStartY(null);
            setResizeStartDuration(null);
        }

        // Drag End
        if (draggingBlockIdRef.current !== null) {
            const dId = draggingBlockIdRef.current;
            const movedBlock = currentSchedule.find(b => b.id === dId);

            // Clear Ref interaction state IMMEDIATELY
            draggingBlockIdRef.current = null;
            dragStartYRef.current = null;
            dragStartTimeRef.current = null;
            isLongPressRef.current = false;

            // Clear UI state
            setDraggingBlockId(null);
            setDragStartY(null);
            setDragStartTime(null);

            // Then do async operations in background
            if (movedBlock) {
                if (!movedBlock.isGoogle) {
                    updateScheduleBlock(String(movedBlock.id), { start: movedBlock.start }).catch(err => console.error(err));
                }
                if (movedBlock.googleEventId && googleAccount) {
                    if (canEditGoogleEvent(movedBlock)) {
                        updateGoogleCalendarEvent(
                            movedBlock.googleEventId,
                            movedBlock.title,
                            movedBlock.start,
                            movedBlock.duration,
                            selectedDate,
                            movedBlock.calendarId,
                            undefined,
                            movedBlock.colorId
                        ).then(() => {
                            setNotification({ type: 'success', message: 'Event time updated' });
                        }).catch(error => {
                            console.error('Failed to update Google Calendar event:', error);
                            setNotification({ type: 'error', message: 'Failed to update event' });
                        });
                    } else {
                        setNotification({ type: 'info', message: `Base calendar events cannot be edited here` });
                    }
                }
                if (movedBlock.taskId) {
                    const newTimeString = formatTime(movedBlock.start);
                    setActiveTasks(prev => prev.map(t => String(t.id) === String(movedBlock.taskId) ? { ...t, time: newTimeString } : t));
                    setLaterTasks(prev => prev.map(t => String(t.id) === String(movedBlock.taskId) ? { ...t, time: newTimeString } : t));
                    updateTask(String(movedBlock.taskId), { time: newTimeString }).catch(err => console.error(err));
                }
            }
        }

        // Remove listeners
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);

    }, [googleAccount, selectedDate, handleWindowMouseMove]);


    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        localStorage.setItem('ascend_habits', JSON.stringify(habits));
        habitsRef.current = habits;
    }, [habits]);

    useEffect(() => {
        localStorage.setItem('ascend_selected_date', selectedDate.toISOString());
    }, [selectedDate]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 1000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        const initGoogle = async () => {
            try {
                await initGoogleApi();
                const callbackResult = handleGoogleOAuthCallback();
                if (callbackResult?.connected) {
                    setGoogleAccount({ email: callbackResult.email || '', name: '', picture: '' });
                    saveGoogleUser({ email: callbackResult.email || '' });
                    setNotification({ type: 'success', message: 'Google Calendar connected!' });
                    setIsGoogleConnecting(false);
                }
                setGoogleApiReady(true);
            } catch (error) { setGoogleApiReady(true); }
        };
        initGoogle();
    }, []);

    useEffect(() => {
        const checkGoogle = async () => {
            if (!user) return;
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                setSupabaseToken(session.access_token);
                const status = await checkGoogleConnectionStatus();
                if (status.connected) {
                    setGoogleAccount({ email: status.email || '', name: '', picture: '' });
                    saveGoogleUser({ email: status.email || '' });
                    const token = await getValidAccessToken();
                    if (token) setAccessToken(token);
                }
            }
        };
        checkGoogle();
    }, [user]);

    // --- Load Data Effect ---
    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            if (!user) return;

            // Note: We don't set loading state here to ensure snappy feel,
            // as we want to immediately show cached data if available.

            try {
                const todayISO = formatDateISO(selectedDate);
                // Also trigger recurring instances gen if needed (non-blocking if possible, but we await to be safe)
                await generateRecurringInstances(selectedDate);

                // Parallel fetch of DB data
                const [tasksData, habitsData, dbScheduleBlocks, noteContent, weightData, todayTasksData] = await Promise.all([
                    loadAllTasksForDate(selectedDate),
                    getHabits(),
                    loadScheduleBlocks(selectedDate),
                    loadNote(selectedDate),
                    getWeightEntries(),
                    isToday(selectedDate) ? null : loadAllTasksForDate(new Date())
                ]);

                if (!isMounted) return;

                const { active, later } = tasksData;

                // Update State
                setActiveTasks(active);
                setLaterTasks(later);
                setHabits(habitsData);
                setNotesContent(noteContent || '');
                setWeightEntries(weightData);

                if (isToday(selectedDate)) {
                    setTodayTasks({ active, later });
                } else if (todayTasksData) {
                    setTodayTasks(todayTasksData);
                }

                // Update Refs for internal logic using them
                habitsRef.current = habitsData;

                // --- MERGE DB & GOOGLE EVENTS ---
                // Note: Google events are now handled synchronously in the render loop using googleSchedule
                // We only need to process and set the DB blocks here.

                // Process DB Blocks (Sync Habit Status)
                const syncedDbBlocks = dbScheduleBlocks.map((b: ScheduleBlock) => {
                    if (b.taskId) {
                        const t = active.find(at => String(at.id) === String(b.taskId)) || later.find(lt => String(lt.id) === String(b.taskId));
                        if (t && t.completed !== b.completed) return { ...b, completed: t.completed };
                    }
                    if (b.habitId) {
                        const h = habitsData.find(hab => String(hab.id) === String(b.habitId));
                        if (h && h.completedDates.includes(todayISO)) return { ...b, completed: true };
                    }
                    return b;
                });

                // Filter out DB blocks ensuring we don't show blocks for deleted habits
                const filteredDbBlocks = syncedDbBlocks.filter(b => !b.habitId || habitsData.some(h => String(h.id) === String(b.habitId)));

                // We also filter out any DB blocks that might erroneously claim to be google blocks (legacy cleanup)
                const realDbBlocks = filteredDbBlocks.filter(b => !b.isGoogle);

                setDbSchedule(realDbBlocks);
                setIsDataLoaded(true);

                // Update Day Details Modal Data if open
                if (isDayDetailsOpen && isSameDay(dayDetailsDate, selectedDate)) {
                    setDayDetailsData({
                        habits: habitsData,
                        tasks: { active, later },
                        weight: weightData.find(w => w.date === formatDateISO(selectedDate))?.weight || null,
                        note: noteContent || ''
                    });
                }

            } catch (error) {
                console.error('Error loading data:', error);
                setNotification({ type: 'error', message: 'Failed to load data' });
                setIsDataLoaded(true);
            }
        };

        loadData();

        return () => { isMounted = false; };
    }, [selectedDate, user, isDayDetailsOpen, dayDetailsDate, getHabits, getWeightEntries]); // Removed googleEventsCache from dependency to avoid re-running loadData just for google updates

    // --- Synchronous Schedule Derivation ---
    // (Moved to top of component)

    const hourLabels = Array.from({ length: 24 }, (_, i) => i);

    // Prevent "Empty" flash on refresh:
    // If we have cached Google events or habits, render immediately while fetching fresh data in background.
    const hasCachedData = googleSchedule.length > 0 || habits.length > 0;

    if (!isDataLoaded && !hasCachedData) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
            <Loader2 className="w-12 h-12 animate-spin text-[#6F00FF]" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
            <nav className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
                        <div className="w-8 h-8 bg-[#6F00FF] rounded-lg flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 720 340" fill="white">
                                <path d="M 65.148438 215.859375 L 81.007812 225.375 L 150.804688 136.546875 L 184.117188 176.992188 L 311.011719 0.136719 L 385.5625 84.199219 L 415.699219 66.785156 L 517.222656 177.023438 L 571.117188 155.582031 L 713.113281 288.820312 L 567.582031 187.308594 L 511.699219 214.703125 C 511.699219 214.703125 510.898438 308.683594 510.898438 312.648438 C 510.898438 316.613281 414.082031 179.410156 414.082031 179.410156 L 414.082031 278.542969 L 315.398438 49.339844 L 124.363281 332.972656 L 166.761719 225.765625 L 133.746094 252.339844 L 146.972656 192.921875 L 85.773438 259.898438 L 64.351562 245.617188 L 0.910156 288.839844 Z" />
                            </svg>
                        </div>
                        <span className="font-bold text-xl bg-gradient-to-r from-[#6F00FF] to-purple-600 bg-clip-text text-transparent">Ascend</span>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        {[
                            { id: 'timebox', icon: <Clock size={16} />, label: 'Timebox' },
                            { id: 'habittracker', icon: <Target size={16} />, label: 'Habits' },
                            { id: 'dashboard', icon: <LayoutDashboard size={16} />, label: 'Stats' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-[#6F00FF] shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={toggleTheme} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <Settings size={20} />
                    </button>
                    <div className="h-8 w-px bg-slate-200 dark:border-slate-800" />
                    <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all">
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </nav>

            <main className="flex-1 flex overflow-hidden">
                {activeTab === 'timebox' && (
                    <div className="flex-1 flex overflow-hidden">
                        <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/20">
                            <div className="p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-bold dark:text-white flex items-center gap-2">
                                        <ListTodo size={18} className="text-[#6F00FF]" /> To-Do List
                                    </h2>
                                    <ConsistencyCard habits={habits} onDayClick={handleDayClick} />
                                </div>
                                <div className="mt-6 p-4">
                                    <Plus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/20 dark:text-white"
                                        placeholder="Add a task..."
                                        value={newTaskInput}
                                        onChange={e => setNewTaskInput(e.target.value)}
                                        onKeyDown={async e => {
                                            if (e.key === 'Enter' && newTaskInput.trim()) {
                                                const saved = await createTaskForDate(newTaskInput.trim(), selectedDate, 'active');
                                                if (saved) {
                                                    setActiveTasks(prev => [...prev, saved]);
                                                    if (isToday(selectedDate)) {
                                                        setTodayTasks(prev => ({ ...prev, active: [...prev.active, saved] }));
                                                    }
                                                }
                                                setNewTaskInput("");
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 custom-scrollbar">
                                <div className="space-y-2">
                                    {activeTasks.map(task => (
                                        <TaskItem
                                            key={task.id} task={task} listType="active" userTags={userTags}
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('task', JSON.stringify(task));
                                                e.dataTransfer.setData('source', 'active');
                                            }}
                                            onDelete={id => handleDeleteTask(id, 'active')}
                                            onToggleComplete={handleToggleComplete}
                                            onMoveToList={handleMoveTaskToList}
                                            onAddTag={handleAddTagToTask}
                                            onRemoveTag={handleRemoveTagFromTask}
                                            onOpenTagModal={handleOpenTagModal}
                                            onEditTag={tag => handleOpenEditTagModal(tag, { taskId: task.id })}
                                        />
                                    ))}
                                </div>

                                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                    <button
                                        onClick={() => setIsLaterOpen(!isLaterOpen)}
                                        className="flex items-center gap-2 w-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-semibold text-sm mb-2"
                                    >
                                        {isLaterOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Later
                                    </button>
                                    {isLaterOpen && (
                                        <div className="space-y-2">
                                            {laterTasks.map(task => (
                                                <TaskItem
                                                    key={task.id} task={task} listType="later" userTags={userTags}
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('task', JSON.stringify(task));
                                                        e.dataTransfer.setData('source', 'later');
                                                    }}
                                                    onDelete={id => handleDeleteTask(id, 'later')}
                                                    onToggleComplete={handleToggleComplete}
                                                    onMoveToList={handleMoveTaskToList}
                                                    onAddTag={handleAddTagToTask}
                                                    onRemoveTag={handleRemoveTagFromTask}
                                                    onOpenTagModal={id => handleOpenTagModal(id)}
                                                    onEditTag={tag => handleOpenEditTagModal(tag, { taskId: task.id })}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 relative overflow-hidden">
                            <div className="relative flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800" style={{ zIndex: 10000 }}>
                                <div className="flex items-center gap-4">
                                    <div className="relative z-[10000]">
                                        <button
                                            ref={calendarButtonRef}
                                            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-[#6F00FF]/50 transition-all font-bold group"
                                        >
                                            <Calendar size={18} className="text-[#6F00FF]" />
                                            <span className="dark:text-white">
                                                {isToday(selectedDate) ? 'Today' : selectedDate.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </span>
                                            <ChevronDown size={16} className={`text-slate-400 group-hover:text-slate-600 transition-transform ${isCalendarOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isCalendarOpen && createPortal(
                                            <>
                                                {/* Transparent backdrop for z-index isolation */}
                                                <div
                                                    onClick={() => setIsCalendarOpen(false)}
                                                    style={{
                                                        position: 'fixed',
                                                        inset: 0,
                                                        zIndex: 999998,
                                                        background: 'transparent'
                                                    }}
                                                />
                                                {/* Calendar dropdown */}
                                                <div
                                                    className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-[320px]"
                                                    style={{
                                                        position: 'fixed',
                                                        top: `${(calendarButtonRef.current?.getBoundingClientRect().bottom || 0) + 8}px`,
                                                        left: `${calendarButtonRef.current?.getBoundingClientRect().left || 0}px`,
                                                        zIndex: 999999
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between mb-4">
                                                        <button
                                                            onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1))}
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                                                        >
                                                            <ChevronLeft size={16} />
                                                        </button>
                                                        <span className="font-bold dark:text-white">
                                                            {calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                        </span>
                                                        <button
                                                            onClick={() => setCalendarViewDate(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1))}
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                                                        >
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-7 mb-2">
                                                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                                            <div key={day} className="h-8 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">
                                                                {day}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="grid grid-cols-7 gap-1">
                                                        {Array.from({ length: new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1).getDay() }).map((_, i) => (
                                                            <div key={`empty-${i}`} />
                                                        ))}

                                                        {Array.from({ length: new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                                                            const day = i + 1;
                                                            const date = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), day);
                                                            const isSelected = isSameDay(date, selectedDate);

                                                            return (
                                                                <button
                                                                    key={day}
                                                                    onClick={() => {
                                                                        setSelectedDate(date);
                                                                        setIsCalendarOpen(false);
                                                                    }}
                                                                    className={`
                                                                h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                                                                ${isSelected
                                                                            ? 'bg-[#6F00FF] text-white shadow-lg shadow-purple-500/30'
                                                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300'
                                                                        }
                                                                ${isToday(date) && !isSelected ? 'bg-slate-100 dark:bg-slate-800 font-bold' : ''}
                                                            `}
                                                                >
                                                                    {day}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            const now = new Date();
                                                            setSelectedDate(now);
                                                            setCalendarViewDate(now);
                                                            setIsCalendarOpen(false);
                                                        }}
                                                        className="w-full mt-4 py-2 text-sm font-bold text-slate-500 hover:text-[#6F00FF] hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
                                                    >
                                                        Today
                                                    </button>
                                                </div>
                                            </>,
                                            document.body
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsZoomedOut(!isZoomedOut)}
                                        className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:text-[#6F00FF] transition-all"
                                        title={isZoomedOut ? "Zoom In" : "Zoom Out"}
                                    >
                                        {isZoomedOut ? <ZoomIn size={18} /> : <ZoomOut size={18} />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            syncGoogleEvents();
                                            setNotification({ type: 'info', message: 'Syncing calendar...' });
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold transition-all ${isSyncing ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#6F00FF]/50'}`}
                                        disabled={isSyncing}
                                    >
                                        <RefreshCw size={18} className={isSyncing ? 'animate-spin text-[#6F00FF]' : 'text-[#6F00FF]'} />
                                        <span className="dark:text-white">Sync</span>
                                    </button>
                                </div>
                            </div>

                            <div
                                ref={timelineRef}
                                className="flex-1 overflow-y-auto overflow-x-hidden relative z-0 custom-scrollbar scroll-smooth"
                            >
                                <div className="flex relative">
                                    <div className="w-20 flex-shrink-0 border-r border-slate-100 dark:border-slate-900/50 bg-slate-50/30 dark:bg-slate-900/10">
                                        {hourLabels.map(hour => (
                                            <div key={hour} style={{ height: hourHeight }} className="flex items-start justify-center pt-2">
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex-1 relative">
                                        {hourLabels.map(hour => (
                                            <div
                                                key={hour}
                                                style={{ height: hourHeight }}
                                                onDragOver={e => { e.preventDefault(); setDragOverHour(hour); }}
                                                onDragLeave={() => setDragOverHour(null)}
                                                onDrop={async e => {
                                                    const taskJson = e.dataTransfer.getData('task');
                                                    const source = e.dataTransfer.getData('source');
                                                    if (taskJson) {
                                                        const task = JSON.parse(taskJson);
                                                        const blockData = {
                                                            title: task.title,
                                                            tag: task.tag,
                                                            start: hour,
                                                            duration: 1,
                                                            color: task.tagColor || '#6F00FF',
                                                            textColor: 'text-white',
                                                            isGoogle: false,
                                                            completed: task.completed,
                                                            taskId: task.id
                                                        };
                                                        const saved = await createScheduleBlock(blockData, selectedDate);
                                                        if (saved) {
                                                            setDbSchedule(prev => [...prev, saved]);
                                                            handleMoveTaskToList(task.id, 'active');
                                                        }
                                                        setDragOverHour(null);
                                                    }
                                                }}
                                                className={`border-b border-slate-100 dark:border-slate-900/50 transition-colors ${dragOverHour === hour ? 'bg-[#6F00FF]/5' : ''}`}
                                            />
                                        ))}

                                        {isToday(selectedDate) && (
                                            <div
                                                className="absolute left-0 right-0 z-20 pointer-events-none"
                                                style={{ top: currentTimeDecimal * hourHeight }}
                                            >
                                                <div className="w-full h-0.5 bg-red-500/50 relative shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-l-md transform scale-90 origin-right transition-opacity duration-300">
                                                        LIVE
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {schedule.map(block => (
                                            <div
                                                key={block.id}
                                                style={{
                                                    position: 'absolute',
                                                    top: block.start * hourHeight,
                                                    height: block.duration * hourHeight,
                                                    left: '4px',
                                                    right: '4px',
                                                    zIndex: 10
                                                }}
                                                className={`group rounded-lg p-2 border-l-4 shadow-sm transition-all cursor-move select-none overflow-hidden ${block.isGoogle ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-400' : 'bg-[#6F00FF]/10 dark:bg-[#6F00FF]/20 border-[#6F00FF]'} ${block.completed ? 'opacity-50 grayscale-[0.3]' : ''}`}
                                                onMouseDown={e => {
                                                    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;

                                                    // Hold-to-drag logic
                                                    const initialX = e.clientX;
                                                    const initialY = e.clientY;
                                                    let dragTimer: NodeJS.Timeout | null = null;
                                                    let hasMoved = false;

                                                    const handleMove = (moveE: MouseEvent) => {
                                                        const moveX = Math.abs(moveE.clientX - initialX);
                                                        const moveY = Math.abs(moveE.clientY - initialY);

                                                        if (moveX > 5 || moveY > 5) {
                                                            hasMoved = true;
                                                            if (dragTimer) {
                                                                clearTimeout(dragTimer);
                                                                dragTimer = null;
                                                            }
                                                            window.removeEventListener('mousemove', handleMove);
                                                            window.removeEventListener('mouseup', handleUp);
                                                        }
                                                    };

                                                    const handleUp = () => {
                                                        if (dragTimer) {
                                                            clearTimeout(dragTimer);
                                                            dragTimer = null;
                                                        }
                                                        window.removeEventListener('mousemove', handleMove);
                                                        window.removeEventListener('mouseup', handleUp);
                                                    };

                                                    window.addEventListener('mousemove', handleMove);
                                                    window.addEventListener('mouseup', handleUp);

                                                    dragTimer = setTimeout(() => {
                                                        if (!hasMoved) {
                                                            // Hold completed - initiate drag
                                                            isLongPressRef.current = true;
                                                            draggingBlockIdRef.current = block.id;
                                                            dragStartYRef.current = e.clientY;
                                                            dragStartTimeRef.current = block.start;
                                                            setDraggingBlockId(block.id);
                                                            setDragStartY(e.clientY);
                                                            setDragStartTime(block.start);
                                                            if (navigator.vibrate) navigator.vibrate(50);
                                                            window.addEventListener('mousemove', handleWindowMouseMove);
                                                            window.addEventListener('mouseup', handleWindowMouseUp);
                                                        }
                                                        window.removeEventListener('mousemove', handleMove);
                                                        window.removeEventListener('mouseup', handleUp);
                                                    }, 200);
                                                }}
                                            >
                                                <div className="flex items-start justify-between h-full">
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-bold truncate ${block.completed ? 'line-through text-slate-500' : 'dark:text-white'}`}>
                                                            {block.title}
                                                        </p>
                                                        {block.tag && (
                                                            <span className="text-[9px] uppercase font-bold text-[#6F00FF]">
                                                                {block.tag}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleToggleBlockComplete(block.id)} className="p-1 hover:bg-white/50 dark:hover:bg-slate-800 rounded">
                                                            {block.completed ? <RefreshCw size={12} /> : <Check size={12} />}
                                                        </button>
                                                        <button onClick={() => handleDeleteBlock(block.id)} className="p-1 hover:bg-white/50 dark:hover:bg-slate-800 rounded text-red-500">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div
                                                    className="resize-handle absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-[#6F00FF]/30 transition-colors"
                                                    onMouseDown={e => {
                                                        e.stopPropagation();
                                                        // 1. Set Refs
                                                        resizingBlockIdRef.current = block.id;
                                                        resizeStartYRef.current = e.clientY;
                                                        resizeStartDurationRef.current = block.duration;

                                                        // 2. Set State
                                                        setResizingBlockId(block.id);
                                                        setResizeStartY(e.clientY);
                                                        setResizeStartDuration(block.duration);

                                                        // 3. Attach Listeners Synchronously
                                                        window.addEventListener('mousemove', handleWindowMouseMove);
                                                        window.addEventListener('mouseup', handleWindowMouseUp);
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-96 border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 flex flex-col p-4 space-y-4 overflow-y-auto custom-scrollbar">
                            <NoteSection
                                notesContent={notesContent}
                                notesLoading={notesLoading}
                                notesSaved={notesSaved}
                                selectedDate={selectedDate}
                                onNotesChange={handleNotesChange}
                            />
                            <WeightSection
                                weightEntries={weightEntries}
                                newWeight={newWeight}
                                setNewWeight={setNewWeight}
                                onAddWeight={handleAddWeight}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'habittracker' && (
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold dark:text-white">Habit Tracker</h2>
                                <button onClick={() => setIsAddHabitOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#6F00FF] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/30 transition-all">
                                    <Plus size={18} /> Add Habit
                                </button>
                            </div>
                            {habits.map(habit => {
                                const streak = calculateStreak(habit);
                                return (
                                <div key={habit.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-[#6F00FF]">
                                                <Target size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold dark:text-white">{habit.name}</h3>
                                                {habit.tag && (
                                                    <span
                                                        onClick={(e) => { e.stopPropagation(); handleOpenEditTagModal({ name: habit.tag!, color: habit.tagColor! || '#6F00FF' }, { habitId: habit.id }); }}
                                                        className="text-[10px] px-1.5 py-0.5 rounded font-bold text-white uppercase tracking-wider cursor-pointer hover:ring-2 hover:ring-white/50 transition-all"
                                                        style={{ backgroundColor: habit.tagColor || '#6F00FF' }}
                                                        title="Klicka för att redigera tagg"
                                                    >
                                                        {habit.tag}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <StreakFlame
                                            streakCount={streak}
                                            progressPercentage={streak > 0 ? 100 : 0}
                                            size={44}
                                        />
                                    </div>
                                    <div className="grid grid-cols-7 gap-2">
                                        {WEEKDAYS.map((day, i) => (
                                            <div key={day} className="text-center">
                                                <p className="text-[10px] font-bold text-slate-400 mb-1">{day}</p>
                                                <div className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center transition-all ${habit.completedDates.includes(formatDateISO(new Date())) ? 'bg-[#6F00FF] text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                    <Check size={14} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'dashboard' && (
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                        <div className="max-w-6xl mx-auto space-y-6">
                            <ConsistencyCard habits={habits} onDayClick={handleDayClick} />

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                            <ListTodo size={20} className="text-[#6F00FF]" /> Today's Tasks
                                        </h3>
                                        <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-500">
                                            {todayTasks.active.length + todayTasks.later.length} total
                                        </div>
                                    </div>

                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {todayTasks.active.length === 0 && todayTasks.later.length === 0 ? (
                                            <div className="py-12 text-center">
                                                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                                                    <ListTodo size={24} className="text-slate-400" />
                                                </div>
                                                <p className="text-slate-400 text-sm">No tasks for today yet.</p>
                                            </div>
                                        ) : (
                                            <>
                                                {todayTasks.active.map(task => (
                                                    <TaskItem
                                                        key={task.id} task={task} listType="active" userTags={userTags}
                                                        onDragStart={() => { }}
                                                        onDelete={id => handleDeleteTask(id, 'active')}
                                                        onToggleComplete={handleToggleComplete}
                                                        onMoveToList={handleMoveTaskToList}
                                                        onAddTag={handleAddTagToTask}
                                                        onRemoveTag={handleRemoveTagFromTask}
                                                        onOpenTagModal={handleOpenTagModal}
                                                        onEditTag={tag => handleOpenEditTagModal(tag, { taskId: task.id })}
                                                    />
                                                ))}
                                                {todayTasks.later.map(task => (
                                                    <TaskItem
                                                        key={task.id} task={task} listType="later" userTags={userTags}
                                                        onDragStart={() => { }}
                                                        onDelete={id => handleDeleteTask(id, 'later')}
                                                        onToggleComplete={handleToggleComplete}
                                                        onMoveToList={handleMoveTaskToList}
                                                        onAddTag={handleAddTagToTask}
                                                        onRemoveTag={handleRemoveTagFromTask}
                                                        onOpenTagModal={handleOpenTagModal}
                                                        onEditTag={tag => handleOpenEditTagModal(tag, { taskId: task.id })}
                                                    />
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <h3 className="font-bold text-lg mb-6 dark:text-white flex items-center gap-2">
                                        <Activity size={20} className="text-[#6F00FF]" /> Weight Trend
                                    </h3>
                                    <WeightTrendChart entries={weightEntries} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <AnimatePresence>
                {isTagModalOpen && (
                    <TagModal
                        isOpen={isTagModalOpen}
                        onClose={() => { setIsTagModalOpen(false); setEditingTag(null); setTagModalTaskId(null); setTagModalHabitId(null); }}
                        onSave={handleCreateTag}
                        editTag={editingTag || undefined}
                        onDelete={editingTag ? () => handleDeleteTagByName(editingTag.name) : undefined}
                    />
                )}
                {isAddHabitOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800">
                            <HabitForm
                                initialHabit={null}
                                userTags={userTags}
                                onSave={(data) => {
                                    addHabit(data);
                                    setIsAddHabitOpen(false);
                                }}
                                onCancel={() => setIsAddHabitOpen(false)}
                                onCreateTag={() => setIsTagModalOpen(true)}
                            />
                        </div>
                    </div>
                )}
                {isSettingsOpen && (
                    <SettingsModal
                        isOpen={isSettingsOpen}
                        onClose={() => setIsSettingsOpen(false)}
                        user={user}
                        settings={settings}
                        googleAccount={googleAccount}
                        isGoogleConnecting={isGoogleConnecting}
                        googleApiReady={googleApiReady}
                        handleConnectGoogle={handleConnectGoogle}
                        handleDisconnectGoogle={handleDisconnectGoogle}
                        isDark={isDark}
                        toggleTheme={toggleTheme}
                        onLogout={onLogout}
                        setSettings={setSettings}
                        initialTab={settingsInitialTab}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]"
                    >
                        <div className={`px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
                            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                            {notification.message}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TimeboxApp;
