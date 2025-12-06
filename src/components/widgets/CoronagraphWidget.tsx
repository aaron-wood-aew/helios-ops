import React, { useState, useEffect } from 'react';

import { noaaApi } from '../../api/noaa';


import { useDashboard } from '../../context/DashboardContext';

export const CoronagraphWidget: React.FC = () => {
    const { mode, replayRange } = useDashboard();
    const [view, setView] = useState<'c2' | 'c3'>('c3');
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const loadImages = async () => {
        setLoading(true);
        try {
            let urls: string[] = [];
            if (mode === 'REPLAY') {
                const history = await noaaApi.getHistoryImages('lasco', replayRange.start, replayRange.end, view);
                urls = history.map(h => h.url);
            } else {
                urls = await noaaApi.getLASCOImages(view);
                // Limit to last 50 for performance
                urls = urls.slice(-50);
            }
            setImages(urls);
        } catch (err) {
            console.error("Failed to load LASCO images", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadImages();
    }, [view, mode, replayRange]);

    // Extract time from: 20251205_2354_c3_512.jpg
    const extractTime = (url: string) => {
        if (!url) return "--:--";
        const parts = url.split('/').pop()?.split('_'); // [20251205, 2354, c3, 512.jpg]
        if (parts && parts.length >= 2) {
            const date = parts[0]; // 20251205
            const time = parts[1]; // 2354
            return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)} ${time.slice(0, 2)}:${time.slice(2, 4)}`;
        }
        return "Unknown";
    };

    return (
        <div className="h-full flex flex-col relative bg-black rounded-lg overflow-hidden group border border-white/5">
            {/* Header / Controls Overlay */}
            <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-start z-10 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex gap-2">
                    <button
                        onClick={() => setView('c2')}
                        className={`px-2 py-1 text-[10px] uppercase font-bold rounded transition-colors ${view === 'c2' ? 'bg-red-900/80 text-red-200 border border-red-500/50' : 'bg-black/50 text-slate-400 border border-slate-700 hover:bg-white/10'}`}
                    >
                        LASCO C2
                    </button>
                    <button
                        onClick={() => setView('c3')}
                        className={`px-2 py-1 text-[10px] uppercase font-bold rounded transition-colors ${view === 'c3' ? 'bg-blue-900/80 text-blue-200 border border-blue-500/50' : 'bg-black/50 text-slate-400 border border-slate-700 hover:bg-white/10'}`}
                    >
                        LASCO C3
                    </button>
                </div>
            </div>

            <div className="flex-1 relative flex items-center justify-center bg-black">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                        <div className="w-8 h-8 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>
                    </div>
                )}

                {images.length > 0 ? (
                    <img
                        src={images[images.length - 1]}
                        alt="Coronagraph"
                        className="h-full w-full object-contain"
                    />
                ) : (
                    <div className="text-slate-500 text-xs">Waiting for data...</div>
                )}

                {/* Timestamp */}
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded border border-white/10 pointer-events-none">
                    <span className={`font-mono font-bold text-xs ${view === 'c2' ? 'text-red-400' : 'text-blue-400'}`}>
                        {extractTime(images[images.length - 1])}
                    </span>
                </div>
            </div>
        </div>
    );
};
