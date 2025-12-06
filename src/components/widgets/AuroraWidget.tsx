import React, { useEffect, useState, useRef } from 'react';
import { noaaApi } from '../../api/noaa';
import { Loader2, RefreshCcw, Play, Pause } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

interface AuroraFrame {
    url: string;
    time: string;
}

export const AuroraWidget: React.FC = () => {
    const { mode } = useDashboard();
    const [frames, setFrames] = useState<AuroraFrame[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const [hemisphere, setHemisphere] = useState<'north' | 'south'>('north');
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch Animation Frames
    const loadData = async () => {
        setLoading(true);
        setIsPlaying(false);
        try {
            const data = await noaaApi.getAuroraAnimation(hemisphere);
            // Sort by raw time_tag first (ISO)
            const sorted = data.sort((a, b) => a.time_tag.localeCompare(b.time_tag))
                .map(d => ({
                    url: d.url,
                    time: new Date(d.time_tag).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: 'UTC'
                    }) + 'Z'
                }));

            setFrames(sorted);
            setCurrentIndex(sorted.length - 1); // Start at latest
            setIsPlaying(true);
        } catch (e) {
            console.error("Aurora load failed", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 300000); // Reload data every 5m
        return () => clearInterval(interval);
    }, [hemisphere, mode]);

    // Animation Loop
    useEffect(() => {
        if (isPlaying && frames.length > 0) {
            timerRef.current = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % frames.length);
            }, 100); // 10fps
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isPlaying, frames]);

    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsPlaying(false);
        setCurrentIndex(parseInt(e.target.value));
    };

    return (
        <div className="relative w-full h-full bg-black rounded-lg overflow-hidden group flex flex-col">

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                    <Loader2 className="animate-spin text-space-cyan" size={32} />
                </div>
            )}

            <div className="flex-1 relative">
                {frames.length > 0 ? (
                    <img
                        src={frames[currentIndex]?.url}
                        alt="Aurora Forecast"
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-xs">No Data</div>
                )}

                {/* Timestamp Overlay */}
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded border border-white/10 pointer-events-none">
                    <span className="text-space-cyan font-mono font-bold text-xs">{frames[currentIndex]?.time}</span>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="h-10 bg-slate-900 border-t border-slate-700 flex items-center px-2 gap-2 z-10">
                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="text-space-cyan hover:text-white p-1"
                >
                    {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>

                <input
                    type="range"
                    min={0}
                    max={frames.length - 1}
                    value={currentIndex}
                    onChange={handleScrub}
                    className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-space-cyan [&::-webkit-slider-thumb]:rounded-full"
                />

                <div className="flex gap-1">
                    <button
                        onClick={() => setHemisphere(h => h === 'north' ? 'south' : 'north')}
                        className="px-2 py-1 text-[10px] font-bold bg-slate-800 rounded border border-slate-600 hover:bg-slate-700 uppercase w-8 text-center"
                        title="Toggle Hemisphere"
                    >
                        {hemisphere === 'north' ? 'N' : 'S'}
                    </button>
                    <button
                        onClick={loadData}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Refresh"
                    >
                        <RefreshCcw size={14} />
                    </button>
                </div>
            </div>

            <div className="absolute bottom-12 right-2 pointer-events-none opacity-50">
                <div className="text-[10px] text-slate-300 text-right drop-shadow-md">NOAA OVATION Model</div>
            </div>
        </div>
    );
};

