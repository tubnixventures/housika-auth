import { Hono } from 'hono';
import { AUTH_ENDPOINTS } from './registry-auth.ts';
import { RECOVERY_ENDPOINTS } from './registry-recovery.ts';
import { COUNTRY_ENDPOINTS } from './registry-countries.ts';
import type { ApiDocRegistry } from './schema.ts';

export const docsRoute = new Hono();

const registry: ApiDocRegistry = {
  title: 'Housika Authentication API Reference',
  version: '1.0.0',
  description: 'Production-ready Cloudflare Workers backend for Housika Authentication',
  baseUrl: 'https://auth.housika.co.ke',
  endpoints: [...AUTH_ENDPOINTS, ...RECOVERY_ENDPOINTS, ...COUNTRY_ENDPOINTS],
};

docsRoute.get('/', (c) => {
  const accept = c.req.header('Accept') || '';
  if (accept.includes('application/json')) {
    return c.json(registry);
  }

  // Format machine-readable text representation
  let text = `================================================================================\n`;
  text += `${registry.title} (v${registry.version})\n`;
  text += `${registry.description}\n`;
  text += `Base URL: ${registry.baseUrl}\n`;
  text += `================================================================================\n\n`;

  for (const ep of registry.endpoints) {
    text += `[${ep.method}] ${ep.path}\n`;
    text += `Purpose: ${ep.purpose}\n`;
    text += `Auth Required: ${ep.authRequired ? 'YES' : 'NO'}\n`;
    if (ep.requiredRoleOrLevel) text += `Access Level: ${ep.requiredRoleOrLevel}\n`;
    if (ep.rateLimit) text += `Rate Limit: ${ep.rateLimit}\n`;
    if (ep.securityNotes) text += `Security: ${ep.securityNotes}\n`;
    text += `Status Codes: ${JSON.stringify(ep.statusCodes)}\n`;
    if (ep.requestBody) text += `Request Body: ${JSON.stringify(ep.requestBody, null, 2)}\n`;
    text += `--------------------------------------------------------------------------------\n\n`;
  }

  c.header('Content-Type', 'text/plain; charset=utf-8');
  return c.text(text);
});
