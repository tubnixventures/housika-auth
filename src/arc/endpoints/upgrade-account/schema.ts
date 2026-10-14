import { z } from 'zod';

export const UpgradeAccountSchema = z.object({
  targetRole: z.enum(['landlord', 'dual']),
  reason: z.string().max(200).optional(),
});

export type UpgradeAccountInput = z.infer<typeof UpgradeAccountSchema>;
