import { z } from 'zod';

export const CountryUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  callingCode: z.string().min(2).max(8).optional(),
  currencyCode: z.string().length(3).toUpperCase().optional(),
  currencyName: z.string().min(2).max(50).optional(),
  listingFee: z.record(z.string(), z.number()).optional(),
  bookingFee: z.record(z.string(), z.number()).optional(),
  paymentGateway: z.object({
    providers: z.array(z.string()),
    default: z.string(),
  }).optional(),
});

export type CountryUpdateInput = z.infer<typeof CountryUpdateSchema>;
