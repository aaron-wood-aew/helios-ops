import { useState } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { AlertTicker } from './components/widgets/AlertTicker';
import { OpsLayout } from './components/layout/OpsLayout';
import { PhysicsLayout } from './components/layout/PhysicsLayout';
import { Archive, History, XCircle, LayoutGrid, Activity } from 'lucide-react';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import { ArchiveModal } from './components/layout/ArchiveModal';

const DashboardContent = () => {
  const { mode, toggleMode, viewMode, setViewMode, replayRange } = useDashboard();
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
        <div className="col-span-full mb-1 flex justify-between items-end border-b border-white/10 pb-2">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 uppercase">
              helios<span className="text-space-blue">-ops</span>
            </h1>
            <p className="text-slate-400 font-mono text-[10px] tracking-widest">SPACE WEATHER SITUATIONAL AWARENESS</p>
          </div>

          <div className="flex gap-4 items-center">
            {/* View Mode Toggle */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-1 flex gap-1">
              <button
                onClick={() => setViewMode('OPS')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors flex items-center gap-2 ${viewMode === 'OPS' ? 'bg-space-blue text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <LayoutGrid size={14} /> OPS
              </button>
              <button
                onClick={() => setViewMode('PHYSICS')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors flex items-center gap-2 ${viewMode === 'PHYSICS' ? 'bg-space-cyan text-black shadow-lg shadow-cyan-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <Activity size={14} /> PHYSICS
              </button>
            </div>

            <button
              onClick={() => setShowArchiveModal(true)}
              className="text-slate-400 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-wider border border-white/10 px-3 py-2 rounded hover:bg-white/5 transition-colors"
            >
              <History size={14} />
              Archives
            </button>
            <div className="text-right pl-4 border-l border-white/10 hidden md:block">
              <div className="text-xl font-mono font-bold text-space-amber">G1 / R0 / S1</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">Global Storm Scale</div>
            </div>
          </div>
        </div>

        {/* Dynamic Layout Switching */}
        {viewMode === 'OPS' ? <OpsLayout /> : <PhysicsLayout />}

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

export default App;

