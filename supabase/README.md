# Supabase Migrations

## Workflow

1. When making DB schema changes, create a new file in `migrations/` with format:  
   `YYYYMMDD_description.sql`

2. Apply the migration manually in Supabase Dashboard (SQL Editor)

3. Commit the migration file — it serves as documentation and allows reproducing the schema

## Notes

- We do NOT use `supabase db push` or Supabase CLI migrations (yet)
- Migrations are applied manually and tracked here for reference
- Each file should be idempotent (use `IF NOT EXISTS`, `IF EXISTS`)
