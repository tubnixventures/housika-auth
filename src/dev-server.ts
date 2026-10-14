import type { Plugin } from 'vite';
import { app } from './index.ts';

export function honoDevPlugin(): Plugin {
  return {
    name: 'hono-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (
          url.startsWith('/doc') ||
          url.startsWith('/health') ||
          url.startsWith('/auth') ||
          url.startsWith('/countries') ||
          url.startsWith('/.well-known')
        ) {
          try {
            const host = req.headers.host || 'localhost:3000';
            const headers = new Headers();
            for (const [k, v] of Object.entries(req.headers)) {
              if (v) headers.set(k, Array.isArray(v) ? v.join(',') : v);
            }
            let bodyBuffer: Buffer | undefined;
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              const chunks: Buffer[] = [];
              for await (const chunk of req) chunks.push(Buffer.from(chunk));
              bodyBuffer = Buffer.concat(chunks);
            }
            const fetchReq = new Request(`http://${host}${url}`, {
              method: req.method,
              headers,
              body: bodyBuffer && bodyBuffer.length > 0 ? new Uint8Array(bodyBuffer) : undefined,
            });
            const response = await app.fetch(fetchReq, process.env as unknown as Record<string, unknown>);
            res.statusCode = response.status;
            response.headers.forEach((val, key) => res.setHeader(key, val));
            const respBuf = Buffer.from(await response.arrayBuffer());
            res.end(respBuf);
            return;
          } catch (e) {
            console.error('API Error in dev server:', e);
          }
        }
        next();
      });
    },
  };
}
