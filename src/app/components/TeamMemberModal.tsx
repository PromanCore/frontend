/**
 * TeamMemberModal — handles both Add Member (A) and Edit Member (D) flows.
 * Fixes: correct experience level enum, skill proficiency as dropdown,
 * duplicate skill detection, dirty-tracking for edit mode.
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { TeamMember, Skill, SkillProficiencyLevel } from '../App';

// ─── Constants ────────────────────────────────────────────────────────────────

export const EXPERIENCE_LEVELS = ['Junior', 'Mid', 'Senior', 'Lead'] as const;
export const PROFICIENCY_LEVELS: SkillProficiencyLevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const EXP_NONE = '__none__';
const PROF_NONE = '__none__';

// ─── Skill row working type ───────────────────────────────────────────────────

interface SkillRow {
  id: string; // local unique key
  skillName: string;
  proficiencyLevel: string; // '' = not set
  error?: string;
}

function emptySkillRow(): SkillRow {
  return { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), skillName: '', proficiencyLevel: '' };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function proficiencyToNumeric(level: string): number {
  switch (level) {
    case 'Expert':       return 10;
    case 'Advanced':     return 7;
    case 'Intermediate': return 5;
    case 'Beginner':     return 2;
    default:             return 5;
  }
}

/** Convert Skill[] from project data to SkillRow[] for editing */
function skillsToRows(skills: Skill[]): SkillRow[] {
  if (!skills || skills.length === 0) return [emptySkillRow()];
  return skills.map((s) => ({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    skillName: s.skillName || s.name || '',
    proficiencyLevel: s.proficiencyLevel || '',
  }));
}

/** Convert SkillRow[] back to Skill[] for saving */
function rowsToSkills(rows: SkillRow[]): Skill[] {
  return rows
    .filter((r) => r.skillName.trim())
    .map((r) => ({
      name: r.skillName.trim(),
      skillName: r.skillName.trim(),
      proficiency: proficiencyToNumeric(r.proficiencyLevel),
      proficiencyLevel: r.proficiencyLevel as SkillProficiencyLevel | undefined,
    }));
}

/** True if skill rows differ from original skills */
function skillsChanged(rows: SkillRow[], original: Skill[]): boolean {
  const current = rowsToSkills(rows);
  if (current.length !== original.length) return true;
  return current.some((c, i) => {
    const o = original[i];
    return (
      c.name !== (o.skillName || o.name) ||
      (c.proficiencyLevel || '') !== (o.proficiencyLevel || '')
    );
  });
}

// ─── Proficiency color ────────────────────────────────────────────────────────

export function proficiencyBadge(level: string | undefined) {
  switch (level) {
    case 'Expert':       return 'bg-purple/10 text-purple border-purple/30';
    case 'Advanced':     return 'bg-success/10 text-success border-success/30';
    case 'Intermediate': return 'bg-primary/10 text-primary border-primary/30';
    case 'Beginner':     return 'bg-muted text-muted-foreground border-border';
    default:             return 'bg-muted text-muted-foreground border-border';
  }
}

// ─── Experience Level badge ───────────────────────────────────────────────────

export function experienceBadge(level: string | undefined) {
  const norm = normalizeExperience(level);
  switch (norm) {
    case 'Lead':   return 'bg-purple/10 text-purple border-purple/30';
    case 'Senior': return 'bg-success/10 text-success border-success/30';
    case 'Mid':    return 'bg-primary/10 text-primary border-primary/30';
    case 'Junior': return 'bg-muted text-muted-foreground border-border';
    default:       return 'bg-muted text-muted-foreground border-border';
  }
}

/** Normalize old lowercase values to new Title-case enum */
export function normalizeExperience(level: string | undefined): string {
  if (!level) return '';
  const map: Record<string, string> = {
    junior: 'Junior',
    intermediate: 'Mid',
    senior: 'Senior',
    expert: 'Lead',
    Junior: 'Junior',
    Mid: 'Mid',
    Senior: 'Senior',
    Lead: 'Lead',
  };
  return map[level] || level;
}

// ─── Props ────────────────────────────────────────────────────────────────────

