-- Cattle master (friendly name is unique ID)
create table if not exists cattle (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  breed text,
  category text not null check (category in ('cow', 'buffalo')),
  custom_fields jsonb default '{}',
  active boolean default true,
  created_at timestamptz default now()
);

-- Daily milk per cattle
create table if not exists cattle_milk_entries (
  id uuid primary key default gen_random_uuid(),
  cattle_id uuid references cattle(id) on delete cascade,
  date date not null,
  morning_litres numeric default 0,
  evening_litres numeric default 0,
  total_litres numeric generated always as (morning_litres + evening_litres) stored,
  notes text,
  created_at timestamptz default now(),
  unique(cattle_id, date)
);

alter table cattle enable row level security;
alter table cattle_milk_entries enable row level security;

create policy "Auth users on cattle" on cattle
  for all to authenticated using (true) with check (true);

create policy "Auth users on cattle_milk_entries" on cattle_milk_entries
  for all to authenticated using (true) with check (true);
