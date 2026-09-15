create or replace function public.pay_order_with_payflow(p_payment_id uuid, p_order_id uuid, p_amount numeric, p_note text, p_payment_date date, p_payment_method text, p_our_account_id uuid DEFAULT NULL::uuid, p_company_account_id uuid DEFAULT NULL::uuid, p_receipt_paths text[] DEFAULT '{}'::text[], p_receipt jsonb DEFAULT NULL::jsonb)
 RETURNS company_payments
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
      pay_status = case when v_paid >= total_price then 'paid' else 'unpaid' end,
      updated_at = now()
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
$function$;
