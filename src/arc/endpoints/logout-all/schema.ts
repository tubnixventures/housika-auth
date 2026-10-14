import { z } from 'zod';

export const LogoutAllSchema = z.object({
  reason: z.string().max(100).optional(),
});

export type LogoutAllInput = z.infer<typeof LogoutAllSchema>;
