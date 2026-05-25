/**
 * Application root.
 * Providers (outermost → innermost):
 *   ThemeProvider  → handles light/dark theme
 *   AuthProvider   → JWT token management, auth state
 *   ProjectsProvider → project CRUD state shared across all routes
 *   RouterProvider → React Router v7 (Data Mode)
 */

import { RouterProvider } from 'react-router';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectsProvider } from './contexts/ProjectsContext';
import { router } from './routes';

// ─── Shared data types (exported so existing screens can import them) ──────────

export type AnalysisStatus = 'not_started' | 'in_progress' | 'completed' | 'failed';
export type ProjectStatus = 'Active' | 'Completed' | 'Archived';
export type ProjectType =
  | 'Sales'
  | 'Development'
  | 'Marketing'
  | 'Design'
  | 'Operations'
  | 'Finance'
  | 'Real Estate'
  | 'Construction'
  | 'Media Production'
  | 'Customer Support'
  | 'Research'
  | 'Education'
  | 'HR & Recruitment'
  | 'E-Commerce'
  | 'AI & Automation'
  | 'Other';
export type ExperienceLevel = 'Junior' | 'Mid' | 'Senior' | 'Lead';
export type SkillProficiencyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

// ── Risk Analysis Input Types ─────────────────────────────────────────────────
export type ProjectSize = 'Small' | 'Medium' | 'Large' | 'Enterprise';

// API-28: exact enum values expected by /api/projects/:id/risk/data
export type BudgetRange =
  | 'Under50K'     // was 'Under 50K'
  | '50K-200K'
  | '200K-500K'
  | '500K-1M'
  | 'Over1M';      // was 'Over 1M'

export type TimelineDuration =
  | 'Under1Month'   // was 'Under 1 Month'
  | '1-3Months'     // was '1-3 Months'
  | '3-6Months'     // was '3-6 Months'
  | '6-12Months'    // was '6-12 Months'
  | 'Over12Months'; // was 'Over 12 Months'

export type ResourceAvailability = 'Scarce' | 'Limited' | 'Adequate' | 'Abundant';

// API-28: exact enum values expected (MostlyJunior / MostlySenior — no spaces)
export type TeamExperienceLevelEnum = 'MostlyJunior' | 'Mixed' | 'MostlySenior' | 'Expert';

// API-28: VeryHigh — no space
export type TechnologyComplexity = 'Low' | 'Medium' | 'High' | 'VeryHigh';

export type RiskInputData = {
  projectCharacteristics: {
    projectType?: string;
    customProjectType?: string;
    projectSize: ProjectSize;
    industryDomain?: string;
  };
  projectConstraints: {
    budgetRange?: BudgetRange;
    timelineDuration?: TimelineDuration;
    resourceAvailability?: ResourceAvailability;
  };
  operationalFactors: {
    teamExperienceLevel?: TeamExperienceLevelEnum;
    technologyComplexity?: TechnologyComplexity;
    externalDependencies?: {
      count?: number;
      description?: string;
    };
  };
  additionalContext?: string;
};

export type IdentifiedRisk = {
  riskName: string;
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  category: 'Technical' | 'Resource' | 'Schedule' | 'Budget' | 'External' | 'Organizational';
  likelihood: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  description: string;
  mitigationRecommendation: string;
};

export type PredictiveWarning = {
  warning: string;
  severity: 'Info' | 'Warning' | 'Critical';
  details: string;
};

export type RiskAnalysisResult = {
  analysisId: string;
  overallRiskHealthScore: number;
  identifiedRisks: IdentifiedRisk[];
  predictiveWarnings: PredictiveWarning[];
  summaryAndRecommendations: {
    summary: string;
    actionableRecommendations: Array<{
      priority: 'High' | 'Medium' | 'Low';
      recommendation: string;
      expectedImpact: string;
    }>;
  };
  dataSourcesUsed: { teamDataIncluded: boolean };
  version: number;
  timestamp: string;
  partialResponse: boolean;
};

// ── Success Prediction Input Types ────────────────────────────────────────────
// API-34: VeryHigh — no space
export type StakeholderInvolvement = 'Minimal' | 'Low' | 'Moderate' | 'High' | 'VeryHigh';
export type RiskMitigationPlanningLevel = 'None' | 'Basic' | 'Moderate' | 'Comprehensive';
// API-34: NoHistory — no space
export type HistoricalPerformance = 'NoHistory' | 'Poor' | 'Average' | 'Good' | 'Excellent';

export type KPI = { kpiName: string; targetValue?: string; unit?: string };

