/**
 * Sanitizes and validates the incoming payload.
 * - Picks only the allowed keys.
 * - Throws if any required field is missing or invalid (null/undefined).
 *
 * @param payload Incoming message body
 * @param allowedKeys Array of permitted keys (strings)
 * @returns Sanitized object with only permitted keys and required values
 */
export function sanitizePayload<T extends object>(
  payload: T,
  allowedKeys: (keyof T)[],
): Partial<T> {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid payload: must be an object');
  }
  const output: Partial<T> = {};
  for (const key of allowedKeys) {
    if (payload[key] === undefined || payload[key] === null) {
      throw new Error(`Missing or invalid field: ${String(key)}`);
    }
    output[key] = payload[key];
  }
  return output;
}
