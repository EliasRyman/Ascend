import React, { useMemo, useState } from 'react';
import { Target, Clock, Calendar, ChevronLeft, ChevronRight, Flame } from 'lucide-react';

interface Habit {
    id: string;
    name: string;
    completedDates: string[]; // ISO date strings (YYYY-MM-DD)
}

interface ConsistencyCardProps {
    habits: Habit[];
}

const ConsistencyCard: React.FC<ConsistencyCardProps> = ({ habits }) => {
    const [viewRange, setViewRange] = useState<'week' | 'month' | 'year'>('year');
    const [currentDate, setCurrentDate] = useState(new Date());

    const handleNavigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (viewRange === 'year') {
            newDate.setFullYear(currentDate.getFullYear() + (direction === 'next' ? 1 : -1));
        } else if (viewRange === 'month') {
            newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        } else {
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        }
        setCurrentDate(newDate);
    };

    const getWeekNumber = (d: Date) => {
        const date = new Date(d.getTime());
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };

    // 1. Calculate Activity Data
    const { activityMap, totalActivities, currentStreak } = useMemo(() => {
        const map = new Map<string, number>();
        let total = 0;

        // Populate frequency map
        (habits || []).forEach(habit => {
            if (!habit) return;
            (habit.completedDates || []).forEach(date => {
                const count = map.get(date) || 0;
                map.set(date, count + 1);
                total++;
            });
        });

        // Calculate Streak
        // Streak = consecutive days ending today (or yesterday) where count > 0
        let streak = 0;
        const today = new Date();
        // Normalize today to YYYY-MM-DD
        const formatDate = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        let checkDate = new Date(today);
        let dateStr = formatDate(checkDate);

        // Check if today has activity
        if (!map.has(dateStr)) {
            // If not, check yesterday. If yesterday has activity, the streak is still alive.
            // If not, streak is 0.
            checkDate.setDate(checkDate.getDate() - 1);
            dateStr = formatDate(checkDate);

            if (!map.has(dateStr)) {
                // Streak broken
                streak = 0;
            } else {
                // Streak alive starting yesterday
                streak = 1;
                checkDate.setDate(checkDate.getDate() - 1); // Move to day before yesterday for loop
            }
        } else {
            streak = 1;
            checkDate.setDate(checkDate.getDate() - 1); // Move to yesterday for loop
        }

        // Continue checking backwards if we have a streak
        if (streak > 0) {
            while (true) {
                const dStr = formatDate(checkDate);
                if (map.has(dStr)) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }

        return { activityMap: map, totalActivities: total, currentStreak: streak };
    }, [habits]);

    // 2. Generate Grid Data based on viewRange
    const { gridData, totalCols, subText } = useMemo(() => {
        const data = [];
        let startDate: Date;
        let endDate: Date;
        let cols: number;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        if (viewRange === 'year') {
            // Full calendar year: Jan 1 to Dec 31
            startDate = new Date(year, 0, 1);
            const startDay = startDate.getDay();
            startDate.setDate(startDate.getDate() - startDay);
            cols = 53;

            for (let i = 0; i < cols * 7; i++) {
                const current = new Date(startDate);
                current.setDate(startDate.getDate() + i);

                const y = current.getFullYear();
                const m = String(current.getMonth() + 1).padStart(2, '0');
                const day = String(current.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${day}`;

                const count = activityMap.get(dateStr) || 0;
                let level = 0;
                if (count === 0) level = 0;
                else if (count <= 1) level = 1;
                else if (count <= 3) level = 2;
                else if (count <= 5) level = 3;
                else level = 4;

                data.push({
                    date: current,
                    dateStr,
                    count,
                    level
                });
            }
        } else if (viewRange === 'month') {
            // Full month: 1st to last day
            startDate = new Date(year, month, 1);
            const startDay = startDate.getDay();
            startDate.setDate(startDate.getDate() - startDay);

            const lastDay = new Date(year, month + 1, 0);
            const endDay = lastDay.getDay();
            const endDate = new Date(lastDay);
            endDate.setDate(lastDay.getDate() + (6 - endDay));

            cols = Math.ceil(((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1) / 7);

            for (let i = 0; i < cols * 7; i++) {
                const current = new Date(startDate);
                current.setDate(startDate.getDate() + i);

                const y = current.getFullYear();
                const m = String(current.getMonth() + 1).padStart(2, '0');
                const day = String(current.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${day}`;

                const count = activityMap.get(dateStr) || 0;
                let level = 0;
                if (count === 0) level = 0;
                else if (count <= 1) level = 1;
                else if (count <= 3) level = 2;
                else if (count <= 5) level = 3;
                else level = 4;

                data.push({
                    date: current,
                    dateStr,
                    count,
                    level
                });
            }
        } else {
            // Week: Current week
            startDate = new Date(currentDate);
            const startDay = startDate.getDay();
            startDate.setDate(startDate.getDate() - startDay);
            cols = 1;

            for (let i = 0; i < 7; i++) {
                const current = new Date(startDate);
                current.setDate(startDate.getDate() + i);

                const y = current.getFullYear();
                const m = String(current.getMonth() + 1).padStart(2, '0');
                const day = String(current.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${day}`;

                const count = activityMap.get(dateStr) || 0;
                let level = 0;
                if (count === 0) level = 0;
                else if (count <= 1) level = 1;
                else if (count <= 3) level = 2;
                else if (count <= 5) level = 3;
                else level = 4;

                data.push({
                    date: current,
                    dateStr,
                    count,
                    level
                });
            }
        }

        // Calculate Subtext
        let text = "";
        if (viewRange === 'year') {
            let yearTotal = 0;
            activityMap.forEach((count, date) => {
                if (date.startsWith(String(year))) yearTotal += count;
            });
            text = `${yearTotal} ${yearTotal === 1 ? 'activity' : 'activities'} in ${year}`;
        } else if (viewRange === 'month') {
            let monthTotal = 0;
            const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
            activityMap.forEach((count, date) => {
                if (date.startsWith(prefix)) monthTotal += count;
            });
            const monthName = currentDate.toLocaleString('default', { month: 'long' });
            text = `${monthTotal} ${monthTotal === 1 ? 'activity' : 'activities'} in ${monthName} ${year}`;
        } else {
            text = `Week ${getWeekNumber(currentDate)}, ${year}`;
        }

        return { gridData: data, totalCols: cols, subText: text };
    }, [activityMap, viewRange, currentDate, getWeekNumber]);

    // 3. Grid Labels
    const gridLabels = useMemo(() => {
        const labels: { text: string, colIndex: number, type?: 'month' | 'week' }[] = [];
        if (viewRange === 'year') {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            for (let col = 0; col < totalCols; col++) {
                const dayIndex = col * 7;
                if (dayIndex >= gridData.length) break;
                const date = gridData[dayIndex].date;
                if (date.getDate() <= 7) {
                    labels.push({ text: months[date.getMonth()], colIndex: col });
                }
            }
        } else if (viewRange === 'month') {
            for (let col = 0; col < totalCols; col++) {
                const dayIndex = col * 7;
                if (dayIndex >= gridData.length) break;
                const date = gridData[dayIndex].date;
                labels.push({ text: `W${getWeekNumber(date)}`, colIndex: col, type: 'week' });
            }
        } else if (viewRange === 'week') {
            // No grid-level labels needed for single week view as it's in the header
        }
        return labels;
    }, [gridData, viewRange, totalCols]);

    // Color functions
    const getCellColor = (level: number) => {
        // Purple theme
        switch (level) {
            case 0: return 'bg-slate-100 dark:bg-slate-800'; // Empty
            case 1: return 'bg-purple-200 dark:bg-purple-900/40';
            case 2: return 'bg-purple-300 dark:bg-purple-700/60';
            case 3: return 'bg-purple-400 dark:bg-purple-600';
            case 4: return 'bg-[#6F00FF] dark:bg-[#6F00FF] shadow-sm shadow-purple-500/30';
            default: return 'bg-slate-100 dark:bg-slate-800';
        }
    };

    return (
        <div className="bg-white dark:bg-[#151e32] rounded-3xl p-6 shadow-sm dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-white/5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
                        <Flame className="text-purple-600 dark:text-violet-400" size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Habit Consistency</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Period Display */}
                    <div className="flex items-center bg-slate-100 dark:bg-white/10 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                        <span className="text-sm font-bold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
                            {viewRange === 'month'
                                ? currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
                                : viewRange === 'week'
                                    ? `Week ${getWeekNumber(currentDate)}, ${currentDate.getFullYear()}`
                                    : currentDate.getFullYear()
                            }
                        </span>
                    </div>

                    {/* Range Selector */}
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                        {(['week', 'month', 'year'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setViewRange(range)}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${viewRange === range
                                    ? 'bg-white dark:bg-violet-600 text-violet-600 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                            >
                                {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'Year'}
                            </button>
                        ))}
                    </div>

                    <div className="text-right ml-4">
                        <div className="text-2xl font-bold text-slate-800 dark:text-white">{currentStreak} <span className="text-sm font-normal text-slate-400 dark:text-slate-500">day streak</span></div>
                    </div>
                </div>
            </div>

            {/* The Grid Scroller */}
            <div className="pb-4">
                <div className="w-full relative">
                    {/* Month/Week Labels */}
                    <div className="w-full mb-8 text-[10px] md:text-xs text-slate-400 dark:text-slate-500 relative h-4">
                        {gridLabels.map((label, i) => (
                            <div
                                key={i}
                                className={`absolute transform ${label.type === 'month' ? 'text-sm font-bold text-slate-700 dark:text-slate-200 -translate-y-6' : '-translate-x-1/2'}`}
                                style={{
                                    left: label.type === 'month' ? '0' : `${((label.colIndex + 0.5) / 53) * 100}%`,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {label.text}
                            </div>
                        ))}
                    </div>

                    {/* The Grid */}
                    <div className="flex gap-[3px]">
                        {/* Render Columns */}
                        {Array.from({ length: totalCols }).map((_, colIndex) => (
                            <div
                                key={colIndex}
                                className="flex flex-col gap-[3px]"
                                style={{ width: 'calc((100% - 52 * 3px) / 53)' }}
                            >
                                {/* Render Rows (Days) */}
                                {Array.from({ length: 7 }).map((_, rowIndex) => {
                                    const dataIndex = colIndex * 7 + rowIndex;
                                    const cellData = gridData[dataIndex];

                                    if (!cellData) return <div key={rowIndex} className="w-full aspect-square opacity-0" />;

                                    return (
                                        <div
                                            key={rowIndex}
                                            className={`w-full aspect-square rounded-[1.5px] md:rounded-sm transition-colors ${getCellColor(cellData.level)} group relative`}
                                        >
                                            {/* Tooltip on hover */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                                                {cellData.count} activities<br />
                                                <span className="opacity-70">{cellData.dateStr}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-end mt-4 gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <span>Less</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800"></div>
                            <div className="w-3 h-3 rounded-sm bg-purple-200 dark:bg-purple-900/40"></div>
                            <div className="w-3 h-3 rounded-sm bg-purple-300 dark:bg-purple-700/60"></div>
                            <div className="w-3 h-3 rounded-sm bg-purple-400 dark:bg-purple-600"></div>
                            <div className="w-3 h-3 rounded-sm bg-[#6F00FF] dark:bg-[#6F00FF]"></div>
                        </div>
                        <span>More</span>
                    </div>

                    {/* Year Navigation - Only show in year view */}
                    {viewRange === 'year' && (
                        <div className="flex justify-center gap-2 mt-4">
                            <button
                                onClick={() => {
                                    const newDate = new Date(currentDate);
                                    newDate.setFullYear(currentDate.getFullYear() - 1);
                                    setCurrentDate(newDate);
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-all border border-slate-200 dark:border-white/5"
                            >
                                Last year
                            </button>
                            {currentDate.getFullYear() !== new Date().getFullYear() && (
                                <button
                                    onClick={() => setCurrentDate(new Date())}
                                    className="px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 rounded-lg transition-all border border-violet-200 dark:border-violet-500/30"
                                >
                                    Current year
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConsistencyCard;
