/**
 * Shared date formatting utilities used across screens.
 */

/**
 * Format ISO date string as "Jan 15, 2025"
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/**
 * Format ISO date string as "January 15, 2025" (long month)
 */
export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return '—';
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

/**
 * Format YYYY-MM-DD date string as "Jan 15, 2025"
 */
export function formatDateShort(yyyymmdd: string | null | undefined): string {
  if (!yyyymmdd) return '—';
  try {
    // Parse as local date to avoid timezone shift
    const [y, m, d] = yyyymmdd.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return yyyymmdd;
  }
}

/**
 * Return relative time if ≤ 30 days old, otherwise formatted date.
 * Input: ISO string
 */
export function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay <= 30) return `${diffDay} days ago`;
    return formatDate(iso);
  } catch {
    return iso ?? '—';
  }
}

/**
 * Format a date range for display: "Jan 15, 2025 → Jun 30, 2025"
 * Handles YYYY-MM-DD inputs.
 */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined
): string | null {
  if (!start && !end) return null;
  const startStr = start ? formatDateShort(start) : '…';
  const endStr = end ? formatDateShort(end) : '…';
  return `${startStr} → ${endStr}`;
}
