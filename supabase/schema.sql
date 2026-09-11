-- Hyderabad Rent — Supabase schema
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;
create extension if not exists postgis;

create table if not exists public.rent_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('rent_report', 'listing', 'seeker')),
  listing_kind text not null default 'whole_flat' check (listing_kind in ('whole_flat', 'room')),
  locality text not null check (char_length(locality) between 2 and 100),
  bhk smallint not null check (bhk between 1 and 5),
  rent integer not null check (rent between 1000 and 1000000),
  deposit integer check (deposit is null or (deposit between 0 and 5000000)),
  furnishing text check (furnishing is null or furnishing in ('Furnished', 'Semi-furnished', 'Unfurnished')),
  gated boolean,
  maintenance_included boolean,
  availability text check (availability is null or availability in ('asap', 'next_month', 'flexible', 'occupied')),
  parking smallint check (parking is null or (parking between 0 and 5)),
  sqft integer check (sqft is null or (sqft between 100 and 20000)),
  building text,
  tenant_preference text,
  pets text,
  gender_preference text,
  food_preference text,
  smoking_preference text,
  notes text,
  lat double precision not null check (lat between 17.18 and 17.62),
  lng double precision not null check (lng between 78.16 and 78.70),
  location geography(Point, 4326) generated always as (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) stored,
  status text not null default 'active' check (status in ('active', 'hidden', 'expired')),
  is_verified boolean not null default false,
  moderation_status text not null default 'unreviewed' check (moderation_status in ('unreviewed', 'approved', 'rejected')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.entry_contacts (
  entry_id uuid primary key references public.rent_entries(id) on delete cascade,
  contact text not null check (char_length(contact) between 3 and 200),
  created_at timestamptz not null default now()
);

create table if not exists public.watch_areas (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  lat double precision not null check (lat between 17.18 and 17.62),
  lng double precision not null check (lng between 78.16 and 78.70),
  radius_km numeric(4,1) not null default 1 check (radius_km between 0.5 and 10),
  bhk smallint check (bhk is null or (bhk between 1 and 5)),
  max_rent integer check (max_rent is null or (max_rent between 1000 and 1000000)),
  listing_kind text check (listing_kind is null or listing_kind in ('whole_flat', 'room')),
  furnishing text check (furnishing is null or furnishing in ('Furnished', 'Semi-furnished', 'Unfurnished')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.entry_reports (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.rent_entries(id) on delete cascade,
  reason text not null check (reason in ('spam', 'duplicate', 'wrong_price', 'not_available', 'other')),
  details text,
  created_at timestamptz not null default now()
);

create index if not exists rent_entries_status_created_idx on public.rent_entries(status, created_at desc);
create index if not exists rent_entries_public_moderation_idx on public.rent_entries(status, moderation_status, created_at desc);
create index if not exists rent_entries_type_idx on public.rent_entries(entry_type);
create index if not exists rent_entries_locality_lower_idx on public.rent_entries(lower(locality));
create index if not exists rent_entries_bhk_rent_idx on public.rent_entries(bhk, rent);
create index if not exists rent_entries_lat_lng_idx on public.rent_entries(lat, lng);
create index if not exists rent_entries_location_gist_idx on public.rent_entries using gist(location);
create index if not exists watch_areas_expires_idx on public.watch_areas(expires_at);

alter table public.rent_entries enable row level security;
alter table public.entry_contacts enable row level security;
alter table public.watch_areas enable row level security;
alter table public.entry_reports enable row level security;

create or replace view public.rent_entries_public with (security_invoker = true) as
select id,entry_type,listing_kind,locality,bhk,rent,deposit,furnishing,gated,maintenance_included,availability,parking,sqft,building,tenant_preference,pets,gender_preference,food_preference,smoking_preference,notes,lat,lng,status,is_verified,moderation_status,created_at
from public.rent_entries
where status='active' and moderation_status in ('unreviewed','approved') and (expires_at is null or expires_at > now());
