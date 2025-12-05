import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { noaaApi } from '../../api/noaa';
import type { KpIndex } from '../../api/noaa';
import { Loader2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

export const KpIndexChart: React.FC = () => {
    const { mode, replayRange } = useDashboard();
    const [data, setData] = useState<KpIndex[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let result;
                if (mode === 'REPLAY') {
                    result = await noaaApi.getHistoryKp(replayRange.start, replayRange.end);
                } else {
                    result = await noaaApi.getKpIndex();
                }

                // Backend might return different sort order, ensure time sort
                const sorted = result.sort((a, b) => a.time_tag.localeCompare(b.time_tag));
                setData(sorted);
            } catch (err) {
                console.error("Failed to load Kp index", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        let interval: ReturnType<typeof setInterval>;
        if (mode === 'LIVE') {
            interval = setInterval(fetchData, 60000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [mode, replayRange]);

    const getBarColor = (kp: number) => {
        if (kp < 5) return '#4ade80'; // Green
        if (kp < 6) return '#facc15'; // Yellow
        if (kp < 7) return '#fb923c'; // Orange
        if (kp < 8) return '#f87171'; // Red
        return '#ef4444'; // Extreme Red
    };

    if (loading) return <div className="h-full flex items-center justify-center text-space-blue"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="w-full h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                    <XAxis
                        dataKey="time_tag"
                        stroke="#94a3b8"
                        tickFormatter={(t) => {
                            if (!t || typeof t !== 'string') return '';
                            const parts = t.split(' ');
                            return parts.length > 1 ? parts[1].substring(0, 5) : t;
                        }}
                        tick={{ fontSize: 9 }}
                    />
                    <YAxis stroke="#94a3b8" domain={[0, 9]} tick={{ fontSize: 9 }} width={20} />
                    <Tooltip
                        cursor={{ fill: '#1e293b', opacity: 0.5 }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                    <Bar dataKey="kp_index" name="Kp Index">
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.kp_index)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
