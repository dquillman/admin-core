import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Settings,
    Globe,
    LogOut,
    ShieldCheck,
    CreditCard,
    Activity,
    Rocket,
    Megaphone,
    Filter,
    CheckCircle2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AppSelector } from './AppSelector';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const Sidebar: React.FC = () => {
    const { user, logout } = useAuth();

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/users', icon: Users, label: 'Users' },
        { to: '/tester-activity', icon: Activity, label: 'Tester Activity' },
        { to: '/plans', icon: CreditCard, label: 'Plans & Trials' },
        { to: '/sources', icon: Globe, label: 'Sources' },
        { to: '/marketing-assets', icon: Rocket, label: 'Marketing Assets' },
        { to: '/marketing/leads', icon: Users, label: 'Leads' },
        { to: '/marketing/outreach', icon: Megaphone, label: 'Outreach' },
        { to: '/funnel', icon: Filter, label: 'Funnel' },
        { to: '/tutor-impact', icon: CheckCircle2, label: 'Tutor Impact' },
        { to: '/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-30">
            {/* Brand */}
            <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                        <span className="text-white font-bold">A</span>
                    </div>
                    <span className="text-lg font-bold text-white tracking-tight">Admin Core</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <AppSelector />
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                            isActive
                                ? "bg-brand-600/10 text-brand-400 border border-brand-500/20"
                                : "text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent"
                        )}
                    >
                        <item.icon className="w-5 h-5 shrink-0" />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer / User */}
            <div className="p-4 border-t border-slate-800">
                <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 border border-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center border border-slate-600 overflow-hidden">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="pfp" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-slate-300 font-bold">{user?.email?.[0].toUpperCase()}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{user?.email?.split('@')[0]}</p>
                            <div className="flex items-center gap-1 text-[10px] text-brand-400 font-bold uppercase tracking-wider">
                                <ShieldCheck className="w-3 h-3" />
                                Admin
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => logout()}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
                >
                    <LogOut className="w-5 h-5 shrink-0" />
                    <span className="font-medium">Sign Out</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
