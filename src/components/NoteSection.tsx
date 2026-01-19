import React, { useRef, useState } from 'react';
import { Edit3, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface NoteSectionProps {
    notesContent: string;
    notesLoading: boolean;
    notesSaved: boolean;
    selectedDate: Date;
    onNotesChange: (content: string) => void;
}

const NoteSection = ({
    notesContent,
    notesLoading,
    notesSaved,
    selectedDate,
    onNotesChange
}: NoteSectionProps) => {
    return (
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm border border-slate-200 dark:border-white/5 p-4 flex flex-col h-full min-h-[400px]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
                        <Edit3 size={20} className="text-purple-600 dark:text-violet-400" />
                    </div>
                    <h2 className="font-bold text-lg text-slate-800 dark:text-white">Daily Notes</h2>
                </div>
                <div className="flex items-center gap-2">
                    {notesLoading && <Loader2 size={16} className="animate-spin text-slate-400" />}
                    {notesSaved && !notesLoading && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-1 text-emerald-500 text-xs font-medium"
                        >
                            <CheckCircle2 size={14} />
                            Saved
                        </motion.div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                    {notesContent.split('\n').map((line, lineIndex) => {
                        // Render Headings
                        if (line.startsWith('### ')) {
                            return (
                                <input
                                    key={lineIndex}
                                    type="text"
                                    value={line.substring(4)}
                                    onChange={(e) => {
                                        const lines = notesContent.split('\n');
                                        lines[lineIndex] = `### ${e.target.value}`;
                                        onNotesChange(lines.join('\n'));
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
                                        onNotesChange(lines.join('\n'));
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
                                        onNotesChange(lines.join('\n'));
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
                                    <span className="text-slate-500 dark:text-slate-400 mt-0.5">•</span>
                                    <input
                                        type="text"
                                        value={content}
                                        onChange={(e) => {
                                            const lines = notesContent.split('\n');
                                            lines[lineIndex] = isNumbered ? `1. ${e.target.value}` : `- ${e.target.value}`;
                                            onNotesChange(lines.join('\n'));
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
                                    onNotesChange(lines.join('\n'));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const lines = notesContent.split('\n');
                                        lines.splice(lineIndex + 1, 0, '');
                                        onNotesChange(lines.join('\n'));
                                        setTimeout(() => {
                                            const inputs = document.querySelectorAll('input[type="text"]');
                                            (inputs[lineIndex + 1] as HTMLInputElement)?.focus();
                                        }, 10);
                                    }
                                }}
                                className="w-full bg-transparent border-none outline-none text-slate-700 dark:text-slate-300 my-0.5"
                                placeholder={lineIndex === 0 && !notesContent ? `Write your notes for ${selectedDate.toLocaleDateString('sv-SE', { month: 'long', day: 'numeric' })}...` : ''}
                                disabled={notesLoading}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default NoteSection;
