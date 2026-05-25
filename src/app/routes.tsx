import React from 'react';
import { createBrowserRouter, Navigate, useNavigate, useParams, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { Package, RotateCcw } from 'lucide-react';

// ── Landing page ────────────────────────────────────────────────────────────
import { LandingPage } from './components/landing/LandingPage';

// ── Infrastructure ─────────────────────────────────────────────────────────────
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { AppLayout } from './components/AppLayout';

// ── Auth pages ─────────────────────────────────────────────────────────────────
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { CheckEmailPage } from './components/auth/CheckEmailPage';
import { VerifyEmailPage } from './components/auth/VerifyEmailPage';

// ── App screens (existing) ─────────────────────────────────────────────────────
import { ProjectsBoard } from './components/ProjectsBoard';
import { AddProjectScreen } from './components/AddProjectScreen';
import { ProjectDashboard } from './components/ProjectDashboard';
import { TeamOptimizationScreen } from './components/TeamOptimizationScreen';
import { RiskAnalysisScreen } from './components/RiskAnalysisScreen';
import { SuccessForecastingScreen } from './components/SuccessForecastingScreen';
import { ReportingScreen } from './components/ReportingScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { HelpScreen } from './components/HelpScreen';

// ── Contexts ────────────────────────────────────────────────────────────────────
import { useAuth } from './contexts/AuthContext';
import { useProjects } from './contexts/ProjectsContext';
import { LoadingScreen } from './components/LoadingScreen';
import type { User } from './App';

// ─── Helper: map AuthUser to legacy User shape ────────────────────────────────
function useUserBridge(): User {
  const { user } = useAuth();
  return {
    name: user?.fullName || '',
    email: user?.email || '',
    password: '',
    age: '',
  };
}

// ─── Helper: map navigate to old onNavigate signature ────────────────────────
function useOldNavigate() {
  const navigate = useNavigate();
  return (screen: string) => {
    const map: Record<string, string> = {
      'projects-board': '/projects',
      'add-project': '/projects/new',
      'dashboard': '/projects',
      'team-optimization': 'team',
      'risk-analysis': 'risk',
      'success-forecasting': 'success',
      'reporting': 'reports',
      profile: '/profile',
      settings: '/settings',
      help: '/help',
    };
    const target = map[screen];
    if (target) navigate(target);
  };
}

// ─── Projects Board Bridge ─────────────────────────────────────────────────────
function ProjectsBoardRoute() {
  return <ProjectsBoard />;
}

// ─── Add Project Bridge ────────────────────────────────────────────────────────
function AddProjectRoute() {
  const navigate = useNavigate();
  const { projects } = useProjects();

  return (
    <AddProjectScreen
      onBack={() => navigate('/projects')}
      hasProjects={projects.length > 0}
    />
  );
}

// ─── Project Dashboard Bridge ──────────────────────────────────────────────────
function ProjectDashboardRoute() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const { getProjectById, isLoading } = useProjects();
  const project = getProjectById(projectId!);
  if (isLoading) return <LoadingScreen />;
  if (!project) return <Navigate to="/projects" replace />;
  // key={location.key} guarantees a full remount (and fresh data fetch) on every
  // navigation to this route — even when coming back to the same projectId.
  return <ProjectDashboard key={location.key} />;
}

// ─── Team Optimization Bridge ──────────────────────────────────────────────────
function TeamOptimizationRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, getProjectById, updateProject, restoreProject, isLoading } = useProjects();
  const project = getProjectById(projectId!);

  if (isLoading) return <LoadingScreen />;
  if (!project) return <Navigate to="/projects" replace />;

  return (
    <>
      {project.status === 'Archived' && (
        <ArchivedBanner
          projectId={project.id}
          onRestore={() => { restoreProject(project.id).catch(() => {}); }}
        />
      )}
      <TeamOptimizationScreen
        key={location.key}
        project={project}
        onUpdateProject={updateProject}
        onBack={() => navigate(`/projects/${project.id}`)}
        projects={projects}
        onSelectProject={(p) => navigate(`/projects/${p.id}`)}
      />
    </>
  );
}

// ─── Risk Analysis Bridge ──────────────────────────────────────────────────────
function RiskAnalysisRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, getProjectById, updateProject, restoreProject, isLoading } = useProjects();
  const project = getProjectById(projectId!);

  if (isLoading) return <LoadingScreen />;
  if (!project) return <Navigate to="/projects" replace />;

  return (
    <>
      {project.status === 'Archived' && (
        <ArchivedBanner
          projectId={project.id}
          onRestore={() => { restoreProject(project.id).catch(() => {}); }}
        />
      )}
      <RiskAnalysisScreen
        key={location.key}
        project={project}
        onUpdateProject={updateProject}
        onBack={() => navigate(`/projects/${project.id}`)}
        projects={projects}
        onSelectProject={(p) => navigate(`/projects/${p.id}`)}
      />
    </>
  );
}

// ─── Success Forecasting Bridge ────────────────────────────────────────────────
function SuccessForecastingRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, getProjectById, updateProject, restoreProject, isLoading } = useProjects();
  const project = getProjectById(projectId!);

  if (isLoading) return <LoadingScreen />;
  if (!project) return <Navigate to="/projects" replace />;

  return (
    <>
      {project.status === 'Archived' && (
        <ArchivedBanner
          projectId={project.id}
          onRestore={() => { restoreProject(project.id).catch(() => {}); }}
        />
      )}
      <SuccessForecastingScreen
        key={location.key}
        project={project}
        onUpdateProject={updateProject}
        onBack={() => navigate(`/projects/${project.id}`)}
        projects={projects}
        onSelectProject={(p) => navigate(`/projects/${p.id}`)}
      />
    </>
  );
}

