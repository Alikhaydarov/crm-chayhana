-- A single cheap MAX(...) aggregate across every table the snapshot draws
-- from, used to detect "did anything change anywhere" without running
-- snapshot()'s full set of ~10 parallel queries. Deliberately unscoped by
-- branch/role (a global watermark) to keep this one fast query instead of
-- duplicating snapshot()'s branch-filtering logic -- an occasional
-- unnecessary full refetch (when an unrelated branch changed) is far
-- cheaper than the current always-refetch-every-5-seconds behavior.
create or replace function public.change_watermark()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$
  select greatest(
    (select coalesce(max(updated_at), 'epoch'::timestamptz) from public.products),
    (select coalesce(max(updated_at), 'epoch'::timestamptz) from public.stock),
    (select coalesce(max(updated_at), 'epoch'::timestamptz) from public.transfers),
    (select coalesce(max(updated_at), 'epoch'::timestamptz) from public.damaged_requests),
    (select coalesce(max(updated_at), 'epoch'::timestamptz) from public.companies),
    (select coalesce(max(updated_at), 'epoch'::timestamptz) from public.orders),
    (select coalesce(max(created_at), 'epoch'::timestamptz) from public.company_payments),
    (select coalesce(max(created_at), 'epoch'::timestamptz) from public.shop_sales),
    (select coalesce(max(updated_at), 'epoch'::timestamptz) from public.staff),
    (select coalesce(max(updated_at), 'epoch'::timestamptz) from public.product_batches)
  );
$$;

revoke all on function public.change_watermark() from public, anon, authenticated;
grant execute on function public.change_watermark() to service_role;
