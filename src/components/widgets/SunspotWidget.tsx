import React, { useEffect, useState } from 'react';
import { noaaApi, type SolarRegion } from '../../api/noaa';
import { Loader2 } from 'lucide-react';

export const SunspotWidget: React.FC = () => {
    const [regions, setRegions] = useState<SolarRegion[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState<SolarRegion | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await noaaApi.getSolarRegions();
                setRegions(data);
            } catch (err) {
                console.error("Failed to load active regions", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 60 * 60 * 1000); // 1h
        return () => clearInterval(interval);
    }, []);

    // Filter for latest data only
    const sortedRegions = [...regions].sort((a, b) => new Date(b.observed_date).getTime() - new Date(a.observed_date).getTime());
    const latestDate = sortedRegions[0]?.observed_date;
    const activeRegions = regions.filter(r => r.observed_date === latestDate);

    const project = (latDeg: number, lonDeg: number, radius: number) => {
        const lat = latDeg * (Math.PI / 180);
        const lon = lonDeg * (Math.PI / 180);

        // Solar West is POSITIVE in some systems, NEGATIVE in others.
        // JSON: S15W23 -> Lon -23.
        // Plotting: x = R * sin(-lon)
        const cx = radius;
        const cy = radius;

        const plotX = cx + radius * Math.sin(-lon);

        // Lat: +15 (North). Screen Y is Down. We want Up.
        // So we subtract from cy.
        const plotY = cy - radius * Math.sin(lat);

        return { x: plotX, y: plotY };
    };

    const RADIUS = 140;

    return (
        <div className="h-full flex flex-col items-center justify-center relative bg-black rounded-lg overflow-hidden border border-white/5">
            {loading && !regions.length && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                    <Loader2 className="animate-spin text-space-cyan" size={32} />
                </div>
            )}

            <div className="relative w-[300px] h-[300px] flex items-center justify-center group/disk">
                {/* Solar Disk - Real Image or Gradient Fallback */}
                <div className="absolute inset-0 rounded-full bg-black overflow-hidden">
                    <img
                        src="https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_HMIIC.jpg"
                        alt="Sun Disk"
                        className="w-full h-full object-cover opacity-80"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.style.background = 'linear-gradient(to bottom right, #fb923c, #ea580c)';
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-orange-600/20 mix-blend-overlay"></div>
                </div>

                {/* Grid Lines (simplified) */}
                <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
                    <circle cx="150" cy="150" r="140" fill="none" stroke="white" strokeWidth="1" />
                    {/* Equator */}
                    <line x1="10" y1="150" x2="290" y2="150" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
                    {/* Meridian */}
                    <line x1="150" y1="10" x2="150" y2="290" stroke="white" strokeWidth="1" strokeDasharray="4 4" />
                </svg>

                {/* Sunspots */}
                {activeRegions.map((r) => {
                    // Only show frontside? Usually JSON is frontside.
                    const { x, y } = project(r.latitude, r.longitude, RADIUS);
                    const isSelected = selectedRegion?.region === r.region;

                    // Size based on Area?
                    // Area 10-2000+.
                    // Scale: sqrt(area) or just log.
                    const size = Math.max(4, Math.min(20, Math.sqrt(r.area) * 0.4));

                    // Color based on Mag Class?
                    // Beta-Gamma-Delta (BGD) = Red/Danger.
                    // Alpha = Blue/Stable.
                    const mag = r.mag_class || '';
                    const isComplex = mag.includes('D') || mag.includes('G');
                    const color = isComplex ? 'bg-red-500 border-red-200' : 'bg-slate-800 border-white';

                    return (
                        <div
                            key={r.region}
                            style={{ left: x, top: y, width: size * 2, height: size * 2 }}
                            className={`absolute -ml-[var(--r)] -mt-[var(--r)] rounded-full border-2 ${color} cursor-pointer transition-transform hover:scale-125 z-10 flex items-center justify-center group ${isSelected ? 'ring-2 ring-white scale-110' : ''}`}
                            onClick={() => setSelectedRegion(r)}
                        >
                            {/* Label on hover */}
                            <div className="absolute top-full mt-1 bg-black/80 px-2 py-1 rounded text-[10px] whitespace-nowrap hidden group-hover:block z-20 border border-white/20">
                                AR {r.region} ({r.mag_class || 'N/A'})
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Info Panel */}
            <div className="absolute bottom-0 w-full bg-slate-900/90 border-t border-white/10 p-3 min-h-[100px]">
                {selectedRegion ? (
                    <div className="text-xs">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-space-cyan text-sm">Active Region {selectedRegion.region}</span>
                            <span className="text-slate-400">{selectedRegion.location}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
                            <div>Class: <span className="text-white">{selectedRegion.mag_class} / {selectedRegion.spot_class}</span></div>
                            <div>Area: <span className="text-white">{selectedRegion.area}</span></div>
                            <div>Lat/Lon: <span className="text-white">{selectedRegion.latitude}° / {selectedRegion.longitude}°</span></div>
                            <div>Spots: <span className="text-white">{selectedRegion.number_spots}</span></div>
                            <div className="col-span-2 mt-1">
                                Flare Prob (C/M/X): <span className="text-yellow-400">{selectedRegion.c_flare_probability}%</span> / <span className="text-orange-400">{selectedRegion.m_flare_probability}%</span> / <span className="text-red-400">{selectedRegion.x_flare_probability}%</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 text-xs italic">
                        Select an active region to view details
                    </div>
                )}
            </div>
        </div>
    );
};
