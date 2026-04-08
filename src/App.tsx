import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import LoginPage from "@/pages/Login";
import TodayPage from "@/pages/Today";
import RevisionPage from "@/pages/Revision";
import AICoachPage from "@/pages/AICoach";
import JobTrackerPage from "@/pages/JobTracker";
import NetworkLogPage from "@/pages/NetworkLog";
import StudyPlanPage from "@/pages/StudyPlan";
import ProgressPage from "@/pages/Progress";
import CalendarView from "@/pages/CalendarView";
import CodingPracticePage from "@/pages/CodingPractice";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse-glow text-primary font-heading text-2xl">PrepOS</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse-glow text-primary font-heading text-2xl">PrepOS</div></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><TodayPage /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarView /></ProtectedRoute>} />
      <Route path="/revision" element={<ProtectedRoute><RevisionPage /></ProtectedRoute>} />
      <Route path="/study-plan" element={<ProtectedRoute><StudyPlanPage /></ProtectedRoute>} />
      <Route path="/coding" element={<ProtectedRoute><CodingPracticePage /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><JobTrackerPage /></ProtectedRoute>} />
      <Route path="/network" element={<ProtectedRoute><NetworkLogPage /></ProtectedRoute>} />
      <Route path="/ai-coach" element={<ProtectedRoute><AICoachPage /></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
