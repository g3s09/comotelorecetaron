create table if not exists public.site_catalog (
  id text primary key check (id = 'public'),
  data jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.site_catalog enable row level security;

insert into storage.buckets (id, name, public)
values ('ctlr-images', 'ctlr-images', true)
on conflict (id) do update set public = true;
