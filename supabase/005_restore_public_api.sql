-- Restore the proven public-schema API path for the beta.
-- App tables remain protected by their existing RLS policies and narrow grants.
alter role authenticator set pgrst.db_schemas = 'public';

-- Keep the legacy JSON overload unavailable.
revoke all on function public.submit_rent_entry(jsonb, text)
from public, anon, authenticated;

-- Re-enable only the validated full-argument submission RPC used by the app.
grant execute on function public.submit_rent_entry(
  text, text, text, smallint, integer, integer, text, boolean, boolean,
  text, smallint, integer, text, text, text, text, text, text, text,
  double precision, double precision, timestamptz, text
) to anon, authenticated;

notify pgrst, 'reload config';
notify pgrst, 'reload schema';