type TeamMemberModalProps = {
  mode: 'add' | 'edit';
  isArchived?: boolean;
  member?: TeamMember;
  projectId?: string;   // optional — API call handled by parent
  onClose: () => void;
  onSave: (member: TeamMember) => void; // renamed from onSuccess; parent handles API + toast
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TeamMemberModal({
  mode,
  isArchived,
  member,
  projectId: _projectId,
  onClose,
  onSave,
}: TeamMemberModalProps) {
  // ── Form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState(member?.name || '');
  const [role, setRole] = useState(member?.role || '');
  const [experienceLevel, setExperienceLevel] = useState(
    member?.experienceLevel ? normalizeExperience(member.experienceLevel) : ''
  );
  const [skillRows, setSkillRows] = useState<SkillRow[]>(() =>
    mode === 'edit' && member ? skillsToRows(member.skills) : [emptySkillRow()]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Original values for dirty tracking (edit mode)
  const [originalName] = useState(member?.name || '');
  const [originalRole] = useState(member?.role || '');
  const [originalExp] = useState(
    member?.experienceLevel ? normalizeExperience(member.experienceLevel) : ''
  );
  const [originalSkills] = useState<Skill[]>(member?.skills || []);

  // ── Errors ────────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<{
    name?: string;
    experienceLevel?: string;
    skills?: string;
    duplicates?: boolean;
  }>({});

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);

  // ── Dirty detection ────────────────────────────────────────────────────────
  const isDirty = useCallback((): boolean => {
    if (mode === 'add') return true; // always submit in add mode
    if (name.trim() !== originalName) return true;
    if ((role.trim() || '') !== (originalRole || '')) return true;
    if (experienceLevel !== originalExp) return true;
    if (skillsChanged(skillRows, originalSkills)) return true;
    return false;
  }, [mode, name, role, experienceLevel, skillRows, originalName, originalRole, originalExp, originalSkills]);

  // ── Skill row actions ──────────────────────────────────────────────────────
  function updateSkillRow(id: string, patch: Partial<SkillRow>) {
    setSkillRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch, error: undefined } : r))
    );
    setErrors((e) => ({ ...e, skills: undefined, duplicates: undefined }));
  }

  function addSkillRow() {
    setSkillRows((prev) => [...prev, emptySkillRow()]);
  }

  function removeSkillRow(id: string) {
    setSkillRows((prev) => prev.filter((r) => r.id !== id));
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: typeof errors = {};
    let rowErrors = false;

    const trimName = name.trim();
    if (!trimName) {
      errs.name = 'Member name is required';
    } else if (trimName.length < 2 || trimName.length > 100) {
      errs.name = 'Name must be between 2 and 100 characters';
    }

    // Skills: at least 1 with name
    const filledRows = skillRows.filter((r) => r.skillName.trim());
    if (filledRows.length === 0) {
      errs.skills = 'At least one skill is required';
    }

    // Empty skill names check
    const updatedRows = skillRows.map((r) => {
      if (!r.skillName.trim() && skillRows.filter(x => x.skillName.trim()).length > 0) {
        rowErrors = true;
        return { ...r, error: 'Skill name is required' };
      }
      return r;
    });

    // Duplicate detection (case-insensitive)
    const names = filledRows.map((r) => r.skillName.trim().toLowerCase());
    const hasDupes = names.some((n, i) => names.indexOf(n) !== i);
    if (hasDupes) {
      errs.duplicates = true;
      errs.skills = 'Duplicate skill names are not allowed for the same member';
      const seen = new Set<string>();
      const dupeRows = updatedRows.map((r) => {
        const lower = r.skillName.trim().toLowerCase();
        if (lower && seen.has(lower)) {
          rowErrors = true;
          return { ...r, error: 'Duplicate skill name' };
        }
        if (lower) seen.add(lower);
        return r;
      });
      setSkillRows(dupeRows);
    } else if (rowErrors) {
      setSkillRows(updatedRows);
    }

    setErrors(errs);
    return Object.keys(errs).length === 0 && !rowErrors;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const skills = rowsToSkills(skillRows);
      const now = new Date().toISOString();

      if (mode === 'add') {
        const newMember: TeamMember = {
          id: `pending-${Date.now()}`,   // placeholder; real ID assigned by API in parent
          memberId: undefined,
          name: name.trim(),
          role: role.trim() || '',
          experienceLevel: (experienceLevel || 'Junior') as TeamMember['experienceLevel'],
          skills,
          followUpNotes: [],
          createdAt: now,
          updatedAt: now,
        };
        onSave(newMember);
      } else if (mode === 'edit' && member) {
        const updatedMember: TeamMember = { ...member, updatedAt: now };
        if (name.trim() !== originalName) updatedMember.name = name.trim();
        if ((role.trim() || '') !== (originalRole || '')) updatedMember.role = role.trim() || '';
        if (experienceLevel !== originalExp) {
          updatedMember.experienceLevel = (experienceLevel || member.experienceLevel) as TeamMember['experienceLevel'];
        }
        if (skillsChanged(skillRows, originalSkills)) {
          updatedMember.skills = skills;
        }
        onSave(updatedMember);
      }
    } catch (err: any) {
      toast.error(err?.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = mode === 'add'
    ? name.trim().length >= 2 && skillRows.some((r) => r.skillName.trim())
    : isDirty() && name.trim().length >= 2 && skillRows.some((r) => r.skillName.trim());

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold text-card-foreground">
            {mode === 'add' ? 'Add Team Member' : 'Edit Team Member'}
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* 1. Name */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
              placeholder="e.g., Sarah Johnson"
              maxLength={100}
              className={`bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.name ? 'border-destructive' : ''}`}
              disabled={isSubmitting}
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* 2. Role */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Role</label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Senior Developer, Project Manager"
              maxLength={100}
              className="bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
              disabled={isSubmitting}
            />
          </div>

          {/* 3. Experience Level */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Experience Level</label>
            <Select
              value={experienceLevel || EXP_NONE}
              onValueChange={(v) => {
                setExperienceLevel(v === EXP_NONE ? '' : v);
                setErrors((p) => ({ ...p, experienceLevel: undefined }));
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger className={`bg-input-background border-input text-foreground focus:border-primary ${errors.experienceLevel ? 'border-destructive' : ''}`}>
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-card-foreground">
                <SelectItem value={EXP_NONE}>
                  <span className="text-muted-foreground">Select experience level</span>
                </SelectItem>
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.experienceLevel && <p className="mt-1 text-xs text-destructive">{errors.experienceLevel}</p>}
          </div>

          {/* 4. Skills */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Skills <span className="text-destructive">*</span>
            </label>

            {errors.skills && (
              <div className="mb-2 px-3 py-2 bg-destructive/8 border border-destructive/25 rounded-lg">
                <p className="text-xs text-destructive">{errors.skills}</p>
              </div>
            )}

            <div className="space-y-2">
              {skillRows.map((row, idx) => (
                <div
                  key={row.id}
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    row.error ? 'border-destructive bg-destructive/5' : 'border-border bg-muted/30'
                  }`}
                >
                  {/* Skill Name */}
                  <Input
                    value={row.skillName}
                    onChange={(e) => updateSkillRow(row.id, { skillName: e.target.value })}
                    placeholder="e.g., JavaScript, Project Planning"
                    maxLength={100}
                    className={`flex-1 bg-input-background border-input text-foreground text-sm placeholder:text-muted-foreground focus:border-primary h-8 ${row.error ? 'border-destructive' : ''}`}
                    disabled={isSubmitting}
                  />

                  {/* Proficiency Dropdown */}
                  <Select
                    value={row.proficiencyLevel || PROF_NONE}
                    onValueChange={(v) => updateSkillRow(row.id, { proficiencyLevel: v === PROF_NONE ? '' : v })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-40 bg-input-background border-input text-foreground text-sm h-8 focus:border-primary">
                      <SelectValue placeholder="Proficiency" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-card-foreground">
                      <SelectItem value={PROF_NONE}>
                        <span className="text-muted-foreground text-sm">Select proficiency</span>
                      </SelectItem>
                      {PROFICIENCY_LEVELS.map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Remove button — hidden if only 1 row */}
                  <button
                    onClick={() => removeSkillRow(row.id)}
                    disabled={skillRows.length === 1 || isSubmitting}
                    className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove skill"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addSkillRow}
              disabled={isSubmitting}
              className="mt-2 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Skill
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-border text-foreground hover:bg-muted"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="bg-primary hover:bg-primary/90 text-white disabled:opacity-50"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{mode === 'add' ? 'Adding…' : 'Saving…'}</>
            ) : (
              mode === 'add' ? 'Add Member' : 'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}