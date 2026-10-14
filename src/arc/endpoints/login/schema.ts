import { z } from 'zod';

export const LoginSchema = z.object({
  identifier: z.string().min(3).max(255),
  password: z.string().min(1).max(128),
});

export type LoginInput = z.infer<typeof LoginSchema>;
