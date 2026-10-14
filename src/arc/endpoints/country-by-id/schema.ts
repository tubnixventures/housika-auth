import { z } from 'zod';

export const CountryParamSchema = z.object({
  id: z.string().min(2),
});

export type CountryParam = z.infer<typeof CountryParamSchema>;
