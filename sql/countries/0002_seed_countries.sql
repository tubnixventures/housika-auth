-- ==============================================================================
-- Housika Authentication System - Seed Countries
-- Canonical country records with verified codes, fees, and payment gateways
-- ==============================================================================

INSERT OR IGNORE INTO countries (
  id, name, iso2, iso3, calling_code, currency_code, currency_name,
  listing_fee, booking_fee, payment_gateway,
  is_active, account_count, created_by, updated_by, created_at, updated_at
) VALUES 
(
  'ctry_ke_01', 'Kenya', 'KE', 'KEN', '+254', 'KES', 'Kenyan Shilling',
  '{"residential":2500,"commercial":5000,"land":3500}',
  '{"residential":1000,"commercial":2000,"land":1500}',
  '{"providers":["mpesa","card","bank_transfer"],"default":"mpesa"}',
  1, 0, 'system_seed', 'system_seed', 1704067200, 1704067200
),
(
  'ctry_ug_02', 'Uganda', 'UG', 'UGA', '+256', 'UGX', 'Ugandan Shilling',
  '{"residential":75000,"commercial":150000,"land":100000}',
  '{"residential":30000,"commercial":60000,"land":45000}',
  '{"providers":["mtn_momo","airtel_money","card"],"default":"mtn_momo"}',
  1, 0, 'system_seed', 'system_seed', 1704067200, 1704067200
),
(
  'ctry_tz_03', 'Tanzania', 'TZ', 'TZA', '+255', 'TZS', 'Tanzanian Shilling',
  '{"residential":50000,"commercial":100000,"land":70000}',
  '{"residential":20000,"commercial":40000,"land":30000}',
  '{"providers":["mpesa","tigopesa","card"],"default":"mpesa"}',
  1, 0, 'system_seed', 'system_seed', 1704067200, 1704067200
),
(
  'ctry_rw_04', 'Rwanda', 'RW', 'RWA', '+250', 'RWF', 'Rwandan Franc',
  '{"residential":25000,"commercial":50000,"land":35000}',
  '{"residential":10000,"commercial":20000,"land":15000}',
  '{"providers":["mtn_momo","airtel_money","card"],"default":"mtn_momo"}',
  1, 0, 'system_seed', 'system_seed', 1704067200, 1704067200
),
(
  'ctry_ng_05', 'Nigeria', 'NG', 'NGA', '+234', 'NGN', 'Nigerian Naira',
  '{"residential":30000,"commercial":60000,"land":45000}',
  '{"residential":12000,"commercial":25000,"land":18000}',
  '{"providers":["paystack","flutterwave"],"default":"paystack"}',
  1, 0, 'system_seed', 'system_seed', 1704067200, 1704067200
),
(
  'ctry_za_06', 'South Africa', 'ZA', 'ZAF', '+27', 'ZAR', 'South African Rand',
  '{"residential":400,"commercial":800,"land":600}',
  '{"residential":150,"commercial":300,"land":220}',
  '{"providers":["ozow","payfast","card"],"default":"payfast"}',
  1, 0, 'system_seed', 'system_seed', 1704067200, 1704067200
),
(
  'ctry_uk_07', 'United Kingdom', 'GB', 'GBR', '+44', 'GBP', 'British Pound',
  '{"residential":25,"commercial":50,"land":35}',
  '{"residential":10,"commercial":20,"land":15}',
  '{"providers":["stripe","apple_pay","google_pay"],"default":"stripe"}',
  1, 0, 'system_seed', 'system_seed', 1704067200, 1704067200
),
(
  'ctry_us_08', 'United States', 'US', 'USA', '+1', 'USD', 'US Dollar',
  '{"residential":30,"commercial":60,"land":45}',
  '{"residential":12,"commercial":25,"land":18}',
  '{"providers":["stripe","apple_pay","google_pay"],"default":"stripe"}',
  1, 0, 'system_seed', 'system_seed', 1704067200, 1704067200
);
