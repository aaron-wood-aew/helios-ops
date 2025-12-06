import React, { useState, useEffect, useRef } from 'react';
import { AnimationControls } from './AnimationControls';

interface ImageLoopProps {
    title?: string;
    images: string[];
    loading?: boolean;
    onRefresh?: () => void;
    timestampExtractor?: (url: string) => string;
    extraControls?: React.ReactNode;
}

export const ImageLoopWidget: React.FC<ImageLoopProps> = ({
    images,
    loading,
    onRefresh,
    timestampExtractor,
    extraControls
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [progress, setProgress] = useState(0);

    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const intervalRef = useRef<number | undefined>(undefined);

    // Preload images when list changes
    useEffect(() => {
        if (images.length === 0) return;
        setIsPlaying(false);
        setCurrentIndex(images.length - 1); // Start at latest
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
                // Auto-play only after all loaded? Or partial?
                // Let's verify standard behavior. Usually play once loaded.
                if (loadedCount === images.length) setIsPlaying(true);
            };
            img.onerror = () => {
                loadedCount++;
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
            const delay = Math.max(20, Math.floor(100 / speed));
            intervalRef.current = window.setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % images.length);
            }, delay);
        } else {
            stopAnimation();
        }
        return () => stopAnimation();
    }, [isPlaying, images, speed]);

    const currentUrl = images[currentIndex];

    return (
        <div className="flex flex-col h-full bg-black/20 rounded-xl overflow-hidden border border-white/5 relative">
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden group min-h-0">
                {images.length > 0 ? (
                    <img
                        src={currentUrl}
                        alt="Loop Animation"
                        className="absolute inset-0 w-full h-full object-contain"
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

            <AnimationControls
                isPlaying={isPlaying}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                currentIndex={currentIndex}
                totalFrames={images.length}
                onScrub={(i) => { setIsPlaying(false); setCurrentIndex(i); }}
                speed={speed}
                onSpeedChange={setSpeed}
                onRefresh={onRefresh}
                loading={loading}
                extraControls={extraControls}
            />
        </div>
    );
};
