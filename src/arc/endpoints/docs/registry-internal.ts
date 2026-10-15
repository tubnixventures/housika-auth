import type { EndpointDoc } from './schema.ts';

export const INTERNAL_ENDPOINTS: EndpointDoc[] = [
  {
    method: 'POST',
    path: '/auth/internal/staff',
    purpose: 'Provision verified Housika platform staff account (Admin backend only)',
    authRequired: true,
    headers: { 'X-Internal-Service-Key': '<INTERNAL_SERVICE_KEY>' },
    requestBody: {
      name: 'string (2-100 chars)',
      email: 'string (valid email)',
      phoneNumber: 'string (optional, 8-20 digits)',
      countryId: 'string (defaults to ctry_ke_01)',
      password: 'string (min 8 chars)',
      role: "'ceo' | 'admin' | 'manager' | 'customercare' (root prohibited)",
    },
    statusCodes: {
      201: 'Staff account created with account_type=housika and authoritative level',
      400: 'Weak password or validation failure',
      401: 'Invalid service credential',
      409: 'Email exists',
    },
    isIdempotent: false,
    securityNotes: 'Authenticated by pre-shared INTERNAL_SERVICE_KEY, not user JWT. Root role prohibited.',
  },
];
