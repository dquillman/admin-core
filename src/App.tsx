import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AccessDenied from './pages/AccessDenied';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Plans from './pages/Plans';
import Sources from './pages/Sources';
import TesterActivity from './pages/TesterActivity';
import MarketingAssets from './pages/MarketingAssets';
import LeadsPage from './pages/Marketing/Leads';
import OutreachPage from './pages/Marketing/Outreach';
import Funnel from './pages/Funnel';
import TutorImpact from './pages/TutorImpact';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Placeholder components for pages we haven't built yet
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col gap-4">
    <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center">
      <p className="text-slate-400">The {title} page is under construction.</p>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/access-denied" element={<AccessDenied />} />

        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/tester-activity" element={<TesterActivity />} />
          <Route path="/marketing-assets" element={<MarketingAssets />} />
          <Route path="/marketing/leads" element={<LeadsPage />} />
          <Route path="/marketing/outreach" element={<OutreachPage />} />
          <Route path="/funnel" element={<Funnel />} />
          <Route path="/tutor-impact" element={<TutorImpact />} />
          <Route path="/settings" element={<Placeholder title="Settings" />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
