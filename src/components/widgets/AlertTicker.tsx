import React, { useEffect, useState } from 'react';
import { AlertCircle, X, ExternalLink } from 'lucide-react';
import { noaaApi } from '../../api/noaa';

interface AlertData {
    product_id: string;
    issue_datetime: string;
    message: string;
}

export const AlertTicker: React.FC = () => {
    const [alerts, setAlerts] = useState<AlertData[]>([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const data = await noaaApi.getAlerts();
                if (Array.isArray(data)) {
                    // Take last 10 alerts for the modal, but maybe only show 5 in ticker
                    setAlerts(data.slice(0, 10));
                }
            } catch (e) {
                console.error("Alerts fetch failed", e);
            }
        };
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 60000 * 5);
        return () => clearInterval(interval);
    }, []);

    // Helper to extract clean text for ticker
    const getTickerText = (alert: AlertData) => {
        let raw = alert.message || alert.product_id || "Unknown Alert";
        const lines = raw.split('\n');
        const meaningfulLine = lines.find((l: string) =>
            l.includes('WARNING:') || l.includes('ALERT:') || l.includes('WATCH:') || l.includes('SUMMARY:')
        );
        let text = meaningfulLine || lines[0];
        text = text.replace(/Space Weather Message Code:.*$/, '').trim();
        if (text.length > 100) text = text.substring(0, 100) + "...";
        return `[${new Date(alert.issue_datetime).toLocaleTimeString()}] ${text}`;
    };

    if (alerts.length === 0) return null;

    return (
        <>
            <div className="w-full bg-slate-900 border-t border-slate-800 p-2 flex items-center overflow-hidden fixed bottom-1 left-0 z-50 group">
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-red-900/50 hover:bg-red-800/50 text-red-400 px-3 py-1 rounded text-xs font-bold mr-4 flex items-center gap-2 shadow-lg border border-red-500/20 shrink-0 z-10 relative cursor-pointer transition-colors"
                >
                    <AlertCircle size={14} className="animate-pulse" />
                    LIVE ALERTS
                    <span className="text-[10px] opacity-70 ml-1">(Click List)</span>
                </button>
                <div
                    className="flex-1 overflow-hidden whitespace-nowrap relative mask-linear-fade cursor-pointer"
                    onClick={() => setShowModal(true)}
                >
                    <div className="animate-marquee inline-block text-sm text-slate-300 font-mono group-hover:[animation-play-state:paused]">
                        {alerts.slice(0, 5).map(a => getTickerText(a)).join("   ///   ")}
                    </div>
                </div>
            </div>

            {/* Full Screen Alert Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-red-500/30 w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-red-900/20">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="text-red-500 animate-pulse" />
                                <h2 className="font-bold text-lg text-white tracking-wide">ACTIVE SPACE WEATHER ALERTS</h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-4 space-y-4">
                            {alerts.map((alert, i) => (
                                <div key={i} className="bg-slate-800/50 border border-white/5 rounded-lg p-4 hover:border-red-500/30 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-mono text-space-blue bg-blue-500/10 px-2 py-0.5 rounded">
                                            {new Date(alert.issue_datetime).toLocaleString()}
                                        </span>
                                        <a
                                            href={`https://www.swpc.noaa.gov/products/alerts-warnings-and-watches`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-slate-500 hover:text-white"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                    </div>
                                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                                        {alert.message}
                                    </pre>
                                </div>
                            ))}
                        </div>

                        <div className="p-3 border-t border-white/10 text-center bg-slate-950 rounded-b-xl">
                            <p className="text-[10px] text-slate-500">Source: NOAA Space Weather Prediction Center</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
