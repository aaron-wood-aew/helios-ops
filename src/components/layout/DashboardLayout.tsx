import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface DashboardLayoutProps {
    children: React.ReactNode;
}


export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const { isAuthenticated, user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-space-slate text-white p-4 font-sans selection:bg-space-blue selection:text-white pb-20 relative">
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                {children}
            </div>

            {/* Footer */}
            <footer className="max-w-[1600px] mx-auto border-t border-white/10 pt-4 flex justify-between items-center text-xs text-slate-500 font-mono tracking-widest uppercase">
                <div>
                    Helios.Ops v3.0 // Space Weather Dashboard
                </div>
                <div className="flex gap-4 items-center">
                    {isAuthenticated ? (
                        <>
                            <span className="flex items-center gap-1 text-blue-400">
                                <User size={12} /> {user}
                            </span>
                            <button onClick={logout} className="hover:text-red-400 flex items-center gap-1 transition-colors">
                                <LogOut size={12} /> Logout
                            </button>
                        </>
                    ) : (
                        <Link to="/login" className="hover:text-white flex items-center gap-2 transition-colors opacity-50 hover:opacity-100">
                            <Lock size={12} /> Admin
                        </Link>
                    )}
                </div>
            </footer>
        </div>
    );
};
