/**
 * Centralized error-handling middleware.
 * Ensures consistent JSON response structure and prevents leaking stack traces or credentials.
 */
export function errorHandler(err, _req, res, _next) {
  // Log error on server side for debugging
  console.error('[Error]', err.message || err);

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join('; ') || 'Validation error',
      data: null
    });
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid format for ${err.path}: ${err.value}`,
      data: null
    });
  }

  // Handle duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'A duplicate record was detected.',
      data: null
    });
  }

  // Handle custom status codes or default to 500
  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : (err.message || 'Request failed');

  return res.status(statusCode).json({
    success: false,
    message,
    data: null
  });
}

/**
 * 404 Route Not Found handler
 */
export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    data: null
  });
}
