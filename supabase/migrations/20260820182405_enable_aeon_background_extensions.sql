-- 20260820182405_enable_aeon_background_extensions.sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_net" with schema "extensions";
create extension if not exists "pg_cron" with schema "pg_catalog";
create extension if not exists "pg_stat_statements" with schema "extensions";
