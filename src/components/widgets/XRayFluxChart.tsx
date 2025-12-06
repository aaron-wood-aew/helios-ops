import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { noaaApi } from '../../api/noaa';
import type { XRayFlux } from '../../api/noaa';
import { Loader2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { ensureContinuousData } from '../../lib/chartUtils';

interface ChartData {
    time: number; // Changed to number
    fluxLong: number; // 0.1-0.8nm
    fluxShort: number; // 0.05-0.4nm
}

interface XRayFluxChartProps {
    syncId?: string;
    domain?: [number, number];
}

export const XRayFluxChart: React.FC<XRayFluxChartProps> = ({ syncId, domain }) => {
    const { mode, replayRange } = useDashboard();
    const [data, setData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let result: XRayFlux[];
                if (mode === 'REPLAY') {
                    result = await noaaApi.getHistoryXRay(replayRange.start, replayRange.end);
                } else {
                    result = await noaaApi.getXRayFlux();
                }

                const processed = new Map<number, ChartData>();

                result.forEach(item => {
                    // Round to nearest minute for sync
                    const time = Math.round(new Date(item.time_tag).getTime() / 60000) * 60000;

                    if (!processed.has(time)) {
                        processed.set(time, { time: time, fluxLong: 0, fluxShort: 0 });
                    }
                    const entry = processed.get(time)!;

                    if (item.energy === "0.1-0.8nm") entry.fluxLong = item.flux;
                    if (item.energy === "0.05-0.4nm") entry.fluxShort = item.flux;
                });

                setData(Array.from(processed.values()));
            } catch (err) {
                console.error("Failed to load xray flux", err);
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

    const visibleData = React.useMemo(() => {
        if (!domain) return data.slice(-1000);
        const [start, end] = domain;
        const buffer = 15 * 60 * 1000;

        // 1. Filter raw data widely
        const rawFiltered = data.filter(d => d.time >= start - buffer && d.time <= end + buffer);

        // 2. Densify to ensure every 1-minute tick exists
        // Use 'null' fill mode so gaps appear as breaks (using connectNulls={false} or true as desired)
        // Actually for XRay we probably want to connect nulls or just have robust alignment.
        // We set fillMode='null' so we get points at T, T+1, T+2... even if empty.
        // Recharts will snap to these empty points.
        return ensureContinuousData(rawFiltered, start, end, 60000, 'null');
    }, [data, domain]);

    if (loading) {
        return <div className="h-full flex items-center justify-center text-space-blue"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="w-full h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={visibleData} syncId={syncId}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis
                        dataKey="time"
                        type="number"
                        domain={domain || ['auto', 'auto']}
                        stroke="#94a3b8"
                        tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        tick={{ fontSize: 10 }}
                        allowDataOverflow={true}
                    />
                    <YAxis stroke="#94a3b8" scale="log" domain={[1e-9, 1e-2]} tick={{ fontSize: 10 }} width={40} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                        labelFormatter={(t) => new Date(t).toLocaleString()}
                        animationDuration={0}
                    />
                    <Legend />

                    {/* Flare Class Thresholds */}
                    <ReferenceLine y={1e-5} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'M', fill: '#3b82f6', fontSize: 10 }} />
                    <ReferenceLine y={1e-4} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'X', fill: '#f59e0b', fontSize: 10 }} />

                    <Line type="monotone" dataKey="fluxLong" name="Long (1-8A)" stroke="#0ea5e9" dot={false} strokeWidth={2} animationDuration={0} isAnimationActive={false} connectNulls />
                    <Line type="monotone" dataKey="fluxShort" name="Short (0.5-4A)" stroke="#6366f1" dot={false} strokeWidth={2} animationDuration={0} isAnimationActive={false} connectNulls />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
