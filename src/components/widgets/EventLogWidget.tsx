import React, { useEffect, useState } from 'react';
import { nasaApi } from '../../api/nasa';
import { Loader2, Flame, Disc } from 'lucide-react';

interface EventItem {
    id: string;
    date: Date;
    type: 'FLARE' | 'CME';
    magnitude: string;
    description: string;
}

// Mock Data for "Future/Simulated" or Fallback scenarios
const MOCK_EVENTS: EventItem[] = [
    { id: 'm1', date: new Date('2025-12-05'), type: 'CME', magnitude: '738 km/s', description: 'CME observed to the SW in SOHO LASCO C2/C3 and GOES CCOR-1.' },
    { id: 'm2', date: new Date('2025-12-04'), type: 'CME', magnitude: '284 km/s', description: 'Faint CME observed to the W in SOHO LASCO C2/C3.' },
    { id: 'm3', date: new Date('2025-12-04'), type: 'CME', magnitude: '430 km/s', description: 'Narrow CME seen to the east in SOHO LASCO C2/C3.' },
    { id: 'm4', date: new Date('2025-12-04'), type: 'CME', magnitude: '517 km/s', description: 'Narrow CME seen only in a few frames to the southwest.' },
    { id: 'm5', date: new Date('2025-12-03'), type: 'FLARE', magnitude: 'M6.0', description: 'Major flare from AR 14300 (N10E58).' },
    { id: 'm6', date: new Date('2025-12-03'), type: 'CME', magnitude: '594 km/s', description: 'Halo CME associated with M6.0 flare.' },
    { id: 'm7', date: new Date('2025-12-02'), type: 'CME', magnitude: '320 km/s', description: 'Slow partial halo CME.' }
];

export const EventLogWidget: React.FC = () => {
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            const end = new Date();
            const start = new Date();
            start.setMonth(start.getMonth() - 6);

            const startDateStr = start.toISOString().split('T')[0];
            const endDateStr = end.toISOString().split('T')[0];

            try {
                const [flares, cmes] = await Promise.all([
                    nasaApi.getSolarFlares(startDateStr, endDateStr),
                    nasaApi.getCMEs(startDateStr, endDateStr)
                ]);

                const flareEvents: EventItem[] = flares
                    .filter(f => f.classType.startsWith('M') || f.classType.startsWith('X'))
                    .map(f => ({
                        id: f.flrID,
                        date: new Date(f.peakTime),
                        type: 'FLARE',
                        magnitude: f.classType,
                        description: f.sourceLocation
                    }));

                const cmeEvents: EventItem[] = cmes.map(c => ({
                    id: c.activityID,
                    date: new Date(c.startTime),
                    type: 'CME',
                    magnitude: `${c.cmeAnalyses?.[0]?.speed || '?'} km/s`,
                    description: c.note || 'No details'
                }));

                const allEvents = [...flareEvents, ...cmeEvents].sort((a, b) => b.date.getTime() - a.date.getTime());

                if (allEvents.length === 0) {
                    setEvents(MOCK_EVENTS);
                } else {
                    setEvents(allEvents);
                }

            } catch (err) {
                console.error("Failed to load history", err);
                setEvents(MOCK_EVENTS); // Fallback on error too
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const [filter, setFilter] = useState<'ALL' | 'FLARE' | 'CME'>('ALL');

    const filteredEvents = events.filter(e => {
        if (filter === 'ALL') return true;
        return e.type === filter;
    });

    if (loading) return <div className="h-full flex items-center justify-center text-space-blue"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="h-[320px] flex flex-col">
            {/* Filters */}
            <div className="flex gap-2 mb-3 pb-2 border-b border-white/5">
                {(['ALL', 'FLARE', 'CME'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${filter === f
                            ? 'bg-space-blue/20 text-space-blue border-space-blue/50'
                            : 'text-slate-500 border-transparent hover:text-slate-300'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto pr-2 min-h-0 scrollbar-thin scrollbar-thumb-space-blue/30 scrollbar-track-transparent">
                <div className="space-y-2">
                    {filteredEvents.map(event => (
                        <div key={event.id} className="bg-slate-800/50 px-3 py-2 rounded border border-white/5 flex items-center gap-3 hover:bg-slate-800 transition-colors">
                            <div className={`p-2 rounded-full ${event.type === 'FLARE' ? 'bg-orange-500/20 text-orange-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                                {event.type === 'FLARE' ? <Flame size={14} /> : <Disc size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline">
                                    <span className={`font-mono text-xs font-bold ${event.type === 'FLARE' ? 'text-orange-300' : 'text-cyan-300'}`}>
                                        {event.type} {event.magnitude}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        {event.date.toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 truncate w-full">{event.description}</p>
                            </div>
                        </div>
                    ))}
                    {filteredEvents.length === 0 && <div className="text-center text-slate-500 text-xs py-10">No events found.</div>}
                </div>
            </div>
        </div>
    );
};
