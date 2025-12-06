import React, { useEffect, useState } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { noaaApi } from '../../api/noaa';
import type { SolarWindMag } from '../../api/noaa';
import { Loader2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { ensureContinuousData } from '../../lib/chartUtils';

interface InterplanetaryMagChartProps {
    syncId?: string;
    domain?: [number, number];
}

export const InterplanetaryMagChart: React.FC<InterplanetaryMagChartProps> = ({ syncId, domain }) => {
    const { mode, replayRange } = useDashboard();
    const [data, setData] = useState<(SolarWindMag & { time: number })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (mode === 'REPLAY') {
                    // Mag data is combined with plasma in history/wind endpoint
                    const result = await noaaApi.getHistoryWind(replayRange.start, replayRange.end);
                    const processed = result.map((item: any) => ({
                        time_tag: item.time_tag,
                        bz_gsm: item.bz, // Map backend 'bz' to frontend 'bz_gsm'
                        bt: item.bt,
                        time: new Date(item.time_tag.endsWith('Z') ? item.time_tag : item.time_tag + 'Z').getTime()
                    })).sort((a, b) => a.time - b.time);
                    setData(processed);
                } else {
                    // Fetch Mag Data
                    // Using mag-7-day.json via existing API. 
                    // Wait, existing getSolarWindMag fetches 7-day file. That's good.
                    const result = await noaaApi.getSolarWindMag();

                    const processed = result.map(item => ({
                        ...item,
                        time: new Date(item.time_tag).getTime()
                    })).sort((a, b) => a.time - b.time);

                    setData(processed);
                }
            } catch (err) {
                console.error("Failed to load IMF Mag", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [mode]);

    const visibleData = React.useMemo(() => {
        if (!domain) return data;
        const [start, end] = domain;
        const buffer = 15 * 60 * 1000;

        const rawFiltered = data.filter(d => (d as any).time >= start - buffer && (d as any).time <= end + buffer);
        return ensureContinuousData(rawFiltered, start, end, 60000, 'null');
    }, [data, domain]);

    if (loading) return <div className="h-full flex items-center justify-center text-space-blue"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="w-full h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={visibleData} syncId={syncId}>
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
                    <YAxis
                        stroke="#e2e8f0"
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 9 }}
                        width={30}
                        label={{ value: 'nT', angle: -90, position: 'insideLeft', fill: '#e2e8f0', fontSize: 9 }}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                        labelFormatter={(t) => new Date(t).toLocaleString('en-US', { timeZone: 'UTC', month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC'}
                        animationDuration={0}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeOpacity={0.5} />
                    <Line type="monotone" dataKey="bt" name="Bt (Total)" stroke="#f8fafc" strokeWidth={1} dot={false} animationDuration={0} isAnimationActive={false} connectNulls />
                    <Line type="monotone" dataKey="bz_gsm" name="Bz (North/South)" stroke="#ef4444" strokeWidth={2} dot={false} animationDuration={0} isAnimationActive={false} connectNulls />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};
