-- These four tables are edited in place by the app (price/name edits,
-- payment status changes, active toggles) but never had an updated_at
-- column, so there was no way to detect "something changed" without
-- re-fetching the full row set. Added so the new lightweight
-- change-watermark endpoint can see edits, not just new inserts.
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.companies add column if not exists updated_at timestamptz not null default now();
alter table public.staff add column if not exists updated_at timestamptz not null default now();
alter table public.orders add column if not exists updated_at timestamptz not null default now();

create index if not exists products_updated_at_idx on public.products (updated_at desc);
create index if not exists companies_updated_at_idx on public.companies (updated_at desc);
create index if not exists staff_updated_at_idx on public.staff (updated_at desc);
create index if not exists orders_updated_at_idx on public.orders (updated_at desc);
