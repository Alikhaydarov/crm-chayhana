create table if not exists public.product_batches (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete restrict,
  branch text not null check (branch in ('main', 'restaurant1', 'restaurant2', 'shop')),
  quantity numeric not null check (quantity >= 0),
  expiry_date date,
  received_date date not null default current_date,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_batches enable row level security;

create index if not exists product_batches_branch_product_idx on public.product_batches (branch, product_id);
create index if not exists product_batches_expiry_idx on public.product_batches (branch, product_id, expiry_date) where quantity > 0;

grant select, insert, update, delete on public.product_batches to service_role;

-- Consumes `p_quantity` from the oldest-expiring batches first (FEFO) for a
-- given product/branch, decrementing product_batches.quantity as it goes.
-- Returns a jsonb array of {expiryDate, quantity} describing what was
-- actually consumed, so callers (e.g. transfer dispatch) can recreate
-- matching batches elsewhere. Any shortfall not covered by tracked batches
-- (stock that predates batch tracking, or manual stock edits) is reported
-- back with expiryDate = null.
create or replace function public.consume_stock_fefo(
  p_product_id text,
  p_branch text,
  p_quantity numeric
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_remaining numeric := coalesce(p_quantity, 0);
  v_batch record;
  v_take numeric;
  v_consumed jsonb := '[]'::jsonb;
begin
  if v_remaining <= 0 then
    return v_consumed;
  end if;

  for v_batch in
    select id, quantity, expiry_date
    from public.product_batches
    where product_id = p_product_id and branch = p_branch and quantity > 0
    order by expiry_date asc nulls last, received_date asc, created_at asc
    for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_batch.quantity, v_remaining);
    update public.product_batches
    set quantity = quantity - v_take, updated_at = now()
    where id = v_batch.id;
    v_consumed := v_consumed || jsonb_build_array(jsonb_build_object('expiryDate', v_batch.expiry_date, 'quantity', v_take));
    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    v_consumed := v_consumed || jsonb_build_array(jsonb_build_object('expiryDate', null, 'quantity', v_remaining));
  end if;

  return v_consumed;
end;
$$;

revoke all on function public.consume_stock_fefo(text, text, numeric) from public, anon, authenticated;
grant execute on function public.consume_stock_fefo(text, text, numeric) to service_role;

-- Called when an order (delivery from a supplier) is recorded: creates one
-- batch row per item (so e.g. Monday's and Tuesday's cola deliveries stay
-- distinguishable by expiry date even though it's the same product) and
-- increments the aggregate stock table by the same amount.
create or replace function public.receive_order_batches(
  p_order_id uuid,
  p_branch text,
  p_items jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_product_id text;
  v_quantity numeric;
  v_expiry date;
begin
  if jsonb_typeof(p_items) <> 'array' then
    return;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := v_item->>'productId';
    v_quantity := coalesce((v_item->>'quantity')::numeric, 0);
    v_expiry := nullif(v_item->>'expiryDate', '')::date;
    if v_product_id is null or v_quantity <= 0 then
      continue;
    end if;

    insert into public.product_batches (product_id, branch, quantity, expiry_date, received_date, order_id)
    values (v_product_id, p_branch, v_quantity, v_expiry, current_date, p_order_id);

    insert into public.stock (product_id, branch, quantity)
    values (v_product_id, p_branch, v_quantity)
    on conflict (product_id, branch) do update
    set quantity = public.stock.quantity + excluded.quantity, updated_at = now();
  end loop;
end;
$$;

revoke all on function public.receive_order_batches(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.receive_order_batches(uuid, text, jsonb) to service_role;

-- Manual stock edits (Sklad page "edit stock") set an absolute quantity
-- rather than a delta. Reconcile product_batches with the change: a
-- decrease consumes FEFO batches like any other stock reduction; an
-- increase is recorded as a new no-expiry ("unknown") batch since a manual
-- override doesn't carry expiry information.
create or replace function public.adjust_stock_manual(
  p_product_id text,
  p_branch text,
  p_new_quantity numeric
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_before numeric;
  v_delta numeric;
begin
  insert into public.stock (product_id, branch, quantity)
  values (p_product_id, p_branch, 0)
  on conflict (product_id, branch) do nothing;

  select quantity into v_before
  from public.stock
  where product_id = p_product_id and branch = p_branch
  for update;

  v_delta := coalesce(p_new_quantity, 0) - coalesce(v_before, 0);

  update public.stock
  set quantity = coalesce(p_new_quantity, 0), updated_at = now()
  where product_id = p_product_id and branch = p_branch;

  if v_delta > 0 then
    insert into public.product_batches (product_id, branch, quantity, expiry_date, received_date)
    values (p_product_id, p_branch, v_delta, null, current_date);
  elsif v_delta < 0 then
    perform public.consume_stock_fefo(p_product_id, p_branch, abs(v_delta));
  end if;
end;
$$;

revoke all on function public.adjust_stock_manual(text, text, numeric) from public, anon, authenticated;
grant execute on function public.adjust_stock_manual(text, text, numeric) to service_role;

-- Damage approvals now also consume the matching quantity from tracked
-- batches (FEFO) so brak reduces whichever batch is closest to expiring.
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

    perform public.consume_stock_fefo(v_request.product_id, v_request.branch, v_request.quantity);
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

-- Transfer dispatch now consumes FEFO batches at the source branch and
-- recreates matching batches at the destination, so expiry dates travel
-- with the stock instead of resetting when it moves between warehouses.
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
  v_consumed jsonb;
  v_consumed_item jsonb;
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

    v_consumed := public.consume_stock_fefo(v_product_id, v_transfer.from_branch, v_quantity);
    for v_consumed_item in select value from jsonb_array_elements(v_consumed)
    loop
      insert into public.product_batches (product_id, branch, quantity, expiry_date, received_date, order_id)
      values (
        v_product_id,
        v_transfer.to_branch,
        (v_consumed_item->>'quantity')::numeric,
        nullif(v_consumed_item->>'expiryDate', '')::date,
        current_date,
        null
      );
    end loop;

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

-- Shop sales imports now also consume FEFO batches for the shop branch.
create or replace function public.import_shop_sale(p_source_key text, p_file_name text, p_sale_date date, p_items jsonb, p_skipped_rows jsonb DEFAULT '[]'::jsonb)
returns shop_sales
language plpgsql
set search_path = ''
as $function$
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

    perform public.consume_stock_fefo(v_product_id, 'shop', least(v_quantity, v_before));

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
$function$;
