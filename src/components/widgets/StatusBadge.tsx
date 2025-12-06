import React from 'react';

interface StatusBadgeProps {
    label: string;
    status: 'green' | 'yellow' | 'red';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, status }) => {
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
};
