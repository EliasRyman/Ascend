export interface Task {
    id: string | number;
    title: string;
    tag: string | null;
    tagColor: string | null;
    time: string | null;
    completed: boolean;
    completedAt?: string | null;
    assignedDate?: string | null;
    isRecurring?: boolean;
    recurrencePattern?: string;
    parentTaskId?: string;
    createdAt?: string;
    listType?: 'active' | 'later';
}

export interface Habit {
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

export interface ScheduleBlock {
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
    calendarId?: string;
    canEdit?: boolean;
    colorId?: string;
}

export interface UserSettings {
    timeFormat: '12h' | '24h';
    timezone: string;
    googleConnected: boolean;
}

export interface WeightEntry {
    id: string;
    weight: number;
    date: string; // ISO date string
    userId: string;
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const GOOGLE_COLORS = [
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
