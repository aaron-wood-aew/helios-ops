import React, { useEffect, useState } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { noaaApi } from '../../api/noaa';
import { useDashboard } from '../../context/DashboardContext';
import { Loader2 } from 'lucide-react';
import { ensureContinuousData } from '../../lib/chartUtils';

interface CombinedData {
    time: number;
    speed: number | null;
    bz: number | null;
}

interface SolarWindChartProps {
    syncId?: string;
    domain?: [number, number];
}

export const SolarWindChart: React.FC<SolarWindChartProps> = ({ syncId, domain }) => {
    const [data, setData] = useState<CombinedData[]>([]);
    const [loading, setLoading] = useState(true);
    const { mode, replayRange } = useDashboard();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let sorted: CombinedData[] = [];
                if (mode === 'REPLAY') {
                    const result = await noaaApi.getHistoryWind(replayRange.start, replayRange.end);
                    sorted = result.map(r => ({
                        time: new Date(r.time_tag).getTime(),
                        speed: r.speed,
                        bz: r.bz
                    }));
                } else {
                    const [plasma, mag] = await Promise.all([
                        noaaApi.getSolarWindPlasma(),
                        noaaApi.getSolarWindMag()
                    ]);

                    const timeMap = new Map<number, CombinedData>();

                    // Helper to get closest minute to ensure sync works across different datasets
                    // Recharts syncId requires exact matching values.
                    plasma.forEach(p => {
                        const rawT = new Date(p.time_tag).getTime();
                        // Round to nearest minute (60000ms)
                        const t = Math.round(rawT / 60000) * 60000;
                        if (!timeMap.has(t)) timeMap.set(t, { time: t, speed: p.speed, bz: null });
                        else timeMap.get(t)!.speed = p.speed;
                    });
                    mag.forEach(m => {
                        const rawT = new Date(m.time_tag).getTime();
                        const t = Math.round(rawT / 60000) * 60000;
                        if (!timeMap.has(t)) timeMap.set(t, { time: t, speed: null, bz: m.bz_gsm });
                        else timeMap.get(t)!.bz = m.bz_gsm;
                    });

                    sorted = Array.from(timeMap.values())
                        .sort((a, b) => a.time - b.time);
                }

                setData(sorted);
            } catch (err) {
                console.error("Solar wind load error", err);
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

    // Filter data to only show what is requested in the domain
    // Power Performance Optimization:
    const visibleData = React.useMemo(() => {
        if (!domain) return data.slice(-120);
        const [start, end] = domain;
        const buffer = 15 * 60 * 1000;
        const rawFiltered = data.filter(d => d.time >= start - buffer && d.time <= end + buffer);

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
                        minTickGap={30}
                        allowDataOverflow={true}
                    />

                    {/* Left Axis: Speed (km/s) */}
                    <YAxis yAxisId="left" stroke="#0ea5e9" tick={{ fontSize: 9 }} domain={['auto', 'auto']} label={{ value: 'km/s', angle: -90, position: 'insideLeft', fill: '#0ea5e9', fontSize: 9 }} width={50} />

                    {/* Right Axis: Bz (nT) */}
                    <YAxis yAxisId="right" orientation="right" stroke="#ef4444" tick={{ fontSize: 9 }} domain={['auto', 'auto']} label={{ value: 'Bz (nT)', angle: 90, position: 'insideRight', fill: '#ef4444', fontSize: 9 }} width={50} />

                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                        labelFormatter={(t) => new Date(t).toLocaleString('en-US', { timeZone: 'UTC', month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' UTC'}
                        animationDuration={0} // Remove animation for snappiness
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />

                    <Area yAxisId="left" type="monotone" dataKey="speed" name="Wind Speed" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.1} strokeWidth={2} animationDuration={0} isAnimationActive={false} connectNulls />
                    <Line yAxisId="right" type="monotone" dataKey="bz" name="Bz (Mag)" stroke="#ef4444" dot={false} strokeWidth={2} animationDuration={0} isAnimationActive={false} connectNulls />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};
