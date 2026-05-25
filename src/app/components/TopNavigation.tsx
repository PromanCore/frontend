/**
 * Global top navigation bar — visible on ALL authenticated pages.
 *
 * Left:  ProMan logo + "Project Management Intelligence" tagline
 * Right: Light/Dark theme toggle + User avatar/dropdown
 *
 * User dropdown (opens on click, closes on outside click / Escape / item click):
 *   [User info — non-clickable header: full name (bold) + email (muted)]
 *   [divider]
 *   [My Profile]  → /profile
 *   [divider]
 *   [Logout]      → red styling, triggers full logout flow
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router';
import { Brain, User, LogOut, ChevronDown } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../lib/authApi';
import { toast } from 'sonner';

export function TopNavigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Close on outside click ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ── Close on Escape ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // ── Logout handler ───────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    setIsOpen(false);
    const currentRefreshToken = localStorage.getItem('proman-refresh-token') || '';
    // Fire-and-forget — spec says logout is idempotent; never show error
    authApi.logout({ refreshToken: currentRefreshToken }).catch(() => {});
    logout();
    toast.info('You have been signed out.');
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  // ── Navigate and close ───────────────────────────────────────────────────────
  const handleNavigate = useCallback(
    (path: string) => {
      setIsOpen(false);
      navigate(path);
    },
    [navigate]
  );

  // Initials for avatar
  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
    : 'U';

  return (
    <header className="sticky top-0 z-40 w-full bg-card/90 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* ── Left: Logo ─────────────────────────────────────────────────────── */}
        <Link to="/projects" className="flex items-center gap-3 group">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm text-foreground font-semibold leading-none block">
              ProMan
            </span>
            <span className="text-xs text-muted-foreground leading-none block mt-0.5">
              Project Management Intelligence
            </span>
          </div>
        </Link>

        {/* ── Right: Controls ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* User dropdown trigger */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsOpen((s) => !s)}
              aria-haspopup="true"
              aria-expanded={isOpen}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted hover:bg-interactive-hover hover:text-white transition-colors group"
            >
              {/* Avatar circle with initials */}
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs text-white font-semibold flex-shrink-0">
                {initials || <User className="w-4 h-4" />}
              </div>
              <span className="text-sm text-foreground group-hover:text-white hidden sm:block max-w-[120px] truncate">
                {user?.fullName || 'Account'}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted-foreground group-hover:text-white transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* ── Dropdown menu ───────────────────────────────────────────── */}
            {isOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
              >
                {/* User info header — non-clickable */}
                <div className="px-4 py-3.5 border-b border-border bg-muted/40">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm text-white font-semibold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-card-foreground truncate font-semibold">
                        {user?.fullName || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {user?.email || ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-b border-border" />

                {/* My Profile */}
                <div className="py-1.5">
                  <button
                    role="menuitem"
                    onClick={() => handleNavigate('/profile')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-card-foreground hover:bg-interactive-hover hover:text-white transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>My Profile</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-border" />

                {/* Logout */}
                <div className="py-1.5">
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive hover:text-white transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}