export interface EndpointDoc {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  purpose: string;
  authRequired: boolean;
  requiredRoleOrLevel?: string;
  headers?: Record<string, string>;
  requestBody?: Record<string, unknown>;
  responseExample?: Record<string, unknown>;
  statusCodes: Record<number, string>;
  isIdempotent: boolean;
  rateLimit?: string;
  securityNotes?: string;
}

export interface ApiDocRegistry {
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  endpoints: EndpointDoc[];
}
