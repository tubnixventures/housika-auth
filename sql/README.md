# Housika D1 Database Architecture (1 Database : 1 Table)

Each table lives in its own isolated Cloudflare D1 database instance.

## D1 Databases and Migration Order

| Database Name | D1 Binding | Migration File | Purpose |
|---------------|------------|----------------|---------|
| `housika-accounts` | `DB_ACCOUNTS` | `sql/accounts/0001_create_accounts.sql`<br>`sql/accounts/0002_google_oauth_support.sql` | Account credentials, Google SSO, roles, levels |
| `housika-profiles` | `DB_PROFILES` | `sql/profiles/0001_create_profiles.sql` | User profiles, display names, currencies |
| `housika-sessions` | `DB_SESSIONS` | `sql/sessions/0001_create_sessions.sql` | Refresh token hashes, session tracking |
| `housika-countries` | `DB_COUNTRIES` | `sql/countries/0001_create_countries.sql`<br>`sql/countries/0002_seed_countries.sql` | Country settings, fees, gateways |
| `housika-challenges` | `DB_CHALLENGES` | `sql/auth_challenges/0001_create_auth_challenges.sql` | OTP verification and password reset |
| `housika-audit` | `DB_AUDIT` | `sql/audit_events/0001_create_audit_events.sql` | Security audit trail and access logs |

## Applying Migrations with Wrangler CLI

### 1. Create Databases:
```bash
npx wrangler d1 create housika-accounts
npx wrangler d1 create housika-profiles
npx wrangler d1 create housika-sessions
npx wrangler d1 create housika-countries
npx wrangler d1 create housika-challenges
npx wrangler d1 create housika-audit
```

### 2. Run Migrations:
```bash
# Accounts
npx wrangler d1 execute housika-accounts --file=./sql/accounts/0001_create_accounts.sql
npx wrangler d1 execute housika-accounts --file=./sql/accounts/0002_google_oauth_support.sql

# Profiles
npx wrangler d1 execute housika-profiles --file=./sql/profiles/0001_create_profiles.sql

# Sessions
npx wrangler d1 execute housika-sessions --file=./sql/sessions/0001_create_sessions.sql

# Countries & Seed
npx wrangler d1 execute housika-countries --file=./sql/countries/0001_create_countries.sql
npx wrangler d1 execute housika-countries --file=./sql/countries/0002_seed_countries.sql

# Auth Challenges
npx wrangler d1 execute housika-challenges --file=./sql/auth_challenges/0001_create_auth_challenges.sql

# Audit Events
npx wrangler d1 execute housika-audit --file=./sql/audit_events/0001_create_audit_events.sql
```
