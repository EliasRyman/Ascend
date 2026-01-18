import React, { useState, useEffect } from 'react';
import { Check, X, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (tagName: string, tagColor: string) => void;
    editTag?: { name: string; color: string } | null;
    onDelete?: () => void;
}

const TagModal = ({ isOpen, onClose, onSave, editTag, onDelete }: TagModalProps) => {
    const [tagName, setTagName] = useState('');
    const [tagColor, setTagColor] = useState('#6F00FF');

    useEffect(() => {
        if (editTag) {
            setTagName(editTag.name);
            setTagColor(editTag.color);
        } else {
            setTagName('');
            setTagColor('#6F00FF');
        }
    }, [editTag, isOpen]);

    const handleSave = () => {
        if (tagName.trim()) {
            onSave(tagName.trim(), tagColor);
            setTagName('');
            onClose();
        }
    };

    const colors = [
        '#6F00FF', '#4285F4', '#DB4437', '#F4B400', '#0F9D58',
        '#FF6D00', '#00BFA5', '#607D8B', '#E91E63', '#9C27B0'
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-sm bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-white/10"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Tag size={20} className="text-[#6F00FF]" />
                                {editTag ? 'Redigera tagg' : 'Ny tagg'}
                            </h3>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Namn</label>
                                <input
                                    type="text"
                                    value={tagName}
                                    onChange={(e) => setTagName(e.target.value)}
                                    placeholder="T.ex. Arbete, Skola..."
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6F00FF]/50"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Färg</label>
                                <div className="flex flex-wrap gap-2">
                                    {colors.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setTagColor(color)}
                                            className={`w-8 h-8 rounded-full transition-all transform hover:scale-110 flex items-center justify-center ${tagColor === color ? 'ring-2 ring-offset-2 ring-[#6F00FF] dark:ring-offset-[#1E293B]' : ''
                                                }`}
                                            style={{ backgroundColor: color }}
                                        >
                                            {tagColor === color && <Check size={14} className="text-white" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                {editTag && onDelete && (
                                    <button
                                        onClick={() => { onDelete(); onClose(); }}
                                        className="flex-1 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                    >
                                        Radera
                                    </button>
                                )}
                                <button
                                    onClick={handleSave}
                                    className="flex-[2] py-2.5 bg-gradient-to-r from-[#6F00FF] to-purple-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
                                >
                                    Spara
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TagModal;
