/**
 * Shared API error parsing utilities.
 *
 * The backend error envelope always follows this shape:
 *   { "error": { "code": number, "message": string, "details": [{ "field": string, "message": string }] } }
 *
 * parseApiErrors() extracts the details[] array into a flat { field → message } map
 * so each screen can set field-level errors directly without brittle string-matching
 * on the top-level message.
 *
 * getApiMessage() safely extracts the top-level error message string.
 */

/**
 * Returns a { [fieldName]: errorMessage } record built from
 * `error.details[]` in the API response. Returns an empty object
 * when there are no field-level details (e.g. 401, 423, 500).
 */
export function parseApiErrors(err: unknown): Record<string, string> {
  const details: Array<{ field: string; message: string }> =
    (err as any)?.response?.data?.error?.details ?? [];

  const result: Record<string, string> = {};
  for (const d of details) {
    if (d.field && d.message) {
      result[d.field] = d.message;
    }
  }
  return result;
}

/**
 * Safely extracts the human-readable message from the API error envelope.
 * Falls back to the JS Error's own .message if the envelope is absent.
 */
export function getApiMessage(err: unknown): string {
  return (
    (err as any)?.response?.data?.error?.message ||
    (err as any)?.message ||
    ''
  );
}
