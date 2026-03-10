import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Globe,
    LogOut,
    ShieldCheck,
    CreditCard,
    Activity,
    BarChart2,
    Rocket,
    Megaphone,
    Filter,
    CheckCircle2,
    AlertCircle,
    ClipboardCheck,
    Tag,
    BookOpen,
    ListChecks,
    Code2,
    Receipt,
    History,
    Scale,
    AlertOctagon,
    ClipboardList,
    DollarSign,
    TrendingDown,
    TrendingUp,
    Settings,
    Bell,
    UserX,
    Layers,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useApp } from '../context/AppContext';
import { AppSelector } from './AppSelector';
import { clsx, type ClassValue } from 'clsx';
import { ADMIN_CORE_VERSION } from '../config';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}




const Sidebar: React.FC = () => {
    const state = useAuth();
    const { appId } = useApp();

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/users', icon: Users, label: 'Users' },
        { to: '/issues', icon: AlertCircle, label: 'Issues' },
        { to: '/operator-report', icon: ClipboardCheck, label: 'Operator Report' },
        { to: '/broadcast', icon: Megaphone, label: 'Broadcast' },
        { to: '/tester-activity', icon: Activity, label: 'Tester Activity' },
        { to: '/usage-dashboard', icon: BarChart2, label: 'Usage Dashboard' },
        { to: '/plans', icon: CreditCard, label: 'Plans & Trials' },
        { to: '/sources', icon: Globe, label: 'Sources' },
        { to: '/marketing-assets', icon: Rocket, label: 'Marketing Assets' },
        { to: '/marketing/leads', icon: Users, label: 'Leads' },
        { to: '/marketing/outreach', icon: Megaphone, label: 'Outreach' },
        { to: '/funnel', icon: Filter, label: 'Funnel' },
        { to: '/tutor-impact', icon: CheckCircle2, label: 'Tutor Impact' },
        ...(state.isAdmin ? [{ to: '/exams', icon: BookOpen, label: 'Exams' }] : []),
        ...(state.isAdmin ? [{ to: '/categories', icon: Layers, label: 'Issue Categories' }] : []),
        ...(state.isAdmin ? [{ to: '/versions', icon: Tag, label: 'Release Versions' }] : []),
        ...(state.isAdmin ? [{ to: '/release-readiness', icon: ClipboardList, label: 'Release Readiness' }] : []),
        ...(appId === 'onboard-kit' ? [
            { to: '/onboarding', icon: ListChecks, label: 'Flows' },
            { to: '/onboarding/analytics', icon: BarChart2, label: 'Analytics' },
            { to: '/onboarding/sdk-setup', icon: Code2, label: 'SDK Setup' },
        ] : []),
        // Billing & Revenue (admin-gated)
        ...(state.isAdmin ? [
            { to: '/billing-history', icon: Receipt, label: 'Billing History' },
            { to: '/unresolved-billing', icon: AlertOctagon, label: 'Unresolved Events' },
            { to: '/revenue', icon: DollarSign, label: 'Revenue Dashboard' },
            { to: '/billing-alerts', icon: Bell, label: 'Billing Alerts' },
            { to: '/usage-billing', icon: Scale, label: 'Usage vs Billing' },
            { to: '/inactive-paid', icon: UserX, label: 'Inactive Paid' },
        ] : []),
        // Analytics & Tester Insights (admin-gated)
        ...(state.isAdmin ? [
            { to: '/usage-config', icon: Settings, label: 'Usage Config' },
            { to: '/tester-funnel', icon: TrendingDown, label: 'Tester Funnel' },
            { to: '/tester-conversion', icon: TrendingUp, label: 'Tester Conversion' },
            { to: '/audit-timeline', icon: History, label: 'Audit Timeline' },
        ] : []),
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
                        {(item.to === '/tester-activity') && (
                            <span
                                className="ml-auto text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-full font-mono uppercase cursor-help"
                                title="This area is in beta. Features may change during testing."
                            >
                                Beta
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer / User */}
            <div className="p-4 border-t border-slate-800">
                <div className="bg-slate-800/50 rounded-2xl p-4 mb-4 border border-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center border border-slate-600 overflow-hidden">
                            {state.user?.photoURL ? (
                                <img src={state.user.photoURL} alt="pfp" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-slate-300 font-bold">{state.user?.email?.[0].toUpperCase()}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{state.user?.email?.split('@')[0]}</p>
                            <div className={cn(
                                "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider",
                                state.isSuperAdmin ? "text-amber-400" : "text-brand-400"
                            )}>
                                <ShieldCheck className="w-3 h-3" />
                                {state.isSuperAdmin ? 'Super Admin' : 'Admin'}
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => state.logout()}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
                >
                    <LogOut className="w-5 h-5 shrink-0" />
                    <span className="font-medium">Sign Out</span>
                </button>
                <div className="mt-4 text-center space-y-1">
                    <div className="text-xs text-slate-600 font-mono">Admin Core v{ADMIN_CORE_VERSION}</div>
                    <div className={cn(
                        "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider",
                        state.isSuperAdmin ? "text-amber-400/70" : "text-amber-500/70"
                    )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", state.isSuperAdmin ? "bg-amber-400/70" : "bg-amber-500/70")}></span>
                        {state.isSuperAdmin ? 'super-admin' : 'admin'}
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
