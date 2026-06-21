-- Multiple-user delivery workflow and audit logging.
-- Run this after 007_product_sales.sql.

create table if not exists daily_entry_sessions (
  date date primary key,
  status text not null default 'locked' check (status in ('locked', 'unlocked', 'finalized')),
  unlocked_by uuid,
  unlocked_by_email text,
  unlocked_at timestamptz,
  locked_by uuid,
  locked_by_email text,
  locked_at timestamptz,
  finalized_by uuid,
  finalized_by_email text,
  finalized_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists daily_entry_drafts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  date date not null,
  morning_qty numeric default 0,
  evening_qty numeric default 0,
  rate numeric not null,
  delivered boolean default true,
  updated_by uuid,
  updated_by_email text,
  updated_at timestamptz default now(),
  unique(customer_id, date)
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  entity_date date,
  details jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists daily_entry_drafts_date_idx on daily_entry_drafts(date);
create index if not exists activity_logs_created_at_idx on activity_logs(created_at desc);
create index if not exists activity_logs_user_id_idx on activity_logs(user_id);
create index if not exists activity_logs_entity_idx on activity_logs(entity_type, entity_date);

alter table daily_entry_sessions enable row level security;
alter table daily_entry_drafts enable row level security;
alter table activity_logs enable row level security;

drop policy if exists "Auth users read daily_entry_sessions" on daily_entry_sessions;
drop policy if exists "Auth users read daily_entry_drafts" on daily_entry_drafts;
drop policy if exists "Auth users read activity_logs" on activity_logs;

create policy "Auth users read daily_entry_sessions" on daily_entry_sessions
  for select to authenticated using (true);

create policy "Auth users read daily_entry_drafts" on daily_entry_drafts
  for select to authenticated using (true);

create policy "Auth users read activity_logs" on activity_logs
  for select to authenticated using (true);

update activity_logs
set entity_type = 'deliveries'
where entity_type in ('daily_entry_session', 'daily_entry', 'daily_entries', 'delivery')
  or action like 'daily_entry_%';

create or replace function activity_log_entity_date(row_data jsonb)
returns date
language plpgsql
stable
as $$
declare
  raw_value text;
begin
  raw_value := coalesce(
    row_data ->> 'date',
    row_data ->> 'period_start',
    left(row_data ->> 'paid_at', 10),
    left(row_data ->> 'sent_at', 10),
    left(row_data ->> 'created_at', 10)
  );

  if raw_value is null or raw_value = '' then
    return null;
  end if;

  return raw_value::date;
exception
  when others then
    return null;
end;
$$;

create or replace function activity_log_changed_fields(old_data jsonb, new_data jsonb)
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(key order by key), '[]'::jsonb)
  from (
    select key
    from jsonb_object_keys(old_data || new_data) as keys(key)
    where coalesce(old_data -> key, 'null'::jsonb) is distinct from coalesce(new_data -> key, 'null'::jsonb)
  ) changed;
$$;

create or replace function log_table_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_data jsonb;
  new_data jsonb;
  row_data jsonb;
  entity_id text;
  module_name text;
begin
  old_data := case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else '{}'::jsonb end;
  new_data := case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else '{}'::jsonb end;
  row_data := case when TG_OP = 'DELETE' then old_data else new_data end;
  entity_id := coalesce(row_data ->> 'id', row_data ->> 'customer_id', row_data ->> 'bill_id');
  module_name := coalesce(TG_ARGV[0], TG_TABLE_NAME);

  insert into activity_logs (
    user_id,
    user_email,
    action,
    entity_type,
    entity_id,
    entity_date,
    details
  ) values (
    auth.uid(),
    coalesce(nullif(auth.jwt() ->> 'email', ''), nullif(auth.jwt() ->> 'sub', '')),
    module_name || '_' || lower(TG_OP),
    module_name,
    entity_id,
    activity_log_entity_date(row_data),
    jsonb_build_object(
      'module', module_name,
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'changedFields', case
        when TG_OP = 'UPDATE' then activity_log_changed_fields(old_data, new_data)
        when TG_OP = 'INSERT' then to_jsonb(array['created']::text[])
        else to_jsonb(array['deleted']::text[])
      end,
      'before', case when TG_OP in ('UPDATE', 'DELETE') then old_data else null end,
      'after', case when TG_OP in ('INSERT', 'UPDATE') then new_data else null end
    )
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

drop trigger if exists log_customers_activity on customers;
create trigger log_customers_activity
  after insert or update or delete on customers
  for each row execute function log_table_activity('customers');

drop trigger if exists log_daily_entries_activity on daily_entries;
create trigger log_daily_entries_activity
  after insert or update or delete on daily_entries
  for each row execute function log_table_activity('deliveries');

drop trigger if exists log_milk_production_activity on milk_production;
create trigger log_milk_production_activity
  after insert or update or delete on milk_production
  for each row execute function log_table_activity('production');

drop trigger if exists log_cattle_activity on cattle;
create trigger log_cattle_activity
  after insert or update or delete on cattle
  for each row execute function log_table_activity('cattle');

drop trigger if exists log_cattle_milk_entries_activity on cattle_milk_entries;
create trigger log_cattle_milk_entries_activity
  after insert or update or delete on cattle_milk_entries
  for each row execute function log_table_activity('production');

drop trigger if exists log_bills_activity on bills;
create trigger log_bills_activity
  after insert or update or delete on bills
  for each row execute function log_table_activity('bills');

drop trigger if exists log_payments_activity on payments;
create trigger log_payments_activity
  after insert or update or delete on payments
  for each row execute function log_table_activity('payments');

drop trigger if exists log_expenses_activity on expenses;
create trigger log_expenses_activity
  after insert or update or delete on expenses
  for each row execute function log_table_activity('expenses');

drop trigger if exists log_products_activity on products;
create trigger log_products_activity
  after insert or update or delete on products
  for each row execute function log_table_activity('products');

drop trigger if exists log_product_sales_activity on product_sales;
create trigger log_product_sales_activity
  after insert or update or delete on product_sales
  for each row execute function log_table_activity('sales');

drop trigger if exists log_reminders_activity on reminders;
create trigger log_reminders_activity
  after insert or update or delete on reminders
  for each row execute function log_table_activity('reminders');
