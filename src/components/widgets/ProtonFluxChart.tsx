import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { noaaApi } from '../../api/noaa';
import type { ProtonFlux } from '../../api/noaa';
import { Loader2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import { ensureContinuousData } from '../../lib/chartUtils';

interface ChartData {
    time: number; // Changed to number
    flux10: number;
    flux100: number;
}

interface ProtonFluxChartProps {
    syncId?: string;
    domain?: [number, number];
}

export const ProtonFluxChart: React.FC<ProtonFluxChartProps> = ({ syncId, domain }) => {
    const { mode, replayRange } = useDashboard();
    const [data, setData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let result: ProtonFlux[];
                if (mode === 'REPLAY') {
                    result = await noaaApi.getHistoryProton(replayRange.start, replayRange.end);
                } else {
                    result = await noaaApi.getProtonFlux();
                }

                // Process data: Group by timestamp
                const processed = new Map<number, ChartData>();

                result.forEach(item => {
                    // Round to nearest minute for strict sync alignment
                    const time = Math.round(new Date(item.time_tag).getTime() / 60000) * 60000;
                    if (!processed.has(time)) {
                        processed.set(time, { time: time, flux10: 0, flux100: 0 });
                    }
                    const entry = processed.get(time)!;

                    if (item.energy === ">=10 MeV") entry.flux10 = item.flux;
                    if (item.energy === ">=100 MeV") entry.flux100 = item.flux;
                });

                // No manual filter needed, Recharts handles domain
                setData(Array.from(processed.values()));
            } catch (err) {
                console.error("Failed to load proton flux", err);
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

    //...

    const visibleData = React.useMemo(() => {
        if (!domain) return data.slice(-1000);
        const [start, end] = domain;
        const buffer = 15 * 60 * 1000;
        const rawFiltered = data.filter(d => d.time >= start - buffer && d.time <= end + buffer);

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
                    <YAxis stroke="#94a3b8" scale="log" domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={40} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#e2e8f0' }}
                        labelFormatter={(t) => new Date(t).toLocaleString()}
                        animationDuration={0}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="flux10" name=">10 MeV" stroke="#f59e0b" dot={false} strokeWidth={2} animationDuration={0} isAnimationActive={false} connectNulls />
                    <Line type="monotone" dataKey="flux100" name=">100 MeV" stroke="#ef4444" dot={false} strokeWidth={2} animationDuration={0} isAnimationActive={false} connectNulls />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
