/**
 * An expected, client-facing error. The error handler turns it into the SPEC §7.1 shape:
 * `{ error: { code, message, details } }`. Anything that is not an AppError becomes a
 * generic 500 so internals never leak.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new AppError(400, code, message, details);
export const unauthorized = (message = 'Please log in to continue') => new AppError(401, 'UNAUTHENTICATED', message);
export const forbidden = (message = 'You do not have access to this resource') =>
  new AppError(403, 'FORBIDDEN', message);
export const notFound = (code: string, message: string) => new AppError(404, code, message);
export const conflict = (code: string, message: string, details?: unknown) => new AppError(409, code, message, details);
