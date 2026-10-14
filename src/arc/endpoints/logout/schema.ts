import { z } from 'zod';

export const LogoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export type LogoutInput = z.infer<typeof LogoutSchema>;
