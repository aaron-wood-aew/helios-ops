import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { noaaApi } from '../../api/noaa';
import type { ProtonFlux } from '../../api/noaa';
import { Loader2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

interface ChartData {
    time: string;
    flux10: number;
    flux100: number;
}

export const ProtonFluxChart: React.FC = () => {
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

                // Process data: Group by timestamp to have multiple lines
                const processed = new Map<string, ChartData>();

                result.forEach(item => {
                    const time = new Date(item.time_tag).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    if (!processed.has(item.time_tag)) {
                        processed.set(item.time_tag, { time: time, flux10: 0, flux100: 0 });
                    }
                    const entry = processed.get(item.time_tag)!;

                    if (item.energy === ">=10 MeV") entry.flux10 = item.flux;
                    if (item.energy === ">=100 MeV") entry.flux100 = item.flux;
                });

                // Convert map to array and take last 50 points for performance
                setData(Array.from(processed.values()).slice(-50));
            } catch (err) {
                console.error("Failed to load proton flux", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        let interval: ReturnType<typeof setInterval>;
        if (mode === 'LIVE') {
            interval = setInterval(fetchData, 60000); // Update every minute
        }
        return () => { if (interval) clearInterval(interval); };
    }, [mode, replayRange]);

    if (loading) {
        return <div className="h-full flex items-center justify-center text-space-blue"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="w-full h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" scale="log" domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={40} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="flux10" name=">10 MeV" stroke="#f59e0b" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="flux100" name=">100 MeV" stroke="#ef4444" dot={false} strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
