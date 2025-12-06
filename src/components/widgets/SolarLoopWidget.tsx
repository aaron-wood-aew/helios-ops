import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw } from 'lucide-react';
import { noaaApi } from '../../api/noaa';
import { useDashboard } from '../../context/DashboardContext';

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
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0); // Loading progress
    const [speed, setSpeed] = useState(1);
    const [hours, setHours] = useState(24);

    // Cache for preloaded images
    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadImages = async () => {
        setLoading(true);
        setIsPlaying(false);
        setImages([]);
        setCurrentIndex(0);
        imageCache.current.clear();
        setProgress(0);

        try {
            let urls: string[] = [];

            if (mode === 'REPLAY') {
                const history = await noaaApi.getHistoryImages('suvi', replayRange.start, replayRange.end, channel);
                urls = history.map(h => h.url);
            } else {
                urls = await noaaApi.getSUVIImages(channel);
                // Calculate frames needed: ~4 mins per frame = 15 frames/hour
                // 48 hours = 720 frames.
                const framesNeeded = hours * 15;
                urls = urls.slice(-framesNeeded);
            }

            if (urls.length === 0) {
                setLoading(false);
                return;
            }

            setImages(urls);
            setCurrentIndex(mode === 'REPLAY' ? 0 : urls.length - 1);

            // Preload images
            let loadedCount = 0;
            const promises = urls.map((url) => {
                return new Promise<void>((resolve) => {
                    const img = new Image();
                    img.src = url;
                    img.onload = () => {
                        loadedCount++;
                        setProgress(Math.round((loadedCount / urls.length) * 100));
                        imageCache.current.set(url, img);
                        resolve();
                    };
                    img.onerror = () => {
                        resolve();
                    };
                });
            });

            await Promise.all(promises);
            setIsPlaying(true);
        } catch (err) {
            console.error("Failed to load solar loop", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadImages();
        return () => stopAnimation();
    }, [channel, mode, replayRange, hours]);

    const stopAnimation = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    useEffect(() => {
        if (isPlaying && images.length > 0) {
            stopAnimation();
            // Base speed: 100ms (10fps). 
            // Multiplier: 2x -> 50ms, 5x -> 20ms
            const delay = Math.max(20, Math.floor(100 / speed));

            intervalRef.current = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % images.length);
            }, delay);
        } else {
            stopAnimation();
        }
        return () => stopAnimation();
    }, [isPlaying, images, speed]);

    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsPlaying(false);
        setCurrentIndex(parseInt(e.target.value));
    };

    const currentUrl = images[currentIndex];
    const getTimestamp = (url: string) => {
        if (!url) return "--:--";
        const match = url.match(/s(\d{8}T\d{6}Z)/);
        if (match) {
            const ts = match[1];
            return `${ts.substring(0, 4)}-${ts.substring(4, 6)}-${ts.substring(6, 8)} ${ts.substring(9, 11)}:${ts.substring(11, 13)}`;
        }
        return "Unknown";
    };

    return (
        <div className="flex flex-col h-full bg-black/20 rounded-xl overflow-hidden border border-white/5 relative">
            {/* Display Area */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden group">
                {images.length > 0 ? (
                    <img
                        src={currentUrl}
                        alt="Solar Animation"
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="text-slate-500 font-mono text-xs">Waiting for data...</div>
                )}

                {loading && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
                        <div className="w-16 h-16 border-4 border-space-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
                        <div className="font-mono text-space-cyan text-xs">BUFFERING SUVI {progress}%</div>
                    </div>
                )}

                <div className="absolute top-4 right-4 font-mono text-cyan-400 bg-black/50 px-2 py-1 rounded text-sm backdrop-blur-sm pointer-events-none">
                    {getTimestamp(currentUrl)}
                </div>

                <div className="absolute top-4 left-4 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 p-2 rounded backdrop-blur-sm">
                    {CHANNELS.map(ch => (
                        <button
                            key={ch.id}
                            onClick={() => setChannel(ch.id)}
                            className={`text-[10px] uppercase font-bold px-2 py-1 rounded text-left hover:bg-white/10 ${channel === ch.id ? 'bg-white/20 text-white' : 'text-slate-400'}`}
                        >
                            <span className={`mr-2 ${ch.color}`}>●</span> {ch.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Controls */}
            <div className="h-16 bg-slate-900/80 backdrop-blur border-t border-white/10 flex items-center px-4 gap-4">
                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-space-blue hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-900/20"
                >
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
                </button>

                {/* Speed Toggle */}
                <div className="flex gap-1">
                    {[1, 2, 5].map(s => (
                        <button
                            key={s}
                            onClick={() => setSpeed(s)}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${speed === s ? 'bg-space-cyan text-black' : 'text-slate-500 hover:text-white bg-slate-800'}`}
                            title={`Speed ${s}x`}
                        >
                            {s}x
                        </button>
                    ))}
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    <input
                        type="range"
                        min="0"
                        max={images.length - 1}
                        value={currentIndex}
                        onChange={handleScrub}
                        disabled={loading || images.length === 0}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-space-cyan"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                        <button
                            onClick={() => setHours(h => h === 24 ? 48 : 24)}
                            className="hover:text-space-cyan transition-colors"
                        >
                            -{hours}h
                        </button>
                        <span>LIVE</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={loadImages} className="text-slate-400 hover:text-white p-2" title="Reload Sequence">
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>
        </div>
    );
};
