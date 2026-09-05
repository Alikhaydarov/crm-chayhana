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
  from_branch text not null default 'main' check (from_branch in ('main', 'restaurant1', 'restaurant2', 'shop')),
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

alter table public.transfers add column if not exists sent_items jsonb not null default '[]'::jsonb;
alter table public.transfers add column if not exists received_items jsonb not null default '[]'::jsonb;
alter table public.transfers add column if not exists received_by text;
alter table public.transfers add column if not exists received_at timestamptz;
alter table public.transfers add column if not exists from_branch text not null default 'main';
alter table public.transfers drop constraint if exists transfers_from_branch_check;
alter table public.transfers add constraint transfers_from_branch_check
  check (from_branch in ('main', 'restaurant1', 'restaurant2', 'shop'));
alter table public.transfers drop constraint if exists transfers_not_same_branch_check;
alter table public.transfers add constraint transfers_not_same_branch_check check (from_branch <> to_branch);

alter table public.transfers drop constraint if exists transfers_status_check;
update public.transfers
set status = 'received',
    sent_items = case when sent_items = '[]'::jsonb then items else sent_items end,
    received_items = case when received_items = '[]'::jsonb then items else received_items end,
    received_by = coalesce(received_by, approved_by, 'Oldingi transfer'),
    received_at = coalesce(received_at, updated_at)
where status = 'approved';
alter table public.transfers add constraint transfers_status_check
  check (status in ('pending', 'approved', 'received', 'rejected'));

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

alter table public.companies add column if not exists branch text;

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

alter table public.orders add column if not exists branch text;

create table if not exists public.company_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  amount numeric not null default 0,
  note text not null default '',
  payment_method text not null default 'cash' check (payment_method in ('cash', 'card')),
  our_account_id uuid,
  company_account_id uuid,
  our_card_account_text text,
  company_card_account_text text,
  payment_date date not null default current_date,
  receipt jsonb,
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

