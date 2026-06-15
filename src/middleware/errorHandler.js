export function errorHandler (error, _req, res, _next) {
  const status = error.status || 500;
  if (status >= 500) {
    console.error(error);
  }
  res.status(status).json({
    message: error.message || 'Error interno del servidor'
  });
}
