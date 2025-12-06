import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type DashboardMode = 'LIVE' | 'REPLAY';
type ViewMode = 'OPS' | 'PHYSICS';

interface DateRange {
    start: Date;
    end: Date;
}

interface DashboardContextType {
    mode: DashboardMode;
    toggleMode: (mode: DashboardMode) => void;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    replayRange: DateRange;
    setReplayRange: (range: DateRange) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<DashboardMode>('LIVE');
    const [viewMode, setViewMode] = useState<ViewMode>('OPS');
    const [replayRange, setReplayRange] = useState<DateRange>({
        start: new Date(Date.now() - 86400000), // Default 24h back
        end: new Date()
    });

    const toggleMode = (newMode: DashboardMode) => setMode(newMode);

    return (
        <DashboardContext.Provider value={{ mode, toggleMode, viewMode, setViewMode, replayRange, setReplayRange }}>
            {children}
        </DashboardContext.Provider>
    );
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (!context) throw new Error("useDashboard must be used within DashboardProvider");
    return context;
};
