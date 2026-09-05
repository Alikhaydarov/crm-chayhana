begin;

create extension if not exists pgcrypto;
create schema if not exists payflow;

do $types$
begin
  create type payflow.account_kind as enum ('OUR', 'COMPANY');
exception
  when duplicate_object then null;
end
$types$;

create table if not exists payflow.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payflow.accounts (
  id uuid primary key default gen_random_uuid(),
  kind payflow.account_kind not null,
  company_id uuid references payflow.companies(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_kind_company_check check (
    (kind = 'OUR' and company_id is null)
    or (kind = 'COMPANY' and company_id is not null)
  )
);

create table if not exists payflow.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references payflow.companies(id) on delete restrict,
  our_account_id uuid references payflow.accounts(id) on delete set null,
  company_account_id uuid references payflow.accounts(id) on delete set null,
  amount numeric not null check (amount > 0),
  paid_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company_payment_method text check (company_payment_method in ('cash', 'card')),
  our_payment_method text not null check (our_payment_method in ('cash', 'card')),
  company_card_account_text text,
  our_card_account_text text,
  receipt_path text,
  description text,
  receipt_paths text[] not null default '{}',
  constraint payments_method_fields_check check (
    (
      our_payment_method = 'cash'
      and our_account_id is null
      and company_account_id is null
      and company_payment_method is null
      and nullif(trim(coalesce(our_card_account_text, '')), '') is null
      and nullif(trim(coalesce(company_card_account_text, '')), '') is null
    )
    or
    (
      our_payment_method = 'card'
      and company_payment_method is not null
      and nullif(trim(coalesce(our_card_account_text, '')), '') is not null
      and nullif(trim(coalesce(company_card_account_text, '')), '') is not null
    )
  )
);

create index if not exists accounts_company_id_idx on payflow.accounts(company_id);
create index if not exists accounts_kind_idx on payflow.accounts(kind);
create index if not exists payments_company_id_idx on payflow.payments(company_id);
create index if not exists payments_paid_at_idx on payflow.payments(paid_at desc);

alter table payflow.companies enable row level security;
alter table payflow.accounts enable row level security;
alter table payflow.payments enable row level security;
revoke all on schema payflow from public, anon, authenticated;
revoke all on all tables in schema payflow from public, anon, authenticated;
revoke all on all sequences in schema payflow from public, anon, authenticated;
grant usage on schema payflow to service_role;
grant select, insert, update, delete on all tables in schema payflow to service_role;
grant usage, select on all sequences in schema payflow to service_role;

alter table public.company_payments
  add column if not exists payment_method text,
  add column if not exists our_account_id uuid,
  add column if not exists company_account_id uuid,
  add column if not exists our_card_account_text text,
  add column if not exists company_card_account_text text,
  add column if not exists payment_date date,
  add column if not exists receipt jsonb;

update public.company_payments
set payment_method = coalesce(payment_method, 'cash'),
    payment_date = coalesce(payment_date, (created_at at time zone 'Asia/Seoul')::date)
where payment_method is null or payment_date is null;

alter table public.company_payments
  alter column payment_method set default 'cash',
  alter column payment_method set not null,
  alter column payment_date set default current_date,
  alter column payment_date set not null;

do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.company_payments'::regclass
      and conname = 'company_payments_method_check'
  ) then
    alter table public.company_payments
      add constraint company_payments_method_check
      check (payment_method in ('cash', 'card'));
  end if;
end
$constraints$;

create index if not exists company_payments_date_created_idx
  on public.company_payments (payment_date desc, created_at desc);

-- CRM payment receipts share PayFlow's private bucket. The service-role-only
-- API signs or uploads objects; no browser role receives bucket privileges.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payflow-receipts',
  'payflow-receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.payflow_payment_methods(p_company_name text default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_company_id uuid;
