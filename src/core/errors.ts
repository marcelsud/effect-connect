/**
 * Core error types with categorization
 * Errors are categorized to determine handling strategy:
 * - intermittent: Network/connectivity issues, should retry
 * - logical: Bad data/config, log and continue
 * - fatal: Critical failures, stop immediately
 */

export type ErrorCategory = "intermittent" | "logical" | "fatal"

/**
 * Base error class for all components
 */
export abstract class ComponentError extends Error {
  abstract readonly _tag: string
  abstract readonly category: ErrorCategory

  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message)
    this.name = this.constructor.name

    // Maintain proper stack trace for where our error was thrown (only in V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Check if error should be retried
   */
  get shouldRetry(): boolean {
    return this.category === "intermittent"
  }

  /**
   * Check if error is fatal (should stop pipeline)
   */
  get isFatal(): boolean {
    return this.category === "fatal"
  }

  /**
   * Get appropriate log level for this error
   */
  get logLevel(): "debug" | "info" | "error" {
    switch (this.category) {
      case "intermittent":
        return "error"  // Network errors are serious
      case "logical":
        return "debug"  // Bad data is expected, debug level
      case "fatal":
        return "error"  // Fatal errors are critical
    }
  }
}

/**
 * Create error with automatic categorization
 */
export function createCategorizedError<T extends ComponentError>(
  ErrorClass: new (message: string, category: ErrorCategory, cause?: unknown) => T,
  message: string,
  cause?: unknown
): T {
  // Auto-detect category based on error cause
  const category = detectCategory(cause)
  return new ErrorClass(message, category, cause)
}

/**
 * Detect error category from cause
 */
export function detectCategory(cause: unknown): ErrorCategory {
  if (!cause) return "intermittent"

  const errorMessage = cause instanceof Error ? cause.message : String(cause)
  const lowerMessage = errorMessage.toLowerCase()

  // Network/connectivity errors (intermittent)
  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("econnrefused") ||
    lowerMessage.includes("enotfound") ||
    lowerMessage.includes("etimedout") ||
    lowerMessage.includes("socket") ||
    lowerMessage.includes("connection")
  ) {
    return "intermittent"
  }

  // Parse/validation errors (logical)
  if (
    lowerMessage.includes("parse") ||
    lowerMessage.includes("invalid json") ||
    lowerMessage.includes("validation") ||
    lowerMessage.includes("schema") ||
    lowerMessage.includes("unexpected token")
  ) {
    return "logical"
  }

  // Missing config/critical errors (fatal)
  if (
    lowerMessage.includes("required") ||
    lowerMessage.includes("missing") ||
    lowerMessage.includes("not configured") ||
    lowerMessage.includes("unauthorized")
  ) {
    return "fatal"
  }

  // Default to intermittent (safe default - will retry)
  return "intermittent"
}
