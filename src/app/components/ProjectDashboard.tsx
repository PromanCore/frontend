/**
 * Project Dashboard — /projects/:projectId
 * API-driven: fetches data from multiple backend endpoints on mount.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Brain, ArrowLeft, Plus, Pencil, Archive, RotateCcw, Users,
  AlertTriangle, TrendingUp, FileText, Activity, Circle,
  CheckCircle2, Clock, XCircle, ChevronRight, Package,
  AlertCircle, BarChart3, Loader2, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { useProjects } from '../contexts/ProjectsContext';
import { EditProjectModal } from './EditProjectModal';
import { formatDate, formatDateShort, formatRelativeDate } from '../lib/dateUtils';
import projectsApi from '../lib/projectsApi';
import type {
  Project, AnalysisStatus, TeamMember, TeamAnalysisSnapshot,
  RiskAnalysisResult, SuccessPredictionResult, Report,
} from '../App';

// ─── Dashboard fetched data shape ─────────────────────────────────────────────

interface ModuleStatuses {
  teamOptimization: AnalysisStatus;
  riskAnalysis: AnalysisStatus;
  successPrediction: AnalysisStatus;
}

interface DashboardData {
  members: TeamMember[];
  teamAnalyses: TeamAnalysisSnapshot[];
  /** From GET /dashboard — confirms a persisted team result exists even when teamAnalyses is empty. */
  latestCompletedTeamAnalysisId: string | null;
  latestRiskResult: RiskAnalysisResult | null;
  riskAnalysesCount: number;
  latestSuccessResult: SuccessPredictionResult | null;
  successPredictionsCount: number;
  reports: Report[];
  moduleStatuses: ModuleStatuses | null;
}

/**
 * Safely extracts a single result object from an API response that may return
 * either a single object or an array (endpoint behaviour varies).
 */
function extractSingle(val: any): any | null {
  if (val == null) return null;
  if (Array.isArray(val)) return val.length > 0 ? val[val.length - 1] : null;
  return val;
}

