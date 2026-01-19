import React from 'react';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDateISO } from '../utils';
import { WeightEntry } from '../types';

interface WeightSectionProps {
    weightEntries: WeightEntry[];
    newWeight: string;
    setNewWeight: (val: string) => void;
    onAddWeight: () => void;
}

const WeightSection = ({
    weightEntries,
    newWeight,
    setNewWeight,
    onAddWeight
}: WeightSectionProps) => {
    const todayString = formatDateISO(new Date());
    const todayEntry = weightEntries.find(e => e.date === todayString);

    // Get previous weight (last entry before today, or last entry if no today entry)
    const previousEntry = todayEntry
        ? weightEntries.filter(e => e.date !== todayString).slice(-1)[0]
        : weightEntries.slice(-1)[0];

    const hasEntries = weightEntries.length > 0;
    const change = todayEntry && previousEntry ? todayEntry.weight - previousEntry.weight : null;

    return (
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-slate-200 dark:border-white/5 p-4">
            <div className="flex items-center gap-2 mb-4">
                <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
                    <Activity size={20} className="text-purple-600 dark:text-violet-400" />
                </div>
                <h2 className="font-bold text-lg text-slate-800 dark:text-white">Weight Tracker</h2>
            </div>

            {/* Stats */}
            <div className="space-y-2 mb-4">
                {/* Previous weight */}
                {previousEntry && (
                    <div className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">Previous weight:</div>
                            <div className="text-xs text-slate-500">({new Date(previousEntry.date).toLocaleDateString('sv-SE')})</div>
                        </div>
                        <span className="text-lg font-bold text-slate-800 dark:text-white">{previousEntry.weight} kg</span>
                    </div>
                )}

                {/* Today's weight */}
                {todayEntry && (
                    <div className="flex items-center justify-between py-2 px-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <div className="text-sm text-emerald-700 dark:text-emerald-400">Today's weight:</div>
                        <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                            {todayEntry.weight} kg
                        </span>
                    </div>
                )}

                {/* Change */}
                {change !== null && (
                    <div className="flex items-center justify-between py-2 px-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                        <div className="text-sm text-[#6F00FF] dark:text-violet-400">Change:</div>
                        <div className="flex items-center gap-1 font-bold text-[#6F00FF] dark:text-violet-400">
                            <span className="text-lg">{change < 0 ? '↓' : '↑'}</span>
                            <span className="text-lg">{Math.abs(change).toFixed(1)} kg</span>
                        </div>
                    </div>
                )}

                {!hasEntries && (
                    <div className="text-center py-4 text-slate-400 text-sm">
                        No weight entries yet
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
                <input
                    type="number"
                    step="0.1"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="Enter weight (kg)"
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#0B1121] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/50"
                    onKeyDown={(e) => { if (e.key === 'Enter') onAddWeight(); }}
                />
                <motion.button
                    onClick={onAddWeight}
                    className="px-6 py-2 bg-gradient-to-r from-[#6F00FF] to-purple-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30"
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Log
                </motion.button>
            </div>
        </div>
    );
};

export default WeightSection;
