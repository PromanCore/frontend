/**
 * Edit Project Modal — Section D
 * Prefilled with current project data.
 * Only sends changed fields to the API.
 * Cannot be opened for Archived projects (guard in dashboard).
 */

import { useState, useEffect } from 'react';
import { X, Save, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useProjects } from '../contexts/ProjectsContext';
import type { Project } from '../App';

// ─── Constants ────────────────────────────────────────────────────────────────
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
] as const;
const NONE_VALUE = '__none__';

type EditProjectModalProps = {
  project: Project;
  onClose: () => void;
  onUpdated: (updated: Project) => void;
};

interface FormState {
  projectName: string;
  description: string;
  projectType: string;   // '' = not set / null
  customProjectType: string;
  industryDomain: string;
  startDate: string;
  expectedEndDate: string;
  status: string;        // 'Active' | 'Completed' | ''
}

function projectToForm(p: Project): FormState {
  return {
    projectName: p.projectName || p.name || '',
    description: p.description || '',
    projectType: p.projectType || '',
    customProjectType: p.customProjectType || '',
    industryDomain: p.industryDomain || '',
    startDate: p.startDate || '',
    expectedEndDate: p.expectedEndDate || '',
    status: p.status === 'Archived' ? '' : (p.status || 'Active'),
  };
}

