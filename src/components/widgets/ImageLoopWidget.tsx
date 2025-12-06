import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw } from 'lucide-react';

interface ImageLoopProps {
    title?: string;
    images: string[];
    loading?: boolean;
    onRefresh?: () => void;
    timestampExtractor?: (url: string) => string;
}

export const ImageLoopWidget: React.FC<ImageLoopProps> = ({ images, loading, onRefresh, timestampExtractor }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);

    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const intervalRef = useRef<number | undefined>(undefined);

    // Preload images when list changes
    useEffect(() => {
        if (images.length === 0) return;
        setIsPlaying(false);
        setCurrentIndex(0);
        setProgress(0);
        imageCache.current.clear();

        let loadedCount = 0;
        images.forEach(url => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
                loadedCount++;
                setProgress(Math.round((loadedCount / images.length) * 100));
                imageCache.current.set(url, img);
                if (loadedCount === images.length) setIsPlaying(true);
            };
            img.onerror = () => {
                loadedCount++; // Count error as loaded to avoid stall
                setProgress(Math.round((loadedCount / images.length) * 100));
            };
        });
    }, [images]);

    const stopAnimation = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = undefined;
        }
    };

    useEffect(() => {
        if (isPlaying && images.length > 0) {
            stopAnimation();
            intervalRef.current = window.setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % images.length);
            }, 100);
        } else {
            stopAnimation();
        }
        return () => stopAnimation();
    }, [isPlaying, images]);

    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsPlaying(false);
        setCurrentIndex(parseInt(e.target.value));
    };

    const currentUrl = images[currentIndex];

    return (
        <div className="flex flex-col h-full bg-black/20 rounded-xl overflow-hidden border border-white/5 relative">
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden group">
                {images.length > 0 ? (
                    <img
                        src={currentUrl}
                        alt="Loop Animation"
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="text-slate-500 font-mono text-xs">Waiting for data...</div>
                )}

                {loading && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 transition-opacity duration-300">
                        <div className="w-12 h-12 border-2 border-space-cyan border-t-transparent rounded-full animate-spin mb-2"></div>
                        <div className="font-mono text-space-cyan text-[10px]">BUFFERING {progress}%</div>
                    </div>
                )}

                {/* Timestamp */}
                <div className="absolute top-4 right-4 font-mono text-cyan-400 bg-black/50 px-2 py-1 rounded text-sm backdrop-blur-sm pointer-events-none">
                    {timestampExtractor ? timestampExtractor(currentUrl) : currentIndex}
                </div>
            </div>

            {/* Controls */}
            <div className="h-14 bg-slate-900/80 backdrop-blur border-t border-white/10 flex items-center px-4 gap-4">
                <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-space-blue hover:bg-blue-500 text-white transition-colors"
                >
                    {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                </button>

                <div className="flex-1">
                    <input
                        type="range"
                        min="0"
                        max={Math.max(0, images.length - 1)}
                        value={currentIndex}
                        onChange={handleScrub}
                        disabled={images.length === 0}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-space-cyan"
                    />
                </div>

                {onRefresh && (
                    <button onClick={onRefresh} className="text-slate-400 hover:text-white" title="Refresh">
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    </button>
                )}
            </div>
        </div>
    );
};
