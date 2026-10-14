import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { registerRoutes } from './routes.ts';
import { sendError } from './utils/response.ts';
import { AppError } from './utils/errors.ts';
import { captureSystemError } from './utils/error-logger.ts';
import { securityHeadersMiddleware } from './middleware/security-headers.ts';
import { analyticsMiddleware } from './middleware/analytics.ts';
import { globalRateLimit } from './middleware/rate-limit.ts';
import type { Bindings } from './types/env.ts';

const app = new Hono<{ Bindings: Bindings }>();

// 1. Enterprise Defense-in-depth security headers & distributed trace ID
app.use('*', securityHeadersMiddleware);

// 2. Security and CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Content-Length', 'X-Housika-Trace-Id'],
  maxAge: 86400,
}));

// 3. Real-time Cloudflare Analytics Engine request logging
app.use('*', analyticsMiddleware);

// 4. Global Cloudflare KV rate limiting against brute force attacks
app.use('*', globalRateLimit(120, 60));

// Root and health endpoints
app.get('/', (c) => c.text('Housika Authentication API (Cloudflare Workers)\nDocumentation available at /doc'));
app.get('/health', (c) => c.json({ status: 'ok', service: 'housika-auth', timestamp: Math.floor(Date.now() / 1000) }));

// Centralized route registration
registerRoutes(app);

// Global Developer Diagnostic & Resilient Error Handler
app.onError(async (err, c) => {
  const traceId = (c.get('traceId') as string) || c.req.header('cf-ray') || null;
  const ip = c.req.header('cf-connecting-ip') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'unknown';

  const logPromise = captureSystemError(c.env?.DB_AUDIT, c.env?.ANALYTICS, {
    error: err, path: c.req.path, method: c.req.method, traceId, ipAddress: ip, userAgent
  });

  if (c.executionCtx?.waitUntil) {
    c.executionCtx.waitUntil(logPromise);
  } else {
    await logPromise.catch(() => {});
  }

  if (err instanceof AppError) {
    return sendError(c, err.message, err.statusCode, err.code, err.details);
  }
  return sendError(c, 'An internal server error occurred', 500, 'INTERNAL_SERVER_ERROR');
});

// 404 Not Found Handler
app.notFound((c) => sendError(c, `Route not found: ${c.req.method} ${c.req.path}`, 404, 'NOT_FOUND'));

export { app };
export default app;
