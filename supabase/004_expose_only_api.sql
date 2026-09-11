-- Keep PostGIS and internal tables out of the Data API surface.
-- The application uses lib/supabase-server.ts with db.schema = "api".
alter role authenticator set pgrst.db_schemas = 'api';
notify pgrst, 'reload config';
