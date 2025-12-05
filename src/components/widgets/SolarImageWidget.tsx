import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, ChevronDown } from 'lucide-react';

const CHANNELS = [
    { id: '131', name: '131 Å (Flares)', color: 'text-space-blue' },
    { id: '171', name: '171 Å (Corona)', color: 'text-yellow-400' },
    { id: '195', name: '195 Å (Holes)', color: 'text-amber-700' },
    { id: '284', name: '284 Å (Active)', color: 'text-purple-400' },
    { id: '304', name: '304 Å (Filaments)', color: 'text-red-500' },
];

export const SolarImageWidget: React.FC = () => {
    const [selectedChannel, setSelectedChannel] = useState(CHANNELS[0]);
    const [imageSrc, setImageSrc] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isOpen, setIsOpen] = useState(false);

    const getUrl = (channelId: string) => {
        return `https://services.swpc.noaa.gov/images/animations/suvi/primary/${channelId}/latest.png`;
    };

    const refreshImage = () => {
        setLoading(true);
        setImageSrc(`${getUrl(selectedChannel.id)}?t=${new Date().getTime()}`);
        setLastUpdated(new Date());
    };

    // Update image when channel changes
    useEffect(() => {
        refreshImage();
    }, [selectedChannel]);

    // Auto-refresh every 5 mins
    useEffect(() => {
        const interval = setInterval(refreshImage, 300000);
        return () => clearInterval(interval);
    }, [selectedChannel]);

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden group">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10">
                    <Loader2 className="animate-spin text-space-blue" />
                </div>
            )}

            <img
                src={imageSrc}
                alt={`SDO ${selectedChannel.name}`}
                className="w-full h-full object-contain transition-opacity duration-500"
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
            />

            {/* Channel Selector */}
            <div className="absolute top-2 left-2 z-20">
                <div className="relative">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`bg-black/80 px-3 py-1.5 rounded border border-white/20 flex items-center gap-2 text-xs font-bold hover:bg-black transition-colors ${selectedChannel.color}`}
                    >
                        {selectedChannel.name}
                        <ChevronDown size={12} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                        <div className="absolute top-full left-0 mt-1 w-40 bg-black/90 border border-white/20 rounded shadow-xl overflow-hidden backdrop-blur-sm">
                            {CHANNELS.map(ch => (
                                <button
                                    key={ch.id}
                                    onClick={() => { setSelectedChannel(ch); setIsOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-xs font-mono hover:bg-white/10 transition-colors ${ch.color}`}
                                >
                                    {ch.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Timestmap & Refresh */}
            <div className="absolute bottom-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-2 py-1 rounded">
                <span className="text-[10px] text-slate-400 font-mono">Updated: {lastUpdated.toLocaleTimeString()}</span>
                <button onClick={refreshImage} className="text-space-blue hover:text-white">
                    <RefreshCw size={12} />
                </button>
            </div>
        </div>
    );
};