export type SuccessInputData = {
  planningIndicators: {
    projectGoalsClarity: number;    // 1-10
    requirementsStability: number;  // 1-10
    stakeholderInvolvement?: StakeholderInvolvement;
  };
  executionReadiness: {
    teamCapabilityAlignment?: number; // 1-10
    toolTechnologyReadiness?: number; // 1-10
    riskMitigationPlanning?: RiskMitigationPlanningLevel;
  };
  performanceMetrics?: {
    historicalPerformance?: HistoricalPerformance;
    expectedKPIs?: KPI[];
    qualityBenchmarks?: number; // 1-10
  };
  additionalContext?: string;
};

export type DeliveryConfidenceLevel = 'Low' | 'Medium' | 'High';

export type SuccessFactorItem = {
  factor: string;
  impact: 'High' | 'Medium' | 'Low';
  details: string;
};

export type ImprovementRecommendation = {
  priority: 'High' | 'Medium' | 'Low';
  recommendation: string;
  expectedImpactOnSuccess: string;
};

export type SuccessPredictionResult = {
  predictionId: string;
  successProbability: number;
  confidenceLevel: 'Low' | 'Medium' | 'High';
  expectedDeliveryConfidence: {
    onTimeDelivery: DeliveryConfidenceLevel;
    onBudget: DeliveryConfidenceLevel;
    qualityTargetsMet: DeliveryConfidenceLevel;
  };
  keySuccessFactors: SuccessFactorItem[];
  keyRiskFactors: SuccessFactorItem[];
  improvementRecommendations: ImprovementRecommendation[];
  summary: string;
  /** API-37 field names: teamData / riskData (was teamDataAvailable / riskAnalysisAvailable) */
  dataSourcesUsed: { teamData: boolean; riskData: boolean };
  version: number;
  timestamp: string;
  partialResponse: boolean;
};

// ── Report Types ──────────────────────────────────────────────────────────────
export type ReportType = 'Individual Member' | 'Team Optimization' | 'Risk Analysis' | 'Success Prediction' | 'Full Project Summary';

export type ReportRecommendation = {
  priority: 'High' | 'Medium' | 'Low';
  recommendation: string;
  expectedImpact: string;
  category: string;
};

export type Report = {
  reportId: string;
  reportType: ReportType;
  generatedAt: string;
  memberName?: string;
  memberId?: string;
  header?: {
    projectName: string;
    reportType: ReportType;
    projectType?: string;
    industryDomain?: string;
    generatedAt: string;
    generatedBy: string;
  };
  metadata?: { analysisVersion: number; partialResponse: boolean };
  inputSummary?: Record<string, any>;
  analysisResults?: Record<string, any>;
  recommendations?: ReportRecommendation[];
};

export type Skill = {
  name: string;          // legacy display name (also used as skillName)
  proficiency: number;   // legacy 1-10 numeric
  skillName?: string;    // API-aligned alias for name
  proficiencyLevel?: SkillProficiencyLevel; // API-aligned enum
};

export type FollowUpNote = {
  id: string;      // API-22/23 uses "id" (was "noteId")
  title?: string;
  content: string;
  createdAt: string;
};

// ── Individual member analysis sub-types ──────────────────────────────────────

export type SkillAdequacyItem = {
  skillName: string;
  adequacy: 'Insufficient' | 'Adequate' | 'Strong' | 'Expert';
  notes: string;
};

export type SkillsAdequacyAssessment = {
  overallScore: number;
  details: string;
  skillBreakdown: SkillAdequacyItem[];
};

export type RoleFitEvaluation = {
  fitScore: number;
  fitLevel: 'PoorFit' | 'PartialFit' | 'GoodFit' | 'ExcellentFit';
  details: string;
  suggestedRoles: string[];
};

export type PerformancePotential = {
  potentialLevel: 'Low' | 'Moderate' | 'High' | 'Exceptional';
  details: string;
  growthAreas: string[];
};

export type DevelopmentRecommendation = {
  priority: 'High' | 'Medium' | 'Low';
  recommendation: string;
  expectedImpact: string;
  timeframe: string;
};

export type IndividualMemberAnalysis = {
  analysisId: string;
  skillsAdequacyAssessment: SkillsAdequacyAssessment;
  roleFitEvaluation: RoleFitEvaluation;
  performancePotential: PerformancePotential;
  developmentRecommendations: DevelopmentRecommendation[];
  summary: string;
  /** API-25 field name: "timestamp" (was "analysisTimestamp") */
  timestamp: string;
  /** API-25 field name: "version" (was "analysisVersion") */
  version: number;
  partialResponse: boolean;
};

// ── Team analysis sub-types ───────────────────────────────────────────────────

export type CapabilityGap = {
  gapName: string;    // API-26 uses "gapName" (was "name")
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  recommendation: string;
};

export type OptimizationRecommendation = {
  priority: 'High' | 'Medium' | 'Low';
  recommendation: string;
  expectedImpact: string;
};

