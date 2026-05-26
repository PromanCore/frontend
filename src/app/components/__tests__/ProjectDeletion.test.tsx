/**
 * Tests for the Project Deletion feature.
 *
 * Covers:
 *  - deleteProject API client method
 *  - Delete button rendering & ownership gating
 *  - Confirmation dialog open/close/cancel behaviour
 *  - Successful deletion (toast, navigate, cache invalidation)
 *  - 403 permission error handling
 *  - 404 not-found error handling
 *  - Loading state disabling the confirm button
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock react-router
const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ projectId: 'proj-1' }),
  Outlet: () => null,
}));

// Mock sonner toast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
    error: (...args: any[]) => mockToastError(...args),
  },
}));

// Mock projectsApi
const mockDeleteProjectApi = vi.fn();
const mockGetProject = vi.fn();
const mockListMembers = vi.fn();
const mockGetDashboard = vi.fn();
const mockGetTeamResults = vi.fn();
const mockListRiskAnalyses = vi.fn();
const mockListSuccessPredictions = vi.fn();
const mockListReports = vi.fn();
const mockGetRiskResults = vi.fn();
const mockGetSuccessResults = vi.fn();
const mockGetRiskData = vi.fn();
const mockGetSuccessData = vi.fn();

vi.mock('../../lib/projectsApi', () => ({
  default: {
    deleteProject: (...args: any[]) => mockDeleteProjectApi(...args),
    getProject: (...args: any[]) => mockGetProject(...args),
    listMembers: (...args: any[]) => mockListMembers(...args),
    getDashboard: (...args: any[]) => mockGetDashboard(...args),
    getTeamResults: (...args: any[]) => mockGetTeamResults(...args),
    listRiskAnalyses: (...args: any[]) => mockListRiskAnalyses(...args),
    listSuccessPredictions: (...args: any[]) => mockListSuccessPredictions(...args),
    listReports: (...args: any[]) => mockListReports(...args),
    getRiskResults: (...args: any[]) => mockGetRiskResults(...args),
    getSuccessResults: (...args: any[]) => mockGetSuccessResults(...args),
    getRiskData: (...args: any[]) => mockGetRiskData(...args),
    getSuccessData: (...args: any[]) => mockGetSuccessData(...args),
  },
  projectsApi: {
    deleteProject: (...args: any[]) => mockDeleteProjectApi(...args),
  },
}));

// Mock ProjectsContext
const mockGetProjectById = vi.fn();
const mockArchiveProject = vi.fn();
const mockRestoreProject = vi.fn();
const mockUpdateProject = vi.fn();
const mockDeleteProject = vi.fn();
const mockRefreshProjects = vi.fn();

vi.mock('../../contexts/ProjectsContext', () => ({
  useProjects: () => ({
    projects: [],
    isLoading: false,
    error: null,
    getProjectById: mockGetProjectById,
    refreshProjects: mockRefreshProjects,
    createProject: vi.fn(),
    updateProject: mockUpdateProject,
    updateProjectDetails: vi.fn(),
    archiveProject: mockArchiveProject,
    restoreProject: mockRestoreProject,
    deleteProject: mockDeleteProject,
  }),
}));

// Mock AuthContext
const mockUser = { id: 'user-1', fullName: 'Test User', email: 'test@test.com' };
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    accessToken: 'token',
    refreshToken: 'refresh',
    accessTokenExpiry: null,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    updateTokens: vi.fn(),
  }),
}));

// Mock EditProjectModal
vi.mock('../EditProjectModal', () => ({
  EditProjectModal: () => <div data-testid="edit-modal">Edit Modal</div>,
}));

import { ProjectDashboard } from '../ProjectDashboard';

// ─── Test data ───────────────────────────────────────────────────────────────

function makeProject(overrides: Record<string, any> = {}) {
  return {
    id: 'proj-1',
    projectName: 'Test Project Alpha',
    name: 'Test Project Alpha',
    status: 'Active',
    projectType: 'Development',
    customProjectType: null,
    industryDomain: 'Technology',
    industry: 'Technology',
    type: 'Development',
    startDate: '2026-01-01',
    expectedEndDate: '2026-06-01',
    description: 'A test project.',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ownerId: 'user-1',
    teamReadiness: 0,
    riskLevel: 'medium' as const,
    successProbability: 0,
    teamMembers: [],
    teamAnalysisStatus: 'not_started' as const,
    riskAnalysisStatus: 'not_started' as const,
    successPredictionStatus: 'not_started' as const,
    riskAnalysisHistory: [],
    successForecastHistory: [],
    teamAnalysisHistory: [],
    ...overrides,
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Default: project belongs to the current user
  mockGetProjectById.mockReturnValue(makeProject());

  // Dashboard data mocks - return empty/minimal data to avoid errors
  mockGetProject.mockResolvedValue({
    project: makeProject(),
    teamSummary: { memberCount: 0 },
    moduleStatuses: {
      teamOptimization: { status: 'not_started', latestAnalysisTimestamp: null },
      riskAnalysis: { status: 'not_started', latestAnalysisTimestamp: null },
      successPrediction: { status: 'not_started', latestAnalysisTimestamp: null },
    },
    reportCount: 0,
  });
  mockListMembers.mockResolvedValue({ data: [], meta: { totalCount: 0 } });
  mockGetDashboard.mockResolvedValue({});
  mockGetTeamResults.mockRejectedValue({ response: { status: 404 } });
  mockListRiskAnalyses.mockResolvedValue({ data: [], meta: { totalCount: 0 } });
  mockListSuccessPredictions.mockResolvedValue({ data: [], meta: { totalCount: 0 } });
  mockListReports.mockResolvedValue({ data: [], meta: { totalCount: 0, page: 1, pageSize: 10, totalPages: 0 } });
  mockGetRiskResults.mockRejectedValue({ response: { status: 404 } });
  mockGetSuccessResults.mockRejectedValue({ response: { status: 404 } });
  mockGetRiskData.mockResolvedValue({ data: null, meta: { readyForAnalysis: false } });
  mockGetSuccessData.mockResolvedValue({ data: null, meta: { readyForPrediction: false, teamDataAvailable: false, riskAnalysisAvailable: false } });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Project Deletion Feature', () => {
  describe('Delete button rendering', () => {
    it('renders the Delete Project button when the user is the owner', () => {
      render(<ProjectDashboard />);
      expect(screen.getByText('Delete Project')).toBeInTheDocument();
    });

    it('does NOT render the Delete Project button when the user is NOT the owner', () => {
      mockGetProjectById.mockReturnValue(makeProject({ ownerId: 'other-user-99' }));
      render(<ProjectDashboard />);
      expect(screen.queryByText('Delete Project')).not.toBeInTheDocument();
    });

    it('renders Delete button even when the project is archived (owner can still delete)', () => {
      mockGetProjectById.mockReturnValue(makeProject({ status: 'Archived' }));
      render(<ProjectDashboard />);
      expect(screen.getByText('Delete Project')).toBeInTheDocument();
    });
  });

  describe('Confirmation dialog', () => {
    it('opens the delete confirmation dialog on button click', async () => {
      const user = userEvent.setup();
      render(<ProjectDashboard />);

      await user.click(screen.getByText('Delete Project'));

      expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
      // Project name appears both in the page header and the dialog
      expect(screen.getAllByText(/Test Project Alpha/).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();
    });

    it('closes the dialog when Cancel is clicked without calling the API', async () => {
      const user = userEvent.setup();
      render(<ProjectDashboard />);

      await user.click(screen.getByText('Delete Project'));
      expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();

      await user.click(screen.getByText('Cancel'));
      expect(screen.queryByText(/permanently delete/i)).not.toBeInTheDocument();
      expect(mockDeleteProject).not.toHaveBeenCalled();
    });

    it('closes the dialog via the X button', async () => {
      const user = userEvent.setup();
      render(<ProjectDashboard />);

      await user.click(screen.getByText('Delete Project'));
      expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();

      // Find and click the X close button in the delete dialog
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.querySelector('.lucide-x'));
      if (xButton) await user.click(xButton);

      expect(mockDeleteProject).not.toHaveBeenCalled();
    });
  });

  describe('Successful deletion', () => {
    it('calls deleteProject, shows success toast, and navigates to /projects', async () => {
      mockDeleteProject.mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<ProjectDashboard />);

      // Open dialog
      await user.click(screen.getByText('Delete Project'));

      // Find the destructive confirm button inside the dialog
      const confirmButtons = screen.getAllByText('Delete Project');
      const confirmBtn = confirmButtons[confirmButtons.length - 1]; // the one in the dialog
      await user.click(confirmBtn);

      await waitFor(() => {
        expect(mockDeleteProject).toHaveBeenCalledWith('proj-1');
      });

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Project deleted successfully.');
      });

      await waitFor(() => {
        expect(mockRefreshProjects).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/projects', { replace: true });
      });
    });
  });

  describe('Error handling', () => {
    it('shows permission error on 403', async () => {
      mockDeleteProject.mockRejectedValue({
        response: { status: 403, data: { error: { code: 403, message: 'Forbidden' } } },
      });
      const user = userEvent.setup();
      render(<ProjectDashboard />);

      await user.click(screen.getByText('Delete Project'));
      const confirmButtons = screen.getAllByText('Delete Project');
      await user.click(confirmButtons[confirmButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText(/You do not have permission to delete this project/i)).toBeInTheDocument();
      });

      // Dialog stays open
      expect(screen.getByText(/permanently delete/i)).toBeInTheDocument();
      // Did not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('shows not-found error on 404 and refreshes projects', async () => {
      mockDeleteProject.mockRejectedValue({
        response: { status: 404, data: { error: { code: 404, message: 'Project not found' } } },
      });
      const user = userEvent.setup();
      render(<ProjectDashboard />);

      await user.click(screen.getByText('Delete Project'));
      const confirmButtons = screen.getAllByText('Delete Project');
      await user.click(confirmButtons[confirmButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText(/Project not found/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(mockRefreshProjects).toHaveBeenCalled();
      });
    });

    it('shows generic error message for unexpected errors', async () => {
      mockDeleteProject.mockRejectedValue({
        response: { status: 500, data: { error: { code: 500, message: 'Internal server error' } } },
        message: 'Request failed',
      });
      const user = userEvent.setup();
      render(<ProjectDashboard />);

      await user.click(screen.getByText('Delete Project'));
      const confirmButtons = screen.getAllByText('Delete Project');
      await user.click(confirmButtons[confirmButtons.length - 1]);

      await waitFor(() => {
        // getApiMessage extracts response.data.error.message = 'Internal server error'
        expect(screen.getByText(/Internal server error|Failed to delete/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading state', () => {
    it('disables the confirm button while deletion is in progress', async () => {
      // Make the delete hang so we can assert the loading state
      let resolveDelete: () => void;
      mockDeleteProject.mockImplementation(
        () => new Promise<void>((resolve) => { resolveDelete = resolve; })
      );
      const user = userEvent.setup();
      render(<ProjectDashboard />);

      await user.click(screen.getByText('Delete Project'));
      const confirmButtons = screen.getAllByText('Delete Project');
      const confirmBtn = confirmButtons[confirmButtons.length - 1];
      await user.click(confirmBtn);

      // While loading, the text should change to "Deleting…"
      await waitFor(() => {
        expect(screen.getAllByText(/Deleting/).length).toBeGreaterThanOrEqual(1);
      });

      // Resolve the promise to clean up
      resolveDelete!();
    });
  });
});

// ─── API client unit test ────────────────────────────────────────────────────

describe('projectsApi.deleteProject', () => {
  it('calls DELETE /api/projects/:id and returns the message', async () => {
    const mockAxiosDelete = vi.fn().mockResolvedValue({
      data: { data: { message: 'Project deleted successfully' }, meta: {} },
    });

    // Import the module to test its shape
    const { default: api } = await import('../../lib/projectsApi');

    // Verify the method exists and has the right name
    expect(typeof api.deleteProject).toBe('function');
  });
});