begin
  if nullif(trim(p_company_name), '') is not null then
    select c.id into v_company_id
    from payflow.companies c
    where lower(trim(c.name)) = lower(trim(p_company_name))
    order by c.created_at
    limit 1;
  end if;

  return jsonb_build_object(
    'ourAccounts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'kind', a.kind::text,
        'label', a.label,
        'companyId', a.company_id
      ) order by a.created_at, a.label)
      from payflow.accounts a
      where a.kind = 'OUR' and a.company_id is null
    ), '[]'::jsonb),
    'companyAccounts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'kind', a.kind::text,
        'label', a.label,
        'companyId', a.company_id
      ) order by a.created_at, a.label)
      from payflow.accounts a
      where a.kind = 'COMPANY' and a.company_id = v_company_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.payflow_payment_methods(text) from public, anon, authenticated;
grant execute on function public.payflow_payment_methods(text) to service_role;

create or replace function public.payflow_add_payment_method(
  p_kind text,
  p_label text,
  p_company_name text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_kind text := upper(trim(coalesce(p_kind, '')));
  v_label text := trim(coalesce(p_label, ''));
  v_company_name text := trim(coalesce(p_company_name, ''));
  v_company_id uuid;
  v_account payflow.accounts;
begin
  if v_kind not in ('OUR', 'COMPANY') then
    raise exception 'To''lov usuli turi noto''g''ri';
  end if;
  if length(v_label) < 2 or length(v_label) > 120 then
    raise exception 'Karta nomi 2-120 belgi bo''lishi kerak';
  end if;

  if v_kind = 'COMPANY' then
    if v_company_name = '' then raise exception 'Firma nomi kerak'; end if;
    perform pg_advisory_xact_lock(hashtextextended('payflow-company:' || lower(v_company_name), 0));
    select c.id into v_company_id
    from payflow.companies c
    where lower(trim(c.name)) = lower(v_company_name)
    order by c.created_at
    limit 1;
    if v_company_id is null then
      insert into payflow.companies (name)
      values (v_company_name)
      returning id into v_company_id;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'payflow-account:' || v_kind || ':' || coalesce(v_company_id::text, '') || ':' || lower(v_label), 0
  ));
  if exists (
    select 1 from payflow.accounts a
    where a.kind::text = v_kind
      and a.company_id is not distinct from v_company_id
      and lower(trim(a.label)) = lower(v_label)
  ) then
    raise exception 'Bu karta avval qo''shilgan';
  end if;

  insert into payflow.accounts (kind, company_id, label)
  values (v_kind::payflow.account_kind, v_company_id, v_label)
  returning * into v_account;

  return jsonb_build_object(
    'id', v_account.id,
    'kind', v_account.kind::text,
    'label', v_account.label,
    'companyId', v_account.company_id
  );
end;
$$;

revoke all on function public.payflow_add_payment_method(text, text, text) from public, anon, authenticated;
grant execute on function public.payflow_add_payment_method(text, text, text) to service_role;

