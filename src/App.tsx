import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import AdminGuard from '@/components/AdminGuard';
import { lazy, Suspense } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const LoginPage = lazy(() => import('@/pages/auth/Login'));
const SignupPage = lazy(() => import('@/pages/auth/Signup'));
const DashboardPage = lazy(() => import('@/pages/dashboard/Dashboard'));
const SplitListPage = lazy(() => import('@/pages/splits/SplitList'));
const SplitDetailPage = lazy(() => import('@/pages/splits/SplitDetail'));
const ActiveSessionPage = lazy(() => import('@/pages/session/ActiveSession'));
const SessionHistoryPage = lazy(() => import('@/pages/session/SessionHistory'));
const AnalyticsPage = lazy(() => import('@/pages/analytics/AnalyticsPage'));
const WeightPage = lazy(() => import('@/pages/weight/WeightPage'));
const AIPage = lazy(() => import('@/pages/ai/AIPage'));
const AskPage = lazy(() => import('@/pages/ask/AskPage'));
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const CompleteProfilePage = lazy(() => import('@/pages/profile/CompleteProfile'));
const DietPage = lazy(() => import('@/pages/diet/DietPage'));
const ExportPage = lazy(() => import('@/pages/export/ExportPage'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboard'));
const PrivacyPolicyPage = lazy(() => import('@/pages/legal/PrivacyPolicy'));
const TermsOfServicePage = lazy(() => import('@/pages/legal/TermsOfService'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      placeholderData: keepPreviousData,
      refetchOnWindowFocus: false,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <LoadingSpinner size={32} />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Public legal pages — reachable without auth so Google's OAuth
                consent screen crawler and anonymous visitors can view them */}
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />

            {/* Superadmin routes */}
            <Route element={<AdminGuard />}>
              <Route path="/superadmin" element={<AdminDashboardPage />} />
            </Route>

            {/* Normal user routes */}
            <Route element={<AuthGuard />}>
              {/* Profile-completion is outside Layout — it's a full-screen
                  blocking form that shows before the user can use the app */}
              <Route path="/profile/complete" element={<CompleteProfilePage />} />
              <Route element={<Layout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/splits" element={<SplitListPage />} />
                <Route path="/splits/:id" element={<SplitDetailPage />} />
                <Route path="/session/:id" element={<ActiveSessionPage />} />
                <Route path="/sessions" element={<SessionHistoryPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/weight" element={<WeightPage />} />
                <Route path="/ai" element={<AIPage />} />
                <Route path="/ask" element={<AskPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/diet" element={<DietPage />} />
                <Route path="/export" element={<ExportPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
