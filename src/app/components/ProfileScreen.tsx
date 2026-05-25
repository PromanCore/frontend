/**
 * Profile Page — /profile
 *
 * F1. Profile Information Card (view/edit mode)
 * F2. Change Password section (collapsible)
 * F3. Delete Account — Danger Zone with confirmation modal
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  Pencil,
  Save,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  Check,
  User,
  Mail,
  Calendar,
  Clock,
  Shield,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { authApi, type UserProfile } from '../lib/authApi';
import { useAuth } from '../contexts/AuthContext';
import { PasswordChecklist, isPasswordValid } from './auth/PasswordChecklist';
import { parseApiErrors, getApiMessage } from '../lib/apiErrorUtils';
import type { User as UserType } from '../App';

// ─── Props (kept minimal — component uses hooks internally) ───────────────────
type ProfileScreenProps = {
  user: UserType;
  onUpdateUser: (user: UserType) => void;
  onNavigate?: (screen: 'profile' | 'projects-board' | 'settings' | 'help') => void;
  onLogout?: () => void;
  onBack: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Delete Account Modal ─────────────────────────────────────────────────────

interface DeleteModalProps {
  onClose: () => void;
  onDeleted: () => void;
}

const CONFIRM_PHRASE = 'DELETE MY ACCOUNT';

function DeleteAccountModal({ onClose, onDeleted }: DeleteModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [phraseError, setPhraseError] = useState('');

  const phraseMatches = phrase === CONFIRM_PHRASE;
  const canSubmit = password.trim() !== '' && phraseMatches && !isSubmitting;

  async function handleDelete() {
    if (!canSubmit) return;
    setPasswordError('');
    setPhraseError('');
    setIsSubmitting(true);
    try {
      await authApi.deleteAccount({ password, confirmationPhrase: phrase });
      onDeleted();
    } catch (err: any) {
      const status = err?.response?.status;
      const message = getApiMessage(err);
      const fieldErrors = parseApiErrors(err);

      if (status === 401) {
        // API-10: 401 means wrong password — details[] is empty for this case
        setPasswordError(message || 'Password is incorrect');
      } else if (status === 400) {
        if (fieldErrors.confirmationPhrase) {
          // API-10: details[] has { field: "confirmationPhrase", message: "..." }
          setPhraseError(fieldErrors.confirmationPhrase);
        } else if (Object.keys(fieldErrors).length === 0 && message.toLowerCase().includes('required')) {
          // Generic "fields are required" — no field-level details
          if (!password) setPasswordError('Password is required');
          if (!phrase) setPhraseError('Confirmation phrase is required');
        } else {
          toast.error(message || 'Failed to delete account.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card border border-destructive/40 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal header */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-border">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 border border-destructive/30 mb-4">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-xl text-card-foreground font-semibold">Delete Your Account</h2>
        </div>

        {/* Modal body */}
        <div className="px-6 py-5 space-y-5">
          {/* Warning paragraph */}
          <div className="px-4 py-3 bg-destructive/8 border border-destructive/25 rounded-xl text-sm text-destructive leading-relaxed">
            <p className="mb-2">⚠️ This action is permanent and irreversible. The following will be deleted forever:</p>
            <ul className="list-disc list-inside space-y-0.5 text-destructive/90">
              <li>Your user account</li>
              <li>All your projects</li>
              <li>All team members and their data</li>
              <li>All analyses and predictions</li>
              <li>All generated reports</li>
              <li>All activity history</li>
            </ul>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1.5">
              Your Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password to confirm"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                className={`pr-10 bg-input-background border-input text-foreground placeholder:text-muted-foreground ${passwordError ? 'border-destructive' : ''}`}
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordError && <p className="mt-1.5 text-xs text-destructive">{passwordError}</p>}
          </div>

          {/* Confirmation phrase field */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1.5">
              Type <span className="font-mono text-destructive">{CONFIRM_PHRASE}</span> to confirm
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder={CONFIRM_PHRASE}
                value={phrase}
                onChange={(e) => { setPhrase(e.target.value); setPhraseError(''); }}
                className={`pr-10 bg-input-background border-input text-foreground placeholder:text-muted-foreground font-mono ${phraseError ? 'border-destructive' : phraseMatches && phrase ? 'border-success' : ''}`}
                disabled={isSubmitting}
                autoComplete="off"
              />
              {phrase && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${phraseMatches ? 'text-success' : 'text-destructive'}`}>
                  {phraseMatches ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </span>
              )}
            </div>
            {phraseError && <p className="mt-1.5 text-xs text-destructive">{phraseError}</p>}
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-border text-foreground hover:bg-muted"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={!canSubmit}
            className="bg-destructive hover:bg-destructive/90 text-white disabled:opacity-50"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting…</>
            ) : (
              <><Trash2 className="w-4 h-4 mr-2" />Permanently Delete My Account</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ProfileScreen ───────────────────────────────────────────────────────

export function ProfileScreen({ onBack }: ProfileScreenProps) {
  const navigate = useNavigate();
  const { user: authUser, updateUser, logout } = useAuth();

  // ── F1: Profile Info ─────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{ fullName?: string; email?: string }>({});

  // ── F2: Change Password ───────────────────────────────────────────────────────
  const [isPwSectionOpen, setIsPwSectionOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [pwErrors, setPwErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
  }>({});
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwCountdown, setPwCountdown] = useState(0);

  // ── F3: Delete Account ────────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ── Load profile on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoadingProfile(true);
      setProfileLoadError('');
      try {
        const data = await authApi.getProfile();
        if (!cancelled) {
          setProfile(data);
          setEditName(data.fullName);
          setEditEmail(data.email);
        }
      } catch (err: any) {
        if (!cancelled) {
          setProfileLoadError('Failed to load profile. Please refresh the page.');
        }
      } finally {
        if (!cancelled) setIsLoadingProfile(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Profile edit helpers ──────────────────────────────────────────────────────

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setProfileErrors({});
    if (profile) {
      setEditName(profile.fullName);
      setEditEmail(profile.email);
    }
  }, [profile]);

  const hasProfileChanges =
    profile &&
    (editName.trim() !== profile.fullName || editEmail.trim().toLowerCase() !== profile.email.toLowerCase());

  function validateProfileEdit(): boolean {
    const errs: typeof profileErrors = {};
    const trimName = editName.trim();
    const trimEmail = editEmail.trim();

    if (!trimName || trimName.length < 2 || trimName.length > 100) {
      errs.fullName = 'Full name must be between 2 and 100 characters';
    }
    if (!trimEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      errs.email = 'Please provide a valid email address';
    }
    setProfileErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSaveProfile() {
    if (!validateProfileEdit() || !profile) return;

    const payload: { fullName?: string; email?: string } = {};
    if (editName.trim() !== profile.fullName) payload.fullName = editName.trim();
    if (editEmail.trim().toLowerCase() !== profile.email.toLowerCase())
      payload.email = editEmail.trim().toLowerCase();

    if (Object.keys(payload).length === 0) return;

    setIsSavingProfile(true);
    try {
      const updated = await authApi.updateProfile(payload);
      setProfile(updated);
      setEditName(updated.fullName);
      setEditEmail(updated.email);
      setIsEditing(false);
      setProfileErrors({});

      // Keep global auth state in sync (UserProfile.id replaces the old .userId)
      if (authUser) {
        updateUser({ id: updated.id, fullName: updated.fullName, email: updated.email });
      }
      toast.success('Profile updated successfully.');
    } catch (err: any) {
      const status = err?.response?.status;
      const message = getApiMessage(err);
      const fieldErrors = parseApiErrors(err);

      if (status === 409) {
        // API-06: details[] has { field: "email", message: "..." }
        setProfileErrors({ email: fieldErrors.email || 'This email is already in use' });
      } else if (status === 400) {
        if (Object.keys(fieldErrors).length > 0) {
          // Map details[] directly: fullName, email
          setProfileErrors(fieldErrors);
        } else {
          toast.error(message || 'Failed to update profile.');
        }
      }
    } finally {
      setIsSavingProfile(false);
    }
  }

  // ── Change password ───────────────────────────────────────────────────────────

  function validatePasswordForm(): boolean {
    const errs: typeof pwErrors = {};
    if (!currentPassword) errs.currentPassword = 'Current password is required';
    if (!newPassword) {
      errs.newPassword = 'New password is required';
    } else if (!isPasswordValid(newPassword)) {
      errs.newPassword = 'Password does not meet strength requirements';
    } else if (newPassword === currentPassword) {
      errs.newPassword = 'New password must be different from your current password';
    }
    if (!confirmNewPassword) {
      errs.confirmNewPassword = 'Please confirm your new password';
    } else if (confirmNewPassword !== newPassword) {
      errs.confirmNewPassword = 'New password and confirmation do not match';
    }
    setPwErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleChangePassword() {
    if (!validatePasswordForm()) return;
    setIsChangingPw(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword, confirmNewPassword });
      setPwSuccess(true);
      setPwErrors({});
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

      // Countdown 3 seconds then logout
      let count = 3;
      setPwCountdown(count);
      const interval = setInterval(() => {
        count -= 1;
        setPwCountdown(count);
        if (count <= 0) {
          clearInterval(interval);
          const refreshToken = localStorage.getItem('proman-refresh-token') || '';
          authApi.logout({ refreshToken }).catch(() => {});
          logout();
          navigate('/login', { replace: true });
        }
      }, 1000);
    } catch (err: any) {
      const status = err?.response?.status;
      const message = getApiMessage(err);
      const fieldErrors = parseApiErrors(err);

      if (status === 401) {
        // API-07: 401 = wrong current password — details[] is empty
        setPwErrors({ currentPassword: 'Current password is incorrect' });
      } else if (status === 400) {
        if (Object.keys(fieldErrors).length > 0) {
          // Map details[] directly: confirmNewPassword, newPassword
          setPwErrors(fieldErrors);
        } else {
          toast.error(message || 'Failed to change password.');
        }
      }
    } finally {
      setIsChangingPw(false);
    }
  }

  // ── Delete account success handler ────────────────────────────────────────────
  const handleAccountDeleted = useCallback(() => {
    setShowDeleteModal(false);
    const refreshToken = localStorage.getItem('proman-refresh-token') || '';
    authApi.logout({ refreshToken }).catch(() => {});
    logout();
    navigate('/login', { replace: true });
    toast.success('Your account and all associated data have been permanently deleted.');
  }, [logout, navigate]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  const canSaveProfile = hasProfileChanges && !isSavingProfile;
  const canChangePassword = currentPassword && newPassword && confirmNewPassword && !isChangingPw;

  return (
    <div className="min-h-screen bg-background">
      {/* Page sub-header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">My Profile</h1>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ══════════════════════════════════════════════════════════════════════
            F1. Profile Information Card
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-card-foreground">Profile Information</h2>
            </div>
            {!isEditing && !isLoadingProfile && !profileLoadError && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 border-border text-foreground hover:bg-interactive-hover hover:text-white hover:border-interactive-hover transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Profile
              </Button>
            )}
            {isEditing && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isSavingProfile}
                  className="border-border text-foreground hover:bg-muted"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  disabled={!canSaveProfile}
                  className="bg-primary hover:bg-primary/90 text-white disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Saving…</>
                  ) : (
                    <><Save className="w-3.5 h-3.5 mr-1" />Save Changes</>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Card body */}
          <div className="px-6 py-5">
            {isLoadingProfile ? (
              <div className="flex items-center justify-center py-10 gap-3">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Loading profile…</span>
              </div>
            ) : profileLoadError ? (
              <div className="flex items-center gap-3 py-6 text-destructive">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{profileLoadError}</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Full Name */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
                  <div className="flex items-center gap-2 sm:pt-2">
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium text-muted-foreground">Full Name</span>
                  </div>
                  <div className="sm:col-span-2">
                    {isEditing ? (
                      <>
                        <Input
                          type="text"
                          value={editName}
                          onChange={(e) => { setEditName(e.target.value); setProfileErrors((p) => ({ ...p, fullName: undefined })); }}
                          className={`bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary ${profileErrors.fullName ? 'border-destructive' : ''}`}
                          placeholder="Enter full name"
                          disabled={isSavingProfile}
                        />
                        {profileErrors.fullName && (
                          <p className="mt-1 text-xs text-destructive">{profileErrors.fullName}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-card-foreground py-2">{profile?.fullName}</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-border/60" />

                {/* Email */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
                  <div className="flex items-center gap-2 sm:pt-2">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium text-muted-foreground">Email</span>
                  </div>
                  <div className="sm:col-span-2">
                    {isEditing ? (
                      <>
                        <Input
                          type="email"
                          value={editEmail}
                          onChange={(e) => { setEditEmail(e.target.value); setProfileErrors((p) => ({ ...p, email: undefined })); }}
                          className={`bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary ${profileErrors.email ? 'border-destructive' : ''}`}
                          placeholder="Enter email"
                          disabled={isSavingProfile}
                        />
                        {profileErrors.email && (
                          <p className="mt-1 text-xs text-destructive">{profileErrors.email}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-card-foreground py-2">{profile?.email}</p>
                    )}
                  </div>
                </div>

                <div className="border-t border-border/60" />

                {/* Member Since — always read-only */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
                  <div className="flex items-center gap-2 sm:pt-1">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium text-muted-foreground">Member Since</span>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-card-foreground py-1">{profile?.createdAt ? formatDate(profile.createdAt) : '—'}</p>
                  </div>
                </div>

                <div className="border-t border-border/60" />

                {/* Last Updated — always read-only */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-start">
                  <div className="flex items-center gap-2 sm:pt-1">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium text-muted-foreground">Last Updated</span>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-card-foreground py-1">{profile?.updatedAt ? formatDate(profile.updatedAt) : '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            F2. Change Password Section (collapsible)
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Collapsible header */}
          <button
            className="w-full flex items-center justify-between px-6 py-4 border-b border-border hover:bg-muted/30 transition-colors text-left"
            onClick={() => { setIsPwSectionOpen((s) => !s); setPwSuccess(false); }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-base font-semibold text-card-foreground">Change Password</p>
                <p className="text-xs text-muted-foreground mt-0.5">Update your password. You will be logged out of all sessions.</p>
              </div>
            </div>
            {isPwSectionOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
          </button>

          {/* Collapsible body */}
          {isPwSectionOpen && (
            <div className="px-6 py-5">
              {/* Success state */}
              {pwSuccess ? (
                <div className="py-4 text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 border border-success/20">
                    <Check className="w-7 h-7 text-success" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-card-foreground mb-1">Password Changed Successfully</p>
                    <p className="text-sm text-muted-foreground">
                      You will be logged out of all sessions.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-xl text-sm text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Redirecting to login in <span className="font-semibold tabular-nums">{pwCountdown}s</span>…
                  </div>
                  <div>
                    <Button
                      onClick={() => {
                        const refreshToken = localStorage.getItem('proman-refresh-token') || '';
                        authApi.logout({ refreshToken }).catch(() => {});
                        logout();
                        navigate('/login', { replace: true });
                      }}
                      className="bg-primary hover:bg-primary/90 text-white text-sm"
                    >
                      Go to Login Now
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showCurrentPw ? 'text' : 'password'}
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(e) => { setCurrentPassword(e.target.value); setPwErrors((p) => ({ ...p, currentPassword: undefined })); }}
                        className={`pr-10 bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary ${pwErrors.currentPassword ? 'border-destructive' : ''}`}
                        autoComplete="current-password"
                        disabled={isChangingPw}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {pwErrors.currentPassword && (
                      <p className="mt-1 text-xs text-destructive">{pwErrors.currentPassword}</p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showNewPw ? 'text' : 'password'}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setPwErrors((p) => ({ ...p, newPassword: undefined })); }}
                        className={`pr-10 bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary ${pwErrors.newPassword ? 'border-destructive' : ''}`}
                        autoComplete="new-password"
                        disabled={isChangingPw}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {pwErrors.newPassword && (
                      <p className="mt-1 text-xs text-destructive">{pwErrors.newPassword}</p>
                    )}
                    {/* Real-time password strength checklist */}
                    <PasswordChecklist password={newPassword} />
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPw ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={confirmNewPassword}
                        onChange={(e) => { setConfirmNewPassword(e.target.value); setPwErrors((p) => ({ ...p, confirmNewPassword: undefined })); }}
                        className={`pr-10 bg-input-background border-input text-foreground placeholder:text-muted-foreground focus:border-primary ${pwErrors.confirmNewPassword ? 'border-destructive' : ''}`}
                        autoComplete="new-password"
                        disabled={isChangingPw}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {pwErrors.confirmNewPassword && (
                      <p className="mt-1 text-xs text-destructive">{pwErrors.confirmNewPassword}</p>
                    )}
                  </div>

                  <Button
                    onClick={handleChangePassword}
                    disabled={!canChangePassword}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white disabled:opacity-50"
                  >
                    {isChangingPw ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Changing Password…</>
                    ) : (
                      'Change Password'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ════════════════════════��═════════════════════════════════════════════
            F3. Delete Account — Danger Zone
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="bg-card border border-destructive/40 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-destructive/20 bg-destructive/5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <h2 className="text-base font-semibold text-destructive">Danger Zone</h2>
          </div>
          <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-card-foreground mb-1">Delete Account</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Permanently delete your account and all associated data.{' '}
                <span className="text-destructive font-medium">This action cannot be undone.</span>
              </p>
            </div>
            <Button
              onClick={() => setShowDeleteModal(true)}
              className="flex-shrink-0 bg-destructive hover:bg-destructive/90 text-white border-0"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </section>

      </main>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onDeleted={handleAccountDeleted}
        />
      )}
    </div>
  );
}