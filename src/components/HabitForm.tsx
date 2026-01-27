import React, { useState } from 'react';
import { Check, X, Activity, Flame, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Habit } from '../types';

interface HabitFormProps {
    initialHabit?: Habit | null;
    userTags: { name: string; color: string }[];
    onSave: (data: Omit<Habit, 'id' | 'currentStreak' | 'longestStreak' | 'completedDates' | 'createdAt'>) => void;
    onCancel: () => void;
    onDelete?: () => void;
    onCreateTag: () => void;
}

const HabitForm = ({ initialHabit, userTags, onSave, onCancel, onDelete, onCreateTag }: HabitFormProps) => {
    const [name, setName] = useState(initialHabit?.name || '');
    const [tag, setTag] = useState(initialHabit?.tag || '');
    const [frequency, setFrequency] = useState<'daily' | 'weekly'>(initialHabit?.frequency || 'daily');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const tagColor = userTags.find(t => t.name === tag)?.color || null;

        onSave({
            name: name.trim(),
            tag: tag || null,
            tagColor,
            frequency,
            scheduledDays: [0, 1, 2, 3, 4, 5, 6], // Always daily for now
            scheduledStartTime: null,
            scheduledEndTime: null,
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 mb-6 shadow-sm"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 font-body italic">Habit Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="T.ex. Meditera, Träna, Läsa..."
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/50 transition-all"
                                autoFocus
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 font-body italic">Tag (Optional)</label>
                                <button
                                    type="button"
                                    onClick={onCreateTag}
                                    className="text-xs text-[#6F00FF] font-bold hover:underline"
                                >
                                    + New Tag
                                </button>
                            </div>
                            <select
                                value={tag}
                                onChange={(e) => setTag(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/50 transition-all appearance-none"
                            >
                                <option value="">No tag</option>
                                {userTags.map(t => (
                                    <option key={t.name} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2 font-body italic">Frequency</label>
                            <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setFrequency('daily')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${frequency === 'daily'
                                        ? 'bg-white dark:bg-white/10 text-[#6F00FF] shadow-sm'
                                        : 'text-slate-500'
                                        }`}
                                >
                                    <Flame size={16} /> Daily
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFrequency('weekly')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${frequency === 'weekly'
                                        ? 'bg-white dark:bg-white/10 text-[#6F00FF] shadow-sm'
                                        : 'text-slate-500'
                                        }`}
                                >
                                    <Activity size={16} /> Weekly
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <div className="p-3 bg-violet-50 dark:bg-violet-900/10 rounded-xl border border-violet-100 dark:border-violet-900/30 flex items-start gap-3">
                                <Zap size={18} className="text-[#6F00FF] shrink-0 mt-0.5" />
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Habits appear in your daily checklist. Complete them daily to build your streak and stay consistent.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {initialHabit && onDelete && (
                    <button
                        type="button"
                        onClick={onDelete}
                        className="w-full py-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-extrabold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-all border border-red-200 dark:border-red-900/30"
                    >
                        DELETE HABIT
                    </button>
                )}

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex-[2] py-3 bg-gradient-to-r from-[#6F00FF] to-purple-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 flex items-center justify-center gap-2"
                    >
                        <Check size={18} /> {initialHabit ? 'Uppdatera habit' : 'Skapa habit'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

export default HabitForm;
