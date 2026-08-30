create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id text unique not null,
  password text not null,
  name text not null,
  role text not null check (role in ('superadmin', 'restaurant1', 'restaurant2', 'shop')),
  branch_name text,
  branch_icon text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  category text not null default 'boshqa',
  unit text not null default 'dona',
  min_stock numeric not null default 0,
  price_per_unit numeric not null default 0,
  per_box numeric not null default 0,
  box_unit text not null default '',
  qr_code text,
  supplier_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.stock (
  product_id text not null references public.products(id) on delete cascade,
  branch text not null check (branch in ('main', 'restaurant1', 'restaurant2', 'shop')),
  quantity numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (product_id, branch)
);

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  to_branch text not null check (to_branch in ('restaurant1', 'restaurant2', 'shop')),
  items jsonb not null default '[]'::jsonb,
  total_value numeric not null default 0,
  requested_by text not null,
  approved_by text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  company_name text not null default '',
  items jsonb not null default '[]'::jsonb,
  total_price numeric not null default 0,
  paid_amount numeric not null default 0,
  pay_status text not null default 'unpaid' check (pay_status in ('paid', 'unpaid', 'partial')),
  note text not null default '',
  receipt jsonb,
  order_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.company_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  amount numeric not null default 0,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  branch text not null check (branch in ('restaurant1', 'restaurant2', 'shop')),
  phone text not null default '',
  salary numeric not null default 0,
  join_date date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  firm text not null,
  doc_number text not null default '',
  delivery_date date not null default current_date,
  note text not null default '',
  items jsonb not null default '[]'::jsonb,
  total_price numeric not null default 0,
  pay_status text not null default 'unpaid' check (pay_status in ('paid', 'unpaid', 'partial')),
  paid_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.shop_sales (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  file_name text not null,
  sale_date date not null,
  items jsonb not null default '[]'::jsonb,
  total_quantity numeric not null default 0,
  total_sales numeric not null default 0,
  total_cost numeric not null default 0,
  total_profit numeric not null default 0,
  shortage_count integer not null default 0,
  skipped_rows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.stock enable row level security;
alter table public.transfers enable row level security;
alter table public.companies enable row level security;
alter table public.orders enable row level security;
alter table public.company_payments enable row level security;
alter table public.staff enable row level security;
alter table public.suppliers enable row level security;
alter table public.shop_sales enable row level security;

insert into public.admin_users (user_id, password, name, role, branch_name, branch_icon)
values
  ('admin', 'admin123', 'Bosh Admin', 'superadmin', 'Bosh Admin', 'M'),
  ('shop', 'shop123', 'Do''kon Admin', 'shop', 'Do''kon', 'S'),
  ('rest1', 'rest123', 'Oshxona-1 Admin', 'restaurant1', 'Oshxona-1', 'R1'),
  ('rest2', 'rest123', 'Oshxona-2 Admin', 'restaurant2', 'Oshxona-2', 'R2')
on conflict (user_id) do nothing;

insert into public.products (id, name, category, unit, min_stock, price_per_unit, qr_code)
values
  ('demo-rice', 'Guruch', 'don', 'kg', 20, 3500, '880000000001'),
  ('demo-meat', 'Mol go''shti', 'gosht', 'kg', 15, 95000, '880000000002'),
  ('demo-cola', 'Ichimlik Cola', 'ichimlik', 'dona', 30, 1200, '880000000003')
on conflict (id) do nothing;

insert into public.stock (product_id, branch, quantity)
values
  ('demo-rice', 'main', 250),
  ('demo-meat', 'main', 80),
  ('demo-cola', 'main', 400),
  ('demo-rice', 'shop', 30),
  ('demo-cola', 'shop', 60)
on conflict (product_id, branch) do nothing;
