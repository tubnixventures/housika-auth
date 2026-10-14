import { z } from 'zod';

export const CountryDeactivateParamSchema = z.object({
  id: z.string().min(2),
});

export type CountryDeactivateParam = z.infer<typeof CountryDeactivateParamSchema>;