async function fetchDashboardData(projectId: string): Promise<DashboardData> {
  // Fire all independent requests in parallel.
  // getTeamResults replaces the old listTeamAnalyses + getTeamAnalysis-per-item pattern.
  // getDashboard provides latestCompletedAnalysisId for the team module status badge.
  const [
    projectDetailRes,
    membersRes,
    dashboardRes,
    teamResultRes,
    riskAnalysesRes, successPredictionsRes,
    reportsRes,
    riskResultRes, successResultRes,
  ] = await Promise.allSettled([
    projectsApi.getProject(projectId),                    // authoritative module statuses
    projectsApi.listMembers(projectId),
    projectsApi.getDashboard(projectId),                  // latestCompletedTeamAnalysisId
    projectsApi.getTeamResults(projectId).catch((err: any) => {
      // 404 = no saved team analysis yet — not an error.
      if (err?.response?.status === 404) return null;
      return null; // swallow other errors gracefully
    }),
    projectsApi.listRiskAnalyses(projectId),
    projectsApi.listSuccessPredictions(projectId),
    projectsApi.listReports(projectId),
    projectsApi.getRiskResults(projectId),                // full latest risk result
    projectsApi.getSuccessResults(projectId),             // full latest success result
  ]);

  const members: TeamMember[] =
    membersRes.status === 'fulfilled' ? (membersRes.value?.data || []) : [];

  // Latest team result from the persistent restore endpoint.
  // 404 → null (no saved analysis). No list+hydration loop needed.
  const latestTeamResult: TeamAnalysisSnapshot | null =
    teamResultRes.status === 'fulfilled' && teamResultRes.value
      ? (teamResultRes.value as TeamAnalysisSnapshot)
      : null;
  const teamAnalyses: TeamAnalysisSnapshot[] = latestTeamResult ? [latestTeamResult] : [];

  // latestCompletedTeamAnalysisId from dashboard — used to confirm a persisted team result
  // exists and to drive the module status badge (even if teamAnalyses is temporarily empty).
  const dashboardRaw = dashboardRes.status === 'fulfilled' ? dashboardRes.value : null;
  const latestCompletedTeamAnalysisId: string | null =
    dashboardRaw?.teamOptimizationStatus?.latestCompletedAnalysisId ?? null;

  const rawRiskAnalyses: any[] =
    riskAnalysesRes.status === 'fulfilled' ? (riskAnalysesRes.value?.data || []) : [];
  const rawSuccessPredictions: any[] =
    successPredictionsRes.status === 'fulfilled' ? (successPredictionsRes.value?.data || []) : [];
  const reports: Report[] =
    reportsRes.status === 'fulfilled' ? (reportsRes.value?.data || []) : [];

  // Use full detail results (with scores + nested arrays). extractSingle handles
  // endpoints that return either a single object or an array.
  const riskResultRaw = riskResultRes.status === 'fulfilled' ? riskResultRes.value : null;
  const successResultRaw = successResultRes.status === 'fulfilled' ? successResultRes.value : null;

  const latestRiskResult: RiskAnalysisResult | null =
    extractSingle(riskResultRaw) ??
    (rawRiskAnalyses.length > 0 ? rawRiskAnalyses[rawRiskAnalyses.length - 1] : null);

  const latestSuccessResult: SuccessPredictionResult | null =
    extractSingle(successResultRaw) ??
    (rawSuccessPredictions.length > 0 ? rawSuccessPredictions[rawSuccessPredictions.length - 1] : null);

  // Module statuses from API-13 detail endpoint — the authoritative source.
  let moduleStatuses: ModuleStatuses | null = null;
  if (projectDetailRes.status === 'fulfilled' && projectDetailRes.value?.moduleStatuses) {
    const ms = projectDetailRes.value.moduleStatuses;
    moduleStatuses = {
      teamOptimization: (ms.teamOptimization?.status as AnalysisStatus) || 'not_started',
      riskAnalysis:     (ms.riskAnalysis?.status     as AnalysisStatus) || 'not_started',
      successPrediction:(ms.successPrediction?.status as AnalysisStatus) || 'not_started',
    };
  }

  return {
    members,
    teamAnalyses,
    latestCompletedTeamAnalysisId,
    latestRiskResult,
    riskAnalysesCount: rawRiskAnalyses.length,
    latestSuccessResult,
    successPredictionsCount: rawSuccessPredictions.length,
    reports,
    moduleStatuses,
  };
}

// ─── Compute functions (take explicit params, not project object) ─────────────

function computeTeamOptimizationStatus(
  project: Project,
  teamAnalyses: TeamAnalysisSnapshot[],
  apiStatus?: AnalysisStatus,
  latestCompletedAnalysisId?: string | null,
) {
  const last = teamAnalyses.length > 0 ? teamAnalyses[teamAnalyses.length - 1] : null;
  // latestCompletedAnalysisId confirms the backend has a persisted result,
  // even if teamAnalyses hasn't loaded yet — use it to drive the status badge.
  const hasPersistedResult = !!latestCompletedAnalysisId || teamAnalyses.length > 0;
  // Prefer API-provided status (from getProject moduleStatuses) as authoritative source.
  // Fall back to whether we have a persisted result, then project local state.
  const derivedStatus: AnalysisStatus =
    apiStatus && apiStatus !== 'not_started' ? apiStatus
    : hasPersistedResult ? 'completed'
    : (project.teamAnalysisStatus === 'in_progress' ? 'in_progress' : 'not_started');
  return {
    status: derivedStatus,
    latestAnalysisDate: last?.timestamp || null,
    latestAnalysisVersion: last?.version ?? null,
    totalAnalysesPerformed: teamAnalyses.length,
    latestTeamHighlights: last ? {
      strengths: last.insights?.strengths || (last as any).teamStrengths || [],
      gaps: last.insights?.gaps || ((last as any).capabilityGaps || []).map((g: any) => g.gapName || g.name || ''),
    } : null,
  };
}

