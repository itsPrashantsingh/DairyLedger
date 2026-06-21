-- Customers
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp_no text not null,
  address text,
  gstin text,
  rate numeric default 83,
  morning_qty numeric default 0,
  evening_qty numeric default 0,
  custom_fields jsonb default '{}',
  active boolean default true,
  created_at timestamptz default now()
);

-- Daily milk delivery entries (per customer)
create table daily_entries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  date date not null,
  morning_qty numeric default 0,
  evening_qty numeric default 0,
  total_qty numeric generated always as (morning_qty + evening_qty) stored,
  rate numeric not null,
  amount numeric generated always as ((morning_qty + evening_qty) * rate) stored,
  notes text,
  created_at timestamptz default now(),
  unique(customer_id, date)
);

-- Total milk produced at dairy (legacy — use cattle_milk_entries instead)
create table milk_production (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  morning_litres numeric default 0,
  evening_litres numeric default 0,
  total_litres numeric generated always as (morning_litres + evening_litres) stored,
  notes text,
  created_at timestamptz default now()
);

-- Cattle master
create table cattle (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  breed text,
  category text not null check (category in ('cow', 'buffalo')),
  custom_fields jsonb default '{}',
  active boolean default true,
  created_at timestamptz default now()
);

-- Daily milk per cattle
create table cattle_milk_entries (
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

-- Bills
create table bills (
  id text primary key,
  customer_id uuid references customers(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  total_litres numeric not null,
  subtotal numeric,
  cgst numeric default 0,
  sgst numeric default 0,
  igst numeric default 0,
  gst_rate numeric default 0,
  total_amount numeric not null,
  paid boolean default false,
  paid_at timestamptz,
  payment_mode text,
  razorpay_link_id text,
  razorpay_short_url text,
  sent_at timestamptz,
  created_at timestamptz default now(),
  unique(customer_id, period_start, period_end)
);

-- Payments
create table payments (
  id uuid primary key default gen_random_uuid(),
  bill_id text references bills(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  amount numeric not null,
  mode text not null,
  razorpay_payment_id text,
  notes text,
  paid_at timestamptz default now()
);

-- Expenses
create table expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  category text not null,
  amount numeric not null,
  note text,
  created_at timestamptz default now()
);

-- Product master
create table products (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  unit text not null default 'pcs',
  stock_qty numeric default 0,
  price numeric not null default 0,
  gst_rate numeric not null default 0,
  hsn_code text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Direct product sale invoices
create table product_sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  invoice_no text not null unique,
  date date not null,
  buyer_name text not null,
  buyer_phone text,
  buyer_gstin text,
  product_name text not null,
  category text,
  unit text not null default 'pcs',
  hsn_code text,
  quantity numeric not null,
  rate numeric not null,
  subtotal numeric not null,
  gst_rate numeric not null default 0,
  cgst numeric default 0,
  sgst numeric default 0,
  igst numeric default 0,
  total_amount numeric not null,
  payment_mode text default 'cash',
  notes text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Reminders
create table reminders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  message text not null,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- Bill ID sequence
create sequence bill_seq start 1;
create sequence product_sale_seq start 1;

-- Generate next bill ID (BILL-001, BILL-002, ...)
create or replace function next_bill_id()
returns text
language plpgsql
as $$
declare
  seq_val bigint;
begin
  select nextval('bill_seq') into seq_val;
  return 'BILL-' || lpad(seq_val::text, 3, '0');
end;
$$;

-- Generate next product sale invoice ID (SALE-0001, SALE-0002, ...)
create or replace function next_product_sale_invoice_no()
returns text
language plpgsql
as $$
declare
  seq_val bigint;
begin
  select nextval('product_sale_seq') into seq_val;
  return 'SALE-' || lpad(seq_val::text, 4, '0');
end;
$$;

-- Enable Row Level Security (optional — open for internal tool)
alter table customers enable row level security;
alter table daily_entries enable row level security;
alter table milk_production enable row level security;
alter table cattle enable row level security;
alter table cattle_milk_entries enable row level security;
alter table bills enable row level security;
alter table payments enable row level security;
alter table expenses enable row level security;
alter table products enable row level security;
alter table product_sales enable row level security;
alter table reminders enable row level security;

create policy "Auth users on customers" on customers for all to authenticated using (true) with check (true);
create policy "Auth users on daily_entries" on daily_entries for all to authenticated using (true) with check (true);
create policy "Auth users on milk_production" on milk_production for all to authenticated using (true) with check (true);
create policy "Auth users on cattle" on cattle for all to authenticated using (true) with check (true);
create policy "Auth users on cattle_milk_entries" on cattle_milk_entries for all to authenticated using (true) with check (true);
create policy "Auth users on bills" on bills for all to authenticated using (true) with check (true);
create policy "Auth users on payments" on payments for all to authenticated using (true) with check (true);
create policy "Auth users on expenses" on expenses for all to authenticated using (true) with check (true);
create policy "Auth users on products" on products for all to authenticated using (true) with check (true);
create policy "Auth users on product_sales" on product_sales for all to authenticated using (true) with check (true);
create policy "Auth users on reminders" on reminders for all to authenticated using (true) with check (true);
grant execute on function next_bill_id() to anon, authenticated, service_role;
grant execute on function next_product_sale_invoice_no() to anon, authenticated, service_role;
