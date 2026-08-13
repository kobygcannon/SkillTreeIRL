-- Supabase projects created with auto_expose_new_tables=false require explicit SQL grants.
grant usage on schema public,private to service_role;
grant all privileges on all tables in schema public,private to service_role;
grant all privileges on all sequences in schema public,private to service_role;
grant execute on all functions in schema public,private to service_role;
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant all privileges on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
alter default privileges in schema private grant all privileges on tables to service_role;
alter default privileges in schema private grant all privileges on sequences to service_role;
alter default privileges in schema private grant execute on functions to service_role;
