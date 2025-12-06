import React, { useState, useEffect, useRef } from 'react';
import { noaaApi } from '../../api/noaa';
import { AnimationControls } from './AnimationControls';
import { Loader2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

interface AuroraFrame {
    url: string;
    time: string;
}

export const AuroraWidget: React.FC = () => {
    const { mode, replayRange } = useDashboard();
    const [frames, setFrames] = useState<AuroraFrame[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [speed, setSpeed] = useState(1);
    const [hemisphere, setHemisphere] = useState<'north' | 'south'>('north');
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Fetch Animation Frames
    const loadData = async () => {
        setLoading(true);
        setIsPlaying(false);
        try {
            let data: { url: string; time_tag: string }[] = [];

            if (mode === 'REPLAY') {
                const history = await noaaApi.getHistoryImages('aurora', replayRange.start, replayRange.end, hemisphere);
                data = history.map(h => ({
                    url: h.url,
                    time_tag: h.time // history API returns 'time' as ISO string
                }));
            } else {
                data = await noaaApi.getAuroraAnimation(hemisphere);
            }

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
            setCurrentIndex(mode === 'REPLAY' ? 0 : sorted.length - 1); // Start at latest for LIVE
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
    }, [hemisphere, mode, replayRange]);

    // Animation Loop
    useEffect(() => {
        if (isPlaying && frames.length > 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            const delay = Math.max(20, Math.floor(100 / speed));

            timerRef.current = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % frames.length);
            }, delay);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isPlaying, frames, speed]);

    const extraControls = (
        <button
            onClick={() => setHemisphere(h => h === 'north' ? 'south' : 'north')}
            className="px-2 py-1 text-[10px] font-bold bg-slate-800 rounded border border-slate-600 hover:bg-slate-700 uppercase w-8 text-center"
            title="Toggle Hemisphere"
        >
            {hemisphere === 'north' ? 'N' : 'S'}
        </button>
    );

    return (
        <div className="relative w-full h-full bg-black rounded-lg overflow-hidden group flex flex-col">

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                    <Loader2 className="animate-spin text-space-cyan" size={32} />
                </div>
            )}

            <div className="flex-1 relative min-h-0">
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

            <AnimationControls
                isPlaying={isPlaying}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                currentIndex={currentIndex}
                totalFrames={frames.length}
                onScrub={(i) => { setIsPlaying(false); setCurrentIndex(i); }}
                speed={speed}
                onSpeedChange={setSpeed}
                onRefresh={loadData}
                loading={loading}
                extraControls={extraControls}
            />

            <div className="absolute bottom-12 right-2 pointer-events-none opacity-50">
                <div className="text-[10px] text-slate-300 text-right drop-shadow-md">NOAA OVATION Model</div>
            </div>
        </div>
    );
};

