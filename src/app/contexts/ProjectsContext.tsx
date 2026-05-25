/**
 * ProjectsContext — API-driven project state.
 *
 * Source of truth: backend API (not localStorage).
 * - Fetches the project list from GET /api/projects on authentication.
 * - All write operations call the real API endpoints and update local cache.
 * - updateProject() is a LOCAL-ONLY cache update used by submodule screens
 *   to sync module status fields after performing analysis operations.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useAuth } from './AuthContext';
import projectsApi from '../lib/projectsApi';
import type {
  Project,
  AnalysisStatus,
  ProjectStatus,
} from '../App';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateProjectPayload {
  projectName: string;
  description?: string;
  projectType?: string | null;
  customProjectType?: string | null;
  industryDomain?: string | null;
  startDate?: string | null;
  expectedEndDate?: string | null;
}

export interface UpdateProjectPayload {
  projectName?: string;
  description?: string | null;
  projectType?: string | null;
  customProjectType?: string | null;
  industryDomain?: string | null;
  startDate?: string | null;
  expectedEndDate?: string | null;
  status?: 'Active' | 'Completed';
}

interface ProjectsContextType {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  getProjectById: (id: string) => Project | undefined;
  refreshProjects: () => Promise<void>;
  createProject: (data: CreateProjectPayload) => Promise<Project>;
  /** Local cache update — submodule screens call this after API operations to sync module statuses. */
  updateProject: (project: Project) => void;
  updateProjectDetails: (id: string, payload: UpdateProjectPayload) => Promise<Project | null>;
  archiveProject: (id: string) => Promise<Project | null>;
  restoreProject: (id: string) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ProjectsContext = createContext<ProjectsContextType | null>(null);

// ─── Map API-12 list item to Project type ─────────────────────────────────────
function mapListItemToProject(item: any): Project {
  const projectName: string = item.projectName || item.name || '';
  const projectType: string | null = item.projectType ?? null;
  const industryDomain: string | null = item.industryDomain ?? null;
  const now = new Date().toISOString();

  return {
    id: item.id,
    // API-aligned
    projectName,
    status: (item.status as ProjectStatus) || 'Active',
    projectType,
    customProjectType: item.customProjectType ?? null,
    industryDomain,
    startDate: item.startDate ?? null,
    expectedEndDate: item.expectedEndDate ?? null,
    description: item.description || '',
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now,
    // Backward-compat aliases
    name: projectName,
    type: projectType || '',
    industry: industryDomain || '',
    // Analysis metadata defaults (populated by submodule screens via onUpdateProject)
    teamReadiness: 0,
    riskLevel: 'medium',
    successProbability: 0,
    teamMembers: [],
    teamAnalysisStatus: (item.teamAnalysisStatus as AnalysisStatus) || 'not_started',
    riskAnalysisStatus: (item.riskAnalysisStatus as AnalysisStatus) || 'not_started',
    successPredictionStatus: (item.successPredictionStatus as AnalysisStatus) || 'not_started',
    riskAnalysisHistory: [],
    successForecastHistory: [],
    teamAnalysisHistory: [],
  };
}

