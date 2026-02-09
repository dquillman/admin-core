import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import WeeklyReviewModal from './WeeklyReviewModal';
import PageHelp from './PageHelp';
import ReportProblemModal from './ReportProblemModal';
import { useMigration } from '../hooks/useMigration';
import { AlertCircle } from 'lucide-react';

const Layout: React.FC = () => {
    useMigration();
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100 w-full relative">
            <PageHelp />
            <Sidebar />
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                {/* Header Bar */}
                <div className="max-w-7xl mx-auto mb-4 flex justify-end">
                    <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors"
                    >
                        <AlertCircle className="w-4 h-4" />
                        Report a Problem
                    </button>
                </div>
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
            <WeeklyReviewModal />
            <ReportProblemModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
            />
        </div>
    );
};

export default Layout;
