create table if not exists public.site_catalog (
  id text primary key check (id = 'public'),
  data jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.site_catalog enable row level security;

create table if not exists public.reservations (
  id text primary key,
  name text not null,
  phone text not null,
  date date not null,
  time time not null,
  people text not null,
  area text not null check (area in ('Balcon', 'Terraza', 'Salon')),
  note text not null default '',
  status text not null default 'pendiente',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.reservations enable row level security;

insert into storage.buckets (id, name, public)
values ('ctlr-images', 'ctlr-images', true)
on conflict (id) do update set public = true;
