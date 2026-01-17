import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

interface WeightEntry {
    date: string;
    weight: number;
}

interface WeightTrendChartProps {
    entries: WeightEntry[];
    height?: number;
}

export const WeightTrendChart: React.FC<WeightTrendChartProps> = ({ entries, height = 240 }) => {
    const [hoveredX, setHoveredX] = useState<number | null>(null);

    // 1. Process Data & Calculate Moving Average
    const processedData = useMemo(() => {
        if (entries.length < 2) return null;

        // Sort by date just in case
        const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate 7-day Moving Average (Trend)
        const withTrend = sorted.map((entry, index) => {
            // Get window of past 7 entries (including current)
            const start = Math.max(0, index - 6);
            const window = sorted.slice(start, index + 1);
            const trendWeight = window.reduce((sum, e) => sum + e.weight, 0) / window.length;
            return { ...entry, trendWeight };
        });

        return withTrend;
    }, [entries]);

    if (!processedData || processedData.length < 2) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 text-sm select-none">
                <BarChart3 className="mb-2 opacity-50" size={24} />
                <div>Need at least 2 entries to see your trend</div>
            </div>
        );
    }

    // 2. Chart Dimensions & Scales
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = 1000; // SVG internal coordinate system width (high resolution)
    const chartHeight = height;
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    // Calculate Min/Max for Y-Axis (Weight)
    const allWeights = processedData.flatMap(d => [d.weight, d.trendWeight]);
    const minWeight = Math.floor(Math.min(...allWeights) - 0.5);
    const maxWeight = Math.ceil(Math.max(...allWeights) + 0.5);
    const weightRange = maxWeight - minWeight;

    // Helper: Map data point to SVG coordinates
    const getX = (index: number) => padding.left + (index / (processedData.length - 1)) * innerWidth;
    const getY = (weight: number) => padding.top + innerHeight - ((weight - minWeight) / weightRange) * innerHeight;

    // 3. Generate Paths
    const points = processedData.map((d, i) => ({
        x: getX(i),
        yRaw: getY(d.weight),
        yTrend: getY(d.trendWeight),
        data: d
    }));

    // Raw Data Line Path (Linear)
    const rawPath = points.reduce((path, p, i) => {
        return i === 0 ? `M ${p.x} ${p.yRaw}` : `${path} L ${p.x} ${p.yRaw}`;
    }, '');

    // Trendline Path (Smooth Bezier)
    const trendPath = points.reduce((path, p, i) => {
        if (i === 0) return `M ${p.x} ${p.yTrend}`;
        const prev = points[i - 1];
        const cpx1 = prev.x + (p.x - prev.x) / 3; // Control points for smoothing
        const cpx2 = p.x - (p.x - prev.x) / 3;
        return `${path} C ${cpx1} ${prev.yTrend}, ${cpx2} ${p.yTrend}, ${p.x} ${p.yTrend}`;
    }, '');

    // Trend Area Path (for gradient fill)
    const trendAreaPath = `${trendPath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`;

    // 4. Generate Axis Labels
    const yLabels = Array.from({ length: 5 }).map((_, i) => {
        const val = minWeight + (weightRange * i) / 4;
        return { y: getY(val), value: val.toFixed(1) };
    });

    // Smart X-Axis: Show max 6 labels
    const xLabels = points.filter((_, i) => {
        if (i === 0 || i === points.length - 1) return true;
        const step = Math.ceil(points.length / 5);
        return i % step === 0;
    }).map(p => ({
        x: p.x,
        label: new Date(p.data.date).toLocaleDateString('sv-SE', {
            day: 'numeric',
            month: points.length > 30 ? 'short' : 'numeric'
        })
    }));

    // 5. Interaction Handler
    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const svgRect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - svgRect.left;
        // Scale mouseX to SVG coordinates width
        const svgX = (mouseX / svgRect.width) * width;

        // Find nearest point
        if (svgX < padding.left || svgX > width - padding.right) return;

        // Binary search or simple find for closest point
        let closestDist = Infinity;
        let closestPoint = null;

        points.forEach(p => {
            const dist = Math.abs(p.x - svgX);
            if (dist < closestDist) {
                closestDist = dist;
                closestPoint = p;
            }
        });

        if (closestPoint) {
            setHoveredX(closestPoint.data.date ? new Date(closestPoint.data.date).getTime() : null);
        }
    };

    const hoveredPoint = hoveredX ? points.find(p => new Date(p.data.date).getTime() === hoveredX) : null;

    return (
        <div className="relative w-full h-full select-none font-sans">
            <svg
                viewBox={`0 0 ${width} ${chartHeight}`}
                className="w-full h-full overflow-visible touch-none"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredX(null)}
            >
                <defs>
                    {/* Enhanced Gradient */}
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6F00FF" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#6F00FF" stopOpacity="0" />
                    </linearGradient>

                    {/* Glow Filter */}
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* Grid Lines */}
                {yLabels.map((l, i) => (
                    <g key={`yGrid-${i}`}>
                        <line
                            x1={padding.left} y1={l.y}
                            x2={width - padding.right} y2={l.y}
                            stroke="currentColor"
                            className="text-slate-200 dark:text-slate-800"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                        />
                        <text
                            x={padding.left - 10} y={l.y + 4}
                            textAnchor="end"
                            className="text-[10px] fill-slate-400 font-medium"
                        >
                            {l.value}
                        </text>
                    </g>
                ))}

                {/* X-Axis Labels */}
                {xLabels.map((l, i) => (
                    <text
                        key={`xLabel-${i}`}
                        x={l.x}
                        y={chartHeight - 10}
                        textAnchor="middle"
                        className="text-[10px] fill-slate-400 font-medium"
                    >
                        {l.label}
                    </text>
                ))}

                {/* --- RAW DATA LINES (Thin, subtle) --- */}
                <path
                    d={rawPath}
                    fill="none"
                    stroke="currentColor"
                    className="text-slate-300 dark:text-slate-700"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.6"
                />
                {/* Raw Points (Small) */}
                {points.map((p, i) => (
                    <circle
                        key={`rawPoint-${i}`}
                        cx={p.x} cy={p.yRaw} r="2"
                        className="fill-slate-300 dark:fill-slate-700"
                    />
                ))}

                {/* --- TREND LINE (Main Event) --- */}
                <motion.path
                    d={trendAreaPath}
                    fill="url(#trendGradient)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                />
                <motion.path
                    d={trendPath}
                    fill="none"
                    stroke="#6F00FF"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                />

                {/* Interactive Hover Line */}
                {hoveredPoint && (
                    <motion.line
                        x1={hoveredPoint.x} y1={padding.top}
                        x2={hoveredPoint.x} y2={chartHeight - padding.bottom}
                        stroke="#6F00FF"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    />
                )}

                {/* Hover Points Highlight */}
                {hoveredPoint && (
                    <>
                        {/* Raw Point Highlight */}
                        <circle cx={hoveredPoint.x} cy={hoveredPoint.yRaw} r="4" className="fill-slate-400 stroke-white dark:stroke-slate-900 border-2" />
                        {/* Trend Point Highlight (Main) */}
                        <motion.circle
                            cx={hoveredPoint.x} cy={hoveredPoint.yTrend}
                            r="6"
                            className="fill-[#6F00FF] stroke-white dark:stroke-slate-900 stroke-2"
                            transition={{ type: "spring" }}
                        />
                    </>
                )}
            </svg>

            {/* Floating Tooltip HTML Overlay */}
            <AnimatePresence>
                {hoveredPoint && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute z-50 pointer-events-none"
                        style={{
                            left: `${(hoveredPoint.x / width) * 100}%`,
                            top: 0, // Position at top of chart area usually looks cleanest
                            transform: 'translate(-50%, 0)'
                        }}
                    >
                        <div className="mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-white/10 shadow-xl rounded-xl p-3 text-xs min-w-[120px]">
                            <div className="font-bold text-slate-700 dark:text-slate-200 mb-2 pb-2 border-b border-slate-100 dark:border-white/5 text-center">
                                {new Date(hoveredPoint.data.date).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-1.5 text-slate-500">
                                        <div className="w-2 h-2 rounded-full bg-[#6F00FF]" /> Trend
                                    </span>
                                    <span className="font-bold text-[#6F00FF]">{hoveredPoint.data.trendWeight.toFixed(1)} kg</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-slate-300" /> Raw
                                    </span>
                                    <span>{hoveredPoint.data.weight.toFixed(1)} kg</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
