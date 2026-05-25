/**
 * Success Forecasting Screen — /projects/:projectId/success
 * Sections E (input), F (results), G (run prediction), H (history)
 * Per spec UC-32..UC-36, UC-45
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft, Brain, Circle, Clock, CheckCircle2, History,
  ChevronDown, ChevronUp, Users, Shield, Save, Loader2, AlertCircle,
  Sparkles, TrendingUp, XCircle, Target, Zap, Plus, X, BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import projectsApi from '../lib/projectsApi';
import type {
  Project, SuccessInputData, SuccessPredictionResult,
  DeliveryConfidenceLevel, AnalysisStatus, KPI,
  StakeholderInvolvement, RiskMitigationPlanningLevel, HistoricalPerformance,
} from '../App';

// ─── Props ────────────────────────────────────────────────────────────────────

type SuccessForecastingScreenProps = {
  project: Project;
  onUpdateProject: (project: Project) => void;
  onBack: () => void;
  projects?: Project[];
  onSelectProject?: (project: Project) => void;
};

// ─── Enum options ─────────────────────────────────────────────────────────────

// API-34 exact enum values
const STAKEHOLDER_INVOLVEMENTS: StakeholderInvolvement[] = ['Minimal', 'Low', 'Moderate', 'High', 'VeryHigh'];
const STAKEHOLDER_LABELS: Record<StakeholderInvolvement, string> = {
  'Minimal':  'Minimal',
  'Low':      'Low',
  'Moderate': 'Moderate',
  'High':     'High',
  'VeryHigh': 'Very High',
};

const RISK_MITIGATION_LEVELS: RiskMitigationPlanningLevel[] = ['None', 'Basic', 'Moderate', 'Comprehensive'];

const HISTORICAL_PERFORMANCES: HistoricalPerformance[] = ['NoHistory', 'Poor', 'Average', 'Good', 'Excellent'];
const HISTORICAL_LABELS: Record<HistoricalPerformance, string> = {
  'NoHistory': 'No History',
  'Poor':      'Poor',
  'Average':   'Average',
  'Good':      'Good',
  'Excellent': 'Excellent',
};

const NONE = '__none__';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTs(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}


function computeReadyForPrediction(form: SuccessFormState): boolean {
  if (!form.projectGoalsClarity || !form.requirementsStability) return false;
  let exec = 0;
  if (form.teamCapabilityAlignment) exec++;
  if (form.toolTechnologyReadiness) exec++;
  if (form.riskMitigationPlanning) exec++;
  return exec >= 1;
}

// ─── KPI Row ──────────────────────────────────────────────────────────────────

interface KpiRow { id: string; kpiName: string; targetValue: string; unit: string; error?: string }
function emptyKpiRow(): KpiRow {
  return { id: `kpi-${Date.now()}-${Math.random()}`, kpiName: '', targetValue: '', unit: '' };
}

// ─── Form State ───────────────────────────────────────────────────────────────

interface SuccessFormState {
  projectGoalsClarity: number;
  requirementsStability: number;
  stakeholderInvolvement: StakeholderInvolvement | '';
  teamCapabilityAlignment: number;
  toolTechnologyReadiness: number;
  riskMitigationPlanning: RiskMitigationPlanningLevel | '';
  historicalPerformance: HistoricalPerformance | '';
  kpiRows: KpiRow[];
  qualityBenchmarks: number;
  additionalContext: string;
}

function buildSuccessInputData(form: SuccessFormState): SuccessInputData {
  const kpis: KPI[] = form.kpiRows
    .filter((r) => r.kpiName.trim())
    .map((r) => ({
      kpiName: r.kpiName.trim(),
      ...(r.targetValue.trim() ? { targetValue: r.targetValue.trim() } : {}),
      ...(r.unit.trim() ? { unit: r.unit.trim() } : {}),
    }));

  return {
    planningIndicators: {
      projectGoalsClarity: form.projectGoalsClarity,
      requirementsStability: form.requirementsStability,
      ...(form.stakeholderInvolvement ? { stakeholderInvolvement: form.stakeholderInvolvement } : {}),
    },
    executionReadiness: {
      ...(form.teamCapabilityAlignment > 0 ? { teamCapabilityAlignment: form.teamCapabilityAlignment } : {}),
      ...(form.toolTechnologyReadiness > 0 ? { toolTechnologyReadiness: form.toolTechnologyReadiness } : {}),
      ...(form.riskMitigationPlanning ? { riskMitigationPlanning: form.riskMitigationPlanning } : {}),
    },
    ...(form.historicalPerformance || kpis.length > 0 || form.qualityBenchmarks > 0 ? {
      performanceMetrics: {
        ...(form.historicalPerformance ? { historicalPerformance: form.historicalPerformance } : {}),
        ...(kpis.length > 0 ? { expectedKPIs: kpis } : {}),
        ...(form.qualityBenchmarks > 0 ? { qualityBenchmarks: form.qualityBenchmarks } : {}),
      },
    } : {}),
    ...(form.additionalContext.trim() ? { additionalContext: form.additionalContext.trim() } : {}),
  };
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  const cfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    not_started: { label: 'Not Started', cls: 'bg-muted text-muted-foreground border-border', icon: <Circle className="w-3 h-3" /> },
    in_progress:  { label: 'In Progress', cls: 'bg-warning/10 text-warning border-warning/30', icon: <Clock className="w-3 h-3" /> },
    completed:    { label: 'Completed',   cls: 'bg-success/10 text-success border-success/30', icon: <CheckCircle2 className="w-3 h-3" /> },
    failed:       { label: 'Failed',      cls: 'bg-destructive/10 text-destructive border-destructive/30', icon: <XCircle className="w-3 h-3" /> },
  };
  const { label, cls, icon } = cfg[status] ?? cfg['not_started'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border font-medium ${cls}`}>
      {icon}{label}
    </span>
  );
}

function CircularGauge({ value }: { value: number }) {
  const size = 140; const r = 56; const cx = 70; const cy = 70;
  const circumference = 2 * Math.PI * r;
  const arc = Math.min(value / 100, 1) * circumference;
  const color = value >= 71 ? '#22c55e' : value >= 51 ? '#f59e0b' : value >= 31 ? '#f97316' : '#ef4444';
  const textColor = value >= 71 ? 'text-success' : value >= 51 ? 'text-warning' : value >= 31 ? 'text-orange-500' : 'text-destructive';
  return (
    <div className="flex flex-col items-center">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" className="text-muted/30" strokeWidth={12} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={12}
            strokeDasharray={`${arc} ${circumference - arc}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${textColor}`}>{value}%</span>
          <span className="text-xs text-muted-foreground">probability</span>
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: 'High' | 'Medium' | 'Low' }) {
  const cfg = { High: 'bg-destructive/10 text-destructive border-destructive/30', Medium: 'bg-warning/10 text-warning border-warning/30', Low: 'bg-success/10 text-success border-success/30' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border font-medium ${cfg[priority]}`}>{priority}</span>;
}

function ImpactBadge({ impact }: { impact: 'High' | 'Medium' | 'Low' }) {
  const cfg = { High: 'bg-destructive/10 text-destructive border-destructive/30', Medium: 'bg-warning/10 text-warning border-warning/30', Low: 'bg-success/10 text-success border-success/30' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border font-medium ${cfg[impact]}`}>{impact}</span>;
}

function ConfidenceBadge({ level }: { level: 'Low' | 'Medium' | 'High' }) {
  const cfg = { High: 'bg-success/10 text-success border-success/30', Medium: 'bg-warning/10 text-warning border-warning/30', Low: 'bg-muted text-muted-foreground border-border' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border font-medium ${cfg[level]}`}>{level} Confidence</span>;
}

function DeliveryBadge({ level }: { level: DeliveryConfidenceLevel }) {
  const cfg = { High: 'bg-success/10 text-success border-success/30', Medium: 'bg-warning/10 text-warning border-warning/30', Low: 'bg-destructive/10 text-destructive border-destructive/30' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border font-medium ${cfg[level]}`}>{level}</span>;
}

function ScaleLabel({ value }: { value: number }) {
  const label = value >= 9 ? 'Very High' : value >= 7 ? 'High' : value >= 5 ? 'Moderate' : value >= 3 ? 'Low' : 'Very Low';
  const color = value >= 7 ? 'text-success' : value >= 5 ? 'text-warning' : 'text-destructive';
  return <span className={`text-xs font-medium ${color}`}>{label} ({value}/10)</span>;
}

function SliderField({ label, value, onChange, hint, disabled }: {
  label: string; value: number; onChange: (v: number) => void;
  hint?: string; disabled?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        <ScaleLabel value={value} />
      </div>
      <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={1} max={10} step={1} disabled={disabled} className="w-full" />
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function SuccessForecastingScreen({ project, onUpdateProject, onBack }: SuccessForecastingScreenProps) {
  const isArchived = project.status === 'Archived';

  // ── API-fetched state ──────────────────────────────────────────────────────
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [latestResult, setLatestResult] = useState<SuccessPredictionResult | null>(null);
  const [historyResults, setHistoryResults] = useState<SuccessPredictionResult[]>([]);
  const [hasTeam, setHasTeam] = useState(false);
  const [teamMemberCount, setTeamMemberCount] = useState(0);
  const [hasTeamAnalysis, setHasTeamAnalysis] = useState(false);
  const [latestTeamAnalysisVersion, setLatestTeamAnalysisVersion] = useState<number | null>(null);
  const [hasRiskCompleted, setHasRiskCompleted] = useState(false);
  const [latestRiskResult, setLatestRiskResult] = useState<{ version: number; overallRiskHealthScore: number } | null>(null);
  const [hasRiskData, setHasRiskData] = useState(false);

  const [form, setForm] = useState<SuccessFormState>({
    projectGoalsClarity: 5,
    requirementsStability: 5,
    stakeholderInvolvement: '' as StakeholderInvolvement | '',
    teamCapabilityAlignment: 5,
    toolTechnologyReadiness: 5,
    riskMitigationPlanning: '' as RiskMitigationPlanningLevel | '',
    historicalPerformance: '' as HistoricalPerformance | '',
    kpiRows: [],
    qualityBenchmarks: 0,
    additionalContext: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [expandedResultCache, setExpandedResultCache] = useState<Map<string, SuccessPredictionResult>>(new Map());
  const [loadingExpandedId, setLoadingExpandedId] = useState<string | null>(null);

  // ── Fetch all data on mount ────────────────────────────────────────────────
  useEffect(() => {
    setIsDataLoading(true);
    Promise.allSettled([
      projectsApi.getSuccessData(project.id),
      projectsApi.listSuccessPredictions(project.id),
      projectsApi.listMembers(project.id),
      projectsApi.listTeamAnalyses(project.id, { analysisType: 'Team' }),
      projectsApi.listRiskAnalyses(project.id),
      projectsApi.getRiskData(project.id),
      projectsApi.getSuccessResults(project.id),   // full latest result (detail endpoint)
      projectsApi.getRiskResults(project.id).catch(() => null), // full latest risk result for score
    ]).then(([successDataRes, predictionsRes, membersRes, teamAnalysesRes, riskAnalysesRes, riskDataRes, latestResultRes, latestRiskRes]) => {
      if (successDataRes.status === 'fulfilled' && successDataRes.value?.data) {
        const saved: SuccessInputData = successDataRes.value.data;
        setHasData(true);
        setForm({
          projectGoalsClarity: saved.planningIndicators.projectGoalsClarity || 5,
          requirementsStability: saved.planningIndicators.requirementsStability || 5,
          stakeholderInvolvement: (saved.planningIndicators.stakeholderInvolvement || '') as StakeholderInvolvement | '',
          teamCapabilityAlignment: saved.executionReadiness.teamCapabilityAlignment || 5,
          toolTechnologyReadiness: saved.executionReadiness.toolTechnologyReadiness || 5,
          riskMitigationPlanning: (saved.executionReadiness.riskMitigationPlanning || '') as RiskMitigationPlanningLevel | '',
          historicalPerformance: (saved.performanceMetrics?.historicalPerformance || '') as HistoricalPerformance | '',
          kpiRows: saved.performanceMetrics?.expectedKPIs?.map((k) => ({
            id: `kpi-${Math.random()}`,
            kpiName: k.kpiName,
            targetValue: k.targetValue || '',
            unit: k.unit || '',
          })) || [],
          qualityBenchmarks: saved.performanceMetrics?.qualityBenchmarks || 0,
          additionalContext: saved.additionalContext || '',
        });
      }
      if (predictionsRes.status === 'fulfilled') {
        const preds: SuccessPredictionResult[] = predictionsRes.value?.data || [];
        setHistoryResults(preds);
      }
      if (membersRes.status === 'fulfilled') {
        const members = membersRes.value?.data || [];
        setHasTeam(members.length > 0);
        setTeamMemberCount(members.length);
      }
      if (teamAnalysesRes.status === 'fulfilled') {
        const analyses = teamAnalysesRes.value?.data || [];
        setHasTeamAnalysis(analyses.length > 0);
        if (analyses.length > 0) {
          const latest = [...analyses].sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0];
          setLatestTeamAnalysisVersion(latest?.version ?? null);
        }
      }
      if (riskAnalysesRes.status === 'fulfilled') {
        const riskAnalyses = riskAnalysesRes.value?.data || [];
        setHasRiskCompleted(riskAnalyses.length > 0);
      }
      if (riskDataRes.status === 'fulfilled') {
        setHasRiskData(!!riskDataRes.value?.data);
      }
      // Use the full latest risk result for version + score (list endpoint has no score field)
      if (latestRiskRes) {
        const r = latestRiskRes as any;
        if (r?.version != null || r?.overallRiskHealthScore != null) {
          setLatestRiskResult({ version: r.version, overallRiskHealthScore: r.overallRiskHealthScore });
        }
      }
      // Use the full detail result for the main results panel
      // extractSingle handles endpoints that return an array or a single object
      if (latestResultRes.status === 'fulfilled') {
        const raw = latestResultRes.value;
        const single = Array.isArray(raw)
          ? (raw.length > 0 ? raw[raw.length - 1] : null)
          : raw || null;
        if (single) setLatestResult(single as SuccessPredictionResult);
      }
      setIsDataLoading(false);
    });
  }, [project.id]);

  const readyForPrediction = computeReadyForPrediction(form);
  const nextVersion = historyResults.length + 1;

  function setField<K extends keyof SuccessFormState>(key: K, value: SuccessFormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  // KPI rows management
  function addKpiRow() {
    if (form.kpiRows.length >= 20) { toast.error('Maximum 20 KPIs are allowed'); return; }
    setField('kpiRows', [...form.kpiRows, emptyKpiRow()]);
  }
  function removeKpiRow(id: string) {
    setField('kpiRows', form.kpiRows.filter((r) => r.id !== id));
  }
  function updateKpiRow(id: string, patch: Partial<KpiRow>) {
    setField('kpiRows', form.kpiRows.map((r) => r.id === id ? { ...r, ...patch, error: undefined } : r));
  }

  async function handleToggleHistory(entry: SuccessPredictionResult) {
    if (expandedHistoryId === entry.predictionId) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(entry.predictionId);
    if (expandedResultCache.has(entry.predictionId)) return;
    setLoadingExpandedId(entry.predictionId);
    try {
      const full = await projectsApi.getSuccessResults(project.id, entry.predictionId);
      if (full) {
        setExpandedResultCache((prev) => new Map(prev).set(entry.predictionId, full as SuccessPredictionResult));
      }
    } catch {
      // leave cache empty — expanded panel shows "unavailable"
    } finally {
      setLoadingExpandedId(null);
    }
  }

  // Save via real API
  async function handleSave() {
    const errs: Record<string, string> = {};
    if (!form.projectGoalsClarity) errs.projectGoalsClarity = 'Project goals clarity is required';
    if (!form.requirementsStability) errs.requirementsStability = 'Requirements stability is required';
    if (form.kpiRows.some((r) => !r.kpiName.trim())) {
      setField('kpiRows', form.kpiRows.map((r) => r.kpiName.trim() ? r : { ...r, error: 'KPI name is required' }));
      errs.kpis = 'Each KPI must have a name';
    }
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setIsSaving(true);
    try {
      const data = buildSuccessInputData(form);
      if (hasData) {
        await projectsApi.updateSuccessData(project.id, data);
      } else {
        await projectsApi.enterSuccessData(project.id, data);
      }
      setHasData(true);
      onUpdateProject({
        ...project,
        successPredictionStatus: project.successPredictionStatus === 'not_started' ? 'in_progress' : project.successPredictionStatus,
      });
      toast.success(hasData ? 'Success prediction data updated.' : 'Success prediction data saved.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to save prediction data.');
    } finally {
      setIsSaving(false);
    }
  }

  // Run prediction via real API
  async function handlePredict() {
    if (!readyForPrediction) return;
    if (!hasData) {
      const data = buildSuccessInputData(form);
      try {
        await projectsApi.enterSuccessData(project.id, data);
        setHasData(true);
      } catch (err: any) {
        toast.error(err?.response?.data?.error?.message || 'Failed to save data before prediction.');
        return;
      }
    }
    setIsPredicting(true);
    try {
      const result: SuccessPredictionResult = await projectsApi.runSuccessPrediction(project.id);
      const newHistory = [...historyResults, result];
      setHistoryResults(newHistory);
      setLatestResult(result);
      if (result.predictionId) {
        setExpandedResultCache((prev) => new Map(prev).set(result.predictionId, result));
      }
      onUpdateProject({
        ...project,
        successPredictionStatus: 'completed',
        successProbability: result.successProbability,
      });
      toast.success('Success prediction completed.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Success prediction failed. Please try again.');
    } finally {
      setIsPredicting(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading prediction data…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">

        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground hover:bg-muted mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard
          </Button>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-3xl font-semibold text-foreground">Success Prediction</h1>
                <AnalysisStatusBadge status={project.successPredictionStatus} />
              </div>
              <p className="text-muted-foreground text-sm">{project.projectName || project.name}</p>
              {latestResult && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last prediction: v{latestResult.version} · {formatTs(latestResult.timestamp)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dependency Banner */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <Brain className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-card-foreground font-semibold text-sm mb-0.5">Prediction is based on:</h3>
              <p className="text-xs text-muted-foreground">Completing all dependencies produces the most accurate forecast.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`flex items-start gap-3 p-3 rounded-xl border ${hasTeamAnalysis ? 'bg-success/5 border-success/20' : hasTeam ? 'bg-warning/5 border-warning/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <Users className={`w-4 h-4 flex-shrink-0 mt-0.5 ${hasTeamAnalysis ? 'text-success' : hasTeam ? 'text-warning' : 'text-destructive'}`} />
              <div>
                <div className={`text-xs font-semibold mb-0.5 ${hasTeamAnalysis ? 'text-success' : hasTeam ? 'text-warning' : 'text-destructive'}`}>Team Data</div>
                <div className="text-xs text-muted-foreground">
                  {hasTeamAnalysis
                    ? `✓ Team Analysis v${latestTeamAnalysisVersion ?? ''} · ${teamMemberCount} member${teamMemberCount !== 1 ? 's' : ''}`
                    : hasTeam
                    ? `⚠ ${teamMemberCount} member(s) — Team Analysis not yet run`
                    : '✗ No team members added yet'}
                </div>
              </div>
            </div>
            <div className={`flex items-start gap-3 p-3 rounded-xl border ${hasRiskCompleted ? 'bg-success/5 border-success/20' : hasRiskData ? 'bg-warning/5 border-warning/20' : 'bg-destructive/5 border-destructive/20'}`}>
              <Shield className={`w-4 h-4 flex-shrink-0 mt-0.5 ${hasRiskCompleted ? 'text-success' : hasRiskData ? 'text-warning' : 'text-destructive'}`} />
              <div>
                <div className={`text-xs font-semibold mb-0.5 ${hasRiskCompleted ? 'text-success' : hasRiskData ? 'text-warning' : 'text-destructive'}`}>Risk Analysis</div>
                <div className="text-xs text-muted-foreground">
                  {hasRiskCompleted
                    ? latestRiskResult
                      ? `✓ Risk Analysis v${latestRiskResult.version} · Score: ${latestRiskResult.overallRiskHealthScore}/100`
                      : '✓ Risk Analysis completed'
                    : hasRiskData
                    ? '⚠ Risk data saved but not yet analyzed'
                    : '✗ Risk Analysis not yet completed'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT: Input Form ─────────────────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Scale legend */}
            <div className="bg-muted/40 border border-border rounded-xl px-4 py-2 text-xs text-muted-foreground">
              Scale guide: <span className="text-destructive">1-2: Very Low</span> · <span className="text-orange-500">3-4: Low</span> · <span className="text-warning">5-6: Moderate</span> · <span className="text-success/80">7-8: High</span> · <span className="text-success">9-10: Very High</span>
            </div>

            {/* Section 1: Planning Indicators */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-card-foreground">Planning Indicators</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Rate the quality of your project planning on a scale of 1-10.</p>
              <div className="space-y-5">
                <SliderField label="Project Goals Clarity *" value={form.projectGoalsClarity}
                  onChange={(v) => setField('projectGoalsClarity', v)}
                  hint="How well-defined and measurable are project goals?" disabled={isArchived} />
                {errors.projectGoalsClarity && <p className="text-xs text-destructive -mt-4">{errors.projectGoalsClarity}</p>}

                <SliderField label="Requirements Stability *" value={form.requirementsStability}
                  onChange={(v) => setField('requirementsStability', v)}
                  hint="Stability and completeness of requirements documentation" disabled={isArchived} />
                {errors.requirementsStability && <p className="text-xs text-destructive -mt-4">{errors.requirementsStability}</p>}

                {/* Stakeholder Involvement — DROPDOWN (ENUM, not slider) */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Stakeholder Involvement</label>
                  <Select value={form.stakeholderInvolvement || NONE}
                    onValueChange={(v) => setField('stakeholderInvolvement', v === NONE ? '' : v as StakeholderInvolvement)}
                    disabled={isArchived}>
                    <SelectTrigger className="bg-input-background border-input text-foreground focus:border-primary">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-card-foreground">
                      <SelectItem value={NONE}><span className="text-muted-foreground">Select level</span></SelectItem>
                      {STAKEHOLDER_INVOLVEMENTS.map((o) => <SelectItem key={o} value={o}>{STAKEHOLDER_LABELS[o] ?? o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 2: Execution Readiness */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-success" />
                <h3 className="font-semibold text-card-foreground">Execution Readiness</h3>
              </div>
              {hasTeam && (
                <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg mb-3">
                  <Users className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <p className="text-xs text-primary">Team Capability Alignment is informed by your team data: {teamMemberCount} member(s)</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground mb-4">Rate execution readiness factors on a scale of 1-10.</p>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Team Capability Alignment</span>
                    {hasTeam && <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">team data</span>}
                    <ScaleLabel value={form.teamCapabilityAlignment} />
                  </div>
                  <Slider value={[form.teamCapabilityAlignment]}
                    onValueChange={(v) => setField('teamCapabilityAlignment', v[0])} min={1} max={10} step={1} disabled={isArchived} />
                </div>

                <SliderField label="Tool & Technology Readiness" value={form.toolTechnologyReadiness}
                  onChange={(v) => setField('toolTechnologyReadiness', v)}
                  hint="Tools and infrastructure supporting delivery" disabled={isArchived} />

                {/* Risk Mitigation Planning — DROPDOWN (ENUM, not slider) */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Risk Mitigation Planning</label>
                  <Select value={form.riskMitigationPlanning || NONE}
                    onValueChange={(v) => setField('riskMitigationPlanning', v === NONE ? '' : v as RiskMitigationPlanningLevel)}
                    disabled={isArchived}>
                    <SelectTrigger className="bg-input-background border-input text-foreground focus:border-primary">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-card-foreground">
                      <SelectItem value={NONE}><span className="text-muted-foreground">Select level</span></SelectItem>
                      {RISK_MITIGATION_LEVELS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 3: Performance Metrics */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-secondary" />
                <h3 className="font-semibold text-card-foreground">Performance Metrics</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Historical performance and quality expectations.</p>
              <div className="space-y-4">
                {/* Historical Performance */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">Historical Performance</label>
                  <Select value={form.historicalPerformance || NONE}
                    onValueChange={(v) => setField('historicalPerformance', v === NONE ? '' : v as HistoricalPerformance)}
                    disabled={isArchived}>
                    <SelectTrigger className="bg-input-background border-input text-foreground focus:border-primary">
                      <SelectValue placeholder="Select historical performance" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-card-foreground">
                      <SelectItem value={NONE}><span className="text-muted-foreground">Select historical performance</span></SelectItem>
                      {HISTORICAL_PERFORMANCES.map((o) => <SelectItem key={o} value={o}>{HISTORICAL_LABELS[o] ?? o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expected KPIs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-muted-foreground">Expected KPIs</label>
                    <span className="text-xs text-muted-foreground">({form.kpiRows.length}/20 KPIs)</span>
                  </div>
                  {form.kpiRows.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {form.kpiRows.map((row) => (
                        <div key={row.id} className={`grid grid-cols-[1fr_1fr_80px_32px] gap-2 p-2 rounded-lg border ${row.error ? 'border-destructive bg-destructive/5' : 'border-border bg-muted/30'}`}>
                          <Input value={row.kpiName} onChange={(e) => updateKpiRow(row.id, { kpiName: e.target.value.slice(0, 200) })}
                            placeholder="KPI Name (e.g., Response Time)" maxLength={200}
                            className={`h-7 text-xs bg-input-background border-input text-foreground placeholder:text-muted-foreground ${row.error ? 'border-destructive' : ''}`}
                            disabled={isArchived} />
                          <Input value={row.targetValue} onChange={(e) => updateKpiRow(row.id, { targetValue: e.target.value.slice(0, 100) })}
                            placeholder="Target (e.g., < 200ms)" maxLength={100}
                            className="h-7 text-xs bg-input-background border-input text-foreground placeholder:text-muted-foreground"
                            disabled={isArchived} />
                          <Input value={row.unit} onChange={(e) => updateKpiRow(row.id, { unit: e.target.value.slice(0, 50) })}
                            placeholder="Unit" maxLength={50}
                            className="h-7 text-xs bg-input-background border-input text-foreground placeholder:text-muted-foreground"
                            disabled={isArchived} />
                          <button onClick={() => removeKpiRow(row.id)} disabled={isArchived}
                            className="w-7 h-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {!isArchived && (
                    <button onClick={addKpiRow} disabled={form.kpiRows.length >= 20}
                      className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-40">
                      <Plus className="w-4 h-4" />Add KPI
                    </button>
                  )}
                </div>

                {/* Quality Benchmarks */}
                {form.qualityBenchmarks > 0 || !isArchived ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-muted-foreground">Quality Benchmarks</label>
                      {form.qualityBenchmarks > 0 ? <ScaleLabel value={form.qualityBenchmarks} /> : <span className="text-xs text-muted-foreground">Not set</span>}
                    </div>
                    <Slider value={[form.qualityBenchmarks || 5]}
                      onValueChange={(v) => setField('qualityBenchmarks', v[0])} min={1} max={10} step={1} disabled={isArchived} />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Section 4: Additional Context */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-card-foreground mb-3">Additional Context</h3>
              <Textarea value={form.additionalContext}
                onChange={(e) => setField('additionalContext', e.target.value.slice(0, 2000))}
                placeholder="Provide any additional context for the success prediction..."
                rows={4} className="bg-input-background border-input text-foreground placeholder:text-muted-foreground resize-none mb-1" disabled={isArchived} />
              <div className="text-right">
                <span className={`text-xs ${form.additionalContext.length > 1800 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {form.additionalContext.length} / 2000
                </span>
              </div>
            </div>

            {/* readyForPrediction indicator */}
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${
              readyForPrediction ? 'bg-success/5 border-success/20 text-success' : 'bg-warning/5 border-warning/20 text-warning'
            }`}>
              {readyForPrediction
                ? <><CheckCircle2 className="w-4 h-4 flex-shrink-0" />Sufficient data for prediction.</>
                : <><AlertCircle className="w-4 h-4 flex-shrink-0" />More data needed. Provide project goals clarity, requirements stability, and one execution readiness indicator.</>}
            </div>

            {/* Save + Predict buttons */}
            {!isArchived && (
              <div className="flex flex-col gap-3">
                <Button onClick={handleSave} disabled={isSaving || isPredicting} variant="outline" className="w-full border-border text-foreground hover:bg-muted">
                  {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-2" />{hasData ? 'Update Prediction Data' : 'Save Prediction Data'}</>}
                </Button>
                <Button onClick={handlePredict} disabled={!readyForPrediction || isPredicting || isSaving}
                  className="w-full bg-gradient-to-r from-success to-secondary hover:from-success/90 hover:to-secondary/90 text-white disabled:opacity-50" size="lg">
                  {isPredicting
                    ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Predicting…</>
                    : <><Brain className="w-5 h-5 mr-2" />Generate Forecast (v{nextVersion})</>}
                </Button>
              </div>
            )}
          </div>

          {/* ── RIGHT: Results ──────────────────────────────────────────────────── */}
          <div className="space-y-5">
            {isPredicting && (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <Loader2 className="w-10 h-10 text-success mx-auto mb-4 animate-spin" />
                <p className="font-medium text-card-foreground mb-1">AI prediction in progress</p>
                <p className="text-sm text-muted-foreground">This may take up to a minute…</p>
              </div>
            )}

            {!isPredicting && !latestResult && (
              <div className="bg-card border border-border rounded-2xl p-10 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-medium text-muted-foreground mb-2">No success prediction yet.</p>
                <p className="text-sm text-muted-foreground">Enter prediction data and click "Generate Forecast" to get AI-powered success insights.</p>
              </div>
            )}

            {!isPredicting && latestResult && (
              <>
                {/* Metadata + data sources */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center gap-3 flex-wrap mb-4">
                    <span className="text-sm text-muted-foreground">Version {latestResult.version} — {formatTs(latestResult.timestamp)}</span>
                    <ConfidenceBadge level={latestResult.confidenceLevel} />
                    {latestResult.partialResponse && <span className="text-xs text-warning flex items-center gap-1"><AlertCircle className="w-3 h-3" />⚠️ Partial prediction</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`text-xs border px-2 py-0.5 rounded-full ${latestResult.dataSourcesUsed.teamData ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'}`}>
                      Team data: {latestResult.dataSourcesUsed.teamData ? '✓' : '✗'}
                    </span>
                    <span className={`text-xs border px-2 py-0.5 rounded-full ${latestResult.dataSourcesUsed.riskData ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'}`}>
                      Risk data: {latestResult.dataSourcesUsed.riskData ? '✓' : '✗'}
                    </span>
                  </div>
                  {/* Gauge */}
                  <div className="flex flex-col items-center py-4">
                    <CircularGauge value={latestResult.successProbability} />
                    <p className="text-xs text-muted-foreground mt-2">Predicted likelihood of meeting project objectives</p>
                  </div>
                </div>

                {/* Delivery Confidence */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />Delivery Confidence
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'On-Time Delivery', value: latestResult.expectedDeliveryConfidence?.onTimeDelivery },
                      { label: 'On Budget', value: latestResult.expectedDeliveryConfidence?.onBudget },
                      { label: 'Quality Targets Met', value: latestResult.expectedDeliveryConfidence?.qualityTargetsMet },
                    ].map(({ label, value }) => (
                      <div key={label} className="border border-border rounded-xl p-3 text-center space-y-2">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        {value ? <DeliveryBadge level={value} /> : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Success Factors */}
                {latestResult.keySuccessFactors.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />Key Success Factors
                    </h3>
                    <div className="space-y-2">
                      {latestResult.keySuccessFactors.map((f, i) => (
                        <div key={i} className="border border-success/20 bg-success/5 rounded-xl p-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-card-foreground">{f.factor}</span>
                            <ImpactBadge impact={f.impact} />
                          </div>
                          <p className="text-xs text-muted-foreground">{f.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Risk Factors */}
                {latestResult.keyRiskFactors.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />Key Risk Factors
                    </h3>
                    <div className="space-y-2">
                      {latestResult.keyRiskFactors.map((f, i) => (
                        <div key={i} className="border border-destructive/20 bg-destructive/5 rounded-xl p-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-card-foreground">{f.factor}</span>
                            <ImpactBadge impact={f.impact} />
                          </div>
                          <p className="text-xs text-muted-foreground">{f.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Improvement Recommendations */}
                {latestResult.improvementRecommendations.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />Improvement Recommendations
                    </h3>
                    <div className="space-y-2">
                      {[...latestResult.improvementRecommendations]
                        .sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.priority] ?? 3) - ({ High: 0, Medium: 1, Low: 2 }[b.priority] ?? 3))
                        .map((rec, i) => (
                          <div key={i} className="border border-border rounded-xl p-3 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <PriorityBadge priority={rec.priority} />
                              <span className="text-sm text-card-foreground">{rec.recommendation}</span>
                            </div>
                            <p className="text-xs text-muted-foreground pl-1">Impact: {rec.expectedImpactOnSuccess}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />Summary
                  </h3>
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{latestResult.summary}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── H. Prediction History ─────────────────────────────────────────────── */}
        <div className="mt-6 bg-card border border-border rounded-2xl overflow-hidden">
          <button onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors text-left">
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-muted-foreground" />
              <div>
                <h3 className="text-card-foreground font-semibold">Prediction History</h3>
                <p className="text-xs text-muted-foreground">{historyResults.length} prediction{historyResults.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {showHistory ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>

          {showHistory && (
            <div className="border-t border-border px-5 pb-5">
              {historyResults.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No predictions performed yet.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {[...historyResults].reverse().map((entry) => {
                    const cached = expandedResultCache.get(entry.predictionId);
                    const isExpanded = expandedHistoryId === entry.predictionId;
                    const isLoadingThis = loadingExpandedId === entry.predictionId;
                    return (
                      <div key={entry.predictionId} className="border border-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => handleToggleHistory(entry)}
                          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-xs text-success font-medium border border-success/20">
                              v{entry.version}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-card-foreground">Version {entry.version}</div>
                              <div className="text-xs text-muted-foreground">{formatTs(entry.timestamp)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-xs text-muted-foreground">
                              <div className={`font-medium ${entry.successProbability >= 70 ? 'text-success' : entry.successProbability >= 50 ? 'text-warning' : 'text-destructive'}`}>
                                {entry.successProbability}%
                              </div>
                              <ConfidenceBadge level={entry.confidenceLevel} />
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium bg-success/10 text-success border-success/30">
                              <CheckCircle2 className="w-3 h-3" />Done
                            </span>
                            {entry.dataSourcesUsed.teamData && <span className="text-xs text-success border border-success/20 px-1.5 py-0.5 rounded-full">Team ✓</span>}
                            {entry.dataSourcesUsed.riskData && <span className="text-xs text-primary border border-primary/20 px-1.5 py-0.5 rounded-full">Risk ✓</span>}
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border px-4 pb-4 bg-muted/10 pt-3">
                            {isLoadingThis ? (
                              <div className="flex items-center gap-2 py-2 text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-xs">Loading prediction details…</span>
                              </div>
                            ) : cached ? (
                              <>
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                  {[
                                    { label: 'On-Time', val: cached.expectedDeliveryConfidence?.onTimeDelivery },
                                    { label: 'On Budget', val: cached.expectedDeliveryConfidence?.onBudget },
                                    { label: 'Quality', val: cached.expectedDeliveryConfidence?.qualityTargetsMet },
                                  ].map(({ label, val }) => (
                                    <div key={label} className="text-center">
                                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                                      {val ? <DeliveryBadge level={val} /> : <span className="text-xs text-muted-foreground">—</span>}
                                    </div>
                                  ))}
                                </div>
                                {cached.summary && <p className="text-xs text-muted-foreground">{cached.summary}</p>}
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground py-2">Result details unavailable.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}