// Spec: API_CONTRACTS.md §1 (error shape, codes and HTTP statuses).
const STATUS = {
  validation_failed: 400,
  bot_check_failed: 400,
  unauthenticated: 401,
  invalid_api_key: 401,
  forbidden: 403,
  plan_limit_reached: 403,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  rate_limited: 429,
  internal_error: 500,
} as const;

export type ErrorCode = keyof typeof STATUS;

export type ErrorBody = {
  error: { code: ErrorCode; message: string; details?: Record<string, unknown> };
};

/** An expected failure: the message and details are safe to show the caller. */
export class AppError extends Error {
  override readonly name = "AppError";

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }

  get status(): number {
    return STATUS[this.code];
  }
}

/** Maps anything thrown to the public error response. Unknown errors never leak their message. */
export function toErrorResponse(error: unknown): { status: number; body: ErrorBody } {
  if (!(error instanceof AppError)) {
    return {
      status: 500,
      body: { error: { code: "internal_error", message: "Something went wrong." } },
    };
  }
  // Spec: SECURITY.md C2 — a failed bot check looks like any other invalid request.
  if (error.code === "bot_check_failed") {
    return {
      status: 400,
      body: { error: { code: "validation_failed", message: "Invalid request." } },
    };
  }
  const { code, message, details } = error;
  return {
    status: error.status,
    body: { error: details ? { code, message, details } : { code, message } },
  };
}