/** Lightweight record returned by GET .../members/:memberId/analysis/analyses */
export type MemberAnalysisHistoryItem = {
  analysisId: string;
  analysisType: 'Individual';
  version: number;
};

export type TeamMember = {
  id: string;
  memberId?: string;      // API UUID alias
  name: string;
  role: string;
  /** Supports both old (lowercase) and new (Title-case) values */
  experienceLevel: 'junior' | 'intermediate' | 'senior' | 'expert' | 'Junior' | 'Mid' | 'Senior' | 'Lead';
  skills: Skill[];
  /** Count returned by the list endpoint (no skills array on list items). */
  skillsCount?: number;
  strengths?: string[];
  gaps?: string[];
  notes?: string;         // legacy single-string notes
  followUpNotes?: FollowUpNote[];
  individualAnalysis?: IndividualMemberAnalysis;
  analysisHistory?: IndividualMemberAnalysis[];
  /** Metadata list from GET .../analysis/analyses — all versions, no full result bodies. */
  memberAnalysisHistoryItems?: MemberAnalysisHistoryItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type RiskAnalysis = {
  riskLevel: 'low' | 'medium' | 'high';
  characteristics: Record<string, string>;
  constraints: Record<string, string>;
  operationalFactors: Record<string, string>;
  insights: string[];
  mitigationSuggestions: string[];
  version: number;
  timestamp: string;
};

export type SuccessForecast = {
  probability: number;
  planningQuality: Record<string, number>;
  executionReadiness: Record<string, number>;
  insights: string;
  version: number;
  timestamp: string;
};

export type TeamAnalysisSnapshot = {
  version: number;
  timestamp: string;
  teamSize: number;
  teamReadiness: number;
  compatibility: number;  // legacy
  insights: {
    strengths: string[];
    gaps: string[];
    suggestions: string[];
  };
  // Extended API-aligned fields
  analysisId?: string;
  partialResponse?: boolean;
  teamCompositionBalance?: {
    overallScore: number;
    details: string;
    roleBalance: string;
    experienceBalance: string;
  };
  skillCoverageAnalysis?: {
    coverageScore: number;
    wellCoveredSkills: string[];
    gaps: string[];
    redundancies: string[];
  };
  capabilityGaps?: CapabilityGap[];
  teamStrengths?: string[];
  optimizationRecommendations?: OptimizationRecommendation[];
  summary?: string;
};

export type Project = {
  id: string;

  // ── API-aligned fields (new) ────────────────────────────────────────────────
  /** Primary name — always equals `name`. Use this going forward. */
  projectName: string;
  status: ProjectStatus;
  /** Typed project category — null if not set */
  projectType: ProjectType | string | null;
  /** Custom category name if projectType is 'Other' */
  customProjectType?: string | null;
  /** Free-text industry/domain — null if not set */
  industryDomain: string | null;
  startDate: string | null;       // YYYY-MM-DD
  expectedEndDate: string | null; // YYYY-MM-DD
  description: string;
  createdAt: string;  // ISO-8601
  updatedAt: string;  // ISO-8601

  // ── Backward-compat aliases (kept for existing screens) ─────────────────────
  name: string;       // alias for projectName
  type: string;       // alias for projectType
  industry: string;   // alias for industryDomain

  // ── Analysis metadata ───────────────────────────────────────────────────────
  teamReadiness: number;
  riskLevel: 'low' | 'medium' | 'high';
  successProbability: number;
  teamMembers: TeamMember[];
  teamAnalysisStatus: AnalysisStatus;
  riskAnalysisStatus: AnalysisStatus;
  successPredictionStatus: AnalysisStatus;
  riskAnalysis?: RiskAnalysis;
  successForecast?: SuccessForecast;
  riskAnalysisHistory: RiskAnalysis[];
  successForecastHistory: SuccessForecast[];
  teamAnalysisHistory: TeamAnalysisSnapshot[];

  // ── New v2 analysis data ─────────────────────────────────────────────────────
  riskInputData?: RiskInputData;
  riskAnalysisResult?: RiskAnalysisResult;
  riskAnalysisResults?: RiskAnalysisResult[];
  successInputData?: SuccessInputData;
  successPredictionResult?: SuccessPredictionResult;
  successPredictionResults?: SuccessPredictionResult[];
  reports?: Report[];
};

/**
 * Legacy user shape — kept for backward compatibility with existing screens
 * that still use the { name, email, password, age } structure.
 * New auth uses AuthUser = { id, fullName, email } from AuthContext.
 */
export type User = {
  name: string;
  email: string;
  password: string;
  age: string;
};

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProjectsProvider>
          <RouterProvider router={router} />
        </ProjectsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}