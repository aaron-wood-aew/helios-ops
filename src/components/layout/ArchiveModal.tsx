import React, { useState } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { X, Calendar, Play } from 'lucide-react';

export const ArchiveModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { setReplayRange, toggleMode } = useDashboard();
    const [startStr, setStartStr] = useState("2025-06-01T10:00");
    const [endStr, setEndStr] = useState("2025-06-02T10:00");
    const [status, setStatus] = useState<any>(null);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [isStatusExpanded, setIsStatusExpanded] = useState(false);

    React.useEffect(() => {
        if (isStatusExpanded && !status) {
            setLoadingStatus(true);
            // Dynamic import to avoid circular dep if needed, or just standard import
            import('../../api/noaa').then(({ noaaApi }) => {
                noaaApi.getArchiveStatus().then(setData => {
                    setStatus(setData);
                    setLoadingStatus(false);
                }).catch(e => {
                    console.error(e);
                    setLoadingStatus(false);
                });
            });
        }
    }, [isStatusExpanded]);

    const formatTime = (t: string | null) => {
        if (!t) return "N/A";
        return new Date(t).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const handleApply = () => {
        setReplayRange({
            start: new Date(startStr),
            end: new Date(endStr)
        });
        toggleMode('REPLAY');
        onClose();
    };

    // Quick Select from Major Events (Mock for now, or fetch from NASA)
    const quickEvents = [
        { label: "X1.2 Flare (May 2025)", start: "2025-05-14T12:00", end: "2025-05-15T12:00" },
        { label: "G5 Storm (Oct 2024)", start: "2024-10-10T00:00", end: "2024-10-12T00:00" },
    ];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700 shrink-0">
                    <h2 className="text-white font-bold flex items-center gap-2">
                        <Calendar className="text-space-blue" size={20} />
                        Historical Archive Access
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    {/* Archive Inventory (Expandable) */}
                    <div className="border border-slate-700 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setIsStatusExpanded(!isStatusExpanded)}
                            className="w-full px-4 py-3 bg-slate-800/50 flex justify-between items-center hover:bg-slate-800 transition-colors"
                        >
                            <span className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${status ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-slate-600'}`} />
                                Archive Inventory
                            </span>
                            <span className="text-xs text-slate-500">{isStatusExpanded ? 'Hide' : 'Show Stats'}</span>
                        </button>

                        {isStatusExpanded && (
                            <div className="bg-black/40 p-4 border-t border-slate-700">
                                {loadingStatus ? (
                                    <div className="text-center text-slate-500 py-2 text-xs">Scanning Database...</div>
                                ) : status ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        {Object.entries(status).map(([key, val]: [string, any]) => (
                                            <div key={key} className="flex justify-between items-center text-xs border-b border-white/5 pb-2 last:border-0">
                                                <span className="font-mono text-space-blue uppercase w-24">{key.replace('_', ' ')}</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-white font-mono">{Number(val.count).toLocaleString()} rows</span>
                                                    <span className="text-[10px] text-slate-500">
                                                        {formatTime(val.start)} — {formatTime(val.end)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center text-red-400 text-xs">Failed to load status</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Quick Select */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Major Event Quick Select</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {quickEvents.map((evt, i) => (
                                <button key={i}
                                    onClick={() => { setStartStr(evt.start); setEndStr(evt.end); }}
                                    className="text-left bg-slate-800 hover:bg-space-blue/20 border border-slate-700 hover:border-space-blue p-2 rounded transition-all group"
                                >
                                    <div className="text-sm font-bold text-slate-200 group-hover:text-space-blue">{evt.label}</div>
                                    <div className="text-[10px] text-slate-500">Duration: 24h</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Start Time (UTC)</label>
                            <input
                                type="datetime-local"
                                value={startStr}
                                onChange={(e) => setStartStr(e.target.value)}
                                className="w-full bg-black border border-slate-700 rounded p-2 text-sm text-white focus:border-space-blue outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">End Time (UTC)</label>
                            <input
                                type="datetime-local"
                                value={endStr}
                                onChange={(e) => setEndStr(e.target.value)}
                                className="w-full bg-black border border-slate-700 rounded p-2 text-sm text-white focus:border-space-blue outline-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleApply}
                        className="w-full bg-space-blue hover:bg-blue-600 text-white font-bold py-3 rounded flex items-center justify-center gap-2 transition-colors"
                    >
                        <Play size={16} fill="currentColor" />
                        Load Historical Data
                    </button>
                </div>
            </div>
        </div>
    );
};