create or replace function public.payflow_delete_payment_method(p_account_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from payflow.accounts where id = p_account_id;
  return found;
end;
$$;

revoke all on function public.payflow_delete_payment_method(uuid) from public, anon, authenticated;
grant execute on function public.payflow_delete_payment_method(uuid) to service_role;

create or replace function public.pay_order_with_payflow(
  p_payment_id uuid,
  p_order_id uuid,
  p_amount numeric,
  p_note text,
  p_payment_date date,
  p_payment_method text,
  p_our_account_id uuid default null,
  p_company_account_id uuid default null,
  p_receipt_paths text[] default '{}'::text[],
  p_receipt jsonb default null
)
returns public.company_payments
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders;
  v_payment public.company_payments;
  v_method text := lower(trim(coalesce(p_payment_method, '')));
  v_company_name text;
  v_payflow_company_id uuid;
  v_our_label text;
  v_company_label text;
  v_remaining numeric;
  v_actual numeric;
  v_paid numeric;
  v_paid_at timestamptz;
  v_paths text[] := array_remove(coalesce(p_receipt_paths, '{}'::text[]), null);
begin
  if p_payment_id is null then raise exception 'To''lov ID kerak'; end if;
  if p_amount <= 0 then raise exception 'To''lov miqdori musbat bo''lishi kerak'; end if;
  if p_payment_date is null then raise exception 'To''lov sanasi kerak'; end if;
  if v_method not in ('cash', 'card') then raise exception 'To''lov usuli noto''g''ri'; end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;
  if not found then raise exception 'Order topilmadi'; end if;

  v_remaining := greatest(0, v_order.total_price - v_order.paid_amount);
  if v_remaining <= 0 then raise exception 'Order avval to''liq to''langan'; end if;
  v_actual := least(p_amount, v_remaining);
  v_paid := v_order.paid_amount + v_actual;
  v_company_name := nullif(trim(v_order.company_name), '');
  if v_company_name is null then
    select c.name into v_company_name from public.companies c where c.id = v_order.company_id;
  end if;
  if v_company_name is null then raise exception 'Firma nomi topilmadi'; end if;

  perform pg_advisory_xact_lock(hashtextextended('payflow-company:' || lower(v_company_name), 0));
  select c.id into v_payflow_company_id
  from payflow.companies c
  where lower(trim(c.name)) = lower(trim(v_company_name))
  order by c.created_at
  limit 1;
  if v_payflow_company_id is null then
    insert into payflow.companies (name)
    values (v_company_name)
    returning id into v_payflow_company_id;
  end if;

  if v_method = 'card' then
    if p_our_account_id is null or p_company_account_id is null then
      raise exception 'Ikkala karta ham tanlanishi kerak';
    end if;
    select a.label into v_our_label
    from payflow.accounts a
    where a.id = p_our_account_id and a.kind = 'OUR' and a.company_id is null;
    if v_our_label is null then raise exception 'Bizning karta topilmadi'; end if;

    select a.label into v_company_label
    from payflow.accounts a
    where a.id = p_company_account_id
      and a.kind = 'COMPANY'
      and a.company_id = v_payflow_company_id;
    if v_company_label is null then raise exception 'Firma kartasi topilmadi'; end if;
  else
    p_our_account_id := null;
    p_company_account_id := null;
  end if;

  v_paid_at := ((p_payment_date + time '12:00') at time zone 'Asia/Seoul');

  update public.orders
  set paid_amount = v_paid,
      pay_status = case when v_paid >= total_price then 'paid' else 'unpaid' end
  where id = p_order_id;

  insert into public.company_payments (
    id, company_id, order_id, amount, note, created_at,
    payment_method, our_account_id, company_account_id,
    our_card_account_text, company_card_account_text, payment_date, receipt
  ) values (
    p_payment_id, v_order.company_id, p_order_id, v_actual, coalesce(p_note, ''), v_paid_at,
    v_method, p_our_account_id, p_company_account_id,
    v_our_label, v_company_label, p_payment_date, p_receipt
  )
  returning * into v_payment;

  insert into payflow.payments (
    id, company_id, our_account_id, company_account_id, amount, paid_at,
    company_payment_method, our_payment_method,
    company_card_account_text, our_card_account_text,
    receipt_path, description, receipt_paths
  ) values (
    p_payment_id, v_payflow_company_id, p_our_account_id, p_company_account_id, v_actual, v_paid_at,
    case when v_method = 'card' then 'card' else null end, v_method,
    v_company_label, v_our_label,
    v_paths[1], nullif(trim(coalesce(p_note, '')), ''), v_paths
  );

  return v_payment;
end;
$$;

revoke all on function public.pay_order_with_payflow(uuid, uuid, numeric, text, date, text, uuid, uuid, text[], jsonb)
  from public, anon, authenticated;
grant execute on function public.pay_order_with_payflow(uuid, uuid, numeric, text, date, text, uuid, uuid, text[], jsonb)
  to service_role;

commit;
