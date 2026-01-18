import React, { useState, useEffect, useRef } from 'react';
import {
    Check,
    MoreVertical,
    MoveRight,
    Plus,
    Edit3,
    Tag,
    ChevronDown,
    ChevronRight,
    X,
    Trash2
} from 'lucide-react';
import { Task } from '../types';

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
    onEditTag
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
                className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${task.completed ? 'bg-[#6F00FF] border-[#6F00FF]' : 'border-slate-300 dark:border-slate-600 hover:border-[#6F00FF]'}`}
            >
                {task.completed && <Check size={14} className="text-white" />}
            </div>
            <span className={`flex-1 text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {task.title}
            </span>
            {task.tag && (
                <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide text-white"
                    style={{ backgroundColor: task.tagColor || '#6F00FF' }}
                >
                    {task.tag}
                </span>
            )}
            {task.time && (
                <span className="text-[10px] opacity-70 text-slate-600 dark:text-slate-400">
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
                        <button onClick={() => { onOpenTagModal(task.id); setIsMenuOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                            <Plus size={14} /> Create Tag
                        </button>
                        {task.tag && task.tagColor && onEditTag && (
                            <button onClick={() => { onEditTag({ name: task.tag!, color: task.tagColor! }); setIsMenuOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                <Edit3 size={14} /> Edit Tag
                            </button>
                        )}
                        <div className="relative">
                            <button onClick={() => setIsTagSubmenuOpen(!isTagSubmenuOpen)} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 justify-between">
                                <span className="flex items-center gap-2"><Tag size={14} /> Add Tag</span>
                                {isTagSubmenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            {isTagSubmenuOpen && userTags.length > 0 && (
                                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                    {userTags.map((tag, idx) => (
                                        <button key={idx} onClick={() => { onAddTag(task.id, tag.name, tag.color); setIsMenuOpen(false); setIsTagSubmenuOpen(false); }} className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                                            <span className="text-slate-600 dark:text-slate-300 text-sm">{tag.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {isTagSubmenuOpen && userTags.length === 0 && (
                                <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 py-2 px-4 text-xs text-slate-400">No tags yet</div>
                            )}
                        </div>
                        {task.tag && (
                            <button onClick={() => { onRemoveTag(task.id); setIsMenuOpen(false); }} className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200">
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
        </div>
    );
};

export default TaskItem;
