import React, { useState, useEffect } from 'react';
import { ImageLoopWidget } from './ImageLoopWidget';
import { noaaApi } from '../../api/noaa';
import { RefreshCw } from 'lucide-react';

export const CoronagraphWidget: React.FC = () => {
    const [view, setView] = useState<'c2' | 'c3'>('c3');
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const loadImages = async () => {
        setLoading(true);
        try {
            const urls = await noaaApi.getLASCOImages(view);
            // Limit to last 50 for performance
            setImages(urls.slice(-50));
        } catch (err) {
            console.error("Failed to load LASCO images", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadImages();
    }, [view]);

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
        <div className="h-full flex flex-col p-4 relative">
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setView('c2')}
                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${view === 'c2' ? 'bg-red-900/50 text-red-200 border border-red-500/50' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        LASCO C2 (Inner)
                    </button>
                    <button
                        onClick={() => setView('c3')}
                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${view === 'c3' ? 'bg-blue-900/50 text-blue-200 border border-blue-500/50' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        LASCO C3 (Outer)
                    </button>
                </div>
                <div className="text-[10px] text-slate-500">
                    {view === 'c2' ? '1.5 - 6 Solar Radii (Red)' : '3.7 - 30 Solar Radii (Blue)'}
                </div>
            </div>

            <div className="flex-1 relative min-h-[300px]">
                <ImageLoopWidget
                    images={images}
                    loading={loading}
                    onRefresh={loadImages}
                    timestampExtractor={extractTime}
                />
            </div>
        </div>
    );
};
