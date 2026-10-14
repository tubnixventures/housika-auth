import { z } from 'zod';

export const SignupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  phoneNumber: z.string().min(8).max(20),
  countryId: z.string().min(2),
  password: z.string().min(8).max(128),
  accountType: z.enum(['individual', 'company']),
  role: z.enum(['tenant', 'landlord', 'dual']).optional(),
  displayName: z.string().max(100).optional(),
});

export type SignupInput = z.infer<typeof SignupSchema>;
