import React, { useState } from 'react';
import { Card } from '../layout/Card';
import { ErrorBoundary } from '../layout/ErrorBoundary';
import { SolarLoopWidget } from '../widgets/SolarLoopWidget';
import { CoronagraphWidget } from '../widgets/CoronagraphWidget';
import { XRayFluxChart } from '../widgets/XRayFluxChart';
import { KpIndexChart } from '../widgets/KpIndexChart';
import { SolarWindChart } from '../widgets/SolarWindChart';
import { ProtonFluxChart } from '../widgets/ProtonFluxChart';
import { DstIndexChart } from '../widgets/DstIndexChart';
import { ElectronFluxChart } from '../widgets/ElectronFluxChart';
import { InterplanetaryMagChart } from '../widgets/InterplanetaryMagChart';
import { AuroraWidget } from '../widgets/AuroraWidget';
import { Disc, PlayCircle, Activity, Wind, Satellite, BarChart3, Radio, Clock, Map } from 'lucide-react';

type TimeRange = 2 | 4 | 6 | 12 | 24;

export const PhysicsLayout: React.FC = () => {
    const [range, setRange] = useState<TimeRange>(2);
    const [now, setNow] = useState(Date.now());

    // Update 'now' every minute to keep charts scrolling
    React.useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    const domain: [number, number] = [now - (range * 60 * 60 * 1000), now];

    return (
        <React.Fragment>
            {/* Header Controls for Physics Mode */}
            <div className="col-span-full flex justify-end items-center gap-2 mb-2">
                <div className="flex bg-slate-900/50 rounded-lg p-1 border border-white/10 items-center">
                    <Clock size={14} className="text-slate-400 mx-2" />
                    {[2, 4, 6, 12, 24].map((h) => (
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

            {/* LEFT COLUMN: VISUALS (33%) */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 flex flex-col gap-4">

                {/* Solar Loop */}
                <Card className="min-h-[400px] flex-1" title="Solar Dynamics Loop" icon={<PlayCircle size={18} />} info="Manual loop player for NOAA SUVI imagery. Scrub to analyze events.">
                    <ErrorBoundary name="Solar Loop"><SolarLoopWidget /></ErrorBoundary>
                </Card>

                {/* Coronagraphs */}
                <Card className="min-h-[350px]" title="SOHO LASCO Coronagraphs" icon={<Disc size={18} />} info="Coronagraphs block the sun's disk to reveal the faint corona and CMEs.">
                    <ErrorBoundary name="Coronagraph"><CoronagraphWidget /></ErrorBoundary>
                </Card>

                {/* Aurora Forecast */}
                <Card className="min-h-[300px]" title="Aurora Forecast" icon={<Map size={18} />} info="OVATION Aurora Model (30-min Forecast)">
                    <ErrorBoundary name="Aurora"><AuroraWidget /></ErrorBoundary>
                </Card>
            </div>

            {/* RIGHT COLUMN: STRIP CHART STACK (66%) */}
            <div className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col gap-4">

                {/* Stack of Strip Charts - 3 Column Grid for Bottom Row */}

                <Card className="min-h-[180px]" title="X-Ray Flux (Strip)" icon={<Activity size={18} />} info="Solar X-Ray Flux">
                    <ErrorBoundary name="XRay"><XRayFluxChart syncId="physics" domain={domain} /></ErrorBoundary>
                </Card>

                <Card className="min-h-[180px]" title="Proton Flux (Strip)" icon={<Satellite size={18} />} info="Proton Flux">
                    <ErrorBoundary name="Proton"><ProtonFluxChart syncId="physics" domain={domain} /></ErrorBoundary>
                </Card>

                <Card className="min-h-[180px]" title="Electron Flux (Strip)" icon={<Satellite size={18} />} info="Electron Flux (>2 MeV)">
                    <ErrorBoundary name="Electron"><ElectronFluxChart syncId="physics" domain={domain} /></ErrorBoundary>
                </Card>

                <Card className="min-h-[180px]" title="Solar Wind Plasma" icon={<Wind size={18} />} info="Solar Wind Speed & Density">
                    <ErrorBoundary name="Solar Wind"><SolarWindChart syncId="physics" domain={domain} /></ErrorBoundary>
                </Card>

                <Card className="min-h-[180px]" title="Interplanetary Mag Field (IMF)" icon={<Activity size={18} />} info="Bz (Vertical) & Bt (Total)">
                    <ErrorBoundary name="IMF"><InterplanetaryMagChart syncId="physics" domain={domain} /></ErrorBoundary>
                </Card>

                <Card className="min-h-[180px]" title="Planetary K-Index" icon={<BarChart3 size={18} />} info="Geomagnetic Storm Index">
                    <ErrorBoundary name="Kp"><KpIndexChart syncId="physics" domain={domain} /></ErrorBoundary>
                </Card>

                <Card className="min-h-[180px]" title="Dst Index" icon={<Activity size={18} />} info="Disturbance Storm Time Index">
                    <ErrorBoundary name="Dst"><DstIndexChart syncId="physics" domain={domain} /></ErrorBoundary>
                </Card>
            </div>
        </React.Fragment>
    );
};
