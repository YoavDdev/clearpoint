create index if not exists vod_files_user_id_camera_id_timestamp_idx
on public.vod_files (user_id, camera_id, "timestamp");
