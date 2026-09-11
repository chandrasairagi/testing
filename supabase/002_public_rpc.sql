-- Public beta access model using Supabase's publishable key.
alter table public.rent_entries enable row level security;
alter table public.entry_contacts enable row level security;
alter table public.watch_areas enable row level security;
alter table public.entry_reports enable row level security;

drop policy if exists rent_entries_public_select on public.rent_entries;
create policy rent_entries_public_select on public.rent_entries for select to anon, authenticated using (
  status='active' and moderation_status in ('unreviewed','approved') and (expires_at is null or expires_at > now())
);
grant select on table public.rent_entries to anon, authenticated;
revoke insert, update, delete on table public.rent_entries from anon, authenticated;
revoke all on table public.entry_contacts from anon, authenticated;

create or replace function public.submit_rent_entry(
  p_entry_type text,
  p_listing_kind text,
  p_locality text,
  p_bhk smallint,
  p_rent integer,
  p_deposit integer default null,
  p_furnishing text default null,
  p_gated boolean default null,
  p_maintenance_included boolean default null,
  p_availability text default null,
  p_parking smallint default null,
  p_sqft integer default null,
  p_building text default null,
  p_tenant_preference text default null,
  p_pets text default null,
  p_gender_preference text default null,
  p_food_preference text default null,
  p_smoking_preference text default null,
  p_notes text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_expires_at timestamptz default null,
  p_contact text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin
  if p_entry_type not in ('rent_report','listing','seeker') then raise exception 'invalid entry type'; end if;
  if p_listing_kind not in ('whole_flat','room') then raise exception 'invalid listing kind'; end if;
  if p_contact is not null and char_length(trim(p_contact)) not between 3 and 200 then raise exception 'invalid contact'; end if;

  insert into public.rent_entries(
    entry_type,listing_kind,locality,bhk,rent,deposit,furnishing,gated,maintenance_included,
    availability,parking,sqft,building,tenant_preference,pets,gender_preference,food_preference,
    smoking_preference,notes,lat,lng,expires_at,status,is_verified,moderation_status
  ) values (
    p_entry_type,p_listing_kind,trim(p_locality),p_bhk,p_rent,p_deposit,p_furnishing,p_gated,
    p_maintenance_included,p_availability,p_parking,p_sqft,nullif(trim(p_building),''),
    nullif(trim(p_tenant_preference),''),nullif(trim(p_pets),''),nullif(trim(p_gender_preference),''),
    nullif(trim(p_food_preference),''),nullif(trim(p_smoking_preference),''),nullif(trim(p_notes),''),
    p_lat,p_lng,p_expires_at,'active',false,'unreviewed'
  ) returning id into new_id;

  if p_contact is not null and trim(p_contact)<>'' then
    insert into public.entry_contacts(entry_id,contact) values(new_id,trim(p_contact));
  end if;
  return new_id;
end;
$$;

revoke all on function public.submit_rent_entry(text,text,text,smallint,integer,integer,text,boolean,boolean,text,smallint,integer,text,text,text,text,text,text,text,double precision,double precision,timestamptz,text) from public;
grant execute on function public.submit_rent_entry(text,text,text,smallint,integer,integer,text,boolean,boolean,text,smallint,integer,text,text,text,text,text,text,text,double precision,double precision,timestamptz,text) to anon, authenticated;

drop policy if exists watch_areas_public_insert on public.watch_areas;
revoke all on table public.watch_areas from anon, authenticated;
grant insert(email,lat,lng,radius_km,expires_at,bhk,max_rent,listing_kind,furnishing) on table public.watch_areas to anon, authenticated;
create policy watch_areas_public_insert on public.watch_areas for insert to anon, authenticated with check(expires_at>now());

drop policy if exists entry_reports_public_insert on public.entry_reports;
revoke all on table public.entry_reports from anon, authenticated;
grant insert(entry_id,reason,details) on table public.entry_reports to anon, authenticated;
create policy entry_reports_public_insert on public.entry_reports for insert to anon, authenticated with check (
  exists(select 1 from public.rent_entries e where e.id=entry_id and e.status='active' and e.moderation_status in ('unreviewed','approved'))
);
