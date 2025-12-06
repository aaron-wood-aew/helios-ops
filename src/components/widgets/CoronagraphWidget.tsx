import React, { useState, useEffect } from 'react';
import { noaaApi } from '../../api/noaa';
import { useDashboard } from '../../context/DashboardContext';
import { ImageLoopWidget } from './ImageLoopWidget';

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

    const extractTime = (url: string) => {
        if (!url) return "--:--";
        const parts = url.split('/').pop()?.split('_');
        if (parts && parts.length >= 2) {
            const date = parts[0];
            const time = parts[1];
            return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)} ${time.slice(0, 2)}:${time.slice(2, 4)}`;
        }
        return "Unknown";
    };

    const extraControls = (
        <div className="flex gap-2">
            <button
                onClick={() => setView('c2')}
                className={`px-2 py-1 text-[10px] uppercase font-bold rounded transition-colors ${view === 'c2' ? 'bg-red-900/80 text-red-200 border border-red-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}
            >
                C2
            </button>
            <button
                onClick={() => setView('c3')}
                className={`px-2 py-1 text-[10px] uppercase font-bold rounded transition-colors ${view === 'c3' ? 'bg-blue-900/80 text-blue-200 border border-blue-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}
            >
                C3
            </button>
        </div>
    );

    return (
        <ImageLoopWidget
            images={images}
            loading={loading}
            onRefresh={loadImages}
            timestampExtractor={extractTime}
            extraControls={extraControls}
        />
    );
};
