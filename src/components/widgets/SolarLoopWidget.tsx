import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import { noaaApi } from '../../api/noaa';
import { useDashboard } from '../../context/DashboardContext';
import { ImageLoopWidget } from './ImageLoopWidget';

const CHANNELS = [
    { id: '131', color: 'text-teal-400', label: '131Å (Flares)' },
    { id: '171', color: 'text-yellow-400', label: '171Å (Corona)' },
    { id: '195', color: 'text-green-400', label: '195Å (Holes)' },
    { id: '284', color: 'text-blue-400', label: '284Å (Active)' },
    { id: '304', color: 'text-red-400', label: '304Å (Filaments)' },
];

export const SolarLoopWidget: React.FC = () => {
    const { mode, replayRange } = useDashboard();
    const [channel, setChannel] = useState('195');
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [hours, setHours] = useState(24);
    const [showMenu, setShowMenu] = useState(false);

    const loadImages = async () => {
        setLoading(true);
        setImages([]);
        try {
            let urls: string[] = [];

            if (mode === 'REPLAY') {
                const history = await noaaApi.getHistoryImages('suvi', replayRange.start, replayRange.end, channel);
                urls = history.map(h => h.url);
            } else {
                urls = await noaaApi.getSUVIImages(channel);
                const framesNeeded = hours * 15; // ~15 frames/hour
                urls = urls.slice(-framesNeeded);
            }
            setImages(urls);
        } catch (err) {
            console.error("Failed to load solar loop", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadImages();
    }, [channel, mode, replayRange, hours]);

    const getTimestamp = (url: string) => {
        if (!url) return "--:--";
        const match = url.match(/s(\d{8}T\d{6}Z)/);
        if (match) {
            const ts = match[1];
            return `${ts.substring(0, 4)}-${ts.substring(4, 6)}-${ts.substring(6, 8)} ${ts.substring(9, 11)}:${ts.substring(11, 13)}`;
        }
        return "Unknown";
    };

    const extraControls = (
        <div className="flex gap-2 items-center">
            {/* Hours Toggle */}
            <div className="flex text-[10px] font-mono text-slate-500 mr-2 items-center gap-2">
                <button
                    onClick={() => setHours(h => h === 24 ? 48 : 24)}
                    className="hover:text-space-cyan transition-colors"
                >
                    {hours}h
                </button>
            </div>

            {/* Channel Menu Button (since overlay menu is inside ImageLoopWidget, we might need a custom approach or just float it) */}
            {/* Wait, ImageLoopWidget doesn't support custom children overlays easily. */}
            {/* Strategy: We render the menu OUTSIDE ImageLoopWidget but position absolute? No, needs relative container. */}
            {/* Let's render the Menu Button in extraControls, and the Menu proper as an absolute div on top of everything? */}

            <div className="relative">
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-space-cyan transition-colors"
                    title="Select Channel"
                >
                    <Layers size={14} />
                </button>

                {showMenu && (
                    <div className="absolute bottom-10 left-0 flex flex-col gap-1 bg-black/90 p-2 rounded backdrop-blur-md border border-white/10 z-50 w-48 shadow-xl animate-in fade-in slide-in-from-bottom-2">
                        {CHANNELS.map(ch => (
                            <button
                                key={ch.id}
                                onClick={() => { setChannel(ch.id); setShowMenu(false); }}
                                className={`text-[10px] uppercase font-bold px-3 py-2 rounded text-left flex items-center gap-2 transition-colors ${channel === ch.id ? 'bg-space-blue text-white shadow-lg' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${ch.color.replace('text-', 'bg-')}`}></span>
                                {ch.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <ImageLoopWidget
            images={images}
            loading={loading}
            onRefresh={loadImages}
            timestampExtractor={getTimestamp}
            extraControls={extraControls}
        />
    );
};
