import React, { useState } from 'react';
import { Card } from '../layout/Card';
import { ErrorBoundary } from '../layout/ErrorBoundary';
import { SolarLoopWidget } from '../widgets/SolarLoopWidget';
import { CoronagraphWidget } from '../widgets/CoronagraphWidget';
import { SunspotWidget } from '../widgets/SunspotWidget';
import { XRayFluxChart } from '../widgets/XRayFluxChart';
import { KpIndexChart } from '../widgets/KpIndexChart';
import { SolarWindChart } from '../widgets/SolarWindChart';
import { ProtonFluxChart } from '../widgets/ProtonFluxChart';
import { DstIndexChart } from '../widgets/DstIndexChart';
import { ElectronFluxChart } from '../widgets/ElectronFluxChart';
import { InterplanetaryMagChart } from '../widgets/InterplanetaryMagChart';
import { AuroraWidget } from '../widgets/AuroraWidget';
import { Disc, PlayCircle, Activity, Wind, Satellite, BarChart3, Clock, Map } from 'lucide-react';

type TimeRange = 2 | 6 | 12 | 24 | 48 | 72;

export const PhysicsLayout: React.FC = () => {
    const [range, setRange] = useState<TimeRange>(24); // Default to 24h as requested by user ("past 72h" implies larger default?)
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
                    {[2, 6, 12, 24, 48, 72].map((h) => (
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
                <Card className="h-[520px] p-0" title="Solar Dynamics Loop" icon={<PlayCircle size={18} />} info={`Solar Ultraviolet Imager (SUVI) on GOES-R. \nMonitors 6 coronal channels (94Å-304Å) to detect flares, coronal holes, and filaments at temperatures up to 10MK.`}>
                    <ErrorBoundary name="Solar Loop"><SolarLoopWidget /></ErrorBoundary>
                </Card>

                {/* Coronagraphs */}
                <Card className="h-[520px] p-0" title="SOHO LASCO Coronagraphs" icon={<Disc size={18} />} info={`Large Angle Spectrometric Coronagraph (LASCO C2/C3).\nOccults the solar disk to reveal the faint outer corona. Primary tool for detecting Earth-directed Coronal Mass Ejections (CMEs).`}>
                    <ErrorBoundary name="Coronagraph"><CoronagraphWidget /></ErrorBoundary>
                </Card>

                {/* Aurora Forecast */}
                <Card className="h-[520px] p-0" title="Aurora Forecast" icon={<Map size={18} />} info={`NOAA OVATION Prime Model.\nForecasts the probability and intensity of visible aurora based on current Solar Wind conditions. Shows the auroral oval position relative to the viewing line.`}>
                    <ErrorBoundary name="Aurora"><AuroraWidget /></ErrorBoundary>
                </Card>

                {/* Sunspot Map */}
                <Card className="h-[520px] p-4" title="Active Regions (Sunspots)" icon={<Activity size={18} />} info={`Active Region Monitor.\nMap of currently numbered Sunspots (Active Regions). Size indicates area, color indicates magnetic complexity (Red=Beta-Gamma-Delta risk).`}>
                    <ErrorBoundary name="Sunspots"><SunspotWidget /></ErrorBoundary>
                </Card>
            </div>

            {/* RIGHT COLUMN: STRIP CHART STACK (66%) */}
            <div className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col gap-4">

                {/* Stack of Strip Charts - 3 Column Grid for Bottom Row */}

                <Card className="min-h-[180px]" title="X-Ray Flux (Strip)" icon={<Activity size={18} />} info={`GOES X-Ray Sensor (XRS).\nMeasures solar irradiance in 0.05-0.4nm and 0.1-0.8nm bands. Primary scale for classifying Solar Flares (A, B, C, M, X class).`}>
                    <ErrorBoundary name="XRay"><XRayFluxChart syncId="physics" domain={domain} /></ErrorBoundary>
                </Card>

                <Card className="min-h-[180px]" title="Proton Flux (Strip)" icon={<Satellite size={18} />} info={`GOES Space Environment In-Situ Suite (SEISS).\nMeasures energetic protons (>10MeV, >100MeV). High fluxes indicate Solar Radiation Storms (S-Scale) capable of satellite upsets and HF radio blocks.`}>
                    <ErrorBoundary name="Proton"><ProtonFluxChart syncId="physics" domain={domain} /></ErrorBoundary>
                </Card>

                <Card className="min-h-[180px]" title="Electron Flux (Strip)" icon={<Satellite size={18} />} info={`GOES Magnetospheric Electron Detector (MAGED).\nFlux of >2MeV electrons in the outer radiation belt. High levels can cause deep-dielectric charging on geosynchronous satellites.`}>
                    <ErrorBoundary name="Electron"><ElectronFluxChart syncId="physics" domain={domain} /></ErrorBoundary>
                </Card>

                <Card className="min-h-[180px]" title="Solar Wind Plasma" icon={<Wind size={18} />} info={`DSCOVR/ACE Real-time Solar Wind (L1).\nBulk speed (km/s), Density (p/cm³), and Temperature. High speed streams or shock fronts compress the magnetosphere, driving geomagnetic storms.`}>
                    <ErrorBoundary name="Solar Wind"><SolarWindChart syncId="physics" domain={domain} /></ErrorBoundary>
                </Card>

                <Card className="min-h-[180px]" title="Interplanetary Mag Field (IMF)" icon={<Activity size={18} />} info={`DSCOVR/ACE Magnetometer.\nBt (Total Field) and Bz (North-South Component). Negative (Southward) Bz allows magnetic reconnection, efficiently transferring energy into Earth's magnetosphere.`}>
                    <ErrorBoundary name="IMF"><InterplanetaryMagChart syncId="physics" domain={domain} /></ErrorBoundary>
                </Card>

                <Card className="min-h-[180px]" title="Planetary K-Index" icon={<BarChart3 size={18} />} info={`Planetary K-index (Kp).\nQuantifies disturbances in the horizontal component of Earth's magnetic field. Values > 5 indicate Geomagnetic Storming (G-Scale).`}>
                    <ErrorBoundary name="Kp"><KpIndexChart syncId="physics" domain={domain} /></ErrorBoundary>
                </Card>

                <Card className="min-h-[180px]" title="Dst Index" icon={<Activity size={18} />} info={`Disturbance Storm Time (Dst) Index.\nMeasures the intensity of the ring current. Negative values indicate a geomagnetic storm. Dst < -50nT is moderate, < -100nT is intense.`}>
                    <ErrorBoundary name="Dst"><DstIndexChart syncId="physics" domain={domain} /></ErrorBoundary>
                </Card>
            </div>
        </React.Fragment>
    );
};
