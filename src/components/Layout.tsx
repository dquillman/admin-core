import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import WeeklyReviewModal from './WeeklyReviewModal';
import PageHelp from './PageHelp';
import { useMigration } from '../hooks/useMigration';

const Layout: React.FC = () => {
    useMigration();
    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100 w-full relative">
            <PageHelp />
            <Sidebar />
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
            <WeeklyReviewModal />
        </div>
    );
};

export default Layout;
