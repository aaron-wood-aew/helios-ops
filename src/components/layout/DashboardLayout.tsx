import React from 'react';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-space-slate text-white p-4 font-sans selection:bg-space-blue selection:text-white pb-20">
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {children}
            </div>
        </div>
    );
};
