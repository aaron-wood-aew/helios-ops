import React from 'react';
import { Card } from '../layout/Card';
import { ErrorBoundary } from '../layout/ErrorBoundary';
import { SolarImageWidget } from '../widgets/SolarImageWidget';
import { XRayFluxChart } from '../widgets/XRayFluxChart';
import { KpIndexChart } from '../widgets/KpIndexChart';
import { SolarWindChart } from '../widgets/SolarWindChart';
import { ProtonFluxChart } from '../widgets/ProtonFluxChart';
import { EventLogWidget } from '../widgets/EventLogWidget';
import { StatusBadge } from '../widgets/StatusBadge';
import { Sun, Activity, BarChart3, Wind, Satellite, Radio, History } from 'lucide-react';

// Tooltip Content Definitions
const HELP_IMAGING = `GOES-16 SUVI (Solar UV Imager)
Real-time operational imaging.
131Å: Flaring plasma (10MK).
171Å: Quiet Corona (1MK).
195Å: Coronal Holes.
284Å: Active Regions.
304Å: Filaments/Prominences.`;

const HELP_XRAY = `Solar X-Ray Flux (GOES)
A-C Class: Background levels.
M1: Minor Radio Blackout (R1).
M5: Moderate Radio Blackout (R2).
X1: Strong Radio Blackout (R3).`;

const HELP_KP = `Planetary K-Index (Geomagnetic)
Kp < 5: Quiet to Unsettled.
Kp 5: G1 Minor Storm.
Kp 6: G2 Moderate Storm.
Kp 7: G3 Strong Storm.
Kp 8-9: Severe to Extreme.`;

const HELP_WIND = `Real-Time Solar Wind
Speed: > 500 km/s is elevated.
Bz (Mag Field): Negative (South) Bz allows energy entry.
Impact: Drives Geomagnetic Storms.`;

const HELP_PROTON = `Proton Flux (>10 MeV)
10 pfu: S1 Minor Radiation Storm.
100 pfu: S2 Moderate.
1,000 pfu: S3 Strong.
Impact: Satellite upsets, HF Comms absorption.`;

const HELP_IMPACT = `Operational Impact Matrix
HF Comms: Degraded by Flares (Day) & Storms (Night).
GPS: Errors during ionospheric storms.
Sat Control: Drag & charging events.`;

const HELP_HISTORY = `Historical Event Log
Major Solar Flares (M/X Class).
Coronal Mass Ejections (CMEs).
Last 6 Months Data (NASA DONKI).`;

// Types for Time Range
type TimeRange = 2 | 4 | 6 | 12 | 24;

export const OpsLayout: React.FC = () => {
    const [range, setRange] = React.useState<TimeRange>(6); // Default to 6h for Ops
    const [now, setNow] = React.useState(Date.now());

    // Update 'now' every minute
    React.useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    const domain: [number, number] = [now - (range * 60 * 60 * 1000), now];

    return (
        <React.Fragment>
            {/* Header Controls for Ops Mode */}
            <div className="col-span-full flex justify-end items-center gap-2 mb-2">
                <div className="flex bg-slate-900/50 rounded-lg p-1 border border-white/10 items-center">
                    <History size={14} className="text-slate-400 mx-2" />
                    {[2, 6, 12, 24].map((h) => (
                        <button
                            key={h}
                            onClick={() => setRange(h as TimeRange)}
                            className={`text-[10px] font-bold px-3 py-1 rounded transition-colors ${range === h ? 'bg-space-cyan text-black shadow-lg shadow-cyan-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            {h}H
                        </button>
                    ))}
                </div>
            </div>

            {/* Row 1 */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 min-h-[350px]" title="GOES-16 SUVI (Latest)" icon={<Sun size={18} />} info={HELP_IMAGING}>
                <ErrorBoundary name="Solar Image"><SolarImageWidget /></ErrorBoundary>
            </Card>
            <Card className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 min-h-[200px]" title="Solar X-Ray Flux" icon={<Activity size={18} />} info={HELP_XRAY}>
                <ErrorBoundary name="XRay Chart"><XRayFluxChart domain={domain} /></ErrorBoundary>
            </Card>
            <Card className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 min-h-[200px]" title="Planetary K-Index" icon={<BarChart3 size={18} />} info={HELP_KP}>
                <ErrorBoundary name="Kp Chart"><KpIndexChart domain={domain} /></ErrorBoundary>
            </Card>

            {/* Row 2 */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 min-h-[200px]" title="Real-Time Solar Wind" icon={<Wind size={18} />} info={HELP_WIND}>
                <ErrorBoundary name="Solar Wind Chart"><SolarWindChart domain={domain} /></ErrorBoundary>
            </Card>
            <Card className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 min-h-[200px]" title="Proton Flux" icon={<Satellite size={18} />} info={HELP_PROTON}>
                <ErrorBoundary name="Proton Flux Chart"><ProtonFluxChart domain={domain} /></ErrorBoundary>
            </Card>

            {/* Row 3 */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 min-h-[300px]" title="Operational Impact" icon={<Radio size={18} />} info={HELP_IMPACT}>
                <div className="grid grid-cols-1 gap-4 h-full content-start">
                    <StatusBadge label="HF Comms" status="green" />
                    <StatusBadge label="GPS / GNSS" status="yellow" />
                    <StatusBadge label="Sat Control" status="green" />
                    <StatusBadge label="Radar" status="green" />
                </div>
            </Card>
            <Card className="col-span-1 md:col-span-4 lg:col-span-4 row-span-2 min-h-[300px]" title="Major Event History" icon={<History size={18} />} info={HELP_HISTORY}>
                <ErrorBoundary name="History Log"><EventLogWidget /></ErrorBoundary>
            </Card>
        </React.Fragment>
    );
};
