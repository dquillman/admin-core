import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle, X, BookOpen } from 'lucide-react';

const HELP_CONTENT: Record<string, string> = {
    '/dashboard': `
        **Dashboard Overview**

        • **Top Stats**: Quick summary of total users, active plans, and revenue.
        • **Charts**: Visual trends of signup vs conversions over the last 30 days.
        • **Activity**: Recent signups and system alerts.
        
        *Note*: Data here is cached for performance.
    `,
    '/users': `
        **User Management**

        • **Search**: Find users by email.
        • **Role**: 'Admin' or 'User'.
        • **Plan**: Indicates their current subscription tier.
        
        *Actions*: Use the 'Edit' button to grant tester access or modify access levels.
    `,
    '/issues': `
        **Issue Tracker**

        • **Reports**: Bugs and feedback submitted by users.
        • **Status**: Open, Resolved, or Ignored.
        • **Context**: Includes URL path and user browser info at time of report.

        *Process*: Mark issues as 'Resolved' after deploying a fix.
    `,
    '/activity-2112': `
        **2112 Activity Stream**

        • **Decisions**: Autonomous choices made by the AI system (Resource Allocation, Risk).
        • **Confidence**: How certain the model was about the decision.
        • **Simulations**: Hypothetical scenarios run by admins to test response logic.

        *Legend*: Green = Implemented, Blue = Pending, Amber = Simulation.
    `,
    '/tester-activity': `
        **Tester Activity Monitor**

        • **Sessions**: Real-time log of users logged into the platform.
        • **Active Now**: Users currently online (green dot).
        • **Duration**: How long the session has been active.
        
        *Note*: 'Offline' means the user logged out or the session timed out (15m inactivity).
    `,
    'default': `
        **Admin Core Help**

        • **Navigation**: Use the sidebar to switch between modules.
        • **Data**: Most tables support sorting and filtering.
        • **Safety**: This environment is production-connected.

        *Need more help?* Check the engineering docs or contact the lead.
    `
};

const PageHelp: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    // Simple path matching
    const currentPath = location.pathname;
    const content = HELP_CONTENT[currentPath] || HELP_CONTENT['default'];

    if (isOpen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <BookOpen className="w-5 h-5 text-brand-400" />
                            <h3 className="text-lg font-bold text-white">How to read this page</h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[60vh]">
                        <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-line leading-relaxed">
                            {content}
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-800 bg-slate-950/30 text-center">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-slate-500 hover:text-slate-300 font-mono"
                        >
                            Press ESC to close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={() => setIsOpen(true)}
            className="fixed top-6 right-8 z-40 p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full backdrop-blur-sm border border-slate-700/50 shadow-lg transition-all hover:scale-105 group"
            title="Page Help"
        >
            <HelpCircle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        </button>
    );
};

export default PageHelp;
