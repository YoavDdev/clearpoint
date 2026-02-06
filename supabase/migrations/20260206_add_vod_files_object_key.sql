alter table public.vod_files
add column if not exists object_key text;
