import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { noaaApi } from '../../api/noaa';
import type { XRayFlux } from '../../api/noaa';
import { Loader2 } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

interface ChartData {
    time: string;
    fluxLong: number; // 0.1-0.8nm
    fluxShort: number; // 0.05-0.4nm
}

export const XRayFluxChart: React.FC = () => {
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

                const processed = new Map<string, ChartData>();

                result.forEach(item => {
                    const time = new Date(item.time_tag).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    if (!processed.has(item.time_tag)) {
                        processed.set(item.time_tag, { time: time, fluxLong: 0, fluxShort: 0 });
                    }
                    const entry = processed.get(item.time_tag)!;

                    if (item.energy === "0.1-0.8nm") entry.fluxLong = item.flux;
                    if (item.energy === "0.05-0.4nm") entry.fluxShort = item.flux;
                });

                setData(Array.from(processed.values()).slice(-60)); // Last hour approx
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

    if (loading) {
        return <div className="h-full flex items-center justify-center text-space-blue"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="w-full h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#94a3b8" scale="log" domain={[1e-9, 1e-2]} tick={{ fontSize: 10 }} width={40} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                    <Legend />

                    {/* Flare Class Thresholds */}
                    <ReferenceLine y={1e-5} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'M', fill: '#3b82f6', fontSize: 10 }} />
                    <ReferenceLine y={1e-4} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'X', fill: '#f59e0b', fontSize: 10 }} />

                    <Line type="monotone" dataKey="fluxLong" name="Long (1-8A)" stroke="#0ea5e9" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="fluxShort" name="Short (0.5-4A)" stroke="#6366f1" dot={false} strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
