/**
 * Projects API — real and mock implementations for all project-related endpoints.
 *
 * Real implementations call the actual backend via apiClient.
 * Mock implementations use localStorage (mirrors what ProjectsContext does today).
 *
 * Key API contract notes resolved here:
 *   API-12 (GET /api/projects)         — response: { data: Project[], meta: { totalCount, page, pageSize, totalPages } }
 *   API-13 (GET /api/projects/:id)     — response: { data: { project: {...}, teamSummary, moduleStatuses, reportCount } }
 *   API-14 (PUT /api/projects/:id)     — response: { data: Project }  (flat, not nested under "project")
 *   API-15 (POST .../archive)          — response: { data: { message } }
 *   API-16 (POST .../restore)          — response: { data: Project }
 *   API-25 (POST .../analyze)          — IndividualMemberAnalysis uses "timestamp" + "version" (not analysisTimestamp/analysisVersion)
 *   API-26 (POST .../team/analyze)     — CapabilityGap uses "gapName" (not "name")
 *   API-28-31                          — BudgetRange / TimelineDuration / TeamExperienceLevelEnum enums match API values
 *   API-37                             — SuccessPredictionResult.dataSourcesUsed uses { teamData, riskData }
 */

import apiClient from './apiClient';

// ─── Response envelope types ──────────────────────────────────────────────────

