import { Hono } from 'hono';
import { authMiddleware } from '../../../middleware/auth.ts';
import { sendError } from '../../../utils/response.ts';
import type { Bindings } from '../../../types/env.ts';

export const phoneVerifyRoute = new Hono<{ Bindings: Bindings }>();

phoneVerifyRoute.post('/', authMiddleware, async (c) => {
  return sendError(
    c,
    'Phone and SMS verification service is currently inactive. You can link your phone directly via POST /auth/phone/link.',
    400,
    'PHONE_VERIFICATION_INACTIVE'
  );
});
