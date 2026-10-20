-- Run once in Supabase SQL Editor.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(), order_number bigserial unique,
  client_name text not null default '', phone text not null default '', car text not null default '',
  description text not null default '', status text not null default 'Новый', worker_id uuid,
  worker_name text not null default '', price numeric(12,2) not null default 0,
  data jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), completed_at timestamptz
);
alter table public.orders add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.orders add column if not exists created_by uuid references auth.users(id);
alter table public.orders add column if not exists worker_name text not null default '';
alter table public.orders enable row level security;
grant select, insert, update, delete on public.orders to authenticated;
grant usage, select on all sequences in schema public to authenticated;
drop policy if exists "Authenticated users can read orders" on public.orders;
drop policy if exists "Authenticated users can create orders" on public.orders;
drop policy if exists "Authenticated users can update orders" on public.orders;
drop policy if exists "Authenticated users can delete orders" on public.orders;
create policy "Authenticated users can read orders" on public.orders for select to authenticated using (true);
create policy "Authenticated users can create orders" on public.orders for insert to authenticated with check (auth.uid() = created_by);
create policy "Authenticated users can update orders" on public.orders for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete orders" on public.orders for delete to authenticated using (true);
