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
import Issues from './pages/Issues';
import Broadcast from './pages/Broadcast';
import CategoryRegistry from './pages/CategoryRegistry';
import OperatorReport from './pages/OperatorReport';
import ReleaseVersions from './pages/ReleaseVersions';
import TesterUsageDashboard from './pages/TesterUsageDashboard';
import Exams from './pages/Exams';
import ExamEditor from './pages/ExamEditor';
import OnboardingFlows from './pages/OnboardingFlows';
import FlowBuilder from './pages/FlowBuilder';
import OnboardingAnalytics from './pages/OnboardingAnalytics';
import SdkSetup from './pages/SdkSetup';
// v1.17.0 — New Pages
import BillingHistory from './pages/BillingHistory';
import AuditTimeline from './pages/AuditTimeline';
import UsageBillingView from './pages/UsageBillingView';
import BillingAlerts from './pages/BillingAlerts';
import UsageConfig from './pages/UsageConfig';
import UnresolvedBillingEvents from './pages/UnresolvedBillingEvents';
import InactivePaidUsers from './pages/InactivePaidUsers';
import ReleaseReadiness from './pages/ReleaseReadiness';
import RevenueDashboard from './pages/RevenueDashboard';
import TesterFunnel from './pages/TesterFunnel';
import TesterConversion from './pages/TesterConversion';


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
          <Route path="/issues" element={<Issues />} />
          <Route path="/broadcast" element={<Broadcast />} />
          <Route path="/tester-activity" element={<TesterActivity />} />
          <Route path="/usage-dashboard" element={<TesterUsageDashboard />} />
          <Route path="/marketing-assets" element={<MarketingAssets />} />
          <Route path="/marketing/leads" element={<LeadsPage />} />
          <Route path="/marketing/outreach" element={<OutreachPage />} />
          <Route path="/funnel" element={<Funnel />} />
          <Route path="/tutor-impact" element={<TutorImpact />} />
          <Route path="/categories" element={<CategoryRegistry />} />
          <Route path="/versions" element={<ReleaseVersions />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/exams/:examId" element={<ExamEditor />} />
          <Route path="/operator-report" element={<OperatorReport />} />
          <Route path="/onboarding" element={<OnboardingFlows />} />
          <Route path="/onboarding/new" element={<FlowBuilder />} />
          <Route path="/onboarding/analytics" element={<OnboardingAnalytics />} />
          <Route path="/onboarding/sdk-setup" element={<SdkSetup />} />
          <Route path="/onboarding/:flowId" element={<FlowBuilder />} />

          {/* v1.17.0 — Billing & Revenue */}
          <Route path="/billing-history" element={<BillingHistory />} />
          <Route path="/unresolved-billing" element={<UnresolvedBillingEvents />} />
          <Route path="/revenue" element={<RevenueDashboard />} />
          <Route path="/billing-alerts" element={<BillingAlerts />} />
          <Route path="/usage-billing" element={<UsageBillingView />} />
          <Route path="/inactive-paid" element={<InactivePaidUsers />} />

          {/* v1.17.0 — Analytics & Tester Insights */}
          <Route path="/usage-config" element={<UsageConfig />} />
          <Route path="/tester-funnel" element={<TesterFunnel />} />
          <Route path="/tester-conversion" element={<TesterConversion />} />

          {/* v1.17.0 — Audit & Release */}
          <Route path="/audit-timeline" element={<AuditTimeline />} />
          <Route path="/release-readiness" element={<ReleaseReadiness />} />

        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
