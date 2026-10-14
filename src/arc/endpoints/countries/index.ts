import { Hono } from 'hono';
import { queryAll } from '../../../utils/d1.ts';
import { sendSuccess, sendError } from '../../../utils/response.ts';
import type { Bindings } from '../../../types/env.ts';

export const countriesRoute = new Hono<{ Bindings: Bindings }>();

interface DbCountryRow {
  id: string;
  name: string;
  iso2: string;
  iso3: string;
  calling_code: string;
  currency_code: string;
  currency_name: string;
  listing_fee: string;
  booking_fee: string;
  payment_gateway: string;
}

countriesRoute.get('/', async (c) => {
  const { DB_COUNTRIES } = c.env;
  if (!DB_COUNTRIES) {
    return sendError(c, 'Database configuration error', 500, 'SERVER_ERROR');
  }

  const rows = await queryAll<DbCountryRow>(
    DB_COUNTRIES,
    `SELECT id, name, iso2, iso3, calling_code, currency_code, currency_name, listing_fee, booking_fee
     FROM countries WHERE is_active = 1 ORDER BY name ASC`
  );

  const countries = rows.map((r) => {
    let listingFee = {};
    let bookingFee = {};
    try {
      listingFee = JSON.parse(r.listing_fee);
      bookingFee = JSON.parse(r.booking_fee);
    } catch {
      // fallback
    }

    return {
      id: r.id,
      name: r.name,
      iso2: r.iso2,
      iso3: r.iso3,
      callingCode: r.calling_code,
      currencyCode: r.currency_code,
      currencyName: r.currency_name,
      listingFee,
      bookingFee,
    };
  });

  c.header('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  return sendSuccess(c, { countries });
});
