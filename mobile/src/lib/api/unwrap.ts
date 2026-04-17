/**
 * Unwrap the backend response envelope.
 * Backend wraps all responses as { data: payload, meta: { timestamp } }.
 * Axios adds its own .data wrapper. This helper extracts the payload.
 */
export function unwrap<T = unknown>(res: { data: unknown }): T {
  return (res.data as any)?.data as T;
}
