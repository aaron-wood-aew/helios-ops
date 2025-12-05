import React, { useState } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Card } from './components/layout/Card';
import { ProtonFluxChart } from './components/widgets/ProtonFluxChart';
import { XRayFluxChart } from './components/widgets/XRayFluxChart';
import { KpIndexChart } from './components/widgets/KpIndexChart';
import { SolarWindChart } from './components/widgets/SolarWindChart';
import { SolarImageWidget } from './components/widgets/SolarImageWidget';
import { AlertTicker } from './components/widgets/AlertTicker';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { EventLogWidget } from './components/widgets/EventLogWidget';
import { Sun, Satellite, Radio, Wind, BarChart3, Activity, History, Archive, XCircle } from 'lucide-react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import { ArchiveModal } from './components/layout/ArchiveModal';

// Tooltip Content Definitions
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

const DashboardContent = () => {
  const { mode, toggleMode, replayRange } = useDashboard();
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  return (
    <ErrorBoundary name="App Root">
      {/* Archive Banner */}
      {mode === 'REPLAY' && (
        <div className="bg-amber-500/10 border-b border-amber-500/50 p-2 text-center flex items-center justify-center gap-4 animate-in fade-in slide-in-from-top-4">
          <span className="text-amber-500 font-bold font-mono uppercase tracking-widest text-sm flex items-center gap-2">
            <Archive size={16} />
            Historical Data View: {replayRange.start.toLocaleDateString()} - {replayRange.end.toLocaleDateString()}
          </span>
          <button
            onClick={() => toggleMode('LIVE')}
            className="bg-amber-900/50 hover:bg-amber-900 text-amber-200 text-xs px-3 py-1 rounded border border-amber-500/30 flex items-center gap-1"
          >
            <XCircle size={12} /> Return to Live
          </button>
        </div>
      )}

      <DashboardLayout>
        {/* Header / Title */}
        <div className="col-span-full mb-4 flex justify-between items-end border-b border-white/10 pb-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 uppercase">
              Helios<span className="text-space-blue">.Ops</span>
            </h1>
            <p className="text-slate-400 font-mono text-xs tracking-widest mt-1">SPACE WEATHER SITUATIONAL AWARENESS</p>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setShowArchiveModal(true)}
              className="text-slate-400 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-wider border border-white/10 px-3 py-2 rounded hover:bg-white/5 transition-colors"
            >
              <History size={14} />
              Archives
            </button>
            <div className="text-right">
              <div className="text-xl font-mono font-bold text-space-amber">G1 / R0 / S1</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">Global Storm Scale</div>
            </div>
          </div>
        </div>

        {/* Rest of the grid... (Same as before) */}
        {/* Row 1 */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 min-h-[350px]" title="GOES-16 SUVI (Latest)" icon={<Sun size={18} />} info={HELP_IMAGING}>
          <ErrorBoundary name="Solar Image"><SolarImageWidget /></ErrorBoundary>
        </Card>
        <Card className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 min-h-[200px]" title="Solar X-Ray Flux" icon={<Activity size={18} />} info={HELP_XRAY}>
          <ErrorBoundary name="XRay Chart"><XRayFluxChart /></ErrorBoundary>
        </Card>
        <Card className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 min-h-[200px]" title="Planetary K-Index" icon={<BarChart3 size={18} />} info={HELP_KP}>
          <ErrorBoundary name="Kp Chart"><KpIndexChart /></ErrorBoundary>
        </Card>

        {/* Row 2 */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 min-h-[200px]" title="Real-Time Solar Wind" icon={<Wind size={18} />} info={HELP_WIND}>
          <ErrorBoundary name="Solar Wind Chart"><SolarWindChart /></ErrorBoundary>
        </Card>
        <Card className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 min-h-[200px]" title="Proton Flux" icon={<Satellite size={18} />} info={HELP_PROTON}>
          <ErrorBoundary name="Proton Flux Chart"><ProtonFluxChart /></ErrorBoundary>
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

      </DashboardLayout>
      <AlertTicker />

      {showArchiveModal && <ArchiveModal onClose={() => setShowArchiveModal(false)} />}
    </ErrorBoundary>
  );
};

function App() {
  return (
    <ErrorBoundary name="App Root (Top Level)">
      <DashboardProvider>
        <DashboardContent />
      </DashboardProvider>
    </ErrorBoundary>
  );
}

const StatusBadge = ({ label, status }: { label: string, status: 'green' | 'yellow' | 'red' }) => {
  const colors = {
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse',
  };

  return (
    <div className={`border rounded-lg p-3 flex flex-col items-center justify-center ${colors[status]}`}>
      <div className={`w-3 h-3 rounded-full mb-2 ${status === 'green' ? 'bg-green-500' : status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
      <span className="font-mono text-xs font-bold uppercase">{label}</span>
    </div>
  );
}

export default App;
