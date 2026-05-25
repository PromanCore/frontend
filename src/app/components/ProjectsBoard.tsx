/**
 * Projects Overview — /projects
 * B. Fixes per spec:
 *   - Remove invalid fields (Completion %, Risk badge, Goals)
 *   - Redesign cards with API response fields only
 *   - Add search + status filter with debounce
 *   - Add pagination with page-size selector
 *   - Two distinct empty states
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Search, X, ChevronLeft, ChevronRight, FolderOpen, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useProjects } from '../contexts/ProjectsContext';
import { formatRelativeDate } from '../lib/dateUtils';
import type { Project, ProjectStatus, User } from '../App';

// ─── Props (kept for routes.tsx compat — most logic is internal) ──────────────
type ProjectsBoardProps = {
  projects?: Project[];
  onSelectProject?: (project: Project) => void;
  onNewProject?: () => void;
  user?: User;
  onNavigate?: (screen: 'profile' | 'projects-board' | 'settings' | 'help') => void;
  onLogout?: () => void;
};

// ─── Status config ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ProjectStatus }) {
  const cfg: Record<ProjectStatus, { label: string; cls: string }> = {
    Active:    { label: 'Active',    cls: 'bg-success/10 text-success border-success/30' },
    Completed: { label: 'Completed', cls: 'bg-primary/10 text-primary border-primary/30' },
    Archived:  { label: 'Archived',  cls: 'bg-muted text-muted-foreground border-border' },
  };
  const { label, cls } = cfg[status] ?? cfg['Active'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── Status filter options ────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all',       label: 'All Statuses' },
  { value: 'Active',    label: 'Active' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Archived',  label: 'Archived' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ─── Component ────────────────────────────────────────────────────────────────
export function ProjectsBoard() {
  const navigate = useNavigate();
  const { projects: allProjects, isLoading, error } = useProjects();

  // ── Search + filter state ──────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');   // what user types
  const [searchQuery, setSearchQuery] = useState('');   // debounced value used for filtering
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search input by 300ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setIsSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
      setPage(1);
      setIsSearching(false);
    }, 300);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── Computed list (API returns all results; client-side filter + paginate) ────
  const filtered = allProjects.filter((p) => {
    const matchesSearch = !searchQuery ||
      p.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalCount);
  const pageProjects = filtered.slice(startIdx, endIdx);

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all';

  function clearFilters() {
    setSearchInput('');
    setSearchQuery('');
    setStatusFilter('all');
    setPage(1);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading projects…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-destructive text-sm mb-3">{error}</p>
          <Button size="sm" onClick={() => window.location.reload()} className="bg-primary text-white">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl text-foreground font-semibold mb-1">Projects Overview</h2>
            <p className="text-muted-foreground text-sm">
              {allProjects.length === 0
                ? 'Create your first project to get started'
                : `${allProjects.length} project${allProjects.length !== 1 ? 's' : ''} total`}
            </p>
          </div>
          <Button
            onClick={() => navigate('/projects/new')}
            className="bg-primary hover:bg-primary/90 text-white border-0"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* ── Global empty state (no projects at all) ──────────────────────── */}
        {allProjects.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
              <FolderOpen className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl text-card-foreground font-semibold mb-3">No projects yet</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
              Create your first project to get started with AI-powered analysis.
            </p>
            <Button
              onClick={() => navigate('/projects/new')}
              className="bg-primary hover:bg-primary/90 text-white border-0"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Project
            </Button>
          </div>
        ) : (
          <>
            {/* ── Search + Filter bar ───────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {/* Search input */}
              <div className="relative flex-1">
                {isSearching ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                )}
                <Input
                  type="text"
                  placeholder="Search projects by name..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-9 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary"
                />
                {searchInput && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Status filter toggle buttons */}
              <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl flex-shrink-0">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === opt.value
                        ? 'bg-interactive-hover text-white'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Empty state with filters ──────────────────────────────────── */}
            {totalCount === 0 && hasActiveFilters ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-muted border border-border mb-5">
                  <Search className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg text-card-foreground font-semibold mb-2">No projects match your search criteria.</h3>
                <p className="text-muted-foreground text-sm mb-6">Try adjusting your filters or search term.</p>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="border-border text-foreground hover:bg-interactive-hover hover:text-white hover:border-interactive-hover"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                {/* ── Project cards grid ─────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                  {pageProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    />
                  ))}

                  {/* Add new project circle button (only on first page, no search active) */}
                  {safePage === 1 && !hasActiveFilters && (
                    <button
                      onClick={() => navigate('/projects/new')}
                      className="group bg-transparent rounded-2xl p-6 flex items-center justify-center transition-all hover:bg-primary/5 min-h-[200px] border-2 border-dashed border-border hover:border-primary"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full border-2 border-muted-foreground/40 flex items-center justify-center mx-auto mb-3 group-hover:border-primary transition-colors">
                          <Plus className="w-6 h-6 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                        </div>
                        <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">New Project</span>
                      </div>
                    </button>
                  )}
                </div>

                {/* ── Pagination ─────────────────────────────────────────────── */}
                {totalCount > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border rounded-xl px-5 py-3">
                    {/* Showing X–Y of Z */}
                    <span className="text-sm text-muted-foreground">
                      {totalCount === 0
                        ? 'No projects'
                        : `Showing ${startIdx + 1}–${endIdx} of ${totalCount} project${totalCount !== 1 ? 's' : ''}`}
                    </span>

                    {/* Navigation + page indicator */}
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p - 1)}
                        disabled={safePage <= 1}
                        className="border-border text-foreground hover:bg-interactive-hover hover:text-white hover:border-interactive-hover disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        Page {safePage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={safePage >= totalPages}
                        className="border-border text-foreground hover:bg-interactive-hover hover:text-white hover:border-interactive-hover disabled:opacity-40"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>

                    {/* Page size selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
                      >
                        <SelectTrigger className="w-20 h-8 text-sm bg-input-background border-input text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border text-card-foreground">
                          {PAGE_SIZE_OPTIONS.map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group bg-interactive-default hover:bg-interactive-hover active:bg-interactive-active border-2 border-border hover:border-primary rounded-2xl p-6 text-left transition-all shadow-sm hover:shadow-lg w-full"
    >
      {/* Name + Status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-base font-semibold text-interactive-default-foreground group-hover:text-interactive-hover-foreground group-active:text-interactive-active-foreground transition-colors line-clamp-2 flex-1">
          {project.projectName || project.name}
        </h3>
        <StatusBadge status={project.status} />
      </div>

      {/* Type + Industry */}
      {(project.projectType || project.industryDomain) && (
        <p className="text-xs text-muted-foreground group-hover:text-white/70 mb-3 transition-colors">
          {[project.projectType, project.industryDomain].filter(Boolean).join(' · ')}
        </p>
      )}

      {/* Divider */}
      <div className="border-t border-border/40 group-hover:border-white/10 my-3 transition-colors" />

      {/* Status + Created */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground group-hover:text-white/70 transition-colors capitalize">
          {project.status}
        </span>
        <span className="text-muted-foreground group-hover:text-white/70 transition-colors">
          {formatRelativeDate(project.createdAt)}
        </span>
      </div>

      {/* Open project link */}
      <div className="mt-4 text-sm font-medium text-foreground group-hover:text-white transition-colors flex items-center gap-1">
        Open Project →
      </div>
    </button>
  );
}
