import React, { useId, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
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
    const id = useId();
    const [hoveredX, setHoveredX] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

    // 1. Process Data
    const processedData = useMemo(() => {
        if (entries.length < 2) return null;

        // Sort by date just in case
        const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return sorted;
    }, [entries]);

    if (!processedData || processedData.length < 2) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 text-sm select-none">
                <BarChart3 className="mb-2 opacity-50" size={24} />
                <div>Need at least 2 entries to see your stats</div>
            </div>
        );
    }

    // 2. Chart Dimensions & Scales
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = 1000;
    const chartHeight = height;
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    // Calculate Min/Max for Y-Axis (Raw Weight Only)
    const allWeights = processedData.map(d => d.weight);
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
        data: d
    }));

    // Raw Data Line Path (Linear)
    const rawPath = points.reduce((path, p, i) => {
        return i === 0 ? `M ${p.x} ${p.yRaw}` : `${path} L ${p.x} ${p.yRaw}`;
    }, '');

    // Raw Area Path (for gradient fill)
    const rawAreaPath = `${rawPath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${padding.left} ${padding.top + innerHeight} Z`;

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
        const svgX = (mouseX / svgRect.width) * width;

        if (svgX < padding.left || svgX > width - padding.right) return;

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

            // Calculate screen position for portal
            const pointScreenX = svgRect.left + (closestPoint.x / width) * svgRect.width;
            const pointScreenY = svgRect.top; // Position at the top of the chart container, or follow mouse
            // Currently using stored yRaw is hard since we need screen coordinates relative to svgRect
            // Better to position tooltip above the chart area for safety, or we map Y coordinate too.
            // Let's map Y coordinate to screen space:
            const pointYRel = closestPoint.yRaw / height; // Ratio in SVG
            // Wait, closestPoint.yRaw is in SVG coords (0 to height)
            const pointScreenYExact = svgRect.top + (closestPoint.yRaw / height) * svgRect.height;

            // Let's position it at the top of the chart for stability like before?
            // Or follow the point? User showed it clipped on the right.
            // Following the point Y is better UX.
            setTooltipPos({ x: pointScreenX, y: pointScreenYExact });
        }
    };

    const hoveredPoint = hoveredX ? points.find(p => new Date(p.data.date).getTime() === hoveredX) : null;
    const hoveredIndex = hoveredPoint ? points.indexOf(hoveredPoint) : -1;
    const prevPoint = hoveredIndex > 0 ? points[hoveredIndex - 1] : null;
    const weightChange = hoveredPoint && prevPoint ? hoveredPoint.data.weight - prevPoint.data.weight : 0;

    return (
        <div className="relative w-full h-full select-none font-sans">
            <svg
                viewBox={`0 0 ${width} ${chartHeight}`}
                className="w-full h-full overflow-visible touch-none"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => { setHoveredX(null); setTooltipPos(null); }}
            >
                <defs>
                    <linearGradient id={`trendGradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6F00FF" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#6F00FF" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id={`weightLineGradient-${id}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6F00FF" />
                        <stop offset="100%" stopColor="#9333EA" />
                    </linearGradient>
                    <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
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
                            className="text-[12px] font-bold fill-slate-600 dark:fill-slate-300"
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
                        className="text-[12px] font-bold fill-slate-600 dark:fill-slate-300"
                    >
                        {l.label}
                    </text>
                ))}

                {/* Gradient Area */}
                <motion.path
                    d={rawAreaPath}
                    fill={`url(#trendGradient-${id})`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                />

                {/* Purple Line for Daily Weight */}
                <motion.path
                    d={rawPath}
                    fill="none"
                    stroke={`url(#weightLineGradient-${id})`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={`url(#glow-${id})`}
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
                    <motion.circle
                        cx={hoveredPoint.x} cy={hoveredPoint.yRaw}
                        r="6"
                        className="fill-[#6F00FF] stroke-white dark:stroke-slate-900 stroke-2"
                        transition={{ type: "spring" }}
                    />
                )}
            </svg>

            {/* Floating Tooltip HTML Overlay via Portal */}
            {hoveredPoint && tooltipPos && ReactDOM.createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed z-[9999] pointer-events-none"
                        style={{
                            left: tooltipPos.x,
                            top: tooltipPos.y,
                            transform: 'translate(-50%, -120%)' // Position slightly above the point
                        }}
                    >
                        <div className="mb-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-white/10 shadow-xl rounded-xl p-3 text-xs min-w-[120px]">
                            <div className="font-bold text-slate-700 dark:text-slate-200 mb-2 pb-2 border-b border-slate-100 dark:border-white/5 text-center">
                                {new Date(hoveredPoint.data.date).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                                        <div className="w-2 h-2 rounded-full bg-[#6F00FF]" /> Weight
                                    </span>
                                    <span className="font-bold text-[#6F00FF]">{hoveredPoint.data.weight.toFixed(1)} kg</span>
                                </div>
                                {prevPoint && (
                                    <div className="flex justify-between items-center text-slate-500">
                                        <span className="flex items-center gap-1.5 font-medium">
                                            <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" /> Change
                                        </span>
                                        <span className={`font-bold ${weightChange > 0 ? 'text-red-500' : weightChange < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};
