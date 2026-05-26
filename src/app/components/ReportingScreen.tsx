/**
 * Reporting Module — /projects/:projectId/reports
 * I1: Report List · I2: Generate Modal · I3: View Report · I4: Export PDF · I5: Delete
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft, FileText, Download, Loader2, Trash2, Plus, X,
  CheckCircle2, AlertTriangle, TrendingUp, Users, Shield, BarChart2,
  ChevronLeft, ChevronRight, Filter, ChevronDown, ChevronUp,
  Sparkles, User, UsersRound, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import projectsApi from '../lib/projectsApi';
import type { Project, Report, ReportType, ReportRecommendation, TeamMember } from '../App';

// ─── Props ────────────────────────────────────────────────────────────────────

type ReportingScreenProps = {
  project: Project;
  onUpdateProject?: (p: Project) => void;
  onBack: () => void;
  projects?: Project[];
  onSelectProject?: (p: Project) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const REPORT_TYPES: ReportType[] = [
  'Individual Member', 'Team Optimization', 'Risk Analysis',
  'Success Prediction', 'Full Project Summary',
];

const NONE = '__none__';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTs(ts: string, long = false) {
  return new Date(ts).toLocaleDateString('en-US', long
    ? { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function reportTypeIcon(type: ReportType) {
  switch (type) {
    case 'Individual Member':   return <User className="w-3.5 h-3.5" />;
    case 'Team Optimization':  return <UsersRound className="w-3.5 h-3.5" />;
    case 'Risk Analysis':      return <Shield className="w-3.5 h-3.5" />;
    case 'Success Prediction': return <TrendingUp className="w-3.5 h-3.5" />;
    case 'Full Project Summary': return <BarChart2 className="w-3.5 h-3.5" />;
  }
}

function reportTypeBadgeCls(type: ReportType) {
  switch (type) {
    case 'Individual Member':   return 'bg-primary/10 text-primary border-primary/30';
    case 'Team Optimization':  return 'bg-success/10 text-success border-success/30';
    case 'Risk Analysis':      return 'bg-warning/10 text-warning border-warning/30';
    case 'Success Prediction': return 'bg-secondary/10 text-secondary border-secondary/30';
    case 'Full Project Summary': return 'bg-secondary/10 text-secondary border-secondary/30';
  }
}

function PriorityBadge({ priority }: { priority: 'High' | 'Medium' | 'Low' }) {
  const cfg = { High: 'bg-destructive/10 text-destructive border-destructive/30', Medium: 'bg-warning/10 text-warning border-warning/30', Low: 'bg-success/10 text-success border-success/30' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border font-medium ${cfg[priority]}`}>{priority}</span>;
}

// ─── Recursive value renderer (handles nested objects / arrays in analysisResults) ───

function ValueRenderer({ value, depth = 0 }: { value: any; depth?: number }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;

  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;

  if (typeof value === 'number') return <span>{value}</span>;

  if (typeof value === 'string') {
    if (value.length > 120) return <span className="text-xs leading-relaxed whitespace-pre-line">{value}</span>;
    return <span>{value}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>;
    // Array of primitives → comma list
    if (value.every((v) => typeof v !== 'object' || v === null)) {
      return <span>{value.join(', ')}</span>;
    }
    // Array of objects → bullet cards
    return (
      <div className={`space-y-2 ${depth > 0 ? 'mt-1' : ''}`}>
        {value.map((item, i) => (
          <div key={i} className="border border-border/50 rounded-lg p-3 bg-muted/20">
            {typeof item === 'object' && item !== null
              ? Object.entries(item).map(([k, v]) => {
                  if (v === null || v === undefined) return null;
                  const lbl = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
                  return (
                    <div key={k} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 text-xs py-1 sm:py-0.5">
                      <span className="font-medium text-muted-foreground sm:w-36 flex-shrink-0 pt-px">{lbl}</span>
                      <span className="text-card-foreground flex-1 min-w-0 break-words">
                        <ValueRenderer value={v} depth={depth + 1} />
                      </span>
                    </div>
                  );
                })
              : <span className="text-xs text-card-foreground">{String(item)}</span>}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== null && v !== undefined);
    if (entries.length === 0) return <span className="text-muted-foreground">—</span>;
    return (
      <div className={`space-y-1 ${depth > 0 ? 'border-l-2 border-border/40 pl-3 mt-1' : ''}`}>
        {entries.map(([k, v]) => {
          const lbl = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
          return (
            <div key={k} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 text-xs py-1 sm:py-0.5">
              <span className="font-medium text-muted-foreground sm:w-36 flex-shrink-0 pt-px">{lbl}</span>
              <span className="text-card-foreground flex-1 min-w-0 break-words">
                <ValueRenderer value={v} depth={depth + 1} />
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return <span>{String(value)}</span>;
}

// ─── I3: View Report Page ─────────────────────────────────────────────────────

function ReportViewPage({
  report,
  project,
  onBack,
  onDelete,
  isArchived,
}: {
  report: Report;
  project: Project;
  onBack: () => void;
  onDelete: (report: Report) => void;
  isArchived: boolean;
}) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const blob = await projectsApi.exportReportPdf(project.id, report.reportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ProMan_${report.reportType.replace(/\s+/g, '_')}_${(project.projectName || project.name).replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exported successfully.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }

  const sortedRecs = (report.recommendations || []).sort((a, b) =>
    ({ High: 0, Medium: 1, Low: 2 }[a.priority] ?? 3) - ({ High: 0, Medium: 1, Low: 2 }[b.priority] ?? 3)
  );
  const byPriority = (priority: 'High' | 'Medium' | 'Low') => sortedRecs.filter((r) => r.priority === priority);

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground hover:bg-muted mb-6">
          <ChevronLeft className="w-4 h-4 mr-1" />Back to Reports
        </Button>

        {/* Report Header */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border font-medium ${reportTypeBadgeCls(report.reportType)}`}>
                  {reportTypeIcon(report.reportType)} {report.reportType}
                </span>
                {report.metadata?.partialResponse && (
                  <span className="text-xs text-warning flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />⚠️ Based on partial analysis data
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-semibold text-card-foreground">{report.header?.projectName}</h1>
              <div className="text-sm text-muted-foreground space-y-0.5">
                {report.header?.projectType && <p>Project Type: {report.header.projectType}</p>}
                {report.header?.industryDomain && <p>Industry: {report.header.industryDomain}</p>}
                <p>Generated: {formatTs(report.generatedAt, true)}</p>
                <p>Generated by: {report.header?.generatedBy}</p>
                {report.metadata && <p>Based on analysis v{report.metadata.analysisVersion}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={handleExport} disabled={isExporting} variant="outline" size="sm" className="border-border text-foreground hover:bg-muted">
                {isExporting ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Exporting…</> : <><Download className="w-3.5 h-3.5 mr-1" />Export as PDF</>}
              </Button>
              {!isArchived && (
                <Button onClick={() => onDelete(report)} size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white hover:border-destructive">
                  <Trash2 className="w-3.5 h-3.5 mr-1" />Delete Report
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Input Data Summary */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />Input Data Summary
          </h2>
          {report.inputSummary && Object.keys(report.inputSummary).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(report.inputSummary).map(([key, value]) => {
                if (value === null || value === undefined) return null;
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
                return (
                  <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-3 sm:py-2 border-b border-border/50 last:border-0">
                    <span className="text-xs font-medium text-muted-foreground sm:w-44 flex-shrink-0 pt-0.5">{label}</span>
                    <div className="text-sm text-card-foreground flex-1 min-w-0">
                      <ValueRenderer value={value} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No input data recorded.</p>
          )}
        </div>

        {/* Section 2: Analysis Results */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-card-foreground mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-secondary" />Analysis Results
          </h2>
          {report.analysisResults && Object.keys(report.analysisResults).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(report.analysisResults).map(([key, value]) => {
                if (value === null || value === undefined) return null;
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
                const isComplex = typeof value === 'object' && value !== null;
                return (
                  <div key={key} className={`${isComplex ? '' : 'flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3'} py-3 sm:py-2 border-b border-border/50 last:border-0`}>
                    {isComplex ? (
                      <>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">{label}</span>
                        <div className="text-sm text-card-foreground min-w-0">
                          <ValueRenderer value={value} />
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-medium text-muted-foreground sm:w-44 flex-shrink-0 pt-0.5">{label}</span>
                        <div className="text-sm text-card-foreground flex-1 min-w-0 break-words">
                          <ValueRenderer value={value} />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No analysis results recorded.</p>
          )}
        </div>

        {/* Section 3: Recommendations */}
        {sortedRecs.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-base font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />Recommendations
            </h2>
            <div className="space-y-6">
              {(['High', 'Medium', 'Low'] as const).map((pri) => {
                const recs = byPriority(pri);
                if (recs.length === 0) return null;
                const icon = pri === 'High' ? '🔴' : pri === 'Medium' ? '🟡' : '🟢';
                return (
                  <div key={pri}>
                    <div className="flex items-center gap-2 mb-3">
                      <span>{icon}</span>
                      <span className="text-sm font-semibold text-card-foreground uppercase tracking-wide">{pri} Priority</span>
                    </div>
                    <div className="space-y-2 pl-5">
                      {recs.map((rec, i) => (
                        <div key={i} className="border border-border rounded-xl p-4 space-y-1">
                          <div className="flex items-start sm:items-center gap-2">
                            <PriorityBadge priority={rec.priority} />
                            <span className="text-sm text-card-foreground flex-1 min-w-0 break-words">{rec.recommendation}</span>
                          </div>
                          {rec.expectedImpact && <p className="text-xs text-muted-foreground pl-1">Impact: {rec.expectedImpact}</p>}
                          {rec.category && <p className="text-xs text-muted-foreground pl-1">Category: {rec.category}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── I2: Generate Report Modal ────────────────────────────────────────────────

function GenerateReportModal({
  project,
  teamMembers,
  onClose,
  onGenerated,
}: {
  project: Project;
  teamMembers: TeamMember[];
  onClose: () => void;
  onGenerated: (report: Report) => void;
}) {
  const [reportType, setReportType] = useState<ReportType | ''>('');
  const [memberId, setMemberId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleGenerate() {
    const errs: Record<string, string> = {};
    if (!reportType) { errs.reportType = 'Report type is required'; }
    if (reportType === 'Individual Member' && !memberId) { errs.memberId = 'Member is required for Individual Member reports'; }
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setIsGenerating(true);
    try {
      const report: Report = await projectsApi.generateReport(project.id, {
        reportType: reportType as ReportType,
        ...(memberId ? { memberId } : {}),
      });
      toast.success('Report generated successfully.');
      onGenerated(report);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">Generate Report</h2>
          <button onClick={onClose} disabled={isGenerating} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Report Type <span className="text-destructive">*</span>
            </label>
            <Select value={reportType || NONE} onValueChange={(v) => { setReportType(v === NONE ? '' : v as ReportType); setErrors((p) => ({ ...p, reportType: undefined as any })); setMemberId(''); }}>
              <SelectTrigger className={`bg-input-background border-input text-foreground focus:border-primary ${errors.reportType ? 'border-destructive' : ''}`}>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-card-foreground">
                <SelectItem value={NONE}><span className="text-muted-foreground">Select report type</span></SelectItem>
                {REPORT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    <div className="flex items-center gap-2">{reportTypeIcon(t)}<span>{t}</span></div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reportType && <p className="mt-1 text-xs text-destructive">{errors.reportType}</p>}
          </div>

          {/* Member selector — only for Individual Member */}
          {reportType === 'Individual Member' && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Team Member <span className="text-destructive">*</span>
              </label>
              <Select value={memberId || NONE} onValueChange={(v) => { setMemberId(v === NONE ? '' : v); setErrors((p) => ({ ...p, memberId: undefined as any })); }}>
                <SelectTrigger className={`bg-input-background border-input text-foreground focus:border-primary ${errors.memberId ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-card-foreground">
                  <SelectItem value={NONE}><span className="text-muted-foreground">Select team member</span></SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.memberId || m.id}>{m.name}{m.role ? ` — ${m.role}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.memberId && <p className="mt-1 text-xs text-destructive">{errors.memberId}</p>}
              {teamMembers.length === 0 && (
                <p className="mt-1 text-xs text-warning">No team members added to this project yet.</p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={isGenerating} className="border-border text-foreground hover:bg-muted">Cancel</Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className="bg-primary hover:bg-primary/90 text-white">
            {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : <><FileText className="w-4 h-4 mr-2" />Generate Report</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── I5: Delete confirmation ──────────────────────────────────────────────────

function DeleteReportDialog({
  report,
  onConfirm,
  onCancel,
  isLoading,
}: {
  report: Report;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-card-foreground mb-1">Delete Report</h3>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this <strong>{report.reportType}</strong> report generated on{' '}
              <strong>{formatTs(report.generatedAt, true)}</strong>?
              <br /><br />
              The underlying analysis data will NOT be affected — you can regenerate this report at any time.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isLoading} className="border-border text-foreground hover:bg-muted">Cancel</Button>
          <Button onClick={onConfirm} disabled={isLoading} className="bg-destructive hover:bg-destructive/90 text-white">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Report'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── I1: Report List ──────────────────────────────────────────────────────────

export function ReportingScreen({ project, onUpdateProject, onBack, }: ReportingScreenProps) {
  const isArchived = project.status === 'Archived';

  // ── API-fetched state ──────────────────────────────────────────────────────
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    setIsDataLoading(true);
    Promise.allSettled([
      projectsApi.listReports(project.id),
      projectsApi.listMembers(project.id),
    ]).then(([reportsRes, membersRes]) => {
      if (reportsRes.status === 'fulfilled') setAllReports(reportsRes.value?.data || []);
      if (membersRes.status === 'fulfilled') setTeamMembers(membersRes.value?.data || []);
      setIsDataLoading(false);
    });
  }, [project.id]);

  // Internal view state
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [deletingReport, setDeletingReport] = useState<Report | null>(null);
  const [isDeletingReport, setIsDeletingReport] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ReportType | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reportCache, setReportCache] = useState<Map<string, Report>>(new Map());
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);

  // Filter + paginate
  const filtered = allReports.filter((r) => !typeFilter || r.reportType === typeFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, filtered.length);

  function handleGenerated(report: Report) {
    setAllReports((prev) => [report, ...prev]);
    setReportCache((prev) => new Map(prev).set(report.reportId, report));
    setShowGenerateModal(false);
    setViewingReport(report);
  }

  async function handleViewReport(report: Report) {
    if (reportCache.has(report.reportId)) {
      setViewingReport(reportCache.get(report.reportId)!);
      return;
    }
    setLoadingReportId(report.reportId);
    try {
      const full: Report = await projectsApi.getReport(project.id, report.reportId);
      setReportCache((prev) => new Map(prev).set(report.reportId, full));
      setViewingReport(full);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to load report. Please try again.');
    } finally {
      setLoadingReportId(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingReport) return;
    setIsDeletingReport(true);
    try {
      await projectsApi.deleteReport(project.id, deletingReport.reportId);
      setAllReports((prev) => prev.filter((r) => r.reportId !== deletingReport.reportId));
      setDeletingReport(null);
      if (viewingReport?.reportId === deletingReport.reportId) setViewingReport(null);
      toast.success('Report deleted successfully.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete report.');
    } finally {
      setIsDeletingReport(false);
    }
  }

  async function handleExportFromList(report: Report) {
    try {
      const blob = await projectsApi.exportReportPdf(project.id, report.reportId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ProMan_${report.reportType.replace(/\s+/g, '_')}_${(project.projectName || project.name).replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exported successfully.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to export PDF.');
    }
  }

  // Loading state
  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading reports…</span>
        </div>
      </div>
    );
  }

  // If viewing a specific report
  if (viewingReport) {
    return (
      <>
        <ReportViewPage
          report={viewingReport}
          project={project}
          onBack={() => setViewingReport(null)}
          onDelete={(r) => setDeletingReport(r)}
          isArchived={isArchived}
        />
        {deletingReport && (
          <DeleteReportDialog
            report={deletingReport}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeletingReport(null)}
            isLoading={isDeletingReport}
          />
        )}
      </>
    );
  }

  // Report list
  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-6">

        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground hover:bg-muted mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard
          </Button>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Reports</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Generated reports for {project.projectName || project.name}</p>
            </div>
            {!isArchived && (
              <Button onClick={() => setShowGenerateModal(true)} className="bg-primary hover:bg-primary/90 text-white border-0">
                <Plus className="w-4 h-4 mr-2" />Generate Report
              </Button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Select value={typeFilter || NONE} onValueChange={(v) => { setTypeFilter(v === NONE ? '' : v as ReportType); setPage(1); }}>
              <SelectTrigger className="w-52 bg-input-background border-input text-foreground focus:border-primary">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-card-foreground">
                <SelectItem value={NONE}>All Types</SelectItem>
                {REPORT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    <div className="flex items-center gap-2">{reportTypeIcon(t)}<span>{t}</span></div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {allReports.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {filtered.length} report{filtered.length !== 1 ? 's' : ''}
              {typeFilter ? ` of type "${typeFilter}"` : ''}
            </span>
          )}
        </div>

        {/* List */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-medium text-muted-foreground mb-2">
                {allReports.length === 0 ? 'No reports generated yet.' : 'No reports match this filter.'}
              </p>
              <p className="text-sm text-muted-foreground">
                {allReports.length === 0 ? 'Complete an analysis and generate your first report.' : 'Try changing or clearing the type filter.'}
              </p>
              {allReports.length === 0 && !isArchived && (
                <Button onClick={() => setShowGenerateModal(true)} size="sm" className="mt-4 bg-primary hover:bg-primary/90 text-white border-0">
                  <Plus className="w-3.5 h-3.5 mr-1" />Generate First Report
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_160px_180px_180px] gap-4 px-5 py-3 border-b border-border bg-muted/30">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Report Type</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Member</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Generated</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</span>
                </div>

                {/* Rows */}
                {paginated.map((report) => (
                  <div key={report.reportId}
                    className="grid grid-cols-[1fr_160px_180px_180px] gap-4 px-5 py-4 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors items-center">
                    {/* Type */}
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border font-medium ${reportTypeBadgeCls(report.reportType)}`}>
                        {reportTypeIcon(report.reportType)} {report.reportType}
                      </span>
                    </div>
                    {/* Member */}
                    <div className="text-sm text-muted-foreground truncate">
                      {report.memberName || '—'}
                    </div>
                    {/* Date */}
                    <div className="text-sm text-muted-foreground">{formatTs(report.generatedAt)}</div>
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewReport(report)}
                        disabled={loadingReportId === report.reportId}
                        className="h-7 px-2 border-border text-foreground hover:bg-muted text-xs">
                        {loadingReportId === report.reportId
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <><Eye className="w-3 h-3 mr-1" />View</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleExportFromList(report)}
                        className="h-7 px-2 border-border text-foreground hover:bg-muted text-xs">
                        <Download className="w-3 h-3 mr-1" />PDF
                      </Button>
                      {!isArchived && (
                        <button onClick={() => setDeletingReport(report)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Show:</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-7 w-16 bg-input-background border-input text-foreground text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-card-foreground">
                  {[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">per page</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Showing {startIdx}–{endIdx} of {filtered.length} reports
              </span>
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="h-7 w-7 p-0 border-border hover:bg-muted">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="h-7 w-7 p-0 border-border hover:bg-muted">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showGenerateModal && (
        <GenerateReportModal project={project} teamMembers={teamMembers} onClose={() => setShowGenerateModal(false)} onGenerated={handleGenerated} />
      )}
      {deletingReport && !viewingReport && (
        <DeleteReportDialog
          report={deletingReport}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingReport(null)}
          isLoading={isDeletingReport}
        />
      )}
    </div>
  );
}