// ─── Map API-13 detail response to Project ─────────────────────────────────────
function mapDetailToProject(detail: any, existing?: Project): Project {
  const base = existing || mapListItemToProject(detail.project || {});
  const p = detail.project || {};
  const statuses = detail.moduleStatuses || {};

  return {
    ...base,
    projectName: p.projectName || base.projectName,
    name: p.projectName || base.name,
    status: (p.status as ProjectStatus) || base.status,
    projectType: p.projectType ?? base.projectType,
    customProjectType: p.customProjectType ?? base.customProjectType,
    type: p.projectType || base.type,
    industryDomain: p.industryDomain ?? base.industryDomain,
    industry: p.industryDomain || base.industry,
    description: p.description ?? base.description,
    startDate: p.startDate ?? base.startDate,
    expectedEndDate: p.expectedEndDate ?? base.expectedEndDate,
    createdAt: p.createdAt || base.createdAt,
    updatedAt: p.updatedAt || base.updatedAt,
    // Module statuses from API-13
    teamAnalysisStatus: (statuses.teamOptimization?.status as AnalysisStatus) || base.teamAnalysisStatus,
    riskAnalysisStatus: (statuses.riskAnalysis?.status as AnalysisStatus) || base.riskAnalysisStatus,
    successPredictionStatus: (statuses.successPrediction?.status as AnalysisStatus) || base.successPredictionStatus,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch project list from API ─────────────────────────────────────────────
  const refreshProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch up to 100 projects per page (default; pagination can be added later)
      const res = await projectsApi.listProjects({ pageSize: 100 });
      const items: any[] = res.data || [];
      setProjects(items.map(mapListItemToProject));
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to load projects.';
      setError(msg);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Load when authenticated ─────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      refreshProjects();
    } else {
      setProjects([]);
      setIsLoading(false);
      setError(null);
    }
  }, [isAuthenticated, authLoading, refreshProjects]);

  // ── Selectors ──────────────────────────────────────────────────────────────
  const getProjectById = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  );

  // ── Create ────────────────────────────────────────────────────────────────
  const createProject = useCallback(async (data: CreateProjectPayload): Promise<Project> => {
    const result = await projectsApi.createProject({
      projectName: data.projectName.trim(),
      ...(data.description?.trim() ? { description: data.description.trim() } : {}),
      projectType: data.projectType || null,
      customProjectType: data.customProjectType || null,
      industryDomain: data.industryDomain || null,
      startDate: data.startDate || null,
      expectedEndDate: data.expectedEndDate || null,
    });
    const newProject = mapListItemToProject(result);
    setProjects((prev) => [...prev, newProject]);
    return newProject;
  }, []);

  // ── Local cache update (called by submodule screens after API operations) ──
  const updateProject = useCallback((updated: Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );
  }, []);

  // ── Update project details via PUT /api/projects/:id ──────────────────────
  const updateProjectDetails = useCallback(
    async (id: string, payload: UpdateProjectPayload): Promise<Project | null> => {
      try {
        const apiPayload: Record<string, any> = {};
        if (payload.projectName !== undefined) apiPayload.projectName = payload.projectName.trim();
        if ('description' in payload) apiPayload.description = payload.description ?? null;
        if ('projectType' in payload) apiPayload.projectType = payload.projectType ?? null;
        if ('customProjectType' in payload) apiPayload.customProjectType = payload.customProjectType ?? null;
        if ('industryDomain' in payload) apiPayload.industryDomain = payload.industryDomain ?? null;
        if ('startDate' in payload) apiPayload.startDate = payload.startDate ?? null;
        if ('expectedEndDate' in payload) apiPayload.expectedEndDate = payload.expectedEndDate ?? null;
        if (payload.status !== undefined) apiPayload.status = payload.status;

        const result = await projectsApi.updateProject(id, apiPayload);
        const updated = mapListItemToProject(result);
        setProjects((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
        );
        return updated;
      } catch {
        return null;
      }
    },
    []
  );

  // ── Archive ───────────────────────────────────────────────────────────────
  const archiveProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      await projectsApi.archiveProject(id);
      let archived: Project | null = null;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          archived = { ...p, status: 'Archived', updatedAt: new Date().toISOString() };
          return archived;
        })
      );
      return archived;
    } catch {
      return null;
    }
  }, []);

  // ── Restore ───────────────────────────────────────────────────────────────
  const restoreProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      const result = await projectsApi.restoreProject(id);
      const restored = mapListItemToProject(result);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...restored } : p))
      );
      return restored;
    } catch {
      return null;
    }
  }, []);

  // ── Delete (local cache only — no dedicated delete endpoint in spec) ───────
  const deleteProject = useCallback(async (id: string): Promise<void> => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        isLoading,
        error,
        getProjectById,
        refreshProjects,
        createProject,
        updateProject,
        updateProjectDetails,
        archiveProject,
        restoreProject,
        deleteProject,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useProjects(): ProjectsContextType {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used within a ProjectsProvider');
  return ctx;
}
