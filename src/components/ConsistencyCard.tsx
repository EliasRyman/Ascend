import React, { useMemo } from 'react';
import { Target } from 'lucide-react';

interface Habit {
    id: string;
    name: string;
    completedDates: string[]; // ISO date strings (YYYY-MM-DD)
}

interface ConsistencyCardProps {
    habits: Habit[];
}

const ConsistencyCard: React.FC<ConsistencyCardProps> = ({ habits }) => {
    // 1. Calculate Activity Data
    const { activityMap, totalActivities, currentStreak } = useMemo(() => {
        const map = new Map<string, number>();
        let total = 0;

        // Populate frequency map
        habits.forEach(habit => {
            habit.completedDates.forEach(date => {
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

    // 2. Generate Grid Data (Last 365 days / 52 weeks)
    // We want to align columns by week (Sunday start)
    const gridData = useMemo(() => {
        const today = new Date();
        const daysToRender = [];
        // We want roughly 52 weeks (364 days) + alignment
        // Let's just create a grid for the last 53 weeks to ensure coverage
        const endDate = new Date(today);

        // Start date: Go back 52 full weeks + current week days
        // Actually, GitHub style is usually fixed columns (52 or 53).
        // Let's generate days for the last 365 days, but aligned to start on a Sunday?
        // User wants "Calendar" style.
        // Let's generate exactly 53 weeks of data ending with current week.

        // Find the Sunday of the current week
        const currentDay = today.getDay(); // 0 = Sunday
        // We want the last day of our grid to be this coming Saturday, or today?
        // Usually these graphs go left-to-right, ending at Today (rightmost).

        // Let's construct it backwards from Today, filling 53 columns * 7 rows

        const rows = 7;
        const cols = 53;
        const totalDays = rows * cols;

        const data = [];
        // Start from `totalDays` ago (roughly)
        // Actually, to align typical contribution graph:
        // It's a grid where columns are weeks.
        // Last column is current week.
        // Last cell in last column is Saturday (if row 0 is Sunday).

        // Let's assume standard: Sunday (Row 0) -> Saturday (Row 6)
        // Last column (Index 52)
        // We need to find the date for Column 0, Row 0.

        // End Date = Today.
        // But to make the grid neat, let's say the last column contains Today.

        // Let's generate a flat array of dates that fits into a 7x53 grid.
        // The very last cell (Col 52, Row 6) should be the Saturday of the specific week containing Today?
        // Or just ensure Today is visible.

        // Let's pivot:
        // Determine the Saturday of the current week.
        const dayOfWeek = today.getDay(); // 0(Sun) - 6(Sat)
        const offsetToSaturday = 6 - dayOfWeek;
        const endOfGridDate = new Date(today);
        endOfGridDate.setDate(today.getDate() + offsetToSaturday); // This is the Saturday of current week

        // Now generate 7 * 53 days backwards from endOfGridDate
        for (let i = (totalDays - 1); i >= 0; i--) {
            const d = new Date(endOfGridDate);
            d.setDate(endOfGridDate.getDate() - i);

            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${day}`;

            const count = activityMap.get(dateStr) || 0;

            let level = 0;
            if (count === 0) level = 0;
            else if (count <= 1) level = 1;
            else if (count <= 3) level = 2;
            else if (count <= 5) level = 3;
            else level = 4;

            data.push({
                date: d,
                dateStr,
                count,
                level
            });
        }
        return data;
    }, [activityMap]);

    // Months labels
    // We need to place labels above the columns.
    // A label appears if a month starts in that column (or roughly).
    const monthLabels = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const labels: { text: string, colIndex: number }[] = [];

        // Iterate through columns (every 7 days)
        for (let col = 0; col < 53; col++) {
            const dayIndex = col * 7; // The Sunday of that week
            if (dayIndex >= gridData.length) break;
            const date = gridData[dayIndex].date;

            // If this is the first week of the month, add label
            // Heuristic: If date is 1-7, it's the first week (roughly)
            if (date.getDate() <= 7) {
                // Only add if we haven't just added one (to avoid crowding)
                // But simpler: just check if month changed from previous column?
                // Let's just use the date check.
                labels.push({ text: months[date.getMonth()], colIndex: col });
            }
        }
        return labels;
    }, [gridData]);

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
        <div className="bg-white dark:bg-[#151e32] rounded-3xl p-8 shadow-sm dark:shadow-lg dark:shadow-black/20 border border-slate-200 dark:border-white/5">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Target className="text-[#6F00FF]" size={24} />
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Track your progress</h2>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md">
                        Stay consistent with your productivity by tracking your to-do completion over time with our activity calendar.
                    </p>
                </div>

                {/* Call to action (Upsell) or just Stats if already pro? 
            For now, user requested a "Streak View", let's replicate the design roughly. 
            The design had "Start your 14-day free trial" which implies this might be a locked feature or just an upsell component.
            But user asked "add streak view", implying functionality. 
            I will show the Stats instead of the button, as it's more useful for the user.
        */}
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-[#0f1623]">
                <div className="mb-6">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Consistency</p>
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white">{currentStreak} day streak</h3>
                        <span className="text-sm text-slate-400 dark:text-slate-500">{totalActivities} activities in the last year</span>
                    </div>
                </div>

                {/* The Grid Scroller for mobile */}
                <div className="overflow-x-auto pb-2 custom-scrollbar">
                    <div className="min-w-[700px]">
                        {/* Month Labels */}
                        <div className="flex mb-2 text-xs text-slate-400 dark:text-slate-500 relative h-4">
                            {monthLabels.map((label, i) => (
                                <div
                                    key={i}
                                    className="absolute transform"
                                    style={{ left: `${(label.colIndex / 53) * 100}%` }}
                                >
                                    {label.text}
                                </div>
                            ))}
                        </div>

                        {/* The Grid */}
                        <div className="flex gap-[3px]">
                            {/* Render Columns */}
                            {Array.from({ length: 53 }).map((_, colIndex) => (
                                <div key={colIndex} className="flex flex-col gap-[3px]">
                                    {/* Render Rows (Days) */}
                                    {Array.from({ length: 7 }).map((_, rowIndex) => {
                                        const dataIndex = colIndex * 7 + rowIndex;
                                        const cellData = gridData[dataIndex];

                                        if (!cellData) return <div key={rowIndex} className="w-3 h-3 md:w-4 md:h-4 opacity-0" />;

                                        return (
                                            <div
                                                key={rowIndex}
                                                className={`w-3 h-3 md:w-3.5 md:h-3.5 rounded-sm transition-colors ${getCellColor(cellData.level)} group relative`}
                                                title={`${cellData.count} activities on ${cellData.date.toDateString()}`}
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConsistencyCard;
