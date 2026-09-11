# Hyderabad Rent

Hyderabad-only rental transparency and direct discovery built with Next.js, Google Maps/Places and Supabase.

## Beta features

- Google Maps + Hyderabad-restricted Places autocomplete
- Shared Supabase rent reports, whole-flat/room listings and seeker pins
- BHK / rent / furnishing / gated / Metro / availability filters
- Map + results list interaction
- Viewport-based data loading
- Locality pages such as `/rent/gachibowli`
- Entry detail/share pages
- Above/below-local-median rent context
- Nearest Metro reference distance
- Basic seeker/listing matching
- Watch-area saved searches with BHK, budget, type and furnishing filters
- Abuse reporting, duplicate checks, server-side validation and basic rate limiting
- Private contact storage in a separate table
- Moderation status (`unreviewed`, `approved`, `rejected`)
- Privacy + beta terms pages
- PostGIS indexes for geographic scaling

## Architecture

```text
Browser
  |
  v
Next.js on Vercel
  |-- Google Maps + Places
  |
  `-- /api/* server routes
         |
         v
      Supabase
      PostgreSQL + PostGIS + RLS
```

The app uses Supabase's **publishable** key. It does not need a service-role key. Public reads are protected by Row Level Security. New rental entries + private contact details are written atomically through the narrowly scoped `submit_rent_entry` database function. Public APIs never select `entry_contacts`.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_GOOGLE_MAP_ID=DEMO_MAP_ID
SUPABASE_URL=https://bagenddjwtyriuztrhop.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_vvGXcCs_Wc1r1YndWGqXSQ_txy1eAXh
RATE_LIMIT_SALT=...
```

The Supabase URL/publishable key are public project coordinates and may be committed. Database security is enforced by RLS. Never add a Supabase service-role key to browser code.

## Google Cloud

Enable:

- Maps JavaScript API
- Places API (New)

For local development allow `http://localhost:3000/*`. For production, restrict the browser key to the final Vercel/custom domain and restrict it to the Maps/Places APIs actually used.

## Supabase

The connected `Hydrabad Rent` project already has PostGIS, the core tables, moderation fields, watch filters, RLS and the public submission RPC.

Canonical SQL is under `supabase/`.

Tables:

- `rent_entries` — public map/listing data
- `entry_contacts` — private phone/email details
- `watch_areas` — private saved searches
- `entry_reports` — private abuse reports

## Deployment

1. Push to GitHub.
2. Import the repo into Vercel.
3. Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and optionally your production Google Map ID.
4. Set `NEXT_PUBLIC_SITE_URL` to the Vercel/custom-domain URL.
5. Deploy and verify `/api/health`.
6. Test search, rent submission, listing, seeker, watch and report flows.
7. Restrict the Google Maps browser key to the final domain.

## Before a broad public launch

The beta includes validation, duplicate detection, lightweight rate limiting and abuse reports. Before large anonymous traffic, add CAPTCHA/Turnstile and a distributed rate limiter.

## Post-beta

- Email delivery for watch alerts
- Listing photo uploads
- Dedicated moderation dashboard
- Full commute-time/routing calculations
- Authentication/accounts
