create schema if not exists api;

grant usage on schema api to anon, authenticated, service_role;

create or replace view api.rent_entries
with (security_invoker = true)
as
select
  id, entry_type, listing_kind, locality, bhk, rent, deposit, furnishing,
  gated, maintenance_included, availability, parking, sqft, building,
  tenant_preference, pets, gender_preference, food_preference,
  smoking_preference, notes, lat, lng, status, is_verified,
  moderation_status, created_at, updated_at, expires_at
from public.rent_entries;

revoke all on api.rent_entries from public;
grant select on api.rent_entries to anon, authenticated, service_role;

create or replace view api.watch_areas
with (security_invoker = true)
as
select id, email, lat, lng, radius_km, created_at, expires_at,
       bhk, max_rent, listing_kind, furnishing
from public.watch_areas;

revoke all on api.watch_areas from public;
grant insert (email, lat, lng, radius_km, expires_at, bhk, max_rent, listing_kind, furnishing)
on api.watch_areas to anon, authenticated;
grant select, insert on api.watch_areas to service_role;

create or replace view api.entry_reports
with (security_invoker = true)
as
select id, entry_id, reason, details, created_at
from public.entry_reports;

revoke all on api.entry_reports from public;
grant insert (entry_id, reason, details) on api.entry_reports to anon, authenticated;
grant select, insert on api.entry_reports to service_role;

grant insert (
  entry_type, listing_kind, locality, bhk, rent, deposit, furnishing, gated,
  maintenance_included, availability, parking, sqft, building,
  tenant_preference, pets, gender_preference, food_preference,
  smoking_preference, notes, lat, lng, expires_at
) on public.rent_entries to anon, authenticated;

drop policy if exists rent_entries_public_insert on public.rent_entries;
create policy rent_entries_public_insert
on public.rent_entries
for insert
to anon, authenticated
with check (
  status = 'active'
  and is_verified = false
  and moderation_status = 'unreviewed'
  and (expires_at is null or expires_at > now())
);

grant insert (entry_id, contact) on public.entry_contacts to anon, authenticated;

drop policy if exists entry_contacts_public_insert on public.entry_contacts;
create policy entry_contacts_public_insert
on public.entry_contacts
for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.rent_entries e
    where e.id = entry_id
      and e.status = 'active'
      and e.moderation_status = 'unreviewed'
  )
);

create or replace function api.submit_rent_entry(
  p_entry_type text,
  p_listing_kind text,
  p_locality text,
  p_bhk smallint,
  p_rent integer,
  p_deposit integer,
  p_furnishing text,
  p_gated boolean,
  p_maintenance_included boolean,
  p_availability text,
  p_parking smallint,
  p_sqft integer,
  p_building text,
  p_tenant_preference text,
  p_pets text,
  p_gender_preference text,
  p_food_preference text,
  p_smoking_preference text,
  p_notes text,
  p_lat double precision,
  p_lng double precision,
  p_expires_at timestamptz,
  p_contact text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.rent_entries (
    entry_type, listing_kind, locality, bhk, rent, deposit, furnishing, gated,
    maintenance_included, availability, parking, sqft, building,
    tenant_preference, pets, gender_preference, food_preference,
    smoking_preference, notes, lat, lng, expires_at
  ) values (
    p_entry_type, p_listing_kind, p_locality, p_bhk, p_rent, p_deposit,
    p_furnishing, p_gated, p_maintenance_included, p_availability,
    p_parking, p_sqft, p_building, p_tenant_preference, p_pets,
    p_gender_preference, p_food_preference, p_smoking_preference,
    p_notes, p_lat, p_lng, p_expires_at
  )
  returning id into new_id;

  if p_contact is not null and length(trim(p_contact)) > 0 then
    insert into public.entry_contacts(entry_id, contact)
    values (new_id, left(trim(p_contact), 200));
  end if;

  return new_id;
end;
$$;

revoke all on function api.submit_rent_entry(text,text,text,smallint,integer,integer,text,boolean,boolean,text,smallint,integer,text,text,text,text,text,text,text,double precision,double precision,timestamptz,text) from public;
grant execute on function api.submit_rent_entry(text,text,text,smallint,integer,integer,text,boolean,boolean,text,smallint,integer,text,text,text,text,text,text,text,double precision,double precision,timestamptz,text) to anon, authenticated;

revoke execute on function public.submit_rent_entry(jsonb,text) from public, anon, authenticated;
revoke execute on function public.submit_rent_entry(text,text,text,smallint,integer,integer,text,boolean,boolean,text,smallint,integer,text,text,text,text,text,text,text,double precision,double precision,timestamptz,text) from public, anon, authenticated;

alter role authenticator set pgrst.db_schemas = 'public, api';
notify pgrst, 'reload config';
