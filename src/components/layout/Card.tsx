import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Info } from 'lucide-react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    icon?: React.ReactNode;
    info?: string; // New prop for helper text
}

export const Card: React.FC<CardProps> = ({ children, className, title, icon, info }) => {
    return (
        <div className={twMerge(clsx(
            "bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden shadow-xl flex flex-col group/card",
            className
        ))}>
            {title && (
                <div className="bg-slate-800/40 p-3 border-b border-slate-700/50 flex items-center gap-2 relative">
                    {icon && <span className="text-space-blue">{icon}</span>}
                    <h3 className="font-mono text-sm font-bold tracking-wider text-slate-300 uppercase flex-1">{title}</h3>

                    {/* Info Tooltip Trigger */}
                    {info && (
                        <div className="group/info relative cursor-help">
                            <Info size={16} className="text-slate-500 hover:text-space-blue transition-colors" />

                            {/* Tooltip Content */}
                            <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-slate-900 border border-slate-600 rounded-lg shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-50 text-xs text-slate-300 leading-relaxed pointer-events-none">
                                <div className="absolute -top-1 right-1 w-2 h-2 bg-slate-900 border-t border-l border-slate-600 transform rotate-45"></div>
                                {info.split('\n').map((line, i) => (
                                    <p key={i} className={i === 0 ? "font-bold text-white mb-1" : "mb-1"}>{line}</p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            <div className={`flex-1 relative ${className?.includes('p-0') ? '' : 'p-4'} flex flex-col`}>
                {children}
            </div>
        </div>
    );
};