function computeRiskAnalysisStatus(
  project: Project,
  latestRiskResult: RiskAnalysisResult | null,
  riskAnalysesCount: number,
  riskDataEntered: boolean,
  apiStatus?: AnalysisStatus,
) {
  // Prefer API-provided status as authoritative source.
  const derivedStatus: AnalysisStatus =
    apiStatus && apiStatus !== 'not_started' ? apiStatus
    : riskAnalysesCount > 0 ? 'completed'
    : riskDataEntered ? 'in_progress'
    : (project.riskAnalysisStatus === 'failed' ? 'failed' : 'not_started');
  return {
    status: derivedStatus,
    riskDataEntered,
    latestAnalysisDate: latestRiskResult?.timestamp || null,
    latestAnalysisVersion: latestRiskResult?.version ?? null,
    totalAnalysesPerformed: riskAnalysesCount,
    latestRiskHighlights: latestRiskResult ? {
      riskHealthScore: latestRiskResult.overallRiskHealthScore,
      totalRisks: (latestRiskResult.identifiedRisks || []).length,
      risksByLevel: {
        critical: (latestRiskResult.identifiedRisks || []).filter((r) => r.level === 'Critical').length,
        high:     (latestRiskResult.identifiedRisks || []).filter((r) => r.level === 'High').length,
        medium:   (latestRiskResult.identifiedRisks || []).filter((r) => r.level === 'Medium').length,
        low:      (latestRiskResult.identifiedRisks || []).filter((r) => r.level === 'Low').length,
      },
      topRisks: (latestRiskResult.identifiedRisks || []).slice(0, 3).map((r) => ({ name: r.riskName, level: r.level })),
    } : null,
  };
}

function computeSuccessPredictionStatus(
  project: Project,
  latestSuccessResult: SuccessPredictionResult | null,
  successPredictionsCount: number,
  successDataEntered: boolean,
  apiStatus?: AnalysisStatus,
) {
  // Prefer API-provided status as authoritative source.
  const derivedStatus: AnalysisStatus =
    apiStatus && apiStatus !== 'not_started' ? apiStatus
    : successPredictionsCount > 0 ? 'completed'
    : successDataEntered ? 'in_progress'
    : (project.successPredictionStatus === 'failed' ? 'failed' : 'not_started');
  return {
    status: derivedStatus,
    successDataEntered,
    latestPredictionDate: latestSuccessResult?.timestamp || null,
    latestPredictionVersion: latestSuccessResult?.version ?? null,
    totalPredictionsPerformed: successPredictionsCount,
    latestPredictionHighlights: latestSuccessResult ? {
      successProbability: latestSuccessResult.successProbability,
      confidenceLevel: latestSuccessResult.confidenceLevel,
      topSuccessFactors: (latestSuccessResult.keySuccessFactors || []).slice(0, 3).map((f) => f.factor),
      topRiskFactors: (latestSuccessResult.keyRiskFactors || []).slice(0, 3).map((f) => f.factor),
      dataSourcesUsed: latestSuccessResult.dataSourcesUsed,
    } : null,
  };
}

function computeTeamSummary(members: TeamMember[]) {
  const roleDistribution: Record<string, number> = {};
  const skillCounts: Record<string, number> = {};
  for (const m of members) {
    const role = m.role?.trim() || 'Unassigned';
    roleDistribution[role] = (roleDistribution[role] || 0) + 1;
    for (const s of m.skills || []) {
      const k = s.skillName || s.name;
      skillCounts[k] = (skillCounts[k] || 0) + 1;
    }
  }
  const topSkills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([skill, count]) => ({ skill, count }));
  return { totalMembers: members.length, roleDistribution, topSkills };
}

function computeReportsSummary(reports: Report[]) {
  const reportsByType: Record<string, number> = {};
  for (const r of reports) {
    reportsByType[r.reportType] = (reportsByType[r.reportType] || 0) + 1;
  }
  const sorted = [...reports].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );
  return { totalReportsGenerated: reports.length, reportsByType, latestReportDate: sorted[0]?.generatedAt || null };
}

