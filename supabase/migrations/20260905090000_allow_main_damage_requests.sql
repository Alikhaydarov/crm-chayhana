alter table public.damaged_requests drop constraint if exists damaged_requests_branch_check;
alter table public.damaged_requests add constraint damaged_requests_branch_check
  check (branch in ('main', 'restaurant1', 'restaurant2', 'shop'));