/** Standard paginated list response from API-12. */
export interface ProjectListResponse<T> {
  data: T[];
  meta: {
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/** API-13 detail response — project is nested under data.project. */
export interface ProjectDetailResponse {
  project: {
    id: string;
    projectName: string;
    description: string;
    projectType: string | null;
    customProjectType?: string | null;
    industryDomain: string | null;
    startDate: string | null;
    expectedEndDate: string | null;
    status: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
  };
  teamSummary: {
    memberCount: number;
  };
  moduleStatuses: {
    teamOptimization: { status: string; latestAnalysisTimestamp: string | null };
    riskAnalysis:     { status: string; latestAnalysisTimestamp: string | null };
    successPrediction:{ status: string; latestAnalysisTimestamp: string | null };
  };
  reportCount: number;
}

// ─── Query parameters for API-12 ─────────────────────────────────────────────

export interface ListProjectsParams {
  page?: number;
  pageSize?: number;
  status?: 'Active' | 'Completed' | 'Archived';
  search?: string;
}

// ─── Real API implementation ──────────────────────────────────────────────────

const real = {
  /**
   * API-12: GET /api/projects
   * Returns paginated list. Note: response.data.data is the array (envelope pattern).
   */
  async listProjects(params: ListProjectsParams = {}) {
    const res = await apiClient.get('/api/projects', { params });
    return res.data as ProjectListResponse<any>;
  },

  /**
   * API-13: GET /api/projects/:projectId
   * Returns { data: { project: {...}, teamSummary, moduleStatuses, reportCount } }
   * The project is nested one level deeper than the standard envelope.
   */
  async getProject(projectId: string): Promise<ProjectDetailResponse> {
    const res = await apiClient.get(`/api/projects/${projectId}`);
    // Unwrap the envelope: res.data = { data: { project, teamSummary, ... }, meta: {} }
    return res.data.data as ProjectDetailResponse;
  },

  /**
   * API-11: POST /api/projects
   * Returns 201 with { data: Project }.
   */
  async createProject(payload: {
    projectName: string;
    description?: string;
    projectType?: string | null;
    customProjectType?: string | null;
    industryDomain?: string | null;
    startDate?: string | null;
    expectedEndDate?: string | null;
  }) {
    const res = await apiClient.post('/api/projects', payload);
    return res.data.data;
  },

  /**
   * API-14: PUT /api/projects/:projectId
   * Returns 200 with { data: Project } — flat (not nested under "project").
   */
  async updateProject(projectId: string, payload: {
    projectName?: string;
    description?: string | null;
    projectType?: string | null;
    customProjectType?: string | null;
    industryDomain?: string | null;
    startDate?: string | null;
    expectedEndDate?: string | null;
    status?: 'Active' | 'Completed';
  }) {
    const res = await apiClient.put(`/api/projects/${projectId}`, payload);
    return res.data.data;
  },

  /**
   * API-15: POST /api/projects/:projectId/archive
   * Returns 200 with { data: { message } }.
   */
  async archiveProject(projectId: string): Promise<{ message: string }> {
    const res = await apiClient.post(`/api/projects/${projectId}/archive`);
    return res.data.data;
  },

  /**
   * API-16: POST /api/projects/:projectId/restore
   * Returns 200 with { data: Project } (flat).
   */
  async restoreProject(projectId: string) {
    const res = await apiClient.post(`/api/projects/${projectId}/restore`);
    return res.data.data;
  },

  // ── Team (API-17 through API-27) ───────────────────────────────────────────

  async addMember(projectId: string, payload: {
    name: string;
    role?: string;
    experienceLevel?: string;
    skills: Array<{ skillName: string; proficiencyLevel?: string }>;
  }) {
    const res = await apiClient.post(`/api/projects/${projectId}/members`, payload);
    return res.data.data;
  },

  async listMembers(projectId: string) {
    const res = await apiClient.get(`/api/projects/${projectId}/members`);
    return res.data as { data: any[]; meta: { totalCount: number } };
  },

  async getMember(projectId: string, memberId: string) {
    const res = await apiClient.get(`/api/projects/${projectId}/members/${memberId}`);
    return res.data.data;
  },

  async updateMember(projectId: string, memberId: string, payload: {
    name?: string;
    role?: string | null;
    experienceLevel?: string | null;
    skills?: Array<{ skillName: string; proficiencyLevel?: string }>;
  }) {
    const res = await apiClient.put(`/api/projects/${projectId}/members/${memberId}`, payload);
    return res.data.data;
  },

  async removeMember(projectId: string, memberId: string): Promise<{ message: string }> {
    const res = await apiClient.delete(`/api/projects/${projectId}/members/${memberId}`);
    return res.data.data;
  },

  /**
   * API-22: POST .../notes
   * Returns 201 { data: { id, title, content, createdAt } }
   * Note: API uses "id" field (not "noteId").
   */
  async addNote(projectId: string, memberId: string, payload: { title?: string; content: string }) {
    const res = await apiClient.post(`/api/projects/${projectId}/members/${memberId}/notes`, payload);
    return res.data.data;
  },

  async listNotes(projectId: string, memberId: string) {
    const res = await apiClient.get(`/api/projects/${projectId}/members/${memberId}/notes`);
    return res.data as { data: any[]; meta: { totalCount: number } };
  },

  async deleteNote(projectId: string, memberId: string, noteId: string): Promise<{ message: string }> {
    const res = await apiClient.delete(`/api/projects/${projectId}/members/${memberId}/notes/${noteId}`);
    return res.data.data;
  },

  /**
   * GET .../members/:memberId/analysis/analyses
   * Returns all persisted individual analysis versions for that member (metadata only: analysisId, version).
   * Results are ordered by version descending.
   */
  async listMemberAnalyses(projectId: string, memberId: string) {
    const res = await apiClient.get(`/api/projects/${projectId}/members/${memberId}/analysis/analyses`);
    return res.data as { data: any[]; meta: { totalCount: number } };
  },

  /**
   * API-25: POST .../analyze
   * Returns IndividualMemberAnalysis with "timestamp" and "version" (not analysisTimestamp/analysisVersion).
   */
  async analyzeIndividualMember(projectId: string, memberId: string) {
    const res = await apiClient.post(`/api/projects/${projectId}/members/${memberId}/analyze`);
    return res.data.data;
  },

  /**
   * API-26: POST .../team/analyze
   * Returns team analysis with capabilityGaps[].gapName (not .name).
   */
  async analyzeTeam(projectId: string) {
    const res = await apiClient.post(`/api/projects/${projectId}/team/analyze`);
    return res.data.data;
  },

  /**
   * API-27: GET .../team/analyses
   * Returns a lightweight list (metadata only: analysisId, timestamp, version, analysisType).
   * Full analysis data must be fetched individually via getTeamAnalysis().
   */
  async listTeamAnalyses(projectId: string, params?: { analysisType?: 'Individual' | 'Team'; memberId?: string }) {
    const res = await apiClient.get(`/api/projects/${projectId}/team/analyses`, { params });
    return res.data as { data: any[]; meta: { totalCount: number } };
  },

  /**
   * API-27 (Extension): GET .../team/analyses/:analysisId
   * Returns the full team analysis result.
   * Still valid for explicit history-item navigation; prefer getTeamResults() for the
   * latest result on page mount.
   */
  async getTeamAnalysis(projectId: string, analysisId: string) {
    const res = await apiClient.get(`/api/projects/${projectId}/team/analyses/${analysisId}`);
    return res.data.data;
  },

  /**
   * NEW: GET .../team/results[?analysisId=<uuid>]
   * Without analysisId → latest completed team analysis (persistent restore endpoint).
   * With analysisId    → that specific completed team analysis.
   * 404 means no saved analysis yet — must be treated as null, not as an app error.
   */
  async getTeamResults(projectId: string, analysisId?: string) {
    const res = await apiClient.get(`/api/projects/${projectId}/team/results`, {
      params: analysisId ? { analysisId } : {},
    });
    return res.data.data;
  },

  /**
   * NEW: GET .../members/:memberId/analysis/results[?analysisId=<uuid>]
   * Without analysisId → latest completed individual analysis for that member.
   * With analysisId    → that specific completed individual analysis.
   * 404 means no saved analysis yet — must be treated as null, not as an app error.
   */
  async getMemberAnalysisResults(projectId: string, memberId: string, analysisId?: string) {
    const res = await apiClient.get(
      `/api/projects/${projectId}/members/${memberId}/analysis/results`,
      { params: analysisId ? { analysisId } : {} },
    );
    return res.data.data;
  },

  // ── Risk Analysis (API-28 through API-33) ─────────────────────────────────

  /**
   * API-28: POST .../risk/data
   * Enum values must match: Under50K, Over1M, Under1Month, 1-3Months, MostlyJunior, VeryHigh, etc.
   */
  async enterRiskData(projectId: string, payload: object) {
    const res = await apiClient.post(`/api/projects/${projectId}/risk/data`, payload);
    return res.data;
  },

  async updateRiskData(projectId: string, payload: object) {
    const res = await apiClient.put(`/api/projects/${projectId}/risk/data`, payload);
    return res.data.data;
  },

  async getRiskData(projectId: string) {
    const res = await apiClient.get(`/api/projects/${projectId}/risk/data`);
    return res.data as { data: any | null; meta: { readyForAnalysis: boolean } };
  },

  /**
   * API-31: POST .../risk/analyze
   * Returns RiskAnalysisResult with identifiedRisks, overallRiskHealthScore, etc.
   */
  async runRiskAnalysis(projectId: string) {
    const res = await apiClient.post(`/api/projects/${projectId}/risk/analyze`);
    return res.data.data;
  },

  async getRiskResults(projectId: string, analysisId?: string) {
    const res = await apiClient.get(`/api/projects/${projectId}/risk/results`, {
      params: analysisId ? { analysisId } : {},
    });
    return res.data.data;
  },

  async listRiskAnalyses(projectId: string) {
    const res = await apiClient.get(`/api/projects/${projectId}/risk/analyses`);
    return res.data as { data: any[]; meta: { totalCount: number } };
  },

  // ── Success Prediction (API-34 through API-39) ────────────────────────────

  /**
   * API-34: POST .../success/data
   * Enum values must match: VeryHigh (not 'Very High'), NoHistory (not 'No History').
   */
  async enterSuccessData(projectId: string, payload: object) {
    const res = await apiClient.post(`/api/projects/${projectId}/success/data`, payload);
    return res.data;
  },

  async updateSuccessData(projectId: string, payload: object) {
    const res = await apiClient.put(`/api/projects/${projectId}/success/data`, payload);
    return res.data.data;
  },

  async getSuccessData(projectId: string) {
    const res = await apiClient.get(`/api/projects/${projectId}/success/data`);
    return res.data as {
      data: any | null;
      meta: { readyForPrediction: boolean; teamDataAvailable: boolean; riskAnalysisAvailable: boolean };
    };
  },

  /**
   * API-37: POST .../success/predict
   * Returns SuccessPredictionResult with dataSourcesUsed: { teamData, riskData } (not teamDataAvailable/riskAnalysisAvailable).
   */
  async runSuccessPrediction(projectId: string) {
    const res = await apiClient.post(`/api/projects/${projectId}/success/predict`);
    return res.data.data;
  },

  async getSuccessResults(projectId: string, predictionId?: string) {
    const res = await apiClient.get(`/api/projects/${projectId}/success/results`, {
      params: predictionId ? { predictionId } : {},
    });
    return res.data.data;
  },

  async listSuccessPredictions(projectId: string) {
    const res = await apiClient.get(`/api/projects/${projectId}/success/predictions`);
    return res.data as { data: any[]; meta: { totalCount: number } };
  },

  // ── Reporting (API-40 through API-44) ─────────────────────────────────────

  /**
   * API-40: POST .../reports
   * reportType must be one of: 'Individual Member' | 'Team Optimization' | 'Risk Analysis' | 'Success Prediction' | 'Full Project Summary'
   */
  async generateReport(projectId: string, payload: { reportType: string; memberId?: string }) {
    const res = await apiClient.post(`/api/projects/${projectId}/reports`, payload);
    return res.data.data;
  },

  async getReport(projectId: string, reportId: string) {
    const res = await apiClient.get(`/api/projects/${projectId}/reports/${reportId}`);
    return res.data.data;
  },

  /**
   * API-42: GET .../reports/:reportId/export/pdf
   * Returns a binary PDF blob. See API contract for frontend download pattern.
   */
  async exportReportPdf(projectId: string, reportId: string): Promise<Blob> {
    const res = await apiClient.get(`/api/projects/${projectId}/reports/${reportId}/export/pdf`, {
      responseType: 'blob',
    });
    return res.data;
  },

  async listReports(projectId: string, params?: { reportType?: string; page?: number; pageSize?: number }) {
    const res = await apiClient.get(`/api/projects/${projectId}/reports`, { params });
    return res.data as ProjectListResponse<any>;
  },

  async deleteReport(projectId: string, reportId: string): Promise<{ message: string }> {
    const res = await apiClient.delete(`/api/projects/${projectId}/reports/${reportId}`);
    return res.data.data;
  },

  // ── Dashboard (API-45) ────────────────────────────────────────────────────

  async getDashboard(projectId: string) {
    const res = await apiClient.get(`/api/projects/${projectId}/dashboard`);
    return res.data.data;
  },
};

// Toggle: set USE_MOCK = false and configure VITE_API_BASE_URL to use real backend
// REMOVED: mock mode — all calls now go to the real backend via apiClient

export const projectsApi = real;

export default real;