// ─── Reporting Bridge ─────────���────────────────────────────────────────────────
function ReportingRoute() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, getProjectById, updateProject, restoreProject, isLoading } = useProjects();
  const project = getProjectById(projectId!);

  if (isLoading) return <LoadingScreen />;
  if (!project) return <Navigate to="/projects" replace />;

  return (
    <>
      {project.status === 'Archived' && (
        <ArchivedBanner
          projectId={project.id}
          onRestore={() => { restoreProject(project.id).catch(() => {}); }}
        />
      )}
      <ReportingScreen
        project={project}
        onUpdateProject={updateProject}
        onBack={() => navigate(`/projects/${project.id}`)}
        projects={projects}
        onSelectProject={(p) => navigate(`/projects/${p.id}`)}
      />
    </>
  );
}

// ─── Profile Bridge ────────────────────────────────────────────────────────────
function ProfileRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userBridge = useUserBridge();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <ProfileScreen
      user={userBridge}
      onUpdateUser={() => {}}
      onBack={() => navigate('/projects')}
    />
  );
}

// ─── Settings Bridge ───────────────────────────────────────────────────────────
function SettingsRoute() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const user = useUserBridge();

  return (
    <SettingsScreen
      user={user}
      onNavigate={(screen) => {
        const map: Record<string, string> = {
          profile: '/profile',
          'projects-board': '/projects',
          settings: '/settings',
          help: '/help',
        };
        navigate(map[screen] || '/projects');
      }}
      onLogout={() => {
        logout();
        navigate('/login', { replace: true });
      }}
      onBack={() => navigate('/projects')}
    />
  );
}

// ─── Help Bridge ───────────────────────────────────────────────────────────────
function HelpRoute() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const user = useUserBridge();

  return (
    <HelpScreen
      user={user}
      onNavigate={(screen) => {
        const map: Record<string, string> = {
          profile: '/profile',
          'projects-board': '/projects',
          settings: '/settings',
          help: '/help',
        };
        navigate(map[screen] || '/projects');
      }}
      onLogout={() => {
        logout();
        navigate('/login', { replace: true });
      }}
      onBack={() => navigate('/projects')}
    />
  );
}

// ─── Public layout wrapper (adds Toaster for auth pages) ──────────────────────
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  // ── Landing page (public — visible to all users) ────────────────────────────
  {
    index: true,
    path: '/',
    Component: LandingPage,
  },

  // ── Public-only routes ──────────────────────────────────────────────────────
  {
    path: '/login',
    Component: () => (
      <PublicRoute>
        <PublicLayout>
          <LoginPage />
        </PublicLayout>
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    Component: () => (
      <PublicRoute>
        <PublicLayout>
          <RegisterPage />
        </PublicLayout>
      </PublicRoute>
    ),
  },
  {
    path: '/forgot-password',
    Component: () => (
      <PublicRoute>
        <PublicLayout>
          <ForgotPasswordPage />
        </PublicLayout>
      </PublicRoute>
    ),
  },
  {
    path: '/reset-password',
    Component: () => (
      <PublicRoute>
        <PublicLayout>
          <ResetPasswordPage />
        </PublicLayout>
      </PublicRoute>
    ),
  },
  // Not wrapped in PublicRoute — must be accessible regardless of auth state
  {
    path: '/check-email',
    Component: () => (
      <PublicLayout>
        <CheckEmailPage />
      </PublicLayout>
    ),
  },
  {
    path: '/verify-email',
    Component: () => (
      <PublicLayout>
        <VerifyEmailPage />
      </PublicLayout>
    ),
  },
  // Support /auth/verify-email path if backend is configured with that prefix
  {
    path: '/auth/verify-email',
    Component: () => (
      <PublicLayout>
        <VerifyEmailPage />
      </PublicLayout>
    ),
  },

  // ── Protected routes (wrapped in AppLayout with TopNavigation) ──────────────
  {
    path: '/',
    Component: () => (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'projects', Component: ProjectsBoardRoute },
      { path: 'projects/new', Component: AddProjectRoute },
      { path: 'projects/:projectId', Component: ProjectDashboardRoute },
      { path: 'projects/:projectId/team', Component: TeamOptimizationRoute },
      { path: 'projects/:projectId/risk', Component: RiskAnalysisRoute },
      { path: 'projects/:projectId/success', Component: SuccessForecastingRoute },
      { path: 'projects/:projectId/reports', Component: ReportingRoute },
      { path: 'profile', Component: ProfileRoute },
      { path: 'settings', Component: SettingsRoute },
      { path: 'help', Component: HelpRoute },
    ],
  },

  // ── Catch-all ──────────────────────────────────────────────────────────────
  {
    path: '*',
    Component: () => <Navigate to="/" replace />,
  },
]);

// ─── Archived project banner (E3 — shown on all sub-module pages) ─────────────
function ArchivedBanner({ projectId, onRestore }: { projectId: string; onRestore: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-muted border-b border-border">
      <div className="flex items-center gap-3 max-w-7xl mx-auto w-full">
        <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <p className="text-sm text-muted-foreground flex-1">
          📦 This project is archived. Restore it to make changes.
        </p>
        <button
          onClick={onRestore}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors flex-shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restore
        </button>
      </div>
    </div>
  );
}