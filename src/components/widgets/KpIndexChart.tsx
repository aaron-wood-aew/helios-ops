import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { noaaApi } from '../../api/noaa';
import { Loader2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { ensureContinuousData } from '../../lib/chartUtils';

interface KpIndexChartProps {
    syncId?: string;
    domain?: [number, number];
}

export const KpIndexChart: React.FC<KpIndexChartProps> = ({ syncId, domain }) => {
    const { mode, replayRange } = useDashboard();
    const [data, setData] = useState<any[]>([]); // Use any for numeric time handling in BarChart
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

                // Process data: Convert time to number and round to nearest minute for sync
                const processed = result.map(item => ({
                    ...item,
                    time: Math.round(new Date(item.time_tag).getTime() / 60000) * 60000
                })).sort((a, b) => a.time - b.time);

                setData(processed);
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

    const visibleData = React.useMemo(() => {
        if (!domain) return data;
        const [start, end] = domain;
        // Kp is sparse. We want to hold values.
        // Use a wider buffer to capture the "last known Kp" before the window starts
        const buffer = 3 * 60 * 60 * 1000; // 3 hours
        const rawFiltered = data.filter(d => d.time >= start - buffer && d.time <= end + buffer);

        return ensureContinuousData(rawFiltered, start, end, 60000, 'hold');
    }, [data, domain]);

    if (loading) return <div className="h-full flex items-center justify-center text-space-blue"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="w-full h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visibleData} syncId={syncId}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                    <XAxis
                        dataKey="time"
                        type="number"
                        domain={domain || ['auto', 'auto']}
                        stroke="#94a3b8"
                        tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        tick={{ fontSize: 9 }}
                        minTickGap={30}
                        allowDataOverflow={true}
                    />
                    <YAxis stroke="#94a3b8" domain={[0, 9]} tick={{ fontSize: 9 }} width={20} />
                    <Tooltip
                        cursor={{ fill: '#1e293b', opacity: 0.5 }}
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                        labelFormatter={(t) => new Date(t).toLocaleString()}
                        animationDuration={0}
                    />
                    <Bar dataKey="kp_index" name="Kp Index" animationDuration={0} isAnimationActive={false}>
                        {visibleData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.kp_index)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
