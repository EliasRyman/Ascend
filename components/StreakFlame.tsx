import React from 'react';
import { motion } from 'framer-motion';

interface StreakFlameProps {
    streakCount: number;
    progressPercentage: number;
    size?: number;
    className?: string;
    showCount?: boolean;
    label?: string;
    value?: string | number;
}

const StreakFlame: React.FC<StreakFlameProps> = ({
    streakCount,
    progressPercentage,
    size = 48,
    className = "",
    showCount = true,
    label,
    value
}) => {
    const id = React.useId();
    const percentage = Math.min(Math.max(progressPercentage, 0), 100);

    const isIgnited = percentage > 80;
    const isDormant = percentage < 20;

    // Animation variants for the "burning" effect
    const burningVariants = {
        animate: {
            scale: [1, 1.05, 1],
            rotate: [0, -1, 1, 0],
            transition: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
            }
        }
    };

    const emberVariants = {
        animate: {
            opacity: [0.6, 0.8, 0.6],
            scale: [0.95, 1, 0.95],
            transition: {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
            }
        }
    };

    // Lucide Flame Path: M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.256 1.181-3.142A2.5 2.5 0 0 0 8.5 14.5z
    const lucideFlamePath = "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.256 1.181-3.142A2.5 2.5 0 0 0 8.5 14.5z";

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div
                className="relative flex items-center justify-center"
                style={{ width: size, height: size }}
            >
                <motion.svg
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    xmlns="http://www.w3.org/2000/svg"
                    variants={isIgnited ? burningVariants : isDormant ? emberVariants : {}}
                    animate={isIgnited || isDormant ? "animate" : undefined}
                    style={{ filter: isIgnited ? 'drop-shadow(0 0 8px rgba(249,115,22,0.4))' : undefined }}
                >
                    <defs>
                        {/* Vertical gradient: Deep Red (#ef4444) at bottom to Warm Yellow (#facc15) at top */}
                        <linearGradient id={`flame-gradient-${id}`} x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="100%" stopColor="#facc15" />
                        </linearGradient>

                        {/* Progress clip - fills from bottom to top */}
                        <clipPath id={`clip-${id}`}>
                            <motion.rect
                                x="0"
                                width="24"
                                initial={{ y: 24, height: 0 }}
                                animate={{
                                    y: 24 - (24 * (percentage / 100)),
                                    height: 24 * (percentage / 100)
                                }}
                                transition={{ type: "spring", stiffness: 50, damping: 20 }}
                            />
                        </clipPath>
                    </defs>

                    {/* Background "Dormant" Layer (very faint) */}
                    <path
                        d={lucideFlamePath}
                        fill="currentColor"
                        className="text-slate-200 dark:text-slate-800 opacity-20"
                    />

                    {/* Active Filled Layer - Using Lucide Path and the requested gradient */}
                    <g clipPath={`url(#clip-${id})`}>
                        <path
                            d={lucideFlamePath}
                            fill={`url(#flame-gradient-${id})`}
                        />
                    </g>
                </motion.svg>

                {/* Outer Glow when ignited - Softer and more realistic */}
                {isIgnited && (
                    <motion.div
                        className="absolute rounded-full"
                        style={{
                            width: size * 1.5,
                            height: size * 1.5,
                            background: 'radial-gradient(circle, rgba(251,146,60,0.2) 0%, rgba(239,68,68,0.05) 50%, transparent 70%)',
                            filter: 'blur(8px)',
                            zIndex: -1
                        }}
                        animate={{
                            opacity: [0.4, 0.7, 0.4],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                )}

                {/* 100% Completion Sparkle Effect */}
                {percentage === 100 && (
                    <div className="absolute inset-0 pointer-events-none">
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                                style={{
                                    left: '50%',
                                    top: '50%',
                                    boxShadow: '0 0 4px #fbbf24'
                                }}
                                animate={{
                                    x: [0, (i % 2 === 0 ? 1 : -1) * (15 + Math.random() * 15)],
                                    y: [0, (i < 3 ? -1 : 1) * (15 + Math.random() * 15)],
                                    opacity: [0, 1, 0],
                                    scale: [0, 1.2, 0]
                                }}
                                transition={{
                                    duration: 2 + Math.random(),
                                    repeat: Infinity,
                                    delay: i * 0.4,
                                    ease: "easeInOut"
                                }}
                            />
                        ))}
                    </div>
                )}

            </div>

            {showCount && (
                <div className="flex flex-col items-center">
                    {/* Updated text to also use the gradient fyllning if possible, or a matching color */}
                    <span
                        className="text-2xl font-bold leading-none"
                        style={{
                            backgroundImage: `linear-gradient(to top, #ef4444, #facc15)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}
                    >
                        {value !== undefined ? value : streakCount}
                    </span>
                    {(label || (!label && label !== "")) && (
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mt-1">
                            {label || "Streak"}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default StreakFlame;
