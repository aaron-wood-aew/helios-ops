import React, { useEffect, useState } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { noaaApi } from '../../api/noaa';
import { useDashboard } from '../../context/DashboardContext';
import { Loader2 } from 'lucide-react';

interface CombinedData {
    time: string;
    speed: number | null;
    bz: number | null;
}

export const SolarWindChart: React.FC = () => {
    const [data, setData] = useState<CombinedData[]>([]);
    const [loading, setLoading] = useState(true);
    const { mode, replayRange } = useDashboard();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (mode === 'REPLAY') {
                    // Backend returns unified model for wind, simpler than joining manually
                    const result = await noaaApi.getHistoryWind(replayRange.start, replayRange.end);
                    // Map to CombinedData format
                    const formatted = result.map(r => ({
                        time: r.time_tag,
                        speed: r.speed,
                        bz: r.bz
                    }));
                    setData(formatted);
                } else {
                    // Live Mode (Manual Join)
                    const [plasma, mag] = await Promise.all([
                        noaaApi.getSolarWindPlasma(),
                        noaaApi.getSolarWindMag()
                    ]);

                    const timeMap = new Map<string, CombinedData>();
                    plasma.forEach(p => {
                        const t = p.time_tag;
                        if (!timeMap.has(t)) timeMap.set(t, { time: t, speed: p.speed, bz: null });
                        else timeMap.get(t)!.speed = p.speed;
                    });
                    mag.forEach(m => {
                        const t = m.time_tag;
                        if (!timeMap.has(t)) timeMap.set(t, { time: t, speed: null, bz: m.bz_gsm });
                        else timeMap.get(t)!.bz = m.bz_gsm;
                    });
                    const sorted = Array.from(timeMap.values())
                        .sort((a, b) => a.time.localeCompare(b.time))
                        .slice(-60);
                    setData(sorted);
                }
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

    if (loading) return <div className="h-full flex items-center justify-center text-space-blue"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="w-full h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis
                        dataKey="time"
                        stroke="#94a3b8"
                        tickFormatter={(t) => t.split(' ')[1]?.substring(0, 5) || ''}
                        tick={{ fontSize: 9 }}
                    />

                    {/* Left Axis: Speed (km/s) */}
                    <YAxis yAxisId="left" stroke="#0ea5e9" tick={{ fontSize: 9 }} domain={['auto', 'auto']} label={{ value: 'km/s', angle: -90, position: 'insideLeft', fill: '#0ea5e9', fontSize: 9 }} width={30} />

                    {/* Right Axis: Bz (nT) */}
                    <YAxis yAxisId="right" orientation="right" stroke="#ef4444" tick={{ fontSize: 9 }} domain={['auto', 'auto']} label={{ value: 'Bz (nT)', angle: 90, position: 'insideRight', fill: '#ef4444', fontSize: 9 }} width={30} />

                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                        labelFormatter={(t) => t.split(' ')[1]}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />

                    <Area yAxisId="left" type="monotone" dataKey="speed" name="Wind Speed" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.1} strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="bz" name="Bz (Mag)" stroke="#ef4444" dot={false} strokeWidth={2} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};