function computeRecentActivity(
  teamAnalyses: TeamAnalysisSnapshot[],
  latestRiskResult: RiskAnalysisResult | null,
  latestSuccessResult: SuccessPredictionResult | null,
  reports: Report[],
) {
  const items: { activityType: string; description: string; timestamp: string }[] = [];
  for (const snap of teamAnalyses) {
    items.push({ activityType: 'analysis_completed', description: `Team analysis v${snap.version} completed`, timestamp: snap.timestamp });
  }
  if (latestRiskResult) {
    items.push({ activityType: 'analysis_completed', description: `Risk analysis v${latestRiskResult.version} — Score: ${latestRiskResult.overallRiskHealthScore}/100`, timestamp: latestRiskResult.timestamp });
  }
  if (latestSuccessResult) {
    items.push({ activityType: 'analysis_completed', description: `Success prediction v${latestSuccessResult.version} — ${latestSuccessResult.successProbability}% probability`, timestamp: latestSuccessResult.timestamp });
  }
  for (const r of reports) {
    items.push({ activityType: 'report_generated', description: `${r.reportType} report generated`, timestamp: r.generatedAt });
  }
  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function ModuleStatusBadge({ status }: { status: AnalysisStatus }) {
  const cfg: Record<AnalysisStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    not_started: { label: 'Not Started', cls: 'bg-muted text-muted-foreground border-border', icon: <Circle className="w-3 h-3" /> },
    in_progress: { label: 'In Progress', cls: 'bg-primary/10 text-primary border-primary/30', icon: <Clock className="w-3 h-3" /> },
    completed:   { label: 'Completed',   cls: 'bg-success/10 text-success border-success/30', icon: <CheckCircle2 className="w-3 h-3" /> },
    failed:      { label: 'Failed',      cls: 'bg-destructive/10 text-destructive border-destructive/30', icon: <XCircle className="w-3 h-3" /> },
  };
  const { label, cls, icon } = cfg[status] ?? cfg['not_started'];
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border font-medium ${cls}`}>{icon}{label}</span>;
}

function ProjectStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    Active: 'bg-success/10 text-success border-success/30',
    Completed: 'bg-primary/10 text-primary border-primary/30',
    Archived: 'bg-muted text-muted-foreground border-border',
  };
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm border font-medium ${cfg[status] ?? cfg['Active']}`}>{status}</span>;
}

function CircleGauge({ value, size = 80, strokeWidth = 8, color = 'var(--color-success)' }: {
  value: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-border)" strokeWidth={strokeWidth} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" className="transition-all" />
    </svg>
  );
}

function ConfirmDialog({ type, projectName, isLoading, onConfirm, onCancel }: {
  type: 'archive' | 'restore'; projectName: string; isLoading: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const isArchive = type === 'archive';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-card-foreground">{isArchive ? 'Archive Project' : 'Restore Project'}</h3>
          <button onClick={onCancel} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {isArchive
            ? `Are you sure you want to archive "${projectName}"? All data is preserved and you can restore it at any time.`
            : `Restore "${projectName}" to Active status? You'll be able to edit and run new analyses again.`}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isLoading} className="border-border text-foreground hover:bg-muted">Cancel</Button>
          <Button onClick={onConfirm} disabled={isLoading}
            className={isArchive ? 'bg-warning hover:bg-warning/90 text-white disabled:opacity-50' : 'bg-primary hover:bg-primary/90 text-white disabled:opacity-50'}>
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isArchive ? 'Archiving…' : 'Restoring…'}</> : (isArchive ? 'Archive Project' : 'Restore Project')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────

type ProjectDashboardProps = {
  project?: Project;
  onNavigate?: (screen: any) => void;
  onNewProject?: () => void;
  projects?: Project[];
  onSelectProject?: (p: Project) => void;
};

