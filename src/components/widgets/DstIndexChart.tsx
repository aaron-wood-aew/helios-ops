import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { noaaApi } from '../../api/noaa';
import type { DstIndex } from '../../api/noaa';
import { Loader2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { ensureContinuousData } from '../../lib/chartUtils';

interface DstIndexChartProps {
    syncId?: string;
    domain?: [number, number];
}

export const DstIndexChart: React.FC<DstIndexChartProps> = ({ syncId, domain }) => {
    const { mode, replayRange } = useDashboard();
    const [data, setData] = useState<(DstIndex & { time: number })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (mode === 'REPLAY') {
                    const result = await noaaApi.getHistoryDst(replayRange.start, replayRange.end);
                    const processed = result.map(item => ({
                        ...item,
                        time: new Date(item.time_tag.endsWith('Z') ? item.time_tag : item.time_tag + 'Z').getTime()
                    })).sort((a, b) => a.time - b.time);
                    setData(processed);
                } else {
                    const result = await noaaApi.getDstIndex();

                    const processed = result.map(item => ({
                        ...item,
                        // Parse "YYYY-MM-DD HH:mm:ss" to timestamp
                        // Kyoto strings are UTC
                        time: new Date(item.time_tag + "Z").getTime()
                    })).sort((a, b) => a.time - b.time);

                    setData(processed);
                }
            } catch (err) {
                console.error("Failed to load Dst index", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 300000); // 5 min update
        return () => clearInterval(interval);
    }, [mode]);

    const visibleData = React.useMemo(() => {
        if (!domain) return data;
        const [start, end] = domain;
        const buffer = 4 * 60 * 60 * 1000; // 4 hour buffer for hourly data

        // Filter
        const rawFiltered = data.filter(d => (d as any).time >= start - buffer && (d as any).time <= end + buffer);

        // Densify? Dst is hourly.
        // If we want it to look good on a 1-minute grid sync, we should probably 'hold' 
        // or just let Recharts interpolate line. 
        // But 'syncId' needs points to match. 
        // If we use 'linear' interpolation, we generate points every minute? That's heavy.
        // If we use 'hold', we get steps.
        // Let's rely on Recharts simply plotting keyframes for now, but to ensure Sync works...
        // Sync works best if timestamps match. 
        // If 'SolarWind' has a point at 12:01 and Dst is at 12:00, sync might jump.
        // But Dst is slow moving. 

        // Let's return raw for now, as densifying hourly to minute is 60x data.
        return rawFiltered;
    }, [data, domain]);

    if (loading) return <div className="h-full flex items-center justify-center text-space-blue"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="w-full h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visibleData} syncId={syncId}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis
                        dataKey="time"
                        type="number"
                        domain={domain || ['auto', 'auto']}
                        stroke="#94a3b8"
                        tickFormatter={(t) => new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + 'Z'}
                        tick={{ fontSize: 9 }}
                        allowDataOverflow={true}
                    />
                    <YAxis stroke="#94a3b8" idx={0} domain={['auto', 'auto']} tick={{ fontSize: 9 }} width={30} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                        labelFormatter={(t) => new Date(t).toLocaleString('en-US', { timeZone: 'UTC', month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC'}
                        animationDuration={0}
                    />
                    <ReferenceLine y={-50} stroke="#facc15" strokeDasharray="3 3" label={{ value: 'Storm', fill: '#facc15', fontSize: 9 }} />
                    <ReferenceLine y={-100} stroke="#f87171" strokeDasharray="3 3" label={{ value: 'Severe', fill: '#f87171', fontSize: 9 }} />
                    <Line type="monotone" dataKey="dst" stroke="#c084fc" strokeWidth={2} dot={{ r: 2 }} animationDuration={0} isAnimationActive={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
