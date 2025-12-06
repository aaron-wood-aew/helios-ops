import React from 'react';
import { Play, Pause, RefreshCw } from 'lucide-react';

interface AnimationControlsProps {
    isPlaying: boolean;
    onPlayPause: () => void;
    currentIndex: number;
    totalFrames: number;
    onScrub: (index: number) => void;
    speed: number;
    onSpeedChange: (speed: number) => void;
    onRefresh?: () => void;
    loading?: boolean;
    extraControls?: React.ReactNode;
}

export const AnimationControls: React.FC<AnimationControlsProps> = ({
    isPlaying,
    onPlayPause,
    currentIndex,
    totalFrames,
    onScrub,
    speed,
    onSpeedChange,
    onRefresh,
    loading,
    extraControls
}) => {
    return (
        <div className="h-14 bg-slate-900/80 backdrop-blur border-t border-white/10 flex items-center px-4 gap-4 w-full">
            {/* Play/Pause */}
            <button
                onClick={onPlayPause}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-space-blue hover:bg-blue-500 text-white transition-colors flex-shrink-0"
            >
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
            </button>

            {/* Speed Toggles */}
            <div className="flex gap-1 flex-shrink-0">
                {[1, 2, 5].map(s => (
                    <button
                        key={s}
                        onClick={() => onSpeedChange(s)}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${speed === s ? 'bg-space-cyan text-black' : 'text-slate-500 hover:text-white bg-slate-800'}`}
                    >
                        {s}x
                    </button>
                ))}
            </div>

            {/* Slider */}
            <div className="flex-1 flex flex-col justify-center">
                <input
                    type="range"
                    min="0"
                    max={Math.max(0, totalFrames - 1)}
                    value={currentIndex}
                    onChange={(e) => onScrub(parseInt(e.target.value))}
                    disabled={totalFrames === 0}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-space-cyan"
                />
            </div>

            {/* Extra Controls (e.g. Hemisphere, Hours) */}
            {extraControls}

            {/* Refresh */}
            {onRefresh && (
                <button
                    onClick={onRefresh}
                    className="text-slate-400 hover:text-white flex-shrink-0"
                    disabled={loading}
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </button>
            )}
        </div>
    );
};
