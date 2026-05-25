/**
 * Risk Analysis Screen — /projects/:projectId/risk
 * Sections A (input form), B (results), C (run analysis), D (history)
 * All per spec UC-27..UC-31, UC-44
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft, AlertTriangle, Shield, Brain, Circle, Clock, CheckCircle2,
  History, ChevronDown, ChevronUp, Users, Info, Save, Loader2,
  AlertCircle, TrendingUp, BarChart2, Sparkles, XCircle, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { normalizeExperience } from './TeamMemberModal';
import projectsApi from '../lib/projectsApi';
import type {
  Project, RiskInputData, RiskAnalysisResult,
  AnalysisStatus, TeamMember,
  ProjectSize, BudgetRange, TimelineDuration, ResourceAvailability,
  TeamExperienceLevelEnum, TechnologyComplexity,
} from '../App';

// ─── Props ────────────────────────────────────────────────────────────────────

type RiskAnalysisScreenProps = {
  project: Project;
  onUpdateProject: (project: Project) => void;
  onBack: () => void;
  projects?: Project[];
  onSelectProject?: (project: Project) => void;
};

// ─── Enum options ─────────────────────────────────────────────────────────────

const PROJECT_TYPES = [
  'Sales',
  'Development',
  'Marketing',
  'Design',
  'Operations',
  'Finance',
  'Real Estate',
  'Construction',
  'Media Production',
  'Customer Support',
  'Research',
  'Education',
  'HR & Recruitment',
  'E-Commerce',
  'AI & Automation',
  'Other',
];
const PROJECT_SIZES: ProjectSize[] = ['Small', 'Medium', 'Large', 'Enterprise'];

// API-28 exact enum values
const BUDGET_RANGES: BudgetRange[] = ['Under50K', '50K-200K', '200K-500K', '500K-1M', 'Over1M'];
const BUDGET_RANGE_LABELS: Record<BudgetRange, string> = {
  'Under50K':  'Under $50K',
  '50K-200K':  '$50K – $200K',
  '200K-500K': '$200K – $500K',
  '500K-1M':   '$500K – $1M',
  'Over1M':    'Over $1M',
};

const TIMELINE_DURATIONS: TimelineDuration[] = ['Under1Month', '1-3Months', '3-6Months', '6-12Months', 'Over12Months'];
const TIMELINE_LABELS: Record<TimelineDuration, string> = {
  'Under1Month':  'Under 1 Month',
  '1-3Months':    '1–3 Months',
  '3-6Months':    '3–6 Months',
  '6-12Months':   '6–12 Months',
  'Over12Months': 'Over 12 Months',
};

const RESOURCE_AVAILABILITIES: ResourceAvailability[] = ['Scarce', 'Limited', 'Adequate', 'Abundant'];

const TEAM_EXP_LEVELS: TeamExperienceLevelEnum[] = ['MostlyJunior', 'Mixed', 'MostlySenior', 'Expert'];
const TEAM_EXP_LABELS: Record<TeamExperienceLevelEnum, string> = {
  'MostlyJunior': 'Mostly Junior',
  'Mixed':        'Mixed',
  'MostlySenior': 'Mostly Senior',
  'Expert':       'Expert',
};

const TECH_COMPLEXITIES: TechnologyComplexity[] = ['Low', 'Medium', 'High', 'VeryHigh'];
const TECH_COMPLEXITY_LABELS: Record<TechnologyComplexity, string> = {
  'Low':      'Low',
  'Medium':   'Medium',
  'High':     'High',
  'VeryHigh': 'Very High',
};

const NONE = '__none__';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTs(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function inferTeamExperienceLevel(members: TeamMember[]): TeamExperienceLevelEnum | '' {
  if (members.length === 0) return '';
  const levels = members.map((m) => normalizeExperience(m.experienceLevel));
  const total = levels.length;
  const senior = levels.filter((l) => l === 'Senior' || l === 'Lead').length;
  const junior = levels.filter((l) => l === 'Junior').length;
  if (senior >= total * 0.6 && levels.some((l) => l === 'Lead')) return 'Expert';
  if (senior >= total * 0.5) return 'MostlySenior';  // API-28 value
  if (junior >= total * 0.6) return 'MostlyJunior';  // API-28 value
  return 'Mixed';
}

function inferResourceAvailability(members: TeamMember[]): ResourceAvailability | '' {
  if (members.length === 0) return '';
  if (members.length >= 6) return 'Abundant';
  if (members.length >= 4) return 'Adequate';
  if (members.length >= 2) return 'Limited';
  return 'Scarce';
}

function computeReadyForAnalysis(input: Partial<RiskFormState>): boolean {
  if (!input.projectSize) return false;
  let filled = 0;
  if (input.budgetRange) filled++;
  if (input.timelineDuration) filled++;
  if (input.resourceAvailability) filled++;
  if (input.teamExperienceLevel) filled++;
  if (input.technologyComplexity) filled++;
  if ((input.externalDependenciesCount ?? '') !== '') filled++;
  return filled >= 2;
}

// ─── Form State ───────────────────────────────────────────────────────────────

interface RiskFormState {
  projectType: string;
  customProjectType: string;
  projectSize: ProjectSize | '';
  industryDomain: string;
  budgetRange: BudgetRange | '';
  timelineDuration: TimelineDuration | '';
  resourceAvailability: ResourceAvailability | '';
  teamExperienceLevel: TeamExperienceLevelEnum | '';
  technologyComplexity: TechnologyComplexity | '';
  externalDependenciesCount: string;
  externalDependenciesDescription: string;
  additionalContext: string;
}

function buildInputData(form: RiskFormState): RiskInputData | null {
  if (!form.projectSize) return null;
  const data: RiskInputData = {
    projectCharacteristics: {
      projectSize: form.projectSize,
      ...(form.projectType ? { projectType: form.projectType } : {}),
      ...(form.projectType === 'Other' && form.customProjectType.trim() ? { customProjectType: form.customProjectType.trim() } : {}),
      ...(form.industryDomain.trim() ? { industryDomain: form.industryDomain.trim() } : {}),
    },
    projectConstraints: {
      ...(form.budgetRange ? { budgetRange: form.budgetRange } : {}),
      ...(form.timelineDuration ? { timelineDuration: form.timelineDuration } : {}),
      ...(form.resourceAvailability ? { resourceAvailability: form.resourceAvailability } : {}),
    },
    operationalFactors: {
      ...(form.teamExperienceLevel ? { teamExperienceLevel: form.teamExperienceLevel } : {}),
      ...(form.technologyComplexity ? { technologyComplexity: form.technologyComplexity } : {}),
      ...((form.externalDependenciesCount !== '' || form.externalDependenciesDescription.trim()) ? {
        externalDependencies: {
          ...(form.externalDependenciesCount !== '' ? { count: parseInt(form.externalDependenciesCount, 10) } : {}),
          ...(form.externalDependenciesDescription.trim() ? { description: form.externalDependenciesDescription.trim() } : {}),
        },
      } : {}),
    },
    ...(form.additionalContext.trim() ? { additionalContext: form.additionalContext.trim() } : {}),
  };
  return data;
}

// ─── Shared UI components ─────────────────────────────────────────────────────

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
  const size = 140;
  const r = 56;
  const cx = 70; const cy = 70;
  const circumference = 2 * Math.PI * r;
  const arc = Math.min(value / 100, 1) * circumference;
  const color = value >= 71 ? '#22c55e' : value >= 51 ? '#f59e0b' : value >= 31 ? '#f97316' : '#ef4444';
  const label = value >= 71 ? 'Low Risk' : value >= 51 ? 'Medium Risk' : value >= 31 ? 'High Risk' : 'Critical Risk';
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
          <span className={`text-3xl font-bold ${textColor}`}>{value}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <span className={`mt-2 text-sm font-semibold ${textColor}`}>{label}</span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: 'High' | 'Medium' | 'Low' }) {
  const cfg = { High: 'bg-destructive/10 text-destructive border-destructive/30', Medium: 'bg-warning/10 text-warning border-warning/30', Low: 'bg-success/10 text-success border-success/30' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border font-medium ${cfg[priority]}`}>{priority}</span>;
}

function SelectField({
  label, value, onChange, options, placeholder, required, error, hint, disabled, labelMap,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
  required?: boolean; error?: string; hint?: React.ReactNode; disabled?: boolean;
  /** Maps raw API enum values to human-readable display labels. */
  labelMap?: Record<string, string>;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {hint && <div className="mb-1.5">{hint}</div>}
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)} disabled={disabled}>
        <SelectTrigger className={`bg-input-background border-input text-foreground focus:border-primary ${error ? 'border-destructive' : ''}`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-card border-border text-card-foreground">
          <SelectItem value={NONE}><span className="text-muted-foreground">{placeholder}</span></SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{labelMap ? (labelMap[o] ?? o) : o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function RiskAnalysisScreen({ project, onUpdateProject, onBack }: RiskAnalysisScreenProps) {
  const isArchived = project.status === 'Archived';
  const hasTeamAnalysis = project.teamAnalysisStatus === 'completed';

  // ── Local state for API-fetched data ─────────────────────────────────────
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [latestResult, setLatestResult] = useState<RiskAnalysisResult | null>(null);
  const [historyResults, setHistoryResults] = useState<RiskAnalysisResult[]>([]);
  const [localTeamMembers, setLocalTeamMembers] = useState<TeamMember[]>([]);

  // ── Form state ────────────────────────────────────────────────────────────
  const initProjectType = (project.projectType || project.type || '') as string;
  const isCustom = Boolean(initProjectType && initProjectType !== 'Other' && !PROJECT_TYPES.includes(initProjectType));
  
  const [form, setFormRaw] = useState<RiskFormState>({
    projectType: isCustom ? 'Other' : initProjectType,
    customProjectType: isCustom ? initProjectType : (project.customProjectType || ''),
    projectSize: '' as ProjectSize | '',
    industryDomain: (project.industryDomain || project.industry || ''),
    budgetRange: '' as BudgetRange | '',
    timelineDuration: '' as TimelineDuration | '',
    resourceAvailability: '' as ResourceAvailability | '',
    teamExperienceLevel: '' as TeamExperienceLevelEnum | '',
    technologyComplexity: '' as TechnologyComplexity | '',
    externalDependenciesCount: '',
    externalDependenciesDescription: '',
    additionalContext: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  // Keyed by analysisId. Populated lazily on expand, and eagerly after a new run.
  const [expandedResultCache, setExpandedResultCache] = useState<Map<string, RiskAnalysisResult>>(new Map());
  const [loadingExpandedId, setLoadingExpandedId] = useState<string | null>(null);

  // ── Fetch saved risk data and analyses on mount ───────────────────────────
  useEffect(() => {
    setIsDataLoading(true);
    Promise.allSettled([
      projectsApi.getRiskData(project.id),
      projectsApi.listRiskAnalyses(project.id),
      projectsApi.listMembers(project.id),
      projectsApi.getRiskResults(project.id),   // full latest result (detail endpoint)
    ]).then(([riskDataRes, analysesRes, membersRes, latestResultRes]) => {
      const members: TeamMember[] = membersRes.status === 'fulfilled' ? (membersRes.value?.data || []) : [];
      setLocalTeamMembers(members);

      if (riskDataRes.status === 'fulfilled' && riskDataRes.value?.data) {
        const saved: RiskInputData = riskDataRes.value.data;
        setHasData(true);
        const savedType = saved.projectCharacteristics.projectType || (project.projectType || project.type || '') as string;
        const savedIsCustom = Boolean(savedType && savedType !== 'Other' && !PROJECT_TYPES.includes(savedType));
        setFormRaw({
          projectType: savedIsCustom ? 'Other' : savedType,
          customProjectType: savedIsCustom ? savedType : (saved.projectCharacteristics.customProjectType || project.customProjectType || ''),
          projectSize: saved.projectCharacteristics.projectSize || '',
          industryDomain: saved.projectCharacteristics.industryDomain || (project.industryDomain || project.industry || ''),
          budgetRange: saved.projectConstraints.budgetRange || '',
          timelineDuration: saved.projectConstraints.timelineDuration || '',
          resourceAvailability: saved.projectConstraints.resourceAvailability || '',
          teamExperienceLevel: saved.operationalFactors.teamExperienceLevel || '',
          technologyComplexity: saved.operationalFactors.technologyComplexity || '',
          externalDependenciesCount: saved.operationalFactors.externalDependencies?.count?.toString() || '',
          externalDependenciesDescription: saved.operationalFactors.externalDependencies?.description || '',
          additionalContext: saved.additionalContext || '',
        });
      } else {
        // Pre-fill from team data when no saved risk data
        setFormRaw((prev) => ({
          ...prev,
          resourceAvailability: inferResourceAvailability(members),
          teamExperienceLevel: inferTeamExperienceLevel(members),
        }));
      }

      if (analysesRes.status === 'fulfilled') {
        // The list endpoint wraps the full result body under a nested `.data` property
        // on each item (e.g. item.data.overallRiskHealthScore). Flatten it here so the
        // render layer can access all fields directly on the entry object.
        const analyses: RiskAnalysisResult[] = (analysesRes.value?.data || []).map((item: any) => ({
          ...item,
          ...(item.data || {}),
        }));
        setHistoryResults(analyses);
      }

      // Use the full detail result (getRiskResults) for the main results panel
      // extractSingle handles endpoints that return an array or a single object
      if (latestResultRes.status === 'fulfilled') {
        const raw = latestResultRes.value;
        const single = Array.isArray(raw)
          ? (raw.length > 0 ? raw[raw.length - 1] : null)
          : raw || null;
        if (single) setLatestResult(single as RiskAnalysisResult);
      }

      setIsDataLoading(false);
    });
  }, [project.id]);

  const hasTeam = localTeamMembers.length > 0;
  const readyForAnalysis = computeReadyForAnalysis(form);
  const nextVersion = historyResults.length + 1;

  function setField<K extends keyof RiskFormState>(key: K, value: RiskFormState[K]) {
    setFormRaw((p) => ({ ...p, [key]: value }));
    setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  }

  // ── Save risk data via API ────────────────────────────────────────────────
  async function handleSave() {
    if (form.projectType === 'Other') {
      if (!form.customProjectType.trim()) {
        setErrors({ customProjectType: 'Please specify a custom project category' });
        return;
      } else if (form.customProjectType.trim().length > 50) {
        setErrors({ customProjectType: 'Custom category must not exceed 50 characters' });
        return;
      }
    }
    if (!form.projectSize) {
      setErrors({ projectSize: 'Project size is required' });
      return;
    }
    const data = buildInputData(form);
    if (!data) return;
    setIsSaving(true);
    try {
      if (hasData) {
        await projectsApi.updateRiskData(project.id, data);
      } else {
        await projectsApi.enterRiskData(project.id, data);
      }
      setHasData(true);
      onUpdateProject({
        ...project,
        riskAnalysisStatus: project.riskAnalysisStatus === 'not_started' ? 'in_progress' : project.riskAnalysisStatus,
      });
      toast.success(hasData ? 'Risk data updated successfully.' : 'Risk data saved successfully.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to save risk data.');
    } finally {
      setIsSaving(false);
    }
  }

  // ── Run analysis via API ──────────────────────────────────────────────────
  async function handleRunAnalysis() {
    if (!readyForAnalysis) return;
    if (form.projectType === 'Other') {
      if (!form.customProjectType.trim()) {
        setErrors({ customProjectType: 'Please specify a custom project category' });
        return;
      } else if (form.customProjectType.trim().length > 50) {
        setErrors({ customProjectType: 'Custom category must not exceed 50 characters' });
        return;
      }
    }
    // Ensure data is saved first
    if (!hasData) {
      const data = buildInputData(form);
      if (!data) { toast.error('Please save risk data before running analysis.'); return; }
      try {
        await projectsApi.enterRiskData(project.id, data);
        setHasData(true);
      } catch (err: any) {
        toast.error(err?.response?.data?.error?.message || 'Failed to save risk data before analysis.');
        return;
      }
    }
    setIsAnalyzing(true);
    try {
      const result: RiskAnalysisResult = await projectsApi.runRiskAnalysis(project.id);
      const newHistory = [...historyResults, result];
      setHistoryResults(newHistory);
      setLatestResult(result);
      // Pre-populate cache so the new version expands immediately without a round-trip.
      if (result.analysisId) {
        setExpandedResultCache((prev) => new Map(prev).set(result.analysisId, result));
      }
      onUpdateProject({
        ...project,
        riskAnalysisStatus: 'completed',
        riskLevel: result.overallRiskHealthScore >= 71 ? 'low' : result.overallRiskHealthScore >= 51 ? 'medium' : 'high',
      });
      toast.success('Risk analysis completed.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Risk analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  // ── Expand history item — lazy-fetch full result on cache miss ────────────
  async function handleExpandHistory(analysisId: string) {
    if (expandedHistoryId === analysisId) { setExpandedHistoryId(null); return; }
    setExpandedHistoryId(analysisId);
    if (expandedResultCache.has(analysisId)) return; // already cached
    setLoadingExpandedId(analysisId);
    try {
      const full = await projectsApi.getRiskResults(project.id, analysisId);
      if (full) {
        setExpandedResultCache((prev) => new Map(prev).set(analysisId, full as RiskAnalysisResult));
      }
    } catch {
      // Leave cache absent — expanded view will show "unavailable".
    } finally {
      setLoadingExpandedId(null);
    }
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  const teamExpHint = hasTeam ? (
    <span className="flex items-center gap-1 text-xs text-primary">
      <Info className="w-3 h-3" />
      — Inferred from {localTeamMembers.length} team member{localTeamMembers.length !== 1 ? 's' : ''}
    </span>
  ) : null;

  const resourceHint = hasTeam ? (
    <span className="flex items-center gap-1 text-xs text-primary">
      <Info className="w-3 h-3" />
      — Inferred from team size ({localTeamMembers.length} member{localTeamMembers.length !== 1 ? 's' : ''})
    </span>
  ) : null;

  const projectTypePreFilled = !hasData && (project.projectType || project.type);
  const industryPreFilled = !hasData && (project.industryDomain || project.industry);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading risk data…</span></div>
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
                <h1 className="text-3xl font-semibold text-foreground">Risk Analysis</h1>
                <AnalysisStatusBadge status={project.riskAnalysisStatus || 'not_started'} />
              </div>
              <p className="text-muted-foreground text-sm">{project.projectName || project.name}</p>
              {latestResult && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last analysis: v{latestResult.version} · {formatTs(latestResult.timestamp)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Team data banner */}
        <div className={`flex items-start gap-3 p-4 rounded-xl mb-6 border text-sm ${
          hasTeamAnalysis ? 'bg-success/5 border-success/20 text-success' :
          hasTeam ? 'bg-primary/5 border-primary/20 text-primary' :
          'bg-warning/5 border-warning/20 text-warning'
        }`}>
          <Users className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium mb-0.5">
              {hasTeamAnalysis ? 'This analysis uses team composition data' :
               hasTeam ? 'Team data available — run Team Analysis for best results' :
               'No team data — add team members for richer risk assessment'}
            </div>
            <div className="text-xs opacity-80">
              {hasTeamAnalysis
                ? `Team Analysis completed · ${localTeamMembers.length} member${localTeamMembers.length !== 1 ? 's' : ''}`
                : hasTeam ? `${localTeamMembers.length} member(s) added. Run Team Analysis for best results.`
                : 'Navigate to Team Optimization to add members before performing risk analysis.'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT: Input Form ─────────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Section 1: Project Characteristics */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h3 className="font-semibold text-card-foreground">Project Characteristics</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Define your project's scope and nature.</p>
              <div className="space-y-4">
                <SelectField
                  label="Project Type"
                  value={form.projectType}
                  onChange={(v) => {
                    setField('projectType', v);
                    if (v !== 'Other') setField('customProjectType', '');
                  }}
                  options={PROJECT_TYPES}
                  placeholder="Select project type"
                  disabled={isArchived}
                  hint={projectTypePreFilled ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" /> Pre-filled from project data
                    </span>
                  ) : undefined}
                />
                {form.projectType === 'Other' && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      Please Specify Category <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={form.customProjectType}
                      onChange={(e) => setField('customProjectType', e.target.value)}
                      maxLength={50}
                      placeholder="e.g., Event Management, Supply Chain"
                      className={`bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.customProjectType ? 'border-destructive' : ''}`}
                      disabled={isArchived}
                    />
                    {errors.customProjectType && <p className="mt-1 text-xs text-destructive">{errors.customProjectType}</p>}
                  </div>
                )}
                <SelectField
                  label="Project Size"
                  value={form.projectSize}
                  onChange={(v) => setField('projectSize', v as ProjectSize | '')}
                  options={PROJECT_SIZES}
                  placeholder="Select project size"
                  required
                  error={errors.projectSize}
                  disabled={isArchived}
                />
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    Industry / Domain
                    {industryPreFilled && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        <Info className="w-3 h-3 inline mr-0.5" />Pre-filled from project data
                      </span>
                    )}
                  </label>
                  <Input
                    value={form.industryDomain}
                    onChange={(e) => setField('industryDomain', e.target.value.slice(0, 100))}
                    placeholder="e.g., FinTech, Healthcare"
                    className="bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                    disabled={isArchived}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Project Constraints */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-card-foreground">Project Constraints</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Define budget, timeline, and resource constraints.</p>
              <div className="space-y-4">
                <SelectField label="Budget Range" value={form.budgetRange} onChange={(v) => setField('budgetRange', v as BudgetRange | '')}
                  options={BUDGET_RANGES} placeholder="Select budget range" disabled={isArchived}
                  labelMap={BUDGET_RANGE_LABELS} />
                <SelectField label="Timeline Duration" value={form.timelineDuration} onChange={(v) => setField('timelineDuration', v as TimelineDuration | '')}
                  options={TIMELINE_DURATIONS} placeholder="Select timeline duration" disabled={isArchived}
                  labelMap={TIMELINE_LABELS} />
                <SelectField label="Resource Availability" value={form.resourceAvailability} onChange={(v) => setField('resourceAvailability', v as ResourceAvailability | '')}
                  options={RESOURCE_AVAILABILITIES} placeholder="Select resource availability" disabled={isArchived}
                  hint={resourceHint || undefined} />
              </div>
            </div>

            {/* Section 3: Operational Factors */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-4 h-4 text-secondary" />
                <h3 className="font-semibold text-card-foreground">Operational Factors</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Technical and operational parameters that influence risk.</p>
              <div className="space-y-4">
                <SelectField label="Team Experience Level" value={form.teamExperienceLevel} onChange={(v) => setField('teamExperienceLevel', v as TeamExperienceLevelEnum | '')}
                  options={TEAM_EXP_LEVELS} placeholder="Select team experience level" disabled={isArchived}
                  hint={teamExpHint || undefined} labelMap={TEAM_EXP_LABELS} />
                <SelectField label="Technology Complexity" value={form.technologyComplexity} onChange={(v) => setField('technologyComplexity', v as TechnologyComplexity | '')}
                  options={TECH_COMPLEXITIES} placeholder="Select complexity level" disabled={isArchived}
                  labelMap={TECH_COMPLEXITY_LABELS} />
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">External Dependencies Count</label>
                  <Input
                    type="number" min={0} max={50}
                    value={form.externalDependenciesCount}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || (parseInt(v, 10) >= 0 && parseInt(v, 10) <= 50)) setField('externalDependenciesCount', v);
                    }}
                    placeholder="0"
                    className="bg-input-background border-input text-foreground focus:border-primary"
                    disabled={isArchived}
                  />
                  {errors.externalDependenciesCount && <p className="mt-1 text-xs text-destructive">{errors.externalDependenciesCount}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">External Dependencies Description</label>
                  <Textarea
                    value={form.externalDependenciesDescription}
                    onChange={(e) => setField('externalDependenciesDescription', e.target.value.slice(0, 1000))}
                    placeholder="Describe external dependencies (APIs, third-party services, vendor deliverables, etc.)"
                    rows={3}
                    className="bg-input-background border-input text-foreground placeholder:text-muted-foreground resize-none"
                    disabled={isArchived}
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Additional Context */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-semibold text-card-foreground mb-3">Additional Context</h3>
              <Textarea
                value={form.additionalContext}
                onChange={(e) => setField('additionalContext', e.target.value.slice(0, 2000))}
                placeholder="Provide any additional context that might affect risk analysis (regulatory requirements, market conditions, organizational factors, etc.)"
                rows={4}
                className="bg-input-background border-input text-foreground placeholder:text-muted-foreground resize-none mb-1"
                disabled={isArchived}
              />
              <div className="text-right">
                <span className={`text-xs ${form.additionalContext.length > 1800 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {form.additionalContext.length} / 2000
                </span>
              </div>
            </div>

            {/* readyForAnalysis indicator */}
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${
              readyForAnalysis ? 'bg-success/5 border-success/20 text-success' : 'bg-warning/5 border-warning/20 text-warning'
            }`}>
              {readyForAnalysis
                ? <><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Sufficient data for analysis. You can run the risk analysis.</>
                : <><AlertCircle className="w-4 h-4 flex-shrink-0" /> More data needed. Provide at least project size and two constraint or operational factor fields to enable analysis.</>}
            </div>

            {/* Save + Run buttons */}
            {!isArchived && (
              <div className="flex flex-col gap-3">
                <Button onClick={handleSave} disabled={isSaving || isAnalyzing || !form.projectSize}
                  variant="outline" className="w-full border-border text-foreground hover:bg-muted">
                  {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-2" />{hasData ? 'Update Risk Data' : 'Save Risk Data'}</>}
                </Button>
                <Button
                  onClick={handleRunAnalysis}
                  disabled={!readyForAnalysis || isAnalyzing || isSaving}
                  className="w-full bg-gradient-to-r from-warning to-destructive hover:from-warning/90 hover:to-destructive/90 text-white disabled:opacity-50"
                  size="lg"
                >
                  {isAnalyzing
                    ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Analyzing…</>
                    : <><Brain className="w-5 h-5 mr-2" />Run Analysis (v{nextVersion})</>}
                </Button>
              </div>
            )}
          </div>

          {/* ── RIGHT: Results ──────────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Loading state */}
            {isAnalyzing && (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <Loader2 className="w-10 h-10 text-warning mx-auto mb-4 animate-spin" />
                <p className="font-medium text-card-foreground mb-1">AI risk analysis in progress</p>
                <p className="text-sm text-muted-foreground">This may take up to a minute…</p>
              </div>
            )}

            {/* No results yet */}
            {!isAnalyzing && !latestResult && (
              <div className="bg-card border border-border rounded-2xl p-10 text-center">
                <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-medium text-muted-foreground mb-2">No risk analysis has been performed yet.</p>
                <p className="text-sm text-muted-foreground">Enter risk data and click "Run Analysis" to generate AI-powered risk insights.</p>
              </div>
            )}

            {/* Results */}
            {!isAnalyzing && latestResult && (
              <>
                {/* Metadata bar */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-center gap-3 flex-wrap mb-4">
                    <span className="text-sm text-muted-foreground">Version {latestResult.version} — {formatTs(latestResult.timestamp)}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium bg-success/10 text-success border-success/30">
                      <CheckCircle2 className="w-3 h-3" />Completed
                    </span>
                    {latestResult.dataSourcesUsed.teamDataIncluded
                      ? <span className="text-xs text-success bg-success/5 border border-success/20 px-2 py-0.5 rounded-full">Team data included ✓</span>
                      : <span className="text-xs text-muted-foreground border border-border px-2 py-0.5 rounded-full">Team data not included</span>}
                    {latestResult.partialResponse && <span className="text-xs text-warning flex items-center gap-1"><AlertCircle className="w-3 h-3" />⚠️ Partial analysis</span>}
                  </div>

                  {/* Overall Risk Health Score */}
                  <div className="flex flex-col items-center py-4">
                    <CircularGauge value={latestResult.overallRiskHealthScore} />
                    <p className="text-xs text-muted-foreground mt-3 text-center">Overall Risk Health Score — Higher score = lower risk</p>
                  </div>
                </div>

                {/* Identified Risks */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Identified Risks ({latestResult.identifiedRisks.length})
                  </h3>
                  <div className="space-y-3">
                    {latestResult.identifiedRisks.map((risk, i) => {
                      const levelCls = { Critical: 'bg-destructive/10 text-destructive border-destructive/30', High: 'bg-orange-500/10 text-orange-500 border-orange-500/30', Medium: 'bg-warning/10 text-warning border-warning/30', Low: 'bg-success/10 text-success border-success/30' };
                      return (
                        <div key={i} className="border border-border rounded-xl p-4 space-y-2">
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-card-foreground flex-1">{risk.riskName}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${levelCls[risk.level]}`}>{risk.level}</span>
                            <span className="px-2 py-0.5 rounded-full text-xs border border-border text-muted-foreground bg-muted">{risk.category}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Likelihood: <strong>{risk.likelihood}</strong></span>
                            <span>Impact: <strong>{risk.impact}</strong></span>
                          </div>
                          <p className="text-xs text-muted-foreground">{risk.description}</p>
                          <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs text-primary">
                            <strong>Mitigation:</strong> {risk.mitigationRecommendation}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Predictive Warnings */}
                {latestResult.predictiveWarnings.length > 0 && (
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      Predictive Warnings
                    </h3>
                    <div className="space-y-3">
                      {latestResult.predictiveWarnings.map((w, i) => {
                        const cfg = {
                          Critical: { cls: 'bg-destructive/5 border-destructive/20 text-destructive', icon: <AlertTriangle className="w-4 h-4 flex-shrink-0" /> },
                          Warning:  { cls: 'bg-warning/5 border-warning/20 text-warning', icon: <AlertCircle className="w-4 h-4 flex-shrink-0" /> },
                          Info:     { cls: 'bg-primary/5 border-primary/20 text-primary', icon: <Info className="w-4 h-4 flex-shrink-0" /> },
                        };
                        const { cls, icon } = cfg[w.severity];
                        return (
                          <div key={i} className={`border rounded-xl p-4 ${cls}`}>
                            <div className="flex items-start gap-2 mb-1">
                              {icon}
                              <span className="text-sm font-medium">{w.warning}</span>
                            </div>
                            <p className="text-xs opacity-80 ml-6">{w.details}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Summary & Recommendations */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Summary & Recommendations
                  </h3>
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{latestResult.summaryAndRecommendations.summary}</p>
                  </div>
                  <div className="space-y-2">
                    {[...latestResult.summaryAndRecommendations.actionableRecommendations]
                      .sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.priority] ?? 3) - ({ High: 0, Medium: 1, Low: 2 }[b.priority] ?? 3))
                      .map((rec, i) => (
                        <div key={i} className="border border-border rounded-xl p-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <PriorityBadge priority={rec.priority} />
                            <span className="text-sm text-card-foreground">{rec.recommendation}</span>
                          </div>
                          <p className="text-xs text-muted-foreground pl-1">Impact: {rec.expectedImpact}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── D. Analysis History ───────────────────────────────────────────────── */}
        <div className="mt-6 bg-card border border-border rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-muted-foreground" />
              <div>
                <h3 className="text-card-foreground font-semibold">Analysis History</h3>
                <p className="text-xs text-muted-foreground">{historyResults.length} analysis run{historyResults.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {showHistory ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>

          {showHistory && (
            <div className="border-t border-border px-5 pb-5">
              {historyResults.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No analyses have been performed yet.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {[...historyResults].reverse().map((entry) => {
                    const cached = expandedResultCache.get(entry.analysisId);
                    const isExpanded = expandedHistoryId === entry.analysisId;
                    const isLoadingThis = loadingExpandedId === entry.analysisId;
                    // Use cached full result for summary stats when available; list item has metadata only.
                    const score = cached?.overallRiskHealthScore ?? entry.overallRiskHealthScore;
                    const risksCount = (cached?.identifiedRisks ?? entry.identifiedRisks)?.length;
                    const teamIncluded = (cached?.dataSourcesUsed ?? entry.dataSourcesUsed)?.teamDataIncluded;
                    return (
                      <div key={entry.analysisId} className="border border-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => handleExpandHistory(entry.analysisId)}
                          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-medium border border-primary/20">
                              v{entry.version}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-card-foreground">Version {entry.version}</div>
                              {entry.timestamp && <div className="text-xs text-muted-foreground">{formatTs(entry.timestamp)}</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-xs text-muted-foreground">
                              {score != null && <div>Score: {score}/100</div>}
                              {risksCount != null && <div>{risksCount} risk{risksCount !== 1 ? 's' : ''}</div>}
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium bg-success/10 text-success border-success/30">
                              <CheckCircle2 className="w-3 h-3" />Completed
                            </span>
                            {teamIncluded && (
                              <span className="text-xs text-success border border-success/20 px-1.5 py-0.5 rounded-full">Team ✓</span>
                            )}
                            {isLoadingThis
                              ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                              : isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-border px-4 pb-4 bg-muted/10 space-y-3 pt-3">
                            {isLoadingThis ? (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span className="text-xs">Loading result…</span>
                              </div>
                            ) : !cached ? (
                              <p className="text-xs text-muted-foreground">Result unavailable.</p>
                            ) : (
                              <>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm text-muted-foreground">Health Score:</span>
                                  <span className={`text-sm font-semibold ${cached.overallRiskHealthScore >= 71 ? 'text-success' : cached.overallRiskHealthScore >= 51 ? 'text-warning' : 'text-destructive'}`}>
                                    {cached.overallRiskHealthScore}/100
                                  </span>
                                </div>
                                {cached.summaryAndRecommendations?.summary && (
                                  <p className="text-xs text-muted-foreground">{cached.summaryAndRecommendations.summary}</p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                  {(cached.identifiedRisks || []).slice(0, 3).map((r, i) => {
                                    const cls = { Critical: 'text-destructive border-destructive/30', High: 'text-orange-500 border-orange-500/30', Medium: 'text-warning border-warning/30', Low: 'text-success border-success/30' };
                                    return (
                                      <span key={i} className={`text-xs border px-2 py-0.5 rounded-full ${cls[r.level]}`}>{r.riskName}</span>
                                    );
                                  })}
                                  {(cached.identifiedRisks || []).length > 3 && (
                                    <span className="text-xs text-muted-foreground">+{(cached.identifiedRisks || []).length - 3} more</span>
                                  )}
                                </div>
                              </>
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