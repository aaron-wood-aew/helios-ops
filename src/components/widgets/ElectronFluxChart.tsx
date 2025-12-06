import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { noaaApi } from '../../api/noaa';
import type { ElectronFlux } from '../../api/noaa';
import { Loader2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { ensureContinuousData } from '../../lib/chartUtils';

interface ElectronFluxChartProps {
    syncId?: string;
    domain?: [number, number];
}

export const ElectronFluxChart: React.FC<ElectronFluxChartProps> = ({ syncId, domain }) => {
    const { mode, replayRange } = useDashboard();
    const [data, setData] = useState<(ElectronFlux & { time: number })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch >2MeV Electron Flux
                // TODO: Add history endpoint for REPLAY mode if needed
                if (mode === 'REPLAY') {
                    const result = await noaaApi.getHistoryElectron(replayRange.start, replayRange.end);
                    const processed = result.map(item => ({
                        ...item,
                        satellite: 18, // Default or mock, as backend doesn't store sat ID yet
                        time: new Date(item.time_tag).getTime()
                    })).sort((a, b) => a.time - b.time);
                    setData(processed);
                } else {
                    const result = await noaaApi.getElectronFlux();
                    const processed = result.map(item => ({
                        ...item,
                        time: new Date(item.time_tag).getTime()
                    })).sort((a, b) => a.time - b.time);
                    setData(processed);
                }
            } catch (err) {
                console.error("Failed to load Electron Flux", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 60000); // 1 min update
        return () => clearInterval(interval);
    }, [mode]);

    const visibleData = React.useMemo(() => {
        if (!domain) return data;
        const [start, end] = domain;
        const buffer = 15 * 60 * 1000;

        const rawFiltered = data.filter(d => (d as any).time >= start - buffer && (d as any).time <= end + buffer);

        // 5-minute cadence typically
        return ensureContinuousData(rawFiltered, start, end, 300000, 'null');
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
                    <YAxis
                        stroke="#fbbf24"
                        domain={[10, 10000]}
                        scale="log"
                        tick={{ fontSize: 9 }}
                        width={30}
                        label={{ value: 'pfu', angle: -90, position: 'insideLeft', fill: '#fbbf24', fontSize: 9 }}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                        labelFormatter={(t) => new Date(t).toLocaleString('en-US', { timeZone: 'UTC', month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC'}
                        animationDuration={0}
                    />
                    {/* Alert Threshold: 1000 pfu is moderate, 10000 is high */}
                    <ReferenceLine y={1000} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Event', fill: '#ef4444', fontSize: 9 }} />
                    <Line type="monotone" dataKey="flux" name="Electron Flux" stroke="#facc15" strokeWidth={2} dot={false} animationDuration={0} isAnimationActive={false} connectNulls />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
