import { randomUUID } from 'node:crypto';

const shouldLogRequest = (req) => req.path.startsWith('/api');

export function requestLogger (req, res, next) {
  req.id = randomUUID().slice(0, 8);

  if (!shouldLogRequest(req)) {
    next();
    return;
  }

  const startedAt = Date.now();
  console.info(`[req ${req.id}] ${req.method} ${req.originalUrl} start`);

  res.on('finish', () => {
    const elapsedMs = Date.now() - startedAt;
    const outcome = res.statusCode >= 400 ? 'failed' : 'ok';
    console.info(`[req ${req.id}] ${req.method} ${req.originalUrl} ${outcome} ${res.statusCode} ${elapsedMs}ms`);
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      const elapsedMs = Date.now() - startedAt;
      console.warn(`[req ${req.id}] ${req.method} ${req.originalUrl} closed ${elapsedMs}ms`);
    }
  });

  next();
}
