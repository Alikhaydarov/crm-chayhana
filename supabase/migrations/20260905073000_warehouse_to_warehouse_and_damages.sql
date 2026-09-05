alter table public.transfers add column if not exists from_branch text not null default 'main';
alter table public.transfers drop constraint if exists transfers_from_branch_check;
alter table public.transfers add constraint transfers_from_branch_check
  check (from_branch in ('main', 'restaurant1', 'restaurant2', 'shop'));
alter table public.transfers drop constraint if exists transfers_not_same_branch_check;
alter table public.transfers add constraint transfers_not_same_branch_check check (from_branch <> to_branch);

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

alter table public.damaged_requests enable row level security;

create index if not exists transfers_from_branch_created_idx on public.transfers (from_branch, created_at desc);
create index if not exists damaged_requests_branch_created_idx on public.damaged_requests (branch, created_at desc);
create index if not exists damaged_requests_pending_created_idx on public.damaged_requests (created_at desc)
  where status = 'pending';

grant select, insert, update, delete on public.damaged_requests to service_role;

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