export function ProjectDashboard(_props: ProjectDashboardProps) {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { getProjectById, archiveProject, restoreProject, updateProject } = useProjects();

  const project = getProjectById(projectId!);

  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [riskDataEntered, setRiskDataEntered] = useState(false);
  const [successDataEntered, setSuccessDataEntered] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setDashLoading(true);
    (async () => {
      const [data, riskDataRes, successDataRes] = await Promise.allSettled([
        fetchDashboardData(projectId),
        projectsApi.getRiskData(projectId),
        projectsApi.getSuccessData(projectId),
      ]);
      if (data.status === 'fulfilled') setDashData(data.value);
      if (riskDataRes.status === 'fulfilled') setRiskDataEntered(!!riskDataRes.value?.data);
      if (successDataRes.status === 'fulfilled') setSuccessDataEntered(!!successDataRes.value?.data);
      setDashLoading(false);
    })();
  }, [projectId]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Project not found.</p>
          <Button className="mt-4" onClick={() => navigate('/projects')}>← All Projects</Button>
        </div>
      </div>
    );
  }

  const members = dashData?.members || [];
  const teamAnalyses = dashData?.teamAnalyses || [];
  const reports = dashData?.reports || [];

  const teamStatus = computeTeamOptimizationStatus(project, teamAnalyses, dashData?.moduleStatuses?.teamOptimization, dashData?.latestCompletedTeamAnalysisId);
  const riskStatus = computeRiskAnalysisStatus(project, dashData?.latestRiskResult || null, dashData?.riskAnalysesCount || 0, riskDataEntered, dashData?.moduleStatuses?.riskAnalysis);
  const successStatus = computeSuccessPredictionStatus(project, dashData?.latestSuccessResult || null, dashData?.successPredictionsCount || 0, successDataEntered, dashData?.moduleStatuses?.successPrediction);
  const teamSummary = computeTeamSummary(members);
  const reportsSummary = computeReportsSummary(reports);
  const recentActivity = computeRecentActivity(teamAnalyses, dashData?.latestRiskResult || null, dashData?.latestSuccessResult || null, reports);

  const isArchived = project.status === 'Archived';
  const projectName = project.projectName || project.name;
  const subtitleParts = [project.projectType, project.industryDomain].filter(Boolean);
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' · ') : null;
  let dateRange: string | null = null;
  if (project.startDate || project.expectedEndDate) {
    const s = project.startDate ? formatDateShort(project.startDate) : '…';
    const e = project.expectedEndDate ? formatDateShort(project.expectedEndDate) : '…';
    dateRange = `${s} → ${e}`;
  }

  const handleArchive = useCallback(async () => {
    setIsArchiving(true);
    try {
      const updated = await archiveProject(project.id);
      setShowArchiveDialog(false);
      toast.success('Project archived successfully.');
      if (updated) updateProject(updated);
    } catch { toast.error('Failed to archive project.'); }
    finally { setIsArchiving(false); }
  }, [project.id, archiveProject, updateProject]);

  const handleRestore = useCallback(async () => {
    setIsRestoring(true);
    try {
      const updated = await restoreProject(project.id);
      setShowRestoreDialog(false);
      toast.success('Project restored successfully.');
      if (updated) updateProject(updated);
    } catch { toast.error('Failed to restore project.'); }
    finally { setIsRestoring(false); }
  }, [project.id, restoreProject, updateProject]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 lg:p-8">

        {/* C1. Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="text-muted-foreground hover:text-foreground hover:bg-muted">
                <ArrowLeft className="w-4 h-4 mr-2" />All Projects
              </Button>
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-muted-foreground font-medium">ProMan</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {!isArchived && (
                <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}
                  className="border-border text-foreground hover:bg-interactive-hover hover:text-white hover:border-interactive-hover">
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />Edit Project
                </Button>
              )}
              {!isArchived && (
                <Button variant="outline" size="sm" onClick={() => setShowArchiveDialog(true)}
                  className="border-warning/40 text-warning hover:bg-warning hover:text-white hover:border-warning">
                  <Archive className="w-3.5 h-3.5 mr-1.5" />Archive Project
                </Button>
              )}
              {isArchived && (
                <Button size="sm" onClick={() => setShowRestoreDialog(true)} className="bg-primary hover:bg-primary/90 text-white border-0">
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Restore Project
                </Button>
              )}
              <Button size="sm" onClick={() => navigate('/projects/new')} className="bg-primary hover:bg-primary/90 text-white border-0">
                <Plus className="w-4 h-4 mr-1.5" />New Project
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-3xl font-semibold text-foreground">{projectName}</h1>
              <ProjectStatusBadge status={project.status} />
            </div>
            {subtitle && <p className="text-sm text-muted-foreground mb-1">{subtitle}</p>}
            {dateRange && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />{dateRange}
              </p>
            )}
          </div>

          {isArchived && (
            <div className="mt-5 flex items-center justify-between gap-4 px-4 py-3 bg-muted border border-border rounded-xl">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <p className="text-sm text-muted-foreground">📦 This project is archived. Restore it to make modifications.</p>
              </div>
              <Button size="sm" onClick={() => setShowRestoreDialog(true)} className="bg-primary hover:bg-primary/90 text-white border-0 flex-shrink-0">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Restore Project
              </Button>
            </div>
          )}
        </div>

        {/* Loading indicator */}
        {dashLoading && (
          <div className="flex items-center gap-3 py-6 text-muted-foreground mb-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading dashboard data…</span>
          </div>
        )}

        {/* C2. Module Status Overview */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">Analysis Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Team Optimization */}
            <button onClick={() => navigate(`/projects/${project.id}/team`)}
              className="group bg-card border border-border rounded-2xl p-5 text-left hover:border-primary hover:shadow-lg transition-all flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <ModuleStatusBadge status={teamStatus.status} />
              </div>
              <h3 className="font-semibold text-card-foreground mb-1">Team Optimization</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span>{teamStatus.totalAnalysesPerformed} analyses</span>
                {teamStatus.latestAnalysisVersion && <span>v{teamStatus.latestAnalysisVersion}</span>}
                {teamStatus.latestAnalysisDate && <span>{formatDate(teamStatus.latestAnalysisDate)}</span>}
              </div>
              {teamStatus.latestTeamHighlights ? (
                <div className="space-y-2 flex-1">
                  {teamStatus.latestTeamHighlights.strengths.slice(0, 3).map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-success">
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" /><span className="line-clamp-1">{s}</span>
                    </div>
                  ))}
                  {teamStatus.latestTeamHighlights.gaps.slice(0, 2).map((g, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-warning">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" /><span className="line-clamp-1">{g}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground flex-1">No analysis yet</p>}
              <div className="mt-4 flex items-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                Open Module <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </button>

            {/* Risk Analysis */}
            <button onClick={() => navigate(`/projects/${project.id}/risk`)}
              className="group bg-card border border-border rounded-2xl p-5 text-left hover:border-primary hover:shadow-lg transition-all flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <ModuleStatusBadge status={riskStatus.status} />
              </div>
              <h3 className="font-semibold text-card-foreground mb-1">Risk Analysis</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                <span>{riskStatus.totalAnalysesPerformed} analyses</span>
                {riskStatus.latestAnalysisVersion && <span>v{riskStatus.latestAnalysisVersion}</span>}
              </div>
              <p className={`text-xs mb-3 ${riskStatus.riskDataEntered ? 'text-success' : 'text-muted-foreground'}`}>
                {riskStatus.riskDataEntered ? '✓ Risk data entered' : 'No risk data yet'}
              </p>
              {riskStatus.latestRiskHighlights ? (
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <CircleGauge value={riskStatus.latestRiskHighlights.riskHealthScore} size={48} strokeWidth={5}
                      color={riskStatus.latestRiskHighlights.riskHealthScore >= 71 ? 'var(--color-success)' : riskStatus.latestRiskHighlights.riskHealthScore >= 51 ? 'var(--color-warning)' : 'var(--color-destructive)'} />
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">{riskStatus.latestRiskHighlights.riskHealthScore}/100</p>
                      <p className="text-xs text-muted-foreground">Health Score</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap text-xs">
                    {riskStatus.latestRiskHighlights.risksByLevel.critical > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">{riskStatus.latestRiskHighlights.risksByLevel.critical} Critical</span>
                    )}
                    {riskStatus.latestRiskHighlights.risksByLevel.high > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-warning/10 text-warning">{riskStatus.latestRiskHighlights.risksByLevel.high} High</span>
                    )}
                  </div>
                </div>
              ) : <p className="text-xs text-muted-foreground flex-1">No analysis yet</p>}
              <div className="mt-4 flex items-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                Open Module <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </button>

            {/* Success Prediction */}
            <button onClick={() => navigate(`/projects/${project.id}/success`)}
              className="group bg-card border border-border rounded-2xl p-5 text-left hover:border-primary hover:shadow-lg transition-all flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                </div>
                <ModuleStatusBadge status={successStatus.status} />
              </div>
              <h3 className="font-semibold text-card-foreground mb-1">Success Prediction</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                <span>{successStatus.totalPredictionsPerformed} predictions</span>
                {successStatus.latestPredictionVersion && <span>v{successStatus.latestPredictionVersion}</span>}
              </div>
              <p className={`text-xs mb-3 ${successStatus.successDataEntered ? 'text-success' : 'text-muted-foreground'}`}>
                {successStatus.successDataEntered ? '✓ Prediction data entered' : 'No prediction data yet'}
              </p>
              {successStatus.latestPredictionHighlights ? (
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <CircleGauge value={successStatus.latestPredictionHighlights.successProbability} size={48} strokeWidth={5}
                      color={successStatus.latestPredictionHighlights.successProbability >= 70 ? 'var(--color-success)' : successStatus.latestPredictionHighlights.successProbability >= 50 ? 'var(--color-warning)' : 'var(--color-destructive)'} />
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">{successStatus.latestPredictionHighlights.successProbability}%</p>
                      <p className="text-xs text-muted-foreground">Probability</p>
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border font-medium ${
                    successStatus.latestPredictionHighlights.confidenceLevel === 'High' ? 'bg-success/10 text-success border-success/30'
                    : successStatus.latestPredictionHighlights.confidenceLevel === 'Medium' ? 'bg-warning/10 text-warning border-warning/30'
                    : 'bg-muted text-muted-foreground border-border'
                  }`}>{successStatus.latestPredictionHighlights.confidenceLevel} Confidence</span>
                </div>
              ) : <p className="text-xs text-muted-foreground flex-1">No prediction yet</p>}
              <div className="mt-4 flex items-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                Open Module <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </div>
            </button>
          </div>
        </section>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* C3. Team Summary */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-card-foreground">Team Summary</h3>
            </div>
            {teamSummary.totalMembers === 0 ? (
              <p className="text-xs text-muted-foreground">No team members yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Members</span>
                  <span className="font-semibold text-card-foreground">{teamSummary.totalMembers}</span>
                </div>
                {Object.entries(teamSummary.roleDistribution).slice(0, 4).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[140px]">{role}</span>
                    <span className="text-card-foreground font-medium">{count}</span>
                  </div>
                ))}
                {teamSummary.topSkills.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Top Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {teamSummary.topSkills.slice(0, 5).map(({ skill }) => (
                        <span key={skill} className="px-2 py-0.5 bg-muted border border-border rounded-full text-xs text-muted-foreground">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* C4. Reports Summary */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-card-foreground">Reports</h3>
            </div>
            {reportsSummary.totalReportsGenerated === 0 ? (
              <p className="text-xs text-muted-foreground">No reports generated yet.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Reports</span>
                  <span className="font-semibold text-card-foreground">{reportsSummary.totalReportsGenerated}</span>
                </div>
                {Object.entries(reportsSummary.reportsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[140px]">{type}</span>
                    <span className="text-card-foreground font-medium">{count}</span>
                  </div>
                ))}
                {reportsSummary.latestReportDate && (
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                    Latest: {formatRelativeDate(reportsSummary.latestReportDate)}
                  </p>
                )}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${project.id}/reports`)}
              className="mt-4 w-full border-border text-foreground hover:bg-muted hover:text-primary transition-colors">
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />Open Reports
            </Button>
          </div>

          {/* C5. Recent Activity */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-card-foreground">Recent Activity</h3>
            </div>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${item.activityType === 'report_generated' ? 'bg-secondary' : 'bg-primary'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-card-foreground line-clamp-2">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeDate(item.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditProjectModal project={project} onClose={() => setShowEditModal(false)}
          onUpdated={(updated) => { updateProject(updated); setShowEditModal(false); }} />
      )}

      {showArchiveDialog && (
        <ConfirmDialog type="archive" projectName={projectName} isLoading={isArchiving}
          onConfirm={handleArchive} onCancel={() => setShowArchiveDialog(false)} />
      )}
      {showRestoreDialog && (
        <ConfirmDialog type="restore" projectName={projectName} isLoading={isRestoring}
          onConfirm={handleRestore} onCancel={() => setShowRestoreDialog(false)} />
      )}
    </div>
  );
}