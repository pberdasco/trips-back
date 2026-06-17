export function errorHandler (error, req, res, _next) {
  const status = error.status || 500;
  if (status >= 500) {
    console.error(`[req ${req.id || 'no-id'}] ERROR ${req.method} ${req.originalUrl} ${status}`);
    console.error(error);
  }
  res.status(status).json({
    message: error.message || 'Error interno del servidor'
  });
}