export function EditProjectModal({ project, onClose, onUpdated }: EditProjectModalProps) {
  const { updateProjectDetails } = useProjects();

  const [form, setForm] = useState<FormState>(() => projectToForm(project));
  const [original] = useState<FormState>(() => projectToForm(project));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    projectName?: string;
    dates?: string;
    customProjectType?: string;
    industryDomain?: string;
    status?: string;
  }>({});

  // ── Close on Escape ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── Determine changed fields ───────────────────────────────────────────────
  function getChangedPayload(): Record<string, any> | null {
    const payload: Record<string, any> = {};

    if (form.projectName.trim() !== original.projectName) {
      payload.projectName = form.projectName.trim();
    }

    // description: send null to clear
    const descNew = form.description.trim();
    const descOld = original.description.trim();
    if (descNew !== descOld) {
      payload.description = descNew || null;
    }

    // projectType: send null to clear
    const typeNew = form.projectType || null;
    const typeOld = original.projectType || null;
    if (typeNew !== typeOld) {
      payload.projectType = typeNew;
    }

    // customProjectType: send null to clear
    const customTypeNew = form.projectType === 'Other' ? form.customProjectType.trim() || null : null;
    const customTypeOld = original.projectType === 'Other' ? original.customProjectType.trim() || null : null;
    if (customTypeNew !== customTypeOld) {
      payload.customProjectType = customTypeNew;
    }

    // industryDomain: send null to clear
    const domainNew = form.industryDomain.trim() || null;
    const domainOld = original.industryDomain.trim() || null;
    if (domainNew !== domainOld) {
      payload.industryDomain = domainNew;
    }

    // startDate: send null to clear
    const startNew = form.startDate || null;
    const startOld = original.startDate || null;
    if (startNew !== startOld) {
      payload.startDate = startNew;
    }

    // expectedEndDate: send null to clear
    const endNew = form.expectedEndDate || null;
    const endOld = original.expectedEndDate || null;
    if (endNew !== endOld) {
      payload.expectedEndDate = endNew;
    }

    // status (only Active ↔ Completed)
    if (form.status && form.status !== original.status) {
      payload.status = form.status;
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }

  const hasChanges = getChangedPayload() !== null;

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: typeof errors = {};

    const trimName = form.projectName.trim();
    if (!trimName) {
      errs.projectName = 'Project name is required';
    } else if (trimName.length > 200) {
      errs.projectName = 'Project name must not exceed 200 characters';
    }

    if (form.projectType === 'Other') {
      if (!form.customProjectType.trim()) {
        errs.customProjectType = 'Please specify a custom project category';
      } else if (form.customProjectType.trim().length > 50) {
        errs.customProjectType = 'Custom category must not exceed 50 characters';
      }
    }

    if (form.industryDomain.trim().length > 100) {
      errs.industryDomain = 'Industry / Domain must not exceed 100 characters';
    }

    const s = form.startDate;
    const e = form.expectedEndDate;
    if (s && e && s >= e) {
      errs.dates = 'Start date must be before expected end date';
    }

    // status can only go Active ↔ Completed via this form
    if (form.status === 'Archived') {
      errs.status = 'Use the archive endpoint to archive a project';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!validate() || !hasChanges) return;
    const payload = getChangedPayload()!;

    setIsSubmitting(true);
    try {
      const updated = await updateProjectDetails(project.id, payload as any);
      if (!updated) throw new Error('Project not found');

      toast.success('Project updated successfully.');
      onUpdated(updated);
    } catch (err: any) {
      const status = err?.response?.status;
      const message: string = err?.response?.data?.error?.message || err?.message || '';

      if (status === 400) {
        if (message.toLowerCase().includes('archived')) {
          toast.error(message);
          onClose();
        } else if (message.toLowerCase().includes('transition')) {
          setErrors((e) => ({ ...e, status: message }));
        } else {
          toast.error(message || 'Failed to update project.');
        }
      } else if (status === 404 || status === 403) {
        toast.error(message || 'Project not found or access denied.');
      } else {
        toast.error(message || 'Failed to update project. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key === 'projectName' ? 'projectName' : key === 'startDate' || key === 'expectedEndDate' ? 'dates' : key]: undefined }));
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold text-card-foreground">Edit Project Details</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Project Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={form.projectName}
              onChange={(e) => setField('projectName', e.target.value)}
              maxLength={200}
              className={`bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.projectName ? 'border-destructive' : ''}`}
              disabled={isSubmitting}
            />
            {errors.projectName && <p className="mt-1 text-xs text-destructive">{errors.projectName}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Project Description
            </label>
            <Textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              rows={3}
              maxLength={2000}
              className="bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary resize-none"
              placeholder="Project description (optional)"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">{form.description.length}/2000</p>
          </div>

          {/* Project Type */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Project Type
            </label>
            <Select
              value={form.projectType || NONE_VALUE}
              onValueChange={(v) => {
                setField('projectType', v === NONE_VALUE ? '' : v);
                if (v !== 'Other') setField('customProjectType', '');
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger className="bg-input-background border-input text-foreground focus:border-primary">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-card-foreground">
                <SelectItem value={NONE_VALUE}>
                  <span className="text-muted-foreground">None / Clear</span>
                </SelectItem>
                {PROJECT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.projectType === 'Other' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Please Specify Category <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  value={form.customProjectType}
                  onChange={(e) => setField('customProjectType', e.target.value)}
                  maxLength={50}
                  placeholder="e.g., Event Management, Supply Chain"
                  className={`bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.customProjectType ? 'border-destructive' : ''}`}
                  disabled={isSubmitting}
                />
                {errors.customProjectType && <p className="mt-1 text-xs text-destructive">{errors.customProjectType}</p>}
              </div>
            )}
          </div>

          {/* Industry / Domain */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Industry / Domain
            </label>
            <Input
              type="text"
              value={form.industryDomain}
              onChange={(e) => setField('industryDomain', e.target.value)}
              maxLength={100}
              placeholder="e.g., FinTech, Healthcare, E-commerce"
              className={`bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.industryDomain ? 'border-destructive' : ''}`}
              disabled={isSubmitting}
            />
            {errors.industryDomain && <p className="mt-1 text-xs text-destructive">{errors.industryDomain}</p>}
          </div>

          {/* Dates */}
          {errors.dates && (
            <div className="px-3 py-2 bg-destructive/8 border border-destructive/25 rounded-lg">
              <p className="text-xs text-destructive">{errors.dates}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Start Date</span>
              </label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setField('startDate', e.target.value)}
                className={`bg-input-background border-input text-foreground focus:border-primary ${errors.dates ? 'border-destructive' : ''}`}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Expected End Date</span>
              </label>
              <Input
                type="date"
                value={form.expectedEndDate}
                onChange={(e) => setField('expectedEndDate', e.target.value)}
                className={`bg-input-background border-input text-foreground focus:border-primary ${errors.dates ? 'border-destructive' : ''}`}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Project Status — only show for non-Archived projects */}
          {project.status !== 'Archived' && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Project Status
              </label>
              <Select
                value={form.status}
                onValueChange={(v) => setField('status', v)}
                disabled={isSubmitting}
              >
                <SelectTrigger className={`bg-input-background border-input text-foreground focus:border-primary ${errors.status ? 'border-destructive' : ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-card-foreground">
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <p className="mt-1 text-xs text-destructive">{errors.status}</p>}
              <p className="mt-1.5 text-xs text-muted-foreground">
                To archive this project, use the "Archive Project" button on the dashboard.
              </p>
            </div>
          )}
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
            onClick={handleSave}
            disabled={!hasChanges || isSubmitting}
            className="bg-primary hover:bg-primary/90 text-white disabled:opacity-50"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Save Changes</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}