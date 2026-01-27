import React, { useRef, useEffect } from 'react';
import { X, CheckCircle2, Circle, Activity, StickyNote, ListTodo, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Habit, Task } from '../types';
import { formatDateISO } from '../utils';

interface DayDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date;
    data: {
        habits: Habit[];
        tasks: { active: Task[]; later: Task[] };
        weight: number | null;
        note: string;
    };
}

const DayDetailsModal: React.FC<DayDetailsModalProps> = ({ isOpen, onClose, date, data }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const dateStr = formatDateISO(date);
    const completedHabits = data.habits.filter(h => h.completedDates.includes(dateStr));

    // Combine all tasks for display, maybe mark completed ones clearly
    const allTasks = [...data.tasks.active, ...data.tasks.later];
    const completedTasks = allTasks.filter(t => t.completed);
    const pendingTasks = allTasks.filter(t => !t.completed);

    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const sectionIconWrapClass = "w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm";

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        ref={modalRef}
                        className="bg-white dark:bg-[#151e32] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700/50 flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Day Summary</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{formattedDate}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Scroll */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                            {/* 1. Habits Section */}
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
                                    <div className={sectionIconWrapClass}>
                                        <Flame size={18} className="stroke-gradient" />
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Habits Completed</h3>
                                    <span className="ml-auto text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-2.5 py-1 rounded-full font-extrabold">
                                        {completedHabits.length}
                                    </span>
                                </div>

                                <div className="pt-4">
                                    {completedHabits.length > 0 ? (
                                        <div className="space-y-2">
                                            {completedHabits.map(habit => (
                                                <div key={habit.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-100 dark:border-white/10">
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full"
                                                        style={{ backgroundColor: habit.tagColor || '#6F00FF' }}
                                                    />
                                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{habit.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">No habits completed this day.</p>
                                    )}
                                </div>
                            </div>

                            {/* 2. Tasks Section */}
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
                                    <div className={sectionIconWrapClass}>
                                        <ListTodo size={18} className="stroke-gradient" />
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Tasks</h3>
                                    <span className="ml-auto text-xs bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-200 px-2.5 py-1 rounded-full font-extrabold">
                                        {completedTasks.length} / {allTasks.length}
                                    </span>
                                </div>

                                <div className="pt-4 space-y-2">
                                    {allTasks.length > 0 ? (
                                        allTasks.map(task => (
                                            <div key={task.id} className="flex items-start gap-3 text-sm">
                                                <div className={`mt-0.5 ${task.completed ? 'text-[#6F00FF]' : 'text-slate-300 dark:text-slate-600'}`}>
                                                    {task.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                                </div>
                                                <div className={`${task.completed ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                                    {task.title}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">No tasks recorded.</p>
                                    )}
                                </div>
                            </div>

                            {/* 3. Weight */}
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
                                    <div className={sectionIconWrapClass}>
                                        <Activity size={18} className="stroke-gradient" />
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Weight</h3>
                                </div>
                                <div className="pt-4">
                                    <div className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                                        {data.weight ? `${data.weight} kg` : <span className="text-slate-400 dark:text-slate-500 text-base font-medium italic">Not recorded</span>}
                                    </div>
                                </div>
                            </div>

                            {/* 4. Notes */}
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-5">
                                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
                                    <div className={sectionIconWrapClass}>
                                        <StickyNote size={18} className="stroke-gradient" />
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Notes</h3>
                                </div>
                                <div className="pt-4">
                                    <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-slate-100 dark:border-white/10">
                                        {data.note || <span className="italic text-slate-400 dark:text-slate-500">No notes for this day.</span>}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DayDetailsModal;
