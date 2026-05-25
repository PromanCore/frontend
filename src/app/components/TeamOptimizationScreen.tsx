/**
 * Team Optimization Screen — /projects/:projectId/team
 * API-driven: fetches team members and analyses from backend on mount.
 * All CRUD and AI analysis operations call real API endpoints.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  ArrowLeft, Users, Plus, X, CheckCircle2, AlertCircle,
  Brain, Circle, Clock, History, ChevronDown, ChevronUp, Play,
  Pencil, Trash2, Loader2, AlertTriangle,
  TrendingUp, BarChart2, User, UsersRound, Sparkles, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { TeamMemberModal, proficiencyBadge, experienceBadge, normalizeExperience } from './TeamMemberModal';
import { formatDate } from '../lib/dateUtils';
import projectsApi from '../lib/projectsApi';
import type {
  Project, TeamMember, TeamAnalysisSnapshot, IndividualMemberAnalysis,
  FollowUpNote, CapabilityGap, OptimizationRecommendation, AnalysisStatus,
  MemberAnalysisHistoryItem,
} from '../App';

type TeamOptimizationScreenProps = {
  project: Project;
  onUpdateProject: (project: Project) => void;
  onBack: () => void;
  projects?: Project[];
  onSelectProject?: (project: Project) => void;
};

// ─── Badge helpers ────────────────────────────────────────────────────────────

function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  const cfg: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    not_started: { label: 'Not Started', cls: 'bg-muted text-muted-foreground border-border', icon: <Circle className="w-3 h-3" /> },
    in_progress:  { label: 'In Progress', cls: 'bg-primary/10 text-primary border-primary/30', icon: <Clock className="w-3 h-3" /> },
    completed:    { label: 'Completed',   cls: 'bg-success/10 text-success border-success/30', icon: <CheckCircle2 className="w-3 h-3" /> },
    failed:       { label: 'Failed',      cls: 'bg-destructive/10 text-destructive border-destructive/30', icon: <XCircle className="w-3 h-3" /> },
  };
  const { label, cls, icon } = cfg[status] ?? cfg['not_started'];
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border font-medium ${cls}`}>{icon}{label}</span>;
}

function ScoreBar({ value }: { value: number }) {
  const color = value >= 75 ? 'bg-success' : value >= 50 ? 'bg-warning' : 'bg-destructive';
  return <div className="w-full h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>;
}

function PriorityBadge({ priority }: { priority: 'High' | 'Medium' | 'Low' }) {
  const cfg = { High: 'bg-destructive/10 text-destructive border-destructive/30', Medium: 'bg-warning/10 text-warning border-warning/30', Low: 'bg-success/10 text-success border-success/30' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border font-medium ${cfg[priority]}`}>{priority}</span>;
}

// ─── Dialogs ──────────────────────────────────────────────────────────────────

function RemoveMemberDialog({ member, onConfirm, onCancel, isLoading }: {
  member: TeamMember; onConfirm: () => void; onCancel: () => void; isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-card-foreground mb-1">Remove Team Member</h3>
            <p className="text-sm text-muted-foreground">Remove <strong>{member.name}</strong>? This permanently deletes all their skills, notes, and analyses.</p>
          </div>
        </div>
        <p className="ml-14 text-sm text-destructive mb-6">This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isLoading} className="border-border text-foreground hover:bg-muted">Cancel</Button>
          <Button onClick={onConfirm} disabled={isLoading} className="bg-destructive hover:bg-destructive/90 text-white">
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Removing…</> : 'Remove Member'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteNoteDialog({ note, onConfirm, onCancel, isLoading }: {
  note: FollowUpNote; onConfirm: () => void; onCancel: () => void; isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6">
        <h3 className="text-base font-semibold text-card-foreground mb-2">Delete Note</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {note.title ? <>Delete note: <strong>{note.title}</strong>? This cannot be undone.</> : 'Delete this note? This cannot be undone.'}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isLoading} className="border-border text-foreground hover:bg-muted">Cancel</Button>
          <Button size="sm" onClick={onConfirm} disabled={isLoading} className="bg-destructive hover:bg-destructive/90 text-white">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Team Analysis Results ────────────────────────────────────────────────────

function TeamAnalysisResults({ analyses, memberCount, isRunning, onRunAnalysis, isArchived }: {
  analyses: TeamAnalysisSnapshot[]; memberCount: number; isRunning: boolean; onRunAnalysis: () => void; isArchived: boolean;
}) {
  const last = analyses.length > 0 ? analyses[analyses.length - 1] : null;
  const severityBadge: Record<string, string> = {
    Critical: 'bg-destructive/10 text-destructive border-destructive/30',
    High: 'bg-warning/10 text-warning border-warning/30',
    Medium: 'bg-primary/10 text-primary border-primary/30',
    Low: 'bg-success/10 text-success border-success/30',
  };
  function sortBySeverity(gaps: CapabilityGap[]) {
    const o = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return [...gaps].sort((a, b) => (o[a.severity] ?? 4) - (o[b.severity] ?? 4));
  }
  function sortByPriority(recs: OptimizationRecommendation[]) {
    const o = { High: 0, Medium: 1, Low: 2 };
    return [...recs].sort((a, b) => (o[a.priority] ?? 3) - (o[b.priority] ?? 3));
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-base font-semibold text-card-foreground">Team Analysis Results</h3>
        </div>
        {!isArchived && (
          <Button onClick={onRunAnalysis} disabled={isRunning || memberCount === 0}
            className="bg-primary hover:bg-primary/90 text-white border-0 disabled:opacity-60" size="sm">
            {isRunning ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Analyzing…</> : <><Play className="w-3.5 h-3.5 mr-1.5" />Run Team Analysis</>}
          </Button>
        )}
      </div>

      {isRunning && (
        <div className="py-6 text-center border border-border rounded-xl bg-muted/20">
          <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
          <p className="text-sm font-medium text-card-foreground">AI team analysis in progress</p>
          <p className="text-xs text-muted-foreground mt-1">This may take up to a minute…</p>
        </div>
      )}

      {!isRunning && !last && (
        <div className="py-8 text-center">
          <BarChart2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground mb-1">No team analysis has been performed yet.</p>
          <p className="text-xs text-muted-foreground">Add team members and click "Run Team Analysis" to generate AI-powered insights.</p>
        </div>
      )}

      {!isRunning && last && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">Version {last.version} — {new Date(last.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <AnalysisStatusBadge status="completed" />
          </div>

          {last.teamCompositionBalance && (
            <div className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <UsersRound className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-card-foreground">Team Composition Balance</h4>
                <span className="ml-auto text-sm font-medium text-card-foreground">{last.teamCompositionBalance.overallScore}/100</span>
              </div>
              <ScoreBar value={last.teamCompositionBalance.overallScore} />
              <p className="text-xs text-muted-foreground">{last.teamCompositionBalance.details}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="bg-muted/40 rounded-lg p-2"><span className="font-medium text-card-foreground block mb-0.5">Role Balance</span>{last.teamCompositionBalance.roleBalance}</div>
                <div className="bg-muted/40 rounded-lg p-2"><span className="font-medium text-card-foreground block mb-0.5">Experience Balance</span>{last.teamCompositionBalance.experienceBalance}</div>
              </div>
            </div>
          )}

          {last.skillCoverageAnalysis && (
            <div className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-4 h-4 text-success" />
                <h4 className="text-sm font-semibold text-card-foreground">Skill Coverage Analysis</h4>
                <span className="ml-auto text-sm font-medium text-card-foreground">{last.skillCoverageAnalysis.coverageScore}/100</span>
              </div>
              <ScoreBar value={last.skillCoverageAnalysis.coverageScore} />
              {last.skillCoverageAnalysis.wellCoveredSkills.length > 0 && (
                <div><p className="text-xs text-muted-foreground mb-1">Well Covered</p>
                  <div className="flex flex-wrap gap-1">{last.skillCoverageAnalysis.wellCoveredSkills.map((s) => <span key={s} className="px-2 py-0.5 bg-success/10 text-success border border-success/20 rounded-full text-xs">{s}</span>)}</div>
                </div>
              )}
              {last.skillCoverageAnalysis.gaps.length > 0 && (
                <div><p className="text-xs text-muted-foreground mb-1">Gaps</p>
                  <div className="flex flex-wrap gap-1">{last.skillCoverageAnalysis.gaps.map((s) => <span key={s} className="px-2 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-full text-xs">{s}</span>)}</div>
                </div>
              )}
            </div>
          )}

          {last.capabilityGaps && last.capabilityGaps.length > 0 && (
            <div className="border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-warning" /><h4 className="text-sm font-semibold text-card-foreground">Capability Gaps</h4></div>
              {sortBySeverity(last.capabilityGaps).map((gap, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-card-foreground">{gap.gapName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${severityBadge[gap.severity] || ''}`}>{gap.severity}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{gap.description}</p>
                  <p className="text-xs text-primary">{gap.recommendation}</p>
                </div>
              ))}
            </div>
          )}

          {last.teamStrengths && last.teamStrengths.length > 0 && (
            <div className="border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="w-4 h-4 text-success" /><h4 className="text-sm font-semibold text-card-foreground">Team Strengths</h4></div>
              <div className="space-y-2">
                {last.teamStrengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-success bg-success/5 border border-success/20 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {last.optimizationRecommendations && last.optimizationRecommendations.length > 0 && (
            <div className="border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-primary" /><h4 className="text-sm font-semibold text-card-foreground">Optimization Recommendations</h4></div>
              {sortByPriority(last.optimizationRecommendations).map((rec, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2"><PriorityBadge priority={rec.priority} /><span className="text-sm text-card-foreground">{rec.recommendation}</span></div>
                  <p className="text-xs text-muted-foreground pl-1">{rec.expectedImpact}</p>
                </div>
              ))}
            </div>
          )}

          {last.summary && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-primary" /><h4 className="text-sm font-semibold text-card-foreground">Summary</h4></div>
              <p className="text-sm text-muted-foreground leading-relaxed">{last.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Member Details Panel ─────────────────────────────────────────────────────

function MemberDetailsPanel({ member, projectId, onClose, onEditMember, onDeleteMember, onUpdateMember, isArchived }: {
  member: TeamMember; projectId: string; onClose: () => void; onEditMember: (m: TeamMember) => void;
  onDeleteMember: (m: TeamMember) => void; onUpdateMember: (updated: TeamMember) => void; isArchived: boolean;
}) {
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteContentError, setNoteContentError] = useState('');
  const [deletingNote, setDeletingNote] = useState<FollowUpNote | null>(null);
  const [confirmDeleteNote, setConfirmDeleteNote] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const notes = member.followUpNotes || [];
  const skills = [...(member.skills || [])].sort((a, b) => (a.skillName || a.name).localeCompare(b.skillName || b.name));
  const analysis = member.individualAnalysis;

  async function handleSaveNote() {
    if (!noteContent.trim()) { setNoteContentError('Note content is required'); return; }
    if (noteContent.trim().length > 5000) { setNoteContentError('Note content must not exceed 5000 characters'); return; }
    setSavingNote(true);
    try {
      const memberId = member.memberId || member.id;
      const newNote = await projectsApi.addNote(projectId, memberId, { title: noteTitle.trim() || undefined, content: noteContent.trim() });
      onUpdateMember({ ...member, followUpNotes: [newNote, ...(member.followUpNotes || [])], updatedAt: new Date().toISOString() });
      setNoteTitle(''); setNoteContent(''); setShowAddNote(false);
      toast.success('Note added successfully.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to add note.');
    } finally { setSavingNote(false); }
  }

  async function confirmDeleteNoteFn() {
    if (!deletingNote) return;
    setSavingNote(true);
    try {
      const memberId = member.memberId || member.id;
      await projectsApi.deleteNote(projectId, memberId, deletingNote.id);
      onUpdateMember({ ...member, followUpNotes: (member.followUpNotes || []).filter((n) => n.id !== deletingNote.id), updatedAt: new Date().toISOString() });
      setConfirmDeleteNote(false); setDeletingNote(null);
      toast.success('Note deleted successfully.');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete note.');
    } finally { setSavingNote(false); }
  }

  async function handleRunAnalysis() {
    setIsAnalyzing(true); setAnalysisError('');
    try {
      const memberId = member.memberId || member.id;
      await projectsApi.analyzeIndividualMember(projectId, memberId);
      // Refetch both the latest result (for the details panel) and the full history list.
      const [freshRes, historyRes] = await Promise.allSettled([
        projectsApi.getMemberAnalysisResults(projectId, memberId).catch(() => null),
        projectsApi.listMemberAnalyses(projectId, memberId).catch(() => null),
      ]);
      const fresh = freshRes.status === 'fulfilled' ? freshRes.value : null;
      const isValid = (a: any): a is IndividualMemberAnalysis => a != null && a.skillsAdequacyAssessment != null;
      const result = isValid(fresh) ? fresh : null;

      const memberAnalysisHistoryItems: MemberAnalysisHistoryItem[] =
        historyRes.status === 'fulfilled' && historyRes.value
          ? (historyRes.value.data ?? []).map((h: any) => ({
              analysisId: h.analysisId,
              analysisType: 'Individual' as const,
              version: h.version,
            }))
          : member.memberAnalysisHistoryItems ?? [];

      onUpdateMember({
        ...member,
        individualAnalysis: result ?? undefined,
        analysisHistory: result
          ? [result, ...(member.analysisHistory || []).filter((h) => (h as any).analysisId !== (result as any).analysisId)]
          : member.analysisHistory,
        memberAnalysisHistoryItems,
        updatedAt: new Date().toISOString(),
      });
      toast.success(result
        ? `Individual analysis completed for ${member.name}.`
        : `Individual analysis completed for ${member.name}. Refresh to see results.`
      );
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Analysis failed. Please try again.';
      setAnalysisError(msg); toast.error('Analysis failed.');
    } finally { setIsAnalyzing(false); }
  }

  const fitLevelBadge: Record<string, string> = { ExcellentFit: 'bg-primary/10 text-primary border-primary/30', GoodFit: 'bg-success/10 text-success border-success/30', PartialFit: 'bg-warning/10 text-warning border-warning/30', PoorFit: 'bg-destructive/10 text-destructive border-destructive/30' };
  const fitLevelLabel: Record<string, string> = { ExcellentFit: 'Excellent Fit', GoodFit: 'Good Fit', PartialFit: 'Partial Fit', PoorFit: 'Poor Fit' };
  const potentialBadge: Record<string, string> = { Exceptional: 'bg-primary/10 text-primary border-primary/30', High: 'bg-success/10 text-success border-success/30', Moderate: 'bg-warning/10 text-warning border-warning/30', Low: 'bg-destructive/10 text-destructive border-destructive/30' };
  const adequacyBadge: Record<string, string> = { Expert: 'bg-purple/10 text-purple border-purple/30', Strong: 'bg-success/10 text-success border-success/30', Adequate: 'bg-primary/10 text-primary border-primary/30', Insufficient: 'bg-destructive/10 text-destructive border-destructive/30' };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-card-foreground">{member.name}</h2>
              {member.experienceLevel && <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border font-medium ${experienceBadge(member.experienceLevel)}`}>{normalizeExperience(member.experienceLevel)}</span>}
            </div>
            {member.role && <p className="text-sm text-muted-foreground mt-0.5">{member.role}</p>}
            {member.createdAt && <p className="text-xs text-muted-foreground mt-1">Added: {formatDate(member.createdAt)}</p>}
          </div>
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            {!isArchived && (
              <>
                <Button size="sm" variant="outline" onClick={() => onEditMember(member)} className="border-border text-foreground hover:bg-interactive-hover hover:text-white hover:border-interactive-hover"><Pencil className="w-3.5 h-3.5 mr-1" />Edit</Button>
                <Button size="sm" variant="outline" onClick={() => onDeleteMember(member)} className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white hover:border-destructive"><Trash2 className="w-3.5 h-3.5 mr-1" />Remove</Button>
              </>
            )}
            <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Skills */}
          <section>
            <h3 className="text-sm font-semibold text-card-foreground mb-3">Skills ({skills.length})</h3>
            {skills.length === 0 ? <p className="text-xs text-muted-foreground">No skills listed yet.</p> : (
              <div className="space-y-2">
                {skills.map((skill, i) => {
                  const sn = skill.skillName || skill.name;
                  const pl = skill.proficiencyLevel;
                  return (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm text-card-foreground">{sn}</span>
                      {pl ? <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${proficiencyBadge(pl)}`}>{pl}</span> : <span className="text-xs text-muted-foreground">Not rated</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Notes */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-card-foreground">Follow-Up Notes ({notes.length})</h3>
              {!isArchived && !showAddNote && (
                <Button size="sm" variant="outline" onClick={() => setShowAddNote(true)} className="border-border text-foreground hover:bg-muted h-7 text-xs"><Plus className="w-3 h-3 mr-1" />Add Note</Button>
              )}
            </div>
            {showAddNote && (
              <div className="border border-border rounded-xl p-4 mb-4 space-y-3 bg-muted/20">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Title <span className="text-muted-foreground">(optional)</span></label>
                  <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value.slice(0, 200))} placeholder="e.g., Weekly Check-In" className="bg-input-background border-input text-foreground text-sm h-8 placeholder:text-muted-foreground" disabled={savingNote} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Content <span className="text-destructive">*</span></label>
                  <Textarea value={noteContent} onChange={(e) => { setNoteContent(e.target.value); setNoteContentError(''); }} placeholder="Write your follow-up note here…" rows={4} maxLength={5000}
                    className={`bg-input-background border-input text-foreground text-sm resize-none placeholder:text-muted-foreground ${noteContentError ? 'border-destructive' : ''}`} disabled={savingNote} />
                  <div className="flex justify-between mt-1">
                    {noteContentError ? <p className="text-xs text-destructive">{noteContentError}</p> : <span />}
                    <span className={`text-xs ${noteContent.length > 4500 ? 'text-destructive' : 'text-muted-foreground'}`}>{noteContent.length} / 5000</span>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => { setShowAddNote(false); setNoteTitle(''); setNoteContent(''); setNoteContentError(''); }} disabled={savingNote} className="border-border text-foreground hover:bg-muted">Cancel</Button>
                  <Button size="sm" onClick={handleSaveNote} disabled={!noteContent.trim() || savingNote} className="bg-primary hover:bg-primary/90 text-white">
                    {savingNote ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Note'}
                  </Button>
                </div>
              </div>
            )}
            {notes.length === 0 ? <p className="text-xs text-muted-foreground">No follow-up notes yet.</p> : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="border border-border rounded-xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {note.title && <p className="text-sm font-semibold text-card-foreground mb-1">{note.title}</p>}
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                      </div>
                      {!isArchived && <button onClick={() => { setDeletingNote(note); setConfirmDeleteNote(true); }} className="text-muted-foreground hover:text-destructive transition-colors p-1 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Individual Analysis */}
          <section className="pb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-card-foreground">Individual Analysis</h3>
              {!isArchived && analysis && !isAnalyzing && (
                <Button size="sm" onClick={handleRunAnalysis} disabled={isAnalyzing} className="bg-primary hover:bg-primary/90 text-white h-7 text-xs"><Play className="w-3 h-3 mr-1" />Run New Analysis</Button>
              )}
            </div>
            {isAnalyzing && (
              <div className="border border-border rounded-xl p-6 text-center">
                <Loader2 className="w-8 h-8 text-primary mx-auto mb-3 animate-spin" />
                <p className="text-sm font-medium text-card-foreground">AI analysis in progress</p>
                <p className="text-xs text-muted-foreground mt-1">This may take up to a minute…</p>
              </div>
            )}
            {analysisError && !isAnalyzing && <div className="border border-destructive/30 rounded-xl p-4 mb-3 bg-destructive/5"><p className="text-sm text-destructive">{analysisError}</p></div>}
            {!isAnalyzing && !analysis && (
              <div className="text-center py-6 border border-border rounded-xl">
                <User className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No individual analysis yet.</p>
                {!isArchived && <Button size="sm" onClick={handleRunAnalysis} className="bg-primary hover:bg-primary/90 text-white"><Sparkles className="w-3.5 h-3.5 mr-1.5" />Analyze Member</Button>}
              </div>
            )}
            {!isAnalyzing && analysis && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span>Version {analysis.version} — {new Date(analysis.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="border border-border rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wide">Skills Adequacy</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-semibold text-card-foreground">{analysis.skillsAdequacyAssessment?.overallScore ?? '—'}</span>
                    <div className="flex-1"><ScoreBar value={analysis.skillsAdequacyAssessment?.overallScore ?? 0} /><p className="text-xs text-muted-foreground mt-1">Overall Score / 100</p></div>
                  </div>
                  <p className="text-xs text-muted-foreground">{analysis.skillsAdequacyAssessment?.details}</p>
                  {(analysis.skillsAdequacyAssessment?.skillBreakdown?.length ?? 0) > 0 && (
                    <div className="space-y-1">
                      {analysis.skillsAdequacyAssessment!.skillBreakdown.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-card-foreground">{item.skillName}</span>
                          <span className={`px-2 py-0.5 rounded-full border font-medium ${adequacyBadge[item.adequacy] || ''}`}>{item.adequacy}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border border-border rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wide">Role Fit</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-semibold text-card-foreground">{analysis.roleFitEvaluation?.fitScore ?? '—'}</span>
                    <div className="flex-1"><ScoreBar value={analysis.roleFitEvaluation?.fitScore ?? 0} /></div>
                    <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${fitLevelBadge[analysis.roleFitEvaluation?.fitLevel ?? ''] || ''}`}>{fitLevelLabel[analysis.roleFitEvaluation?.fitLevel ?? ''] || analysis.roleFitEvaluation?.fitLevel}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{analysis.roleFitEvaluation?.details}</p>
                </div>
                <div className="border border-border rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wide">Performance Potential</h4>
                  <span className={`px-3 py-1 rounded-full text-sm border font-medium ${potentialBadge[analysis.performancePotential?.potentialLevel ?? ''] || ''}`}>{analysis.performancePotential?.potentialLevel}</span>
                  <p className="text-xs text-muted-foreground">{analysis.performancePotential?.details}</p>
                </div>
                {(analysis.developmentRecommendations?.length ?? 0) > 0 && (
                  <div className="border border-border rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wide">Development Recommendations</h4>
                    {[...analysis.developmentRecommendations!].sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.priority] ?? 3) - ({ High: 0, Medium: 1, Low: 2 }[b.priority] ?? 3)).map((rec, i) => (
                      <div key={i} className="border border-border rounded-lg p-3 space-y-1">
                        <div className="flex items-center gap-2"><PriorityBadge priority={rec.priority} /><span className="text-xs text-card-foreground">{rec.recommendation}</span></div>
                        <p className="text-xs text-muted-foreground pl-1">Impact: {rec.expectedImpact}</p>
                        <p className="text-xs text-muted-foreground pl-1">Timeframe: {rec.timeframe}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><Sparkles className="w-3.5 h-3.5 text-primary" /><h4 className="text-xs font-semibold text-card-foreground uppercase tracking-wide">Summary</h4></div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{analysis.summary}</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
      {confirmDeleteNote && deletingNote && (
        <DeleteNoteDialog note={deletingNote} onConfirm={confirmDeleteNoteFn} onCancel={() => { setConfirmDeleteNote(false); setDeletingNote(null); }} isLoading={savingNote} />
      )}
    </>
  );
}

// ─── Analysis History ─────────────────────────────────────────────────────────

const fitLevelLabelMap: Record<string, string> = { ExcellentFit: 'Excellent Fit', GoodFit: 'Good Fit', PartialFit: 'Partial Fit', PoorFit: 'Poor Fit' };

type HistoryEntry = {
  id: string;
  type: 'Team' | 'Individual';
  analysisId: string;
  version: number;
  memberName?: string;
  memberId?: string;
};

function AnalysisHistorySection({ projectId, members, teamHistoryItems }: {
  projectId: string;
  members: TeamMember[];
  teamHistoryItems: Array<{ analysisId: string; version: number; status?: string }>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'All' | 'Individual' | 'Team'>('All');
  const [memberFilter, setMemberFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Cache of lazily fetched full results, keyed by analysisId.
  const [expandedDataCache, setExpandedDataCache] = useState<Map<string, any>>(new Map());
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Build flat entry list from metadata arrays — no full result bodies at this stage.
  const allEntries: HistoryEntry[] = [
    ...teamHistoryItems.map((item) => ({
      id: `team-${item.analysisId}`,
      type: 'Team' as const,
      analysisId: item.analysisId,
      version: item.version,
    })),
    ...members.flatMap((member) =>
      (member.memberAnalysisHistoryItems ?? []).map((item) => ({
        id: `ind-${member.id}-${item.analysisId}`,
        type: 'Individual' as const,
        analysisId: item.analysisId,
        version: item.version,
        memberName: member.name,
        memberId: member.memberId ?? member.id,
      }))
    ),
  ];
  // Sort: Team entries by version desc, then Individual entries by version desc.
  // (Version counters are independent per entity type, so interleaving by version would be misleading.)
  allEntries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'Team' ? -1 : 1;
    return b.version - a.version;
  });

  const filtered = allEntries.filter((e) => {
    if (typeFilter !== 'All' && e.type !== typeFilter) return false;
    if (typeFilter === 'Individual' && memberFilter !== 'all' && e.memberName !== memberFilter) return false;
    return true;
  });
  const memberNames = [...new Set(
    allEntries.filter((e) => e.type === 'Individual').map((e) => e.memberName as string)
  )];

  async function handleToggle(entry: HistoryEntry) {
    if (expandedId === entry.id) { setExpandedId(null); return; }
    setExpandedId(entry.id);
    // Lazy-fetch the full result the first time this entry is expanded.
    if (!expandedDataCache.has(entry.analysisId)) {
      setLoadingId(entry.id);
      try {
        const data = entry.type === 'Team'
          ? await projectsApi.getTeamAnalysis(projectId, entry.analysisId)
          : await projectsApi.getMemberAnalysisResults(projectId, entry.memberId!, entry.analysisId);
        setExpandedDataCache((prev) => new Map(prev).set(entry.analysisId, data));
      } catch {
        // Leave cache entry absent — expanded view will show "unavailable".
      } finally {
        setLoadingId(null);
      }
    }
  }

  return (
    <div className="mt-6 bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors text-left">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="text-card-foreground font-semibold">Analysis History</h3>
            <p className="text-xs text-muted-foreground">{allEntries.length} total entr{allEntries.length !== 1 ? 'ies' : 'y'}</p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      {isOpen && (
        <div className="border-t border-border px-5 pb-5">
          <div className="flex flex-wrap items-center gap-3 py-4">
            <div className="flex items-center gap-1 p-1 bg-muted border border-border rounded-xl">
              {(['All', 'Team', 'Individual'] as const).map((t) => (
                <button key={t} onClick={() => { setTypeFilter(t); setMemberFilter('all'); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${typeFilter === t ? 'bg-interactive-hover text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}>{t}</button>
              ))}
            </div>
            {typeFilter === 'Individual' && memberNames.length > 0 && (
              <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} className="px-3 py-1.5 text-sm bg-input-background border border-border rounded-lg text-foreground focus:border-primary outline-none">
                <option value="all">All Members</option>
                {memberNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            )}
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-8"><History className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No analyses yet.</p></div>
          ) : (
            <div className="space-y-2">
              {filtered.map((entry) => {
                const isExpanded = expandedId === entry.id;
                const isLoading = loadingId === entry.id;
                const data = expandedDataCache.get(entry.analysisId);
                return (
                  <div key={entry.id} className="border border-border rounded-xl overflow-hidden">
                    <button onClick={() => handleToggle(entry)} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border flex-shrink-0">
                          {entry.type === 'Team' ? <UsersRound className="w-3.5 h-3.5 text-primary" /> : <User className="w-3.5 h-3.5 text-secondary" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-card-foreground">{entry.type}</span>
                            {entry.memberName && <span className="text-xs text-muted-foreground">— {entry.memberName}</span>}
                            <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground border border-border rounded font-medium">v{entry.version}</span>
                          </div>
                          {data?.timestamp && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(data.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium bg-success/10 text-success border-success/30"><CheckCircle2 className="w-3 h-3" />Completed</span>
                        {isLoading
                          ? <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                          : isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-border bg-muted/10 text-xs text-muted-foreground">
                        {isLoading ? (
                          <div className="pt-3 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Loading result…</span></div>
                        ) : !data ? (
                          <p className="pt-3">Result unavailable.</p>
                        ) : entry.type === 'Team' ? (
                          <div className="pt-3 space-y-2">
                            {data.teamSize != null && <p>Team size: {data.teamSize} members</p>}
                            {data.teamCompositionBalance && <p>Composition score: {data.teamCompositionBalance.overallScore}/100</p>}
                            {data.summary && <p className="leading-relaxed">{data.summary}</p>}
                          </div>
                        ) : (
                          <div className="pt-3 space-y-2">
                            <p>Skills adequacy: {data.skillsAdequacyAssessment?.overallScore}/100</p>
                            <p>Role fit: {data.roleFitEvaluation?.fitScore}/100 — {fitLevelLabelMap[data.roleFitEvaluation?.fitLevel] || data.roleFitEvaluation?.fitLevel}</p>
                            <p>Potential: {data.performancePotential?.potentialLevel}</p>
                            {data.summary && <p className="leading-relaxed">{data.summary}</p>}
                          </div>
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
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function TeamOptimizationScreen({ project, onUpdateProject, onBack }: TeamOptimizationScreenProps) {
  const isArchived = project.status === 'Archived';
  const projectId = project.id;

  const [localMembers, setLocalMembers] = useState<TeamMember[]>([]);
  const [localTeamAnalyses, setLocalTeamAnalyses] = useState<TeamAnalysisSnapshot[]>([]);
  /** Metadata list from GET /team/analyses?analysisType=Team — all versions. */
  const [teamHistoryItems, setTeamHistoryItems] = useState<Array<{ analysisId: string; version: number; status?: string }>>([]);
  const [localTeamStatus, setLocalTeamStatus] = useState<AnalysisStatus>(project.teamAnalysisStatus);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRunningTeamAnalysis, setIsRunningTeamAnalysis] = useState(false);

  useEffect(() => {
    setIsDataLoading(true);

    // Phase 1 — fire in parallel:
    //   • listMembers              — member list (lightweight, no analysis bodies)
    //   • getTeamResults           — latest persisted team result for the main results panel.
    //                                404 = no saved analysis yet; swallowed gracefully.
    //   • listTeamAnalyses         — full history list (all versions, metadata only) for history section.
    Promise.allSettled([
      projectsApi.listMembers(projectId),
      projectsApi.getTeamResults(projectId).catch((err: any) => {
        // 404 is the documented "no saved analysis yet" response — not an error.
        if (err?.response?.status === 404) return null;
        return null;
      }),
      projectsApi.listTeamAnalyses(projectId, { analysisType: 'Team' }).catch(() => null),
    ]).then(async ([membersRes, teamResultRes, teamHistoryRes]) => {
      const rawMembers: any[] = membersRes.status === 'fulfilled'
        ? (membersRes.value?.data || []) : [];

      // Latest team analysis from the persistent restore endpoint — for the main results panel only.
      const latestTeamResult: TeamAnalysisSnapshot | null =
        teamResultRes.status === 'fulfilled' ? teamResultRes.value : null;

      const teamAnalyses: TeamAnalysisSnapshot[] = latestTeamResult ? [latestTeamResult] : [];

      // Full team history metadata (all versions) — for the history section.
      const rawTeamHistory: any[] =
        teamHistoryRes.status === 'fulfilled' && teamHistoryRes.value
          ? (teamHistoryRes.value.data || [])
          : [];
      setTeamHistoryItems(rawTeamHistory);

      // Phase 2 — per-member parallel:
      //   • getMember                  — for followUpNotes + skills (authoritative detail)
      //   • getMemberAnalysisResults   — latest persisted individual analysis (for details panel display)
      //                                  404 = member has no saved individual analysis yet
      //   • listMemberAnalyses         — full history metadata (all versions) for history section
      const memberDataResults = await Promise.allSettled(
        rawMembers.map(async (m: any) => {
          const mid = m.memberId || m.id;
          const [detailRes, analysisRes, memberHistoryRes] = await Promise.allSettled([
            projectsApi.getMember(projectId, mid),
            projectsApi.getMemberAnalysisResults(projectId, mid).catch(() => null),
            projectsApi.listMemberAnalyses(projectId, mid).catch(() => null),
          ]);
          return {
            detail:        detailRes.status        === 'fulfilled' ? detailRes.value        : null,
            analysis:      analysisRes.status      === 'fulfilled' ? analysisRes.value      : null,
            memberHistory: memberHistoryRes.status === 'fulfilled' ? memberHistoryRes.value : null,
          };
        })
      );

      // Shape guard: only accept an individual analysis that has skillsAdequacyAssessment.
      const isValidIndividual = (a: any): a is IndividualMemberAnalysis =>
        a != null && a.skillsAdequacyAssessment != null;

      const members: TeamMember[] = rawMembers.map((m: any, i: number) => {
        const data   = memberDataResults[i].status === 'fulfilled' ? memberDataResults[i].value : null;
        const detail = data?.detail   ?? null;
        const rawAnalysis = data?.analysis ?? null;

        const individualAnalysis: IndividualMemberAnalysis | undefined =
          isValidIndividual(rawAnalysis) ? rawAnalysis : undefined;

        const followUpNotes: any[] =
          detail?.followUpNotes ?? detail?.notes ?? m.followUpNotes ?? [];

        // The list endpoint returns skillsCount but no skills array.
        // The detail endpoint (getMember) returns the full skills array — use it.
        const skills: import('../App').Skill[] = (detail?.skills ?? []).map((s: any) => ({
          name: s.skillName || s.name || '',
          skillName: s.skillName || s.name || '',
          proficiency: 5,
          proficiencyLevel: s.proficiencyLevel,
        }));

        // All history versions from the history endpoint (metadata only — no full result bodies).
        const memberAnalysisHistoryItems: MemberAnalysisHistoryItem[] =
          (data?.memberHistory?.data ?? []).map((h: any) => ({
            analysisId: h.analysisId,
            analysisType: 'Individual' as const,
            version: h.version,
          }));

        return {
          ...m,
          skills,
          followUpNotes,
          individualAnalysis,
          analysisHistory: individualAnalysis ? [individualAnalysis] : [],
          memberAnalysisHistoryItems,
        } as TeamMember;
      });

      setLocalMembers(members);
      setLocalTeamAnalyses(teamAnalyses);
      if (latestTeamResult) setLocalTeamStatus('completed');
      setIsDataLoading(false);
    });
  }, [projectId]);

  const selectedMember = localMembers.find((m) => m.id === selectedMemberId) || null;
  const lastAnalysis = localTeamAnalyses.length > 0 ? localTeamAnalyses[localTeamAnalyses.length - 1] : null;

  const updateMemberLocally = useCallback((updated: TeamMember) => {
    setLocalMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }, []);

  async function handleMemberSaved(member: TeamMember) {
    const skills = (member.skills || []).map((s) => ({ skillName: s.skillName || s.name, ...(s.proficiencyLevel ? { proficiencyLevel: s.proficiencyLevel } : {}) }));
    if (editingMember) {
      try {
        const memberId = editingMember.memberId || editingMember.id;
        const result = await projectsApi.updateMember(projectId, memberId, { name: member.name, role: member.role || null, experienceLevel: member.experienceLevel || null, skills });
        const normalizedSkills = (result.skills ?? []).map((s: any) => ({ name: s.skillName || s.name || '', skillName: s.skillName || s.name || '', proficiency: 5, proficiencyLevel: s.proficiencyLevel }));
        setLocalMembers((prev) => prev.map((m) => (m.id === editingMember.id ? { ...editingMember, ...result, skills: normalizedSkills } : m)));
        setEditingMember(null);
        toast.success('Team member updated successfully.');
      } catch (err: any) { toast.error(err?.response?.data?.error?.message || 'Failed to update member.'); }
    } else {
      try {
        const result = await projectsApi.addMember(projectId, { name: member.name, role: member.role || undefined, experienceLevel: member.experienceLevel || undefined, skills });
        const newMember: TeamMember = { id: result.id, memberId: result.id, name: result.name, role: result.role || '', experienceLevel: result.experienceLevel || 'Mid', skills: (result.skills || []).map((s: any) => ({ name: s.skillName || '', skillName: s.skillName || '', proficiency: 5, proficiencyLevel: s.proficiencyLevel })), followUpNotes: [], createdAt: result.createdAt, updatedAt: result.updatedAt };
        setLocalMembers((prev) => [...prev, newMember]);
        setShowAddModal(false);
        if (localTeamStatus === 'not_started') { onUpdateProject({ ...project, teamAnalysisStatus: 'in_progress' }); setLocalTeamStatus('in_progress'); }
        toast.success('Team member added successfully.');
      } catch (err: any) { toast.error(err?.response?.data?.error?.message || 'Failed to add member.'); }
    }
  }

  async function handleConfirmRemove() {
    if (!removingMember) return;
    setIsRemoving(true);
    try {
      await projectsApi.removeMember(projectId, removingMember.memberId || removingMember.id);
      setLocalMembers((prev) => prev.filter((m) => m.id !== removingMember.id));
      if (selectedMemberId === removingMember.id) setSelectedMemberId(null);
      setRemovingMember(null);
      toast.success('Team member removed successfully.');
    } catch (err: any) { toast.error(err?.response?.data?.error?.message || 'Failed to remove member.'); }
    finally { setIsRemoving(false); }
  }

  async function handleRunTeamAnalysis() {
    if (localMembers.length === 0) { toast.error('Add team members first.'); return; }
    setIsRunningTeamAnalysis(true);
    try {
      // Run the analysis — backend persists the result.
      await projectsApi.analyzeTeam(projectId);
      // Refetch latest result (for the main results panel) and full history (for the history section).
      const [fresh, historyRes] = await Promise.allSettled([
        projectsApi.getTeamResults(projectId).catch(() => null),
        projectsApi.listTeamAnalyses(projectId, { analysisType: 'Team' }).catch(() => null),
      ]);
      const freshResult = fresh.status === 'fulfilled' ? fresh.value : null;
      setLocalTeamAnalyses(freshResult ? [freshResult as TeamAnalysisSnapshot] : []);
      if (historyRes.status === 'fulfilled' && historyRes.value) {
        setTeamHistoryItems(historyRes.value.data ?? []);
      }
      setLocalTeamStatus('completed');
      onUpdateProject({ ...project, teamAnalysisStatus: 'completed' });
      toast.success('Team analysis completed.');
    } catch (err: any) { toast.error(err?.response?.data?.error?.message || 'Team analysis failed.'); }
    finally { setIsRunningTeamAnalysis(false); }
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground hover:bg-muted mb-4"><ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard</Button>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-3xl font-semibold text-foreground">Team Optimization</h1>
                <AnalysisStatusBadge status={localTeamStatus} />
              </div>
              <p className="text-muted-foreground text-sm">{project.projectName || project.name}</p>
              {lastAnalysis && <p className="text-xs text-muted-foreground mt-1">Last analysis: v{lastAnalysis.version} · {new Date(lastAnalysis.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
            </div>
            {!isArchived && <Button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary/90 text-white border-0" size="sm"><Plus className="w-4 h-4 mr-2" />Add Member</Button>}
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl mb-6 text-sm text-primary">
          <Brain className="w-5 h-5 flex-shrink-0" />
          <span><strong>Team module is the starting point.</strong> Team data feeds into Risk Analysis and Success Forecasting. Add members, then run Team Analysis.</span>
        </div>

        {isDataLoading && <div className="flex items-center gap-3 py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Loading team data…</span></div>}

        {!isDataLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-primary" /><h3 className="font-semibold text-card-foreground">Team Members ({localMembers.length})</h3></div>
                {localMembers.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">No team members yet. Click '+ Add Member' to start building your team.</div>
                ) : (
                  <div className="space-y-2">
                    {localMembers.map((member) => {
                      const isSelected = selectedMemberId === member.id;
                      return (
                        <button key={member.id} onClick={() => setSelectedMemberId(isSelected ? null : member.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all ${isSelected ? 'bg-interactive-hover border-interactive-hover text-white' : 'border-border hover:bg-muted/50 hover:border-muted-foreground/30'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-card-foreground'}`}>{member.name}</p>
                              {member.role && <p className={`text-xs truncate ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>{member.role}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border font-medium ${isSelected ? 'bg-white/20 text-white border-white/30' : experienceBadge(member.experienceLevel)}`}>{normalizeExperience(member.experienceLevel)}</span>
                              {(() => { const sc = member.skills?.length ?? member.skillsCount ?? 0; return sc > 0 ? <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>{sc} skill{sc !== 1 ? 's' : ''}</span> : null; })()}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-2">
              <TeamAnalysisResults analyses={localTeamAnalyses} memberCount={localMembers.length} isRunning={isRunningTeamAnalysis} onRunAnalysis={handleRunTeamAnalysis} isArchived={isArchived} />
            </div>
          </div>
        )}

        {!isDataLoading && <AnalysisHistorySection projectId={projectId} members={localMembers} teamHistoryItems={teamHistoryItems} />}
      </div>

      {selectedMember && <MemberDetailsPanel member={selectedMember} projectId={projectId} onClose={() => setSelectedMemberId(null)} onEditMember={(m) => { setEditingMember(m); setSelectedMemberId(null); }} onDeleteMember={(m) => { setRemovingMember(m); setSelectedMemberId(null); }} onUpdateMember={updateMemberLocally} isArchived={isArchived} />}
      {showAddModal && <TeamMemberModal mode="add" onSave={handleMemberSaved} onClose={() => setShowAddModal(false)} isArchived={isArchived} />}
      {editingMember && <TeamMemberModal mode="edit" member={editingMember} onSave={handleMemberSaved} onClose={() => setEditingMember(null)} isArchived={isArchived} />}
      {removingMember && <RemoveMemberDialog member={removingMember} onConfirm={handleConfirmRemove} onCancel={() => setRemovingMember(null)} isLoading={isRemoving} />}
    </div>
  );
}