create table if not exists public.damaged_requests (
  id uuid primary key default gen_random_uuid(),
  branch text not null check (branch in ('restaurant1', 'restaurant2', 'shop')),
  product_id text not null references public.products(id) on delete restrict,
  product_name text not null default '',
  quantity numeric not null check (quantity > 0),
  unit text not null default '',
  reason text not null default '',
  image jsonb,
  requested_by text not null,
  approved_by text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
alter table public.damaged_requests enable row level security;

-- Frequent filters and newest-first lists must stay index-backed as data grows.
create unique index if not exists products_qr_code_unique_idx
  on public.products (qr_code) where qr_code is not null;
create index if not exists stock_branch_idx on public.stock (branch, product_id);
create index if not exists transfers_branch_created_idx on public.transfers (to_branch, created_at desc);
create index if not exists transfers_from_branch_created_idx on public.transfers (from_branch, created_at desc);
create index if not exists transfers_pending_created_idx on public.transfers (created_at desc)
  where status = 'pending';
create index if not exists damaged_requests_branch_created_idx on public.damaged_requests (branch, created_at desc);
create index if not exists damaged_requests_pending_created_idx on public.damaged_requests (created_at desc)
  where status = 'pending';
create index if not exists companies_branch_created_idx on public.companies (branch, created_at desc);
create index if not exists orders_branch_created_idx on public.orders (branch, created_at desc);
create index if not exists orders_company_created_idx on public.orders (company_id, created_at desc);
create index if not exists orders_date_created_idx on public.orders (order_date desc, created_at desc);
create index if not exists orders_unpaid_created_idx on public.orders (created_at desc)
  where pay_status <> 'paid';
create index if not exists company_payments_company_created_idx
  on public.company_payments (company_id, created_at desc);
create index if not exists company_payments_order_idx on public.company_payments (order_id);
create index if not exists company_payments_date_created_idx
  on public.company_payments (payment_date desc, created_at desc);
create index if not exists staff_branch_name_idx on public.staff (branch, name);
create unique index if not exists shop_sales_source_key_unique_idx on public.shop_sales (source_key);
create index if not exists shop_sales_date_idx on public.shop_sales (sale_date desc, created_at desc);

-- The browser never receives table privileges. All access goes through the server route.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Supabase's automatic-RLS trigger is internal only; it must not be callable via the Data API.
do $$
begin
  if exists (
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'rls_auto_enable'
      and oidvectortypes(proargtypes) = ''
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;

create or replace function public.authenticate_admin(p_user_id text, p_password text)
returns table (
  id uuid,
  name text,
  role text,
  branch_name text,
  branch_icon text
)
language sql
security invoker
set search_path = ''
as $$
  select u.id, u.name, u.role, u.branch_name, u.branch_icon
  from public.admin_users u
  where u.user_id = p_user_id
    and u.active
    and u.password = extensions.crypt(p_password, u.password)
  limit 1;
$$;

revoke all on function public.authenticate_admin(text, text) from public, anon, authenticated;
grant execute on function public.authenticate_admin(text, text) to service_role;

create or replace function public.process_transfer(
  p_transfer_id uuid,
  p_action text,
  p_approved_by text
)
returns public.transfers
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_transfer public.transfers;
  v_item jsonb;
  v_product_id text;
  v_quantity numeric;
  v_available numeric;
begin
  if p_action not in ('approve', 'reject') then
    raise exception 'Noto''g''ri transfer amali';
  end if;

  select * into v_transfer
  from public.transfers
  where id = p_transfer_id
  for update;

  if not found then raise exception 'Transfer topilmadi'; end if;
  if v_transfer.status <> 'pending' then raise exception 'Transfer avval qayta ishlangan'; end if;

  if p_action = 'approve' then
    for v_item in select * from jsonb_array_elements(v_transfer.items)
    loop
      v_product_id := v_item->>'productId';
      v_quantity := (v_item->>'quantity')::numeric;
      if v_quantity <= 0 then raise exception 'Mahsulot miqdori noto''g''ri'; end if;

      select quantity into v_available
      from public.stock
      where product_id = v_product_id and branch = 'main'
      for update;

      if coalesce(v_available, 0) < v_quantity then
        raise exception 'Skladda yetarli mahsulot yo''q: %', v_product_id;
      end if;

      update public.stock
      set quantity = quantity - v_quantity, updated_at = now()
      where product_id = v_product_id and branch = 'main';

      insert into public.stock (product_id, branch, quantity)
      values (v_product_id, v_transfer.to_branch, v_quantity)
      on conflict (product_id, branch) do update
      set quantity = public.stock.quantity + excluded.quantity, updated_at = now();
    end loop;
  end if;

  update public.transfers
  set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
      approved_by = p_approved_by,
      updated_at = now()
  where id = p_transfer_id
  returning * into v_transfer;

  return v_transfer;
end;
$$;

revoke all on function public.process_transfer(uuid, text, text) from public, anon, authenticated;
grant execute on function public.process_transfer(uuid, text, text) to service_role;

create or replace function public.dispatch_transfer(
  p_transfer_id uuid,
  p_items jsonb,
  p_approved_by text
)
returns public.transfers
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_transfer public.transfers;
  v_requested jsonb;
  v_item jsonb;
  v_sent jsonb := '[]'::jsonb;
  v_product_id text;
  v_quantity numeric;
  v_requested_quantity numeric;
  v_available numeric;
  v_unit_price numeric;
  v_total numeric := 0;
begin
  select * into v_transfer from public.transfers where id = p_transfer_id for update;
  if not found then raise exception 'Transfer topilmadi'; end if;
  if v_transfer.status <> 'pending' then raise exception 'Transfer avval qayta ishlangan'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Beriladigan mahsulotlar yo''q'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items)
    group by value->>'productId' having count(*) > 1
  ) then raise exception 'Bir mahsulot ikki marta yuborilgan'; end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := v_item->>'productId';
    v_quantity := coalesce((v_item->>'quantity')::numeric, 0);
    select value into v_requested
    from jsonb_array_elements(v_transfer.items)
    where value->>'productId' = v_product_id
    limit 1;
    if v_requested is null then raise exception 'So''ralmagan mahsulot: %', v_product_id; end if;
    v_requested_quantity := (v_requested->>'quantity')::numeric;
    if v_quantity <= 0 or v_quantity > v_requested_quantity then raise exception 'Beriladigan miqdor noto''g''ri: %', v_product_id; end if;

    select price_per_unit into v_unit_price from public.products where id = v_product_id;
    v_unit_price := coalesce(nullif(v_requested->>'pricePerUnit', '')::numeric, v_unit_price, 0);
    v_total := v_total + (v_quantity * v_unit_price);

    select quantity into v_available from public.stock
    where product_id = v_product_id and branch = v_transfer.from_branch for update;
    if coalesce(v_available, 0) < v_quantity then raise exception 'Tanlangan skladda yetarli mahsulot yo''q: %', v_product_id; end if;
    update public.stock set quantity = quantity - v_quantity, updated_at = now()
    where product_id = v_product_id and branch = v_transfer.from_branch;

    insert into public.stock (product_id, branch, quantity)
    values (v_product_id, v_transfer.to_branch, v_quantity)
    on conflict (product_id, branch) do update
    set quantity = public.stock.quantity + excluded.quantity,
        updated_at = now();

    v_sent := v_sent || jsonb_build_array(v_requested || jsonb_build_object('quantity', v_quantity));
  end loop;

  update public.transfers
  set status = 'received',
      sent_items = v_sent,
      received_items = v_sent,
      approved_by = p_approved_by,
      received_by = p_approved_by,
      received_at = now(),
      total_value = v_total,
      updated_at = now()
  where id = p_transfer_id returning * into v_transfer;
  return v_transfer;
end;
$$;

revoke all on function public.dispatch_transfer(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.dispatch_transfer(uuid, jsonb, text) to service_role;

create or replace function public.receive_transfer(
  p_transfer_id uuid,
  p_items jsonb,
  p_received_by text
)
returns public.transfers
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_transfer public.transfers;
  v_sent_item jsonb;
  v_item jsonb;
  v_received jsonb := '[]'::jsonb;
  v_product_id text;
  v_quantity numeric;
  v_sent_quantity numeric;
begin
  select * into v_transfer from public.transfers where id = p_transfer_id for update;
  if not found then raise exception 'Transfer topilmadi'; end if;
  if v_transfer.status <> 'approved' then raise exception 'Transfer qabul qilishga tayyor emas'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Qabul qilingan mahsulotlar yo''q'; end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := v_item->>'productId';
    v_quantity := coalesce((v_item->>'quantity')::numeric, 0);
    select value into v_sent_item
    from jsonb_array_elements(v_transfer.sent_items)
    where value->>'productId' = v_product_id
    limit 1;
    if v_sent_item is null then raise exception 'Jo''natilmagan mahsulot: %', v_product_id; end if;
    v_sent_quantity := (v_sent_item->>'quantity')::numeric;
    if v_quantity < 0 or v_quantity > v_sent_quantity then raise exception 'Qabul qilingan miqdor noto''g''ri: %', v_product_id; end if;

    if v_quantity > 0 then
      insert into public.stock (product_id, branch, quantity)
      values (v_product_id, v_transfer.to_branch, v_quantity)
      on conflict (product_id, branch) do update
      set quantity = public.stock.quantity + excluded.quantity, updated_at = now();
    end if;
    v_received := v_received || jsonb_build_array(v_sent_item || jsonb_build_object('quantity', v_quantity));
  end loop;

  update public.transfers
  set status = 'received', received_items = v_received, received_by = p_received_by,
      received_at = now(), updated_at = now()
  where id = p_transfer_id returning * into v_transfer;
  return v_transfer;
end;
$$;

revoke all on function public.receive_transfer(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.receive_transfer(uuid, jsonb, text) to service_role;

create or replace function public.process_damaged_request(
  p_request_id uuid,
  p_action text,
  p_approved_by text
)
returns public.damaged_requests
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request public.damaged_requests;
  v_available numeric;
begin
  if p_action not in ('approve', 'reject') then
    raise exception 'Noto''g''ri brak amali';
  end if;

  select * into v_request
  from public.damaged_requests
  where id = p_request_id
  for update;

  if not found then raise exception 'Brak so''rovi topilmadi'; end if;
  if v_request.status <> 'pending' then raise exception 'Brak so''rovi avval qayta ishlangan'; end if;

  if p_action = 'approve' then
    insert into public.stock (product_id, branch, quantity)
    values (v_request.product_id, v_request.branch, 0)
    on conflict (product_id, branch) do nothing;

    select quantity into v_available
    from public.stock
    where product_id = v_request.product_id and branch = v_request.branch
    for update;

    if coalesce(v_available, 0) < v_request.quantity then
      raise exception 'Skladda brak miqdori uchun yetarli mahsulot yo''q';
    end if;

    update public.stock
    set quantity = quantity - v_request.quantity, updated_at = now()
    where product_id = v_request.product_id and branch = v_request.branch;
  end if;

  update public.damaged_requests
  set status = case when p_action = 'approve' then 'approved' else 'rejected' end,
      approved_by = p_approved_by,
      updated_at = now()
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.process_damaged_request(uuid, text, text) from public, anon, authenticated;
grant execute on function public.process_damaged_request(uuid, text, text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('damage-images', 'damage-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.pay_order(
  p_order_id uuid,
  p_amount numeric,
  p_note text
)
returns public.company_payments
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders;
  v_payment public.company_payments;
  v_paid numeric;
begin
  if p_amount <= 0 then raise exception 'To''lov miqdori musbat bo''lishi kerak'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order topilmadi'; end if;

  v_paid := least(v_order.total_price, v_order.paid_amount + p_amount);
  update public.orders
  set paid_amount = v_paid,
      pay_status = case when v_paid >= total_price then 'paid' else 'unpaid' end
  where id = p_order_id;

  insert into public.company_payments (company_id, order_id, amount, note)
  values (v_order.company_id, p_order_id, least(p_amount, v_order.total_price - v_order.paid_amount), coalesce(p_note, ''))
  returning * into v_payment;
  return v_payment;
end;
$$;

revoke all on function public.pay_order(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.pay_order(uuid, numeric, text) to service_role;

create or replace function public.import_shop_sale(
  p_source_key text,
  p_file_name text,
  p_sale_date date,
  p_items jsonb,
  p_skipped_rows jsonb default '[]'::jsonb
)
returns public.shop_sales
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_items jsonb := '[]'::jsonb;
  v_product public.products;
  v_product_id text;
  v_quantity numeric;
  v_before numeric;
  v_after numeric;
  v_shortage numeric;
  v_shortage_count integer := 0;
  v_created public.shop_sales;
begin
  if coalesce(trim(p_source_key), '') = '' or coalesce(trim(p_file_name), '') = '' then
    raise exception 'Import ma''lumotlari to''liq emas';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Importda mahsulotlar yo''q';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := v_item->>'productId';
    v_quantity := coalesce((v_item->>'quantity')::numeric, 0);
    if v_product_id is null or v_quantity <= 0 then
      raise exception 'Mahsulot yoki miqdor noto''g''ri';
    end if;

    select * into v_product from public.products where id = v_product_id;
    if not found then raise exception 'Mahsulot topilmadi: %', v_product_id; end if;

    insert into public.stock (product_id, branch, quantity)
    values (v_product_id, 'shop', 0)
    on conflict (product_id, branch) do nothing;

    select quantity into v_before
    from public.stock
    where product_id = v_product_id and branch = 'shop'
    for update;

    v_after := greatest(0, v_before - v_quantity);
    v_shortage := greatest(0, v_quantity - v_before);
    if v_shortage > 0 then v_shortage_count := v_shortage_count + 1; end if;

    update public.stock
    set quantity = v_after, updated_at = now()
    where product_id = v_product_id and branch = 'shop';

    v_items := v_items || jsonb_build_array(
      v_item || jsonb_build_object(
        'productName', coalesce(v_item->>'productName', v_item->>'sourceName', v_product.name),
        'stockBefore', v_before,
        'stockAfter', v_after,
        'shortage', v_shortage
      )
    );
  end loop;

  insert into public.shop_sales (
    source_key, file_name, sale_date, items, total_quantity,
    total_sales, total_cost, total_profit, shortage_count, skipped_rows
  ) values (
    p_source_key, p_file_name, p_sale_date, v_items,
    (select coalesce(sum((value->>'quantity')::numeric), 0) from jsonb_array_elements(v_items)),
    (select coalesce(sum((value->>'salesAmount')::numeric), 0) from jsonb_array_elements(v_items)),
    (select coalesce(sum((value->>'costAmount')::numeric), 0) from jsonb_array_elements(v_items)),
    (select coalesce(sum((value->>'profitAmount')::numeric), 0) from jsonb_array_elements(v_items)),
    v_shortage_count,
    coalesce(p_skipped_rows, '[]'::jsonb)
  ) returning * into v_created;

  return v_created;
end;
$$;

revoke all on function public.import_shop_sale(text, text, date, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.import_shop_sale(text, text, date, jsonb, jsonb) to service_role;

insert into public.admin_users (user_id, password, name, role, branch_name, branch_icon)
values
  ('admin', extensions.crypt('admin123', extensions.gen_salt('bf', 12)), 'Bosh Admin', 'superadmin', 'Bosh Admin', 'M'),
  ('shop', extensions.crypt('shop123', extensions.gen_salt('bf', 12)), 'Do''kon Admin', 'shop', 'Do''kon', 'S'),
  ('rest1', extensions.crypt('rest123', extensions.gen_salt('bf', 12)), 'Oshxona-1 Admin', 'restaurant1', 'Oshxona-1', 'R1'),
  ('rest2', extensions.crypt('rest123', extensions.gen_salt('bf', 12)), 'Oshxona-2 Admin', 'restaurant2', 'Oshxona-2', 'R2')
on conflict (user_id) do nothing;

-- Upgrade earlier plaintext seed rows without changing already-hashed passwords.
update public.admin_users
set password = extensions.crypt(password, extensions.gen_salt('bf', 12))
where password not like '$2%';

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
