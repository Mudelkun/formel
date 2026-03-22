import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/context/auth';
import { ThemeProvider } from '@/context/theme';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import StudentsPage from '@/pages/StudentsPage';
import StudentDetailPage from '@/pages/StudentDetailPage';
import ClassesPage from '@/pages/ClassesPage';
import ClassGroupsPage from '@/pages/ClassGroupsPage';
import EnrollmentsPage from '@/pages/EnrollmentsPage';
import SchoolYearsPage from '@/pages/SchoolYearsPage';
import PaymentsPage from '@/pages/PaymentsPage';
import FinancePage from '@/pages/FinancePage';
import UsersPage from '@/pages/UsersPage';
import AuditLogsPage from '@/pages/AuditLogsPage';
import SettingsPage from '@/pages/SettingsPage';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

function DashboardRedirect() {
  const { user } = useAuth();
  if (user?.role === 'teacher') return <Navigate to="/students" replace />;
  return <DashboardPage />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;

  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <Routes>
                {/* Public */}
                <Route
                  path="/login"
                  element={
                    <GuestRoute>
                      <LoginPage />
                    </GuestRoute>
                  }
                />

                {/* Protected — wrapped in AppLayout */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardRedirect />} />

                  {/* Gestion Scolaire */}
                  <Route path="students" element={<StudentsPage />} />
                  <Route path="students/:id" element={<StudentDetailPage />} />
                  <Route path="classes" element={<ClassesPage />} />
                  <Route
                    path="class-groups"
                    element={
                    <ProtectedRoute roles={['admin', 'secretary']}>
                      <ClassGroupsPage />
                    </ProtectedRoute>
                  }
                  />
                  <Route
                    path="enrollments"
                    element={
                      <ProtectedRoute roles={['admin', 'secretary']}>
                        <EnrollmentsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="school-years"
                    element={
                      <ProtectedRoute roles={['admin', 'secretary']}>
                        <SchoolYearsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Finances */}
                  <Route
                    path="payments"
                    element={
                      <ProtectedRoute roles={['admin', 'secretary']}>
                        <PaymentsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="finance"
                    element={
                      <ProtectedRoute roles={['admin']}>
                        <FinancePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Administration */}
                  <Route
                    path="users"
                    element={
                      <ProtectedRoute roles={['admin']}>
                        <UsersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="audit-logs"
                    element={
                      <ProtectedRoute roles={['admin']}>
                        <AuditLogsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="settings"
                    element={
                      <ProtectedRoute roles={['admin']}>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      </TooltipProvider>
      <Toaster />
    </QueryClientProvider>
  );
}
