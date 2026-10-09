import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import type { ApiErrorBody } from '@roopaank/shared';
import { AppError } from '../lib/errors.js';

function body(code: string, message: string, details?: unknown): ApiErrorBody {
  return { error: { code, message, ...(details !== undefined && { details }) } };
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json(body('ROUTE_NOT_FOUND', 'Route not found'));
};

/** Last middleware: every error leaves the API in the SPEC §7.1 shape, with no internals. */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    if (err.status >= 500) req.log.error({ err }, err.message);
    res.status(err.status).json(body(err.code, err.message, err.details));
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json(body('FILE_TOO_LARGE', 'Image must be 5 MB or smaller'));
    } else {
      res.status(400).json(body('INVALID_UPLOAD', 'Upload a single image in the "image" field'));
    }
    return;
  }

  // Errors raised by express.json() / express.raw().
  const type = (err as { type?: unknown }).type;
  if (type === 'entity.parse.failed') {
    res.status(400).json(body('INVALID_JSON', 'Request body is not valid JSON'));
    return;
  }
  if (type === 'entity.too.large') {
    res.status(413).json(body('PAYLOAD_TOO_LARGE', 'Request body is too large'));
    return;
  }

  req.log.error({ err }, 'Unhandled error');
  res.status(500).json(body('INTERNAL_ERROR', 'Something went wrong. Please try again.'));
};
