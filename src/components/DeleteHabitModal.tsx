import React from 'react';
import { X, Trash2, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DeleteHabitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDeleteForever: () => void;
    onArchive: () => void;
    habitName: string;
}

const DeleteHabitModal: React.FC<DeleteHabitModalProps> = ({
    isOpen,
    onClose,
    onDeleteForever,
    onArchive,
    habitName,
}) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800"
                >
                    {/* Header */}
                    <div className="p-6 pb-0 flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                Delete "{habitName}"?
                            </h2>
                            <p className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
                                Are you sure you want to delete?
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                Choose how you want to remove this habit.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 -mt-2 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Options */}
                    <div className="p-6 space-y-3">
                        <button
                            onClick={onArchive}
                            className="w-full group flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all text-left"
                        >
                            <div className="p-3 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                <Archive className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                                    Delete from this date
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Stop tracking this habit from today onwards. Past history and consistency data will be kept.
                                </p>
                            </div>
                        </button>

                        <button
                            onClick={onDeleteForever}
                            className="w-full group flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all text-left"
                        >
                            <div className="p-3 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-red-700 dark:group-hover:text-red-300">
                                    Delete from database
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Completely remove this habit and all its history. This action cannot be undone.
                                </p>
                            </div>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DeleteHabitModal;
