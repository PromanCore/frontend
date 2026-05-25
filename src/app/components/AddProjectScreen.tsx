/**
 * Add New Project page — /projects/new
 * A. Fixes per spec:
 *   - Industry/Domain → free-text input (max 100 chars)
 *   - Added Start Date + Expected End Date (side by side)
 *   - Project Type: business-oriented categories (Sales, Development, Marketing, etc.)
 *   - POST /api/projects (mocked via ProjectsContext)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Brain, FolderPlus, Sparkles, Loader2, Calendar } from 'lucide-react';
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

// ─── Project Type options (business-oriented categories per API contract) ─────
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

// ─── Props ────────────────────────────────────────────────────────────────────
type AddProjectScreenProps = {
  onBack: () => void;
  hasProjects?: boolean;
  // Legacy compat — ignored (screen manages navigation internally)
  onCreateProject?: (...args: any[]) => void;
};

// ─── Validation helpers ───────────────────────────────────────────────────────
function validateDates(start: string, end: string): string | null {
  if (!start || !end) return null;
  if (start >= end) return 'Start date must be before expected end date';
  return null;
}

export function AddProjectScreen({ onBack, hasProjects }: AddProjectScreenProps) {
  const navigate = useNavigate();
  const { createProject, projects } = useProjects();
  const actualHasProjects = hasProjects ?? projects.length > 0;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState('');
  const [customProjectType, setCustomProjectType] = useState('');
  const [industryDomain, setIndustryDomain] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Error state ────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<{
    projectName?: string;
    projectType?: string;
    customProjectType?: string;
    dates?: string;
    industryDomain?: string;
  }>({});

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: typeof errors = {};

    if (!projectName.trim()) {
      errs.projectName = 'Project name is required';
    } else if (projectName.trim().length > 200) {
      errs.projectName = 'Project name must not exceed 200 characters';
    }

    if (industryDomain.trim().length > 100) {
      errs.industryDomain = 'Industry / Domain must not exceed 100 characters';
    }

    if (projectType === 'Other') {
      if (!customProjectType.trim()) {
        errs.customProjectType = 'Please specify a custom project category';
      } else if (customProjectType.trim().length > 50) {
        errs.customProjectType = 'Custom category must not exceed 50 characters';
      }
    }

    const dateErr = validateDates(startDate, expectedEndDate);
    if (dateErr) errs.dates = dateErr;

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ──────────────────────────��──────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Build payload — omit empty optional fields
      const payload: Parameters<typeof createProject>[0] = {
        projectName: projectName.trim(),
      };
      if (description.trim()) payload.description = description.trim();
      if (projectType) {
        payload.projectType = projectType;
        if (projectType === 'Other') {
          payload.customProjectType = customProjectType.trim();
        }
      }
      if (industryDomain.trim()) payload.industryDomain = industryDomain.trim();
      if (startDate) payload.startDate = startDate;
      if (expectedEndDate) payload.expectedEndDate = expectedEndDate;

      const newProject = await createProject(payload);
      toast.success('Project created successfully.');
      navigate(`/projects/${newProject.id}`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to create project. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────��───────────────

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {actualHasProjects && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="text-muted-foreground hover:text-white hover:bg-card"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Projects
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl text-foreground font-semibold">ProMan</h1>
              <p className="text-sm text-muted-foreground">Project Management Intelligence</p>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <div className="flex items-start gap-4 mb-8">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <FolderPlus className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl text-card-foreground mb-2 font-semibold">Create New Project</h2>
              <p className="text-sm text-muted-foreground">
                Enter your project details to begin AI-powered intelligence analysis
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Project Name */}
            <div>
              <label htmlFor="projectName" className="block text-sm text-muted-foreground mb-2 font-medium">
                Project Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="projectName"
                type="text"
                placeholder="e.g., Digital Transformation Initiative"
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value);
                  setErrors((prev) => ({ ...prev, projectName: undefined }));
                }}
                maxLength={200}
                className={`bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 ${
                  errors.projectName ? 'border-destructive' : ''
                }`}
                disabled={isSubmitting}
              />
              {errors.projectName && (
                <p className="mt-1.5 text-xs text-destructive">{errors.projectName}</p>
              )}
            </div>

            {/* 2. Project Description */}
            <div>
              <label htmlFor="description" className="block text-sm text-muted-foreground mb-2 font-medium">
                Project Description
              </label>
              <Textarea
                id="description"
                placeholder="Describe the project goals, scope, and expected outcomes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={2000}
                className="bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 resize-none"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-muted-foreground text-right">{description.length}/2000</p>
            </div>

            {/* 3. Project Type */}
            <div>
              <label htmlFor="projectType" className="block text-sm text-muted-foreground mb-2 font-medium">
                Project Type
              </label>
              <Select
                value={projectType}
                onValueChange={(v) => {
                  setProjectType(v === '__none__' ? '' : v);
                  if (v !== 'Other') setCustomProjectType('');
                  setErrors((prev) => ({ ...prev, projectType: undefined }));
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  className={`bg-input-background border-input text-foreground focus:border-primary focus:ring-primary/20 ${
                    errors.projectType ? 'border-destructive' : ''
                  }`}
                >
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-card-foreground">
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.projectType && (
                <p className="mt-1.5 text-xs text-destructive">{errors.projectType}</p>
              )}

              {/* Custom Project Type (shows only if 'Other' is selected) */}
              {projectType === 'Other' && (
                <div className="mt-4">
                  <label htmlFor="customProjectType" className="block text-sm text-muted-foreground mb-2 font-medium">
                    Please Specify Category <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="customProjectType"
                    type="text"
                    placeholder="e.g., Event Management, Supply Chain"
                    value={customProjectType}
                    onChange={(e) => {
                      setCustomProjectType(e.target.value);
                      setErrors((prev) => ({ ...prev, customProjectType: undefined }));
                    }}
                    maxLength={50}
                    className={`bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 ${
                      errors.customProjectType ? 'border-destructive' : ''
                    }`}
                    disabled={isSubmitting}
                  />
                  {errors.customProjectType && (
                    <p className="mt-1.5 text-xs text-destructive">{errors.customProjectType}</p>
                  )}
                </div>
              )}
            </div>

            {/* 4. Industry / Domain (free text — NOT a dropdown) */}
            <div>
              <label htmlFor="industryDomain" className="block text-sm text-muted-foreground mb-2 font-medium">
                Industry / Domain
              </label>
              <Input
                id="industryDomain"
                type="text"
                placeholder="e.g., FinTech, Healthcare, E-commerce, Education"
                value={industryDomain}
                onChange={(e) => {
                  setIndustryDomain(e.target.value);
                  setErrors((prev) => ({ ...prev, industryDomain: undefined }));
                }}
                maxLength={100}
                className={`bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 ${
                  errors.industryDomain ? 'border-destructive' : ''
                }`}
                disabled={isSubmitting}
              />
              {errors.industryDomain && (
                <p className="mt-1.5 text-xs text-destructive">{errors.industryDomain}</p>
              )}
            </div>

            {/* 5 & 6. Start Date + Expected End Date — side by side */}
            <div>
              {errors.dates && (
                <div className="mb-3 px-3 py-2 bg-destructive/8 border border-destructive/25 rounded-lg">
                  <p className="text-xs text-destructive">{errors.dates}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <label htmlFor="startDate" className="block text-sm text-muted-foreground mb-2 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Start Date
                    </span>
                  </label>
                  <Input
                    id="startDate"
                    type="date"
                    placeholder="Select start date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setErrors((prev) => ({ ...prev, dates: undefined }));
                    }}
                    className={`bg-input-background border-input text-foreground focus:border-primary focus:ring-primary/20 ${
                      errors.dates ? 'border-destructive' : ''
                    }`}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Expected End Date */}
                <div>
                  <label htmlFor="expectedEndDate" className="block text-sm text-muted-foreground mb-2 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Expected End Date
                    </span>
                  </label>
                  <Input
                    id="expectedEndDate"
                    type="date"
                    placeholder="Select expected end date"
                    value={expectedEndDate}
                    onChange={(e) => {
                      setExpectedEndDate(e.target.value);
                      setErrors((prev) => ({ ...prev, dates: undefined }));
                    }}
                    className={`bg-input-background border-input text-foreground focus:border-primary focus:ring-primary/20 ${
                      errors.dates ? 'border-destructive' : ''
                    }`}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* AI Info Box */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-secondary mb-1 font-medium">AI-Powered Intelligence</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Once created, you'll be able to add team members, analyze risks, and forecast success probability. All data is shared across modules for comprehensive insights.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || !projectName.trim()}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white shadow-lg transition-all hover:shadow-xl disabled:opacity-60"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Project…
                </>
              ) : (
                <>
                  <FolderPlus className="w-5 h-5 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}