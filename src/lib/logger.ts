/**
 * Minimal structured logger with redaction. No external dependency.
 *
 * NEVER logs: passwords, OTPs, payment card data, auth tokens, API secrets.
 * Any key matching the redaction list is masked before output. Values are
 * emitted as single-line JSON so log processors can parse them.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const REDACT_KEYS = [
  'password',
  'otp',
  'token',
  'idtoken',
  'accesstoken',
  'authorization',
  'secret',
  'apikey',
  'privatekey',
  'card',
  'cardnumber',
  'cvv',
  'signature',
  'cookie',
];

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[Truncated]';
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (REDACT_KEYS.includes(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = redact(v, depth + 1);
    }
  }
  return out;
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(context ? { context: redact(context) } : {}),
  };
  const line = JSON.stringify(entry);
  // console.warn/error are the allowed console methods (see eslint config).
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else if (process.env.NODE_ENV !== 'test') {
    console.error(line); // route info/debug to stderr to keep stdout clean
  }
}

export const logger = {
  debug: (m: string, c?: Record<string, unknown>) => emit('debug', m, c),
  info: (m: string, c?: Record<string, unknown>) => emit('info', m, c),
  warn: (m: string, c?: Record<string, unknown>) => emit('warn', m, c),
  error: (m: string, c?: Record<string, unknown>) => emit('error', m, c),
};

/** Exposed for unit testing the redaction logic. */
export const _redactForTest = redact;
