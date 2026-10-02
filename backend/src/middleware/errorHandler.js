import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);

  // Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: formattedErrors,
    });
  }

  // MySQL Duplicate Key Error (ER_DUP_ENTRY: 1062)
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate record error: A record with this unique identifier already exists.',
      details: err.sqlMessage,
    });
  }

  // MySQL Foreign Key Constraint Error (ER_ROW_IS_REFERENCED_2: 1451)
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
    return res.status(409).json({
      success: false,
      error: 'Cannot delete or modify record because it is referenced by existing circulation or financial records.',
    });
  }

  // Custom Business Logic / Known Bad Request
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Default Internal Server Error (without exposing raw stack traces in responses)
  const isDev = process.env.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    error: 'An internal server error occurred. Please contact the administrator.',
    message: isDev ? err.message : undefined,
  });
}
