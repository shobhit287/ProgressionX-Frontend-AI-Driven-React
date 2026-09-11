import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import SetupGuard from '@/components/SetupGuard';
import { lazy, Suspense } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const SetupPage = lazy(() => import('@/pages/setup/SetupPage'));
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
const DietPage = lazy(() => import('@/pages/diet/DietPage'));
const BackupPage = lazy(() => import('@/pages/export/ExportPage'));

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
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* First-run: restore a backup or create a profile. Outside
                Layout — it's a full-screen blocking form. */}
            <Route path="/setup" element={<SetupPage />} />

            <Route element={<SetupGuard />}>
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
                <Route path="/export" element={<BackupPage />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
