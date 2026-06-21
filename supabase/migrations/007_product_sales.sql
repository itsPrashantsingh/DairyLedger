-- Product master and direct product sales

create table if not exists products (
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

create table if not exists product_sales (
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

alter table product_sales add column if not exists sent_at timestamptz;

create sequence if not exists product_sale_seq start 1;

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

alter table products enable row level security;
alter table product_sales enable row level security;

drop policy if exists "Auth users on products" on products;
drop policy if exists "Auth users on product_sales" on product_sales;

create policy "Auth users on products" on products
  for all to authenticated using (true) with check (true);

create policy "Auth users on product_sales" on product_sales
  for all to authenticated using (true) with check (true);

grant execute on function next_product_sale_invoice_no() to anon, authenticated, service_role;
