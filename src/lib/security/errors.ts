/**
 * Safe, typed error handling for API route handlers.
 *
 * Production responses NEVER include stack traces, filesystem paths, DB
 * internals, provider secrets, or implementation details. Every client-facing
 * error is one of a fixed set of codes with a generic message. Full detail is
 * logged server-side against a correlation id.
 */
import { NextResponse } from 'next/server';

export type ErrorCode =
  | 'bad_request'
  | 'validation_error'
  | 'unauthenticated'
  | 'token_expired'
  | 'token_invalid'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'payload_too_large'
  | 'not_implemented'
  | 'configuration_pending'
  | 'internal_error';

const STATUS: Record<ErrorCode, number> = {
  bad_request: 400,
  validation_error: 422,
  unauthenticated: 401,
  token_expired: 401,
  token_invalid: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  payload_too_large: 413,
  not_implemented: 501,
  configuration_pending: 503,
  internal_error: 500,
};

// Generic, non-revealing messages. No internal detail ever reaches the client.
const SAFE_MESSAGE: Record<ErrorCode, string> = {
  bad_request: 'The request was invalid.',
  validation_error: 'One or more fields are invalid.',
  unauthenticated: 'Authentication is required.',
  token_expired: 'Your session has expired. Please sign in again.',
  token_invalid: 'Invalid authentication.',
  forbidden: 'You do not have permission to perform this action.',
  not_found: 'The requested resource was not found.',
  conflict: 'The request conflicts with the current state.',
  rate_limited: 'Too many requests. Please slow down and try again.',
  payload_too_large: 'The request payload is too large.',
  not_implemented: 'This feature is not available yet.',
  configuration_pending:
    'Checkout is not fully configured yet. Please try again later.',
  internal_error: 'Something went wrong. Please try again later.',
};

export class AppError extends Error {
  readonly code: ErrorCode;
  /** Optional, machine-readable field errors (safe: field names + reasons). */
  readonly fields?: Record<string, string>;
  /** Internal-only context for logs; never serialized to the client. */
  readonly internal?: unknown;

  constructor(code: ErrorCode, opts?: { fields?: Record<string, string>; internal?: unknown; message?: string }) {
    super(opts?.message ?? SAFE_MESSAGE[code]);
    this.name = 'AppError';
    this.code = code;
    this.fields = opts?.fields;
    this.internal = opts?.internal;
  }
}

export class NotImplementedError extends AppError {
  constructor(what: string) {
    super('not_implemented', { internal: `Not implemented: ${what}` });
    this.name = 'NotImplementedError';
  }
}

export interface SafeErrorBody {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    fields?: Record<string, string>;
    requestId?: string;
  };
}

export function toSafeErrorBody(err: AppError, requestId?: string): SafeErrorBody {
  return {
    ok: false,
    error: {
      code: err.code,
      message: err.message,
      ...(err.fields ? { fields: err.fields } : {}),
      ...(requestId ? { requestId } : {}),
    },
  };
}

export function statusForCode(code: ErrorCode): number {
  return STATUS[code];
}

/** Convert any thrown value into a safe NextResponse. Non-AppErrors collapse
 * to a generic 500 with no detail leaked. */
export function errorResponse(err: unknown, requestId?: string): NextResponse<SafeErrorBody> {
  const appErr = err instanceof AppError ? err : new AppError('internal_error', { internal: err });
  return NextResponse.json(toSafeErrorBody(appErr, requestId), {
    status: statusForCode(appErr.code),
  });
}
