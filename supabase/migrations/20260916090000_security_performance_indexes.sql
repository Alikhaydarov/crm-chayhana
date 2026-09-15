-- Keep growing daily CRM data fast and server-only.
create index if not exists products_name_idx on public.products (name);
create index if not exists products_category_name_idx on public.products (category, name);
create index if not exists transfers_status_created_idx on public.transfers (status, created_at desc);
create index if not exists damaged_requests_product_created_idx on public.damaged_requests (product_id, created_at desc);
create index if not exists suppliers_delivery_created_idx on public.suppliers (delivery_date desc, created_at desc);
create index if not exists company_payments_kind_date_idx on public.company_payments (kind, payment_date desc, created_at desc);

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

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
